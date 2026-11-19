import { routineCheck, routineItem } from "@estudos-ia/db/schema/index";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";

import { CADENCES, isPeriodComplete, periodKey, type Cadence } from "../rules/periods";
import type { Db } from "./shared";

export async function loadActiveRoutineItems(db: Db, cadence?: Cadence) {
  return db
    .select({
      id: routineItem.id,
      slug: routineItem.slug,
      cadence: routineItem.cadence,
      order: routineItem.order,
      label: routineItem.label,
      hint: routineItem.hint,
    })
    .from(routineItem)
    .where(and(isNull(routineItem.archivedAt), cadence ? eq(routineItem.cadence, cadence) : undefined))
    .orderBy(asc(routineItem.order));
}

/** Per cadence: active items, the current period key and what is checked in it. */
export async function loadCurrentRoutines(db: Db, now: Date) {
  const items = await loadActiveRoutineItems(db);
  const keys = CADENCES.map((cadence) => periodKey(cadence, now));
  const checks =
    items.length > 0
      ? await db
          .select({ routineItemId: routineCheck.routineItemId, periodKey: routineCheck.periodKey })
          .from(routineCheck)
          .where(
            and(
              inArray(routineCheck.periodKey, keys),
              inArray(
                routineCheck.routineItemId,
                items.map((item) => item.id),
              ),
            ),
          )
      : [];

  const forCadence = (cadence: Cadence) => {
    const key = periodKey(cadence, now);
    const cadenceItems = items.filter((item) => item.cadence === cadence);
    const cadenceChecks = checks.filter((check) => check.periodKey === key);
    const checked = new Set(cadenceChecks.map((check) => check.routineItemId));
    return {
      cadence,
      periodKey: key,
      complete: isPeriodComplete(cadenceItems, cadenceChecks, key),
      items: cadenceItems.map((item) => ({ ...item, checked: checked.has(item.id) })),
    };
  };

  return { daily: forCadence("daily"), weekly: forCadence("weekly"), monthly: forCadence("monthly") };
}
