require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const compression = require("compression");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const { apiLimiter } = require("./middleware/rateLimiter");
const { notFound, errorHandler } = require("./middleware/errorHandler");


const healthRoutes = require("./routes/healthRoutes");

const app = express();

// 1. Set Security HTTP Headers (Strict)
app.use(helmet());

// 2. Development logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// 3. Limit repeated requests to public APIs (Prevents brute force on payment/auth)
app.use("/api/", apiLimiter);

// 4. Implement CORS correctly (Supports single URL, comma-separated URLs, and strips trailing slashes)
const allowedOrigins = (process.env.FRONTEND_URL)
  .split(",")
  .map((url) => url.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/+$/, "");
      if (
        allowedOrigins.includes(normalizedOrigin) ||
        process.env.NODE_ENV !== "production"
      ) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Exte_key",
      "exte_key",
      "X-Auth-Token",
      "x-auth-token",
      "Accept",
      "Origin",
      "X-Requested-With",
    ],
  })
);
app.options("*", cors()); // Enable pre-flight for all routes

// 5. Body parser, reading data from body into req.body (Strict 100kb limit)
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use(cookieParser());

// 6. Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// 7. Data sanitization against XSS (Cross Site Scripting)
app.use(xss());

// 8. Prevent HTTP Parameter Pollution
app.use(hpp());

// 9. Compress responses for performance
app.use(compression());

// --- ROUTES ---
app.use("/api/health", healthRoutes);

// --- ERROR HANDLING ---
app.use(notFound);
app.use(errorHandler);

module.exports = app;
