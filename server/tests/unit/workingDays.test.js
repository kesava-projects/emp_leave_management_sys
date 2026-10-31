import { calculateWorkingDays } from "../../src/services/workingDays.service.js";

describe("workingDays.service - calculateWorkingDays", () => {
  it("counts a single standard weekday as 1 day", () => {
    // 2026-11-02 is Monday
    const days = calculateWorkingDays("2026-11-02", "2026-11-02");
    expect(days).toBe(1);
  });

  it("counts a full Monday to Friday week as 5 days", () => {
    const days = calculateWorkingDays("2026-11-02", "2026-11-06");
    expect(days).toBe(5);
  });

  it("excludes weekends properly across weekend boundary", () => {
    // Friday (Nov 6) to Monday (Nov 9) = Friday (1) + Monday (1) = 2
    const days = calculateWorkingDays("2026-11-06", "2026-11-09");
    expect(days).toBe(2);
  });

  it("returns 0 days for a weekend-only range", () => {
    // Saturday (Nov 7) to Sunday (Nov 8)
    const days = calculateWorkingDays("2026-11-07", "2026-11-08");
    expect(days).toBe(0);
  });

  it("excludes public holidays from count", () => {
    // Monday (Nov 2) is a holiday
    const holidays = [{ date: new Date("2026-11-02T00:00:00.000Z") }];
    // Nov 2 (holiday) to Nov 4 (Wed) = 2 working days (Nov 3, Nov 4)
    const days = calculateWorkingDays("2026-11-02", "2026-11-04", "none", holidays);
    expect(days).toBe(2);
  });

  it("calculates 0.5 days for half-day on a weekday", () => {
    const days = calculateWorkingDays("2026-11-04", "2026-11-04", "first");
    expect(days).toBe(0.5);
  });

  it("returns 0 days for half-day on a weekend", () => {
    const days = calculateWorkingDays("2026-11-07", "2026-11-07", "second");
    expect(days).toBe(0);
  });

  it("throws error if half-day spans multiple days", () => {
    expect(() => {
      calculateWorkingDays("2026-11-02", "2026-11-03", "first");
    }).toThrow("Half-day leave must be requested for a single day");
  });

  it("throws error if end date is before start date", () => {
    expect(() => {
      calculateWorkingDays("2026-11-05", "2026-11-02");
    }).toThrow("End date cannot be before start date");
  });
});
