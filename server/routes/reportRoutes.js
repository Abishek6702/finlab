const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/summary", reportController.getSummary);
router.get("/category-analysis", reportController.getCategoryAnalysis);
router.get("/cash-flow", reportController.getCashFlow);
router.get("/export-csv", reportController.exportTransactionsCsv);

module.exports = router;

