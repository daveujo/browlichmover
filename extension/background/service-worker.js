// Background Service Worker
// Simplified - Engines now run in content script context

console.log('[Background] Service worker started');

// Storage helpers
chrome.storage.local.get(null, (items) => {
  console.log('[Background] Current storage:', items);
});

// Message handler for storage and non-engine operations
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] Message received:', message.type);
  
  switch (message.type) {
    case 'GET_STORAGE':
      chrome.storage.local.get(message.keys, (result) => {
        sendResponse(result);
      });
      return true; // Keep channel open for async response
      
    case 'SET_STORAGE':
      chrome.storage.local.set(message.data, () => {
        sendResponse({ success: true });
      });
      return true;
      
    case 'CLEAR_STORAGE':
      chrome.storage.local.clear(() => {
        sendResponse({ success: true });
      });
      return true;
      
    default:
      console.log('[Background] Unknown message type:', message.type);
  }
  
  return false;
});

console.log('[Background] ✅ Service worker initialized');
