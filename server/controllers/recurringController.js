const RecurringTransaction = require("../models/RecurringTransaction");
const RecurringOccurrence = require("../models/RecurringOccurrence");
const Account = require("../models/Account");
const Category = require("../models/Category");
const { toMinorUnits, toMajorUnits } = require("../utils/moneyUtils");
const { withMongoTransaction } = require("../services/mongoTransaction");
const {
  dateFromInput,
  occurrenceKey,
  normalizeTimeZone,
  scheduleAnchorFields,
  nextOccurrenceDate,
  postOccurrenceInSession,
} = require("../services/recurringService");
const { notifyBudgetThresholdsForChange } = require("../services/notificationService");

// 1. Get recurring schedules
exports.getRecurringTransactions = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = { userId: req.user._id };
    if (status) filter.status = status;
    else filter.status = { $ne: "cancelled" };

    const recurring = await RecurringTransaction.find(filter)
      .populate("accountId", "name type currency color icon")
      .populate("categoryId", "name type icon color")
      .sort({ nextOccurrenceDate: 1 });

    res.status(200).json({
      success: true,
      data: recurring,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Create recurring schedule & initial upcoming occurrence
exports.createRecurringTransaction = async (req, res, next) => {
  try {
    const {
      type,
      amount,
      currency,
      accountId,
      categoryId,
      description,
      frequency,
      interval,
      startDate,
      endDate,
      reminderEnabled,
      reminderBeforeDays,
      autoPostEnabled,
    } = req.body;

    const timeZone = normalizeTimeZone(req.user.timezone || "UTC");
    const start = startDate ? dateFromInput(startDate, timeZone) : new Date();
    const account = await Account.findOne({ _id: accountId, userId: req.user._id });
    if (!account) return res.status(400).json({ success: false, message: "Valid account is required" });
    const normalizedCurrency = String(currency || account.currency).toUpperCase();
    if (normalizedCurrency !== account.currency) {
      return res.status(400).json({ success: false, message: "Recurring currency must match the account currency" });
    }
    const category = await Category.findOne({ _id: categoryId, userId: req.user._id });
    if (!category || category.type !== type) {
      return res.status(400).json({ success: false, message: "A category of the matching type is required" });
    }

    const recurringData = {
      userId: req.user._id,
      type,
      amount: toMajorUnits(toMinorUnits(Number(amount), normalizedCurrency), normalizedCurrency),
      currency: normalizedCurrency,
      accountId,
      categoryId,
      description,
      frequency: frequency || "monthly",
      interval: parseInt(interval, 10) || 1,
      startDate: start,
      endDate: endDate ? new Date(endDate) : null,
      nextOccurrenceDate: start,
      timeZone,
      ...scheduleAnchorFields(start, timeZone),
      reminderEnabled: reminderEnabled !== undefined ? reminderEnabled : true,
      reminderBeforeDays: parseInt(reminderBeforeDays, 10) || 1,
      autoPostEnabled: Boolean(autoPostEnabled),
      status: "active",
    };

    let recurring;
    await withMongoTransaction(async (session) => {
      recurring = new RecurringTransaction(recurringData);
      await recurring.save({ session });
      const key = occurrenceKey(recurring._id, start, timeZone);
      const firstOccurrence = new RecurringOccurrence({
        userId: req.user._id,
        recurringTransactionId: recurring._id,
        occurrenceKey: key,
        dueDate: start,
        amount: recurring.amount,
        status: start <= new Date() ? "pending" : "upcoming",
      });
      await firstOccurrence.save({ session });
    });

    const populated = await RecurringTransaction.findById(recurring._id)
      .populate("accountId", "name type currency color icon")
      .populate("categoryId", "name type icon color");

    res.status(201).json({
      success: true,
      message: "Recurring schedule created successfully",
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// 3. Update a schedule without changing already-posted occurrences.
exports.updateRecurringTransaction = async (req, res, next) => {
  try {
    const updatedId = await withMongoTransaction(async (session) => {
      const schedule = await RecurringTransaction.findOne({ _id: req.params.id, userId: req.user._id }).session(session);
      if (!schedule) throw Object.assign(new Error("Recurring schedule not found"), { statusCode: 404 });
      if (["cancelled", "completed"].includes(schedule.status)) {
        throw Object.assign(new Error("Only active or paused schedules can be edited"), { statusCode: 409 });
      }

      const { type, amount, accountId, categoryId, description, frequency, interval, startDate, endDate, autoPostEnabled } = req.body;
      const nextType = type ?? schedule.type;
      if (!["income", "expense"].includes(nextType)) {
        throw Object.assign(new Error("Transaction type must be income or expense"), { statusCode: 400 });
      }
      const nextFrequency = frequency ?? schedule.frequency;
      if (!["daily", "weekly", "monthly", "yearly", "custom"].includes(nextFrequency)) {
        throw Object.assign(new Error("Recurring frequency is invalid"), { statusCode: 400 });
      }
      const nextInterval = interval === undefined ? (Number(schedule.interval) || 1) : Number.parseInt(interval, 10);
      if (!Number.isInteger(nextInterval) || nextInterval < 1 || nextInterval > 365) {
        throw Object.assign(new Error("Recurring interval must be between 1 and 365"), { statusCode: 400 });
      }

      const nextAccountId = accountId ?? schedule.accountId;
      const account = await Account.findOne({ _id: nextAccountId, userId: req.user._id }).session(session);
      if (!account) throw Object.assign(new Error("Valid account is required"), { statusCode: 400 });
      const nextCurrency = String(account.currency).toUpperCase();
      if (req.body.currency && String(req.body.currency).toUpperCase() !== nextCurrency) {
        throw Object.assign(new Error("Recurring currency must match the account currency"), { statusCode: 400 });
      }

      const nextCategoryId = categoryId === undefined ? schedule.categoryId : categoryId;
      if (!nextCategoryId) {
        throw Object.assign(new Error("A category of the matching type is required"), { statusCode: 400 });
      }
      const category = await Category.findOne({ _id: nextCategoryId, userId: req.user._id, type: nextType }).session(session);
      if (!category) {
        throw Object.assign(new Error("A category of the matching type is required"), { statusCode: 400 });
      }

      const nextAmount = amount === undefined ? schedule.amount : Number(amount);
      if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
        throw Object.assign(new Error("Amount must be a valid positive decimal"), { statusCode: 400 });
      }
      const normalizedAmount = toMajorUnits(toMinorUnits(nextAmount, nextCurrency), nextCurrency);
      const nextDescription = description === undefined ? schedule.description : String(description).trim();
      if (!nextDescription) throw Object.assign(new Error("Description is required"), { statusCode: 400 });
      const timeZone = normalizeTimeZone(schedule.timeZone || req.user.timezone || "UTC");
      let nextStartDate = schedule.startDate;
      if (startDate !== undefined) {
        try { nextStartDate = dateFromInput(startDate, timeZone); }
        catch (error) { throw Object.assign(error, { statusCode: 400 }); }
      }
      const startChanged = nextStartDate.getTime() !== schedule.startDate.getTime();

      schedule.type = nextType;
      schedule.amount = normalizedAmount;
      schedule.currency = nextCurrency;
      schedule.accountId = account._id;
      schedule.categoryId = category._id;
      schedule.description = nextDescription;
      schedule.frequency = nextFrequency;
      schedule.interval = nextInterval;
      if (startChanged) {
        schedule.startDate = nextStartDate;
        Object.assign(schedule, scheduleAnchorFields(nextStartDate, timeZone));
      }
      if (endDate !== undefined) {
        if (endDate === null || endDate === "") schedule.endDate = null;
        else {
          try { schedule.endDate = dateFromInput(endDate, timeZone); }
          catch (error) { throw Object.assign(error, { statusCode: 400 }); }
          if (schedule.endDate < schedule.startDate) {
            throw Object.assign(new Error("End date must be on or after the start date"), { statusCode: 400 });
          }
        }
      }
      if (autoPostEnabled !== undefined) schedule.autoPostEnabled = Boolean(autoPostEnabled);

      const now = new Date();
      if (startChanged) {
        let nextDate = nextStartDate;
        const startKey = occurrenceKey(schedule._id, nextStartDate, timeZone);
        const existingAtStart = await RecurringOccurrence.findOne({
          recurringTransactionId: schedule._id,
          occurrenceKey: startKey,
        }).session(session);
        if (existingAtStart?.status === "posted") nextDate = nextOccurrenceDate(nextStartDate, schedule);
        schedule.nextOccurrenceDate = nextDate;

        await RecurringOccurrence.updateMany(
          { recurringTransactionId: schedule._id, status: { $in: ["pending", "upcoming"] } },
          { $set: { status: "skipped" } },
          { session },
        );

        const nextKey = occurrenceKey(schedule._id, nextDate, timeZone);
        let nextOccurrence = await RecurringOccurrence.findOne({
          recurringTransactionId: schedule._id,
          occurrenceKey: nextKey,
        }).session(session);
        const occurrenceStatus = nextDate <= now ? "pending" : "upcoming";
        if (nextOccurrence?.status !== "posted") {
          if (!nextOccurrence) {
            nextOccurrence = new RecurringOccurrence({
              userId: req.user._id,
              recurringTransactionId: schedule._id,
              occurrenceKey: nextKey,
              dueDate: nextDate,
              amount: normalizedAmount,
              status: occurrenceStatus,
            });
          } else {
            nextOccurrence.dueDate = nextDate;
            nextOccurrence.amount = normalizedAmount;
            nextOccurrence.status = occurrenceStatus;
          }
          await nextOccurrence.save({ session });
        }
      } else {
        await RecurringOccurrence.updateMany(
          { recurringTransactionId: schedule._id, status: { $in: ["pending", "upcoming"] } },
          { $set: { amount: normalizedAmount } },
          { session },
        );
      }

      if (schedule.endDate && schedule.nextOccurrenceDate > schedule.endDate) schedule.status = "completed";
      await schedule.save({ session });
      return schedule._id;
    });

    const populated = await RecurringTransaction.findOne({ _id: updatedId, userId: req.user._id })
      .populate("accountId", "name type currency color icon")
      .populate("categoryId", "name type icon color");
    res.status(200).json({ success: true, message: "Recurring schedule updated successfully", data: populated });
  } catch (error) {
    next(error);
  }
};

// 4. Cancel a schedule and skip its unposted occurrences, preserving ledger history.
exports.deleteRecurringTransaction = async (req, res, next) => {
  try {
    await withMongoTransaction(async (session) => {
      const schedule = await RecurringTransaction.findOne({ _id: req.params.id, userId: req.user._id }).session(session);
      if (!schedule) throw Object.assign(new Error("Recurring schedule not found"), { statusCode: 404 });
      if (schedule.status !== "cancelled") {
        schedule.status = "cancelled";
        await schedule.save({ session });
        await RecurringOccurrence.updateMany(
          { recurringTransactionId: schedule._id, status: { $in: ["pending", "upcoming"] } },
          { $set: { status: "skipped" } },
          { session },
        );
      }
    });
    res.status(200).json({ success: true, message: "Recurring schedule cancelled; posted transactions remain in your history" });
  } catch (error) {
    next(error);
  }
};

// 5. Get pending/upcoming occurrences
exports.getOccurrences = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = { userId: req.user._id };
    if (status) filter.status = status;

    const occurrences = await RecurringOccurrence.find(filter)
      .populate({
        path: "recurringTransactionId",
        populate: [
          { path: "accountId", select: "name type currency color" },
          { path: "categoryId", select: "name type icon color" },
        ],
      })
      .sort({ dueDate: 1 });

    res.status(200).json({
      success: true,
      data: occurrences,
    });
  } catch (error) {
    next(error);
  }
};

// 6. Manually confirm & post a recurring occurrence to the ledger
exports.postOccurrence = async (req, res, next) => {
  try {
    const result = await withMongoTransaction(async (session) => {
      return postOccurrenceInSession({ occurrenceId: req.params.id, userId: req.user._id, session });
    });
    await notifyBudgetThresholdsForChange({ currentTransaction: result.transaction });
    res.status(200).json({
      success: true,
      message: result.alreadyPosted ? "Recurring occurrence was already posted" : "Recurring occurrence posted to transactions successfully",
      data: { occurrence: result.occurrence, transaction: result.transaction },
    });
  } catch (error) {
    next(error);
  }
};

