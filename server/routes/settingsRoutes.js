const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settingsController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/", settingsController.getSettings);
router.patch("/profile", settingsController.updateProfile);
router.patch("/preferences", settingsController.updatePreferences);
router.get("/sessions", settingsController.getSessions);
router.delete("/sessions/:id", settingsController.revokeSession);
router.get("/export-all", settingsController.exportAllUserData);
router.post("/delete-account", settingsController.deleteAccount);

module.exports = router;

