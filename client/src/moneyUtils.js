const fractionDigitCache = new Map();

export function currencyFractionDigits(currency = 'USD') {
  const code = String(currency || 'USD').trim().toUpperCase();
  if (fractionDigitCache.has(code)) return fractionDigitCache.get(code);

  let digits = 2;
  try {
    digits = new Intl.NumberFormat('en', { style: 'currency', currency: code })
      .resolvedOptions().maximumFractionDigits;
  } catch {
    // Keep display resilient if a legacy record contains an invalid currency.
  }
  fractionDigitCache.set(code, digits);
  return digits;
}

export function currencyStep(currency = 'USD') {
  return 10 ** -currencyFractionDigits(currency);
}

export function formatCurrencyAmount(amount, currency = 'USD') {
  const value = Number(amount ?? 0);
  const digits = currencyFractionDigits(currency);
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0);
}

export function majorUnitsFromMinor(amountMinor, currency = 'USD') {
  const value = Number(amountMinor);
  return Number.isFinite(value) ? value / (10 ** currencyFractionDigits(currency)) : 0;
}
