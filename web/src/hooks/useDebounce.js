import { useCallback, useEffect, useRef } from 'react';
/**
 * Custom hook that debounces a callback function
 * @param callback The function to debounce
 * @param delay The delay in milliseconds
 * @returns A debounced version of the callback
 */
export function useDebounce(callback, delay) {
    const timeoutRef = useRef(null);
    const callbackRef = useRef(callback);
    // Update callback ref on each render
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);
    const debouncedCallback = useCallback((...args) => {
        // Clear existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        // Set new timeout
        timeoutRef.current = setTimeout(() => {
            callbackRef.current(...args);
        }, delay);
    }, [delay]);
    return debouncedCallback;
}
//# sourceMappingURL=useDebounce.js.map