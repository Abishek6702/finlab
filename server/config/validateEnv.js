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

  // Warnings for non-critical services in production
  if (process.env.NODE_ENV === "production") {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn("WARNING: EMAIL_USER or EMAIL_PASS is not set in production.");
    }
  }
}

module.exports = validateEnv;
