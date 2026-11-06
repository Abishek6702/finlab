const Category = require("../models/Category");
const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");
const RecurringTransaction = require("../models/RecurringTransaction");
const { seedDefaultCategories } = require("../services/categorySeedService");

// 1. Get categories (auto-seeds defaults if user has none)
exports.getCategories = async (req, res, next) => {
  try {
    await seedDefaultCategories(req.user._id);

    const { type } = req.query;
    const filter = { userId: req.user._id, isArchived: false };
    if (type) filter.type = type;

    const categories = await Category.find(filter).sort({ isSystem: -1, name: 1 });
    const categoryIds = categories.map((category) => category._id);
    const usage = categoryIds.length > 0
      ? await Transaction.aggregate([
          { $match: { userId: req.user._id, categoryId: { $in: categoryIds }, isDeleted: false } },
          { $group: { _id: "$categoryId", count: { $sum: 1 } } },
        ])
      : [];
    const usageByCategory = new Map(usage.map(({ _id, count }) => [_id.toString(), count]));

    res.status(200).json({
      success: true,
      data: categories.map((category) => ({
        ...category.toObject(),
        usageCount: usageByCategory.get(category._id.toString()) || 0,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// 2. Create custom category
exports.createCategory = async (req, res, next) => {
  try {
    const { name, type, icon, color } = req.body;

    const category = new Category({
      userId: req.user._id,
      name,
      type: type || "expense",
      icon: icon || "tag",
      color: color || "#64748B",
      isSystem: false,
    });

    await category.save();

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

// 3. Update custom category
exports.updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, userId: req.user._id });
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
    if (category.isSystem) {
      return res.status(400).json({ success: false, message: "System categories cannot be edited" });
    }

    const { name, icon, color } = req.body;
    if (name) category.name = name;
    if (icon) category.icon = icon;
    if (color) category.color = color;

    await category.save();

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

// 4. Delete/Archive category with usage safety check
exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, userId: req.user._id });
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
    if (category.isSystem) {
      return res.status(400).json({ success: false, message: "System categories cannot be deleted" });
    }

    // Preserve references that can still be restored, recalculated, or posted later.
    const [transactionCount, budgetCount, recurringCount] = await Promise.all([
      Transaction.countDocuments({ userId: req.user._id, categoryId: category._id }),
      Budget.countDocuments({ userId: req.user._id, categoryId: category._id }),
      RecurringTransaction.countDocuments({ userId: req.user._id, categoryId: category._id, status: { $nin: ["completed", "cancelled"] } }),
    ]);
    const inUseCount = transactionCount + budgetCount + recurringCount;

    if (inUseCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. It is linked to ${transactionCount} transaction(s), ${budgetCount} budget(s), and ${recurringCount} active or paused recurring schedule(s). Reassign or remove those links first.`,
      });
    }

    await Category.deleteOne({ _id: category._id });

    res.status(200).json({
      success: true,
      message: "Category removed successfully",
    });
  } catch (error) {
    next(error);
  }
};

