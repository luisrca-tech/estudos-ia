import { describe, expect, it } from "vitest";

import { formatDayTitle, formatSessionWhen, moduleLabel } from "./format";

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
