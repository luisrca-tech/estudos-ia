import { createHash } from "node:crypto";

import {
  importBatch,
  moduleProgress,
  note,
  reviewSchedule,
  studyModule,
} from "@estudos-ia/db/schema/index";
import { TRPCError } from "@trpc/server";
import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { publicProcedure, router } from "../index";
import {
  ImportParseError,
  importNoteTitle,
  parseImport,
  planImport,
  type ImportModule,
} from "../rules/import-parser";
import type { Db } from "../services/shared";

/** Mastery reached by the "Cheguei ao degrau 3" box of the HTML. */
const DONE_MASTERY_LEVEL = 3;

const importInput = z.object({
  fileName: z.string().trim().min(1).max(255),
  text: z.string().min(1).max(1_000_000, "O arquivo passa do limite de 1 MB."),
});

type ImportModuleRow = ImportModule & { slug: string };

/** Parses the file and decides what would be written; shared by preview and commit. */
async function prepareImport(db: Db, text: string, now: Date) {
  // Archived modules are included: their notes still belong to the user.
  const rows = await db
    .select({
      id: studyModule.id,
      slug: studyModule.slug,
      key: studyModule.key,
      part: studyModule.part,
      order: studyModule.order,
      title: studyModule.title,
      kicker: sql<string>`${studyModule.content}->>'kicker'`,
    })
    .from(studyModule)
    .orderBy(asc(studyModule.part), asc(studyModule.order));
  const modules: ImportModuleRow[] = rows.map((row) => ({ ...row, order: row.part * 1000 + row.order }));

  let parsed;
  try {
    parsed = parseImport(text, modules);
  } catch (error) {
    if (error instanceof ImportParseError) {
      throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
    }
    throw error;
  }

  const existing = await db
    .select({ moduleId: note.moduleId, body: note.body })
    .from(note)
    .where(eq(note.source, "html_import"));
  return { modules, parsed, plan: planImport(parsed, modules, existing, now) };
}

async function loadMastery(db: Db): Promise<Map<string, number>> {
  const rows = await db
    .select({ moduleId: moduleProgress.moduleId, level: moduleProgress.masteryLevel })
    .from(moduleProgress);
  return new Map(rows.map((row) => [row.moduleId, row.level]));
}

export const importerRouter = router({
  preview: publicProcedure.input(importInput).mutation(async ({ ctx, input }) => {
    const { modules, parsed, plan } = await prepareImport(ctx.db, input.text, new Date());
    const moduleByKey = new Map(modules.map((module) => [module.key, module]));
    const duplicates = new Set(plan.skipped.map((entry) => entry.moduleKey));

    const masteryByModule = await loadMastery(ctx.db);
    return {
      format: parsed.format,
      warnings: parsed.warnings,
      toCreate: plan.create.length,
      toSkip: plan.skipped.length,
      // Every section, so the preview shows what is ignored too.
      rows: parsed.sections
        .map((section) => {
          const module = moduleByKey.get(section.moduleKey)!;
          return {
            moduleKey: module.key,
            moduleSlug: module.slug,
            kicker: module.kicker,
            title: module.title,
            characters: section.body.length,
            done: section.done,
            duplicate: duplicates.has(module.key),
            currentMastery: masteryByModule.get(module.id) ?? 0,
          };
        }),
    };
  }),

  commit: publicProcedure.input(importInput).mutation(async ({ ctx, input }) => {
    const now = new Date();
    return ctx.db.transaction(async (tx) => {
      const { modules, parsed, plan } = await prepareImport(tx, input.text, now);
      const masteryBefore = await loadMastery(tx);

      const [batch] = await tx
        .insert(importBatch)
        .values({
          fileName: input.fileName,
          format: parsed.format,
          fileHash: createHash("sha256").update(input.text.replace(/\r\n/g, "\n")).digest("hex"),
          notesCreated: plan.create.length,
          notesSkipped: plan.skipped.length,
        })
        .returning({ id: importBatch.id });

      if (plan.create.length > 0) {
        const created = await tx
          .insert(note)
          .values(
            plan.create.map((entry) => ({
              moduleId: entry.moduleId,
              type: "summary" as const,
              source: "html_import" as const,
              title: importNoteTitle(now),
              body: entry.body,
              importBatchId: batch!.id,
              createdAt: now,
              updatedAt: now,
            })),
          )
          .returning({ id: note.id });
        // Staggered first review: at most 3 imported notes per day (spec 6.5).
        await tx.insert(reviewSchedule).values(
          created.map((row, index) => ({
            noteId: row.id,
            step: 0,
            dueOn: plan.create[index]!.dueOn,
          })),
        );
      }

      let masteryUpdated = 0;
      for (const moduleId of plan.masteryModuleIds) {
        const raised = await tx
          .insert(moduleProgress)
          .values({ moduleId, masteryLevel: DONE_MASTERY_LEVEL })
          .onConflictDoUpdate({
            target: moduleProgress.moduleId,
            set: { masteryLevel: DONE_MASTERY_LEVEL, updatedAt: sql`now()` },
            setWhere: sql`${moduleProgress.masteryLevel} < ${DONE_MASTERY_LEVEL}`,
          })
          .returning({ moduleId: moduleProgress.moduleId });
        masteryUpdated += raised.length;
      }

      // Per module, for the result step: notes created and the step change.
      const touched = new Set([...plan.create.map((entry) => entry.moduleId), ...plan.masteryModuleIds]);
      const perModule = modules
        .filter((module) => touched.has(module.id))
        .map((module) => {
          const before = masteryBefore.get(module.id) ?? 0;
          const raised = plan.masteryModuleIds.includes(module.id) && before < DONE_MASTERY_LEVEL;
          return {
            moduleKey: module.key,
            moduleSlug: module.slug,
            kicker: module.kicker,
            created: plan.create.filter((entry) => entry.moduleId === module.id).length,
            masteryBefore: before,
            masteryAfter: raised ? DONE_MASTERY_LEVEL : before,
          };
        });

      return {
        modules: perModule,
        created: plan.create.length,
        skipped: plan.skipped.length,
        masteryUpdated,
        warnings: parsed.warnings,
      };
    });
  }),
});
