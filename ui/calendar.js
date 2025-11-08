// utils/calendar.js

(function() {
  'use strict';

  let themes = {};
  let currentCalendar = null;

  /**
   * Loads themes from themes.json
   * @returns {Promise<void>}
   */
  function loadThemes() {
    if (Object.keys(themes).length > 0) {
      return Promise.resolve(themes);
    }

    const canAccessRuntime = typeof chrome !== 'undefined' && !!chrome.runtime?.getURL;
    const themesUrl = canAccessRuntime ? chrome.runtime.getURL('themes.json') : 'themes.json';

    return fetch(themesUrl)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(data => {
        themes = data;
        return themes;
      })
      .catch(error => {
        console.error('Show Me The Money: Error loading themes:', error);

        if (window.SMTM?.themes) {
          themes = window.SMTM.themes;
          return themes;
        }

        const fallbackTheme = {
          calendar: {
            container: { default: { backgroundColor: '#1E1C15', padding: '12px', borderRadius: '6px' } },
            title: { default: { color: '#FFF', fontWeight: '600', marginBottom: '8px' } },
            month: { default: { color: '#FFF', fontSize: '14px' } },
            monthText: { default: { color: '#FFF', fontSize: '14px' } },
            navButtons: { default: { display: 'flex', gap: '4px' } },
            navButton: { default: { backgroundColor: 'transparent', border: 'none', cursor: 'pointer' } },
            week: { default: { display: 'flex', gap: '4px' } },
            weekDay: { default: { color: '#B5B5B6', fontSize: '12px', textAlign: 'center', flex: '1' } },
            day: {
              default: { color: '#FFF', padding: '6px', textAlign: 'center', borderRadius: '4px', cursor: 'pointer' },
              hover: { backgroundColor: '#2A2820' },
              today: { backgroundColor: '#423F34' },
              disabled: { color: '#555', cursor: 'not-allowed' }
            }
          }
        };

        themes = { fallback: fallbackTheme };
        return themes;
      });
  }

  /**
   * Creates and displays the calendar popup.
   * @param {HTMLElement} anchorElement - The element to position the calendar relative to.
   * @param {string} themeName - The name of the theme to use.
   */
  async function createCalendarPopup(anchorElement, themeName = 'cursor') {
    if (currentCalendar) {
      removeElement(currentCalendar);
      currentCalendar = null;
      return;
    }

    await loadThemes();
    const theme = themes[themeName];
    if (!theme || !theme.calendar) {
      console.error(`Show Me The Money: Calendar theme "${themeName}" not found.`);
      return;
    }

    // --- Date Initialization ---
    const savedDate = getStoredDate();
    let selectedDate = savedDate ? new Date(savedDate) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    if (!selectedDate || Number.isNaN(selectedDate.getTime())) {
      selectedDate = new Date(today.getFullYear(), today.getMonth(), 1);
      setStoredDate(selectedDate);
    }

    let displayDate = new Date(selectedDate);

    const calendar = createElement('div', { id: 'smtm-calendar-popup' });
    applyThemeStyles(calendar, theme, 'calendar.container');
    Object.assign(calendar.style, {
      position: 'absolute',
      zIndex: '10000'
    });

    // --- Calendar Header ---
    const header = createElement('div');
    applyThemeStyles(header, theme, 'calendar.title');

    const monthDisplay = createElement('div');
    applyThemeStyles(monthDisplay, theme, 'calendar.month');
    const monthText = createElement('span');
    applyThemeStyles(monthText, theme, 'calendar.monthText');
    monthDisplay.appendChild(monthText);

    const navButtons = createElement('div');
    applyThemeStyles(navButtons, theme, 'calendar.navButtons');

    const prevButton = document.createElement('button');
    applyThemeStyles(prevButton, theme, 'calendar.navButton');
    prevButton.innerHTML = `<img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMTYnIGhlaWdodD0nMTYnIHZpZXdCb3g9JzAgMCAxNiAxNicgZmlsbD0nbm9uZScgeG1sbnM9J2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJz4KPHBhdGggZD0nTTkuNjQ2MjIgMTMuMzUzN0w0LjY0NjIyIDguMzUzNzJDNC41OTk3MyA4LjMwNzI5IDQuNTYyODUgOC4yNTIxNCA0LjUzNzY5IDguMTkxNDRDNC41MTI1MiA4LjEzMDc0IDQuNDk5NTcgOC4wNjU2OCA0LjQ5OTU3IDcuOTk5OTdDNC40OTk1NyA3LjkzNDI3IDQuNTEyNTIgNy44NjkyIDQuNTM3NjkgNy44MDg1QzQuNTYyODUgNy43NDc4IDQuNTk5NzMgNy42OTI2NiA0LjY0NjIyIDcuNjQ2MjJMOS42NDYyMiAyLjY0NjIyQzkuNzQwMDQgMi41NTI0IDkuODY3MjggMi40OTk3IDkuOTk5OTcgMi40OTk3QzEwLjEzMjYgMi40OTk3IDEwLjI1OTkgMi41NTI0IDEwLjM1MzcgMi42NDYyMkMxMC40NDc1IDIuNzQwMDQgMTAuNTAwMiAyLjg2NzI5IDEwLjUwMDIgMi45OTk5N0MxMC41MDAyIDMuMTMyNjYgMTAuNDQ3NSAzLjI1OTkgMTAuMzUzNyAzLjM1MzcyTDUuNzA2ODQgNy45OTk5N0wxMC4zNTM3IDEyLjY0NjJDMTAuNDAwMiAxMi42OTI3IDEwLjQzNyAxMi43NDc4IDEwLjQ2MjIgMTIuODA4NUMxMC40ODczIDEyLjg2OTIgMTAuNTAwMiAxMi45MzQzIDEwLjUwMDIgMTNDMTAuNTAwMiAxMy4wNjU3IDEwLjQ4NzMgMTMuMTMwNyAxMC40NjIyIDEzLjE5MTRDMTAuNDM3IDEzLjI1MjEgMTAuNDAwMiAxMy4zMDczIDEwLjM1MzcgMTMuMzUzN0MxMC4zMDczIDEzLjQwMDIgMTAuMjUyMSAxMy40MzcgMTAuMTkxNCAxMy40NjIyQzEwLjEzMDcgMTMuNDg3MyAxMC4wNjU3IDEzLjUwMDMgOS45OTk5NyAxMy41MDAzQzkuOTM0MjcgMTMuNTAwMyA5Ljg2OTIxIDEzLjQ4NzMgOS44MDg1MiAxMy40NjIyQzkuNzQ3ODIgMTMuNDM3IDkuNjkyNjcgMTMuNDAwMiA5LjY0NjIyIDEzLjM1MzdaJyBmaWxsPSd3aGl0ZScvPgo8L3N2Zz4K" />`;
    prevButton.onmouseover = () => applyThemeStyles(prevButton, theme, 'calendar.navButton', 'hover');
    prevButton.onmouseout = () => applyThemeStyles(prevButton, theme, 'calendar.navButton', 'default');
    prevButton.onclick = () => {
      displayDate.setMonth(displayDate.getMonth() - 1);
      renderCalendarGrid();
    };

    const nextButton = document.createElement('button');
    applyThemeStyles(nextButton, theme, 'calendar.navButton');
    nextButton.innerHTML = `<img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMTYnIGhlaWdodD0nMTYnIHZpZXdCb3g9JzAgMCAxNiAxNicgZmlsbD0nbm9uZScgeG1sbnM9J2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJz4KPHBhdGggZD0nTTYuMzUzNzggMi42NDYyOEwxMS4zNTM4IDcuNjQ2MjhDMTEuNDAwMyA3LjY5MjcxIDExLjQzNzIgNy43NDc4NiAxMS40NjIzIDcuODA4NTZDMTEuNDg3NSA3Ljg2OTI2IDExLjUwMDQgNy45MzQzMiAxMS41MDA0IDguMDAwMDNDMTEuNTAwNCA4LjA2NTczIDExLjQ4NzUgOC4xMzA4IDExLjQ2MjMgOC4xOTE1QzExLjQzNzIgOC4yNTIyIDExLjQwMDMgOC4zMDczNCAxMS4zNTM4IDguMzUzNzhMNi4zNTM3OCAxMy4zNTM4QzYuMjU5OTYgMTMuNDQ3NiA2LjEzMjcyIDEzLjUwMDMgNi4wMDAwMyAxMy41MDAzQzUuODY3MzUgMTMuNTAwMyA1Ljc0MDEgMTMuNDQ3NiA1LjY0NjI4IDEzLjM1MzhDNS41NTI0NiAxMy4yNiA1LjQ5OTc2IDEzLjEzMjcgNS40OTk3NiAxM0M1LjQ5OTc2IDEyLjg2NzMgNS41NTI0NiAxMi43NDAxIDUuNjQ2MjggMTIuNjQ2M0wxMC4yOTMyIDguMDAwMDNMNS42NDYyOCAzLjM1Mzc4QzUuNTk5ODMgMy4zMDczMiA1LjU2Mjk4IDMuMjUyMTcgNS41Mzc4NCAzLjE5MTQ3QzUuNTEyNyAzLjEzMDc4IDUuNDk5NzYgMy4wNjU3MiA1LjQ5OTc2IDMuMDAwMDNDNS40OTk3NiAyLjkzNDMzIDUuNTEyNyAyLjg2OTI4IDUuNTM3ODQgMi44MDg1OEM1LjU2Mjk4IDIuNzQ3ODggNS41OTk4MyAyLjY5MjczIDUuNjQ2MjggMi42NDYyOEM1LjY5Mjc0IDIuNTk5ODIgNS43NDc4OSAyLjU2Mjk3IDUuODA4NTkgMi41Mzc4M0M1Ljg2OTI4IDIuNTEyNjkgNS45MzQzNCAyLjQ5OTc1IDYuMDAwMDMgMi40OTk3NUM2LjA2NTczIDIuNDk5NzUgNi4xMzA3OSAyLjUxMjY5IDYuMTkxNDggMi41Mzc4M0M2LjI1MjE4IDIuNTYyOTcgNi4zMDczMyAyLjU5OTgyIDYuMzUzNzggMi42NDYyOFonIGZpbGw9J3doaXRlJy8+Cjwvc3ZnPgo=" />`;
    nextButton.onmouseover = () => applyThemeStyles(nextButton, theme, 'calendar.navButton', 'hover');
    nextButton.onmouseout = () => applyThemeStyles(nextButton, theme, 'calendar.navButton', 'default');
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
      applyThemeStyles(weekRow, theme, 'calendar.week');
      weekDays.forEach(day => {
        const dayCell = document.createElement('div');
        dayCell.innerText = day;
        applyThemeStyles(dayCell, theme, 'calendar.weekDay');
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
        applyThemeStyles(week, theme, 'calendar.week');
        for (let j = 0; j < 7; j++) {
          const dayCell = document.createElement('div');
          applyThemeStyles(dayCell, theme, 'calendar.day');

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
              applyThemeStyles(dayCell, theme, 'calendar.day', 'disabled');
              dayCell.style.cursor = 'default';
            } else {
              const isSelected = selectedDate &&
                currentDate.getFullYear() === selectedDate.getFullYear() &&
                currentDate.getMonth() === selectedDate.getMonth() &&
                currentDate.getDate() === selectedDate.getDate();

              if (isSelected) {
                applyThemeStyles(dayCell, theme, 'calendar.day', 'today'); // Use 'today' style for selected
              }

              dayCell.onmouseover = () => {
                if (!isSelected) {
                  applyThemeStyles(dayCell, theme, 'calendar.day', 'hover');
                }
              };
              dayCell.onmouseout = () => {
                if (!isSelected) {
                  applyThemeStyles(dayCell, theme, 'calendar.day', 'default');
                  dayCell.style.backgroundColor = '';
                }
              };
              dayCell.onclick = () => {
                selectedDate = currentDate;
                setStoredDate(selectedDate);

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
                  applyThemeStyles(sinceButton, theme, 'panelSinceButton', 'active');
                }
                document.querySelectorAll('#smtm-presets-container button').forEach(btn => {
                  btn.classList.remove('active');
                  applyThemeStyles(btn, theme, 'button', 'default');
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
        removeElement(currentCalendar);
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

  window.SMTM = window.SMTM || {};
  window.SMTM.createCalendarPopup = createCalendarPopup;

})();
