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
    
    // Setup theme
    setupTheme();

    // Setup reset button
    setupResetButton();
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
          <button class="menu-button active" data-theme="dark">Dark</button>
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
    container.style.background = menu.background;
    container.style.padding = menu.padding;
    container.style.borderRadius = menu.borderRadius;
  }
  
  // Apply section styles
  if (section) {
    const sections = document.querySelectorAll('.menu-section');
    sections.forEach((sec, index) => {
      sec.style.background = section.background;
      sec.style.padding = section.padding;
      sec.style.display = 'flex';
      sec.style.flexDirection = 'column';
      sec.style.gap = section.gap;
      
      // Apply border-top except for first child
      if (index === 0 && section.firstChildBorder) {
        sec.style.borderTop = section.firstChildBorder;
      } else if (section.borderTop) {
        sec.style.borderTop = section.borderTop;
      }
    });
  }
  
  // Apply title styles
  if (title) {
    const titles = document.querySelectorAll('.section-title');
    titles.forEach(t => {
      t.style.color = title.color;
      t.style.fontSize = title.fontSize;
      t.style.padding = title.padding;
    });
  }
  
  // Apply icon button styles
  if (iconButton) {
    const buttons = document.querySelectorAll('.icon-button');
    buttons.forEach(btn => {
      btn.style.background = iconButton.background;
      btn.style.borderRadius = iconButton.borderRadius;
      btn.style.padding = iconButton.padding;
      btn.style.display = iconButton.display;
      btn.style.alignItems = iconButton.alignItems;
      btn.style.justifyContent = iconButton.justifyContent;
    });
  }
  
  // Apply expand content styles
  if (expandContent) {
    const expandInners = document.querySelectorAll('.expand-inner');
    expandInners.forEach(inner => {
      inner.style.color = expandContent.color;
      inner.style.fontSize = expandContent.fontSize;
      inner.style.padding = expandContent.padding;
      inner.style.gap = expandContent.gap;
      inner.style.lineHeight = expandContent.lineHeight;
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
    // Apply base styles
    Object.assign(btn.style, button);

    // Hover and active states
    btn.addEventListener('mouseenter', () => {
      Object.assign(btn.style, buttonHover);
    });
    btn.addEventListener('mouseleave', () => {
      Object.assign(btn.style, button); // Revert to base
    });
    btn.addEventListener('mousedown', () => {
      Object.assign(btn.style, buttonActive);
    });
    btn.addEventListener('mouseup', () => {
      Object.assign(btn.style, buttonHover); // Revert to hover
    });

    // Handle disabled state
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
      
      // Update active button
      themeButtons.forEach(btn => btn.classList.remove('active'));
      e.currentTarget.classList.add('active');
      
      // Save to chrome.storage.local
      chrome.storage.local.set({ smtmPanelTheme: selectedTheme });

      // Notify content script to update theme
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: "applyTheme", theme: selectedTheme }, (response) => {
            if (chrome.runtime.lastError) {
              const errorMessage = chrome.runtime.lastError.message;
              // This error is expected if the content script is not yet injected
              if (errorMessage.includes('Receiving end does not exist')) {
                console.log('Content script not ready yet, or not on a supported page.');
              } else {
                console.error('Error sending message to content script:', errorMessage);
              }
            }
          });
        }
      });
    });
  });

  // Expandable sections
  const expandTriggers = document.querySelectorAll('[data-expand]');
  expandTriggers.forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      const targetId = e.currentTarget.getAttribute('data-expand');
      toggleExpand(targetId);
    });
  });

  // Teach Mode button
  const teachModeButton = document.querySelector('[data-section="teach-mode"] .menu-button');
  if (teachModeButton) {
    teachModeButton.addEventListener('click', () => {
      console.log('Popup: "Start detection" button clicked. Sending message to background.');
      chrome.runtime.sendMessage({ action: "startTeachMode" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Popup: Error sending message:', chrome.runtime.lastError.message);
        } else {
          console.log('Popup: Message sent successfully, response:', response);
        }
        window.close(); // Close the popup after sending the message
      });
    });
  }
}

// Toggle expand/collapse for sections
function toggleExpand(sectionId) {
  const content = document.querySelector(`[data-content="${sectionId}"]`);
  const iconButton = document.querySelector(`.icon-button[data-expand="${sectionId}"]`);
  
  if (!content || !iconButton) return;
  
  const isOpen = content.classList.contains('open');
  
  if (isOpen) {
    // Close
    content.classList.remove('open');
    iconButton.classList.remove('expanded');
  } else {
    // Open
    content.classList.add('open');
    iconButton.classList.add('expanded');
  }
}

// Setup theme state
function setupTheme() {
  const lightButton = document.querySelector('[data-theme="light"]');
  const darkButton = document.querySelector('[data-theme="dark"]');

  chrome.storage.local.get('smtmPanelTheme', (result) => {
    const currentTheme = result.smtmPanelTheme;

    if (!currentTheme) {
      // On first launch, set theme to 'light' but display 'dark' as active
      chrome.storage.local.set({ smtmPanelTheme: 'light' });
      darkButton.classList.add('active');
      lightButton.classList.remove('active');
    } else {
      // On subsequent launches, reflect the saved theme
      if (currentTheme === 'light') {
        lightButton.classList.add('active');
        darkButton.classList.remove('active');
      } else {
        darkButton.classList.add('active');
        lightButton.classList.remove('active');
      }
    }
  });
}

// Toggle expand/collapse for sections
function toggleExpand(sectionId) {
  const content = document.querySelector(`[data-content="${sectionId}"]`);
  const iconButton = document.querySelector(`.icon-button[data-expand="${sectionId}"]`);
  
  if (!content || !iconButton) return;
  
  const isOpen = content.classList.contains('open');
  
  if (isOpen) {
    // Close
    content.classList.remove('open');
    iconButton.classList.remove('expanded');
  } else {
    // Open
    content.classList.add('open');
    iconButton.classList.add('expanded');
  }
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

  // Enable the button by default
  resetButton.disabled = false;
  applyButtonStyles();

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
