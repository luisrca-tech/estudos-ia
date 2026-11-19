import { moduleProgress, studyModule } from "@estudos-ia/db/schema/index";
import { asc, eq, isNull } from "drizzle-orm";

import { publicProcedure, router } from "../index";
import { sessionCounts } from "../rules/summary-alerts";
import { today } from "../rules/time";
import { loadDueReviews } from "../services/reviews";
import { loadCurrentRoutines } from "../services/routines";
import { listSessions, loadActiveSession, loadSummaryAlerts } from "../services/sessions";
import { moduleRef, type Db } from "../services/shared";

/** Module of the last counting session; otherwise the first one still below step 3. */
async function loadSuggestedModule(db: Db) {
  const recent = await listSessions(db, { limit: 50 });
  const last = recent.find((session) => sessionCounts(session) && session.module.archivedAt === null);
  if (last) return last.module;

  const modules = await db
    .select({ ...moduleRef, masteryLevel: moduleProgress.masteryLevel })
    .from(studyModule)
    .leftJoin(moduleProgress, eq(moduleProgress.moduleId, studyModule.id))
    .where(isNull(studyModule.archivedAt))
    .orderBy(asc(studyModule.part), asc(studyModule.order));
  const next = modules.find((module) => (module.masteryLevel ?? 0) < 3) ?? modules[0];
  if (!next) return null;
  const { masteryLevel: _masteryLevel, ...module } = next;
  return module;
}

export const todayRouter = router({
  get: publicProcedure.query(async ({ ctx }) => {
    const now = new Date();
    // First: it may auto-complete a session, which the alerts below must see.
    const activeSession = await loadActiveSession(ctx.db, now);
    const [summaryAlerts, reviews, routines, suggestedModule] = await Promise.all([
      loadSummaryAlerts(ctx.db, now),
      loadDueReviews(ctx.db, now),
      loadCurrentRoutines(ctx.db, now),
      loadSuggestedModule(ctx.db),
    ]);

    return {
      date: today(now),
      activeSession,
      summaryAlerts,
      reviewsDue: {
        count: reviews.length,
        overdueCount: reviews.filter((review) => review.overdue).length,
      },
      routines,
      suggestedModule,
    };
  }),
});
