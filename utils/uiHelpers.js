// utils/uiHelpers.js

let themes = {};

/**
 * Fetches and stores themes from themes.json.
 * @returns {Promise<void>} A promise that resolves when themes are loaded.
 */
function loadThemes() {
  return fetch(chrome.runtime.getURL('themes.json'))
    .then(response => response.json())
    .then(data => {
      themes = data;
    })
    .catch(error => console.error('Show Me The Money: Error loading themes:', error));
}


/**
 * Creates the main floating panel.
 * @param {string} themeName The name of the theme to use.
 * @returns {HTMLElement} The created panel element.
 */
function createPanel(themeName = 'dark') {
  if (!themes[themeName]) {
    console.error(`Show Me The Money: Theme "${themeName}" not found.`);
    return null;
  }
  const theme = themes[themeName].panel.default;
  const common = themes[themeName].common;

  const panel = document.createElement('div');
  panel.id = 'show-me-the-money-panel';
  panel.style.position = 'fixed';
  panel.style.top = '20px';
  panel.style.left = '20px';
  panel.style.backgroundColor = theme.bg;
  panel.style.border = `1px solid ${theme.border}`;
  panel.style.borderRadius = common.radius;
  panel.style.padding = common.padding;
  panel.style.color = theme.text;
  panel.style.zIndex = '9999';
  panel.style.display = 'flex';
  panel.style.alignItems = 'center';
  panel.style.gap = '10px';
  panel.style.flexDirection = 'column'; // Allow vertical stacking

  const mainRow = document.createElement('div');
  mainRow.style.display = 'flex';
  mainRow.style.alignItems = 'center';
  mainRow.style.gap = '10px';
  panel.appendChild(mainRow);

  // Drag Handle
  const dragHandle = document.createElement('div');
  dragHandle.style.cursor = 'move';
  dragHandle.style.width = '20px';
  dragHandle.style.height = '20px';
  dragHandle.innerHTML = `<img src="${chrome.runtime.getURL('assets/icons/drag.svg')}" style="width:100%; height:100%;">`;
  mainRow.appendChild(dragHandle);

  // Calendar
  createCalendar(mainRow, themeName);

  // Total Display
  const totalDisplay = document.createElement('div');
  totalDisplay.id = 'smtm-total-display';
  totalDisplay.innerText = 'Total: $0.00';
  mainRow.appendChild(totalDisplay);

  makeDraggable(panel, dragHandle);

  document.body.appendChild(panel);
  return panel;
}

/**
 * Restores the panel's position from localStorage.
 * @param {HTMLElement} panel The panel element.
 */
function restorePanelPosition(panel) {
  const savedPosition = getPanelPosition();
  if (savedPosition) {
    panel.style.top = savedPosition.top;
    panel.style.left = savedPosition.left;
    return true; // Position was restored
  }
  return false; // No saved position
}

/**
 * Creates a simplified calendar component.
 * @param {HTMLElement} parent The parent element to append the calendar to.
 * @param {string} themeName The name of the theme to use.
 */
function createCalendar(parent, themeName) {
  const container = document.createElement('div');

  const button = document.createElement('button');
  button.innerText = 'Select Date Range';
  container.appendChild(button);

  const calendarUI = document.createElement('div');
  calendarUI.style.display = 'none'; // Initially hidden
  calendarUI.style.marginTop = '10px';

  const startDateInput = document.createElement('input');
  startDateInput.type = 'date';
  calendarUI.appendChild(startDateInput);

  const endDateInput = document.createElement('input');
  endDateInput.type = 'date';
  calendarUI.appendChild(endDateInput);

  const applyButton = document.createElement('button');
  applyButton.innerText = 'Apply';
  applyButton.onclick = () => {
    updateTotalDisplay(new Date(startDateInput.value), new Date(endDateInput.value));
    calendarUI.style.display = 'none';
  };
  calendarUI.appendChild(applyButton);

  const cancelButton = document.createElement('button');
  cancelButton.innerText = 'Cancel';
  cancelButton.onclick = () => {
    calendarUI.style.display = 'none';
  };
  calendarUI.appendChild(cancelButton);

  button.onclick = () => {
    calendarUI.style.display = calendarUI.style.display === 'none' ? 'block' : 'none';
  };

  container.appendChild(calendarUI);
  parent.appendChild(container);
}

/**
 * Makes an element draggable.
 * @param {HTMLElement} element The element to make draggable.
 * @param {HTMLElement} handle The handle to drag the element by.
 */
function makeDraggable(element, handle) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  handle.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
    savePanelPosition({ top: element.style.top, left: element.style.left });
  }
}

/**
 * Updates the total amount displayed in the panel.
 * @param {number} total The total amount to display.
 * @param {string} currencySymbol The currency symbol to use (e.g., '$').
 */
function updateTotal(total, currencySymbol = '') {
  const totalDisplay = document.getElementById('smtm-total-display');
  if (totalDisplay) {
    totalDisplay.innerText = `Total: ${currencySymbol}${total.toFixed(2)}`;
  }
}

/**
 * Shows a "missing data" label with a tooltip.
 * @param {string} themeName The name of the theme to use.
 * @param {Array<string>} missingDays An array of missing day strings.
 */
function showMissingDataLabel(themeName, missingDays) {
    if (!themes[themeName]) {
    console.error(`Show Me The Money: Theme "${themeName}" not found.`);
    return;
  }
  const theme = themes[themeName].labels.missingData;
  const panel = document.getElementById('show-me-the-money-panel');

  let label = document.getElementById('smtm-missing-data-label');
  if (!label) {
    label = document.createElement('div');
    label.id = 'smtm-missing-data-label';
    label.style.color = theme.color;
    label.style.fontSize = theme.fontSize;
    label.innerText = theme.text;
    label.style.position = 'relative'; // Needed for tooltip positioning
    panel.appendChild(label);
  }

  // Tooltip
  const tooltipTheme = themes[themeName].tooltip.default;
  const tooltip = document.createElement('div');
  tooltip.innerText = `Missing data for: ${missingDays.join(', ')}`;
  tooltip.style.position = 'absolute';
  tooltip.style.visibility = 'hidden';
  tooltip.style.backgroundColor = tooltipTheme.bg;
  tooltip.style.color = tooltipTheme.text;
  tooltip.style.padding = '5px';
  tooltip.style.borderRadius = '4px';
  tooltip.style.bottom = '125%'; // Position above the label
  tooltip.style.left = '50%';
  tooltip.style.transform = 'translateX(-50%)';
  tooltip.style.whiteSpace = 'nowrap';

  label.onmouseover = () => { tooltip.style.visibility = 'visible'; };
  label.onmouseout = () => { tooltip.style.visibility = 'hidden'; };

  label.appendChild(tooltip);
}
