const mongoose = require("mongoose");

const splitDetailSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    transactionNumber: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: [true, "Transaction type is required"],
      enum: ["income", "expense", "transfer", "refund"],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, "Transaction amount is required"],
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
      required: [true, "Account is required"],
      index: true,
    },
    // Used for transfer operations
    destinationAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
      index: true,
    },
    destinationAmount: {
      type: Number,
      default: null,
    },
    exchangeRate: {
      type: Number,
      default: 1.0,
    },
    // Category (Required for income & expense, optional for transfers)
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },
    transactionDate: {
      type: Date,
      required: [true, "Transaction date is required"],
      default: Date.now,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      required: [true, "Description is required"],
      maxlength: 200,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "upi", "net_banking", "transfer", "other"],
      default: "other",
    },
    attachments: [
      {
        url: String,
        publicId: String,
        fileName: String,
        fileType: String,
        fileSize: Number,
      },
    ],
    // For refund transactions: link to original transaction
    originalTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
      index: true,
    },
    recurringOccurrenceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RecurringOccurrence",
      default: undefined,
    },
    totalRefunded: {
      type: Number,
      default: 0,
    },
    // For split transactions
    isSplit: {
      type: Boolean,
      default: false,
    },
    splitDetails: [splitDetailSchema],
    // Soft deletion (Trash)
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// High-performance compound indexes for queries and analytics
transactionSchema.index({ userId: 1, isDeleted: 1, createdAt: -1 });
transactionSchema.index({ userId: 1, isDeleted: 1, transactionDate: -1 });
transactionSchema.index({ userId: 1, accountId: 1, transactionDate: -1 });
transactionSchema.index({ userId: 1, categoryId: 1, transactionDate: -1 });
transactionSchema.index({ userId: 1, type: 1, transactionDate: -1 });
transactionSchema.index(
  { recurringOccurrenceId: 1 },
  { unique: true, partialFilterExpression: { recurringOccurrenceId: { $type: "objectId" } } },
);

module.exports = mongoose.model("Transaction", transactionSchema);

