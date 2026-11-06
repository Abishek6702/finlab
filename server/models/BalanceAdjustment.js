const mongoose = require("mongoose");

const balanceAdjustmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },
    previousBalance: {
      type: Number,
      required: true,
    },
    adjustedBalance: {
      type: Number,
      required: true,
    },
    difference: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      required: [true, "Adjustment reason is required"],
    },
  },
  {
    timestamps: true,
  }
);

balanceAdjustmentSchema.index({ accountId: 1, createdAt: -1 });

module.exports = mongoose.model("BalanceAdjustment", balanceAdjustmentSchema);

