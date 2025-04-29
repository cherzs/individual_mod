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
    
    // Store the dashboard controller instance
    let dashboardController = null;
    
    // Initialization function
    function initCharts() {
        // Make sure LibraryDashboardController is defined
        if (typeof LibraryDashboardController === 'undefined') {
            console.error('LibraryDashboardController is not defined, checking for global availability');
            
            // Try to find the class through the window object
            if (window.LibraryDashboardController) {
                console.log('Found LibraryDashboardController in window object');
                window.LibraryDashboardController = window.LibraryDashboardController;
            } else if (window.initLibraryDashboard) {
                console.log('Using initLibraryDashboard function instead');
                window.initLibraryDashboard();
                return;
            } else {
                console.error('LibraryDashboardController not found, trying to load dashboard directly');
                // Attempt to directly initialize the dashboard
                const dashboardInit = document.createElement('script');
                dashboardInit.textContent = `
                    try { 
                        if (window.initDashboard) window.initDashboard();
                        else console.error('Dashboard initialization functions not found');
                    } catch (e) { 
                        console.error('Error in direct dashboard init:', e);
                    }
                `;
                document.head.appendChild(dashboardInit);
                return;
            }
        }
        
        // Initialize on appropriate elements
        document.querySelectorAll('.o_dashboard_charts').forEach(el => {
            if (el.getAttribute('data-initialized') !== 'true') {
                console.log('Initializing charts on element:', el);
                el.setAttribute('data-initialized', 'true');
                
                // Create loading indicator
                const loadingIndicator = document.createElement('div');
                loadingIndicator.className = 'text-center p-3';
                loadingIndicator.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="sr-only">Loading charts...</span></div><p class="mt-2">Loading charts...</p>';
                el.appendChild(loadingIndicator);
                
                // Load Chart.js and initialize
                loadChartJs()
                    .then(() => {
                        // Remove loading indicator
                        loadingIndicator.remove();
                        
                        try {
                            // Check again if LibraryDashboardController is available
                            if (typeof LibraryDashboardController === 'undefined') {
                                console.error('LibraryDashboardController still not defined after loading Chart.js');
                                
                                // Add manual init button
                                el.innerHTML = `
                                    <div class="alert alert-warning">
                                        <p>Dashboard controller not available. Click the button below to try alternative initialization.</p>
                                        <button class="btn btn-primary mt-2" onclick="window.initLibraryDashboard ? window.initLibraryDashboard() : (window.initDashboard ? window.initDashboard() : alert('Dashboard initialization not available'))">
                                            Initialize Dashboard
                                        </button>
                                    </div>
                                `;
                                return;
                            }
                            
                            // Initialize dashboard controller
                            if (!dashboardController) {
                                console.log('Creating new dashboard controller');
                                dashboardController = new LibraryDashboardController();
                                dashboardController.init();
                            } else {
                                console.log('Using existing dashboard controller');
                                dashboardController.init();
                            }
                        } catch (e) {
                            console.error('Error initializing dashboard controller:', e);
                            el.innerHTML = `
                                <div class="alert alert-danger">
                                    <p>Error initializing dashboard: ${e.message}</p>
                                    <button class="btn btn-primary mt-2" onclick="location.reload()">
                                        Reload Page
                                    </button>
                                </div>
                            `;
                        }
                    })
                    .catch(error => {
                        // Handle error
                        loadingIndicator.remove();
                        console.error('Failed to initialize charts:', error);
                        el.innerHTML = `
                            <div class="alert alert-danger">
                                <p>Failed to load charts: ${error.message}</p>
                                <button class="btn btn-primary mt-2" onclick="window.initCharts()">
                                    Retry Loading Charts
                                </button>
                            </div>
                        `;
                    });
            }
        });
    }
    
    // Load Chart.js from CDN
    function loadChartJs() {
        return new Promise((resolve, reject) => {
            // If Chart.js is already available, resolve immediately
            if (typeof Chart !== 'undefined') {
                console.log('Chart.js already loaded');
                resolve();
                return;
            }
            
            // If we've exceeded max attempts, reject
            if (loadAttempts >= MAX_ATTEMPTS) {
                reject(new Error('Failed to load Chart.js after multiple attempts'));
                return;
            }
            
            // Increment attempts and try to load
            loadAttempts++;
            console.log(`Loading Chart.js from CDN (attempt ${loadAttempts})`);
            
            const script = document.createElement('script');
            script.src = CHART_CDN;
            script.async = true;
            
            script.onload = function() {
                console.log('Chart.js loaded successfully from CDN');
                resolve();
            };
            
            script.onerror = function() {
                console.error('Failed to load Chart.js from CDN');
                reject(new Error('Failed to load Chart.js from CDN'));
            };
            
            document.head.appendChild(script);
        });
    }
    
    // Function to manually reload the dashboard
    function reloadDashboard() {
        if (dashboardController) {
            console.log('Manually reloading dashboard');
            dashboardController.refreshAllCharts();
        } else {
            console.log('No dashboard controller to reload, initializing charts');
            initCharts();
        }
    }
    
    // Make functions globally available
    window.initCharts = initCharts;
    window.reloadDashboard = reloadDashboard;
    
    // Initialize when DOM is ready or when view changes in Odoo
    document.addEventListener('DOMContentLoaded', function() {
        initCharts();
        
        // Set up mutation observer to detect when Odoo changes views
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                    // Check for dashboard view being added
                    for (let i = 0; i < mutation.addedNodes.length; i++) {
                        const node = mutation.addedNodes[i];
                        if (node.nodeType === 1 && node.querySelector) {
                            const dashboardEl = node.querySelector('.o_dashboard_charts');
                            if (dashboardEl) {
                                console.log('Dashboard view detected, initializing charts');
                                setTimeout(initCharts, 500);
                                break;
                            }
                        }
                    }
                }
            });
        });
        
        // Start observing the body for changes
        observer.observe(document.body, { 
            childList: true,
            subtree: true
        });
    });
})(); 