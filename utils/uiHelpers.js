// utils/uiHelpers.js

let themes = {};

/**
 * Waits for an element to appear in the DOM.
 * @param {string} selector The CSS selector of the element.
 * @param {number} timeout The timeout in milliseconds.
 * @returns {Promise<HTMLElement>} A promise that resolves with the element or rejects on timeout.
 */
function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element) {
            resolve(element);
            return;
        }

        const observer = new MutationObserver(mutations => {
            const targetElement = document.querySelector(selector);
            if (targetElement) {
                observer.disconnect();
                resolve(targetElement);
            }
        });

        const timeoutId = setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Show Me The Money: Timed out waiting for element: ${selector}`));
        }, timeout);

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

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
 * Positions the panel initially next to the target element.
 * @param {HTMLElement} panel The panel element.
 */
async function positionPanelInitially(panel) {
    try {
        const targetElement = await waitForElement('button[aria-label="User menu"]');
        const targetRect = targetElement.getBoundingClientRect();
        panel.style.position = 'absolute'; // Use absolute positioning

        // Defer calculation to ensure panel has rendered and has dimensions
        setTimeout(() => {
            const panelRect = panel.getBoundingClientRect();
            const top = targetRect.top + (targetRect.height / 2) - (panelRect.height / 2) + window.scrollY;
            const left = targetRect.left - panelRect.width - 10 + window.scrollX; // 10px margin

            panel.style.top = `${top}px`;
            panel.style.left = `${left}px`;

            savePanelPosition({ top: panel.style.top, left: panel.style.left });
        }, 0);
    } catch (error) {
        console.warn(`Show Me The Money: ${error.message}. Using fallback positioning.`);
        panel.style.position = 'fixed';
        panel.style.top = '20px';
        panel.style.left = '20px';
        savePanelPosition({ top: panel.style.top, left: panel.style.left });
    }
}

/**
 * Creates the main floating panel.
 * @param {string} themeName The name of the theme to use.
 * @returns {HTMLElement} The created panel element.
 */
async function createPanel(themeName = 'dark') {
    if (!themes[themeName]) {
        console.error(`Show Me The Money: Theme "${themeName}" not found.`);
        return null;
    }
    const theme = themes[themeName];
    const common = theme.common;

    const panel = document.createElement('div');
    panel.id = 'show-me-the-money-panel';

    // Apply panel styles from theme
    Object.assign(panel.style, {
        backgroundColor: theme.panel.bg,
        border: theme.panel.border,
        borderRadius: common.radius,
        padding: theme.panel.padding,
        color: theme.panel.textColor,
        fontFamily: common.fontFamily,
        fontSize: common.fontSize,
        display: 'flex',
        alignItems: 'center',
        gap: common.spacing,
        zIndex: '9999',
        height: '36px' // Set a fixed height to match the toolbar
    });

    const dragHandle = createDragHandle(theme);
    const datePicker = createDatePicker(themeName);
    const presetsContainer = createPresetButtons(theme);
    const totalDisplay = createTotalDisplay(theme);

    panel.appendChild(dragHandle);
    panel.appendChild(datePicker);
    panel.appendChild(presetsContainer);
    panel.appendChild(totalDisplay);

    makeDraggable(panel, dragHandle);

    document.body.appendChild(panel);

    // Positioning logic remains the same
    if (!restorePanelPosition(panel)) {
        await positionPanelInitially(panel);
    }

    return panel;
}

/**
 * Restores the panel's position from localStorage.
 * @param {HTMLElement} panel The panel element.
 */
function restorePanelPosition(panel) {
  const savedPosition = getPanelPosition();
  if (savedPosition && savedPosition.top && savedPosition.left) {
    panel.style.position = 'absolute'; // Position relative to the body
    panel.style.top = savedPosition.top;
    panel.style.left = savedPosition.left;
    return true; // Position was restored
  }
  return false; // No saved position
}

function createDragHandle(theme) {
    const handle = document.createElement('div');
    handle.id = 'smtm-drag-handle';
    const handleTheme = theme.dragHandle;

    Object.assign(handle.style, {
        ...handleTheme.default,
        cursor: 'move',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '0 8px',
        borderRadius: `${handleTheme.default.radius}px`
    });

    const dotsContainer = document.createElement('div');
    Object.assign(dotsContainer.style, {
        display: 'flex',
        flexDirection: 'column',
        gap: '3px'
    });

    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        Object.assign(dot.style, {
            width: '3px',
            height: '3px',
            borderRadius: '50%',
            backgroundColor: handleTheme.default.dotColor
        });
        dotsContainer.appendChild(dot);
    }
    handle.appendChild(dotsContainer);

    handle.onmouseover = () => {
        handle.style.backgroundColor = handleTheme.hover.bg;
        dotsContainer.childNodes.forEach(dot => {
            dot.style.backgroundColor = handleTheme.hover.dotColor;
        });
    };
    handle.onmouseout = () => {
        handle.style.backgroundColor = handleTheme.default.bg;
        dotsContainer.childNodes.forEach(dot => {
            dot.style.backgroundColor = handleTheme.default.dotColor;
        });
    };

    return handle;
}


function createDatePicker(themeName) {
    const theme = themes[themeName];
    const container = document.createElement('div');
    container.style.position = 'relative';

    const displayButton = document.createElement('button');
    const today = new Date();
    const priorDate = new Date(new Date().setDate(today.getDate() - 30));

    displayButton.innerHTML = `
        <span id="smtm-date-range-display" style="white-space: nowrap;">${formatDateRange(priorDate, today)}</span>&nbsp;▼
    `;

    Object.assign(displayButton.style, {
        ...theme.button.default,
        border: theme.datePicker.border,
        padding: '8px 10px',
        borderRadius: theme.common.radius,
        fontFamily: theme.common.fontFamily,
        fontSize: theme.common.fontSize,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        height: '100%'
    });

    // Hover styles
    displayButton.onmouseover = () => {
        displayButton.style.backgroundColor = theme.datePicker.hover.bg;
        displayButton.style.border = theme.datePicker.hover.border;
    };
    displayButton.onmouseout = () => {
        displayButton.style.backgroundColor = theme.datePicker.bg;
        displayButton.style.border = theme.datePicker.border;
    };

    const calendarTheme = theme.datePicker.calendar;
    const calendarUI = document.createElement('div');
    Object.assign(calendarUI.style, {
        display: 'none',
        position: 'absolute',
        top: '120%',
        left: '0',
        backgroundColor: calendarTheme.bg,
        border: calendarTheme.border,
        borderRadius: theme.common.radius,
        padding: '10px',
        zIndex: '10000',
        flexDirection: 'column',
        gap: '8px'
    });

    const inputStyles = {
        backgroundColor: calendarTheme.inputBg,
        color: calendarTheme.inputText,
        border: `1px solid ${theme.datePicker.border}`,
        borderRadius: theme.common.radius,
        padding: '5px'
    };

    const startDateInput = document.createElement('input');
    startDateInput.type = 'date';
    Object.assign(startDateInput.style, inputStyles);
    calendarUI.appendChild(startDateInput);

    const endDateInput = document.createElement('input');
    endDateInput.type = 'date';
    Object.assign(endDateInput.style, inputStyles);
    calendarUI.appendChild(endDateInput);

    const applyButton = document.createElement('button');
    applyButton.innerText = 'Apply';
    Object.assign(applyButton.style, {
        ...theme.button.default,
        backgroundColor: calendarTheme.applyButtonBg,
        color: calendarTheme.applyButtonText,
        border: 'none',
        borderRadius: theme.common.radius,
        padding: '5px 10px',
        cursor: 'pointer'
    });
    applyButton.onclick = () => {
        const startDate = new Date(startDateInput.value);
        const endDate = new Date(endDateInput.value);
        updateTotalDisplay(startDate, endDate);
        updateDateRangeDisplay(startDate, endDate);
        calendarUI.style.display = 'none';
    };
    calendarUI.appendChild(applyButton);

    displayButton.onclick = () => {
        calendarUI.style.display = calendarUI.style.display === 'none' ? 'flex' : 'none';
    };

    container.appendChild(displayButton);
    container.appendChild(calendarUI);

    return container;
}

function createPresetButtons(theme) {
    const container = document.createElement('div');
    container.id = 'smtm-presets-container';
    container.style.display = 'flex';
    container.style.gap = theme.common.spacing;

    const presets = ['1d', '7d', '30d'];

    presets.forEach(preset => {
        const button = document.createElement('button');
        button.innerText = preset;
        button.dataset.preset = preset;
        Object.assign(button.style, {
            ...theme.button.default,
            borderRadius: theme.common.radius,
            fontFamily: theme.common.fontFamily,
            fontSize: theme.common.fontSize,
            cursor: 'pointer',
            border: 'none'
        });

        button.onmouseover = () => {
             if (!button.classList.contains('active')) button.style.backgroundColor = theme.button.hover.bg;
        };
        button.onmouseout = () => {
            if (!button.classList.contains('active')) button.style.backgroundColor = theme.button.default.bg;
        };

        button.onclick = () => {
            document.querySelectorAll('#smtm-presets-container button').forEach(btn => {
                btn.classList.remove('active');
                Object.assign(btn.style, theme.button.default);
            });
            button.classList.add('active');
            Object.assign(button.style, theme.button.active);

            const days = parseInt(preset.replace('d', ''));
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - (days - 1));
            updateTotalDisplay(startDate, endDate);
            updateDateRangeDisplay(startDate, endDate);
        };

        container.appendChild(button);
    });

    // Set 30d as active by default
    setTimeout(() => {
        const defaultButton = container.querySelector('button[data-preset="30d"]');
        if (defaultButton) {
            defaultButton.click();
        }
    }, 0);


    return container;
}

function formatDateRange(startDate, endDate) {
    const options = { month: 'short', day: 'numeric' };
    return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
}

function updateDateRangeDisplay(startDate, endDate) {
    const displayElement = document.getElementById('smtm-date-range-display');
    if (displayElement) {
        displayElement.innerText = formatDateRange(startDate, endDate);
    }
}

function createTotalDisplay(theme) {
    const container = document.createElement('div');
    container.id = 'smtm-total-display-container';
    const totalBlockTheme = theme.totalBlock.default;

    Object.assign(container.style, {
        backgroundColor: totalBlockTheme.bg,
        borderRadius: `${totalBlockTheme.radius}px`,
        padding: totalBlockTheme.padding,
        display: 'flex',
        alignItems: 'center',
        gap: '5px'
    });

    const label = document.createElement('span');
    label.innerText = 'Total:';
    label.style.color = totalBlockTheme.labelColor;

    const value = document.createElement('strong');
    value.id = 'smtm-total-value';
    value.innerText = '$0.00';
    value.style.color = totalBlockTheme.text;
    value.style.fontWeight = 'bold';

    container.appendChild(label);
    container.appendChild(value);

    return container;
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
    const totalValue = document.getElementById('smtm-total-value');
    if (totalValue) {
        totalValue.innerText = `${currencySymbol}${total.toFixed(2)}`;
    }
}


/**
 * Shows or hides the "missing data" label.
 * @param {string} themeName The name of the theme to use.
 * @param {Array<string>} missingDays An array of missing day strings.
 */
function createTooltip(element, text, theme) {
    let tooltip = element.querySelector('.smtm-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'smtm-tooltip';
        element.appendChild(tooltip);
    }

    tooltip.innerText = text;

    Object.assign(tooltip.style, {
        ...theme.tooltip.default,
        position: 'absolute',
        top: '125%',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '5px 8px',
        borderRadius: theme.common.radius,
        zIndex: '10001',
        display: 'none',
        width: 'max-content',
        pointerEvents: 'none'
    });

    element.style.position = 'relative';

    element.onmouseover = () => { tooltip.style.display = 'block'; };
    element.onmouseout = () => { tooltip.style.display = 'none'; };
}


function toggleMissingDataLabel(themeName, missingDays) {
    const panel = document.getElementById('show-me-the-money-panel');
    if (!panel) return;

    let container = document.getElementById('smtm-missing-data-container');

    if (missingDays.length > 0) {
        if (!themes[themeName]) {
            console.error(`Show Me The Money: Theme "${themeName}" not found.`);
            return;
        }
        const theme = themes[themeName];

        if (!container) {
            container = document.createElement('div');
            container.id = 'smtm-missing-data-container';
            document.body.appendChild(container);
        }

        const panelRect = panel.getBoundingClientRect();
        Object.assign(container.style, {
            ...theme.missingDataContainer.default,
            position: 'absolute',
            top: `${panelRect.bottom + window.scrollY}px`,
            left: `${panelRect.left + window.scrollX}px`,
            width: `${panelRect.width}px`,
            zIndex: '9998',
            pointerEvents: 'none'
        });

        let label = container.querySelector('#smtm-missing-data-label');
        if (!label) {
            label = document.createElement('div');
            label.id = 'smtm-missing-data-label';
            container.appendChild(label);
        }

        Object.assign(label.style, {
            ...theme.missingDataLabel.default,
            pointerEvents: 'all'
        });

        label.innerText = theme.labels.missingData.text;

        createTooltip(label, `Missing data for: ${missingDays.join(', ')}`, theme);

    } else if (container) {
        container.remove();
    }
}
