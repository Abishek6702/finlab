const mongoose = require("mongoose");

/** Run financial writes in a MongoDB transaction and fail closed if unsupported. */
async function withMongoTransaction(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (error) {
    if (
      error.code === 20 ||
      /Transaction numbers are only allowed|replica set|mongos|transactions are not supported/i.test(error.message || "")
    ) {
      const unavailable = new Error("Financial operation requires MongoDB transaction support; no changes were committed.");
      unavailable.statusCode = 503;
      unavailable.code = "TRANSACTIONS_UNAVAILABLE";
      unavailable.cause = error;
      throw unavailable;
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

module.exports = { withMongoTransaction };
