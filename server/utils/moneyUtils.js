/**
 * Currency-aware arithmetic for the existing major-unit API/database contract.
 * Calculations are integer minor units internally; callers must pass the currency
 * when it is known. The USD default is retained for backwards compatibility.
 * This does not migrate existing persisted amounts.
 */
const exponentCache = new Map();

function currencyExponent(currency = "USD") {
  const code = String(currency || "USD").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) throw new TypeError(`Invalid currency code: ${code}`);
  if (!exponentCache.has(code)) {
    try {
      const digits = new Intl.NumberFormat("en", { style: "currency", currency: code })
        .resolvedOptions().maximumFractionDigits;
      exponentCache.set(code, digits);
    } catch {
      throw new TypeError(`Unsupported ISO currency code: ${code}`);
    }
  }
  return exponentCache.get(code);
}

function minorFactor(currency = "USD") {
  return 10 ** currencyExponent(currency);
}

function toMinorUnits(amount, currency = "USD") {
  if (typeof amount === "string" && !/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(amount.trim())) {
    throw new TypeError("Money amount must be a decimal number");
  }
  const value = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(value)) throw new TypeError("Money amount must be a finite number");
  const minor = Math.round(value * minorFactor(currency));
  if (!Number.isSafeInteger(minor)) throw new RangeError("Money amount exceeds safe integer precision");
  return minor;
}

function toMajorUnits(minorUnits, currency = "USD") {
  if (!Number.isSafeInteger(minorUnits)) throw new TypeError("Minor units must be a safe integer");
  const factor = minorFactor(currency);
  return Number((minorUnits / factor).toFixed(currencyExponent(currency)));
}

function addMoney(a, b, currency = "USD") {
  return toMajorUnits(toMinorUnits(a, currency) + toMinorUnits(b, currency), currency);
}

function subtractMoney(a, b, currency = "USD") {
  return toMajorUnits(toMinorUnits(a, currency) - toMinorUnits(b, currency), currency);
}

function multiplyMoney(amount, factor, currency = "USD") {
  if (!Number.isFinite(factor)) throw new TypeError("Money multiplier must be finite");
  const result = Math.round(toMinorUnits(amount, currency) * factor);
  if (!Number.isSafeInteger(result)) throw new RangeError("Money result exceeds safe integer precision");
  return toMajorUnits(result, currency);
}

function roundMoney(amount, currency = "USD") {
  return toMajorUnits(toMinorUnits(amount, currency), currency);
}

function roundMinor(amount) {
  return Math.round(amount);
}

function validateMinorBalance(balance) {
  return typeof balance === "number" && Number.isSafeInteger(balance);
}

module.exports = {
  currencyExponent,
  toMinorUnits,
  toMajorUnits,
  toMinor: toMinorUnits,
  toMajor: toMajorUnits,
  addMoney,
  subtractMoney,
  multiplyMoney,
  roundMoney,
  roundMinor,
  validateMinorBalance,
};
