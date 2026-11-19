import { describe, expect, it } from "vitest";

import { addDays, APP_TZ, formatDayMonthYear, today } from "./time";

describe("time", () => {
  it("uses the São Paulo time zone", () => {
    expect(APP_TZ).toBe("America/Sao_Paulo");
  });

  it("today() is the calendar date in APP_TZ, not in UTC", () => {
    expect(today(new Date("2026-11-19T02:30:00Z"))).toBe("2026-11-18");
    expect(today(new Date("2026-11-19T03:00:00Z"))).toBe("2026-11-19");
  });

  it("addDays() is calendar arithmetic across months and years", () => {
    expect(addDays("2026-11-19", 1)).toBe("2026-11-20");
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 21)).toBe("2027-01-21");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-11-19", -19)).toBe("2026-10-31");
  });

  it("formats dd/MM/yyyy in APP_TZ", () => {
    expect(formatDayMonthYear(new Date("2026-11-19T02:30:00Z"))).toBe("18/11/2026");
  });
});
