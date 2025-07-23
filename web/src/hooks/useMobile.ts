import { useState, useEffect } from 'react';

// Helper to check if we're on server (SSR)
const isServer = typeof window === 'undefined';

// Initial mobile detection for better first render
const getInitialMobileState = () => {
  if (isServer) {
    return false; // Default to false on server
  }
  
  // Check on client immediately
  const isSmallScreen = window.innerWidth < 768;
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  return isSmallScreen || isTouchDevice;
};

export const useMobile = () => {
  // Use function to get initial state to avoid SSR mismatch
  const [isMobile, setIsMobile] = useState(() => getInitialMobileState());

  useEffect(() => {
    const checkMobile = () => {
      // Check both screen size and touch capability
      const isSmallScreen = window.innerWidth < 768;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsMobile(isSmallScreen || isTouchDevice);
    };

    // Check on mount (in case initial was wrong)
    checkMobile();

    // Add resize listener
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  return isMobile;
};