const Transaction = require("../models/Transaction");
const Account = require("../models/Account");
const Category = require("../models/Category");
const { toMinor, toMajor } = require("../utils/moneyUtils");

/**
 * Build match filter from query parameters
 */
function buildFilter(userId, query) {
  const match = {
    userId,
    isDeleted: false,
  };

  if (query.accountId) {
    match.accountId = query.accountId;
  }
  if (query.currency) {
    match.currency = query.currency.toUpperCase();
  }
  if (query.categoryId) {
    match.categoryId = query.categoryId;
  }

  // Date range
  const startDate = query.startDate ? new Date(query.startDate) : null;
  const endDate = query.endDate ? new Date(query.endDate) : null;

  if (startDate || endDate) {
    match.transactionDate = {};
    if (startDate) match.transactionDate.$gte = startDate;
    if (endDate) {
      // If time not specified, go to end of day
      const eod = new Date(endDate);
      eod.setHours(23, 59, 59, 999);
      match.transactionDate.$lte = eod;
    }
  }

  return match;
}

/**
 * GET /api/reports/summary
 */
exports.getSummary = async (req, res) => {
  try {
    const match = buildFilter(req.user._id, req.query);

    const txs = await Transaction.find(match)
      .populate("accountId", "name type currency")
      .populate("categoryId", "name type color icon")
      .lean();

    // Group metrics by currency
    const byCurrency = {};

    txs.forEach((tx) => {
      const cur = tx.currency || "USD";
      if (!byCurrency[cur]) {
        byCurrency[cur] = {
          currency: cur,
          incomeMinor: 0,
          expenseMinor: 0,
          refundMinor: 0,
          netSavingsMinor: 0,
          transactionCount: 0,
        };
      }

      const grp = byCurrency[cur];
      grp.transactionCount += 1;
      const amountMinor = toMinor(tx.amount, cur);

      if (tx.type === "income") {
        grp.incomeMinor += amountMinor;
      } else if (tx.type === "expense") {
        grp.expenseMinor += amountMinor;
      } else if (tx.type === "refund") {
        grp.refundMinor += amountMinor;
      }
    });

    // Calculate net savings per currency
    Object.keys(byCurrency).forEach((cur) => {
      const g = byCurrency[cur];
      const netExpenses = Math.max(0, g.expenseMinor - g.refundMinor);
      g.income = toMajor(g.incomeMinor, cur);
      g.expense = toMajor(g.expenseMinor, cur);
      g.refunds = toMajor(g.refundMinor, cur);
      g.netExpenses = toMajor(netExpenses, cur);
      g.netSavings = toMajor(g.incomeMinor - netExpenses, cur);
      g.savingsRate = g.incomeMinor > 0 ? Math.round(((g.incomeMinor - netExpenses) / g.incomeMinor) * 100) : 0;
    });

    res.status(200).json({
      success: true,
      data: {
        summaryByCurrency: byCurrency,
        totalTransactions: txs.length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/reports/category-analysis
 */
exports.getCategoryAnalysis = async (req, res) => {
  try {
    const type = req.query.type || "expense";
    const match = buildFilter(req.user._id, req.query);
    match.type = type;

    const txs = await Transaction.find(match)
      .populate("categoryId", "name color icon type")
      .lean();

    const catMap = {};
    const totalMinorByCurrency = {};

    txs.forEach((tx) => {
      const categoryId = tx.categoryId ? tx.categoryId._id.toString() : "uncategorized";
      const catName = tx.categoryId ? tx.categoryId.name : "Uncategorized";
      const catColor = tx.categoryId ? tx.categoryId.color : "#64748B";
      const catIcon = tx.categoryId ? tx.categoryId.icon : "tag";
      const currency = tx.currency || "USD";
      const catId = `${currency}:${categoryId}`;

      if (!catMap[catId]) {
        catMap[catId] = {
          categoryId: catId,
          currency,
          name: catName,
          color: catColor,
          icon: catIcon,
          totalMinor: 0,
          count: 0,
        };
      }

      const amountMinor = toMinor(tx.amount, currency);
      catMap[catId].totalMinor += amountMinor;
      catMap[catId].count += 1;
      totalMinorByCurrency[currency] = (totalMinorByCurrency[currency] || 0) + amountMinor;
    });

    const categories = Object.values(catMap)
      .map((c) => ({
        ...c,
        total: toMajor(c.totalMinor, c.currency),
        percentage: totalMinorByCurrency[c.currency] > 0 ? Math.round((c.totalMinor / totalMinorByCurrency[c.currency]) * 100) : 0,
      }))
      .sort((a, b) => b.totalMinor - a.totalMinor);

    res.status(200).json({
      success: true,
      data: {
        type,
        totalByCurrency: Object.fromEntries(Object.entries(totalMinorByCurrency).map(([currency, minor]) => [currency, toMajor(minor, currency)])),
        totalAmount: req.query.currency
          ? toMajor(totalMinorByCurrency[req.query.currency.toUpperCase()] || 0, req.query.currency.toUpperCase())
          : Object.keys(totalMinorByCurrency).length === 1
            ? toMajor(Object.values(totalMinorByCurrency)[0], Object.keys(totalMinorByCurrency)[0])
            : null,
        categories,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/reports/cash-flow
 */
exports.getCashFlow = async (req, res) => {
  try {
    const match = buildFilter(req.user._id, req.query);
    // Exclude transfers from cash flow trends as transfers are internal movements
    match.type = { $in: ["income", "expense", "refund"] };

    const txs = await Transaction.find(match)
      .sort({ transactionDate: 1 })
      .lean();

    const timeline = {};

    txs.forEach((tx) => {
      const d = new Date(tx.transactionDate);
      // Group by YYYY-MM
      const periodKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

      if (!timeline[periodKey]) {
        timeline[periodKey] = { period: periodKey, byCurrency: {} };
      }

      const p = timeline[periodKey];
      const currency = tx.currency || "USD";
      p.byCurrency[currency] ||= { incomeMinor: 0, expenseMinor: 0, refundMinor: 0 };
      const amountMinor = toMinor(tx.amount, currency);
      if (tx.type === "income") p.byCurrency[currency].incomeMinor += amountMinor;
      if (tx.type === "expense") p.byCurrency[currency].expenseMinor += amountMinor;
      if (tx.type === "refund") p.byCurrency[currency].refundMinor += amountMinor;
    });

    const flow = Object.values(timeline).flatMap((p) => Object.entries(p.byCurrency).map(([currency, values]) => {
      const netExpenseMinor = Math.max(0, values.expenseMinor - values.refundMinor);
      return {
        period: p.period,
        currency,
        income: toMajor(values.incomeMinor, currency),
        expense: toMajor(netExpenseMinor, currency),
        netFlow: toMajor(values.incomeMinor - netExpenseMinor, currency),
      };
    }));

    res.status(200).json({
      success: true,
      data: flow,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/reports/export-csv
 */
exports.exportTransactionsCsv = async (req, res) => {
  try {
    const match = buildFilter(req.user._id, req.query);

    const txs = await Transaction.find(match)
      .populate("accountId", "name type currency")
      .populate("destinationAccountId", "name")
      .populate("categoryId", "name")
      .sort({ transactionDate: -1 })
      .lean();

    // Escape CSV values
    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const headers = [
      "Transaction ID",
      "Date",
      "Type",
      "Amount",
      "Currency",
      "Account",
      "Destination Account",
      "Category",
      "Description",
      "Payment Method",
    ];

    const rows = txs.map((tx) => [
      escapeCsv(tx.transactionNumber || tx._id),
      escapeCsv(new Date(tx.transactionDate).toISOString().split("T")[0]),
      escapeCsv(tx.type),
      escapeCsv(toMajor(toMinor(tx.amount, tx.currency || "USD"), tx.currency || "USD")),
      escapeCsv(tx.currency),
      escapeCsv(tx.accountId ? tx.accountId.name : ""),
      escapeCsv(tx.destinationAccountId ? tx.destinationAccountId.name : ""),
      escapeCsv(tx.categoryId ? tx.categoryId.name : ""),
      escapeCsv(tx.description || ""),
      escapeCsv(tx.paymentMethod || ""),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="finlab_transactions.csv"');
    return res.status(200).send(csvContent);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

