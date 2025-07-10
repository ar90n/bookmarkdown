// BookMarkDown - Background Script
// Automatically captures tab information and stores it for web app access

// Store current tab information
let currentTabInfo = {
    url: null,
    title: null,
    timestamp: null,
    status: 'waiting'
};

// Update tab info in storage
async function updateTabInfo(tab) {
    if (!tab || !tab.url) {
        currentTabInfo = {
            url: null,
            title: null,
            timestamp: Date.now(),
            status: 'error'
        };
    } else {
        currentTabInfo = {
            url: tab.url,
            title: tab.title || 'Untitled',
            timestamp: Date.now(),
            status: 'success'
        };
    }
    
    // Save to storage for web app access
    await chrome.storage.local.set({ currentTabInfo });
}

// Handle tab activation (when user switches tabs)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        await updateTabInfo(tab);
    } catch (error) {
        console.error('Error getting active tab:', error);
        await updateTabInfo(null);
    }
});

// Handle tab updates (when tab URL or title changes)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' || changeInfo.url) {
        try {
            // Only update if this is the active tab
            const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (activeTab && activeTab.id === tabId) {
                await updateTabInfo(tab);
            }
        } catch (error) {
            console.error('Error updating tab info:', error);
            await updateTabInfo(null);
        }
    }
});

// Handle window focus changes
chrome.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        // No window focused
        return;
    }
    
    try {
        const [activeTab] = await chrome.tabs.query({ active: true, windowId: windowId });
        if (activeTab) {
            await updateTabInfo(activeTab);
        }
    } catch (error) {
        console.error('Error handling window focus:', error);
        await updateTabInfo(null);
    }
});

// Initialize on startup
chrome.runtime.onStartup.addListener(async () => {
    try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await updateTabInfo(activeTab);
        await updateAllTabsInfo();
    } catch (error) {
        console.error('Error initializing on startup:', error);
        await updateTabInfo(null);
        await updateAllTabsInfo();
    }
});

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
    try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await updateTabInfo(activeTab);
        await updateAllTabsInfo();
    } catch (error) {
        console.error('Error initializing on install:', error);
        await updateTabInfo(null);
        await updateAllTabsInfo();
    }
});

// Update all tabs info for web app import
async function updateAllTabsInfo() {
    try {
        const tabs = await chrome.tabs.query({});
        
        const validTabs = tabs.filter(tab => 
            tab.url && 
            !tab.url.startsWith('chrome://') && 
            !tab.url.startsWith('about:') &&
            !tab.url.startsWith('edge://') &&
            !tab.url.startsWith('moz-extension://') &&
            !tab.url.startsWith('chrome-extension://')
        );
        
        const allTabsInfo = validTabs.map(tab => ({
            title: tab.title || 'Untitled',
            url: tab.url,
            id: tab.id,
            windowId: tab.windowId
        }));
        
        await chrome.storage.local.set({ allTabsInfo });
    } catch (error) {
        console.error('Error updating all tabs info:', error);
        await chrome.storage.local.set({ allTabsInfo: [] });
    }
}

// Update all tabs info when tabs change
chrome.tabs.onCreated.addListener(updateAllTabsInfo);
chrome.tabs.onRemoved.addListener(updateAllTabsInfo);
chrome.tabs.onUpdated.addListener(updateAllTabsInfo);
chrome.tabs.onActivated.addListener(updateAllTabsInfo);

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getTabStatus') {
        sendResponse({ tabInfo: currentTabInfo });
    } else if (request.action === 'getAllTabs') {
        chrome.storage.local.get(['allTabsInfo']).then(result => {
            sendResponse({ allTabsInfo: result.allTabsInfo || [] });
        });
        return true; // Keep the message channel open for async response
    }
});