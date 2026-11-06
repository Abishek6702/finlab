const Budget = require("../models/Budget");
const Transaction = require("../models/Transaction");
const Category = require("../models/Category");
const { addMoney, subtractMoney } = require("../utils/moneyUtils");
const { toMinorUnits, toMajorUnits } = require("../utils/moneyUtils");
const { notifyBudgetThresholdsForBudget } = require("../services/notificationService");

function currentPeriodRange(period, now = new Date()) {
  if (period === "daily") {
    return {
      startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0),
      endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999),
    };
  }
  if (period === "weekly") {
    const day = now.getDay();
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + (day === 0 ? -6 : 1), 0, 0, 0, 0);
    return {
      startDate: monday,
      endDate: new Date(monday.getTime() + 7 * 24 * 60 * 60 * 1000 - 1),
    };
  }
  if (period === "monthly") {
    return {
      startDate: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
      endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  }
  return null;
}

// 1. Get budgets with real-time spending progress
exports.getBudgets = async (req, res, next) => {
  try {
    const { isActive } = req.query;
    const filter = { userId: req.user._id };
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const budgets = await Budget.find(filter)
      .populate("categoryId", "name type icon color")
      .sort({ createdAt: -1 });

    // Calculate real-time actual spending for each budget
    const enrichedBudgets = await Promise.all(
      budgets.map(async (b) => {
        const txFilter = {
          userId: req.user._id,
          currency: b.currency,
          type: "expense",
          isDeleted: false,
          transactionDate: { $gte: b.startDate, $lte: b.endDate },
        };

        if (b.type === "category" && b.categoryId) {
          txFilter.categoryId = b.categoryId._id || b.categoryId;
        }

        const expenses = await Transaction.find(txFilter);
        const spent = expenses.reduce((sum, tx) => addMoney(sum, tx.amount, b.currency), 0);

        // Subtract any linked refunds in this timeframe
        const refundFilter = {
          userId: req.user._id,
          currency: b.currency,
          type: "refund",
          isDeleted: false,
          transactionDate: { $gte: b.startDate, $lte: b.endDate },
        };
        if (b.type === "category" && b.categoryId) {
          refundFilter.categoryId = b.categoryId._id || b.categoryId;
        }
        const refunds = await Transaction.find(refundFilter);
        const refunded = refunds.reduce((sum, tx) => addMoney(sum, tx.amount, b.currency), 0);

        const netSpent = Math.max(0, subtractMoney(spent, refunded, b.currency));
        const remaining = subtractMoney(b.amount, netSpent, b.currency);
        const percentUsed = b.amount > 0 ? Math.round((netSpent / b.amount) * 100) : 0;
        const isOverspent = netSpent > b.amount;

        return {
          ...b.toObject(),
          spent: netSpent,
          currentSpent: netSpent,
          remaining,
          percentUsed,
          isOverspent,
          isOverBudget: isOverspent,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: enrichedBudgets,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Create Budget
exports.createBudget = async (req, res, next) => {
  try {
    const { name, type, categoryId, amount, currency, period, startDate, endDate, rolloverEnabled, alertThresholds } = req.body;

    const budgetCurrency = String(currency || req.user.baseCurrency || "USD").toUpperCase();
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: "Budget amount must be a valid positive decimal" });
    }

    const budgetPeriod = period || "monthly";
    const now = new Date();

    let start;
    let end;

    if (startDate) {
      start = new Date(startDate);
    } else {
      if (budgetPeriod === "monthly") {
        // Start of current month (00:00:00.000)
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      } else if (budgetPeriod === "weekly") {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday start
        start = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
      } else if (budgetPeriod === "daily") {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      } else {
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      }
    }

    if (endDate) {
      end = new Date(endDate);
    } else {
      if (budgetPeriod === "monthly") {
        // End of the month (23:59:59.999)
        end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
      } else if (budgetPeriod === "weekly") {
        end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000 + 86399999);
      } else if (budgetPeriod === "daily") {
        end = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59, 59, 999);
      } else {
        end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
      }
    }

    const budget = new Budget({
      userId: req.user._id,
      name,
      type: type || "category",
      categoryId: type === "category" ? categoryId : null,
      amount: toMajorUnits(toMinorUnits(parsedAmount, budgetCurrency), budgetCurrency),
      currency: budgetCurrency,
      period: budgetPeriod,
      startDate: start,
      endDate: end,
      rolloverEnabled: Boolean(rolloverEnabled),
      alertThresholds: alertThresholds || [50, 75, 90, 100],
    });

    await budget.save();

    const populated = await Budget.findById(budget._id).populate("categoryId", "name type icon color");
    await notifyBudgetThresholdsForBudget(populated || budget);

    res.status(201).json({
      success: true,
      message: "Budget created successfully",
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// 3. Update Budget
exports.updateBudget = async (req, res, next) => {
  try {
    const budget = await Budget.findOne({ _id: req.params.id, userId: req.user._id });
    if (!budget) {
      return res.status(404).json({ success: false, message: "Budget not found" });
    }

    const { name, amount, rolloverEnabled, isActive, alertThresholds, type, categoryId, period } = req.body;
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ success: false, message: "Budget name is required" });
      }
      budget.name = name.trim();
    }
    if (amount !== undefined) {
      const value = Number(amount);
      if (!Number.isFinite(value) || value <= 0) return res.status(400).json({ success: false, message: "Budget amount must be a valid positive decimal" });
      budget.amount = toMajorUnits(toMinorUnits(value, budget.currency), budget.currency);
    }
    if (type !== undefined) {
      if (!["overall", "category"].includes(type)) {
        return res.status(400).json({ success: false, message: "Budget type must be overall or category" });
      }
      budget.type = type;
    }
    if (period !== undefined) {
      if (!["daily", "weekly", "monthly", "custom"].includes(period)) {
        return res.status(400).json({ success: false, message: "Budget period is invalid" });
      }
      if (period !== budget.period) {
        const range = currentPeriodRange(period);
        if (!range) {
          return res.status(400).json({ success: false, message: "Custom periods require explicit start and end dates" });
        }
        budget.startDate = range.startDate;
        budget.endDate = range.endDate;
      }
      budget.period = period;
    }
    if (budget.type === "category") {
      const nextCategoryId = categoryId !== undefined ? categoryId : budget.categoryId;
      if (!nextCategoryId) {
        return res.status(400).json({ success: false, message: "Select a valid expense category for this budget" });
      }
      const category = nextCategoryId
        ? await Category.findOne({ _id: nextCategoryId, userId: req.user._id, type: "expense" })
        : null;
      if (!category) {
        return res.status(400).json({ success: false, message: "Select a valid expense category for this budget" });
      }
      budget.categoryId = category._id;
    } else {
      budget.categoryId = null;
    }
    if (rolloverEnabled !== undefined) budget.rolloverEnabled = rolloverEnabled;
    if (isActive !== undefined) budget.isActive = isActive;
    if (alertThresholds) budget.alertThresholds = alertThresholds;

    await budget.save();
    await notifyBudgetThresholdsForBudget(budget);

    res.status(200).json({
      success: true,
      message: "Budget updated successfully",
      data: budget,
    });
  } catch (error) {
    next(error);
  }
};

// 4. Delete Budget
exports.deleteBudget = async (req, res, next) => {
  try {
    const budget = await Budget.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!budget) {
      return res.status(404).json({ success: false, message: "Budget not found" });
    }

    res.status(200).json({
      success: true,
      message: "Budget deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

