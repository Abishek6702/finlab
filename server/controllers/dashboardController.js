const Account = require("../models/Account");
const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");
const RecurringOccurrence = require("../models/RecurringOccurrence");
const SavingsGoal = require("../models/SavingsGoal");
const { addMoney, subtractMoney } = require("../utils/moneyUtils");

exports.getDashboardSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const baseCurrency = req.user.baseCurrency || "USD";

    // 1. Fetch user accounts (active)
    const accounts = await Account.find({ userId, isArchived: false });

    // Distinct asset balances vs credit card liabilities
    const currencyBalances = {};
    let totalAssetsBase = 0;
    let totalLiabilitiesBase = 0;

    accounts.forEach((acc) => {
      if (!currencyBalances[acc.currency]) {
        currencyBalances[acc.currency] = { assets: 0, liabilities: 0, net: 0 };
      }
      if (acc.type === "credit_card") {
        currencyBalances[acc.currency].liabilities = addMoney(currencyBalances[acc.currency].liabilities, acc.currentBalance, acc.currency);
        if (acc.currency === baseCurrency) {
          totalLiabilitiesBase = addMoney(totalLiabilitiesBase, acc.currentBalance, baseCurrency);
        }
      } else {
        currencyBalances[acc.currency].assets = addMoney(currencyBalances[acc.currency].assets, acc.currentBalance, acc.currency);
        if (acc.currency === baseCurrency) {
          totalAssetsBase = addMoney(totalAssetsBase, acc.currentBalance, baseCurrency);
        }
      }
      currencyBalances[acc.currency].net = subtractMoney(
        currencyBalances[acc.currency].assets,
        currencyBalances[acc.currency].liabilities
        , acc.currency
      );
    });

    // 2. Month boundaries
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // 3. Current month active transactions
    const monthlyTransactions = await Transaction.find({
      userId,
      isDeleted: false,
      transactionDate: { $gte: startOfMonth, $lte: endOfMonth },
    });

    const monthlyByCurrency = {};

    monthlyTransactions.forEach((tx) => {
      const currency = tx.currency || "USD";
      monthlyByCurrency[currency] ||= { income: 0, expenses: 0 };
      // Exclude transfers from income & expenses
      if (tx.type === "income") {
        monthlyByCurrency[currency].income = addMoney(monthlyByCurrency[currency].income, tx.amount, currency);
      } else if (tx.type === "expense") {
        monthlyByCurrency[currency].expenses = addMoney(monthlyByCurrency[currency].expenses, tx.amount, currency);
      } else if (tx.type === "refund") {
        // Refunds reduce net spending
        monthlyByCurrency[currency].expenses = subtractMoney(monthlyByCurrency[currency].expenses, tx.amount, currency);
      }
    });

    const monthlyIncome = monthlyByCurrency[baseCurrency]?.income || 0;
    const monthlyExpenses = monthlyByCurrency[baseCurrency]?.expenses || 0;
    const netSavings = subtractMoney(monthlyIncome, monthlyExpenses, baseCurrency);
    const savingsRate = monthlyIncome > 0 ? Math.max(0, Math.min(100, Math.round((netSavings / monthlyIncome) * 100))) : 0;

    // 4. Recent transactions (latest 10, most recently created 1st)
    const recentTransactions = await Transaction.find({ userId, isDeleted: false })
      .populate("accountId", "name type currency color icon")
      .populate("categoryId", "name type icon color")
      .sort({ createdAt: -1, transactionDate: -1 })
      .limit(10);

    // 5. Active savings goals
    const savingsGoals = await SavingsGoal.find({ userId, status: "active" }).limit(5);

    // 6. Upcoming recurring reminders
    const upcomingRecurring = await RecurringOccurrence.find({
      userId,
      status: { $in: ["upcoming", "pending"] },
      dueDate: { $gte: now, $lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
    })
      .populate("recurringTransactionId", "description type frequency accountId categoryId")
      .sort({ dueDate: 1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        baseCurrency,
        totalBalance: subtractMoney(totalAssetsBase, totalLiabilitiesBase, baseCurrency),
        totalAssets: totalAssetsBase,
        totalLiabilities: totalLiabilitiesBase,
        currencyBalances,
        monthly: {
          income: monthlyIncome,
          expenses: monthlyExpenses,
          netSavings,
          savingsRate,
          currency: baseCurrency,
          byCurrency: monthlyByCurrency,
          monthName: now.toLocaleString("default", { month: "long" }),
        },
        accounts,
        recentTransactions,
        savingsGoals,
        upcomingRecurring,
      },
    });
  } catch (error) {
    next(error);
  }
};

