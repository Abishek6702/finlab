const Budget = require("../models/Budget");
const Transaction = require("../models/Transaction");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { toMinorUnits, toMajorUnits } = require("../utils/moneyUtils");

const DEFAULT_BUDGET_THRESHOLDS = [50, 75, 90, 100];
const TIME_ZONE_ALIASES = { IST: "Asia/Kolkata" };

function normalizeTimeZone(timeZone) {
  const normalized = TIME_ZONE_ALIASES[String(timeZone || "UTC").toUpperCase()] || timeZone || "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone: normalized });
    return normalized;
  } catch {
    return "UTC";
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
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = zonedParts(new Date(guess), timeZone);
    const represented = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
    const correction = desired - represented;
    if (!correction) break;
    guess += correction;
  }
  return new Date(guess);
}

function nextLocalDate(parts) {
  const next = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() };
}

function parseDailySummaryTime(value = process.env.DAILY_SUMMARY_TIME || "23:00") {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value));
  if (!match) return { hour: 23, minute: 0 };
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

function formatMinorAmount(minorAmount, currency) {
  return new Intl.NumberFormat("en", { style: "currency", currency })
    .format(toMajorUnits(minorAmount, currency));
}

function idOf(value) {
  return value ? String(value._id || value) : "";
}

function budgetContributionMinor(transaction, budget) {
  if (!transaction || transaction.isDeleted || !["expense", "refund"].includes(transaction.type)) return 0;
  if (idOf(transaction.userId) !== idOf(budget.userId)) return 0;
  if (String(transaction.currency || "").toUpperCase() !== String(budget.currency || "").toUpperCase()) return 0;

  const transactionDate = new Date(transaction.transactionDate).getTime();
  if (transactionDate < new Date(budget.startDate).getTime() || transactionDate > new Date(budget.endDate).getTime()) return 0;
  if (budget.type === "category" && idOf(transaction.categoryId) !== idOf(budget.categoryId)) return 0;

  const amountMinor = toMinorUnits(transaction.amount, budget.currency);
  return transaction.type === "expense" ? amountMinor : -amountMinor;
}

function thresholdsFor(budget) {
  const configured = Array.isArray(budget.alertThresholds) && budget.alertThresholds.length
    ? budget.alertThresholds
    : DEFAULT_BUDGET_THRESHOLDS;
  return [...new Set(configured.map(Number).filter((value) => Number.isInteger(value) && value > 0 && value <= 100))]
    .sort((a, b) => a - b);
}

function formatAmount(amountMinor, currency) {
  const amount = amountMinor / (10 ** new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).resolvedOptions().maximumFractionDigits);
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(amount);
}

async function createNotificationOnce({ userId, dedupeKey, ...data }) {
  try {
    const createdAt = new Date();
    const result = await Notification.updateOne(
      { userId, dedupeKey },
      { $setOnInsert: { userId, dedupeKey, isDismissed: false, ...data, createdAt, updatedAt: createdAt } },
      { upsert: true, timestamps: false },
    );
    return Boolean(result.upsertedCount || result.upsertedId);
  } catch (error) {
    // Concurrent worker requests may race to insert the same unique key.
    if (error.code === 11000) return false;
    throw error;
  }
}

async function currentBudgetSpendMinor(budget) {
  const filter = {
    userId: budget.userId,
    currency: budget.currency,
    type: { $in: ["expense", "refund"] },
    isDeleted: false,
    transactionDate: { $gte: budget.startDate, $lte: budget.endDate },
  };
  if (budget.type === "category" && budget.categoryId) filter.categoryId = budget.categoryId;

  let total = 0;
  const cursor = Transaction.find(filter).select("type amount").lean().cursor();
  for await (const transaction of cursor) {
    const amountMinor = toMinorUnits(transaction.amount, budget.currency);
    total += transaction.type === "expense" ? amountMinor : -amountMinor;
  }
  if (!Number.isSafeInteger(total)) throw new RangeError("Budget spending exceeds safe minor-unit precision");
  return total;
}

async function createBudgetThresholdAlert(budget, threshold, spentMinor, limitMinor) {
  const percentUsed = Math.floor((spentMinor * 100) / limitMinor);
  const isOverLimit = spentMinor > limitMinor;
  const limitReached = spentMinor >= limitMinor;
  const amountLabel = formatAmount(spentMinor, budget.currency);
  const limitLabel = formatAmount(limitMinor, budget.currency);
  const title = isOverLimit
    ? `${budget.name} is over budget`
    : limitReached
      ? `${budget.name} budget limit reached`
      : `${budget.name} budget warning`;

  await createNotificationOnce({
    userId: budget.userId,
    dedupeKey: `budget:${idOf(budget)}:${new Date(budget.startDate).getTime()}:${threshold}`,
    type: "budget_alert",
    severity: isOverLimit || threshold >= 100 ? "danger" : "warning",
    title,
    message: `You have used ${percentUsed}% of this budget (${amountLabel} of ${limitLabel}).`,
    link: "/budgets",
  });
}

async function notifyBudgetThresholdsForChange({ previousTransaction = null, currentTransaction = null, logger = console } = {}) {
  try {
    const transactions = [previousTransaction, currentTransaction].filter(Boolean);
    if (!transactions.some((transaction) => ["expense", "refund"].includes(transaction.type))) return;

    const userId = transactions[0].userId;
    const currencies = [...new Set(transactions.map((transaction) => transaction.currency).filter(Boolean))];
    const budgets = await Budget.find({ userId, isActive: true, currency: { $in: currencies } }).lean();

    for (const budget of budgets) {
      const previousContribution = budgetContributionMinor(previousTransaction, budget);
      const currentContribution = budgetContributionMinor(currentTransaction, budget);
      if (!previousContribution && !currentContribution) continue;

      const afterRawMinor = await currentBudgetSpendMinor(budget);
      const afterSpentMinor = Math.max(0, afterRawMinor);
      const beforeRawMinor = afterRawMinor - currentContribution + previousContribution;
      const beforeSpentMinor = Math.max(0, beforeRawMinor);
      const limitMinor = toMinorUnits(budget.amount, budget.currency);
      if (limitMinor <= 0) continue;

      const crossedThresholds = thresholdsFor(budget).filter((threshold) => (
        BigInt(beforeSpentMinor) * 100n < BigInt(limitMinor) * BigInt(threshold)
        && BigInt(afterSpentMinor) * 100n >= BigInt(limitMinor) * BigInt(threshold)
      ));
      const highestReachedThreshold = thresholdsFor(budget).filter((threshold) => (
        BigInt(afterSpentMinor) * 100n >= BigInt(limitMinor) * BigInt(threshold)
      )).at(-1);
      const alertThreshold = crossedThresholds.at(-1) ?? highestReachedThreshold;
      if (alertThreshold !== undefined) {
        await createBudgetThresholdAlert(budget, alertThreshold, afterSpentMinor, limitMinor);
      }
    }
  } catch (error) {
    // Alerts are best-effort side effects and must not fail a committed ledger write.
    logger.error?.("Unable to create budget threshold notification", error);
  }
}

async function notifyBudgetThresholdsForBudget(budget, logger = console) {
  try {
    if (!budget || !budget.isActive) return;
    const spentMinor = Math.max(0, await currentBudgetSpendMinor(budget));
    const limitMinor = toMinorUnits(budget.amount, budget.currency);
    if (limitMinor <= 0) return;
    const eligible = thresholdsFor(budget).filter((threshold) => (
      BigInt(spentMinor) * 100n >= BigInt(limitMinor) * BigInt(threshold)
    ));
    const highestReachedThreshold = eligible.at(-1);
    if (highestReachedThreshold !== undefined) {
      await createBudgetThresholdAlert(budget, highestReachedThreshold, spentMinor, limitMinor);
    }
  } catch (error) {
    logger.error?.("Unable to evaluate budget threshold notifications", error);
  }
}

async function createDailySummaryForUser(user, now, sendTime, logger) {
  const timeZone = normalizeTimeZone(user.timezone);
  const today = zonedParts(now, timeZone);
  const localMinutes = today.hour * 60 + today.minute;
  const sendMinutes = sendTime.hour * 60 + sendTime.minute;
  if (localMinutes < sendMinutes) return false;

  const dateKey = `${today.year}-${String(today.month).padStart(2, "0")}-${String(today.day).padStart(2, "0")}`;
  const dedupeKey = `daily-summary:${dateKey}`;
  if (await Notification.exists({ userId: user._id, dedupeKey })) return false;

  const dayStart = localPartsToDate({ ...today, hour: 0, minute: 0, second: 0 }, timeZone);
  const nextDayStart = localPartsToDate({ ...nextLocalDate(today), hour: 0, minute: 0, second: 0 }, timeZone);
  const totals = new Map();
  const cursor = Transaction.find({
    userId: user._id,
    isDeleted: false,
    type: { $in: ["income", "expense", "refund"] },
    transactionDate: { $gte: dayStart, $lt: nextDayStart, $lte: now },
  }).select("type amount currency").lean().cursor();

  for await (const transaction of cursor) {
    const currency = String(transaction.currency || user.baseCurrency || "USD").toUpperCase();
    if (!totals.has(currency)) totals.set(currency, { income: 0, expenses: 0, refunds: 0 });
    const bucket = totals.get(currency);
    const amountMinor = toMinorUnits(transaction.amount, currency);
    if (transaction.type === "income") bucket.income += amountMinor;
    else if (transaction.type === "expense") bucket.expenses += amountMinor;
    else bucket.refunds += amountMinor;
    if (![bucket.income, bucket.expenses, bucket.refunds].every(Number.isSafeInteger)) {
      throw new RangeError("Daily totals exceed safe minor-unit precision");
    }
  }

  if (!totals.size) totals.set(String(user.baseCurrency || "USD").toUpperCase(), { income: 0, expenses: 0, refunds: 0 });
  const breakdown = [...totals.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([currency, amounts]) => {
    const spending = Math.max(0, amounts.expenses - amounts.refunds);
    return `${currency}: income ${formatMinorAmount(amounts.income, currency)}, spending ${formatMinorAmount(spending, currency)}`;
  }).join(" · ");
  const dateLabel = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone }).format(dayStart);

  try {
    return await createNotificationOnce({
      userId: user._id,
      dedupeKey,
      type: "summary",
      severity: "info",
      title: `Daily money summary · ${dateLabel}`,
      message: `Income and spending for ${dateLabel} — ${breakdown}.`,
      link: process.env.DAILY_SUMMARY_URL || "/dashboard",
    });
  } catch (error) {
    logger.error?.("Unable to create daily summary notification", { userId: String(user._id), error: error.message });
    return false;
  }
}

async function runDailySummaryTick({ now = new Date(), logger = console } = {}) {
  const sendTime = parseDailySummaryTime();
  const users = User.find({ isActive: { $ne: false } }).select("_id timezone baseCurrency").lean().cursor();
  let created = 0;
  for await (const user of users) {
    try {
      if (await createDailySummaryForUser(user, now, sendTime, logger)) created += 1;
    } catch (error) {
      logger.error?.("Unable to process user's daily summary", { userId: String(user._id), error: error.message });
    }
  }
  return created;
}

module.exports = {
  createNotificationOnce,
  notifyBudgetThresholdsForChange,
  notifyBudgetThresholdsForBudget,
  parseDailySummaryTime,
  runDailySummaryTick,
};
