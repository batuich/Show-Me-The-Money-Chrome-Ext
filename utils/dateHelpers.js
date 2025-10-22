// utils/dateHelpers.js

/**
 * Checks for missing days in the transaction history within a given date range.
 * @param {Array} history An array of transaction objects.
 * @param {Date} startDate The start of the date range.
 * @param {Date} endDate The end of the date range.
 * @returns {Array<string>} An array of missing date strings.
 */
function checkForMissingDays(history, startDate, endDate) {
  const missingDays = [];
  const recordedDates = new Set(history.map(t => new Date(t.date).toDateString()));

  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    if (!recordedDates.has(currentDate.toDateString())) {
      missingDays.push(currentDate.toLocaleDateString());
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return missingDays;
}
