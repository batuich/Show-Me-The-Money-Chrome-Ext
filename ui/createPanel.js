// utils/uiHelpers.js

const DEBUG_STYLES = typeof SMTM_DEBUG_STYLES === 'boolean' ? SMTM_DEBUG_STYLES : false;
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
    // Initialize state for range persistence
    if (!window.SMTM.state) window.SMTM.state = {};
    if (!window.SMTM.state.range) window.SMTM.state.range = '1d';

    const theme = themes[themeName];
    if (!theme) {
        console.error(`Show Me The Money: Theme "${themeName}" not found.`);
        return null;
    }

    // Ensure config is available
    const panelConfig = window.SMTM.config?.bar || {};

    const panel = createElement('div', { id: 'show-me-the-money-panel' });
    applyThemeStyles(panel, theme, 'base');
    applyThemeStyles(panel, theme, 'panel');

    Object.assign(panel.style, {
        display: 'flex',
        alignItems: 'center',
        gap: theme.common.spacing,
        zIndex: '9999'
    });

    const dragHandle = createDragHandle(theme);
    panel.appendChild(dragHandle);

    if (panelConfig.sinceButton) {
        const sinceButton = createSinceButton(theme);
        panel.appendChild(sinceButton);
    }

    const presetsContainer = createPresetButtons(theme, panelConfig);
    if (presetsContainer) {
        panel.appendChild(presetsContainer);
    }

    if (panelConfig.total) {
        const totalDisplay = createTotalDisplay(theme);
        panel.appendChild(totalDisplay);
    }

    makeDraggable(panel, dragHandle);

    document.body.appendChild(panel);

    createSharedTooltip(theme); // Create the single, shared tooltip
    toggleInfoTooltip(theme, false); // Create the info tooltip container, initially hidden

    if (DEBUG_STYLES && typeof logComputedStyles === 'function') {
        logComputedStyles(panel, "panel (attached)");
    }

    // Positioning logic remains the same
    if (!restorePanelPosition(panel)) {
        await positionPanelInitially(panel);
    }

    return panel;
}

function createSinceButton(theme) {
    const button = createElement('button', {
        className: 'smtm-since-button',
        text: 'Since: 4 Nov'
    });
    applyThemeStyles(button, theme, 'panelSinceButton');
    button.style.cursor = 'pointer';
    button.style.border = 'none';
    button.style.whiteSpace = 'nowrap';
    button.style.display = 'inline-flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';

    button.onmouseover = () => {
        applyThemeStyles(button, theme, 'panelSinceButton', 'hover');
    };
    button.onmouseout = () => {
        applyThemeStyles(button, theme, 'panelSinceButton', 'default');
    };

    button.onclick = (event) => {
        event.stopPropagation();
        if (window.SMTM && typeof window.SMTM.createCalendarPopup === 'function') {
            const themeName = window.location.hostname.includes('cursor.com') ? 'cursor' : 'dark';
            window.SMTM.createCalendarPopup(button, themeName);
        }
    };

    return button;
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
    const handle = createElement('div', { id: 'smtm-drag-handle' });
    applyThemeStyles(handle, theme, 'dragHandle');
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
        applyThemeStyles(handle, theme, 'dragHandle', 'hover');
    };
    handle.onmouseout = () => {
        applyThemeStyles(handle, theme, 'dragHandle', 'default');
    };

    return handle;
}

function createPresetButtons(theme, panelConfig) {
    const presets = [];
    if (panelConfig['1dButton']) presets.push('1d');
    if (panelConfig['7dButton']) presets.push('7d');
    if (panelConfig['30dButton']) presets.push('30d');

    if (presets.length === 0) {
        return null; // Don't create the container if no buttons are enabled
    }

    const container = createElement('div', { id: 'smtm-presets-container' });
    Object.assign(container.style, {
        display: 'flex',
        gap: theme.common.spacing
    });

    presets.forEach(preset => {
        const button = createElement('button', {
            text: preset,
            dataset: { preset }
        });
        applyThemeStyles(button, theme, 'button');
        button.style.cursor = 'pointer';
        button.style.border = 'none';

        // --- Tooltip Logic ---
        button.addEventListener('mouseenter', (e) => {
            const tooltip = document.getElementById('smtm-shared-tooltip');
            if (!button.classList.contains('active')) {
                applyThemeStyles(button, theme, 'button', 'hover');
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
                applyThemeStyles(button, theme, 'button', 'default');
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
                applyThemeStyles(sinceButton, theme, 'panelSinceButton', 'default');
            }

            document.querySelectorAll('#smtm-presets-container button').forEach(btn => {
                btn.classList.remove('active');
                applyThemeStyles(btn, theme, 'button', 'default');
            });
            button.classList.add('active');
            applyThemeStyles(button, theme, 'button', 'active');

            // Update global state for range persistence
            window.SMTM.state.range = preset;
            if (window.SMTM?.debug?.log) {
                window.SMTM.debug.log('[SMTM UI] Active range updated', window.SMTM.state.range);
            }

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

            if (typeof window.updateTotalDisplay === 'function') {
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

function createSharedTooltip(theme) {
    if (document.getElementById('smtm-shared-tooltip')) return;

    const tooltip = document.createElement('div');
    tooltip.id = 'smtm-shared-tooltip';
    applyThemeStyles(tooltip, theme, 'tooltip');

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

function createTotalDisplay(theme) {
    const container = document.createElement('div');
    container.id = 'smtm-total-display-container';
    applyThemeStyles(container, theme, 'totalBlock');
    Object.assign(container.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '5px'
    });

    const label = document.createElement('span');
    label.innerText = 'Total:';
    applyThemeStyles(label, theme, 'totalLabel');

    const value = document.createElement('strong');
    value.id = 'smtm-total-value';
    value.innerText = '$0.00';
    applyThemeStyles(value, theme, 'totalValue');

    const infoIcon = document.createElement('span');
    infoIcon.id = 'smtm-info-icon';
    infoIcon.style.cursor = 'pointer';
    infoIcon.style.display = 'flex';
    infoIcon.style.alignItems = 'center';
    infoIcon.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 1.5C6.71442 1.5 5.45772 1.88122 4.3888 2.59545C3.31988 3.30968 2.48676 4.32484 1.99479 5.51256C1.50282 6.70028 1.37409 8.00721 1.6249 9.26809C1.8757 10.529 2.49477 11.6872 3.40381 12.5962C4.31285 13.5052 5.47104 14.1243 6.73192 14.3751C7.99279 14.6259 9.29973 14.4972 10.4874 14.0052C11.6752 13.5132 12.6903 12.6801 13.4046 11.6112C14.1188 10.5423 14.5 9.28558 14.5 8C14.4982 6.27665 13.8128 4.62441 12.5942 3.40582C11.3756 2.18722 9.72335 1.50182 8 1.5ZM8 13.5C6.91221 13.5 5.84884 13.1774 4.94437 12.5731C4.0399 11.9687 3.33495 11.1098 2.91867 10.1048C2.50238 9.09977 2.39347 7.9939 2.60568 6.927C2.8179 5.86011 3.34173 4.8801 4.11092 4.11091C4.8801 3.34172 5.86011 2.8179 6.92701 2.60568C7.9939 2.39346 9.09977 2.50238 10.1048 2.91866C11.1098 3.33494 11.9687 4.03989 12.5731 4.94436C13.1774 5.84883 13.5 6.9122 13.5 8C13.4983 9.45818 12.9184 10.8562 11.8873 11.8873C10.8562 12.9184 9.45819 13.4983 8 13.5ZM9 11C9 11.1326 8.94732 11.2598 8.85356 11.3536C8.75979 11.4473 8.63261 11.5 8.5 11.5C8.23479 11.5 7.98043 11.3946 7.7929 11.2071C7.60536 11.0196 7.5 10.7652 7.5 10.5V8C7.36739 8 7.24022 7.94732 7.14645 7.85355C7.05268 7.75979 7 7.63261 7 7.5C7 7.36739 7.05268 7.24021 7.14645 7.14645C7.24022 7.05268 7.36739 7 7.5 7C7.76522 7 8.01957 7.10536 8.20711 7.29289C8.39465 7.48043 8.5 7.73478 8.5 8V10.5C8.63261 10.5 8.75979 10.5527 8.85356 10.6464C8.94732 10.7402 9 10.8674 9 11ZM7 5.25C7 5.10166 7.04399 4.95666 7.1264 4.83332C7.20881 4.70999 7.32595 4.61386 7.46299 4.55709C7.60003 4.50032 7.75084 4.48547 7.89632 4.51441C8.04181 4.54335 8.17544 4.61478 8.28033 4.71967C8.38522 4.82456 8.45665 4.9582 8.48559 5.10368C8.51453 5.24917 8.49968 5.39997 8.44291 5.53701C8.38615 5.67406 8.29002 5.79119 8.16668 5.8736C8.04334 5.95601 7.89834 6 7.75 6C7.55109 6 7.36032 5.92098 7.21967 5.78033C7.07902 5.63968 7 5.44891 7 5.25Z" fill="#878787"/></svg>`;

    infoIcon.addEventListener('mouseenter', () => toggleInfoTooltip(theme, true));
    infoIcon.addEventListener('mouseleave', () => toggleInfoTooltip(theme, false));

    container.appendChild(label);
    container.appendChild(value);
    container.appendChild(infoIcon);

    return container;
}


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
 * @param {number} total The total amount to display.
 * @param {string} currencySymbol The currency symbol to use (e.g., '$').
 */
function updateTotal(total, currencySymbol = '') {
    const totalValue = document.getElementById('smtm-total-value');
    if (!totalValue) {
        return;
    }

    if (typeof total === 'string') {
        totalValue.innerText = total;
        return;
    }

    const amount = typeof total === 'number' && total > 0 ? total : 0;
    totalValue.innerText = formatCurrency(amount, { currencySymbol });
}


/**
 * Shows or hides the "missing data" label.
 * @param {string} themeName The name of the theme to use.
 * @param {Array<string>} missingDays An array of missing day strings.
 */
function createTooltip(element, text, theme) {
    let tooltip = element.querySelector('.smtm-tooltip');
    if (!tooltip) {
        tooltip = createElement('div', { className: 'smtm-tooltip' });
        element.appendChild(tooltip);
    }

    tooltip.innerText = text;

    applyThemeStyles(tooltip, theme, 'tooltip');

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


let hasLoggedMissingTheme = false;

function resolveTheme(themeName) {
    if (!themeName) return null;
    if (themes[themeName]) return themes[themeName];
    if (window.SMTM?.themes?.[themeName]) {
        themes = window.SMTM.themes;
        return themes[themeName];
    }
    return null;
}

function toggleMissingDataLabel(themeName, missingDays, options = {}) {
    try {
        const panel = document.getElementById('show-me-the-money-panel');
        if (!panel) return;

        let container = document.getElementById('smtm-missing-data-container');
        const theme = resolveTheme(themeName);
        const forceShow = options.forceShow === true;

        if (!theme) {
            if (!hasLoggedMissingTheme) {
                const warnLog = window.SMTM?.debug?.log || console.warn;
                warnLog(`[SMTM Tip] Theme "${themeName}" not found for missing data label.`);
                hasLoggedMissingTheme = true;
            }
            return;
        }

        if (forceShow || missingDays.length > 0) {
            if (!container) {
                container = createElement('div', { id: 'smtm-missing-data-container' });
                document.body.appendChild(container);

                applyThemeStyles(container, theme, 'missingDataContainer');
                Object.assign(container.style, {
                    zIndex: '9998',
                    pointerEvents: 'none'
                });
            }

            updateMissingDataContainerPosition();

            let label = container.querySelector('#smtm-missing-data-label');
            if (!label) {
                label = createElement('div', { id: 'smtm-missing-data-label' });
                container.appendChild(label);
            }

            applyThemeStyles(label, theme, 'missingDataLabel');
            label.style.pointerEvents = 'all';
            label.innerText = theme.labels.missingData.text;

            if (missingDays.length > 0) {
                const formattedMissingDays = groupConsecutiveDates(missingDays);
                createTooltip(label, `Missing data for: ${formattedMissingDays}`, theme);
            } else {
                createTooltip(label, theme.labels.missingData.text, theme);
            }
        } else if (container) {
            container.remove();
        }
    } catch (error) {
        window.SMTM?.debug?.log('[SMTM Tip] toggle failed, using safe no-op', error?.message || error);
    }
}

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

function toggleInfoTooltip(theme, show) {
    const panel = document.getElementById('show-me-the-money-panel');
    if (!panel) return;

    let container = document.getElementById('smtm-info-tooltip-container');

    if (!container) {
        container = createElement('div', { id: 'smtm-info-tooltip-container' });
        document.body.appendChild(container);

        applyThemeStyles(container, theme, 'tooltip'); // Use same style as other tooltips
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
