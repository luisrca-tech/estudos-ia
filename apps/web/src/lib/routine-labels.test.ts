import { describe, expect, it } from "vitest";

import { historyLabel, periodHeading, periodRemaining, splitRoutineLabel } from "./routine-labels";

const sp = (date: string, time = "12:00") => new Date(`${date}T${time}:00-03:00`);

describe("splitRoutineLabel", () => {
  it("moves a trailing duration in parentheses to the hint", () => {
    expect(splitRoutineLabel("Responder de cabeça 3 perguntas de revisão (5 min)")).toEqual({
      text: "Responder de cabeça 3 perguntas de revisão",
      duration: "5 min",
    });
    expect(splitRoutineLabel("Ler ou assistir **uma** seção de uma fonte (15–20 min)").duration).toBe("15–20 min");
    expect(splitRoutineLabel("Escrever um texto de síntese")).toEqual({ text: "Escrever um texto de síntese", duration: null });
  });
});

describe("periodHeading", () => {
  it("names the current period like the board", () => {
    const now = sp("2026-11-19");
    expect(periodHeading("daily", now)).toBe("Quinta, 19/11");
    expect(periodHeading("weekly", now)).toBe("16 a 22/11 · termina domingo");
    expect(periodHeading("monthly", now)).toBe("Novembro · faltam 11 dias");
  });

  it("handles the last day of a week and of a month", () => {
    expect(periodHeading("weekly", sp("2026-11-22"))).toBe("16 a 22/11 · termina hoje");
    expect(periodHeading("monthly", sp("2026-11-30"))).toBe("Novembro · último dia");
    expect(periodHeading("monthly", sp("2026-11-29"))).toBe("Novembro · falta 1 dia");
  });

  it("writes a week that crosses months with both months", () => {
    expect(periodHeading("weekly", sp("2026-10-28"))).toBe("26/10 a 1/11 · termina domingo");
  });
});

describe("periodRemaining", () => {
  it("is the short form used on Hoje", () => {
    expect(periodRemaining("weekly", sp("2026-11-19"))).toBe("até domingo");
    expect(periodRemaining("weekly", sp("2026-11-22"))).toBe("até hoje");
    expect(periodRemaining("monthly", sp("2026-11-19"))).toBe("faltam 11 dias");
  });
});

describe("historyLabel", () => {
  it("formats past period keys", () => {
    expect(historyLabel("daily", "2026-11-18")).toBe("qua, 18/11");
    expect(historyLabel("weekly", "2026-W46")).toBe("9 a 15/11");
    expect(historyLabel("weekly", "2026-W44")).toBe("26/10 a 1/11");
    expect(historyLabel("weekly", "2027-W01")).toBe("4 a 10/1");
    expect(historyLabel("monthly", "2026-10")).toBe("outubro");
  });
});
