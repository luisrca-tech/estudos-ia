import { gradeSchema } from "@estudos-ia/db/content/schema";
import { note, reviewSchedule, studyModule, studySession } from "@estudos-ia/db/schema/index";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { publicProcedure, router } from "../index";
import { initialSchedule } from "../rules/review";
import { findSessionToLink } from "../rules/summary-alerts";
import { listSessions, loadSummaryNotes } from "../services/sessions";
import { moduleRef } from "../services/shared";

const noteTypeSchema = z.enum(["summary", "question", "decision", "evidence"]);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => (value ? value : null));

const editableFields = {
  type: noteTypeSchema,
  title: z.string().trim().min(1).max(200),
  body: z.string().min(1).max(50_000).refine((value) => value.trim().length > 0, "O corpo não pode ficar vazio."),
  recallPrompt: optionalText(500),
  evidenceGrade: gradeSchema.nullish().transform((value) => value ?? null),
  sourceUrl: z
    .union([z.url(), z.literal("")])
    .nullish()
    .transform((value) => (value ? value : null)),
};

const noteColumns = {
  id: note.id,
  moduleId: note.moduleId,
  sessionId: note.sessionId,
  type: note.type,
  title: note.title,
  body: note.body,
  recallPrompt: note.recallPrompt,
  evidenceGrade: note.evidenceGrade,
  sourceUrl: note.sourceUrl,
  source: note.source,
  createdAt: note.createdAt,
  updatedAt: note.updatedAt,
};

export const notesRouter = router({
  listByModule: publicProcedure
    .input(z.object({ moduleId: z.uuid(), type: noteTypeSchema.optional() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select(noteColumns)
        .from(note)
        .where(and(eq(note.moduleId, input.moduleId), input.type ? eq(note.type, input.type) : undefined))
        .orderBy(desc(note.createdAt)),
    ),

  byId: publicProcedure.input(z.object({ id: z.uuid() })).query(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .select({ ...noteColumns, module: moduleRef })
      .from(note)
      .innerJoin(studyModule, eq(studyModule.id, note.moduleId))
      .where(eq(note.id, input.id));
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Nota não encontrada." });
    return row;
  }),

  create: publicProcedure
    .input(z.object({ moduleId: z.uuid(), ...editableFields, sessionId: z.uuid().nullish() }))
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const [module] = await ctx.db
        .select({ id: studyModule.id })
        .from(studyModule)
        .where(eq(studyModule.id, input.moduleId));
      if (!module) throw new TRPCError({ code: "NOT_FOUND", message: "Módulo não encontrado." });

      let sessionId = input.sessionId ?? null;
      if (sessionId) {
        const [session] = await ctx.db
          .select({ id: studySession.id })
          .from(studySession)
          .where(eq(studySession.id, sessionId));
        if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Sessão não encontrada." });
      } else if (input.type === "summary") {
        // Spec 6.1: link to the latest session of this module still waiting for a summary.
        const sessions = await listSessions(ctx.db, { moduleId: module.id, limit: 200 });
        const notes = await loadSummaryNotes(ctx.db, [module.id]);
        sessionId = findSessionToLink(sessions, notes, module.id, now)?.id ?? null;
      }

      return ctx.db.transaction(async (tx) => {
        const [created] = await tx
          .insert(note)
          .values({
            moduleId: module.id,
            sessionId,
            type: input.type,
            title: input.title,
            body: input.body,
            recallPrompt: input.recallPrompt,
            evidenceGrade: input.evidenceGrade,
            sourceUrl: input.sourceUrl,
            source: "app",
            createdAt: now,
            updatedAt: now,
          })
          .returning(noteColumns);
        await tx.insert(reviewSchedule).values({ noteId: created!.id, ...initialSchedule(now) });
        return created!;
      });
    }),

  update: publicProcedure
    .input(z.object({ id: z.uuid(), ...editableFields }).partial().required({ id: true }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...fields } = input;
      // Editing never touches the review schedule.
      const [updated] = await ctx.db
        .update(note)
        .set({ ...fields, updatedAt: sql`now()` })
        .where(eq(note.id, id))
        .returning(noteColumns);
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Nota não encontrada." });
      return updated;
    }),

  delete: publicProcedure.input(z.object({ id: z.uuid() })).mutation(async ({ ctx, input }) => {
    // review_schedule and review_log go with the note (ON DELETE CASCADE).
    const [deleted] = await ctx.db
      .delete(note)
      .where(eq(note.id, input.id))
      .returning({ id: note.id, moduleId: note.moduleId });
    if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Nota não encontrada." });
    return deleted;
  }),
});
