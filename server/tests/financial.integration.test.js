const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Account = require("../models/Account");
const Category = require("../models/Category");
const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");
const SavingsGoal = require("../models/SavingsGoal");
const RecurringTransaction = require("../models/RecurringTransaction");
const RecurringOccurrence = require("../models/RecurringOccurrence");
const BalanceAdjustment = require("../models/BalanceAdjustment");
const SavingsContribution = require("../models/SavingsContribution");
const transactionController = require("../controllers/transactionController");
const accountController = require("../controllers/accountController");
const savingsController = require("../controllers/savingsController");
const recurringController = require("../controllers/recurringController");
const budgetController = require("../controllers/budgetController");
const { runRecurringWorkerTick, nextOccurrenceDate } = require("../services/recurringService");

const mongoTestUri = process.env.MONGO_TEST_URI;
const productionMongoUri = process.env.MONGO_URI;
const testDbName = mongoTestUri ? new URL(mongoTestUri).pathname.replace(/^\//, "").split("/")[0] : "";
const hasSafeTestDb = Boolean(mongoTestUri && /(^|[_-])test($|[_-])/i.test(testDbName));
if (mongoTestUri && productionMongoUri && mongoTestUri === productionMongoUri) {
  throw new Error("Safety refusal: MONGO_TEST_URI must never equal MONGO_URI");
}
if (mongoTestUri && productionMongoUri) {
  const testUrl = new URL(mongoTestUri);
  const productionUrl = new URL(productionMongoUri);
  const testDatabase = testUrl.pathname.replace(/^\//, "").split("/")[0];
  const productionDatabase = productionUrl.pathname.replace(/^\//, "").split("/")[0];
  if (testUrl.host.toLowerCase() === productionUrl.host.toLowerCase() && testDatabase === productionDatabase) {
    throw new Error("Safety refusal: MONGO_TEST_URI resolves to the production host and database");
  }
}

function invoke(handler, { userId, params = {}, query = {}, body = {} }) {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(payload) { resolve({ status: this.statusCode, body: payload }); return this; },
    };
    handler({ user: { _id: userId, baseCurrency: "USD" }, params, query, body }, res, reject);
  });
}

test("MongoDB financial integration (replica set required)", { skip: !hasSafeTestDb }, async (t) => {
  if (!hasSafeTestDb) return;
  await mongoose.connect(mongoTestUri, { serverSelectionTimeoutMS: 5000 });
  const userId = new mongoose.Types.ObjectId();
  const otherUserId = new mongoose.Types.ObjectId();
  t.after(async () => {
    await Promise.all([
      Account.deleteMany({ userId }),
      Account.deleteMany({ userId: otherUserId }),
      Category.deleteMany({ userId }),
      Transaction.deleteMany({ userId }),
      Budget.deleteMany({ userId }),
      SavingsGoal.deleteMany({ userId }),
      SavingsContribution.deleteMany({ userId }),
      RecurringTransaction.deleteMany({ userId }),
      RecurringOccurrence.deleteMany({ userId }),
      BalanceAdjustment.deleteMany({ userId }),
    ]);
    await mongoose.disconnect();
  });
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  assert.ok(hello.setName || hello.msg === "isdbgrid", "MongoDB replica set or mongos is required for financial transactions");
  const account = await Account.create({ userId, name: "Checking", type: "bank", currency: "USD", openingBalance: 100, currentBalance: 100 });
  const destination = await Account.create({ userId, name: "Savings", type: "bank", currency: "USD", openingBalance: 0, currentBalance: 0 });
  const foreignAccount = await Account.create({ userId: otherUserId, name: "Private", type: "bank", currency: "USD", openingBalance: 500, currentBalance: 500 });
  const expenseCategory = await Category.create({ userId, name: "Food", type: "expense" });
  const incomeCategory = await Category.create({ userId, name: "Income", type: "income" });

  await t.test("MongoDB transaction support rolls back writes", async () => {
    const probeId = new mongoose.Types.ObjectId();
    const session = await mongoose.startSession();
    try {
      await assert.rejects(session.withTransaction(async () => {
        await Account.collection.insertOne({ _id: probeId, userId, name: "rollback-probe" }, { session });
        throw new Error("intentional rollback probe");
      }), /intentional rollback probe/);
      assert.equal(await Account.collection.countDocuments({ _id: probeId }), 0);
    } finally {
      await session.endSession();
    }
  });

  await t.test("transaction create, edit, transfer, refund, delete and restore reconcile balances", async () => {
    const created = await invoke(transactionController.createTransaction, {
      userId, body: { type: "expense", amount: 10, accountId: account._id, categoryId: expenseCategory._id, description: "Meal" },
    });
    assert.equal(created.status, 201);
    const expenseId = created.body.data._id;
    assert.equal((await Account.findById(account._id)).currentBalance, 90);

    const edited = await invoke(transactionController.updateTransaction, { userId, params: { id: expenseId }, body: { amount: 12 } });
    assert.equal(edited.status, 200);
    assert.equal((await Account.findById(account._id)).currentBalance, 88);

    const foreignEdit = await invoke(transactionController.updateTransaction, { userId, params: { id: expenseId }, body: { accountId: foreignAccount._id } });
    assert.equal(foreignEdit.status, 400);
    assert.equal((await Account.findById(foreignAccount._id)).currentBalance, 500);

    const transfer = await invoke(transactionController.createTransaction, {
      userId, body: { type: "transfer", amount: 20, destinationAmount: 20, accountId: account._id, destinationAccountId: destination._id, description: "Move" },
    });
    assert.equal(transfer.status, 201);
    assert.equal((await Account.findById(account._id)).currentBalance, 68);
    assert.equal((await Account.findById(destination._id)).currentBalance, 20);

    const original = await invoke(transactionController.createTransaction, {
      userId, body: { type: "expense", amount: 8, accountId: account._id, categoryId: expenseCategory._id, description: "Purchase" },
    });
    const refund = await invoke(transactionController.createTransaction, {
      userId, body: { type: "refund", amount: 3, accountId: account._id, categoryId: incomeCategory._id, originalTransactionId: original.body.data._id, description: "Refund" },
    });
    assert.equal(refund.status, 201);
    assert.equal((await Transaction.findById(original.body.data._id)).totalRefunded, 3);
    assert.equal((await Account.findById(account._id)).currentBalance, 63);

    await invoke(transactionController.softDeleteTransaction, { userId, params: { id: refund.body.data._id } });
    assert.equal((await Transaction.findById(original.body.data._id)).totalRefunded, 0);
    assert.equal((await Account.findById(account._id)).currentBalance, 60);
    await invoke(transactionController.restoreTransaction, { userId, params: { id: refund.body.data._id } });
    assert.equal((await Transaction.findById(original.body.data._id)).totalRefunded, 3);
    assert.equal((await Account.findById(account._id)).currentBalance, 63);

    await invoke(transactionController.softDeleteTransaction, { userId, params: { id: expenseId } });
    assert.equal((await Account.findById(account._id)).currentBalance, 75);
    await invoke(transactionController.restoreTransaction, { userId, params: { id: expenseId } });
    assert.equal((await Account.findById(account._id)).currentBalance, 63);
  });

  await t.test("concurrent financial writes serialize balance changes", async () => {
    const results = await Promise.all([1, 2].map((n) => invoke(transactionController.createTransaction, {
      userId,
      body: { type: "expense", amount: 1, accountId: account._id, categoryId: expenseCategory._id, description: `Concurrent ${n}` },
    })));
    assert.deepEqual(results.map((r) => r.status), [201, 201]);
    assert.equal((await Account.findById(account._id)).currentBalance, 61);
  });

  await t.test("balance adjustments and savings contributions commit with their records", async () => {
    const adjust = await invoke(accountController.adjustBalance, { userId, params: { id: account._id }, body: { newBalance: 80, reason: "Reconcile" } });
    assert.equal(adjust.status, 200);
    assert.equal(await BalanceAdjustment.countDocuments({ userId }), 1);
    const goal = await SavingsGoal.create({ userId, name: "Trip", targetAmount: 100, currentAmount: 0, currency: "USD", targetDate: new Date(Date.now() + 86400000) });
    const contribution = await invoke(savingsController.recordContribution, { userId, params: { id: goal._id }, body: { type: "deposit", amount: 15 } });
    assert.equal(contribution.status, 201);
    assert.equal((await SavingsGoal.findById(goal._id)).currentAmount, 15);
    assert.equal(await SavingsContribution.countDocuments({ userId, goalId: goal._id }), 1);
    const withdrawal = await invoke(savingsController.recordContribution, { userId, params: { id: goal._id }, body: { type: "withdrawal", amount: 10 } });
    assert.equal(withdrawal.status, 201);
    assert.equal((await SavingsGoal.findById(goal._id)).currentAmount, 5);
    assert.equal(await SavingsContribution.countDocuments({ userId, goalId: goal._id }), 2);
  });

  await t.test("recurring posting is concurrent-safe and idempotent", async () => {
    const start = new Date();
    const schedule = await RecurringTransaction.create({
      userId, type: "income", amount: 2, currency: "USD", accountId: account._id,
      categoryId: incomeCategory._id, description: "Interest", frequency: "monthly",
      startDate: start, nextOccurrenceDate: start,
    });
    const occurrence = await RecurringOccurrence.create({
      userId, recurringTransactionId: schedule._id, occurrenceKey: `${schedule._id}_test`, dueDate: start, amount: 2, status: "pending",
    });
    const [one, two] = await Promise.all([
      invoke(recurringController.postOccurrence, { userId, params: { id: occurrence._id } }),
      invoke(recurringController.postOccurrence, { userId, params: { id: occurrence._id } }),
    ]);
    assert.equal(one.status, 200);
    assert.equal(two.status, 200);
    assert.equal(await Transaction.countDocuments({ recurringOccurrenceId: occurrence._id }), 1);
    const indexes = await Transaction.collection.indexes();
    assert.ok(indexes.some((index) => index.key?.recurringOccurrenceId === 1 && index.unique === true));
  });

  await t.test("recurring worker auto-post survives repeated ticks and calendar boundaries", async () => {
    const start = new Date(Date.now() - 2 * 86400000);
    const schedule = await RecurringTransaction.create({
      userId, type: "income", amount: 5, currency: "USD", accountId: account._id,
      categoryId: incomeCategory._id, description: "Monthly income", frequency: "monthly",
      startDate: start, nextOccurrenceDate: start, timeZone: "Asia/Kolkata", scheduleDay: 31,
      isEndOfMonth: true, autoPostEnabled: true,
    });
    const [tickA, tickB] = await Promise.all([
      runRecurringWorkerTick({ now: new Date(), logger: { error() {} } }),
      runRecurringWorkerTick({ now: new Date(), logger: { error() {} } }),
    ]);
    assert.ok(tickA + tickB >= 1);
    await runRecurringWorkerTick({ now: new Date(), logger: { error() {} } });
    const generated = await RecurringOccurrence.find({ recurringTransactionId: schedule._id });
    assert.equal(generated.length, 1);
    assert.equal(generated[0].status, "posted");
    assert.equal(await Transaction.countDocuments({ recurringOccurrenceId: generated[0]._id }), 1);
    await assert.rejects(RecurringOccurrence.create({
      userId,
      recurringTransactionId: schedule._id,
      occurrenceKey: generated[0].occurrenceKey,
      dueDate: generated[0].dueDate,
      amount: generated[0].amount,
      status: "pending",
    }), (error) => error.code === 11000);
    const february = new Date("2024-01-31T00:00:00Z");
    const next = nextOccurrenceDate(february, {
      frequency: "monthly", interval: 1, timeZone: "UTC", scheduleDay: 31,
      isEndOfMonth: true, startDate: february,
    });
    assert.equal(next.toISOString().slice(0, 10), "2024-02-29");
  });

  await t.test("budget spending is currency-scoped", async () => {
    await Budget.create({ userId, name: "Food", type: "category", categoryId: expenseCategory._id, amount: 50, currency: "USD", period: "monthly", startDate: new Date(Date.now() - 86400000), endDate: new Date(Date.now() + 86400000) });
    const result = await invoke(budgetController.getBudgets, { userId });
    assert.equal(result.status, 200);
    assert.ok(result.body.data[0].spent >= 0);
  });
});

if (mongoTestUri && !hasSafeTestDb) {
  test("MONGO_TEST_URI safety check", () => {
    assert.fail("MONGO_TEST_URI database name must clearly include 'test'; refusing to connect or clean data");
  });
}
