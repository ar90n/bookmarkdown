// BookMarkDown - Popup Script
import { ExtensionAppContext } from './bookmark-app-context.js';

document.addEventListener('DOMContentLoaded', async function() {
    const addBookmarkBtn = document.getElementById('add-bookmark-btn');
    const openNewtabBtn = document.getElementById('open-newtab-btn');
    const syncBtn = document.getElementById('sync-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const status = document.getElementById('status');

    // Initialize app context
    const appContext = new ExtensionAppContext();
    await appContext.initialize();
    const authContext = appContext.getAuthContext();
    const bookmarkContext = appContext.getBookmarkContext();

    // Add current page as bookmark
    addBookmarkBtn.addEventListener('click', async function() {
        try {
            if (!authContext.isAuthenticated) {
                showStatus('Please sign in first');
                return;
            }

            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Add to "Quick Saves" category/bundle
            await bookmarkContext.addCategory('Quick Saves');
            await bookmarkContext.addBundle('Quick Saves', 'From Popup');
            
            const result = await bookmarkContext.addBookmark('Quick Saves', 'From Popup', {
                title: tab.title,
                url: tab.url,
                tags: ['popup'],
                notes: 'Added from popup'
            });
            
            if (result.success) {
                await bookmarkContext.syncWithRemote();
                showStatus('Bookmark added and synced!');
            } else {
                showStatus('Failed to add bookmark');
            }
            
            // Close popup after a short delay
            setTimeout(() => {
                window.close();
            }, 1500);
        } catch (error) {
            console.error('Error adding bookmark:', error);
            showStatus('Error adding bookmark');
        }
    });

    // Open new tab page
    openNewtabBtn.addEventListener('click', function() {
        chrome.tabs.create({ url: 'chrome://newtab/' });
        window.close();
    });

    // Sync with GitHub
    syncBtn.addEventListener('click', async function() {
        if (!authContext.isAuthenticated) {
            showStatus('Please sign in first');
            return;
        }

        syncBtn.disabled = true;
        syncBtn.textContent = '🔄 Syncing...';
        
        try {
            const result = await bookmarkContext.syncWithRemote();
            
            if (result.success) {
                showStatus('Sync completed!');
                syncBtn.textContent = '✅ Synced';
            } else {
                showStatus('Sync failed');
                syncBtn.textContent = '❌ Sync Failed';
            }
            
            setTimeout(() => {
                syncBtn.textContent = '🔄 Sync';
                syncBtn.disabled = false;
            }, 2000);
        } catch (error) {
            console.error('Sync error:', error);
            showStatus('Sync failed');
            syncBtn.textContent = '❌ Sync Failed';
            
            setTimeout(() => {
                syncBtn.textContent = '🔄 Sync';
                syncBtn.disabled = false;
            }, 2000);
        }
    });

    // Open bookmarks (redirect to new tab)
    settingsBtn.addEventListener('click', function() {
        chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html') });
        window.close();
    });

    function showStatus(message) {
        status.textContent = message;
        status.style.display = 'block';
        
        setTimeout(() => {
            status.style.display = 'none';
        }, 3000);
    }

    // Initialize - check auth status
    if (authContext.isAuthenticated) {
        showStatus('Ready to bookmark!');
        settingsBtn.textContent = '📂 Open Bookmarks';
    } else {
        showStatus('Sign in to get started');
        settingsBtn.textContent = '🔑 Sign In';
    }
});