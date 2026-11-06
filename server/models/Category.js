const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // null for system default categories
      index: true,
    },
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      maxlength: [80, "Category name cannot exceed 80 characters"],
    },
    type: {
      type: String,
      required: [true, "Category type is required"],
      enum: ["expense", "income"],
      default: "expense",
    },
    icon: {
      type: String,
      trim: true,
      default: "tag",
    },
    color: {
      type: String,
      trim: true,
      default: "#64748B",
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

categorySchema.index({ userId: 1, type: 1, isArchived: 1 });
categorySchema.index({ userId: 1, name: 1 });

module.exports = mongoose.model("Category", categorySchema);

