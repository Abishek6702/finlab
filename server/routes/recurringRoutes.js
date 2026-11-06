const express = require("express");
const router = express.Router();
const recurringController = require("../controllers/recurringController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/", recurringController.getRecurringTransactions);
router.post("/", recurringController.createRecurringTransaction);
router.put("/:id", recurringController.updateRecurringTransaction);
router.delete("/:id", recurringController.deleteRecurringTransaction);
router.get("/occurrences", recurringController.getOccurrences);
router.post("/occurrences/:id/post", recurringController.postOccurrence);

module.exports = router;
