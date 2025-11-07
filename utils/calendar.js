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
      return Promise.resolve();
    }
    return fetch(chrome.runtime.getURL('themes.json'))
      .then(response => response.json())
      .then(data => {
        themes = data;
      })
      .catch(error => {
        console.error('Show Me The Money: Error loading themes:', error);
      });
  }

  /**
   * Applies theme styles to an element
   * @param {HTMLElement} el - Element to style
   * @param {Object} theme - Theme object
   * @param {string} themeKey - Key in theme object (e.g., 'calendar.container')
   * @param {string} state - State (e.g., 'default', 'hover')
   */
  function applyThemeStyles(el, theme, themeKey, state = "default") {
    const keys = themeKey.split('.');
    let style = theme;
    for (const key of keys) {
      style = style?.[key];
    }
    style = style?.[state];

    if (!style || !el) return;

    for (const [prop, value] of Object.entries(style)) {
      if (value === null || value === undefined) continue;

      const cssProp = prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
      let finalValue = value;

      const pixelProps = ['borderRadius', 'fontSize', 'height', 'width', 'top', 'left', 'right', 'bottom', 'padding', 'margin', 'gap'];
      if (pixelProps.includes(prop) && typeof value === 'number') {
        finalValue = `${value}px`;
      }

      el.style.setProperty(cssProp, finalValue, 'important');
    }
  }

  /**
   * Creates and displays the calendar popup.
   * @param {HTMLElement} anchorElement - The element to position the calendar relative to.
   * @param {string} themeName - The name of the theme to use.
   */
  async function createCalendarPopup(anchorElement, themeName = 'cursor') {
    if (currentCalendar) {
      currentCalendar.remove();
      currentCalendar = null;
      return;
    }

    await loadThemes();
    const theme = themes[themeName];
    if (!theme || !theme.calendar) {
      console.error(`Show Me The Money: Calendar theme "${themeName}" not found.`);
      return;
    }

    const calendar = document.createElement('div');
    calendar.id = 'smtm-calendar-popup';
    applyThemeStyles(calendar, theme, 'calendar.container');
    Object.assign(calendar.style, {
      position: 'absolute',
      zIndex: '10000'
    });

    // --- Calendar Header ---
    const header = document.createElement('div');
    applyThemeStyles(header, theme, 'calendar.title');

    const monthDisplay = document.createElement('div');
    applyThemeStyles(monthDisplay, theme, 'calendar.month');
    const monthText = document.createElement('span');
    monthText.innerText = 'October 2025';
    applyThemeStyles(monthText, theme, 'calendar.monthText');
    monthDisplay.appendChild(monthText);

    const navButtons = document.createElement('div');
    applyThemeStyles(navButtons, theme, 'calendar.navButtons');

    const prevButton = document.createElement('button');
    applyThemeStyles(prevButton, theme, 'calendar.navButton');
    prevButton.innerHTML = `<img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMTYnIGhlaWdodD0nMTYnIHZpZXdCb3g9JzAgMCAxNiAxNicgZmlsbD0nbm9uZScgeG1sbnM9J2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJz4KPHBhdGggZD0nTTkuNjQ2MjIgMTMuMzUzN0w0LjY0NjIyIDguMzUzNzJDNC41OTk3MyA4LjMwNzI5IDQuNTYyODUgOC4yNTIxNCA0LjUzNzY5IDguMTkxNDRDNC41MTI1MiA4LjEzMDc0IDQuNDk5NTcgOC4wNjU2OCA0LjQ5OTU3IDcuOTk5OTdDNC40OTk1NyA3LjkzNDI3IDQuNTEyNTIgNy44NjkyIDQuNTM3NjkgNy44MDg1QzQuNTYyODUgNy43NDc4IDQuNTk5NzMgNy42OTI2NiA0LjY0NjIyIDcuNjQ2MjJMOS42NDYyMiAyLjY0NjIyQzkuNzQwMDQgMi41NTI0IDkuODY3MjggMi40OTk3IDkuOTk5OTcgMi40OTk3QzEwLjEzMjYgMi40OTk3IDEwLjI1OTkgMi41NTI0IDEwLjM1MzcgMi42NDYyMkMxMC40NDc1IDIuNzQwMDQgMTAuNTAwMiAyLjg2NzI5IDEwLjUwMDIgMi45OTk5N0MxMC41MDAyIDMuMTMyNjYgMTAuNDQ3NSAzLjI1OTkgMTAuMzUzNyAzLjM1MzcyTDUuNzA2ODQgNy45OTk5N0wxMC4zNTM3IDEyLjY0NjJDMTAuNDAwMiAxMi42OTI3IDEwLjQzNyAxMi43NDc4IDEwLjQ2MjIgMTIuODA4NUMxMC40ODczIDEyLjg2OTIgMTAuNTAwMiAxMi45MzQzIDEwLjUwMDIgMTNDMTAuNTAwMiAxMy4wNjU3IDEwLjQ4NzMgMTMuMTMwNyAxMC40NjIyIDEzLjE5MTRDMTAuNDM3IDEzLjI1MjEgMTAuNDAwMiAxMy4zMDczIDEwLjM1MzcgMTMuMzUzN0MxMC4zMDczIDEzLjQwMDIgMTAuMjUyMSAxMy40MzcgMTAuMTkxNCAxMy40NjIyQzEwLjEzMDcgMTMuNDg3MyAxMC4wNjU3IDEzLjUwMDMgOS45OTk5NyAxMy41MDAzQzkuOTM0MjcgMTMuNTAwMyA5Ljg2OTIxIDEzLjQ4NzMgOS44MDg1MiAxMy40NjIyQzkuNzQ3ODIgMTMuNDM3IDkuNjkyNjcgMTMuNDAwMiA5LjY0NjIyIDEzLjM1MzdaJyBmaWxsPSd3aGl0ZScvPgo8L3N2Zz4K" />`;
    prevButton.onmouseover = () => applyThemeStyles(prevButton, theme, 'calendar.navButton', 'hover');
    prevButton.onmouseout = () => applyThemeStyles(prevButton, theme, 'calendar.navButton', 'default');

    const nextButton = document.createElement('button');
    applyThemeStyles(nextButton, theme, 'calendar.navButton');
    nextButton.innerHTML = `<img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMTYnIGhlaWdodD0nMTYnIHZpZXdCb3g9JzAgMCAxNiAxNicgZmlsbD0nbm9uZScgeG1sbnM9J2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJz4KPHBhdGggZD0nTTYuMzUzNzggMi42NDYyOEwxMS4zNTM4IDcuNjQ2MjhDMTEuNDAwMyA3LjY5MjcxIDExLjQzNzIgNy43NDc4NiAxMS40NjIzIDcuODA4NTZDMTEuNDg3NSA3Ljg2OTI2IDExLjUwMDQgNy45MzQzMiAxMS41MDA0IDguMDAwMDNDMTEuNTAwNCA4LjA2NTczIDExLjQ4NzUgOC4xMzA4IDExLjQ2MjMgOC4xOTE1QzExLjQzNzIgOC4yNTIyIDExLjQwMDMgOC4zMDczNCAxMS4zNTM4IDguMzUzNzhMNi4zNTM3OCAxMy4zNTM4QzYuMjU5OTYgMTMuNDQ3NiA2LjEzMjcyIDEzLjUwMDMgNi4wMDAwMyAxMy41MDAzQzUuODY3MzUgMTMuNTAwMyA1Ljc0MDEgMTMuNDQ3NiA1LjY0NjI4IDEzLjM1MzhDNS41NTI0NiAxMy4yNiA1LjQ5OTc2IDEzLjEzMjcgNS40OTk3NiAxM0M1LjQ5OTc2IDEyLjg2NzMgNS41NTI0NiAxMi43NDAxIDUuNjQ2MjggMTIuNjQ2M0wxMC4yOTMyIDguMDAwMDNMNS42NDYyOCAzLjM1Mzc4QzUuNTk5ODMgMy4zMDczMiA1LjU2Mjk4IDMuMjUyMTcgNS41Mzc4NCAzLjE5MTQ3QzUuNTEyNyAzLjEzMDc4IDUuNDk5NzYgMy4wNjU3MiA1LjQ5OTc2IDMuMDAwMDNDNS40OTk3NiAyLjkzNDMzIDUuNTEyNyAyLjg2OTI4IDUuNTM3ODQgMi44MDg1OEM1LjU2Mjk4IDIuNzQ3ODggNS41OTk4MyAyLjY5MjczIDUuNjQ2MjggMi42NDYyOEM1LjY5Mjc0IDIuNTk5ODIgNS43NDc4OSAyLjU2Mjk3IDUuODA4NTkgMi41Mzc4M0M1Ljg2OTI4IDIuNTEyNjkgNS45MzQzNCAyLjQ5OTc1IDYuMDAwMDMgMi40OTk3NUM2LjA2NTczIDIuNDk5NzUgNi4xMzA3OSAyLjUxMjY5IDYuMTkxNDggMi41Mzc4M0M2LjI1MjE4IDIuNTYyOTcgNi4zMDczMyAyLjU5OTgyIDYuMzUzNzggMi42NDYyOFonIGZpbGw9J3doaXRlJy8+Cjwvc3ZnPgo=" />`;
    nextButton.onmouseover = () => applyThemeStyles(nextButton, theme, 'calendar.navButton', 'hover');
    nextButton.onmouseout = () => applyThemeStyles(nextButton, theme, 'calendar.navButton', 'default');

    navButtons.appendChild(prevButton);
    navButtons.appendChild(nextButton);
    header.appendChild(monthDisplay);
    header.appendChild(navButtons);
    calendar.appendChild(header);

    // --- Calendar Grid ---
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

    for (let i = 0; i < 5; i++) {
      const week = document.createElement('div');
      applyThemeStyles(week, theme, 'calendar.week');
      for (let j = 0; j < 7; j++) {
        const day = document.createElement('div');
        const dayNumber = i * 7 + j + 1;
        day.innerText = dayNumber > 31 ? '' : dayNumber;
        applyThemeStyles(day, theme, 'calendar.day');
        const isToday = dayNumber === 10;

        if (isToday) {
          applyThemeStyles(day, theme, 'calendar.day', 'today');
        }

        day.onmouseover = () => {
          if (!isToday) {
            applyThemeStyles(day, theme, 'calendar.day', 'hover');
          }
        };
        day.onmouseout = () => {
          if (!isToday) {
            // Re-apply default styles which don't have a background color,
            // and explicitly remove the background color property.
            applyThemeStyles(day, theme, 'calendar.day', 'default');
            day.style.backgroundColor = '';
          }
        };
        day.onclick = () => closeCalendar();
        week.appendChild(day);
      }
      grid.appendChild(week);
    }
    calendar.appendChild(grid);

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
  }

  window.SMTM = window.SMTM || {};
  window.SMTM.createCalendarPopup = createCalendarPopup;

})();
