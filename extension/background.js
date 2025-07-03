// Background script for Chrome extension
// This handles background tasks and manages the bookmark service

chrome.runtime.onInstalled.addListener(() => {
  console.log('BookMarkDown extension installed');
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getBookmarks') {
    // Get bookmarks from storage
    chrome.storage.sync.get(['bookmarkData'], (result) => {
      sendResponse({ success: true, data: result.bookmarkData || null });
    });
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'saveBookmarks') {
    // Save bookmarks to storage
    chrome.storage.sync.set({ bookmarkData: request.data }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Context menu for quick bookmark addition
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'addBookmark',
    title: 'Add to BookMarkDown',
    contexts: ['page', 'link']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'addBookmark') {
    const url = info.linkUrl || info.pageUrl;
    const title = tab.title || 'Untitled';
    
    // Send to popup or new tab page
    chrome.runtime.sendMessage({
      action: 'quickAdd',
      bookmark: { title, url }
    });
  }
});