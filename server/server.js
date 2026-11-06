const dotenv = require("dotenv");

// Load env vars before requiring anything else
dotenv.config();

const validateEnv = require("./config/validateEnv");
validateEnv();

// Require database connection and the Express app
const connectDB = require("./config/db");
const app = require("./app");
const { startRecurringWorker } = require("./services/recurringService");

const PORT = process.env.PORT;
let server;
let stopRecurringWorker;

async function start() {
  try {
    await connectDB();
    stopRecurringWorker = startRecurringWorker({ logger: console });
    server = app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message || error);
    process.exitCode = 1;
  }
}

function shutdown() {
  stopRecurringWorker?.();
  if (server) server.close(() => process.exit(0));
  else process.exit(0);
}

void start();

// Handle unhandled promise rejections globally
process.on("unhandledRejection", (err, promise) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  // Close server & exit process gracefully
  stopRecurringWorker?.();
  if (server) server.close(() => process.exit(1));
  else process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error(`Uncaught Exception: ${err.message}`);
  stopRecurringWorker?.();
  if (server) server.close(() => process.exit(1));
  else process.exit(1);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
