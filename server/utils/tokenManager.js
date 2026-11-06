const crypto = require("crypto");
const jwt = require("jsonwebtoken");

/**
 * Generate cryptographically secure numeric OTP of specified length (default 6 digits)
 */
const generateOtp = (length = 6) => {
  const digits = "0123456789";
  const bytes = crypto.randomBytes(length);
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += digits[bytes[i] % 10];
  }
  return otp;
};

/**
 * Hash string (OTP or Reset Token) using SHA-256
 */
const hashToken = (token) => {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
};

/**
 * Generate cryptographically secure random token (hex)
 */
const generateRandomToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString("hex");
};

/**
 * Generate Access Token (JWT, 15m default)
 */
const generateAccessToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is missing.");
  }

  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
      issuer: "finlab-auth",
      audience: "finlab-client",
    }
  );
};

/**
 * Generate Refresh Token (JWT, 7d default)
 */
const generateRefreshToken = (user, sessionId) => {
  const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + "_refresh_fallback";

  return jwt.sign(
    {
      id: user._id.toString(),
      sessionId: sessionId ? sessionId.toString() : undefined,
      jti: crypto.randomBytes(16).toString("hex"), // Unique JWT ID guarantees unique token hash on rotation
    },
    refreshSecret,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
      issuer: "finlab-auth",
      audience: "finlab-client",
    }
  );
};

/**
 * Verify Access Token
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET, {
    issuer: "finlab-auth",
    audience: "finlab-client",
  });
};

/**
 * Verify Refresh Token
 */
const verifyRefreshToken = (token) => {
  const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + "_refresh_fallback";
  return jwt.verify(token, refreshSecret, {
    issuer: "finlab-auth",
    audience: "finlab-client",
  });
};

module.exports = {
  generateOtp,
  hashToken,
  generateRandomToken,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};

