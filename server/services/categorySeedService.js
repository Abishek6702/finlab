const Category = require("../models/Category");

const defaultExpenseCategories = [
  { name: "Food & Dining", type: "expense", icon: "utensils", color: "#F59E0B" },
  { name: "Groceries", type: "expense", icon: "shopping-cart", color: "#10B981" },
  { name: "Transportation", type: "expense", icon: "car", color: "#3B82F6" },
  { name: "Shopping", type: "expense", icon: "shopping-bag", color: "#EC4899" },
  { name: "Housing & Rent", type: "expense", icon: "home", color: "#8B5CF6" },
  { name: "Bills & Utilities", type: "expense", icon: "file-text", color: "#EF4444" },
  { name: "Healthcare", type: "expense", icon: "activity", color: "#06B6D4" },
  { name: "Education", type: "expense", icon: "book-open", color: "#6366F1" },
  { name: "Entertainment", type: "expense", icon: "film", color: "#D946EF" },
  { name: "Travel", type: "expense", icon: "compass", color: "#14B8A6" },
  { name: "Personal Care", type: "expense", icon: "smile", color: "#F97316" },
  { name: "Insurance", type: "expense", icon: "shield", color: "#64748B" },
  { name: "Subscriptions", type: "expense", icon: "refresh-cw", color: "#84CC16" },
  { name: "Other", type: "expense", icon: "more-horizontal", color: "#94A3B8" }
];

const defaultIncomeCategories = [
  { name: "Salary", type: "income", icon: "briefcase", color: "#16A34A" },
  { name: "Freelance", type: "income", icon: "laptop", color: "#059669" },
  { name: "Business", type: "income", icon: "trending-up", color: "#2563EB" },
  { name: "Investments", type: "income", icon: "pie-chart", color: "#7C3AED" },
  { name: "Interest", type: "income", icon: "percent", color: "#0284C7" },
  { name: "Gifts", type: "income", icon: "gift", color: "#DB2777" },
  { name: "Rental Income", type: "income", icon: "key", color: "#D97706" },
  { name: "Other", type: "income", icon: "plus-circle", color: "#475569" }
];

/**
 * Ensures system default categories are seeded for the user or available globally
 */
async function seedDefaultCategories(userId) {
  const existingCount = await Category.countDocuments({ userId });
  if (existingCount > 0) return;

  const categoriesToSeed = [
    ...defaultExpenseCategories.map((c) => ({ ...c, userId, isSystem: true })),
    ...defaultIncomeCategories.map((c) => ({ ...c, userId, isSystem: true })),
  ];

  await Category.insertMany(categoriesToSeed);
}

module.exports = {
  defaultExpenseCategories,
  defaultIncomeCategories,
  seedDefaultCategories,
};

