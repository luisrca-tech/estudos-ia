import { publicProcedure, router } from "../index";
import { importerRouter } from "./importer";
import { modulesRouter } from "./modules";
import { notesRouter } from "./notes";
import { reviewsRouter } from "./reviews";
import { routinesRouter } from "./routines";
import { sessionsRouter } from "./sessions";
import { todayRouter } from "./today";

// Extension points, intentionally not registered in V0:
//   tutor (V1): per-module tutor grounded on module.content.
//   rag   (V2): retrieval over note.body chunks stored with pgvector.
export const appRouter = router({
  healthCheck: publicProcedure.query(() => "OK"),
  modules: modulesRouter,
  notes: notesRouter,
  sessions: sessionsRouter,
  reviews: reviewsRouter,
  routines: routinesRouter,
  today: todayRouter,
  importer: importerRouter,
});

export type AppRouter = typeof appRouter;
