const User = require("../models/User");
const Session = require("../models/Session");
const Account = require("../models/Account");
const Category = require("../models/Category");
const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");
const RecurringTransaction = require("../models/RecurringTransaction");
const SavingsGoal = require("../models/SavingsGoal");
const RecurringOccurrence = require("../models/RecurringOccurrence");
const SavingsContribution = require("../models/SavingsContribution");
const BalanceAdjustment = require("../models/BalanceAdjustment");
const Notification = require("../models/Notification");

/**
 * GET /api/settings
 */
exports.getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      data: {
        profile: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email, // read-only
          phone: user.phone || "",
          profileImage: user.profileImage || "",
          authProvider: user.authProvider,
          createdAt: user.createdAt,
        },
        preferences: {
          country: user.country || "IN",
          baseCurrency: user.baseCurrency || "INR",
          timezone: user.timezone || "IST",
          language: user.language || "en",
          theme: user.theme === "dark" ? "dark" : "light",
          weekStartsOn: user.weekStartsOn || "Monday",
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PATCH /api/settings/profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, profileImage } = req.body;
    const updates = {};

    if (firstName) updates.firstName = firstName.trim();
    if (lastName) updates.lastName = lastName.trim();
    if (phone !== undefined) updates.phone = phone ? phone.trim() : null;
    if (profileImage !== undefined) updates.profileImage = profileImage;

    // Never allow email update here
    delete req.body.email;

    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PATCH /api/settings/preferences
 */
exports.updatePreferences = async (req, res) => {
  try {
    const { country, baseCurrency, timezone, language, theme, weekStartsOn } = req.body;
    const updates = {};

    if (country) updates.country = country.trim();
    if (baseCurrency) updates.baseCurrency = baseCurrency.trim().toUpperCase();
    if (timezone) updates.timezone = timezone.trim();
    if (language) updates.language = language.trim();
    if (theme !== undefined) {
      updates.theme = theme === "dark" ? "dark" : "light";
    }
    if (weekStartsOn && ["Monday", "Sunday"].includes(weekStartsOn)) updates.weekStartsOn = weekStartsOn;

    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true });

    res.status(200).json({
      success: true,
      message: "Preferences updated successfully",
      data: {
        country: user.country,
        baseCurrency: user.baseCurrency,
        timezone: user.timezone,
        language: user.language,
        theme: user.theme === "dark" ? "dark" : "light",
        weekStartsOn: user.weekStartsOn,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/settings/sessions
 */
exports.getSessions = async (req, res) => {
  try {
    const sessions = await Session.find({
      userId: req.user._id,
      revokedAt: null,
    })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: sessions.map((s) => ({
        id: s._id,
        userAgent: s.userAgent || "Unknown Device",
        ip: s.ip || "Unknown IP",
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        isCurrent: req.session && s._id.toString() === req.session.id,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE /api/settings/sessions/:id
 */
exports.revokeSession = async (req, res) => {
  try {
    const session = await Session.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { revokedAt: new Date() },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    res.status(200).json({ success: true, message: "Session revoked" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/settings/export-all
 */
exports.exportAllUserData = async (req, res) => {
  try {
    const userId = req.user._id;

    const [user, accounts, categories, transactions, budgets, recurring, goals, occurrences, contributions, adjustments, notifications] = await Promise.all([
      User.findById(userId).select("-password -passwordResetTokenHash").lean(),
      Account.find({ userId }).lean(),
      Category.find({ userId }).lean(),
      Transaction.find({ userId }).lean(),
      Budget.find({ userId }).lean(),
      RecurringTransaction.find({ userId }).lean(),
      SavingsGoal.find({ userId }).lean(),
      RecurringOccurrence.find({ userId }).lean(),
      SavingsContribution.find({ userId }).lean(),
      BalanceAdjustment.find({ userId }).lean(),
      Notification.find({ userId }).lean(),
    ]);

    const exportPackage = {
      exportedAt: new Date().toISOString(),
      user,
      accounts,
      categories,
      transactions,
      budgets,
      recurringTransactions: recurring,
      recurringOccurrences: occurrences,
      savingsGoals: goals,
      savingsContributions: contributions,
      balanceAdjustments: adjustments,
      notifications,
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", 'attachment; filename="finlab_complete_data.json"');
    return res.status(200).json(exportPackage);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/settings/delete-account
 */
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    // Revoke all sessions
    await Session.updateMany({ userId }, { revokedAt: new Date() });

    // Mark user inactive
    await User.findByIdAndUpdate(userId, { isActive: false });

    // Clear refresh cookie
    res.clearCookie("save_future", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    res.status(200).json({
      success: true,
      message: "Account deactivated successfully.",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

