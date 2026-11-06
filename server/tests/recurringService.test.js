const test = require("node:test");
const assert = require("node:assert/strict");
const {
  dateFromInput,
  nextOccurrenceDate,
  normalizeTimeZone,
} = require("../services/recurringService");

function parts(date, timeZone) {
  return Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(date).filter((part) => part.type !== "literal").map(({ type, value }) => [type, Number(value)]));
}

test("recurring schedule calendar and timezone calculations", async (t) => {
  await t.test("maps the legacy IST alias and parses dates in the user's zone", () => {
    assert.equal(normalizeTimeZone("IST"), "Asia/Kolkata");
    const start = dateFromInput("2026-11-06", "Asia/Kolkata");
    assert.deepEqual(parts(start, "Asia/Kolkata"), { year: 2026, month: 11, day: 6, hour: 0 });
    assert.throws(() => dateFromInput("2026-02-30", "UTC"), /Invalid recurring start date/);
  });

  await t.test("keeps end-of-month schedules at month end through leap years", () => {
    const startDate = new Date("2024-01-31T09:00:00.000Z");
    const schedule = { frequency: "monthly", interval: 1, timeZone: "UTC", scheduleDay: 31, isEndOfMonth: true, startDate };
    const feb = nextOccurrenceDate(startDate, schedule);
    const mar = nextOccurrenceDate(feb, schedule);
    assert.equal(feb.toISOString(), "2024-02-29T09:00:00.000Z");
    assert.equal(mar.toISOString(), "2024-03-31T09:00:00.000Z");
  });

  await t.test("preserves local execution time over daylight saving transitions", () => {
    const start = new Date("2026-03-07T14:00:00.000Z"); // 09:00 before the US spring shift
    const next = nextOccurrenceDate(start, { frequency: "daily", interval: 1, timeZone: "America/New_York" });
    const local = parts(next, "America/New_York");
    assert.deepEqual(local, { year: 2026, month: 3, day: 8, hour: 9 });
  });
});
