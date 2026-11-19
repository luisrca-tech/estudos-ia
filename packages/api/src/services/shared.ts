import type { Database } from "@estudos-ia/db";
import { studyModule } from "@estudos-ia/db/schema/index";
import { sql } from "drizzle-orm";

/** The database handle or an open transaction. */
export type Db = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

/** Columns every screen needs to name a module, without the full content. */
export const moduleRef = {
  id: studyModule.id,
  slug: studyModule.slug,
  key: studyModule.key,
  part: studyModule.part,
  order: studyModule.order,
  title: studyModule.title,
  kicker: sql<string>`${studyModule.content}->>'kicker'`,
  archivedAt: studyModule.archivedAt,
};

/** Sort position of a module in the whole track. */
export function trackPosition(module: { part: number; order: number }): number {
  return module.part * 1000 + module.order;
}

/** Postgres unique violation, also when wrapped by the driver adapter. */
export function isUniqueViolation(error: unknown): boolean {
  for (let current: unknown = error; current; current = (current as { cause?: unknown }).cause) {
    if ((current as { code?: string }).code === "23505") return true;
  }
  return false;
}
