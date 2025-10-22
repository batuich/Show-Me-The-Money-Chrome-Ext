# Show Me The Money - Chrome Extension

This extension automatically summarizes credit usage on the Cursor AI spending page (`https://cursor.com/spending`) and can be extended to work on other websites with tabular numeric data.

## Testing Instructions (macOS)

1.  **Open Chrome Extensions:**
    *   Navigate to `chrome://extensions` in your Chrome browser.

2.  **Enable Developer Mode:**
    *   In the top right corner of the Extensions page, toggle the "Developer mode" switch to the "on" position.

3.  **Load the Extension:**
    *   Click the "Load unpacked" button that appears on the left side of the page.
    *   In the file selection dialog, navigate to and select the project folder containing this `README.md` file.

4.  **Test on Cursor's Spending Page:**
    *   Visit `https://cursor.com/spending`. The "Show Me The Money" panel should appear automatically.

5.  **Inspect Stored Data:**
    *   Open Chrome DevTools (`Cmd + Option + I`).
    *   Go to the "Application" tab.
    *   In the left-hand menu, expand "Local Storage" and select the `https://cursor.com` entry. You should see the `transactionHistory` and `panelPosition` keys with their corresponding data.

6.  **Verify Persistence:**
    *   Reload the `cursor.com/spending` page. The panel should reappear, and the total should be calculated from the stored history.
    *   Drag the panel to a new position. Reload the page again to confirm the position is saved.

## How It Works

*   **`content.js`**: The main script that runs on the specified pages. It orchestrates the parsing of data and the creation of the UI.
*   **`utils/domParser.js`**: Contains the logic for finding and extracting data from the transaction table on the page.
*   **`utils/storage.js`**: A set of helper functions for interacting with `localStorage` to save and retrieve transaction history and the panel's position.
*   **`utils/uiHelpers.js`**: Functions for dynamically creating the floating panel, calendar, and other UI elements.
*   **`themes.json`**: A JSON file that defines the color schemes and styles for the extension's UI.
*   **`manifest.json`**: The core configuration file for the Chrome extension.
