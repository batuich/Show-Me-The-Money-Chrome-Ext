/**
 * @fileoverview This file contains the logic for creating and managing the calendar popup.
 */

let currentCalendar = null;

/**
 * Creates and displays the calendar popup.
 * @param {HTMLElement} anchorElement - The element to position the calendar relative to.
 * @param {string} themeName - The name of the theme to use.
 */
window.SMTM.createCalendarPopup = async function(anchorElement, themeName = 'cursor') {
  if (currentCalendar) {
    currentCalendar.remove();
    currentCalendar = null;
    return;
  }

  const theme = window.SMTM.getTheme(themeName);
  if (!theme || !theme.calendar) {
    console.error(`Show Me The Money: Calendar theme "${themeName}" not found.`);
    return;
  }

  // --- Date Initialization ---
  const savedDate = localStorage.getItem('smtmSelectedDate');
  let selectedDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (savedDate) {
    const [year, month, day] = savedDate.split('-').map(Number);
    selectedDate = new Date(year, month - 1, day);
  } else {
    selectedDate = new Date(today.getFullYear(), today.getMonth(), 1);
  }

  let displayDate = new Date(selectedDate);

  const calendar = document.createElement('div');
  calendar.id = 'smtm-calendar-popup';
  window.SMTM.applyThemeStyles(calendar, themeName, 'calendar.container');
  Object.assign(calendar.style, {
    position: 'absolute',
    zIndex: '10000'
  });

  // --- Calendar Header ---
  const header = document.createElement('div');
  window.SMTM.applyThemeStyles(header, themeName, 'calendar.title');

  const monthDisplay = document.createElement('div');
  window.SMTM.applyThemeStyles(monthDisplay, themeName, 'calendar.month');
  const monthText = document.createElement('span');
  window.SMTM.applyThemeStyles(monthText, themeName, 'calendar.monthText');
  monthDisplay.appendChild(monthText);

  const navButtons = document.createElement('div');
  window.SMTM.applyThemeStyles(navButtons, themeName, 'calendar.navButtons');

  const prevButton = document.createElement('button');
  window.SMTM.applyThemeStyles(prevButton, themeName, 'calendar.navButton');
  prevButton.innerHTML = `<img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMTYnIGhlaWdodD0nMTYnIHZpZXdCb3g9JzAgMCAxNiAxNicgZmlsbD0nbm9uZScgeG1sbnM9J2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJz4KPHBhdGggZD0nTTkuNjQ2MjIgMTMuMzUzN0w0LjY0NjIyIDguMzUzNzJDNC41OTk3MyA4LjMwNzI5IDQuNTYyODUgOC4yNTIxNCA0LjUzNzY5IDguMTkxNDRDNC41MTI1MiA4LjEzMDc0IDQuNDk5NTcgOC4wNjU2OCA0LjQ5OTU3IDcuOTk5OTdDNC44OTk1NyA3LjkzNDI3IDQuNTEyNTIgNy44NjkyIDQuNTM3NjkgNy44MDg1QzQuNTYyODUgNy43NDc4IDQuNTk5NzMgNy42OTI2NiA0LjY0NjIyIDcuNjQ2MjJMOS42NDYyMiAyLjY0NjIyQzkuNzQwMDQgMi41NTI0IDkuODY3MjggMi40OTk3IDkuOTk5OTcgMi40OTk3QzEwLjEzMjYgMi40OTk3IDEwLjI1OTkgMi41NTI0IDEwLjM1MzcgMi42NDYyMkMxMC40NDc1IDIuNzQwMDQgMTAuNTAwMiAyLjg2NzI5IDEwLjUwMDIgMi45OTk5N0MxMC41MDAyIDMuMTMyNjYgMTAuNDQ3NSAzLjI1OTkgMTAuMzUzNyAzLjM1MzcyTDUuNzA2ODQgNy45OTk5N0wxMC4zNTM3IDEyLjY0NjJDMTAuNDAwMiAxMi42OTI3IDEwLjQzNyAxMi43NDc4IDEwLjQ2MjIgMTIuODA4NUMxMC40ODczIDEyLjg2OTIgMTAuNTAwMiAxMi45MzQzIDEwLjUwMDIgMTNDMTAuNTAwMiAxMy4wNjU3IDEwLjQ4NzMgMTMuMTMwNyAxMC40NjIyIDEzLjE5MTRDMTAuNDM3IDEzLjI1MjEgMTAuNDAwMiAxMy4zMDczIDEwLjM1MzcgMTMuMzUzN0MxMC4zMDczIDEzLjQwMDIgMTAuMjUyMSAxMy40MzcgMTAuMTkxNCAxMy40NjIyQzEwLjEzMDcgMTMuNDg3MyAxMC4wNjU3IDEzLjUwMDMgOS45OTk5NyAxMy41MDAzQzkuOTM0MjcgMTMuNTAwMyA5Ljg2OTIxIDEzLjQ4NzMgOS44MDg1MiAxMy40NjIyQzkuNzQ3ODIgMTMuNDM3IDkuNjkyNjcgMTMuNDAwMiA5LjY0NjIyIDEzLjM1MzdaJyBmaWxsPSd3aGl0ZScvPgo8L3N2Zz4K" />`;
  prevButton.onmouseover = () => window.SMTM.applyThemeStyles(prevButton, themeName, 'calendar.navButton', 'hover');
  prevButton.onmouseout = () => window.SMTM.applyThemeStyles(prevButton, themeName, 'calendar.navButton', 'default');
  prevButton.onclick = () => {
    displayDate.setMonth(displayDate.getMonth() - 1);
    renderCalendarGrid();
  };

  const nextButton = document.createElement('button');
  window.SMTM.applyThemeStyles(nextButton, themeName, 'calendar.navButton');
  nextButton.innerHTML = `<img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMTYnIGhlaWdodD0nMTYnIHZpZXdCb3g9JzAgMCAxNiAxNicgZmlsbD0nbm9uZScgeG1sbnM9J2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJz4KPHBhdGggZD0nTTYuMzUzNzggMi42NDYyOEwxMS4zNTM4IDcuNjQ2MjhDMTEuNDAwMyA3LjY5MjcxIDExLjQzNzIgNy43NDc4NiAxMS40NjIzIDcuODA4NTZDMTEuNDg3NSA3Ljg2OTI2IDExLjUwMDQgNy45MzQzMiAxMS41MDA0IDguMDAwMDNDMTEuNTAwNCA4LjA2NTczIDExLjQ4NzUgOC4xMzA4IDExLjQ2MjMgOC4xOTE1QzExLjQzNzIgOC4yNTIyIDExLjQwMDMgOC4zMDczNCAxMS4zNTM4IDguMzUzNzhMNi4zNTM3OCAxMy4zNTM4QzYuMjU5OTYgMTMuNDQ3NiA2LjEzMjcyIDEzLjUwMDMgNi4wMDAwMyAxMy41MDAzQzUuODY3MzUgMTMuNTAwMyA1Ljc0MDEgMTMuNDQ3NiA1LjY0NjI4IDEzLjM1MzhDNS41NTI0NiAxMy4yNiA1LjQ5OTc2IDEzLjEzMjcgNS40OTk3NiAxM0M1LjQ5OTc2IDEyLjg2NzMgNS41NTI0NiAxMi43NDAxIDUuNjQ2MjggMTIuNjQ2M0wxMC4yOTMyIDguMDAwMDNMNS42NDYyOCAzLjM1Mzc4QzUuNTk5ODMgMy4zMDczMiA1LjU2Mjk4IDMuMjUyMTcgNS41Mzc4NCAzLjE5MTQ3QzUuNTEyNyAzLjEzMDc4IDUuNDk5NzYgMy4wNjU3MiA1LjQ5OTc2IDMuMDAwMDNDNS40OTk3NiAyLjkzNDMzIDUuNTEyNyAyLjg2OTI4IDUuNTM3ODQgMi44MDg1OEM1LjU2Mjk4IDIuNzQ3ODggNS41OTk4MyAyLjY5MjczIDUuNjQ2MjggMi42NDYyOEM1LjY5Mjc0IDIuNTk5ODIgNS43NDc4OSAyLjU2Mjk3IDUuODA4NTkgMi41Mzc4M0M1Ljg2OTI4IDIuNTEyNjkgNS45MzQzNCAyLjQ5OTc1IDYuMDAwMDMgMi40OTk3NUM2LjA2NTczIDIuNDk5NzUgNi4xMzA3OSAyLjUxMjY5IDYuMTkxNDggMi41Mzc4M0M2LjI1MjE4IDIuNTYyOTcgNi4zMDczMyAyLjU5OTgyIDYuMzUzNzggMi42NDYyOFonIGZpbGw9J3doaXRlJy8+Cjwvc3ZnPgo=" />`;
  nextButton.onmouseover = () => window.SMTM.applyThemeStyles(nextButton, themeName, 'calendar.navButton', 'hover');
  nextButton.onmouseout = () => window.SMTM.applyThemeStyles(nextButton, themeName, 'calendar.navButton', 'default');
  nextButton.onclick = () => {
    const nextMonth = new Date(displayDate);
    nextMonth.setMonth(displayDate.getMonth() + 1);

    if (nextMonth.getFullYear() > today.getFullYear() ||
       (nextMonth.getFullYear() === today.getFullYear() && nextMonth.getMonth() > today.getMonth())) {
      return;
    }

    displayDate.setMonth(displayDate.getMonth() + 1);
    renderCalendarGrid();
  };

  navButtons.appendChild(prevButton);
  navButtons.appendChild(nextButton);
  header.appendChild(monthDisplay);
  header.appendChild(navButtons);
  calendar.appendChild(header);

  // --- Calendar Grid Container ---
  const gridContainer = document.createElement('div');
  calendar.appendChild(gridContainer);

  const renderCalendarGrid = () => {
    gridContainer.innerHTML = ''; // Clear previous grid

    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();
    monthText.innerText = `${displayDate.toLocaleString('default', { month: 'long' })} ${year}`;

    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    if (isCurrentMonth) {
      nextButton.style.opacity = '0.5';
      nextButton.style.pointerEvents = 'none';
    } else {
      nextButton.style.opacity = '1';
      nextButton.style.pointerEvents = 'auto';
    }

    const grid = document.createElement('div');
    grid.style.display = 'flex';
    grid.style.flexDirection = 'column';
    grid.style.gap = '4px';

    const weekDays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    const weekRow = document.createElement('div');
    window.SMTM.applyThemeStyles(weekRow, themeName, 'calendar.week');
    weekDays.forEach(day => {
      const dayCell = document.createElement('div');
      dayCell.innerText = day;
      window.SMTM.applyThemeStyles(dayCell, themeName, 'calendar.weekDay');
      weekRow.appendChild(dayCell);
    });
    grid.appendChild(weekRow);

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    let startingDay = firstDayOfMonth.getDay(); // 0=Sun, 1=Mon,...
    if (startingDay === 0) startingDay = 7; // Adjust Sunday to be 7
    startingDay--; // Adjust to be 0=Mon, 1=Tu,...

    let date = 1;
    for (let i = 0; i < 6; i++) {
      const week = document.createElement('div');
      window.SMTM.applyThemeStyles(week, themeName, 'calendar.week');
      for (let j = 0; j < 7; j++) {
        const dayCell = document.createElement('div');
        window.SMTM.applyThemeStyles(dayCell, themeName, 'calendar.day');

        if (i === 0 && j < startingDay) {
          // Empty cells before the start of the month
          dayCell.innerText = '';
        } else if (date > daysInMonth) {
          // Empty cells after the end of the month
          dayCell.innerText = '';
        } else {
          dayCell.innerText = date;
          const currentDate = new Date(year, month, date);
          currentDate.setHours(0, 0, 0, 0);

          const isFutureDate = currentDate > today;

          if (isFutureDate) {
            dayCell.classList.add('calendar-date-disabled');
            window.SMTM.applyThemeStyles(dayCell, themeName, 'calendar.day', 'disabled');
            dayCell.style.cursor = 'default';
          } else {
            const isSelected = selectedDate &&
              currentDate.getFullYear() === selectedDate.getFullYear() &&
              currentDate.getMonth() === selectedDate.getMonth() &&
              currentDate.getDate() === selectedDate.getDate();

            if (isSelected) {
              window.SMTM.applyThemeStyles(dayCell, themeName, 'calendar.day', 'today'); // Use 'today' style for selected
            }

            dayCell.onmouseover = () => {
              if (!isSelected) {
                window.SMTM.applyThemeStyles(dayCell, themeName, 'calendar.day', 'hover');
              }
            };
            dayCell.onmouseout = () => {
              if (!isSelected) {
                window.SMTM.applyThemeStyles(dayCell, themeName, 'calendar.day', 'default');
                dayCell.style.backgroundColor = '';
              }
            };
            dayCell.onclick = () => {
              selectedDate = currentDate;
              const year = selectedDate.getFullYear();
              const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
              const day = selectedDate.getDate().toString().padStart(2, '0');
              localStorage.setItem('smtmSelectedDate', `${year}-${month}-${day}`);

              // Update the "Since" button text immediately
              if (window.SMTM && typeof window.SMTM.updateSinceButtonText === 'function') {
                window.SMTM.updateSinceButtonText();
              }

              // Recalculate the total with the new date
              if (typeof window.updateTotalDisplay === 'function') {
                window.updateTotalDisplay();
              }

              // Set "Since" button to active and presets to inactive
              const sinceButton = document.querySelector('.smtm-since-button');
              if (sinceButton) {
                sinceButton.classList.add('active');
                window.SMTM.applyThemeStyles(sinceButton, themeName, 'panelSinceButton', 'active');
              }
              document.querySelectorAll('#smtm-presets-container button').forEach(btn => {
                btn.classList.remove('active');
                window.SMTM.applyThemeStyles(btn, themeName, 'button', 'default');
              });

              closeCalendar();
            };
          }
          date++;
        }
        week.appendChild(dayCell);
      }
      grid.appendChild(week);
      if (date > daysInMonth) break; // Stop creating rows if all dates are placed
    }
    gridContainer.appendChild(grid);
  };

  document.body.appendChild(calendar);
  currentCalendar = calendar;

  // --- Positioning ---
  const anchorRect = anchorElement.getBoundingClientRect();
  calendar.style.top = `${anchorRect.bottom + window.scrollY + 5}px`;
  calendar.style.left = `${anchorRect.left + window.scrollX}px`;

  // --- Close Logic ---
  const closeCalendar = () => {
    if (currentCalendar) {
      currentCalendar.remove();
      currentCalendar = null;
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    }
  };

  const handleClickOutside = (event) => {
    if (currentCalendar && !currentCalendar.contains(event.target) && event.target !== anchorElement) {
      closeCalendar();
    }
  };

  const handleEsc = (event) => {
    if (event.key === 'Escape') {
      closeCalendar();
    }
  };

  setTimeout(() => {
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
  }, 0);

  renderCalendarGrid(); // Initial render
}
