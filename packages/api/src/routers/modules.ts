import {
  moduleContentVersion,
  moduleProgress,
  note,
  studyModule,
  studySession,
} from "@estudos-ia/db/schema/index";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { publicProcedure, router } from "../index";
import type { Db } from "../services/shared";

async function requireModule(db: Db, moduleId: string) {
  const [module] = await db
    .select({ id: studyModule.id, contentHash: studyModule.contentHash })
    .from(studyModule)
    .where(eq(studyModule.id, moduleId));
  if (!module) throw new TRPCError({ code: "NOT_FOUND", message: "Módulo não encontrado." });
  return module;
}

function contentChanged(lastSeenHash: string | null | undefined, contentHash: string): boolean {
  return Boolean(lastSeenHash) && lastSeenHash !== contentHash;
}

export const modulesRouter = router({
  list: publicProcedure
    .input(z.object({ includeArchived: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const modules = await ctx.db
        .select({
          id: studyModule.id,
          slug: studyModule.slug,
          key: studyModule.key,
          part: studyModule.part,
          order: studyModule.order,
          title: studyModule.title,
          kicker: sql<string>`${studyModule.content}->>'kicker'`,
          contentHash: studyModule.contentHash,
          archivedAt: studyModule.archivedAt,
          masteryLevel: moduleProgress.masteryLevel,
          lastSeenContentHash: moduleProgress.lastSeenContentHash,
        })
        .from(studyModule)
        .leftJoin(moduleProgress, eq(moduleProgress.moduleId, studyModule.id))
        .where(input?.includeArchived ? undefined : isNull(studyModule.archivedAt))
        .orderBy(asc(studyModule.part), asc(studyModule.order));

      const noteCounts = await ctx.db
        .select({ moduleId: note.moduleId, count: sql<number>`count(*)::int` })
        .from(note)
        .groupBy(note.moduleId);
      const lastSessions = await ctx.db
        .select({ moduleId: studySession.moduleId, lastAt: sql<Date>`max(${studySession.startedAt})`.mapWith(studySession.startedAt) })
        .from(studySession)
        .groupBy(studySession.moduleId);

      const countByModule = new Map(noteCounts.map((row) => [row.moduleId, row.count]));
      const lastByModule = new Map(lastSessions.map((row) => [row.moduleId, row.lastAt]));

      return modules.map(({ contentHash, lastSeenContentHash, masteryLevel, ...module }) => ({
        ...module,
        masteryLevel: masteryLevel ?? 0,
        noteCount: countByModule.get(module.id) ?? 0,
        lastSessionAt: lastByModule.get(module.id) ?? null,
        contentChanged: contentChanged(lastSeenContentHash, contentHash),
      }));
    }),

  bySlug: publicProcedure.input(z.object({ slug: z.string().min(1) })).query(async ({ ctx, input }) => {
    const [module] = await ctx.db.select().from(studyModule).where(eq(studyModule.slug, input.slug));
    if (!module) throw new TRPCError({ code: "NOT_FOUND", message: "Módulo não encontrado." });

    const [progress] = await ctx.db
      .select()
      .from(moduleProgress)
      .where(eq(moduleProgress.moduleId, module.id));
    const [latestVersion] = await ctx.db
      .select({ createdAt: moduleContentVersion.createdAt })
      .from(moduleContentVersion)
      .where(eq(moduleContentVersion.moduleId, module.id))
      .orderBy(desc(moduleContentVersion.createdAt))
      .limit(1);

    const changed = contentChanged(progress?.lastSeenContentHash, module.contentHash);
    // The version the user last saw, so the page can mark what changed since then.
    const [seenVersion] = changed
      ? await ctx.db
          .select({ content: moduleContentVersion.content })
          .from(moduleContentVersion)
          .where(
            and(
              eq(moduleContentVersion.moduleId, module.id),
              eq(moduleContentVersion.hash, progress!.lastSeenContentHash!),
            ),
          )
          .limit(1)
      : [];

    return {
      id: module.id,
      slug: module.slug,
      key: module.key,
      part: module.part,
      order: module.order,
      title: module.title,
      content: module.content,
      archivedAt: module.archivedAt,
      progress: {
        masteryLevel: progress?.masteryLevel ?? 0,
        // Null until the first visit: the page then marks the content as seen.
        lastSeenContentHash: progress?.lastSeenContentHash ?? null,
      },
      contentChanged: changed,
      seenContent: seenVersion?.content ?? null,
      contentUpdatedAt: latestVersion?.createdAt ?? module.updatedAt,
    };
  }),

  markContentSeen: publicProcedure
    .input(z.object({ moduleId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const module = await requireModule(ctx.db, input.moduleId);
      await ctx.db
        .insert(moduleProgress)
        .values({ moduleId: module.id, lastSeenContentHash: module.contentHash })
        .onConflictDoUpdate({
          target: moduleProgress.moduleId,
          set: { lastSeenContentHash: module.contentHash, updatedAt: sql`now()` },
        });
      return { ok: true };
    }),

  setMastery: publicProcedure
    .input(z.object({ moduleId: z.uuid(), level: z.number().int().min(0).max(5) }))
    .mutation(async ({ ctx, input }) => {
      const module = await requireModule(ctx.db, input.moduleId);
      await ctx.db
        .insert(moduleProgress)
        .values({ moduleId: module.id, masteryLevel: input.level })
        .onConflictDoUpdate({
          target: moduleProgress.moduleId,
          set: { masteryLevel: input.level, updatedAt: sql`now()` },
        });
      return { moduleId: module.id, masteryLevel: input.level };
    }),
});
