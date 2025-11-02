chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background: Message received', request);
  
  if (request.action === "startTeachMode") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        const tabId = tabs[0].id;
        console.log(`Background: Injecting Teach Mode assets into tab ${tabId}`);

        // Inject CSS first
        chrome.scripting.insertCSS({
          target: { tabId: tabId },
          files: ["teachTooltip.css"]
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('Background: Error injecting CSS:', chrome.runtime.lastError.message);
            // We can still try to inject JS
          } else {
            console.log("Background: teachTooltip.css injected successfully.");
          }

          // Then inject JS files
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ["utils/tableParser.js", "teachTooltip.js", "teachMode.js"]
          }, () => {
            if (chrome.runtime.lastError) {
              console.error('Background: Error injecting scripts:', chrome.runtime.lastError.message);
              sendResponse({ status: "error", message: chrome.runtime.lastError.message });
            } else {
              console.log("Background: Scripts injected successfully.");
              sendResponse({ status: "success" });
            }
          });
        });
      } else {
        console.error("Background: No active tab found.");
        sendResponse({ status: "error", message: "No active tab found." });
      }
    });
    return true; // Indicates that the response is sent asynchronously
  }
  
  if (request.action === "stopTeachMode") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        const tabId = tabs[0].id;
        console.log(`Background: Stopping Teach Mode in tab ${tabId}`);

        // Execute cleanup function
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: () => {
            if (typeof window.SMTM_cleanupTeachMode === 'function') {
              window.SMTM_cleanupTeachMode();
              return { status: 'success', message: 'Teach Mode stopped' };
            } else {
              return { status: 'error', message: 'Cleanup function not found' };
            }
          }
        }, (results) => {
          if (chrome.runtime.lastError) {
            console.error('Background: Error stopping Teach Mode:', chrome.runtime.lastError.message);
            sendResponse({ status: "error", message: chrome.runtime.lastError.message });
          } else {
            const result = results && results[0] && results[0].result;
            console.log("Background: Teach Mode stopped:", result);
            sendResponse(result || { status: "success" });
          }
        });
      } else {
        console.error("Background: No active tab found.");
        sendResponse({ status: "error", message: "No active tab found." });
      }
    });
    return true; // Indicates that the response is sent asynchronously
  }
});
