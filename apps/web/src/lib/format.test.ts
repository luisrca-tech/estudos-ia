import { describe, expect, it } from "vitest";

import { formatDayTitle, formatLastSession, formatSessionWhen, moduleLabel } from "./format";

describe("Today formatting", () => {
  it("titles the day with the short weekday, like the board", () => {
    expect(formatDayTitle("2026-11-19")).toBe("Quinta, 19 de novembro");
    expect(formatDayTitle("2026-11-22")).toBe("Domingo, 22 de novembro");
  });

  it("describes when a session happened, in São Paulo time", () => {
    expect(formatSessionWhen("2026-11-17T17:10:00Z")).toBe("Sessão de terça, 17/11, 14:10");
    expect(formatSessionWhen("2026-11-19T02:30:00Z")).toBe("Sessão de quarta, 18/11, 23:30");
  });

  it("joins the module number and title", () => {
    expect(moduleLabel("Módulo 3 · O que o modelo vê", "Contexto e memória")).toBe("Módulo 3 · Contexto e memória");
    expect(moduleLabel("No mundo real", "Como as empresas aplicam estes conceitos")).toBe(
      "No mundo real · Como as empresas aplicam estes conceitos",
    );
  });
});

describe("formatLastSession", () => {
  const now = new Date("2026-11-19T15:00:00-03:00");
  it("uses the time today, the weekday this week and the date before that", () => {
    expect(formatLastSession(new Date("2026-11-19T09:40:00-03:00"), now)).toBe("hoje, 09:40");
    expect(formatLastSession(new Date("2026-11-17T14:10:00-03:00"), now)).toBe("ter, 17/11");
    expect(formatLastSession(new Date("2026-11-13T14:10:00-03:00"), now)).toBe("sex, 13/11");
    expect(formatLastSession(new Date("2026-11-12T08:00:00-03:00"), now)).toBe("12/11");
    expect(formatLastSession(null, now)).toBe("–");
  });
});
