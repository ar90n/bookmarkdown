// Determine the target URL based on environment
function getRedirectUrl() {
    // Check if we're in development environment
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    return 'https://bookmarkdown.ar90n.net';
}

// Redirect after a short delay to show the loading screen
const redirectUrl = getRedirectUrl();

// Update manual link
document.getElementById('manual-link').href = redirectUrl;

// Auto redirect after 1.5 seconds
setTimeout(() => {
    window.location.href = redirectUrl;
}, 1500);