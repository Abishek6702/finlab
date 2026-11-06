const dotenv = require("dotenv");

// Load env vars before requiring anything else
dotenv.config();

const validateEnv = require("./config/validateEnv");
validateEnv();

// Require database connection and the Express app
const connectDB = require("./config/db");
const app = require("./app");

// Connect to MongoDB
connectDB();

const PORT = process.env.PORT;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections globally
process.on("unhandledRejection", (err, promise) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  // Close server & exit process gracefully
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error(`Uncaught Exception: ${err.message}`);
  server.close(() => process.exit(1));
});
