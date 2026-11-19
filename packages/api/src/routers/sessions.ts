import { studyModule, studySession } from "@estudos-ia/db/schema/index";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { publicProcedure, router } from "../index";
import { listSessionsWithSummary, loadActiveSession, plannedSeconds } from "../services/sessions";
import { isUniqueViolation, type Db } from "../services/shared";

export const MIN_PLANNED_MINUTES = 5;
export const MAX_PLANNED_MINUTES = 180;
export const DEFAULT_PLANNED_MINUTES = 25;

const CONFLICT_MESSAGE = "Já existe uma sessão em andamento. Conclua ou cancele antes de iniciar outra.";

async function requireSession(db: Db, id: string) {
  const [session] = await db.select().from(studySession).where(eq(studySession.id, id));
  if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Sessão não encontrada." });
  return session;
}

export const sessionsRouter = router({
  active: publicProcedure.query(({ ctx }) => loadActiveSession(ctx.db, new Date())),

  start: publicProcedure
    .input(
      z.object({
        moduleId: z.uuid(),
        plannedMinutes: z
          .number()
          .int()
          .min(MIN_PLANNED_MINUTES)
          .max(MAX_PLANNED_MINUTES)
          .default(DEFAULT_PLANNED_MINUTES),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const [module] = await ctx.db
        .select({ id: studyModule.id })
        .from(studyModule)
        .where(eq(studyModule.id, input.moduleId));
      if (!module) throw new TRPCError({ code: "NOT_FOUND", message: "Módulo não encontrado." });

      // A session whose time is already up must not block a new one.
      if (await loadActiveSession(ctx.db, now, 0)) {
        throw new TRPCError({ code: "CONFLICT", message: CONFLICT_MESSAGE });
      }

      try {
        const [created] = await ctx.db
          .insert(studySession)
          .values({
            moduleId: module.id,
            plannedMinutes: input.plannedMinutes,
            startedAt: now,
            endsAt: new Date(now.getTime() + input.plannedMinutes * 60 * 1000),
            status: "running",
          })
          .returning();
        return created!;
      } catch (error) {
        // The partial unique index is the real guard against two running sessions.
        if (isUniqueViolation(error)) {
          throw new TRPCError({ code: "CONFLICT", message: CONFLICT_MESSAGE });
        }
        throw error;
      }
    }),

  complete: publicProcedure
    .input(z.object({ id: z.uuid(), early: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const session = await requireSession(ctx.db, input.id);
      if (session.status === "completed") return session; // another tab got here first
      if (session.status === "cancelled") {
        throw new TRPCError({ code: "CONFLICT", message: "A sessão já foi cancelada." });
      }

      const early = Boolean(input.early) && now.getTime() < session.endsAt.getTime();
      const [updated] = await ctx.db
        .update(studySession)
        .set({
          status: "completed",
          endedAt: now,
          durationSeconds: early
            ? Math.max(0, Math.round((now.getTime() - session.startedAt.getTime()) / 1000))
            : plannedSeconds(session),
        })
        .where(and(eq(studySession.id, session.id), eq(studySession.status, "running")))
        .returning();
      return updated ?? requireSession(ctx.db, input.id);
    }),

  cancel: publicProcedure.input(z.object({ id: z.uuid() })).mutation(async ({ ctx, input }) => {
    const session = await requireSession(ctx.db, input.id);
    if (session.status === "cancelled") return session;
    if (session.status === "completed") {
      throw new TRPCError({ code: "CONFLICT", message: "A sessão já foi concluída." });
    }
    const [updated] = await ctx.db
      .update(studySession)
      .set({ status: "cancelled", endedAt: new Date() })
      .where(and(eq(studySession.id, session.id), eq(studySession.status, "running")))
      .returning();
    return updated ?? requireSession(ctx.db, input.id);
  }),

  list: publicProcedure
    .input(
      z
        .object({ moduleId: z.uuid().optional(), limit: z.number().int().min(1).max(200).default(50) })
        .optional(),
    )
    .query(({ ctx, input }) =>
      listSessionsWithSummary(ctx.db, new Date(), {
        moduleId: input?.moduleId,
        limit: input?.limit ?? 50,
      }),
    ),
});
