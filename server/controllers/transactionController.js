const crypto = require("crypto");
const Transaction = require("../models/Transaction");
const Account = require("../models/Account");
const Category = require("../models/Category");
const LedgerService = require("../services/ledgerService");
const { withMongoTransaction } = require("../services/mongoTransaction");
const { toMinorUnits, toMajorUnits } = require("../utils/moneyUtils");
const { addMoney, subtractMoney } = require("../utils/moneyUtils");
const { notifyBudgetThresholdsForChange } = require("../services/notificationService");

// 1. Get transactions with filtering, search & pagination
exports.getTransactions = async (req, res, next) => {
  try {
    const {
      type,
      accountId,
      categoryId,
      startDate,
      endDate,
      search,
      isDeleted,
      limit = 10,
      page = 1,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const filter = { userId: req.user._id };

    filter.isDeleted = isDeleted === "true";

    if (type) filter.type = type;
    const andFilters = [];
    if (accountId) {
      andFilters.push({ $or: [{ accountId }, { destinationAccountId: accountId }] });
    }
    if (categoryId) filter.categoryId = categoryId;

    if (startDate || endDate) {
      filter.transactionDate = {};
      if (startDate) filter.transactionDate.$gte = new Date(startDate);
      if (endDate) filter.transactionDate.$lte = new Date(endDate);
    }

    if (search) {
      andFilters.push({ $or: [
        { description: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
        { transactionNumber: { $regex: search, $options: "i" } },
      ] });
    }
    if (andFilters.length) filter.$and = andFilters;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Sorting: default to most recently created at 1st
    const order = sortOrder === "asc" ? 1 : -1;
    const sort = sortBy === "transactionDate"
      ? { transactionDate: order, createdAt: -1 }
      : { createdAt: order, transactionDate: -1 };

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate("accountId", "name type currency color icon")
        .populate("destinationAccountId", "name type currency color icon")
        .populate("categoryId", "name type icon color")
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Transaction.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        total,
        count: transactions.length,
        page: pageNum,
        limit: limitNum,
        totalPages,
        pages: totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 2. Create Transaction (Income, Expense, Transfer, Refund)
exports.createTransaction = async (req, res, next) => {
  try {
    const {
      type,
      amount,
      currency,
      accountId,
      destinationAccountId,
      destinationAmount,
      exchangeRate,
      categoryId,
      transactionDate,
      description,
      notes,
      tags,
      paymentMethod,
      attachments,
      originalTransactionId,
      isSplit,
      splitDetails,
    } = req.body;

    const sourceAccount = await Account.findOne({ _id: accountId, userId: req.user._id });
    if (!sourceAccount) {
      return res.status(400).json({ success: false, message: "Valid source account is required" });
    }

    let numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: "Valid positive amount is required" });
    }
    const txCurrency = String(currency || sourceAccount.currency).toUpperCase();
    if (txCurrency !== sourceAccount.currency) {
      return res.status(400).json({ success: false, message: "Transaction currency must match the source account currency" });
    }
    try {
      numAmount = toMajorUnits(toMinorUnits(numAmount, txCurrency), txCurrency);
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    let transferDestinationAmount = null;
    // Transfers validation
    if (type === "transfer") {
      if (!destinationAccountId) {
        return res.status(400).json({ success: false, message: "Destination account is required for transfers" });
      }
      if (destinationAccountId.toString() === accountId.toString()) {
        return res.status(400).json({ success: false, message: "Source and destination accounts must be distinct" });
      }
      const destAccount = await Account.findOne({ _id: destinationAccountId, userId: req.user._id });
      if (!destAccount) {
        return res.status(400).json({ success: false, message: "Valid destination account is required" });
      }
      if (destinationAmount !== undefined && (!Number.isFinite(Number(destinationAmount)) || Number(destinationAmount) <= 0)) {
        return res.status(400).json({ success: false, message: "Destination amount must be a valid positive decimal" });
      }
      if (destAccount.currency !== sourceAccount.currency && (!Number.isFinite(Number(destinationAmount)) || Number(destinationAmount) <= 0)) {
        return res.status(400).json({ success: false, message: "A valid destination amount is required for cross-currency transfers" });
      }
      try {
        const targetAmount = destinationAmount === undefined ? numAmount : Number(destinationAmount);
        transferDestinationAmount = toMajorUnits(toMinorUnits(targetAmount, destAccount.currency), destAccount.currency);
      } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
      }
    }

    if (categoryId) {
      const category = await Category.findOne({ _id: categoryId, userId: req.user._id });
      if (!category) return res.status(400).json({ success: false, message: "Valid category is required" });
      if ((type === "income" || type === "expense") && category.type !== type) {
        return res.status(400).json({ success: false, message: "Category type must match transaction type" });
      }
    }

    // Split transactions validation
    if (isSplit && Array.isArray(splitDetails) && splitDetails.length > 0) {
      const splitTotalMinor = splitDetails.reduce((sum, s) => sum + toMinorUnits(s.amount, sourceAccount.currency), 0);
      if (splitTotalMinor !== toMinorUnits(numAmount, sourceAccount.currency)) {
        return res.status(400).json({
          success: false,
          message: "Split amounts must equal the transaction total at the account currency precision",
        });
      }
    }

    // Refund validation: Cannot exceed original expense amount
    if (type === "refund" && !originalTransactionId) {
      return res.status(400).json({ success: false, message: "Original expense is required for a refund" });
    }
    if (type === "refund" && originalTransactionId) {
      const orig = await Transaction.findOne({ _id: originalTransactionId, userId: req.user._id, type: "expense", isDeleted: false });
      if (!orig) {
        return res.status(400).json({ success: false, message: "Original transaction for refund not found" });
      }
      if (orig.currency !== txCurrency) {
        return res.status(400).json({ success: false, message: "Refund currency must match the original transaction currency" });
      }
      const remainingRefundable = subtractMoney(orig.amount, orig.totalRefunded || 0, orig.currency);
      if (numAmount > remainingRefundable) {
        return res.status(400).json({
          success: false,
          message: `Refund amount (${numAmount}) exceeds refundable balance (${remainingRefundable}) of original transaction`,
        });
      }
    }

    const txNumber = `TXN-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    const transactionData = {
      userId: req.user._id,
      transactionNumber: txNumber,
      type,
      amount: numAmount,
      currency: txCurrency,
      accountId: sourceAccount._id,
      destinationAccountId: type === "transfer" ? destinationAccountId : null,
      destinationAmount: type === "transfer" ? transferDestinationAmount : null,
      exchangeRate: parseFloat(exchangeRate) || 1.0,
      categoryId: categoryId || null,
      transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
      description,
      notes: notes || "",
      tags: Array.isArray(tags) ? tags : [],
      paymentMethod: paymentMethod || "other",
      attachments: Array.isArray(attachments) ? attachments : [],
      originalTransactionId: type === "refund" ? originalTransactionId : null,
      isSplit: Boolean(isSplit),
      splitDetails: isSplit
        ? splitDetails.map((split) => ({
            ...split,
            amount: toMajorUnits(toMinorUnits(split.amount, txCurrency), txCurrency),
          }))
        : [],
    };
    let newTx;

    await withMongoTransaction(async (session) => {
      if (type === "refund" && originalTransactionId) {
        const original = await Transaction.findOne({ _id: originalTransactionId, userId: req.user._id, type: "expense", isDeleted: false }).session(session);
        if (!original) throw Object.assign(new Error("Original transaction for refund not found"), { statusCode: 400 });
        const remaining = subtractMoney(original.amount, original.totalRefunded || 0, original.currency);
        if (numAmount > remaining) {
          throw Object.assign(new Error(`Refund amount (${numAmount}) exceeds refundable balance (${remaining})`), { statusCode: 400 });
        }
        original.totalRefunded = addMoney(original.totalRefunded || 0, numAmount, original.currency);
        await original.save({ session });
      }

      newTx = new Transaction(transactionData);
      await newTx.save({ session });
      if (categoryId) {
        await Category.updateOne({ _id: categoryId, userId: req.user._id }, { $inc: { usageCount: 1 } }, { session });
      }
      await LedgerService.applyTransactionDelta(newTx, false, session);
    });

    await notifyBudgetThresholdsForChange({ currentTransaction: newTx });

    const populatedTx = await Transaction.findById(newTx._id)
      .populate("accountId", "name type currency color icon")
      .populate("destinationAccountId", "name type currency color icon")
      .populate("categoryId", "name type icon color");

    res.status(201).json({
      success: true,
      message: "Transaction recorded successfully",
      data: populatedTx,
    });
  } catch (error) {
    next(error);
  }
};

// 3. Edit Transaction (Reverses old effect & applies new effect atomically)
exports.updateTransaction = async (req, res, next) => {
  try {
    const existingTx = await Transaction.findOne({ _id: req.params.id, userId: req.user._id });
    if (!existingTx) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    if (existingTx.isDeleted) {
      return res.status(400).json({ success: false, message: "Cannot edit a deleted transaction. Restore it first." });
    }

    // Validate all account and amount changes before reversing the current ledger
    // entry. This prevents an invalid edit from leaving balances partially changed.
    const { amount, accountId, destinationAccountId } = req.body;
    if (amount !== undefined) {
      const parsedAmount = Number(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ success: false, message: "Valid positive amount is required" });
      }
    }

    const nextAccountId = accountId || existingTx.accountId;
    const sourceAccount = await Account.findOne({ _id: nextAccountId, userId: req.user._id });
    if (!sourceAccount) {
      return res.status(400).json({ success: false, message: "Valid source account is required" });
    }
    if (sourceAccount.currency !== existingTx.currency) {
      return res.status(400).json({ success: false, message: "Transaction currency must match the source account currency" });
    }

    const nextDestinationId = destinationAccountId === undefined
      ? existingTx.destinationAccountId
      : destinationAccountId;
    if (existingTx.type === "transfer") {
      if (!nextDestinationId || nextDestinationId.toString() === nextAccountId.toString()) {
        return res.status(400).json({ success: false, message: "Transfer requires a distinct destination account" });
      }
      const destinationAccount = await Account.findOne({ _id: nextDestinationId, userId: req.user._id });
      if (!destinationAccount) {
        return res.status(400).json({ success: false, message: "Valid destination account is required" });
      }
      const previousDestination = await Account.findOne({ _id: existingTx.destinationAccountId, userId: req.user._id });
      if (previousDestination && destinationAccount.currency !== previousDestination.currency) {
        return res.status(400).json({ success: false, message: "Changing a transfer to a different destination currency requires recreating the transfer" });
      }
    }

    if (req.body.categoryId) {
      const category = await Category.findOne({ _id: req.body.categoryId, userId: req.user._id });
      if (!category) return res.status(400).json({ success: false, message: "Valid category is required" });
      if ((existingTx.type === "income" || existingTx.type === "expense") && category.type !== existingTx.type) {
        return res.status(400).json({ success: false, message: "Category type must match transaction type" });
      }
    }

    if (existingTx.type === "refund" && amount !== undefined && Number(amount) !== existingTx.amount) {
      return res.status(400).json({
        success: false,
        message: "Refund amounts cannot be edited. Delete this refund and create a corrected refund instead.",
      });
    }

    const {
      categoryId,
      transactionDate,
      description,
      notes,
      tags,
      paymentMethod,
    } = req.body;

    await withMongoTransaction(async (session) => {
      const current = await Transaction.findOne({ _id: existingTx._id, userId: req.user._id, isDeleted: false }).session(session);
      if (!current) throw Object.assign(new Error("Transaction not found"), { statusCode: 404 });
      await LedgerService.applyTransactionDelta(current, true, session);
      if (amount !== undefined) {
        const updatedMinor = toMinorUnits(Number(amount), current.currency);
        current.amount = toMajorUnits(updatedMinor, current.currency);
      }
      if (accountId) current.accountId = accountId;
      if (destinationAccountId !== undefined) current.destinationAccountId = destinationAccountId;
      if (categoryId !== undefined) current.categoryId = categoryId;
      if (transactionDate) current.transactionDate = new Date(transactionDate);
      if (description) current.description = description;
      if (notes !== undefined) current.notes = notes;
      if (tags !== undefined) current.tags = tags;
      if (paymentMethod) current.paymentMethod = paymentMethod;
      await current.save({ session });
      await LedgerService.applyTransactionDelta(current, false, session);
    });

    const updated = await Transaction.findById(existingTx._id)
      .populate("accountId", "name type currency color icon")
      .populate("destinationAccountId", "name type currency color icon")
      .populate("categoryId", "name type icon color");

    await notifyBudgetThresholdsForChange({ previousTransaction: existingTx, currentTransaction: updated });

    res.status(200).json({
      success: true,
      message: "Transaction updated successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// 4. Soft Delete (Move to Trash)
exports.softDeleteTransaction = async (req, res, next) => {
  try {
    const tx = await Transaction.findOne({ _id: req.params.id, userId: req.user._id });
    if (!tx) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    if (tx.type === "expense" && !tx.isDeleted) {
      const activeRefunds = await Transaction.countDocuments({
        userId: req.user._id,
        originalTransactionId: tx._id,
        type: "refund",
        isDeleted: false,
      });
      if (activeRefunds > 0) {
        return res.status(400).json({
          success: false,
          message: "Move linked refunds to Trash before deleting the original expense.",
        });
      }
    }

    if (!tx.isDeleted) {
      await withMongoTransaction(async (session) => {
        const current = await Transaction.findOne({ _id: tx._id, userId: req.user._id, isDeleted: false }).session(session);
        if (!current) return;
        await LedgerService.applyTransactionDelta(current, true, session);
        if (current.type === "refund" && current.originalTransactionId) {
          const original = await Transaction.findOne({ _id: current.originalTransactionId, userId: req.user._id }).session(session);
          if (!original) throw Object.assign(new Error("Original transaction for refund not found"), { statusCode: 400 });
          original.totalRefunded = subtractMoney(original.totalRefunded || 0, current.amount, original.currency);
          await original.save({ session });
        }
        current.isDeleted = true;
        current.deletedAt = new Date();
        await current.save({ session });
      });
    }
    const updatedTx = await Transaction.findOne({ _id: tx._id, userId: req.user._id });
    if (!tx.isDeleted) {
      await notifyBudgetThresholdsForChange({ previousTransaction: tx, currentTransaction: updatedTx });
    }

    res.status(200).json({
      success: true,
      message: "Transaction moved to Trash",
      data: updatedTx,
    });
  } catch (error) {
    next(error);
  }
};

// 5. Restore from Trash
exports.restoreTransaction = async (req, res, next) => {
  try {
    const tx = await Transaction.findOne({ _id: req.params.id, userId: req.user._id });
    if (!tx) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    if (tx.isDeleted) {
      await withMongoTransaction(async (session) => {
        const current = await Transaction.findOne({ _id: tx._id, userId: req.user._id, isDeleted: true }).session(session);
        if (!current) return;
        if (current.type === "refund" && current.originalTransactionId) {
          const original = await Transaction.findOne({ _id: current.originalTransactionId, userId: req.user._id }).session(session);
          if (!original) throw Object.assign(new Error("Original transaction for refund not found"), { statusCode: 400 });
          const remaining = subtractMoney(original.amount, original.totalRefunded || 0, original.currency);
          if (current.amount > remaining) {
            throw Object.assign(new Error("Refund cannot be restored because it exceeds the remaining refundable amount"), { statusCode: 400 });
          }
          original.totalRefunded = addMoney(original.totalRefunded || 0, current.amount, original.currency);
          await original.save({ session });
        }
        await LedgerService.applyTransactionDelta(current, false, session);
        current.isDeleted = false;
        current.deletedAt = null;
        await current.save({ session });
      });
    }
    const restoredTx = await Transaction.findOne({ _id: tx._id, userId: req.user._id });
    if (tx.isDeleted) {
      await notifyBudgetThresholdsForChange({ previousTransaction: tx, currentTransaction: restoredTx });
    }

    res.status(200).json({
      success: true,
      message: "Transaction restored successfully",
      data: restoredTx,
    });
  } catch (error) {
    next(error);
  }
};

