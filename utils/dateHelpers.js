// utils/dateHelpers.js

/**
 * Checks for missing days in the transaction history within a given date range.
 * Filters out days without transactions (if there's data at the start and end of the period)
 * and excludes the current day.
 * @param {Array} history An array of transaction objects.
 * @param {Date} startDate The start of the date range.
 * @param {Date} endDate The end of the date range.
 * @returns {Array<string>} An array of missing date strings.
 */
function checkForMissingDays(history, startDate, endDate) {
  const missingDays = [];
  const recordedDates = new Set(history.map(t => new Date(t.date).toDateString()));
  
  // Get today's date for comparison (normalize to start of day)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDateString = today.toDateString();
  
  // Normalize start and end dates for comparison
  const normalizedStartDate = new Date(startDate);
  normalizedStartDate.setHours(0, 0, 0, 0);
  const normalizedEndDate = new Date(endDate);
  normalizedEndDate.setHours(0, 0, 0, 0);
  
  // Find first and last dates with data in the period
  const datesInPeriod = [];
  let checkDate = new Date(normalizedStartDate);
  while (checkDate <= normalizedEndDate) {
    if (recordedDates.has(checkDate.toDateString())) {
      datesInPeriod.push(new Date(checkDate));
    }
    checkDate.setDate(checkDate.getDate() + 1);
  }
  
  // Check if we have data at the start and end of the period
  const hasDataAtStart = datesInPeriod.length > 0 && 
    datesInPeriod[0].getTime() === normalizedStartDate.getTime();
  const hasDataAtEnd = datesInPeriod.length > 0 && 
    datesInPeriod[datesInPeriod.length - 1].getTime() === normalizedEndDate.getTime();
  
  // If we have data at both start and end, days without data in between are just days without transactions
  const shouldFilterDaysWithoutTransactions = hasDataAtStart && hasDataAtEnd && datesInPeriod.length >= 2;
  
  // Find the first and last dates with data
  const firstDataDate = datesInPeriod.length > 0 ? datesInPeriod[0] : null;
  const lastDataDate = datesInPeriod.length > 0 ? datesInPeriod[datesInPeriod.length - 1] : null;
  
  // Check for missing days
  let currentDate = new Date(normalizedStartDate);
  while (currentDate <= normalizedEndDate) {
    const currentDateString = currentDate.toDateString();
    
    // Skip current day - user hasn't had time to use Cursor yet today
    if (currentDateString === todayDateString) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }
    
    // Skip if date has data
    if (recordedDates.has(currentDateString)) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }
    
    // If we should filter days without transactions and this day is between first and last data dates
    if (shouldFilterDaysWithoutTransactions && firstDataDate && lastDataDate) {
      const currentTime = currentDate.getTime();
      const firstTime = firstDataDate.getTime();
      const lastTime = lastDataDate.getTime();
      
      // If this day is between first and last data dates, it's just a day without transactions
      // (we collect all visible data, so if there's no data, there were no transactions)
      if (currentTime > firstTime && currentTime < lastTime) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }
    }
    
    // This is a truly missing day (no data at start/end or outside the data range)
    missingDays.push(currentDate.toLocaleDateString());
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

/**
 * Formats a date range for the tooltip based on a preset.
 * @param {string} preset - The preset ('1d', '7d', '30d').
 * @returns {string} The formatted date string.
 */
function formatTooltipDate(preset) {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();

    if (preset === '1d') {
        return `${day}-${month}-${year}`;
    }

    const days = parseInt(preset.replace('d', ''));
    const startDate = new Date();
    startDate.setDate(now.getDate() - (days - 1));

    const startDay = String(startDate.getDate()).padStart(2, '0');
    const startMonth = String(startDate.getMonth() + 1).padStart(2, '0');

    return `${startDay}-${startMonth} to ${day}-${month}-${year}`;
}
