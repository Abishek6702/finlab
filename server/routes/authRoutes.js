const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { loginLimiter, authLimiter } = require("../middleware/rateLimiter");
const {
  validate,
  registerSchema,
  loginSchema,
  googleAuthSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
} = require("../middleware/validateAuth");

// 1. User registration (immediate session creation)
router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  authController.register
);

// 2. Email/password login
router.post(
  "/login",
  loginLimiter,
  validate(loginSchema),
  authController.login
);

// 3. Google authentication
router.post(
  "/google",
  authLimiter,
  validate(googleAuthSchema),
  authController.googleAuth
);

// 4. Refresh token
router.post("/refresh", authController.refreshToken);

// 5. Logout from current device
router.post("/logout", authController.logout);

// 6. Logout from all devices (authenticated)
router.post("/logout-all", protect, authController.logoutAll);

// 7. Forgot password
router.post(
  "/forgot-password",
  authLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);

// 8. Reset password
router.post(
  "/reset-password",
  authLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword
);

// 9. Change password (authenticated)
router.post(
  "/change-password",
  protect,
  validate(changePasswordSchema),
  authController.changePassword
);

// 10. Get authenticated user profile (authenticated)
router.get("/me", protect, authController.getMe);

// 11. Update user profile (authenticated)
router.patch(
  "/profile",
  protect,
  validate(updateProfileSchema),
  authController.updateProfile
);

// 12. Complete onboarding (authenticated)
router.post("/onboarding/complete", protect, authController.completeOnboarding);

module.exports = router;
