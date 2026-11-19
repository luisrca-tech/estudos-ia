import { pgEnum } from "drizzle-orm/pg-core";

export const noteType = pgEnum("note_type", ["summary", "question", "decision", "evidence"]);
export const noteSource = pgEnum("note_source", ["app", "html_import"]);
export const sessionStatus = pgEnum("session_status", ["running", "completed", "cancelled"]);
export const cadence = pgEnum("cadence", ["daily", "weekly", "monthly"]);
export const reviewResult = pgEnum("review_result", ["recalled", "forgot"]);
