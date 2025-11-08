/**
 * @fileoverview This file contains the logic for creating and managing the main UI panel, including buttons, tooltips, and drag-and-drop functionality.
 */


const DEBUG_STYLES = true;

/**
 * Logs the computed styles of an element to the console.
 * @param {HTMLElement} el The element to log.
 * @param {string} name The name of the element.
 */
function logComputedStyles(el, name) {
    if (!DEBUG_STYLES || !el) return;
    requestAnimationFrame(() => {
        try {
            const c = getComputedStyle(el);
            const summary = {
                fontSize: c.fontSize,
                fontFamily: c.fontFamily,
                color: c.color,
                background: c.backgroundColor,
                borderRadius: c.borderRadius,
                padding: c.padding,
                margin: c.margin
            };
            console.groupCollapsed(`🧩 ${name} computed styles`);
            console.table(summary);
            console.groupEnd();
        } catch (err) {
            console.warn("logComputedStyles error:", err);
        }
    });
}

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
 * @returns {Promise<HTMLElement>} The created panel element.
 */
window.SMTM.createPanel = async function(themeName = 'dark') {
    // Initialize state for range persistence
    if (!window.SMTM.state) window.SMTM.state = {};
    if (!window.SMTM.state.range) window.SMTM.state.range = '1d';

    const theme = getTheme(themeName);
    if (!theme) {
        console.error(`Show Me The Money: Theme "${themeName}" not found.`);
        return null;
    }

    // Ensure config is available
    const panelConfig = window.SMTM.config?.bar || {};

    const panel = document.createElement('div');
    panel.id = 'show-me-the-money-panel';
    applyThemeStyles(panel, themeName, 'base');
    applyThemeStyles(panel, themeName, 'panel');

    Object.assign(panel.style, {
        display: 'flex',
        alignItems: 'center',
        gap: theme.common.spacing,
        zIndex: '9999'
    });

    const dragHandle = createDragHandle(themeName);
    panel.appendChild(dragHandle);

    if (panelConfig.sinceButton) {
        const sinceButton = createSinceButton(themeName);
        panel.appendChild(sinceButton);
    }

    const presetsContainer = createPresetButtons(themeName, panelConfig);
    if (presetsContainer) {
        panel.appendChild(presetsContainer);
    }

    if (panelConfig.total) {
        const totalDisplay = createTotalDisplay(themeName);
        panel.appendChild(totalDisplay);
    }

    makeDraggable(panel, dragHandle);

    document.body.appendChild(panel);

    createSharedTooltip(themeName); // Create the single, shared tooltip
    toggleInfoTooltip(themeName, false); // Create the info tooltip container, initially hidden

    if (DEBUG_STYLES) logComputedStyles(panel, "panel (attached)");

    // Positioning logic remains the same
    if (!restorePanelPosition(panel)) {
        await positionPanelInitially(panel);
    }

    return panel;
}

/**
 * Creates the "Since" button.
 * @param {string} themeName The name of the theme to use.
 * @returns {HTMLElement} The created button element.
 */
function createSinceButton(themeName) {
    const button = document.createElement('button');
    button.className = 'smtm-since-button';
    button.innerText = 'Since: 4 Nov';
    applyThemeStyles(button, themeName, 'panelSinceButton');
    button.style.cursor = 'pointer';
    button.style.border = 'none';
    button.style.whiteSpace = 'nowrap';
    button.style.display = 'inline-flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';

    button.onmouseover = () => {
        applyThemeStyles(button, themeName, 'panelSinceButton', 'hover');
    };
    button.onmouseout = () => {
        applyThemeStyles(button, themeName, 'panelSinceButton', 'default');
    };

    button.onclick = (event) => {
        event.stopPropagation();
        if (window.SMTM && typeof window.SMTM.createCalendarPopup === 'function') {
            const theme = window.location.hostname.includes('cursor.com') ? 'cursor' : 'dark';
            window.SMTM.createCalendarPopup(button, theme);
        }
    };

    return button;
}

/**
 * Restores the panel's position from localStorage.
 * @param {HTMLElement} panel The panel element.
 * @returns {boolean} True if the position was restored, false otherwise.
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

/**
 * Creates the drag handle for the panel.
 * @param {string} themeName The name of the theme to use.
 * @returns {HTMLElement} The created drag handle element.
 */
function createDragHandle(themeName) {
    const handle = document.createElement('div');
    handle.id = 'smtm-drag-handle';
    applyThemeStyles(handle, themeName, 'dragHandle');
    Object.assign(handle.style, {
        cursor: 'move',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    });

    handle.innerHTML = `<svg width="6" height="16" viewBox="0 0 6 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="3" cy="3" r="1" fill="#5D5D5D"/>
<circle cx="3" cy="8" r="1" fill="#5D5D5D"/>
<circle cx="3" cy="13" r="1" fill="#5D5D5D"/>
</svg>`;

    handle.onmouseover = () => {
        applyThemeStyles(handle, themeName, 'dragHandle', 'hover');
    };
    handle.onmouseout = () => {
        applyThemeStyles(handle, themeName, 'dragHandle', 'default');
    };

    return handle;
}

/**
 * Creates the preset buttons for the panel.
 * @param {string} themeName The name of the theme to use.
 * @param {object} panelConfig The panel configuration object.
 * @returns {HTMLElement|null} The created container element or null if no buttons are enabled.
 */
function createPresetButtons(themeName, panelConfig) {
    const presets = [];
    if (panelConfig['1dButton']) presets.push('1d');
    if (panelConfig['7dButton']) presets.push('7d');
    if (panelConfig['30dButton']) presets.push('30d');

    if (presets.length === 0) {
        return null; // Don't create the container if no buttons are enabled
    }

    const container = document.createElement('div');
    container.id = 'smtm-presets-container';
    const theme = getTheme(themeName);
    Object.assign(container.style, {
        display: 'flex',
        gap: theme.common.spacing
    });

    presets.forEach(preset => {
        const button = document.createElement('button');
        button.innerText = preset;
        button.dataset.preset = preset;
        applyThemeStyles(button, themeName, 'button');
        button.style.cursor = 'pointer';
        button.style.border = 'none';

        // --- Tooltip Logic ---
        button.addEventListener('mouseenter', (e) => {
            const tooltip = document.getElementById('smtm-shared-tooltip');
            if (!button.classList.contains('active')) {
                applyThemeStyles(button, themeName, 'button', 'hover');
            }
            if (tooltip && typeof formatTooltipDate === 'function') {
                tooltip.innerText = formatTooltipDate(preset);
                tooltip.style.display = 'block';
                requestAnimationFrame(() => {
                    tooltip.style.opacity = '1';
                });
            }
        });

        button.addEventListener('mouseleave', () => {
            const tooltip = document.getElementById('smtm-shared-tooltip');
            if (!button.classList.contains('active')) {
                applyThemeStyles(button, themeName, 'button', 'default');
            }
            if (tooltip) {
                tooltip.style.opacity = '0';
                // Hide after transition
                setTimeout(() => {
                    if (tooltip.style.opacity === '0') {
                        tooltip.style.display = 'none';
                    }
                }, 200);
            }
        });

        button.addEventListener('mousemove', (e) => {
            const tooltip = document.getElementById('smtm-shared-tooltip');
            if (!tooltip) return;

            const offsetX = 15;
            const offsetY = 15;
            const {
                clientX: x,
                clientY: y
            } = e;
            const {
                innerWidth,
                innerHeight
            } = window;
            const {
                offsetWidth: tooltipWidth,
                offsetHeight: tooltipHeight
            } = tooltip;

            let top = y + offsetY;
            let left = x + offsetX;

            // Flip if near viewport edges
            if (left + tooltipWidth > innerWidth) {
                left = x - tooltipWidth - offsetX;
            }
            if (top + tooltipHeight > innerHeight) {
                top = y - tooltipHeight - offsetY;
            }

            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${top}px`;
        });


        button.onclick = () => {
            // Deactivate "Since" button
            const sinceButton = document.querySelector('.smtm-since-button');
            if (sinceButton) {
                sinceButton.classList.remove('active');
                applyThemeStyles(sinceButton, themeName, 'panelSinceButton', 'default');
            }

            document.querySelectorAll('#smtm-presets-container button').forEach(btn => {
                btn.classList.remove('active');
                applyThemeStyles(btn, themeName, 'button', 'default');
            });
            button.classList.add('active');
            applyThemeStyles(button, themeName, 'button', 'active');

            // Update global state for range persistence
            window.SMTM.state.range = preset;
            console.log('[SMTM] Active range:', window.SMTM.state.range);

            // Save the newly selected range
            if (typeof saveSelectedRange === 'function') {
                saveSelectedRange(preset);
            }

            const days = parseInt(preset.replace('d', ''));
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - (days - 1)); // Correctly calculate start date

            // Manually set time to ensure full days are included
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);

            if (typeof updateTotalDisplay === 'function') {
                updateTotalDisplay(startDate, endDate);
            }
        };

        container.appendChild(button);
    });

    // Default active range: '1d' on panel initialization
    setTimeout(() => {
        const savedRange = typeof getSelectedRange === 'function' ? getSelectedRange() : null;
        const defaultPreset = savedRange || window.SMTM.state.range || '1d'; // Use saved range or default to '1d'
        const defaultButton = container.querySelector(`button[data-preset="${defaultPreset}"]`);
        if (defaultButton) {
            defaultButton.click();
        }
    }, 0);

    return container;
}

/**
 * Creates the shared tooltip element.
 * @param {string} themeName The name of the theme to use.
 */
function createSharedTooltip(themeName) {
    if (document.getElementById('smtm-shared-tooltip')) return;

    const tooltip = document.createElement('div');
    tooltip.id = 'smtm-shared-tooltip';
    applyThemeStyles(tooltip, themeName, 'tooltip');

    Object.assign(tooltip.style, {
        position: 'fixed',
        display: 'none',
        zIndex: '10001',
        pointerEvents: 'none',
        transition: 'opacity 0.15s ease-in-out',
        opacity: '0'
    });

    document.body.appendChild(tooltip);
}

/**
 * Creates the total display element.
 * @param {string} themeName The name of the theme to use.
 * @returns {HTMLElement} The created container element.
 */
function createTotalDisplay(themeName) {
    const container = document.createElement('div');
    container.id = 'smtm-total-display-container';
    applyThemeStyles(container, themeName, 'totalBlock');
    Object.assign(container.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '5px'
    });

    const label = document.createElement('span');
    label.innerText = 'Total:';
    applyThemeStyles(label, themeName, 'totalLabel');

    const value = document.createElement('strong');
    value.id = 'smtm-total-value';
    value.innerText = '$0.00';
    applyThemeStyles(value, themeName, 'totalValue');

    const infoIcon = document.createElement('span');
    infoIcon.id = 'smtm-info-icon';
    infoIcon.style.cursor = 'pointer';
    infoIcon.style.display = 'flex';
    infoIcon.style.alignItems = 'center';
    infoIcon.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 1.5C6.71442 1.5 5.45772 1.88122 4.3888 2.59545C3.31988 3.30968 2.48676 4.32484 1.99479 5.51256C1.50282 6.70028 1.37409 8.00721 1.6249 9.26809C1.8757 10.529 2.49477 11.6872 3.40381 12.5962C4.31285 13.5052 5.47104 14.1243 6.73192 14.3751C7.99279 14.6259 9.29973 14.4972 10.4874 14.0052C11.6752 13.5132 12.6903 12.6801 13.4046 11.6112C14.1188 10.5423 14.5 9.28558 14.5 8C14.4982 6.27665 13.8128 4.62441 12.5942 3.40582C11.3756 2.18722 9.72335 1.50182 8 1.5ZM8 13.5C6.91221 13.5 5.84884 13.1774 4.94437 12.5731C4.0399 11.9687 3.33495 11.1098 2.91867 10.1048C2.50238 9.09977 2.39347 7.9939 2.60568 6.927C2.8179 5.86011 3.34173 4.8801 4.11092 4.11091C4.8801 3.34172 5.86011 2.8179 6.92701 2.60568C7.9939 2.39346 9.09977 2.50238 10.1048 2.91866C11.1098 3.33494 11.9687 4.03989 12.5731 4.94436C13.1774 5.84883 13.5 6.9122 13.5 8C13.4983 9.45818 12.9184 10.8562 11.8873 11.8873C10.8562 12.9184 9.45819 13.4983 8 13.5ZM9 11C9 11.1326 8.94732 11.2598 8.85356 11.3536C8.75979 11.4473 8.63261 11.5 8.5 11.5C8.23479 11.5 7.98043 11.3946 7.7929 11.2071C7.60536 11.0196 7.5 10.7652 7.5 10.5V8C7.36739 8 7.24022 7.94732 7.14645 7.85355C7.05268 7.75979 7 7.63261 7 7.5C7 7.36739 7.05268 7.24021 7.14645 7.14645C7.24022 7.05268 7.36739 7 7.5 7C7.76522 7 8.01957 7.10536 8.20711 7.29289C8.39465 7.48043 8.5 7.73478 8.5 8V10.5C8.63261 10.5 8.75979 10.5527 8.85356 10.6464C8.94732 10.7402 9 10.8674 9 11ZM7 5.25C7 5.10166 7.04399 4.95666 7.1264 4.83332C7.20881 4.70999 7.32595 4.61386 7.46299 4.55709C7.60003 4.50032 7.75084 4.48547 7.89632 4.51441C8.04181 4.54335 8.17544 4.61478 8.28033 4.71967C8.38522 4.82456 8.45665 4.9582 8.48559 5.10368C8.51453 5.24917 8.49968 5.39997 8.44291 5.53701C8.38615 5.67406 8.29002 5.79119 8.16668 5.8736C8.04334 5.95601 7.89834 6 7.75 6C7.55109 6 7.36032 5.92098 7.21967 5.78033C7.07902 5.63968 7 5.44891 7 5.25Z" fill="#878787"/></svg>`;

    infoIcon.addEventListener('mouseenter', () => toggleInfoTooltip(themeName, true));
    infoIcon.addEventListener('mouseleave', () => toggleInfoTooltip(themeName, false));

    container.appendChild(label);
    container.appendChild(value);
    container.appendChild(infoIcon);

    return container;
}


/**
 * Updates the position of the missing data container.
 */
function updateMissingDataContainerPosition() {
    const panel = document.getElementById('show-me-the-money-panel');
    const container = document.getElementById('smtm-missing-data-container');

    if (!panel || !container) return;

    // Defer to avoid layout thrashing and ensure panel dimensions are final
    requestAnimationFrame(() => {
        const top = panel.offsetTop + panel.offsetHeight + 6; // 6px margin
        const left = panel.offsetLeft;
        const width = panel.offsetWidth;

        Object.assign(container.style, {
            position: 'absolute',
            top: `${top}px`,
            left: `${left}px`,
            width: `${width}px`,
        });
    });
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

    const newTop = element.offsetTop - pos2;
    const newLeft = element.offsetLeft - pos1;

    element.style.top = `${newTop}px`;
    element.style.left = `${newLeft}px`;

    updateMissingDataContainerPosition();
    updateInfoTooltipPosition();
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
    savePanelPosition({ top: element.style.top, left: element.style.left });
  }
}

/**
 * Updates the total amount displayed in the panel.
 * @param {number|string} total The total amount to display.
 * @param {string} currencySymbol The currency symbol to use (e.g., '$').
 */
window.SMTM.updateTotal = function(total, currencySymbol = '') {
    const totalValue = document.getElementById('smtm-total-value');
    if (totalValue) {
        if (typeof total === 'number' && total > 0) {
            totalValue.innerText = `${currencySymbol}${total.toFixed(2)}`;
        } else {
            totalValue.innerText = total;
        }
    }
}


/**
 * Creates a tooltip for an element.
 * @param {HTMLElement} element The element to create the tooltip for.
 * @param {string} text The text to display in the tooltip.
 * @param {string} themeName The name of the theme to use.
 */
function createTooltip(element, text, themeName) {
    let tooltip = element.querySelector('.smtm-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'smtm-tooltip';
        element.appendChild(tooltip);
    }

    tooltip.innerText = text;

    applyThemeStyles(tooltip, themeName, 'tooltip');

    Object.assign(tooltip.style, {
        position: 'absolute',
        top: '125%',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: '10001',
        display: 'none',
        wordWrap: 'break-word',
        textAlign: 'center',
        pointerEvents: 'none'
    });

    element.style.position = 'relative';

    element.onmouseover = () => {
        // Match tooltip width to its parent label
        tooltip.style.width = `${element.offsetWidth}px`;
        tooltip.style.display = 'block';
    };
    element.onmouseout = () => {
        tooltip.style.display = 'none';
    };
}


/**
 * Shows or hides the "missing data" label.
 * @param {string} themeName The name of the theme to use.
 * @param {Array<string>} missingDays An array of missing day strings.
 */
window.SMTM.toggleMissingDataLabel = function(themeName, missingDays) {
    const panel = document.getElementById('show-me-the-money-panel');
    if (!panel) return;

    let container = document.getElementById('smtm-missing-data-container');
    const theme = getTheme(themeName);

    if (missingDays.length > 0) {
        if (!theme) {
            console.error(`Show Me The Money: Theme "${themeName}" not found.`);
            return;
        }

        if (!container) {
            container = document.createElement('div');
            container.id = 'smtm-missing-data-container';
            document.body.appendChild(container);

            // Apply styles and position only when newly created
            applyThemeStyles(container, themeName, 'missingDataContainer');
            Object.assign(container.style, {
                zIndex: '9998',
                pointerEvents: 'none'
            });
            updateMissingDataContainerPosition();
        }

        let label = container.querySelector('#smtm-missing-data-label');
        if (!label) {
            label = document.createElement('div');
            label.id = 'smtm-missing-data-label';
            container.appendChild(label);
        }

        applyThemeStyles(label, themeName, 'missingDataLabel');
        label.style.pointerEvents = 'all';
        label.innerText = theme.labels.missingData.text;

        const formattedMissingDays = groupConsecutiveDates(missingDays);
        createTooltip(label, `Missing data for: ${formattedMissingDays}`, themeName);

    } else if (container) {
        container.remove();
    }
}

/**
 * Updates the position of the info tooltip.
 */
function updateInfoTooltipPosition() {
    const panel = document.getElementById('show-me-the-money-panel');
    const container = document.getElementById('smtm-info-tooltip-container');

    if (!panel || !container) return;

    requestAnimationFrame(() => {
        const top = panel.offsetTop + panel.offsetHeight + 6; // 6px margin
        const left = panel.offsetLeft;
        const width = panel.offsetWidth;

        Object.assign(container.style, {
            position: 'absolute',
            top: `${top}px`,
            left: `${left}px`,
            width: `${width}px`,
        });
    });
}

/**
 * Shows or hides the info tooltip.
 * @param {string} themeName The name of the theme to use.
 * @param {boolean} show Whether to show or hide the tooltip.
 */
function toggleInfoTooltip(themeName, show) {
    const panel = document.getElementById('show-me-the-money-panel');
    if (!panel) return;

    let container = document.getElementById('smtm-info-tooltip-container');

    if (!container) {
        container = document.createElement('div');
        container.id = 'smtm-info-tooltip-container';
        document.body.appendChild(container);

        applyThemeStyles(container, themeName, 'tooltip'); // Use same style as other tooltips
        Object.assign(container.style, {
            zIndex: '10002',
            pointerEvents: 'none',
            transition: 'opacity 0.15s ease-in-out',
            opacity: '0',
            display: 'none'
        });
        updateInfoTooltipPosition();
    }

    if (show) {
        container.innerHTML = `Counts only the data you see in the table. Scroll through all rows to get full stats. You can drag the panel.<br><b>Everything stays local — nothing is sent anywhere.</b>`;
        container.style.display = 'block';
        updateInfoTooltipPosition(); // Ensure position is correct before showing
        requestAnimationFrame(() => {
            container.style.opacity = '1';
        });
    } else {
        container.style.opacity = '0';
        setTimeout(() => {
            if (container.style.opacity === '0') {
                container.style.display = 'none';
            }
        }, 200); // Match transition duration
    }
}

/**
 * Updates the "Since" button text based on the selected date in localStorage.
 */
window.SMTM.updateSinceButtonText = function() {
  const sinceButton = document.querySelector('.smtm-since-button');
  if (!sinceButton) return;

  let selectedDate;
  const savedDate = localStorage.getItem('smtmSelectedDate');

  if (savedDate) {
    const [year, month, day] = savedDate.split('-').map(Number);
    selectedDate = new Date(year, month - 1, day);
  } else {
    const today = new Date();
    selectedDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const year = selectedDate.getFullYear();
    const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
    const day = selectedDate.getDate().toString().padStart(2, '0');
    localStorage.setItem('smtmSelectedDate', `${year}-${month}-${day}`);
  }

  const day = selectedDate.getDate();
  const month = selectedDate.toLocaleString('default', { month: 'short' });

  sinceButton.innerText = `Since: ${day} ${month}`;
}

/**
 * Enforces the 'hidden' state of the panel by hiding it and observing
 * for style changes that might make it visible again.
 * @param {HTMLElement} panel The main panel element.
 */
window.SMTM.enforceHiddenState = function(panel) {
  const missingDataContainer = document.getElementById('smtm-missing-data-container');
  const infoTooltipContainer = document.getElementById('smtm-info-tooltip-container');

  const hideAll = () => {
    if (panel.style.display !== 'none') {
      panel.style.display = 'none';
    }
    if (missingDataContainer && missingDataContainer.style.display !== 'none') {
      missingDataContainer.style.display = 'none';
    }
    if (infoTooltipContainer && infoTooltipContainer.style.display !== 'none') {
      infoTooltipContainer.style.display = 'none';
    }
  };

  // Hide it once immediately
  hideAll();

  // Create an observer to re-apply the hidden state if it's changed by other scripts
  const observer = new MutationObserver(() => {
    if (localStorage.getItem('smtmPanelVisibility') === 'hidden' && panel.style.display !== 'none') {
      window.SMTM.debug.log('Panel visibility was changed externally. Re-enforcing hidden state.');
      hideAll();
    }
  });

  observer.observe(panel, { attributes: true, attributeFilter: ['style'] });
  window.SMTM.visibilityObserver = observer;
  window.SMTM.debug.log('Visibility observer attached to enforce hidden state.');
}

/**
 * Updates the total display with the given total.
 * @param {Date} startDate The start date for the total.
 * @param {Date} endDate The end date for the total.
 */
window.SMTM.updateTotalDisplay = function(startDate, endDate) {
  const history = getHistory();

  if (!startDate) {
    const savedDate = localStorage.getItem('smtmSelectedDate');
    if (savedDate) {
      const [year, month, day] = savedDate.split('-').map(Number);
      startDate = new Date(year, month - 1, day);
    } else {
      const today = new Date();
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }
  }

  if (!endDate) {
    endDate = new Date();
  }

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  const filteredHistory = history.filter(t => {
    const transactionDate = new Date(t.date);
    return transactionDate >= startDate && transactionDate <= endDate;
  });

  const currencySymbol = window.location.hostname.includes('cursor.com') ? '$' : '';
  const theme = window.location.hostname.includes('cursor.com') ? 'cursor' : 'dark';

  if (filteredHistory.length > 0) {
    const total = filteredHistory.reduce((sum, t) => sum + t.amount, 0);
    updateTotal(total, currencySymbol);
  } else {
    updateTotal("Not enough data for selected period");
  }

  const missingDays = checkForMissingDays(history, startDate, endDate);
  const today = new Date();
  if (today.getDate() > 3) {
    toggleMissingDataLabel(theme, missingDays);
  } else {
    toggleMissingDataLabel(theme, []);
  }
}

window.SMTM.blinkDebugBadge = function(element) {
  const originalBorder = element.style.border;
  element.style.border = '2px solid red';
  setTimeout(() => {
    element.style.border = originalBorder;
  }, 500);
}
