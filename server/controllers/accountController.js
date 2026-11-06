const Account = require("../models/Account");
const BalanceAdjustment = require("../models/BalanceAdjustment");
const LedgerService = require("../services/ledgerService");
const { subtractMoney, toMinorUnits, toMajorUnits } = require("../utils/moneyUtils");
const { withMongoTransaction } = require("../services/mongoTransaction");

// 1. Get all accounts for user
exports.getAccounts = async (req, res, next) => {
  try {
    const { type, isArchived, search } = req.query;
    const filter = { userId: req.user._id };

    if (isArchived !== undefined) {
      filter.isArchived = isArchived === "true";
    } else {
      filter.isArchived = false; // Default active
    }

    if (type) {
      filter.type = type;
    }

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const accounts = await Account.find(filter).sort({ isDefault: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Accounts retrieved successfully",
      data: accounts,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Get single account by ID
exports.getAccountById = async (req, res, next) => {
  try {
    const account = await Account.findOne({ _id: req.params.id, userId: req.user._id });
    if (!account) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    res.status(200).json({
      success: true,
      data: account,
    });
  } catch (error) {
    next(error);
  }
};

// 3. Create account
exports.createAccount = async (req, res, next) => {
  try {
    const { name, type, currency, openingBalance, description, icon, color, isDefault } = req.body;

    const normalizedCurrency = String(currency || req.user.baseCurrency || "USD").toUpperCase();
    const parsedOpeningBalance = openingBalance === undefined ? 0 : Number(openingBalance);
    if (!Number.isFinite(parsedOpeningBalance)) {
      return res.status(400).json({ success: false, message: "Opening balance must be a valid decimal amount" });
    }
    const opBal = toMajorUnits(toMinorUnits(parsedOpeningBalance, normalizedCurrency), normalizedCurrency);
    const newAccountData = {
      userId: req.user._id,
      name,
      type: type || "bank",
      currency: normalizedCurrency,
      openingBalance: opBal,
      currentBalance: opBal,
      description: description || "",
      icon: icon || "wallet",
      color: color || "#1D4ED8",
      isDefault: Boolean(isDefault),
    };
    const newAccount = await withMongoTransaction(async (session) => {
      if (isDefault) await Account.updateMany({ userId: req.user._id }, { $set: { isDefault: false } }, { session });
      const count = await Account.countDocuments({ userId: req.user._id }).session(session);
      newAccountData.isDefault = Boolean(isDefault || count === 0);
      const [created] = await Account.create([newAccountData], { session });
      return created;
    });

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: newAccount,
    });
  } catch (error) {
    next(error);
  }
};

// 4. Update account
exports.updateAccount = async (req, res, next) => {
  try {
    const account = await Account.findOne({ _id: req.params.id, userId: req.user._id });
    if (!account) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    const { name, type, currency, description, icon, color, isDefault } = req.body;

    // Currency immutability: Cannot change currency once transactions exist
    if (currency && currency.toUpperCase() !== account.currency && account.hasTransactions) {
      return res.status(400).json({
        success: false,
        message: "Account currency cannot be changed after transactions have been recorded.",
      });
    }

    if (name) account.name = name;
    if (type) account.type = type;
    if (currency && !account.hasTransactions) account.currency = currency.toUpperCase();
    if (description !== undefined) account.description = description;
    if (icon) account.icon = icon;
    if (color) account.color = color;

    if (isDefault) {
      await Account.updateMany({ userId: req.user._id }, { $set: { isDefault: false } });
      account.isDefault = true;
    }

    await account.save();

    res.status(200).json({
      success: true,
      message: "Account updated successfully",
      data: account,
    });
  } catch (error) {
    next(error);
  }
};

// 5. Balance Adjustment
exports.adjustBalance = async (req, res, next) => {
  try {
    const { newBalance, reason } = req.body;
    const account = await Account.findOne({ _id: req.params.id, userId: req.user._id });
    if (!account) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    const parsedAdjustedBalance = Number(newBalance);
    if (!Number.isFinite(parsedAdjustedBalance)) {
      return res.status(400).json({ success: false, message: "A valid balance is required" });
    }
    const adjustedBal = toMajorUnits(toMinorUnits(parsedAdjustedBalance, account.currency), account.currency);
    const result = await withMongoTransaction(async (session) => {
      const current = await Account.findOne({ _id: req.params.id, userId: req.user._id }).session(session);
      if (!current) throw Object.assign(new Error("Account not found"), { statusCode: 404 });
      const difference = subtractMoney(adjustedBal, current.currentBalance, current.currency);
      const adjustment = new BalanceAdjustment({
        userId: req.user._id,
        accountId: current._id,
        previousBalance: current.currentBalance,
        adjustedBalance: adjustedBal,
        difference,
        currency: current.currency,
        reason: reason || "Manual balance reconciliation",
      });
      await adjustment.save({ session });
      current.currentBalance = adjustedBal;
      await current.save({ session });
      return { account: current, adjustment };
    });

    res.status(200).json({
      success: true,
      message: "Account balance adjusted successfully",
      data: {
        account: result.account,
        adjustment: result.adjustment,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 6. Archive / Restore account
exports.toggleArchiveAccount = async (req, res, next) => {
  try {
    const account = await Account.findOne({ _id: req.params.id, userId: req.user._id });
    if (!account) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    account.isArchived = !account.isArchived;
    if (account.isArchived && account.isDefault) {
      account.isDefault = false;
    }
    await account.save();

    res.status(200).json({
      success: true,
      message: account.isArchived ? "Account archived successfully" : "Account restored successfully",
      data: account,
    });
  } catch (error) {
    next(error);
  }
};

