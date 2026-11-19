/**
 * Idempotent content seed (spec 4.5). Writes only to module,
 * module_content_version and routine_item. Never deletes: content removed
 * from the files is archived, and archived content that returns is restored.
 */
import "varlock/auto-load";

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { and, eq, isNull, notInArray, sql } from "drizzle-orm";

import { loadContent } from "./content/load";
import { createDb } from "./index";
import { moduleContentVersion, routineItem, studyModule } from "./schema";

type Counts = { created: number; updated: number; unchanged: number; archived: number };

const contentDir =
  process.env.CONTENT_DIR ?? join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "content");

async function main(): Promise<number> {
  const { modules, routines, errors } = loadContent(contentDir);
  if (errors.length > 0) {
    console.error(`Seed abortado: ${errors.length} erro(s) de validação. Nada foi gravado.`);
    for (const error of errors) console.error(`  - ${error}`);
    return 1;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("Seed abortado: DATABASE_URL não definida (apps/web/.env).");
    return 1;
  }

  const db = createDb({ DATABASE_URL: databaseUrl });
  const moduleCounts: Counts = { created: 0, updated: 0, unchanged: 0, archived: 0 };
  const routineCounts: Counts = { created: 0, updated: 0, unchanged: 0, archived: 0 };

  try {
    await db.transaction(async (tx) => {
      const existingModules = new Map(
        (await tx.select().from(studyModule)).map((row) => [row.slug, row]),
      );

      for (const { content, hash } of modules) {
        const existing = existingModules.get(content.slug);
        const values = {
          key: content.key,
          part: content.part,
          order: content.order,
          title: content.title,
          content,
          contentHash: hash,
          archivedAt: null,
        };

        if (!existing) {
          const [inserted] = await tx
            .insert(studyModule)
            .values({ slug: content.slug, ...values })
            .returning({ id: studyModule.id });
          await tx
            .insert(moduleContentVersion)
            .values({ moduleId: inserted!.id, hash, content });
          moduleCounts.created += 1;
          continue;
        }

        const hashChanged = existing.contentHash !== hash;
        if (!hashChanged && existing.archivedAt === null) {
          moduleCounts.unchanged += 1;
          continue;
        }

        await tx
          .update(studyModule)
          .set({ ...values, updatedAt: sql`now()` })
          .where(eq(studyModule.id, existing.id));
        if (hashChanged) {
          // A hash seen before (content reverted) keeps its original version row.
          await tx
            .insert(moduleContentVersion)
            .values({ moduleId: existing.id, hash, content })
            .onConflictDoNothing();
        }
        moduleCounts.updated += 1;
      }

      const moduleSlugs = modules.map((module) => module.content.slug);
      const archivedModules = await tx
        .update(studyModule)
        .set({ archivedAt: sql`now()`, updatedAt: sql`now()` })
        .where(and(isNull(studyModule.archivedAt), notInArray(studyModule.slug, moduleSlugs)))
        .returning({ id: studyModule.id });
      moduleCounts.archived = archivedModules.length;

      const existingRoutines = new Map(
        (await tx.select().from(routineItem)).map((row) => [row.slug, row]),
      );

      for (const item of routines) {
        const existing = existingRoutines.get(item.slug);
        if (!existing) {
          await tx.insert(routineItem).values(item);
          routineCounts.created += 1;
          continue;
        }
        const unchanged =
          existing.archivedAt === null &&
          existing.cadence === item.cadence &&
          existing.order === item.order &&
          existing.label === item.label &&
          existing.hint === item.hint;
        if (unchanged) {
          routineCounts.unchanged += 1;
          continue;
        }
        await tx
          .update(routineItem)
          .set({ ...item, archivedAt: null, updatedAt: sql`now()` })
          .where(eq(routineItem.id, existing.id));
        routineCounts.updated += 1;
      }

      const routineSlugs = routines.map((item) => item.slug);
      const archivedRoutines = await tx
        .update(routineItem)
        .set({ archivedAt: sql`now()`, updatedAt: sql`now()` })
        .where(
          and(
            isNull(routineItem.archivedAt),
            routineSlugs.length > 0 ? notInArray(routineItem.slug, routineSlugs) : undefined,
          ),
        )
        .returning({ id: routineItem.id });
      routineCounts.archived = archivedRoutines.length;
    });
  } finally {
    await db.$client.end();
  }

  const line = (label: string, c: Counts) =>
    `${label}: criados ${c.created}, atualizados ${c.updated}, sem mudança ${c.unchanged}, arquivados ${c.archived}`;
  console.log(line("Módulos", moduleCounts));
  console.log(line("Rotinas", routineCounts));
  const total = (key: keyof Counts) => moduleCounts[key] + routineCounts[key];
  console.log(
    `Seed concluído: criados ${total("created")}, atualizados ${total("updated")}, arquivados ${total("archived")} (sem mudança ${total("unchanged")})`,
  );
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error("Seed falhou:", error);
    process.exit(1);
  });
