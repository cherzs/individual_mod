/**
 * Chart.js Loader 
 * Handles loading Chart.js and initializing charts for the dashboard
 */

(function() {
    // Chart.js CDN URL as fallback
    const CHART_CDN = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';
    
    // Keep track of load attempts
    let loadAttempts = 0;
    const MAX_ATTEMPTS = 3;
    
    // Initialization function
    function initCharts() {
        // Check if Chart.js is already available (from Odoo's asset bundle)
        if (typeof Chart !== 'undefined') {
            console.log('Chart.js already loaded - initializing charts');
            initDashboard();
            return;
        }
        
        // If not available and we haven't exceeded max attempts, try to load it
        if (loadAttempts < MAX_ATTEMPTS) {
            loadAttempts++;
            console.log(`Loading Chart.js from CDN (attempt ${loadAttempts})`);
            
            const script = document.createElement('script');
            script.src = CHART_CDN;
            script.async = true;
            
            script.onload = function() {
                console.log('Chart.js loaded successfully from CDN');
                initDashboard();
            };
            
            script.onerror = function() {
                console.error('Failed to load Chart.js from CDN');
                // Maybe try again with a delay
                setTimeout(initCharts, 1000);
            };
            
            document.head.appendChild(script);
        } else {
            console.error('Failed to load Chart.js after multiple attempts');
            // Show error message to user
            document.querySelectorAll('.o_dashboard_charts').forEach(el => {
                el.innerHTML = `
                    <div class="alert alert-danger">
                        <p>Failed to load Chart.js. Please refresh the page or check your network connection.</p>
                        <button class="btn btn-primary btn-sm mt-2" onclick="window.initCharts()">
                            Retry Loading Charts
                        </button>
                    </div>
                `;
            });
        }
    }
    
    // Initialize the dashboard
    function initDashboard() {
        // Check for chart data
        const chartDataEl = document.getElementById('chart_data');
        if (!chartDataEl) {
            console.log('No chart data element found');
            return;
        }
        
        try {
            // Parse the chart data from the embedded script tag
            const chartData = JSON.parse(chartDataEl.textContent || '{}');
            
            // Initialize dashboard controller
            if (!window.dashboardController) {
                window.dashboardController = new LibraryDashboardController();
                window.dashboardController.init(chartData);
            } else {
                window.dashboardController.loadChartData(chartData);
                window.dashboardController.renderCharts();
            }
            
            console.log('Dashboard initialization complete');
        } catch (e) {
            console.error('Error initializing dashboard:', e);
        }
    }
    
    // Make initialization function globally available
    window.initCharts = initCharts;
    
    // Initialize when the DOM is ready
    document.addEventListener('DOMContentLoaded', initCharts);
    
    // Expose function to manually init dashboard
    window.initDashboard = initDashboard;
})(); 