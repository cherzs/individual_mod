/** @odoo-module **/

/**
 * Chart.js Setup
 * This file ensures Chart.js is loaded and available globally
 */

// Ensure Chart.js is loaded
(function() {
    // Check if Chart.js is already loaded
    if (typeof Chart !== 'undefined') {
        console.log("Chart.js is already loaded");
        return;
    }
    
    console.log("Loading Chart.js from CDN...");
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';
    script.async = false; // Make sure it loads synchronously
    
    script.onload = function() {
        console.log("Chart.js loaded successfully");
        // Dispatch an event that can be listened for
        document.dispatchEvent(new CustomEvent('chartjs_loaded'));
    };
    
    script.onerror = function() {
        console.error("Failed to load Chart.js from CDN");
    };
    
    // Add to head
    document.head.appendChild(script);
})();

// Export a function to wait for Chart.js to be loaded
export function waitForChartJs() {
    return new Promise((resolve, reject) => {
        if (typeof Chart !== 'undefined') {
            resolve(Chart);
            return;
        }
        
        // Set a timeout to reject the promise after 5 seconds
        const timeout = setTimeout(() => {
            reject(new Error("Chart.js loading timed out"));
        }, 5000);
        
        // Listen for the custom event
        document.addEventListener('chartjs_loaded', () => {
            clearTimeout(timeout);
            if (typeof Chart !== 'undefined') {
                resolve(Chart);
            } else {
                reject(new Error("Chart.js failed to load"));
            }
        }, { once: true });
    });
} 