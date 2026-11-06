const RecurringTransaction = require("../models/RecurringTransaction");
const RecurringOccurrence = require("../models/RecurringOccurrence");
const Transaction = require("../models/Transaction");
const LedgerService = require("./ledgerService");
const { withMongoTransaction } = require("./mongoTransaction");
const {
  createNotificationOnce,
  notifyBudgetThresholdsForChange,
  runDailySummaryTick,
} = require("./notificationService");

const TIME_ZONE_ALIASES = { IST: "Asia/Kolkata" };
const MAX_CATCH_UP_PER_SCHEDULE = 100;

function normalizeTimeZone(zone) {
  const normalized = TIME_ZONE_ALIASES[String(zone || "UTC").toUpperCase()] || zone || "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone: normalized });
    return normalized;
  } catch {
    throw new TypeError(`Invalid IANA time zone: ${zone}`);
  }
}

function zonedParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map(({ type, value }) => [type, Number(value)]));
}

function localPartsToDate(parts, timeZone) {
  const desired = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour || 0, parts.minute || 0, parts.second || 0);
  let guess = desired;
  for (let i = 0; i < 4; i += 1) {
    const actual = zonedParts(new Date(guess), timeZone);
    const represented = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
    const correction = desired - represented;
    if (!correction) break;
    guess += correction;
  }
  return new Date(guess);
}

function dateFromInput(value, timeZone) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) throw new TypeError("Invalid recurring start date");
    return date;
  }
  const requested = { year: +match[1], month: +match[2], day: +match[3] };
  if (requested.month < 1 || requested.month > 12 || requested.day < 1 || requested.day > daysInMonth(requested.year, requested.month)) {
    throw new TypeError("Invalid recurring start date");
  }
  return localPartsToDate({ ...requested, hour: 0 }, timeZone);
}

function occurrenceKey(scheduleId, dueDate, timeZone) {
  const p = zonedParts(dueDate, timeZone);
  return `${scheduleId}_${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

function scheduleAnchorFields(startDate, timeZone) {
  const parts = zonedParts(startDate, normalizeTimeZone(timeZone));
  return {
    scheduleDay: parts.day,
    isEndOfMonth: parts.day === daysInMonth(parts.year, parts.month),
  };
}

function addCalendarDays(parts, days) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function nextOccurrenceDate(currentDate, schedule) {
  const timeZone = normalizeTimeZone(schedule.timeZone);
  const parts = zonedParts(currentDate, timeZone);
  const interval = Math.max(1, Number(schedule.interval) || 1);
  let date = { year: parts.year, month: parts.month, day: parts.day };
  if (schedule.frequency === "daily") date = addCalendarDays(date, interval);
  else if (schedule.frequency === "weekly") date = addCalendarDays(date, 7 * interval);
  else if (schedule.frequency === "monthly") {
    const totalMonths = parts.year * 12 + (parts.month - 1) + interval;
    date.year = Math.floor(totalMonths / 12);
    date.month = (totalMonths % 12) + 1;
    const startParts = zonedParts(schedule.startDate || currentDate, timeZone);
    const anchorDay = schedule.scheduleDay || startParts.day;
    const preserveEndOfMonth = schedule.isEndOfMonth === undefined
      ? anchorDay === daysInMonth(startParts.year, startParts.month)
      : schedule.isEndOfMonth;
    const day = preserveEndOfMonth ? daysInMonth(date.year, date.month) : Math.min(anchorDay, daysInMonth(date.year, date.month));
    date.day = day;
  } else if (schedule.frequency === "yearly") {
    date.year += interval;
    const startParts = zonedParts(schedule.startDate || currentDate, timeZone);
    date.day = Math.min(schedule.scheduleDay || startParts.day, daysInMonth(date.year, date.month));
  } else {
    date = addCalendarDays(date, 30 * interval);
  }
  return localPartsToDate({ ...date, hour: parts.hour, minute: parts.minute, second: parts.second }, timeZone);
}

async function postOccurrenceInSession({ occurrenceId, userId, session }) {
  const occurrence = await RecurringOccurrence.findOneAndUpdate(
    { _id: occurrenceId, userId, status: "pending" },
    { $set: { status: "processing" } },
    { new: true, session },
  ).populate("recurringTransactionId");

  if (!occurrence) {
    const existing = await RecurringOccurrence.findOne({ _id: occurrenceId, userId }).session(session);
    if (existing?.status === "posted" && existing.postedTransactionId) {
      const transaction = await Transaction.findOne({ _id: existing.postedTransactionId, userId }).session(session);
      return { occurrence: existing, transaction, alreadyPosted: true };
    }
    throw Object.assign(new Error("Pending occurrence not found or already posted"), { statusCode: 404 });
  }

  const schedule = occurrence.recurringTransactionId;
  if (!schedule || schedule.userId.toString() !== userId.toString()) {
    throw Object.assign(new Error("Associated recurring schedule missing"), { statusCode: 400 });
  }
  const transaction = new Transaction({
    userId,
    transactionNumber: `REC-${occurrence._id}`,
    recurringOccurrenceId: occurrence._id,
    type: schedule.type,
    amount: occurrence.amount,
    currency: schedule.currency,
    accountId: schedule.accountId,
    categoryId: schedule.categoryId,
    transactionDate: occurrence.dueDate,
    description: `${schedule.description} (Recurring)`,
    paymentMethod: "other",
  });
  await transaction.save({ session });
  await LedgerService.applyTransactionDelta(transaction, false, session);
  occurrence.status = "posted";
  occurrence.postedTransactionId = transaction._id;
  occurrence.postedAt = new Date();
  await occurrence.save({ session });
  return { occurrence, transaction, alreadyPosted: false };
}

async function materializeDueOccurrence(scheduleId, expectedDueDate, now = new Date()) {
  let transactionForBudgetAlert = null;
  const advanced = await withMongoTransaction(async (session) => {
    transactionForBudgetAlert = null;
    const schedule = await RecurringTransaction.findOne({
      _id: scheduleId,
      status: "active",
      nextOccurrenceDate: expectedDueDate,
    }).session(session);
    if (!schedule || schedule.nextOccurrenceDate > now) return false;

    const dueDate = schedule.nextOccurrenceDate;
    if (schedule.endDate && dueDate > schedule.endDate) {
      schedule.status = "completed";
      await schedule.save({ session });
      return false;
    }
    const timeZone = normalizeTimeZone(schedule.timeZone);
    const key = occurrenceKey(schedule._id, dueDate, timeZone);
    let occurrence = await RecurringOccurrence.findOne({ recurringTransactionId: schedule._id, occurrenceKey: key }).session(session);
    if (!occurrence) {
      occurrence = new RecurringOccurrence({
        userId: schedule.userId,
        recurringTransactionId: schedule._id,
        occurrenceKey: key,
        dueDate,
        amount: schedule.amount,
        status: "pending",
      });
      await occurrence.save({ session });
    } else if (occurrence.status === "upcoming" || occurrence.status === "processing") {
      // A committed processing state can only be a legacy/stale claim from an
      // earlier worker version; active claims remain uncommitted in a session.
      occurrence.status = "pending";
      await occurrence.save({ session });
    }

    const nextDate = nextOccurrenceDate(dueDate, schedule);
    schedule.nextOccurrenceDate = nextDate;
    if (schedule.endDate && nextDate > schedule.endDate) schedule.status = "completed";
    await schedule.save({ session });
    if (schedule.autoPostEnabled && occurrence.status === "pending") {
      const result = await postOccurrenceInSession({ occurrenceId: occurrence._id, userId: schedule.userId, session });
      transactionForBudgetAlert = result.transaction;
    }
    return true;
  });
  if (transactionForBudgetAlert) {
    await notifyBudgetThresholdsForChange({ currentTransaction: transactionForBudgetAlert });
  }
  return advanced;
}

function reminderTriggerDate(schedule) {
  const timeZone = normalizeTimeZone(schedule.timeZone);
  const due = zonedParts(schedule.nextOccurrenceDate, timeZone);
  const configuredReminderDays = Number(schedule.reminderBeforeDays);
  const reminderDays = Number.isFinite(configuredReminderDays) ? Math.max(0, configuredReminderDays) : 1;
  const reminderDay = addCalendarDays(due, -reminderDays);
  return localPartsToDate({ ...reminderDay, hour: due.hour, minute: due.minute, second: due.second }, timeZone);
}

function localDateDifference(later, earlier, timeZone) {
  const laterParts = zonedParts(later, timeZone);
  const earlierParts = zonedParts(earlier, timeZone);
  const laterDay = Date.UTC(laterParts.year, laterParts.month - 1, laterParts.day);
  const earlierDay = Date.UTC(earlierParts.year, earlierParts.month - 1, earlierParts.day);
  return Math.round((laterDay - earlierDay) / 86_400_000);
}

async function runRecurringReminderTick({ now = new Date(), logger = console } = {}) {
  const maxLookAhead = new Date(now.getTime() + 366 * 24 * 60 * 60 * 1000);
  const schedules = RecurringTransaction.find({
    status: "active",
    reminderEnabled: true,
    nextOccurrenceDate: { $lte: maxLookAhead },
  })
    .select("_id userId description type amount currency timeZone nextOccurrenceDate reminderBeforeDays autoPostEnabled")
    .lean()
    .cursor();

  let notified = 0;
  for await (const schedule of schedules) {
    try {
      const timeZone = normalizeTimeZone(schedule.timeZone);
      const dueDate = new Date(schedule.nextOccurrenceDate);
      if (now < reminderTriggerDate(schedule)) continue;

      const daysUntilDue = localDateDifference(dueDate, now, timeZone);
      const dueLabel = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone }).format(dueDate);
      const timing = daysUntilDue < 0
        ? `was due on ${dueLabel}`
        : daysUntilDue === 0
          ? "is due today"
          : daysUntilDue === 1
            ? "is due tomorrow"
            : `is due in ${daysUntilDue} days (${dueLabel})`;
      const amount = new Intl.NumberFormat("en", { style: "currency", currency: schedule.currency }).format(schedule.amount);
      const key = occurrenceKey(schedule._id, dueDate, timeZone);

      const created = await createNotificationOnce({
        userId: schedule.userId,
        dedupeKey: `recurring:${key}`,
        type: "recurring_reminder",
        severity: schedule.autoPostEnabled ? "info" : "warning",
        title: "Upcoming recurring transaction",
        message: `${schedule.description} (${amount}) ${timing}.${schedule.autoPostEnabled ? " It is set to post automatically." : " Review it in Recurring Transactions."}`,
        link: "/recurring?tab=upcoming",
      });
      if (created) notified += 1;
    } catch (error) {
      logger.error?.("Unable to create recurring reminder notification", {
        scheduleId: String(schedule._id),
        error: error.message,
      });
    }
  }
  return notified;
}

async function runRecurringWorkerTick({ now = new Date(), logger = console } = {}) {
  const dueSchedules = await RecurringTransaction.find({ status: "active", nextOccurrenceDate: { $lte: now } })
    .sort({ nextOccurrenceDate: 1 })
    .limit(100)
    .select("_id nextOccurrenceDate");
  let processed = 0;
  for (const schedule of dueSchedules) {
    for (let count = 0; count < MAX_CATCH_UP_PER_SCHEDULE; count += 1) {
      const expected = schedule.nextOccurrenceDate;
      try {
        const advanced = await materializeDueOccurrence(schedule._id, expected, now);
        if (!advanced) break;
        processed += 1;
        const refreshed = await RecurringTransaction.findById(schedule._id).select("nextOccurrenceDate status");
        if (!refreshed || refreshed.status !== "active" || refreshed.nextOccurrenceDate > now) break;
        schedule.nextOccurrenceDate = refreshed.nextOccurrenceDate;
      } catch (error) {
        logger.error?.("Recurring worker schedule failed", { scheduleId: String(schedule._id), error: error.message });
        break;
      }
    }
  }
  return processed;
}

function startRecurringWorker({ intervalMs = 30_000, logger = console } = {}) {
  let stopped = false;
  let running = false;
  let lastDailySummaryTickMinute = null;
  const tick = async () => {
    if (stopped || running) return;
    running = true;
    try {
      try { await runRecurringReminderTick({ logger }); }
      catch (error) { logger.error?.("Recurring reminder tick failed", error); }
      try { await runRecurringWorkerTick({ logger }); }
      catch (error) { logger.error?.("Recurring worker tick failed", error); }
      const currentMinute = Math.floor(Date.now() / 60_000);
      if (lastDailySummaryTickMinute !== currentMinute) {
        lastDailySummaryTickMinute = currentMinute;
        try { await runDailySummaryTick({ logger }); }
        catch (error) { logger.error?.("Daily summary notification tick failed", error); }
      }
    } finally {
      running = false;
    }
  };
  const timer = setInterval(tick, intervalMs);
  timer.unref?.();
  void tick();
  return () => { stopped = true; clearInterval(timer); };
}

module.exports = {
  normalizeTimeZone,
  dateFromInput,
  occurrenceKey,
  scheduleAnchorFields,
  nextOccurrenceDate,
  postOccurrenceInSession,
  materializeDueOccurrence,
  runRecurringReminderTick,
  runRecurringWorkerTick,
  startRecurringWorker,
};
