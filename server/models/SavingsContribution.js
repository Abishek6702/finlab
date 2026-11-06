const mongoose = require("mongoose");

const savingsContributionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    goalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SavingsGoal",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["deposit", "withdrawal"],
      default: "deposit",
    },
    amount: {
      type: Number,
      required: true,
      min: [0.0001, "Amount must be greater than 0"],
    },
    date: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

savingsContributionSchema.index({ goalId: 1, date: -1 });

module.exports = mongoose.model("SavingsContribution", savingsContributionSchema);

