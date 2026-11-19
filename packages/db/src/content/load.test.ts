import { cpSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { loadContent } from "./load";

const repoContent = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "content");
const tempDirs: string[] = [];

function copyContent(): string {
  const dir = mkdtempSync(join(tmpdir(), "estudos-ia-content-"));
  tempDirs.push(dir);
  cpSync(repoContent, dir, { recursive: true });
  return dir;
}

function editModule(dir: string, file: string, edit: (json: Record<string, unknown>) => void) {
  const path = join(dir, "modules", file);
  const json = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  edit(json);
  writeFileSync(path, JSON.stringify(json, null, 2));
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("loadContent", () => {
  it("loads the versioned content: 15 modules (10 + 5) and 9 routine items", () => {
    const { modules, routines, errors } = loadContent(repoContent);
    expect(errors).toEqual([]);
    expect(modules).toHaveLength(15);
    expect(modules.filter((m) => m.content.part === 1)).toHaveLength(10);
    expect(modules.filter((m) => m.content.part === 2)).toHaveLength(5);
    expect(routines).toHaveLength(9);
    expect(modules.every((m) => /^[0-9a-f]{64}$/.test(m.hash))).toBe(true);
  });

  it("reports file and field for an invalid reading url", () => {
    const dir = copyContent();
    editModule(dir, "m02-controle.json", (json) => {
      (json.readings as Array<{ url: string }>)[0]!.url = "not a url";
    });
    const { errors } = loadContent(dir);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("m02-controle.json");
    expect(errors[0]).toContain("readings.0.url");
  });

  it("rejects a slug that differs from the file name", () => {
    const dir = copyContent();
    renameSync(join(dir, "modules", "m14-governanca.json"), join(dir, "modules", "m14-outro.json"));
    expect(loadContent(dir).errors.join("\n")).toContain("m14-outro.json: slug");
  });

  it("rejects duplicated key and (part, order)", () => {
    const dir = copyContent();
    editModule(dir, "m02-controle.json", (json) => {
      json.key = "m1";
      json.order = 1;
    });
    const errors = loadContent(dir).errors.join("\n");
    expect(errors).toContain('key "m1" duplicado');
    expect(errors).toContain('(part, order) "1/1" duplicado');
  });

  it("hashes are stable across CRLF and LF line endings", () => {
    const dir = copyContent();
    const path = join(dir, "modules", "m01-fundamentos.json");
    writeFileSync(path, readFileSync(path, "utf8").replace(/\n/g, "\r\n"));
    const original = loadContent(repoContent).modules.find((m) => m.file === "m01-fundamentos.json");
    const crlf = loadContent(dir).modules.find((m) => m.file === "m01-fundamentos.json");
    expect(crlf?.hash).toBe(original?.hash);
  });
});
