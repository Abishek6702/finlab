const express = require("express");
const router = express.Router();
const transactionController = require("../controllers/transactionController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/", transactionController.getTransactions);
router.post("/", transactionController.createTransaction);
router.put("/:id", transactionController.updateTransaction);
router.delete("/:id", transactionController.softDeleteTransaction);
router.patch("/:id/restore", transactionController.restoreTransaction);

module.exports = router;
