const User = require("../models/User");
const Session = require("../models/Session");
const sendMail = require("../utils/sendMail");
const renderTemplate = require("../utils/renderTemplate");
const googleAuth = require("../utils/googleAuth");
const {
  hashToken,
  generateRandomToken,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../utils/tokenManager");

/**
 * Cookie options helper for Refresh Token
 */
const getRefreshTokenCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";
  const secureCookie = process.env.COOKIE_SECURE === "true" || isProduction;

  return {
    httpOnly: true,
    secure: secureCookie,
    sameSite: secureCookie ? "none" : "lax",
    path: "/api/auth",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
};

/**
 * Issue new session & refresh token and set cookie
 */
const createSessionAndTokens = async (user, req, res) => {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const userAgent = req.headers["user-agent"] || "Unknown";
  const ipAddress = req.ip || req.connection.remoteAddress || "Unknown";

  // Create preliminary session record to obtain ID
  const session = new Session({
    userId: user._id,
    refreshTokenHash: "placeholder",
    deviceInfo: userAgent.slice(0, 100),
    userAgent,
    ipAddress,
    expiresAt,
  });

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user, session._id);

  // Hash refresh token for DB storage
  session.refreshTokenHash = hashToken(refreshToken);
  await session.save();

  // Set HttpOnly refresh token cookie
  res.cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions());

  return { accessToken, user };
};

// ==========================================
// 1. REGISTER (DIRECT ACTIVE SESSION)
// ==========================================
exports.register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Check duplicate email
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email address already exists.",
      });
    }

    // Create active user immediately (no OTP or email verification)
    const newUser = new User({
      firstName,
      lastName,
      email: normalizedEmail,
      password,
      phone: phone || null,
      authProvider: "email",
      isActive: true,
      onboardingCompleted: false,
    });

    await newUser.save();

    // Create session and issue authentication tokens immediately
    const { accessToken } = await createSessionAndTokens(newUser, req, res);

    res.status(201).json({
      success: true,
      message: "Registration successful.",
      data: {
        accessToken,
        user: newUser.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. LOGIN (EMAIL/PASSWORD)
// ==========================================
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Query user with password
    const user = await User.findOne({ email: normalizedEmail }).select("+password");

    // Generic error for invalid credentials
    if (!user || !user.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive. Please contact support.",
      });
    }

    const { accessToken } = await createSessionAndTokens(user, req, res);

    res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        accessToken,
        user: user.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. GOOGLE AUTHENTICATION
// ==========================================
exports.googleAuth = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    // Verify Google ID Token against Google's tokeninfo service
    let googleUser;
    try {
      googleUser = await googleAuth.verifyGoogleIdToken(idToken);
    } catch (verErr) {
      return res.status(401).json({
        success: false,
        message: `Google authentication failed: ${verErr.message}`,
      });
    }

    // Check existing user by googleId or email
    let user = await User.findOne({
      $or: [{ googleId: googleUser.googleId }, { email: googleUser.email }],
    });

    if (user) {
      // Link Google ID if registered previously with email
      if (!user.googleId) {
        user.googleId = googleUser.googleId;
        user.authProvider = user.authProvider === "email" ? "both" : user.authProvider;
      }
      if (!user.profileImage && googleUser.profileImage) {
        user.profileImage = googleUser.profileImage;
      }
      await user.save();
    } else {
      // Create new Google account
      user = new User({
        firstName: googleUser.firstName,
        lastName: googleUser.lastName || "",
        email: googleUser.email,
        googleId: googleUser.googleId,
        authProvider: "google",
        isActive: true,
        profileImage: googleUser.profileImage || "",
        onboardingCompleted: false,
      });
      await user.save();
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive. Please contact support.",
      });
    }

    const { accessToken } = await createSessionAndTokens(user, req, res);

    res.status(200).json({
      success: true,
      message: "Google login successful.",
      data: {
        accessToken,
        user: user.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. REFRESH TOKEN (ROTATION & REUSE DETECTION)
// ==========================================
exports.refreshToken = async (req, res, next) => {
  try {
    const rawRefreshToken = req.cookies && req.cookies.refreshToken;

    if (!rawRefreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is missing. Please log in again.",
      });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(rawRefreshToken);
    } catch (err) {
      res.clearCookie("refreshToken", getRefreshTokenCookieOptions());
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token. Please log in again.",
      });
    }

    const incomingTokenHash = hashToken(rawRefreshToken);

    // Look for session by ID if present, otherwise by token hash
    let session;
    if (decoded.sessionId) {
      session = await Session.findById(decoded.sessionId);
    } else {
      session = await Session.findOne({ refreshTokenHash: incomingTokenHash });
    }

    // Refresh token reuse detection:
    if (!session || session.refreshTokenHash !== incomingTokenHash || session.revokedAt) {
      if (decoded.id) {
        await Session.updateMany(
          { userId: decoded.id },
          { $set: { revokedAt: new Date() } }
        );
      }
      res.clearCookie("refreshToken", getRefreshTokenCookieOptions());
      return res.status(403).json({
        success: false,
        message: "Security warning: Invalid or reused refresh token. All active sessions have been invalidated.",
      });
    }

    // Check user state
    const user = await User.findById(session.userId);
    if (!user || !user.isActive) {
      session.revokedAt = new Date();
      await session.save();
      res.clearCookie("refreshToken", getRefreshTokenCookieOptions());
      return res.status(403).json({
        success: false,
        message: "Account inactive or deleted.",
      });
    }

    // Rotate refresh token
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user, session._id);

    // Update existing session
    session.refreshTokenHash = hashToken(newRefreshToken);
    session.lastUsedAt = new Date();
    session.userAgent = req.headers["user-agent"] || session.userAgent;
    session.ipAddress = req.ip || req.connection.remoteAddress || session.ipAddress;
    await session.save();

    // Set updated cookie
    res.cookie("refreshToken", newRefreshToken, getRefreshTokenCookieOptions());

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully.",
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 5. LOGOUT (CURRENT DEVICE)
// ==========================================
exports.logout = async (req, res, next) => {
  try {
    const rawRefreshToken = req.cookies && req.cookies.refreshToken;

    if (rawRefreshToken) {
      const incomingTokenHash = hashToken(rawRefreshToken);
      await Session.findOneAndUpdate(
        { refreshTokenHash: incomingTokenHash },
        { $set: { revokedAt: new Date() } }
      );
    }

    res.clearCookie("refreshToken", getRefreshTokenCookieOptions());

    res.status(200).json({
      success: true,
      message: "Logged out successfully from this device.",
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 6. LOGOUT ALL DEVICES
// ==========================================
exports.logoutAll = async (req, res, next) => {
  try {
    const userId = req.user._id;

    await Session.updateMany(
      { userId, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );

    res.clearCookie("refreshToken", getRefreshTokenCookieOptions());

    res.status(200).json({
      success: true,
      message: "Logged out successfully from all devices.",
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 7. FORGOT PASSWORD
// ==========================================
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });

    // Account enumeration protection: Always return generic message
    if (user && user.isActive) {
      const resetToken = generateRandomToken(32);
      const resetTokenHash = hashToken(resetToken);
      const expiresMinutes = parseInt(process.env.PASSWORD_RESET_EXPIRES_MINUTES || "15", 10);

      user.passwordResetTokenHash = resetTokenHash;
      user.passwordResetExpires = new Date(Date.now() + expiresMinutes * 60 * 1000);
      await user.save();

      // Reset URL pointing to client on port 9002 (or production client URL)
      const frontendClientUrl = (process.env.CLIENT_URL || "http://localhost:9002").replace(/\/+$/, "");
      const resetUrl = `${frontendClientUrl}/reset-password?token=${resetToken}`;

      try {
        const emailHtml = renderTemplate("resetPassword", {
          firstName: user.firstName,
          resetUrl,
          expiresInMinutes: expiresMinutes,
        });
        await sendMail(user.email, "Password Reset Request - Personal Finance Tracker", emailHtml);
      } catch (mailErr) {
        console.error("Failed to send password reset email:", mailErr.message);
      }
    }

    res.status(200).json({
      success: true,
      message: "If an account exists with that email, a password reset link has been sent.",
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 8. RESET PASSWORD
// ==========================================
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    const incomingTokenHash = hashToken(token);

    const user = await User.findOne({
      passwordResetTokenHash: incomingTokenHash,
      passwordResetExpires: { $gt: new Date() },
    }).select("+passwordResetTokenHash +passwordResetExpires");

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired password reset token.",
      });
    }

    user.password = newPassword;
    user.authProvider = user.authProvider === "google" ? "both" : user.authProvider;
    user.passwordResetTokenHash = null;
    user.passwordResetExpires = null;
    user.passwordChangedAt = new Date();
    await user.save();

    // Invalidate all existing sessions
    await Session.updateMany(
      { userId: user._id, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );

    res.clearCookie("refreshToken", getRefreshTokenCookieOptions());

    res.status(200).json({
      success: true,
      message: "Password has been successfully reset. Please log in with your new password.",
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 9. CHANGE PASSWORD
// ==========================================
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select("+password");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: "This account was registered via Google. Please use Forgot Password to set a password.",
      });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    // Revoke all sessions
    await Session.updateMany(
      { userId: user._id, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );

    res.clearCookie("refreshToken", getRefreshTokenCookieOptions());

    res.status(200).json({
      success: true,
      message: "Password changed successfully. Please log in again.",
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 10. GET CURRENT USER PROFILE
// ==========================================
exports.getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user.toJSON(),
  });
};

// ==========================================
// 11. UPDATE CURRENT USER PROFILE
// ==========================================
exports.updateProfile = async (req, res, next) => {
  try {
    const allowedFields = [
      "firstName",
      "lastName",
      "phone",
      "profileImage",
      "country",
      "baseCurrency",
      "timezone",
      "language",
      "theme",
      "weekStartsOn",
    ];

    const user = await User.findById(req.user._id);

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === "theme") {
          user.theme = req.body.theme === "dark" ? "dark" : "light";
        } else {
          user[field] = req.body[field];
        }
      }
    });

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 12. COMPLETE USER ONBOARDING
// ==========================================
exports.completeOnboarding = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User account was not found." });
    }

    user.onboardingCompleted = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Onboarding completed successfully.",
      data: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};
