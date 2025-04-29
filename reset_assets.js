/**
 * Library Dashboard Reset Script
 * 
 * This script can be copied and pasted into the browser console
 * to reset the dashboard charts when they are not loading properly.
 * 
 * Instructions:
 * 1. Press F12 to open developer tools in your browser
 * 2. Go to the Console tab
 * 3. Copy and paste this entire script
 * 4. Press Enter to execute
 */

(function() {
    console.log("Resetting dashboard state...");
    
    // Clean up any existing chart instances
    if (window.Chart && window.Chart.instances) {
        Object.values(window.Chart.instances).forEach(chart => {
            try {
                if (chart && typeof chart.destroy === 'function') {
                    chart.destroy();
                    console.log("Destroyed a chart instance");
                }
            } catch (e) {
                console.error("Error destroying chart:", e);
            }
        });
    }
    
    // Remove any existing dashboard controllers
    window.dashboardController = null;
    
    // Reset initialization state
    document.querySelectorAll('.o_dashboard_charts').forEach(el => {
        el.removeAttribute('data-initialized');
        console.log("Reset initialization state on dashboard element");
    });
    
    // Dynamic load Chart.js if needed
    if (typeof Chart === 'undefined') {
        console.log("Loading Chart.js from CDN...");
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';
        script.onload = function() {
            console.log("Chart.js loaded successfully");
            
            // Initialize after a short delay
            setTimeout(initDashboard, 500);
        };
        script.onerror = function() {
            console.error("Failed to load Chart.js");
        };
        document.head.appendChild(script);
    } else {
        // Chart.js already loaded, initialize
        console.log("Chart.js already available, reinitializing...");
        setTimeout(initDashboard, 500);
    }
    
    function initDashboard() {
        // Try all available initialization methods
        if (window.initLibraryDashboard) {
            console.log("Using initLibraryDashboard()");
            window.initLibraryDashboard();
        } else if (window.initDashboard) {
            console.log("Using initDashboard()");
            window.initDashboard();
        } else if (window.initCharts) {
            console.log("Using initCharts()");
            window.initCharts();
        } else {
            console.error("No initialization methods available");
            alert("Dashboard initialization functions not found. Please reload the page.");
        }
    }
    
    console.log("Reset complete. If charts don't appear, try refreshing the page.");
})(); 