chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background: Message received', request);
  if (request.action === "startTeachMode") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        const tabId = tabs[0].id;
        console.log(`Background: Injecting teachMode.js into tab ${tabId}`);
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ["utils/tableParser.js", "teachMode.js"]
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('Background: Error injecting script:', chrome.runtime.lastError.message);
            sendResponse({ status: "error", message: chrome.runtime.lastError.message });
          } else {
            console.log("Background: teachMode.js injected successfully.");
            sendResponse({ status: "success" });
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
