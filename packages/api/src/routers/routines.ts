import { routineCheck, routineItem } from "@estudos-ia/db/schema/index";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { publicProcedure, router } from "../index";
import { buildRoutineHistory, periodKey, recentPeriodKeys } from "../rules/periods";
import { loadActiveRoutineItems, loadCurrentRoutines } from "../services/routines";

export const routinesRouter = router({
  current: publicProcedure.query(({ ctx }) => loadCurrentRoutines(ctx.db, new Date())),

  toggle: publicProcedure
    .input(z.object({ routineItemId: z.uuid(), checked: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const [item] = await ctx.db
        .select({ id: routineItem.id, cadence: routineItem.cadence })
        .from(routineItem)
        .where(eq(routineItem.id, input.routineItemId));
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Item de rotina não encontrado." });

      // Only the current period can change; past periods are history.
      const key = periodKey(item.cadence, new Date());
      if (input.checked) {
        await ctx.db
          .insert(routineCheck)
          .values({ routineItemId: item.id, periodKey: key })
          .onConflictDoNothing();
      } else {
        await ctx.db
          .delete(routineCheck)
          .where(and(eq(routineCheck.routineItemId, item.id), eq(routineCheck.periodKey, key)));
      }
      return { routineItemId: item.id, periodKey: key, checked: input.checked };
    }),

  history: publicProcedure
    .input(z.object({ cadence: z.enum(["daily", "weekly", "monthly"]) }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const items = await loadActiveRoutineItems(ctx.db, input.cadence);
      const checks =
        items.length > 0
          ? await ctx.db
              .select({ routineItemId: routineCheck.routineItemId, periodKey: routineCheck.periodKey })
              .from(routineCheck)
              .where(
                and(
                  inArray(routineCheck.periodKey, recentPeriodKeys(input.cadence, now)),
                  inArray(
                    routineCheck.routineItemId,
                    items.map((item) => item.id),
                  ),
                ),
              )
          : [];
      return buildRoutineHistory(input.cadence, now, items, checks);
    }),
});
