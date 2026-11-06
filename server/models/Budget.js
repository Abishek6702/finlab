const mongoose = require("mongoose");

const budgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Budget name is required"],
      trim: true,
      maxlength: 100,
    },
    type: {
      type: String,
      enum: ["overall", "category"],
      default: "category",
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, "Budget limit is required"],
      min: [0.01, "Budget limit must be greater than 0"],
    },
    currency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      default: "USD",
    },
    period: {
      type: String,
      enum: ["daily", "weekly", "monthly", "custom"],
      default: "monthly",
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    rolloverEnabled: {
      type: Boolean,
      default: false,
    },
    alertThresholds: {
      type: [Number],
      default: [50, 75, 90, 100],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

budgetSchema.index({ userId: 1, isActive: 1, period: 1 });
budgetSchema.index({ userId: 1, categoryId: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model("Budget", budgetSchema);

