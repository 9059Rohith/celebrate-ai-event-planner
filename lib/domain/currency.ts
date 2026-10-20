/**
 * Currency formatting and display utilities
 * Supports INR (with en-IN lakh/crore grouping), USD, EUR, GBP
 */

export type CurrencyCode = "INR" | "USD" | "EUR" | "GBP";

const SYMBOLS: Record<CurrencyCode, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

const LOCALES: Record<CurrencyCode, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
};

/**
 * Format a number as currency with proper locale grouping.
 * e.g., formatCurrency(800000, 'INR') → '₹8,00,000'
 */
export function formatCurrency(amount: number, currency: CurrencyCode): string {
  const locale = LOCALES[currency] ?? "en-IN";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${SYMBOLS[currency] ?? ""}${amount.toLocaleString(locale)}`;
  }
}

/**
 * Format with compact notation (₹8L, $50K)
 */
export function formatCurrencyCompact(
  amount: number,
  currency: CurrencyCode,
): string {
  if (currency === "INR") {
    if (amount >= 10000000)
      return `₹${(amount / 10000000).toFixed(1).replace(/\.0$/, "")}Cr`;
    if (amount >= 100000)
      return `₹${(amount / 100000).toFixed(1).replace(/\.0$/, "")}L`;
    if (amount >= 1000)
      return `₹${(amount / 1000).toFixed(1).replace(/\.0$/, "")}K`;
    return `₹${amount}`;
  }

  const symbol = SYMBOLS[currency] ?? "";
  if (amount >= 1000000)
    return `${symbol}${(amount / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  if (amount >= 1000)
    return `${symbol}${(amount / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${symbol}${amount}`;
}

/**
 * Format a price range
 */
export function formatPriceRange(
  min: number,
  max: number,
  currency: CurrencyCode,
  unit?: string,
): string {
  const minStr = formatCurrencyCompact(min, currency);
  const maxStr = formatCurrencyCompact(max, currency);
  const suffix = unit ? ` ${unit}` : "";
  return `${minStr} – ${maxStr}${suffix}`;
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: CurrencyCode): string {
  return SYMBOLS[currency] ?? currency;
}

/**
 * Conversion hint ratios (approximate, for display only — not live FX)
 */
export const CONVERSION_HINTS: Record<string, number> = {
  INR_USD: 0.012,
  INR_EUR: 0.011,
  INR_GBP: 0.0095,
  USD_INR: 83,
  EUR_INR: 90,
  GBP_INR: 105,
  USD_EUR: 0.92,
  USD_GBP: 0.79,
  EUR_USD: 1.09,
  EUR_GBP: 0.86,
  GBP_USD: 1.27,
  GBP_EUR: 1.16,
};
