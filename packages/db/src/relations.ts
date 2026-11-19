import { defineRelations } from "drizzle-orm";

import * as schema from "./schema";

export const relations = {
  ...defineRelations(schema, (r) => ({
    studyModule: {
      progress: r.one.moduleProgress({
        from: r.studyModule.id,
        to: r.moduleProgress.moduleId,
      }),
      versions: r.many.moduleContentVersion(),
      notes: r.many.note(),
      sessions: r.many.studySession(),
    },
    moduleContentVersion: {
      module: r.one.studyModule({
        from: r.moduleContentVersion.moduleId,
        to: r.studyModule.id,
        optional: false,
      }),
    },
    moduleProgress: {
      module: r.one.studyModule({
        from: r.moduleProgress.moduleId,
        to: r.studyModule.id,
        optional: false,
      }),
    },
    note: {
      module: r.one.studyModule({
        from: r.note.moduleId,
        to: r.studyModule.id,
        optional: false,
      }),
      session: r.one.studySession({ from: r.note.sessionId, to: r.studySession.id }),
      importBatch: r.one.importBatch({ from: r.note.importBatchId, to: r.importBatch.id }),
      schedule: r.one.reviewSchedule({ from: r.note.id, to: r.reviewSchedule.noteId }),
      reviewLogs: r.many.reviewLog(),
    },
    studySession: {
      module: r.one.studyModule({
        from: r.studySession.moduleId,
        to: r.studyModule.id,
        optional: false,
      }),
      notes: r.many.note(),
    },
    importBatch: {
      notes: r.many.note(),
    },
    reviewSchedule: {
      note: r.one.note({ from: r.reviewSchedule.noteId, to: r.note.id, optional: false }),
    },
    reviewLog: {
      note: r.one.note({ from: r.reviewLog.noteId, to: r.note.id, optional: false }),
    },
    routineItem: {
      checks: r.many.routineCheck(),
    },
    routineCheck: {
      item: r.one.routineItem({
        from: r.routineCheck.routineItemId,
        to: r.routineItem.id,
        optional: false,
      }),
    },
  })),
};
