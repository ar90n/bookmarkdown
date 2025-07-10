document.addEventListener('DOMContentLoaded', async function() {
    const tabStatus = document.getElementById('tab-status');
    const openWebappBtn = document.getElementById('open-webapp-btn');

    // Get tab status from background script
    function updateTabStatus() {
        chrome.runtime.sendMessage({ action: 'getTabStatus' }, (response) => {
            if (response && response.tabInfo) {
                const { status } = response.tabInfo;
                
                if (status === 'success') {
                    tabStatus.textContent = 'OK';
                    tabStatus.className = 'status-value status-success';
                } else if (status === 'error') {
                    tabStatus.textContent = 'NG';
                    tabStatus.className = 'status-value status-error';
                } else {
                    tabStatus.textContent = 'Loading...';
                    tabStatus.className = 'status-value';
                }
            } else {
                tabStatus.textContent = 'NG';
                tabStatus.className = 'status-value status-error';
            }
        });
    }

    // Open BookMarkDown web app
    openWebappBtn.addEventListener('click', function() {
        chrome.tabs.create({ url: 'https://bookmarkdown.ar90n.net' });
        window.close();
    });

    // Initial status update
    updateTabStatus();
    
    // Update status every 2 seconds
    setInterval(updateTabStatus, 2000);
});