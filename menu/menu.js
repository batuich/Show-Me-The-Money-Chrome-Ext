// Load theme configuration
let themeConfig = null;

// Arrow icon SVG
const ARROW_ICON = `
<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 6L8 10L12 6" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

// Initialize menu
async function initMenu() {
  try {
    // Load theme configuration
    const response = await fetch('menu.json');
    themeConfig = await response.json();
    
    // Build menu
    buildMenu();
    
    // Apply styles from theme config
    applyThemeStyles();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup theme state
    setupThemeState();

    // Setup reset button
    setupResetButton();
    
    // Setup Teach Mode button state
    setupTeachModeButton();
  } catch (error) {
    console.error('Error initializing menu:', error);
  }
}

// Build menu structure
function buildMenu() {
  const container = document.getElementById('menu-container');
  
  const menuHTML = `
    <!-- Theme Section -->
    <div class="menu-section" data-section="theme">
      <div class="section-row">
        <span class="section-title">Theme</span>
        <div class="toggle-group">
          <button class="menu-button" data-theme="light">Light</button>
          <button class="menu-button" data-theme="dark">Dark</button>
        </div>
      </div>
    </div>

    <!-- Teach Mode Section -->
    <div class="menu-section" data-section="teach-mode">
      <div class="section-row">
        <span class="section-title">Teach Mode</span>
        <button class="menu-button">Start detection</button>
      </div>
    </div>

    <!-- Check Mapping Section (Expandable) -->
    <div class="menu-section" data-section="check-mapping">
      <div class="section-row">
        <span class="section-title clickable" data-expand="check-mapping">Check Mapping</span>
        <div class="icon-button" data-expand="check-mapping">
          ${ARROW_ICON}
        </div>
      </div>
      <div class="expand-content" data-content="check-mapping">
        <div class="expand-inner">
          <span class="expand-paragraph">No site mapping found.</span>
        </div>
      </div>
    </div>

    <!-- Reset Section -->
    <div class="menu-section" data-section="reset">
      <div class="section-row">
        <button class="menu-button" data-action="reset-data" style="width: 100%;">Reset</button>
      </div>
    </div>

    <!-- How it works Section (Expandable) -->
    <div class="menu-section" data-section="how-it-works">
      <div class="section-row">
        <span class="section-title clickable" data-expand="how-it-works">How it works</span>
        <div class="icon-button" data-expand="how-it-works">
          ${ARROW_ICON}
        </div>
      </div>
      <div class="expand-content" data-content="how-it-works">
        <div class="expand-inner">
          <span class="expand-paragraph">Counts only the data visible in the table. Scroll through all rows to get complete stats.</span>
          <span class="expand-paragraph">To train it for a new site, use "Teach Mode".</span>
          <span class="expand-paragraph">All collected data stays on your device — nothing is sent anywhere.</span>
        </div>
      </div>
    </div>
  `;
  
  container.innerHTML = menuHTML;
}

// Apply theme styles from menu.json
function applyThemeStyles() {
  if (!themeConfig) return;
  
  const container = document.getElementById('menu-container');
  const { menu, section, title, iconButton, expandContent, button } = themeConfig;
  
  // Apply menu styles
  if (menu) {
    Object.assign(container.style, menu);
  }
  
  // Apply section styles
  if (section) {
    const sections = document.querySelectorAll('.menu-section');
    sections.forEach((sec, index) => {
      Object.assign(sec.style, {
        background: section.background,
        padding: section.padding,
        display: 'flex',
        flexDirection: 'column',
        gap: section.gap,
        borderTop: (index === 0 && section.firstChildBorder) ? section.firstChildBorder : section.borderTop
      });
    });
  }
  
  // Apply title styles
  if (title) {
    document.querySelectorAll('.section-title').forEach(t => Object.assign(t.style, title));
  }
  
  // Apply icon button styles
  if (iconButton) {
    document.querySelectorAll('.icon-button').forEach(btn => Object.assign(btn.style, iconButton));
  }
  
  // Apply expand content styles
  if (expandContent) {
    document.querySelectorAll('.expand-inner').forEach(inner => {
      Object.assign(inner.style, {
        color: expandContent.color,
        fontSize: expandContent.fontSize,
        padding: expandContent.padding,
        gap: expandContent.gap,
        lineHeight: expandContent.lineHeight
      });
    });
  }

  // Apply button styles
  if (button) {
    applyButtonStyles();
  }
}

// Apply button styles
function applyButtonStyles() {
  const buttons = document.querySelectorAll('.menu-button');
  const { button, buttonHover, buttonActive, buttonDisabled } = themeConfig;

  buttons.forEach(btn => {
    Object.assign(btn.style, button);

    btn.addEventListener('mouseenter', () => Object.assign(btn.style, buttonHover));
    btn.addEventListener('mouseleave', () => {
      Object.assign(btn.style, button);
      if (btn.classList.contains('active')) {
        Object.assign(btn.style, buttonActive);
      }
    });
    btn.addEventListener('mousedown', () => Object.assign(btn.style, buttonActive));
    btn.addEventListener('mouseup', () => Object.assign(btn.style, buttonHover));

    if (btn.disabled) {
      Object.assign(btn.style, buttonDisabled);
    }
  });
}

// Setup event listeners
function setupEventListeners() {
  // Theme toggle buttons
  const themeButtons = document.querySelectorAll('[data-section="theme"] .menu-button');
  themeButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const selectedTheme = e.currentTarget.getAttribute('data-theme');
      console.log(`[SMTM] Theme switched to: ${selectedTheme}`);
      
      localStorage.setItem('smtmSelectedTheme', selectedTheme);

      themeButtons.forEach(btn => {
        btn.classList.remove('active');
        Object.assign(btn.style, themeConfig.button);
      });
      e.currentTarget.classList.add('active');
      Object.assign(e.currentTarget.style, themeConfig.buttonActive);
      
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: "applyTheme", theme: selectedTheme }, (response) => {
            if (chrome.runtime.lastError) { /* Suppress error */ }
          });
        }
      });
    });
  });

  // Expandable sections
  document.querySelectorAll('[data-expand]').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      toggleExpand(e.currentTarget.getAttribute('data-expand'));
    });
  });

  // Teach Mode button - listener will be set up in setupTeachModeButton()
}

// Setup Teach Mode button state and behavior
function setupTeachModeButton() {
  const teachModeButton = document.querySelector('[data-section="teach-mode"] .menu-button');
  if (!teachModeButton) return;
  
  // Get the current page's localStorage to check Teach Mode state
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || tabs.length === 0) return;
    
    const tabId = tabs[0].id;
    
    // Inject script to check teachModeActive flag
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        try {
          const config = JSON.parse(localStorage.getItem('smtmLocalConfig'));
          return config?.teachModeActive === true;
        } catch (e) {
          return false;
        }
      }
    }, (results) => {
      if (chrome.runtime.lastError) {
        console.error('Error checking Teach Mode state:', chrome.runtime.lastError.message);
        return;
      }
      
      const isActive = results && results[0] && results[0].result === true;
      
      // Update button text based on state
      teachModeButton.textContent = isActive ? 'Stop detection' : 'Start detection';
      
      // Set up click handler
      teachModeButton.addEventListener('click', () => {
        const action = isActive ? 'stopTeachMode' : 'startTeachMode';
        chrome.runtime.sendMessage({ action: action }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Popup: Error sending message:', chrome.runtime.lastError.message);
          }
          window.close();
        });
      });
    });
  });
}

// Toggle expand/collapse for sections
function toggleExpand(sectionId) {
  const content = document.querySelector(`[data-content="${sectionId}"]`);
  const iconButton = document.querySelector(`.icon-button[data-expand="${sectionId}"]`);
  if (!content || !iconButton) return;
  
  const isOpen = content.classList.toggle('open');
  iconButton.classList.toggle('expanded', isOpen);
}

// Setup theme state
function setupThemeState() {
  let currentTheme = localStorage.getItem('smtmSelectedTheme');
  if (!currentTheme) {
    currentTheme = 'light';
    localStorage.setItem('smtmSelectedTheme', 'light');
  }

  const themeButtons = document.querySelectorAll('[data-section="theme"] .menu-button');
  themeButtons.forEach(btn => {
    if (btn.dataset.theme === currentTheme) {
      btn.classList.add('active');
      if (themeConfig && themeConfig.buttonActive) {
        Object.assign(btn.style, themeConfig.buttonActive);
      }
    }
  });

  // Inform content script about the current theme on init
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].id) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "applyTheme", theme: currentTheme }, (response) => {
        if (chrome.runtime.lastError) { /* Suppress error */ }
      });
    }
  });
}

// Function to be injected into the page to interact with localStorage
function manageLocalStorage(action) {
  if (action === 'check') {
    return !!(localStorage.getItem('smtmLocalConfig') || localStorage.getItem('smtmUsageDaily'));
  } else if (action === 'clear') {
    localStorage.clear();
    return true;
  }
  return false;
}

// Setup reset button logic
function setupResetButton() {
  const resetButton = document.querySelector('[data-action="reset-data"]');
  if (!resetButton) return;

  resetButton.disabled = false;
  if (themeConfig && themeConfig.button) {
    Object.assign(resetButton.style, themeConfig.button);
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    let hostname = 'current site';
    const tab = tabs && tabs.length > 0 ? tabs[0] : null;

    if (tab && tab.url) {
      try {
        const url = new URL(tab.url);
        if (['http:', 'https:'].includes(url.protocol)) {
          hostname = url.hostname.replace(/^www\./, '');
        } else {
          console.log('[SMTM] Hostname not found (non-HTTP protocol) — fallback label applied.');
        }
      } catch (e) {
        console.log('[SMTM] Hostname not found (URL parse error) — fallback label applied.');
      }
    } else {
      console.log('[SMTM] Hostname not found (no active tab) — fallback label applied.');
    }

    resetButton.textContent = `Reset: ${hostname}`;

    resetButton.addEventListener('click', () => {
      if (!tab || !tab.id) {
        alert('Reset failed: Could not identify the active tab.');
        return;
      }
      
      if (hostname === 'cursor.com') {
        console.log('[SMTM] Cursor preset detected — reset skipped.');
        return;
      }

      const confirmation = confirm(`⚠️ This will permanently delete all local data for ${hostname}. Continue?`);
      if (!confirmation) return;

      // 1. Try to clear localStorage directly via scripting
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: manageLocalStorage,
        args: ['check']
      }, (injectionResults) => {
        // Check if script execution was successful and if data was found
        if (injectionResults && injectionResults[0] && injectionResults[0].result) {
          // Data exists, proceed to clear it directly
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: manageLocalStorage,
            args: ['clear']
          }, () => {
            console.log('[SMTM] 🧹 Local data manually cleared (content script not active).');
            console.log(`[SMTM] 💥 Full data reset completed for ${hostname}.`);
            resetButton.textContent = 'Reset Complete!';
            resetButton.disabled = true;
            applyButtonStyles();
          });
        } else {
          // 2. Fallback: No data found or script failed, try sending message to content script
          chrome.tabs.sendMessage(tab.id, { action: "clearLocalStorage" }, (response) => {
            if (chrome.runtime.lastError) {
              console.log('[SMTM] Reset skipped: extension not available on this page.');
              alert('Reset failed: extension not active and no local data found.');
            } else {
              console.log(`[SMTM] 💥 Full data reset completed for ${hostname}.`);
              resetButton.textContent = 'Reset Complete!';
              resetButton.disabled = true;
              applyButtonStyles();
            }
          });
        }
      });
    });
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMenu);
} else {
  initMenu();
}
