const mongoose = require("mongoose");

const savingsGoalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Goal name is required"],
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    targetAmount: {
      type: Number,
      required: [true, "Target amount is required"],
      min: [0.0001, "Target amount must be greater than 0"],
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      default: "USD",
    },
    linkedAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },
    targetDate: {
      type: Date,
      default: null,
    },
    color: {
      type: String,
      default: "#16A34A",
    },
    reminderEnabled: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["active", "paused", "completed"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

savingsGoalSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model("SavingsGoal", savingsGoalSchema);

