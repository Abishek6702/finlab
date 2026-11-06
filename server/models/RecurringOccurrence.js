const mongoose = require("mongoose");

const recurringOccurrenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recurringTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RecurringTransaction",
      required: true,
      index: true,
    },
    occurrenceKey: {
      type: String, // e.g. <recId>_2026-11-06
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["upcoming", "pending", "processing", "posted", "skipped"],
      default: "pending",
      index: true,
    },
    postedTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },
    postedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Idempotent uniqueness: Only one occurrence per recurring transaction + key
recurringOccurrenceSchema.index({ recurringTransactionId: 1, occurrenceKey: 1 }, { unique: true });
recurringOccurrenceSchema.index({ userId: 1, status: 1, dueDate: 1 });

module.exports = mongoose.model("RecurringOccurrence", recurringOccurrenceSchema);

