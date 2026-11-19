import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

import type { z } from "zod";

import {
  moduleContentSchema,
  routinesFileSchema,
  type ModuleContent,
  type RoutineItemContent,
} from "./schema";

export type LoadedModule = { file: string; hash: string; content: ModuleContent };

export type LoadedContent = {
  modules: LoadedModule[];
  routines: RoutineItemContent[];
  errors: string[];
};

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function parseFile<T>(path: string, schema: z.ZodType<T>, errors: string[]): { value: T; hash: string } | null {
  const file = basename(path);
  const text = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    errors.push(`${file}: JSON inválido (${(error as Error).message})`);
    return null;
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push(`${file}: ${issue.path.join(".") || "(raiz)"}: ${issue.message}`);
    }
    return null;
  }
  return { value: result.data, hash: sha256(text) };
}

function pushDuplicates(values: Array<{ value: string; file: string }>, label: string, errors: string[]) {
  const seen = new Map<string, string>();
  for (const { value, file } of values) {
    const first = seen.get(value);
    if (first) errors.push(`${file}: ${label} "${value}" duplicado (já usado em ${first})`);
    else seen.set(value, file);
  }
}

/**
 * Reads and validates every content file. Never touches the database: callers
 * must refuse to write anything when `errors` is not empty.
 */
export function loadContent(contentDir: string): LoadedContent {
  const errors: string[] = [];
  const modulesDir = join(contentDir, "modules");
  const modules: LoadedModule[] = [];

  const files = existsSync(modulesDir)
    ? readdirSync(modulesDir)
        .filter((file) => file.endsWith(".json"))
        .sort()
    : [];
  if (files.length === 0) errors.push("content/modules: nenhum arquivo .json encontrado");

  for (const file of files) {
    const parsed = parseFile(join(modulesDir, file), moduleContentSchema, errors);
    if (!parsed) continue;
    if (parsed.value.slug !== basename(file, ".json")) {
      errors.push(`${file}: slug: "${parsed.value.slug}" deve ser igual ao nome do arquivo`);
    }
    modules.push({ file, hash: parsed.hash, content: parsed.value });
  }

  pushDuplicates(modules.map((m) => ({ value: m.content.slug, file: m.file })), "slug", errors);
  pushDuplicates(modules.map((m) => ({ value: m.content.key, file: m.file })), "key", errors);
  pushDuplicates(
    modules.map((m) => ({ value: `${m.content.part}/${m.content.order}`, file: m.file })),
    "(part, order)",
    errors,
  );

  let routines: RoutineItemContent[] = [];
  const routinesPath = join(contentDir, "routines.json");
  if (!existsSync(routinesPath)) {
    errors.push("routines.json: arquivo não encontrado");
  } else {
    const parsed = parseFile(routinesPath, routinesFileSchema, errors);
    if (parsed) {
      routines = parsed.value.items;
      pushDuplicates(routines.map((item) => ({ value: item.slug, file: "routines.json" })), "slug", errors);
    }
  }

  return { modules, routines, errors };
}
