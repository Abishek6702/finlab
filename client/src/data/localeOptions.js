export const countries = [
  { code: 'IN', name: 'India', currency: 'INR' },
  { code: 'US', name: 'United States', currency: 'USD' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
  { code: 'DE', name: 'Germany', currency: 'EUR' },
  { code: 'FR', name: 'France', currency: 'EUR' },
  { code: 'ES', name: 'Spain', currency: 'EUR' },
  { code: 'IT', name: 'Italy', currency: 'EUR' },
  { code: 'NL', name: 'Netherlands', currency: 'EUR' },
  { code: 'CA', name: 'Canada', currency: 'CAD' },
  { code: 'AU', name: 'Australia', currency: 'AUD' },
  { code: 'SG', name: 'Singapore', currency: 'SGD' },
  { code: 'JP', name: 'Japan', currency: 'JPY' },
  { code: 'CH', name: 'Switzerland', currency: 'CHF' },
  { code: 'NZ', name: 'New Zealand', currency: 'NZD' },
];

export const currencies = [
  { code: 'INR', symbol: '₹', name: 'Indian rupee' },
  { code: 'USD', symbol: '$', name: 'US dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'Pound sterling' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese yen' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss franc' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand dollar' },
];

export const languages = [{ code: 'en', name: 'English' }];

export function countryFromBrowserLocale() {
  try {
    const locale = new Intl.Locale(navigator.language);
    const region = locale.region;
    if (countries.some((country) => country.code === region)) return region;
  } catch { /* Locale region is only a suggestion. */ }
  return 'IN';
}

export function validTimezone(value) {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch { return false; }
}
