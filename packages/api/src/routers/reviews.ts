import { note, reviewLog, reviewSchedule } from "@estudos-ia/db/schema/index";
import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { publicProcedure, router } from "../index";
import { applyReview, isDue } from "../rules/review";
import { loadDueReviews } from "../services/reviews";

export const reviewsRouter = router({
  due: publicProcedure.query(({ ctx }) => loadDueReviews(ctx.db, new Date())),

  reveal: publicProcedure.input(z.object({ noteId: z.uuid() })).query(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .select({
        noteId: note.id,
        title: note.title,
        body: note.body,
        type: note.type,
        evidenceGrade: note.evidenceGrade,
        sourceUrl: note.sourceUrl,
      })
      .from(note)
      .where(eq(note.id, input.noteId));
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Nota não encontrada." });
    return row;
  }),

  grade: publicProcedure
    .input(z.object({ noteId: z.uuid(), result: z.enum(["recalled", "forgot"]) }))
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const [schedule] = await ctx.db
        .select()
        .from(reviewSchedule)
        .where(eq(reviewSchedule.noteId, input.noteId));
      if (!schedule) throw new TRPCError({ code: "NOT_FOUND", message: "Nota sem agenda de revisão." });
      if (!isDue(schedule, now)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Esta nota não está devida para revisão hoje." });
      }

      const next = applyReview(schedule, input.result, now);
      await ctx.db.transaction(async (tx) => {
        await tx
          .insert(reviewLog)
          .values({ noteId: schedule.noteId, stepBefore: schedule.step, result: input.result, reviewedAt: now });
        await tx
          .update(reviewSchedule)
          .set({ ...next, updatedAt: sql`now()` })
          .where(eq(reviewSchedule.noteId, schedule.noteId));
      });
      return { noteId: schedule.noteId, ...next };
    }),
});
