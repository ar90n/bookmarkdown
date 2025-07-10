// BookMarkDown - Content Script
// This script bridges the web app and the Chrome extension

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectExtensionInfo);
} else {
  injectExtensionInfo();
}

function injectExtensionInfo() {
  try {
    // Method 1: DOM attributes (works across contexts)
    document.documentElement.setAttribute('data-bookmarkdown-extension-id', chrome.runtime.id);
    document.documentElement.setAttribute('data-bookmarkdown-available', 'true');
    
    // Method 2: PostMessage to web app (works across contexts)
    window.postMessage({
      type: 'BOOKMARKDOWN_EXTENSION_READY',
      extensionId: chrome.runtime.id,
      available: true,
      source: 'bookmarkdown-content-script'
    }, '*');
    
    // Method 3: Try direct window assignment (may not work due to context)
    try {
      window.bookmarkdownExtensionAvailable = true;
      window.bookmarkdownExtensionId = chrome.runtime.id;
    } catch (windowError) {
      // Expected in some contexts
    }
    
    // Method 4: Try script injection as fallback
    try {
      const script = document.createElement('script');
      script.textContent = `
        window.bookmarkdownExtensionAvailable = true;
        window.bookmarkdownExtensionId = '${chrome.runtime.id}';
      `;
      (document.head || document.documentElement).appendChild(script);
      script.remove();
    } catch (scriptError) {
      // CSP may prevent this, but other methods should work
    }
    
  } catch (error) {
    console.error('Error injecting extension info:', error);
  }
}

// Listen for messages from the web app
window.addEventListener('message', async (event) => {
  if (event.source !== window) return;
  
  if (event.data.type === 'BOOKMARKDOWN_GET_TABS') {
    try {
      // Get tabs from chrome.storage.local via background script
      const response = await chrome.runtime.sendMessage({
        action: 'getAllTabs'
      });
      
      // Send response back to web app
      window.postMessage({
        type: 'BOOKMARKDOWN_TABS_RESPONSE',
        tabs: response.allTabsInfo || []
      }, '*');
    } catch (error) {
      console.error('Error getting tabs:', error);
      window.postMessage({
        type: 'BOOKMARKDOWN_TABS_ERROR',
        error: error.message
      }, '*');
    }
  }
});