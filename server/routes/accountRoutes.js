const express = require("express");
const router = express.Router();
const accountController = require("../controllers/accountController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/", accountController.getAccounts);
router.post("/", accountController.createAccount);
router.get("/:id", accountController.getAccountById);
router.put("/:id", accountController.updateAccount);
router.patch("/:id/archive", accountController.toggleArchiveAccount);
router.post("/:id/adjust-balance", accountController.adjustBalance);

module.exports = router;
