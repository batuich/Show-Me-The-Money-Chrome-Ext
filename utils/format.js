// utils/format.js

/**
 * Formats a numeric amount as currency without relying on Intl to
 * keep the output stable across environments.
 * @param {number} amount - The amount to format.
 * @param {Object} [options] - Optional formatting options.
 * @param {string} [options.currencySymbol=''] - Symbol to prefix (e.g. '$').
 * @param {number} [options.decimals=2] - Fraction digits to display.
 * @returns {string} Formatted currency string.
 */
function formatCurrency(amount, options = {}) {
  const { currencySymbol = '', decimals = 2 } = options;
  const safeDecimals = Number.isInteger(decimals) && decimals >= 0 ? decimals : 2;

  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    return `${currencySymbol}${Number(0).toFixed(safeDecimals)}`;
  }

  return `${currencySymbol}${amount.toFixed(safeDecimals)}`;
}

/**
 * Formats a Date instance into a short string (e.g., "4 Nov").
 * @param {Date|string|number} value - Date instance or parsable input.
 * @returns {string} Short date string or empty string if invalid.
 */
function formatDateShort(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const day = date.getDate();
  const month = date.toLocaleString('default', { month: 'short' });
  return `${day} ${month}`;
}
