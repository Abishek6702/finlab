const mongoose = require("mongoose");

const recurringTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0.01, "Amount must be at least 0.01"],
    },
    currency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    frequency: {
      type: String,
      enum: ["daily", "weekly", "monthly", "yearly", "custom"],
      default: "monthly",
    },
    interval: {
      type: Number,
      default: 1, // e.g. every 1 month, every 2 weeks
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: null,
    },
    nextOccurrenceDate: {
      type: Date,
      required: true,
      index: true,
    },
    timeZone: {
      type: String,
      trim: true,
      default: "UTC",
    },
    scheduleDay: {
      type: Number,
      min: 1,
      max: 31,
      default: undefined,
    },
    isEndOfMonth: {
      type: Boolean,
      default: undefined,
    },
    reminderEnabled: {
      type: Boolean,
      default: true,
    },
    reminderBeforeDays: {
      type: Number,
      default: 1,
    },
    autoPostEnabled: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "paused", "completed", "cancelled"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

recurringTransactionSchema.index({ userId: 1, status: 1, nextOccurrenceDate: 1 });

module.exports = mongoose.model("RecurringTransaction", recurringTransactionSchema);

