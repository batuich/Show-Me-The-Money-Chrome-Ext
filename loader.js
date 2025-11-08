(async () => {
  const src = chrome.runtime.getURL('core/init.js');
  await import(src);
})();
