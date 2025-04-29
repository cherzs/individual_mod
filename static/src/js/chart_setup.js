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
        document.dispatchEvent(new CustomEvent('chartjs_loaded'));
    };
    
    script.onerror = function() {
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

// Export a function to safely destroy a chart
export function safelyDestroyChart(canvasId) {
    try {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return false;
        
        // Check if Chart.js has a method to get chart by canvas
        if (typeof Chart !== 'undefined' && Chart.getChart) {
            const chart = Chart.getChart(canvas);
            if (chart) {
                chart.destroy();
                return true;
            }
        }
        
        // Fallback: try to clear the canvas
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        
        return false;
    } catch (error) {
        console.error(`Error safely destroying chart at canvas #${canvasId}:`, error);
        return false;
    }
} 