const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Account name is required"],
      trim: true,
      maxlength: [100, "Account name cannot exceed 100 characters"],
    },
    type: {
      type: String,
      required: [true, "Account type is required"],
      enum: ["cash", "bank", "upi", "wallet", "credit_card", "other"],
      default: "bank",
    },
    currency: {
      type: String,
      required: [true, "Account currency is required"],
      trim: true,
      uppercase: true,
      default: "USD",
    },
    openingBalance: {
      type: Number,
      default: 0,
    },
    currentBalance: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
    icon: {
      type: String,
      trim: true,
      default: "wallet",
    },
    color: {
      type: String,
      trim: true,
      default: "#1D4ED8",
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    hasTransactions: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual alias 'balance' mapping to currentBalance
accountSchema.virtual("balance").get(function () {
  return this.currentBalance !== undefined ? this.currentBalance : (this.openingBalance || 0);
});

// Compound indexes
accountSchema.index({ userId: 1, isArchived: 1 });
accountSchema.index({ userId: 1, isDefault: 1 });

module.exports = mongoose.model("Account", accountSchema);

