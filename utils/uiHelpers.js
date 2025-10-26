// utils/uiHelpers.js

const DEBUG_STYLES = true;
let themes = {};

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

function applyThemeStyles(el, theme, themeKey, state = "default") {
    const style = theme[themeKey]?.[state];
    if (!style || !el) return;

    for (const [prop, value] of Object.entries(style)) {
        if (value === null || value === undefined) continue;

        const cssProp = prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
        let finalValue = value;

        const pixelProps = ['borderRadius', 'fontSize', 'height', 'width', 'top', 'left', 'right', 'bottom', 'padding', 'margin'];
        if (pixelProps.includes(prop) && typeof value === 'number') {
            finalValue = `${value}px`;
        }

        el.style.setProperty(cssProp, finalValue, 'important');
    }
    if (DEBUG_STYLES) logComputedStyles(el, themeKey || el.tagName);
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
    const theme = themes[themeName];
    if (!theme) {
        console.error(`Show Me The Money: Theme "${themeName}" not found.`);
        return null;
    }

    const panel = document.createElement('div');
    panel.id = 'show-me-the-money-panel';
    applyThemeStyles(panel, theme, 'base');
    applyThemeStyles(panel, theme, 'panel');

    Object.assign(panel.style, {
        display: 'flex',
        alignItems: 'center',
        gap: theme.common.spacing,
        zIndex: '9999',
        height: '36px'
    });

    const dragHandle = createDragHandle(theme);
    const presetsContainer = createPresetButtons(theme);
    const totalDisplay = createTotalDisplay(theme);

    panel.appendChild(dragHandle);
    panel.appendChild(presetsContainer);
    panel.appendChild(totalDisplay);

    makeDraggable(panel, dragHandle);

    document.body.appendChild(panel);

    if (DEBUG_STYLES) logComputedStyles(panel, "panel (attached)");

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
    applyThemeStyles(handle, theme, 'dragHandle');
    Object.assign(handle.style, {
        cursor: 'move',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%'
    });

    const dotsContainer = document.createElement('div');
    dotsContainer.style.display = 'flex';
    dotsContainer.style.flexDirection = 'column';
    dotsContainer.style.gap = '3px';

    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        applyThemeStyles(dot, theme, 'dragHandleDot', 'default');
        Object.assign(dot.style, {
            width: '3px',
            height: '3px'
        });
        dotsContainer.appendChild(dot);
    }
    handle.appendChild(dotsContainer);

    handle.onmouseover = () => {
        applyThemeStyles(handle, theme, 'dragHandle', 'hover');
        dotsContainer.childNodes.forEach(dot => applyThemeStyles(dot, theme, 'dragHandleDot', 'hover'));
    };
    handle.onmouseout = () => {
        applyThemeStyles(handle, theme, 'dragHandle', 'default');
        dotsContainer.childNodes.forEach(dot => applyThemeStyles(dot, theme, 'dragHandleDot', 'default'));
    };

    return handle;
}

function createPresetButtons(theme) {
    const container = document.createElement('div');
    container.id = 'smtm-presets-container';
    Object.assign(container.style, {
        display: 'flex',
        gap: theme.common.spacing
    });

    const presets = ['1d', '7d', '30d'];

    presets.forEach(preset => {
        const button = document.createElement('button');
        button.innerText = preset;
        button.dataset.preset = preset;
        applyThemeStyles(button, theme, 'button');
        button.style.cursor = 'pointer';
        button.style.border = 'none';

        button.onmouseover = () => {
             if (!button.classList.contains('active')) applyThemeStyles(button, theme, 'button', 'hover');
        };
        button.onmouseout = () => {
            if (!button.classList.contains('active')) applyThemeStyles(button, theme, 'button', 'default');
        };

        button.onclick = () => {
            document.querySelectorAll('#smtm-presets-container button').forEach(btn => {
                btn.classList.remove('active');
                applyThemeStyles(btn, theme, 'button', 'default');
            });
            button.classList.add('active');
            applyThemeStyles(button, theme, 'button', 'active');

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

    setTimeout(() => {
        const defaultButton = container.querySelector('button[data-preset="30d"]');
        if (defaultButton) defaultButton.click();
    }, 0);

    return container;
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

    container.appendChild(label);
    container.appendChild(value);

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


function toggleMissingDataLabel(themeName, missingDays) {
    const panel = document.getElementById('show-me-the-money-panel');
    if (!panel) return;

    let container = document.getElementById('smtm-missing-data-container');
    const theme = themes[themeName];

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
            applyThemeStyles(container, theme, 'missingDataContainer');
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

        applyThemeStyles(label, theme, 'missingDataLabel');
        label.style.pointerEvents = 'all';
        label.innerText = theme.labels.missingData.text;

        const formattedMissingDays = groupConsecutiveDates(missingDays);
        createTooltip(label, `Missing data for: ${formattedMissingDays}`, theme);

    } else if (container) {
        container.remove();
    }
}
