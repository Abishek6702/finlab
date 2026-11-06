const SavingsGoal = require("../models/SavingsGoal");
const SavingsContribution = require("../models/SavingsContribution");
const Account = require("../models/Account");
const { addMoney, subtractMoney } = require("../utils/moneyUtils");
const { withMongoTransaction } = require("../services/mongoTransaction");
const { toMinorUnits, toMajorUnits } = require("../utils/moneyUtils");

// 1. Get savings goals
exports.getSavingsGoals = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = { userId: req.user._id };
    if (status) filter.status = status;

    const goals = await SavingsGoal.find(filter)
      .populate("linkedAccountId", "name type currency currentBalance")
      .sort({ targetDate: 1 });

    const enriched = goals.map((g) => {
      const percentage = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
      const remaining = Math.max(0, subtractMoney(g.targetAmount, g.currentAmount, g.currency));
      return {
        ...g.toObject(),
        percentage,
        remaining,
      };
    });

    res.status(200).json({
      success: true,
      data: enriched,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Create savings goal
exports.createSavingsGoal = async (req, res, next) => {
  try {
    const { name, description, targetAmount, currency, linkedAccountId, targetDate, color } = req.body;

    const goalCurrency = String(currency || req.user.baseCurrency || "USD").toUpperCase();
    const parsedTarget = Number(targetAmount);
    if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      return res.status(400).json({ success: false, message: "Target amount must be a valid positive decimal" });
    }
    if (linkedAccountId) {
      const linkedAccount = await Account.findOne({ _id: linkedAccountId, userId: req.user._id });
      if (!linkedAccount) return res.status(400).json({ success: false, message: "Linked account was not found" });
      if (linkedAccount.currency !== goalCurrency) {
        return res.status(400).json({ success: false, message: "Savings goal currency must match the linked account currency" });
      }
    }
    const parsedTargetDate = targetDate ? new Date(targetDate) : null;
    if (parsedTargetDate && !Number.isFinite(parsedTargetDate.getTime())) {
      return res.status(400).json({ success: false, message: "Target date is invalid" });
    }
    const normalizedTarget = toMajorUnits(toMinorUnits(parsedTarget, goalCurrency), goalCurrency);
    if (normalizedTarget <= 0) {
      return res.status(400).json({ success: false, message: "Target amount must be at least one minor currency unit" });
    }
    const goal = new SavingsGoal({
      userId: req.user._id,
      name,
      description: description || "",
      targetAmount: normalizedTarget,
      currency: goalCurrency,
      linkedAccountId: linkedAccountId || null,
      targetDate: parsedTargetDate,
      color: color || "#16A34A",
      status: "active",
    });

    await goal.save();

    res.status(201).json({
      success: true,
      message: "Savings goal created successfully",
      data: goal,
    });
  } catch (error) {
    next(error);
  }
};

// 3. Update goal details or pause/resume it without altering contributions.
exports.updateSavingsGoal = async (req, res, next) => {
  try {
    const goal = await SavingsGoal.findOne({ _id: req.params.id, userId: req.user._id });
    if (!goal) return res.status(404).json({ success: false, message: "Savings goal not found" });

    const { name, description, targetAmount, targetDate, linkedAccountId, currency, status } = req.body;
    if (currency && String(currency).toUpperCase() !== goal.currency) {
      return res.status(400).json({ success: false, message: "A goal's currency cannot be changed after creation" });
    }
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) return res.status(400).json({ success: false, message: "Goal name is required" });
      goal.name = name.trim();
    }
    if (description !== undefined) goal.description = String(description).trim();
    if (targetAmount !== undefined) {
      const parsedTarget = Number(targetAmount);
      if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
        return res.status(400).json({ success: false, message: "Target amount must be a valid positive decimal" });
      }
      const normalizedTarget = toMajorUnits(toMinorUnits(parsedTarget, goal.currency), goal.currency);
      if (normalizedTarget <= 0) {
        return res.status(400).json({ success: false, message: "Target amount must be at least one minor currency unit" });
      }
      goal.targetAmount = normalizedTarget;
    }
    if (targetDate !== undefined) {
      if (!targetDate) goal.targetDate = null;
      else {
        const parsedTargetDate = new Date(targetDate);
        if (!Number.isFinite(parsedTargetDate.getTime())) return res.status(400).json({ success: false, message: "Target date is invalid" });
        goal.targetDate = parsedTargetDate;
      }
    }
    if (linkedAccountId !== undefined) {
      if (!linkedAccountId) goal.linkedAccountId = null;
      else {
        const account = await Account.findOne({ _id: linkedAccountId, userId: req.user._id });
        if (!account) return res.status(400).json({ success: false, message: "Linked account was not found" });
        if (account.currency !== goal.currency) {
          return res.status(400).json({ success: false, message: "Savings goal currency must match the linked account currency" });
        }
        goal.linkedAccountId = account._id;
      }
    }
    if (status !== undefined) {
      if (!["active", "paused"].includes(status)) {
        return res.status(400).json({ success: false, message: "Goal status must be active or paused" });
      }
      goal.status = status;
    }
    if (goal.status !== "paused") {
      goal.status = goal.currentAmount >= goal.targetAmount ? "completed" : "active";
    }

    await goal.save();
    const populated = await SavingsGoal.findOne({ _id: goal._id, userId: req.user._id })
      .populate("linkedAccountId", "name type currency currentBalance");
    res.status(200).json({ success: true, message: "Savings goal updated successfully", data: populated });
  } catch (error) {
    next(error);
  }
};

// 4. Delete a goal and its internal contribution log atomically; no account ledger is changed.
exports.deleteSavingsGoal = async (req, res, next) => {
  try {
    await withMongoTransaction(async (session) => {
      const goal = await SavingsGoal.findOne({ _id: req.params.id, userId: req.user._id }).session(session);
      if (!goal) throw Object.assign(new Error("Savings goal not found"), { statusCode: 404 });
      await SavingsContribution.deleteMany({ goalId: goal._id, userId: req.user._id }, { session });
      await goal.deleteOne({ session });
    });
    res.status(200).json({ success: true, message: "Savings goal and its contribution history were deleted" });
  } catch (error) {
    next(error);
  }
};

// 5. Add contribution or withdrawal to goal
exports.recordContribution = async (req, res, next) => {
  try {
    const { type = "deposit", amount, notes, date } = req.body;
    let numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: "Valid positive amount is required" });
    }

    if (!["deposit", "withdrawal"].includes(type)) {
      return res.status(400).json({ success: false, message: "Contribution type must be deposit or withdrawal" });
    }
    const result = await withMongoTransaction(async (session) => {
      const goal = await SavingsGoal.findOne({ _id: req.params.id, userId: req.user._id }).session(session);
      if (!goal) throw Object.assign(new Error("Savings goal not found"), { statusCode: 404 });
      if (goal.status === "paused") {
        throw Object.assign(new Error("Resume this goal before recording a contribution"), { statusCode: 409 });
      }
      if (goal.status === "completed" && type === "deposit") {
        throw Object.assign(new Error("This goal is complete; increase its target before adding more savings"), { statusCode: 409 });
      }
      numAmount = toMajorUnits(toMinorUnits(numAmount, goal.currency), goal.currency);
      if (numAmount <= 0) {
        throw Object.assign(new Error("Amount must be at least one minor currency unit"), { statusCode: 400 });
      }
      if (type === "withdrawal" && numAmount > goal.currentAmount) {
        throw Object.assign(new Error(`Withdrawal amount (${numAmount}) exceeds current savings balance (${goal.currentAmount})`), { statusCode: 400 });
      }
      const contribution = new SavingsContribution({
        userId: req.user._id,
        goalId: goal._id,
        type,
        amount: numAmount,
        date: date ? new Date(date) : new Date(),
        notes: notes || "",
      });
      await contribution.save({ session });
      const currency = goal.currency;
      goal.currentAmount = type === "deposit"
        ? addMoney(goal.currentAmount, numAmount, currency)
        : subtractMoney(goal.currentAmount, numAmount, currency);
      goal.status = goal.currentAmount >= goal.targetAmount ? "completed" : "active";
      await goal.save({ session });
      return { goal, contribution };
    });

    res.status(201).json({
      success: true,
      message: `${type === "deposit" ? "Contribution" : "Withdrawal"} recorded successfully`,
      data: {
        goal: result.goal,
        contribution: result.contribution,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 6. Get contribution history for a goal
exports.getGoalHistory = async (req, res, next) => {
  try {
    const goal = await SavingsGoal.findOne({ _id: req.params.id, userId: req.user._id });
    if (!goal) {
      return res.status(404).json({ success: false, message: "Savings goal not found" });
    }

    const contributions = await SavingsContribution.find({ goalId: goal._id, userId: req.user._id }).sort({ date: -1 });

    res.status(200).json({
      success: true,
      data: {
        goal,
        contributions,
      },
    });
  } catch (error) {
    next(error);
  }
};

