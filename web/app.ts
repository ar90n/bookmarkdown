import { Application } from './src/Application';
import './styles/main.css';

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new Application();
  app.init();
});

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('ServiceWorker registration successful:', registration);
      },
      (err) => {
        console.log('ServiceWorker registration failed:', err);
      }
    );
  });
}