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

/**
 * Groups consecutive dates into ranges and formats them.
 * @param {string[]} missingDays - An array of date strings (e.g., "9/26/2025").
 * @returns {string} A formatted string of dates and date ranges (e.g., "26-09-2025, 29-09-2025, 01-10 to 03-10-2025").
 */
function groupConsecutiveDates(missingDays) {
    if (!missingDays || missingDays.length === 0) {
        return "";
    }

    // 1. Parse and sort dates
    const dates = missingDays.map(day => new Date(day)).sort((a, b) => a - b);

    // 2. Group consecutive dates
    const groups = [];
    let currentGroup = [dates[0]];

    for (let i = 1; i < dates.length; i++) {
        const prevDate = dates[i - 1];
        const currentDate = dates[i];
        const diffTime = Math.abs(currentDate - prevDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            currentGroup.push(currentDate);
        } else {
            groups.push(currentGroup);
            currentGroup = [currentDate];
        }
    }
    groups.push(currentGroup);

    // 3. Format groups into strings
    const formattedParts = groups.map(group => {
        const start = group[0];
        const end = group[group.length - 1];
        const startDateStr = start.toLocaleDateString('en-GB').replace(/\//g, '-');

        if (start.getTime() === end.getTime()) {
            return startDateStr; // Single date
        } else {
            const endDateStr = end.toLocaleDateString('en-GB').replace(/\//g, '-');
            const [startDay, startMonth, startYear] = startDateStr.split('-');
            const [endDay, endMonth, endYear] = endDateStr.split('-');
            
            if (startYear !== endYear) {
                return `${startDateStr} to ${endDateStr}`;
            } else if (startMonth !== endMonth) {
                return `${startDay}-${startMonth} to ${endDateStr}`;
            } else {
                return `${startDay} to ${endDateStr}`;
            }
        }
    });

    return formattedParts.join(', ');
}
