const express = require("express");
const router = express.Router();
const budgetController = require("../controllers/budgetController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/", budgetController.getBudgets);
router.post("/", budgetController.createBudget);
router.put("/:id", budgetController.updateBudget);
router.delete("/:id", budgetController.deleteBudget);

module.exports = router;
