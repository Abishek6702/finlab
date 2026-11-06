/**
 * Validates critical environment variables at startup.
 */
function validateEnv() {
  const required = ["JWT_SECRET"];
  
  if (process.env.NODE_ENV !== "test") {
    required.push("MONGO_URI");
  }

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Fatal startup error: Missing required environment variable(s): ${missing.join(", ")}`
    );
  }

  // Set defaults for optional auth configuration if not set
  if (!process.env.JWT_REFRESH_SECRET) {
    process.env.JWT_REFRESH_SECRET = process.env.JWT_SECRET + "_refresh_fallback";
  }
  if (!process.env.JWT_ACCESS_EXPIRES_IN) {
    process.env.JWT_ACCESS_EXPIRES_IN = "15m";
  }
  if (!process.env.JWT_REFRESH_EXPIRES_IN) {
    process.env.JWT_REFRESH_EXPIRES_IN = "7d";
  }
  if (!process.env.EMAIL_VERIFICATION_EXPIRES_MINUTES) {
    process.env.EMAIL_VERIFICATION_EXPIRES_MINUTES = "10";
  }
  if (!process.env.PASSWORD_RESET_EXPIRES_MINUTES) {
    process.env.PASSWORD_RESET_EXPIRES_MINUTES = "15";
  }

  const dailySummaryTime = process.env.DAILY_SUMMARY_TIME || "23:00";
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(dailySummaryTime)) {
    throw new Error("DAILY_SUMMARY_TIME must use 24-hour HH:mm format, such as 23:00.");
  }
  process.env.DAILY_SUMMARY_TIME = dailySummaryTime;

  const dailySummaryUrl = process.env.DAILY_SUMMARY_URL || "/dashboard";
  if (!dailySummaryUrl.startsWith("/") || dailySummaryUrl.startsWith("//") || /[\r\n]/.test(dailySummaryUrl)) {
    throw new Error("DAILY_SUMMARY_URL must be an internal application route such as /dashboard.");
  }
  process.env.DAILY_SUMMARY_URL = dailySummaryUrl;

  // Warnings for non-critical services in production
  if (process.env.NODE_ENV === "production") {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn("WARNING: EMAIL_USER or EMAIL_PASS is not set in production.");
    }
  }
}

module.exports = validateEnv;
