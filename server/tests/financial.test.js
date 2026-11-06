const test = require("node:test");
const assert = require("node:assert/strict");

const {
  toMinor,
  toMajor,
  addMoney,
  subtractMoney,
  multiplyMoney,
  roundMinor,
  validateMinorBalance,
  currencyExponent,
} = require("../utils/moneyUtils");

test("FinLab Financial Calculation & Money Utility Tests", async (t) => {
  await t.test("Minor unit conversions prevent float drift", () => {
    // 0.1 + 0.2 in JS float is 0.30000000000000004
    const aMinor = toMinor(0.1);
    const bMinor = toMinor(0.2);
    assert.strictEqual(aMinor, 10);
    assert.strictEqual(bMinor, 20);
    assert.strictEqual(aMinor + bMinor, 30);
    assert.strictEqual(toMajor(aMinor + bMinor), 0.3);

    // Precise major conversion for typical currencies
    assert.strictEqual(toMinor("1250.75"), 125075);
    assert.strictEqual(toMajor(125075), 1250.75);

    // Negative values
    assert.strictEqual(toMinor(-45.5), -4550);
    assert.strictEqual(toMajor(-4550), -45.5);
  });

  await t.test("Safe money addition, subtraction and multiplication", () => {
    const sum = addMoney(0.1, 0.2);
    assert.strictEqual(sum, 0.3);

    const remaining = subtractMoney(100.0, 42.5);
    assert.strictEqual(remaining, 57.5);

    // Multiplication with tax / split factor
    const splitAmount = multiplyMoney(100.0, 0.333333);
    assert.strictEqual(splitAmount, 33.33);
  });

  await t.test("Balance validation and integer check", () => {
    // Minor units must be integer numbers
    assert.strictEqual(validateMinorBalance(5000), true);
    assert.strictEqual(validateMinorBalance(0), true);
    assert.strictEqual(validateMinorBalance(-500), true); // Overdrawn bank account is valid integer
    assert.strictEqual(validateMinorBalance("invalid"), false);
    assert.strictEqual(validateMinorBalance(NaN), false);
    assert.strictEqual(validateMinorBalance(10.5), false);
  });

  await t.test("Financial roundMinor edge cases", () => {
    assert.strictEqual(roundMinor(10.555), 11);
    assert.strictEqual(roundMinor(10.444), 10);
    assert.strictEqual(roundMinor(-10.5), -10);
  });

  await t.test("ISO currency exponents use the correct integer minor units", () => {
    assert.equal(currencyExponent("INR"), 2);
    assert.equal(currencyExponent("USD"), 2);
    assert.equal(currencyExponent("EUR"), 2);
    assert.equal(currencyExponent("JPY"), 0);
    assert.equal(currencyExponent("KWD"), 3);
    assert.equal(toMinor("123.45", "INR"), 12345);
    assert.equal(toMinor("123.45", "EUR"), 12345);
    assert.equal(toMinor("123", "JPY"), 123);
    assert.equal(toMajor(toMinor("123.456", "KWD"), "KWD"), 123.456);
    assert.throws(() => toMinor("12oops", "USD"), /decimal number/);
    assert.throws(() => toMinor("", "USD"), /decimal number/);
    assert.throws(() => toMinor(Number.MAX_SAFE_INTEGER, "KWD"), /safe integer/);
  });
});
