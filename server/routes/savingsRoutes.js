const express = require("express");
const router = express.Router();
const savingsController = require("../controllers/savingsController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/", savingsController.getSavingsGoals);
router.post("/", savingsController.createSavingsGoal);
router.put("/:id", savingsController.updateSavingsGoal);
router.delete("/:id", savingsController.deleteSavingsGoal);
router.post("/:id/contributions", savingsController.recordContribution);
router.get("/:id/history", savingsController.getGoalHistory);

module.exports = router;
