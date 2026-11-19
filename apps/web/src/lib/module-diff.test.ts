import { describe, expect, it } from "vitest";

import { changedPassages, describeChanges, type DiffContent } from "./module-diff";

const reading = (url: string, title = "t") => ({ kind: "Artigo", title, url, duration: null, why: null, grade: null });
const base: DiffContent = {
  lead: "lead",
  seen: ["s1"],
  new: ["n1", "n2"],
  decisionQuestions: ["q1"],
  readings: [reading("https://a")],
  exercise: "ex",
  seeds: "seed",
};

describe("changedPassages", () => {
  it("highlights nothing without a previous version", () => {
    const diff = changedPassages(null, base);
    expect(diff.count).toBe(0);
    expect(diff.isChanged("new", "n1")).toBe(false);
  });

  it("marks added or rewritten items, readings and blocks", () => {
    const current: DiffContent = {
      ...base,
      new: ["n1", "n2 reescrito", "n3"],
      readings: [reading("https://a"), reading("https://b")],
      exercise: "ex novo",
    };
    const diff = changedPassages(base, current);
    expect(diff.isChanged("new", "n1")).toBe(false);
    expect(diff.isChanged("new", "n2 reescrito")).toBe(true);
    expect(diff.isChanged("new", "n3")).toBe(true);
    expect(diff.isChanged("readings", "https://b")).toBe(true);
    expect(diff.isChanged("readings", "https://a")).toBe(false);
    expect(diff.exercise).toBe(true);
    expect(diff.seeds).toBe(false);
    expect(diff.count).toBe(4);
  });

  it("a reading with a new title but the same url counts as changed", () => {
    const diff = changedPassages(base, { ...base, readings: [reading("https://a", "outro")] });
    expect(diff.isChanged("readings", "https://a")).toBe(true);
  });
});

describe("describeChanges", () => {
  it("says what changed in one short sentence", () => {
    const current = { ...base, new: [...base.new, "n3"], readings: [...base.readings, reading("https://b")], exercise: "ex 2" };
    expect(describeChanges(changedPassages(base, current))).toBe("1 leitura nova, 1 item novo e exercício reescrito.");
    expect(describeChanges(changedPassages(base, { ...base, seeds: "outra" }))).toBe("Semente reescrita.");
    expect(describeChanges(changedPassages(base, base))).toBe("Mudanças de texto pequenas.");
  });
});
