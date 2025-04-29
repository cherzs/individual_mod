/** @odoo-module **/

import { waitForChartJs } from './chart_setup';

/**
 * Library Dashboard Charts
 * This script initializes and renders charts for the library dashboard using Chart.js
 */

// Controller for handling the dashboard charts
class LibraryDashboardController {
    constructor() {
        this.chartData = null;
        this.chartInstances = {};
        this.error = null;
        this.initialized = false;
        this._refreshing = false;
        this._renderAttempts = 0;
        this._initAttempts = 0;
        this._loadAttempts = 0;
    }
    
    async init() {
        try {
            if (this.initialized) return;
            
            // Limit maximum initialization attempts
            const MAX_INIT_ATTEMPTS = 3;
            
            // Increment init attempts
            this._initAttempts++;
            
            // Check if we've exceeded the maximum attempts
            if (this._initAttempts > MAX_INIT_ATTEMPTS) {
                console.error(`Exceeded maximum initialization attempts (${MAX_INIT_ATTEMPTS}). Aborting.`);
                
                // Display error message to user
                const dashboardEl = document.querySelector('.o_dashboard_charts');
                if (dashboardEl) {
                    dashboardEl.innerHTML = `
                        <div class="alert alert-danger">
                            <h4>Dashboard Initialization Error</h4>
                            <p>Failed to initialize dashboard after multiple attempts.</p>
                            <button class="btn btn-primary mt-2" onclick="location.reload()">Refresh Page</button>
                        </div>
                    `;
                }
                
                // Reset attempt counter for next time
                this._initAttempts = 0;
                return;
            }
            
            console.log(`Dashboard initialization attempt ${this._initAttempts} of ${MAX_INIT_ATTEMPTS}`);
            console.log("Initializing dashboard charts...");
            
            // Load Chart.js if not already loaded
            await waitForChartJs().catch(e => {
                console.error("Error loading Chart.js:", e);
                throw new Error("Failed to load Chart.js library: " + e.message);
            });
            
            // Verify Chart.js is actually available
            if (typeof Chart === 'undefined') {
                throw new Error("Chart.js was not properly loaded");
            }
            
            console.log("Chart.js loaded successfully");
            
            // Initialize chart instances storage
            this.chartInstances = {};
            
            // Clean up any existing charts
            this.cleanupAllChartInstances();
            
            // Force full width on all parent containers
            this.forceFullWidth();
            
            // Inject chart template and initialize
            this.injectChartTemplate();
            
            // Small delay to ensure DOM is fully ready
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Load chart data
            await this.loadChartData();
            
            this.initialized = true;
            this._initAttempts = 0; // Reset counter after successful initialization
            console.log("Dashboard initialization complete");
        } catch (error) {
            console.error("Dashboard initialization error:", error);
            this.error = error.message || "Initialization failed";
            
            // Try again with a limit
            if (this._initAttempts < MAX_INIT_ATTEMPTS) {
                console.log(`Retrying dashboard initialization (attempt ${this._initAttempts} of ${MAX_INIT_ATTEMPTS})...`);
                setTimeout(() => this.init(), 1000); // Longer delay for initialization retries
                return;
            }
            
            // Show error to user
            const dashboardEl = document.querySelector('.o_dashboard_charts');
            if (dashboardEl) {
                dashboardEl.innerHTML = `
                    <div class="alert alert-danger">
                        <h4>Dashboard Initialization Error</h4>
                        <p>${error.message || "Failed to initialize dashboard"}</p>
                        <button class="btn btn-primary mt-2" onclick="location.reload()">Refresh Page</button>
                    </div>
                `;
            }
            
            // Reset for future attempts
            this._initAttempts = 0;
        }
    }
    
    // Force full width on all parent containers
    forceFullWidth() {
        console.log("Forcing full width on dashboard containers");
        
        // List of selectors to apply full width to
        const fullWidthSelectors = [
            '.o_form_view',
            '.o_form_sheet',
            '.o_form_sheet_bg',
            '.oe_chart',
            '.o_notebook',
            '.tab-content',
            '.tab-pane'
        ];
        
        // Apply fullwidth to all selectors
        fullWidthSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                el.style.width = '100%';
                el.style.maxWidth = '100%';
                el.style.margin = '0';
                el.style.boxSizing = 'border-box';
                
                // Add our custom class
                el.classList.add('dashboard-full-width');
            });
        });
        
        // Apply special style to form view directly
        const formView = document.querySelector('.o_form_view');
        if (formView) {
            formView.style.maxWidth = 'none';
        }
        
        // Check if we need to add our own style tag
        if (!document.getElementById('dashboard-fullwidth-style')) {
            const style = document.createElement('style');
            style.id = 'dashboard-fullwidth-style';
            style.innerHTML = `
                .o_form_view .o_form_sheet_bg,
                .o_form_view .o_form_sheet,
                .o_notebook, .tab-content, .tab-pane,
                .oe_chart, .o_dashboard_charts,
                .o_dashboard_chart, .charts_container,
                .chart_row {
                    width: 100% !important;
                    max-width: 100% !important;
                    margin: 0 !important;
                    box-sizing: border-box !important;
                }
                
                .o_form_view.o_form_readonly {
                    max-width: none !important;
                }
                
                .chart_section {
                    flex: 1 !important;
                    min-width: 300px !important;
                    max-width: calc(50% - 10px) !important;
                    width: calc(50% - 10px) !important;
                    margin-bottom: 15px !important;
                }
                
                .chart_row {
                    display: flex !important;
                    flex-wrap: wrap !important;
                    justify-content: space-between !important;
                    width: 100% !important;
                    margin: 0 !important;
                }
                
                .charts_container {
                    width: 100% !important;
                    display: flex !important;
                    flex-direction: column !important;
                }
                
                @media (max-width: 768px) {
                    .chart_section {
                        max-width: 100% !important;
                        width: 100% !important;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    injectChartTemplate() {
        const dashboardContainer = document.querySelector('.o_dashboard_charts');
        if (!dashboardContainer) {
            console.error("Dashboard container not found");
            return;
        }
        
        // Add class to parent container to ensure full width
        const chartParent = dashboardContainer.closest('.oe_chart');
        if (chartParent) {
            chartParent.classList.add('full-width-chart');
            chartParent.style.width = '100%';
            chartParent.style.maxWidth = '100%';
            chartParent.style.padding = '0';
            chartParent.style.margin = '0';
        }
        
        // Try to find the form sheet and add full width class
        const formSheet = dashboardContainer.closest('.o_form_sheet');
        if (formSheet) {
            formSheet.classList.add('dashboard-full-width');
            formSheet.style.width = '100%';
            formSheet.style.maxWidth = '100%';
            formSheet.style.padding = '16px';
            formSheet.style.boxSizing = 'border-box';
        }
        
        // Also check for form sheet background
        const formSheetBg = dashboardContainer.closest('.o_form_sheet_bg');
        if (formSheetBg) {
            formSheetBg.classList.add('dashboard-full-width');
            formSheetBg.style.width = '100%';
            formSheetBg.style.maxWidth = '100%';
        }
        
        // Set dashboard container styles directly
        dashboardContainer.style.width = '100%';
        dashboardContainer.style.maxWidth = '100%';
        dashboardContainer.style.padding = '15px';
        dashboardContainer.style.boxSizing = 'border-box';
        
        // Insert the chart HTML
        dashboardContainer.innerHTML = `
            <div class="o_dashboard_chart full-width" style="width:100%; max-width:100%;">
                <div class="chart-actions text-center" style="margin-bottom:25px;">
                    <button class="btn btn-primary reload_charts_btn" onclick="if(window.reloadDashboard) window.reloadDashboard(); else if(window.refreshAllCharts) window.refreshAllCharts(); return false;">
                        <i class="fa fa-refresh mr-2"></i>Reload Charts
                    </button>
                </div>
                <div class="charts_container" style="width:100%; display:flex; flex-direction:column;">
                    <div class="chart_row" style="width:100%; display:flex; justify-content:space-between; margin-bottom:15px;">
                        <div class="chart_section" style="width:calc(50% - 8px); flex:1;">
                            <h3><i class="fa fa-line-chart mr-2"></i>Loan Trends</h3>
                            <canvas id="loanChart" style="height:250px;"></canvas>
                        </div>
                        <div class="chart_section" style="width:calc(50% - 8px); flex:1;">
                            <h3><i class="fa fa-pie-chart mr-2"></i>Book Categories</h3>
                            <canvas id="categoryChart" style="height:250px;"></canvas>
                        </div>
                    </div>
                    <div class="chart_row" style="width:100%; display:flex; justify-content:space-between; margin-bottom:15px;">
                        <div class="chart_section" style="width:calc(50% - 8px); flex:1;">
                            <h3><i class="fa fa-bar-chart mr-2"></i>Book Acquisitions</h3>
                            <canvas id="acquisitionsChart" style="height:250px;"></canvas>
                        </div>
                        <div class="chart_section" style="width:calc(50% - 8px); flex:1;">
                            <h3><i class="fa fa-pie-chart mr-2"></i>Loan Status</h3>
                            <canvas id="loanStatusChart" style="height:250px;"></canvas>
                        </div>
                    </div>
                    <div class="chart_row" style="width:100%; display:flex; justify-content:space-between; margin-bottom:15px;">
                        <div class="chart_section" style="width:calc(50% - 8px); flex:1;">
                            <h3><i class="fa fa-users mr-2"></i>Member Activities</h3>
                            <canvas id="memberActivitiesChart" style="height:250px;"></canvas>
                        </div>
                        <div class="chart_section" style="width:calc(50% - 8px); flex:1;">
                            <h3><i class="fa fa-circle-o-notch mr-2"></i>Book Condition</h3>
                            <canvas id="bookConditionChart" style="height:250px;"></canvas>
                        </div>
                    </div>
                    <div class="chart_row" style="width:100%; display:flex; justify-content:space-between; margin-bottom:15px;">
                        <div class="chart_section" style="width:calc(50% - 8px); flex:1;">
                            <h3><i class="fa fa-money mr-2"></i>Revenue by Month</h3>
                            <canvas id="revenueChart" style="height:250px;"></canvas>
                        </div>
                        <div class="chart_section" style="width:calc(50% - 8px); flex:1;">
                            <h3><i class="fa fa-clock-o mr-2"></i>Popular Reading Times</h3>
                            <canvas id="readingTimesChart" style="height:250px;"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    loadChartData() {
        return new Promise(async (resolve, reject) => {
            try {
                // Limit maximum load attempts
                const MAX_LOAD_ATTEMPTS = 3;
                
                // Increment load attempts
                this._loadAttempts++;
                
                // Check if we've exceeded the maximum attempts
                if (this._loadAttempts > MAX_LOAD_ATTEMPTS) {
                    console.error(`Exceeded maximum chart data loading attempts (${MAX_LOAD_ATTEMPTS}). Aborting.`);
                    this._loadAttempts = 0; // Reset for future attempts
                    reject(new Error(`Failed to load chart data after ${MAX_LOAD_ATTEMPTS} attempts`));
                    return;
                }
                
                console.log(`Chart data loading attempt ${this._loadAttempts} of ${MAX_LOAD_ATTEMPTS}`);
                
                // Find the dashboard element
                const dashboardEl = document.querySelector('.o_dashboard_charts');
                if (!dashboardEl) {
                    console.error("Dashboard element not found");
                    reject(new Error("Dashboard element not found"));
                    return;
                }
                
                // Try to fetch from the server - ALWAYS use server data
                try {
                    console.log("Fetching chart data from server");
                    await this.fetchDataFromServer();
                    this._loadAttempts = 0; // Reset counter after successful loading
                    resolve();
                    return; // Exit after successfully fetching from server
                } catch (error) {
                    console.error("Error fetching data from server:", error);
                    
                    // Attempt to find data in the DOM as fallback
                    console.log("Attempting to find data in DOM as fallback");
                    
                    // Find the graph_data field in various ways Odoo might render it
                    let graphDataValue = null;
                    
                    // Try all possible selectors for finding the data in the DOM
                    const graphDataSelectors = [
                        '.o_chart_data',
                        'input[name="graph_data"]',
                        'span[name="graph_data"]',
                        'textarea[name="graph_data"]',
                        '.o_field_text[name="graph_data"]',
                        '.o_field_widget[name="graph_data"]',
                        '[data-field="graph_data"]'
                    ];
                    
                    for (const selector of graphDataSelectors) {
                        const element = document.querySelector(selector);
                        if (element) {
                            graphDataValue = element.value || element.textContent;
                            if (graphDataValue) {
                                console.log(`Found graph_data via selector: ${selector}`);
                                break;
                            }
                        }
                    }
                    
                    // If we found data in the DOM, use it
                    if (graphDataValue) {
                        try {
                            this.chartData = JSON.parse(graphDataValue);
                            console.log("Successfully parsed chart data from DOM");
                            this._loadAttempts = 0; // Reset counter after successful loading
                            setTimeout(() => {
                                this.renderCharts();
                                resolve();
                            }, 300);
                            return;
                        } catch (parseError) {
                            console.error("Error parsing JSON data from DOM:", parseError);
                            // Continue to fallback data instead of rejecting
                        }
                    }
                    
                    // Last resort: Create dummy data so something displays
                    // This prevents the dashboard from crashing completely
                    console.warn("Using dummy data as fallback since API and DOM data are unavailable");
                    this.chartData = this._createDummyChartData();
                    
                    // Show notification about using demo data
                    const notification = document.createElement('div');
                    notification.className = 'alert alert-warning';
                    notification.innerHTML = `
                        <strong>Note:</strong> Using demonstration data. 
                        The server endpoint '/library/dashboard/data' could not be reached.
                        <button class="btn btn-sm btn-outline-primary float-right retry-fetch-btn">
                            Retry Connection
                        </button>
                    `;
                    dashboardEl.prepend(notification);
                    
                    // Add retry button functionality
                    const retryBtn = notification.querySelector('.retry-fetch-btn');
                    if (retryBtn) {
                        retryBtn.addEventListener('click', () => {
                            notification.innerHTML = '<div class="spinner-border spinner-border-sm"></div> Retrying connection...';
                            this.fetchDataFromServer()
                                .then(() => {
                                    notification.remove();
                                })
                                .catch(() => {
                                    notification.innerHTML = `
                                        <strong>Error:</strong> Still unable to connect to server.
                                        <button class="btn btn-sm btn-outline-primary float-right retry-fetch-btn">
                                            Retry Connection
                                        </button>
                                    `;
                                    // Re-attach event listener to new button
                                    const newRetryBtn = notification.querySelector('.retry-fetch-btn');
                                    if (newRetryBtn) {
                                        newRetryBtn.addEventListener('click', () => {
                                            window.location.reload();
                                        });
                                    }
                                });
                        });
                    }
                    
                    this._loadAttempts = 0; // Reset counter after fallback
                    setTimeout(() => {
                        this.renderCharts();
                        resolve();
                    }, 300);
                    return;
                }
            } catch (error) {
                console.error("Error loading chart data:", error);
                this.error = error.message || "Failed to load chart data";
                
                // Try again with a limit if there was an unexpected error
                if (this._loadAttempts < MAX_LOAD_ATTEMPTS) {
                    console.log(`Retrying chart data loading (attempt ${this._loadAttempts} of ${MAX_LOAD_ATTEMPTS})...`);
                    setTimeout(() => {
                        this.loadChartData()
                            .then(resolve)
                            .catch(reject);
                    }, 800);
                    return;
                }
                
                // Give up and reset counter
                this._loadAttempts = 0;
                reject(error);
            }
        });
    }
    
    // Create dummy chart data for fallback when server and DOM data are unavailable
    _createDummyChartData() {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        
        return {
            loan_trend: {
                labels: months,
                datasets: [{
                    label: 'Sample Book Loans',
                    data: [12, 19, 15, 22, 18, 25],
                    backgroundColor: 'rgba(26, 115, 232, 0.2)',
                    borderColor: 'rgba(26, 115, 232, 0.8)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }]
            },
            book_categories: {
                labels: ['Fiction', 'Science', 'History', 'Biography', 'Art'],
                datasets: [{
                    data: [30, 20, 15, 10, 25],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(153, 102, 255, 0.7)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            book_acquisitions: {
                labels: months,
                datasets: [{
                    label: 'Sample New Books',
                    data: [5, 8, 12, 7, 10, 15],
                    backgroundColor: 'rgba(66, 133, 244, 0.8)',
                    borderColor: 'rgba(66, 133, 244, 1)',
                    borderWidth: 1
                }]
            },
            loan_status: {
                labels: ['Active', 'Returned', 'Overdue', 'Lost'],
                datasets: [{
                    data: [45, 30, 15, 10],
                    backgroundColor: [
                        'rgba(52, 168, 83, 0.8)',
                        'rgba(66, 133, 244, 0.8)',
                        'rgba(251, 188, 5, 0.8)',
                        'rgba(234, 67, 53, 0.8)'
                    ],
                    borderColor: [
                        'rgba(52, 168, 83, 1)',
                        'rgba(66, 133, 244, 1)',
                        'rgba(251, 188, 5, 1)',
                        'rgba(234, 67, 53, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            member_activities: {
                labels: ['Loans', 'Returns', 'Overdue', 'Active Members', 'New Members'],
                datasets: [
                    {
                        label: 'Standard Members',
                        data: [65, 59, 20, 40, 10],
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        borderColor: 'rgba(54, 162, 235, 1)'
                    },
                    {
                        label: 'Premium Members',
                        data: [28, 25, 8, 15, 5],
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderColor: 'rgba(255, 99, 132, 1)'
                    }
                ]
            },
            book_condition: {
                labels: ['New', 'Good', 'Fair', 'Poor', 'Damaged'],
                datasets: [{
                    data: [35, 25, 20, 15, 5],
                    backgroundColor: [
                        'rgba(52, 168, 83, 0.8)',
                        'rgba(66, 133, 244, 0.8)',
                        'rgba(251, 188, 5, 0.8)',
                        'rgba(234, 67, 53, 0.8)',
                        'rgba(0, 0, 0, 0.5)'
                    ]
                }]
            },
            revenue: {
                labels: months,
                datasets: [{
                    label: 'Sample Revenue ($)',
                    data: [125, 150, 175, 200, 220, 250],
                    backgroundColor: 'rgba(0, 184, 169, 0.8)',
                    borderColor: 'rgba(0, 184, 169, 1)',
                    borderWidth: 1
                }]
            },
            reading_times: {
                labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                datasets: [
                    {
                        label: 'Weekday Borrows',
                        data: [12, 15, 18, 14, 16, 0, 0],
                        backgroundColor: 'rgba(103, 58, 183, 0.8)',
                        borderColor: 'rgba(103, 58, 183, 1)'
                    },
                    {
                        label: 'Weekend Borrows',
                        data: [0, 0, 0, 0, 0, 25, 30],
                        backgroundColor: 'rgba(186, 104, 200, 0.8)',
                        borderColor: 'rgba(186, 104, 200, 1)'
                    }
                ]
            }
        };
    }
    
    // New method to fetch data from the API endpoint
    fetchDataFromServer() {
        console.log("Fetching dashboard data from server API...");
        
        return new Promise((resolve, reject) => {
            // Use Odoo's built-in RPC call mechanism to fetch data from backend
            const fetchData = async () => {
                try {
                    // Try to use Odoo's RPC mechanism
                    let result;
                    
                    if (window.odoo && window.odoo.rpc) {
                        // Odoo 14+ RPC mechanism
                        console.log("Using Odoo RPC mechanism to fetch data");
                        result = await window.odoo.rpc({
                            route: '/library/dashboard/data',
                            params: {}
                        });
                    } else if (window.rpc) {
                        // Alternative RPC mechanism
                        console.log("Using window.rpc to fetch data");
                        result = await window.rpc('/library/dashboard/data', {});
                    } else {
                        // Fallback to jQuery AJAX for older Odoo versions
                        console.log("Using jQuery AJAX to fetch data");
                        result = await new Promise((resolve, reject) => {
                            $.ajax({
                                url: '/library/dashboard/data',
                                type: 'POST',
                                dataType: 'json',
                                contentType: 'application/json',
                                data: JSON.stringify({
                                    jsonrpc: "2.0",
                                    method: "call",
                                    params: {},
                                    id: new Date().getTime()
                                }),
                                success: function(response) {
                                    if (response.error) {
                                        reject(response.error);
                                    } else {
                                        resolve(response.result);
                                    }
                                },
                                error: function(jqXHR, textStatus, errorThrown) {
                                    reject(errorThrown || textStatus);
                                }
                            });
                        });
                    }
                    
                    console.log("Successfully received backend data:", result);
                    
                    if (result && result.status === 'success' && result.data) {
                        this.chartData = result.data;
                        
                        // Render charts after a small delay
                        setTimeout(() => {
                            this.renderCharts();
                            resolve();
                        }, 300);
                    } else if (result && result.data) {
                        // Direct data format
                        this.chartData = result.data;
                        setTimeout(() => {
                            this.renderCharts();
                            resolve();
                        }, 300);
                    } else {
                        console.error("Invalid response format from backend:", result);
                        reject(new Error("Invalid data format received from server"));
                    }
                } catch (error) {
                    console.error("Error fetching chart data from backend:", error);
                    reject(error);
                }
            };
            
            // Execute the fetch
            fetchData().catch(error => {
                console.error("Failed to fetch dashboard data:", error);
                reject(error);
            });
        });
    }
    
    renderCharts() {
        try {
            // Use retry counter to prevent infinite loops
            if (!this._renderAttempts) {
                this._renderAttempts = 0;
            }
            
            // Limit maximum render attempts to 3
            const MAX_RENDER_ATTEMPTS = 3;
            
            // Increment render attempts
            this._renderAttempts++;
            
            // Check if we've exceeded the maximum attempts
            if (this._renderAttempts > MAX_RENDER_ATTEMPTS) {
                console.error(`Exceeded maximum chart rendering attempts (${MAX_RENDER_ATTEMPTS}). Aborting.`);
                
                // Display error message to user
                const dashboardEl = document.querySelector('.o_dashboard_charts');
                if (dashboardEl) {
                    const errorMsg = document.createElement('div');
                    errorMsg.className = 'alert alert-danger mt-3';
                    errorMsg.innerHTML = `
                        <strong>Chart Rendering Error</strong>
                        <p>Failed to render charts after multiple attempts. Please try refreshing the page.</p>
                        <button class="btn btn-sm btn-primary mt-2" onclick="window.location.reload()">Refresh Page</button>
                    `;
                    dashboardEl.prepend(errorMsg);
                }
                
                // Reset attempt counter for next time
                this._renderAttempts = 0;
                return;
            }
            
            // Log the current attempt
            console.log(`Chart rendering attempt ${this._renderAttempts} of ${MAX_RENDER_ATTEMPTS}`);
            
            // Clear any previous renderings (but don't clear chartData)
            this.dashboardData = null;
            this.cleanupAllChartInstances();
            
            // Check if we have chart data
            if (!this.chartData) {
                console.error("Failed to load dashboard data");
                return;
            }
            
            console.log("Rendering charts with data:", this.chartData);
            
            // Render all charts with their respective render functions
            this.renderChartWithFallback('loan_trend', this.renderLoanTrendsChart.bind(this));
            this.renderChartWithFallback('book_categories', this.renderCategoriesChart.bind(this));
            this.renderChartWithFallback('book_acquisitions', this.renderAcquisitionsChart.bind(this));
            this.renderChartWithFallback('loan_status', this.renderLoanStatusChart.bind(this));
            this.renderChartWithFallback('member_activities', this.renderMemberActivitiesChart.bind(this));
            this.renderChartWithFallback('book_condition', this.renderBookConditionChart.bind(this));
            // Use 'revenue' key to match the backend data structure
            this.renderChartWithFallback('revenue', this.renderRevenueChart.bind(this));
            this.renderChartWithFallback('reading_times', this.renderReadingTimesChart.bind(this));
            
            // Setup resize handler
            this.handleResize();
            
            // Reset the attempts counter after successful rendering
            this._renderAttempts = 0;
            
        } catch (error) {
            console.error("Error rendering charts:", error);
            
            // If there was an error, wait a moment and try again (with limit)
            if (this._renderAttempts < MAX_RENDER_ATTEMPTS) {
                console.log(`Retrying chart rendering (attempt ${this._renderAttempts} of ${MAX_RENDER_ATTEMPTS})...`);
                setTimeout(() => this.renderCharts(), 500);
            } else {
                console.error(`Giving up after ${MAX_RENDER_ATTEMPTS} failed rendering attempts`);
                this._renderAttempts = 0; // Reset for future attempts
                
                // Show error to user
                const dashboardEl = document.querySelector('.o_dashboard_charts');
                if (dashboardEl) {
                    const errorMsg = document.createElement('div');
                    errorMsg.className = 'alert alert-danger mt-3';
                    errorMsg.innerHTML = `
                        <strong>Chart Rendering Error</strong>
                        <p>${error.message || 'Unknown error rendering charts'}</p>
                        <button class="btn btn-sm btn-primary mt-2" onclick="window.location.reload()">Refresh Page</button>
                    `;
                    dashboardEl.prepend(errorMsg);
                }
            }
        }
    }
    
    renderChartWithFallback(chartKey, renderFunction) {
        try {
            // Get the data for this chart
            const data = this.chartData[chartKey];
            
            // If data exists, render the chart
            if (data) {
                renderFunction(data);
            } else {
                console.warn(`Data for ${chartKey} not found. Check LibraryDashboard.py for missing chart data.`);
                
                // Display a message in the chart area
                const canvasId = this.getCanvasIdForChart(chartKey);
                if (canvasId) {
                    const canvas = document.getElementById(canvasId);
                    if (canvas) {
                        const section = canvas.closest('.chart_section');
                        if (section) {
                            section.innerHTML += `
                                <div class="chart-error mt-3">
                                    <p>No data available for this chart</p>
                                </div>
                            `;
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`Error rendering ${chartKey} chart:`, error);
            // Use the displayChartError method to show the error
            this.displayChartError(chartKey, error);
        }
    }
    
    getCanvasIdForChart(chartKey) {
        const mapping = {
            'loan_trend': 'loanChart',
            'book_categories': 'categoryChart',
            'book_acquisitions': 'acquisitionsChart',
            'loan_status': 'loanStatusChart',
            'member_activities': 'memberActivitiesChart',
            'book_condition': 'bookConditionChart',
            'revenue': 'revenueChart',
            'reading_times': 'readingTimesChart'
        };
        return mapping[chartKey];
    }
    
    /**
     * Display an error message for a chart
     * @param {string} chartKey - The key identifying the chart
     * @param {Error|string} error - The error object or message
     */
    displayChartError(chartKey, error) {
        console.error(`Error rendering ${chartKey} chart:`, error);
        // Find the canvas for this chart and show error
        const canvasId = this.getCanvasIdForChart(chartKey);
        if (canvasId) {
            const canvas = document.getElementById(canvasId);
            if (canvas) {
                const section = canvas.closest('.chart_section');
                if (section) {
                    // Create error div if it doesn't exist
                    let errorDiv = section.querySelector('.chart-error');
                    if (!errorDiv) {
                        errorDiv = document.createElement('div');
                        errorDiv.className = 'chart-error alert alert-danger mt-2';
                        section.appendChild(errorDiv);
                    }
                    
                    // Set error message
                    const errorMessage = error instanceof Error ? error.message : error.toString();
                    errorDiv.innerHTML = `
                        <p><i class="fa fa-exclamation-triangle mr-2"></i>Error rendering chart: ${errorMessage}</p>
                    `;
                }
            }
        }
    }
    
    // Handle window resize to adjust charts
    handleResize() {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        
        this.resizeTimeout = setTimeout(() => {
            // Only try to resize charts that are still valid
            if (this.chartInstances) {
                Object.entries(this.chartInstances).forEach(([id, chart]) => {
                    try {
                        // Check if chart instance exists and is valid
                        if (!chart || typeof chart.resize !== 'function') {
                            return;
                        }
                        
                        // Verify the chart's canvas is still in the DOM
                        const canvas = chart.canvas;
                        if (!canvas || !document.body.contains(canvas)) {
                            console.warn(`Chart canvas for ${id} is no longer in the DOM, cannot resize`);
                            return;
                        }
                        
                        // Make sure canvas has valid dimensions
                        if (canvas.offsetWidth <= 0 || canvas.offsetHeight <= 0) {
                            console.warn(`Chart canvas for ${id} has zero dimensions, cannot resize`);
                            return;
                        }
                        
                        // If we got this far, the chart should be safe to resize
                        chart.resize();
                    } catch (error) {
                        console.warn(`Error resizing chart ${id}:`, error);
                        // Remove reference to problematic chart to prevent future errors
                        delete this.chartInstances[id];
                    }
                });
            }
        }, 200);
    }
    
    // Render Revenue Chart
    renderRevenueChart(data) {
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        boxWidth: 10,
                        padding: 15,
                        usePointStyle: true,
                        font: {
                            size: 11,
                            family: "'Lato', 'Helvetica', 'Arial', sans-serif"
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(53, 73, 94, 0.9)',
                    titleFont: {
                        size: 12,
                        family: "'Lato', 'Helvetica', 'Arial', sans-serif"
                    },
                    bodyFont: {
                        size: 11,
                        family: "'Lato', 'Helvetica', 'Arial', sans-serif"
                    },
                    padding: 8,
                    cornerRadius: 4,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('en-US', { 
                                    style: 'currency', 
                                    currency: 'USD' 
                                }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 10,
                            family: "'Lato', 'Helvetica', 'Arial', sans-serif"
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        borderDash: [2, 2],
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        font: {
                            size: 10,
                            family: "'Lato', 'Helvetica', 'Arial', sans-serif"
                        },
                        callback: function(value) {
                            return '$' + value;
                        }
                    }
                }
            },
            elements: {
                bar: {
                    borderWidth: 1,
                    borderRadius: 3,
                    barThickness: 12,
                    maxBarThickness: 18
                }
            }
        };
        
        this.chartInstances.revenueChart = this.safelyCreateChart('revenueChart', 'bar', data, options);
    }
    
    // Render Reading Times Chart
    renderReadingTimesChart(data) {
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        boxWidth: 10,
                        padding: 15,
                        usePointStyle: true,
                        font: {
                            size: 11,
                            family: "'Lato', 'Helvetica', 'Arial', sans-serif"
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(53, 73, 94, 0.9)',
                    titleFont: {
                        size: 12,
                        family: "'Lato', 'Helvetica', 'Arial', sans-serif"
                    },
                    bodyFont: {
                        size: 11,
                        family: "'Lato', 'Helvetica', 'Arial', sans-serif"
                    },
                    padding: 8,
                    cornerRadius: 4
                }
            },
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 10,
                            family: "'Lato', 'Helvetica', 'Arial', sans-serif"
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        borderDash: [2, 2],
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        font: {
                            size: 10,
                            family: "'Lato', 'Helvetica', 'Arial', sans-serif"
                        }
                    }
                }
            },
            elements: {
                bar: {
                    borderWidth: 1,
                    borderRadius: 3,
                    barThickness: 10,
                    maxBarThickness: 15
                }
            }
        };
        
        this.chartInstances.readingTimesChart = this.safelyCreateChart('readingTimesChart', 'bar', data, options);
    }
    
    // Helper method to safely create a chart
    safelyCreateChart(canvasId, chartType, data, options) {
        try {
            // Add default options for better appearance
            const defaultOptions = {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 800
                },
                layout: {
                    padding: {
                        top: 10,
                        bottom: 10
                    }
                }
            };
            
            // Merge default options with provided options
            const mergedOptions = {
                ...defaultOptions,
                ...options
            };
            
            // Set a specific height for the chart
            const canvas = document.getElementById(canvasId);
            if (!canvas) {
                console.error(`Canvas element with ID '${canvasId}' not found`);
                return null;
            }
            
            canvas.style.height = '250px';
            canvas.height = 250;
            
            // IMPORTANT: Force destroy any existing Chart instance for this canvas
            // This addresses the "Canvas is already in use" error
            
            // 1. Check our own instance tracker
            const existingChart = this.chartInstances[canvasId];
            if (existingChart) {
                console.log(`Destroying existing chart for ${canvasId} from our tracker`);
                try {
                    existingChart.destroy();
                } catch (e) {
                    console.warn(`Error destroying chart from our tracker: ${e.message}`);
                }
                delete this.chartInstances[canvasId];
            }
            
            // 2. Check if there's a Chart instance in the Chart.js registry
            if (Chart.instances) {
                // Iterate through all Chart instances
                Object.values(Chart.instances).forEach(instance => {
                    if (instance.canvas && instance.canvas.id === canvasId) {
                        console.log(`Found dangling Chart instance (ID: ${instance.id}) for canvas ${canvasId}, destroying it`);
                        try {
                            instance.destroy();
                        } catch (e) {
                            console.warn(`Error destroying chart from Chart registry: ${e.message}`);
                        }
                    }
                });
            }
            
            // 3. As a last resort, clear the canvas context completely
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            
            // 4. Create a fresh canvas to replace the old one
            const parent = canvas.parentNode;
            if (parent) {
                const newCanvas = document.createElement('canvas');
                newCanvas.id = canvasId;
                newCanvas.style.height = '250px';
                newCanvas.height = 250;
                newCanvas.width = canvas.width;
                newCanvas.className = canvas.className;
                
                // Replace old canvas with new one
                parent.replaceChild(newCanvas, canvas);
                
                // Create new chart on the fresh canvas
                console.log(`Creating new chart for ${canvasId} on fresh canvas`);
                this.chartInstances[canvasId] = new Chart(
                    newCanvas,
                    {
                        type: chartType,
                        data: data,
                        options: mergedOptions
                    }
                );
            } else {
                // Fallback to using the original canvas if we can't replace it
                console.log(`Creating new chart for ${canvasId} (fallback method)`);
                this.chartInstances[canvasId] = new Chart(
                    canvas,
                    {
                        type: chartType,
                        data: data,
                        options: mergedOptions
                    }
                );
            }
            
            return this.chartInstances[canvasId];
        } catch (error) {
            console.error(`Error creating chart ${canvasId}:`, error);
            
            // Convert canvas ID to chart key
            const chartKeyMap = {
                'loanChart': 'loan_trend',
                'categoryChart': 'book_categories',
                'acquisitionsChart': 'book_acquisitions',
                'loanStatusChart': 'loan_status',
                'memberActivitiesChart': 'member_activities',
                'bookConditionChart': 'book_condition',
                'revenueChart': 'revenue',
                'readingTimesChart': 'reading_times'
            };
            
            const chartKey = chartKeyMap[canvasId] || canvasId;
            this.displayChartError(chartKey, 'Failed to create chart: ' + error.message);
            return null;
        }
    }
    
    // Render individual charts
    renderLoanTrendsChart(data) {
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        boxWidth: 10,
                        padding: 15,
                        usePointStyle: true,
                        font: {
                            size: 11,
                            family: "'Lato', 'Helvetica', 'Arial', sans-serif"
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(53, 73, 94, 0.9)',
                    titleFont: {
                        size: 12,
                        family: "'Lato', 'Helvetica', 'Arial', sans-serif"
                    },
                    bodyFont: {
                        size: 11,
                        family: "'Lato', 'Helvetica', 'Arial', sans-serif"
                    },
                    padding: 8,
                    cornerRadius: 4
                }
            },
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 10,
                            family: "'Lato', 'Helvetica', 'Arial', sans-serif"
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        borderDash: [2, 2],
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        font: {
                            size: 10,
                            family: "'Lato', 'Helvetica', 'Arial', sans-serif"
                        }
                    }
                }
            },
            elements: {
                line: {
                    tension: 0.4
                },
                point: {
                    radius: 3,
                    hoverRadius: 5
                }
            }
        };
        
        this.chartInstances.loanTrendsChart = this.safelyCreateChart('loanChart', 'line', data, options);
    }
    
    renderCategoriesChart(data) {
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    align: 'center',
                    labels: {
                        padding: 12,
                        usePointStyle: true,
                        boxWidth: 8,
                        font: {
                            size: 10,
                            family: "'Lato', 'Helvetica', 'Arial', sans-serif"
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(53, 73, 94, 0.9)',
                    titleFont: {
                        size: 12,
                        family: "'Lato', 'Helvetica', 'Arial', sans-serif"
                    },
                    bodyFont: {
                        size: 11,
                        family: "'Lato', 'Helvetica', 'Arial', sans-serif"
                    },
                    padding: 8,
                    cornerRadius: 4
                }
            }
        };
        
        this.chartInstances.categoriesChart = this.safelyCreateChart('categoryChart', 'pie', data, options);
    }
    
    renderAcquisitionsChart(data) {
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        boxWidth: 10,
                        padding: 15,
                        usePointStyle: true,
                        font: {
                            size: 11,
                            family: "'Lato', 'Helvetica', 'Arial', sans-serif"
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(53, 73, 94, 0.9)',
                    titleFont: {
                        size: 12,
                        family: "'Lato', 'Helvetica', 'Arial', sans-serif"
                    },
                    bodyFont: {
                        size: 11,
                        family: "'Lato', 'Helvetica', 'Arial', sans-serif"
                    },
                    padding: 8,
                    cornerRadius: 4
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 10,
                            family: "'Lato', 'Helvetica', 'Arial', sans-serif"
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        borderDash: [2, 2],
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        font: {
                            size: 10,
                            family: "'Lato', 'Helvetica', 'Arial', sans-serif"
                        }
                    }
                }
            },
            elements: {
                bar: {
                    borderWidth: 1,
                    borderRadius: 3,
                    barThickness: 20,
                    maxBarThickness: 30
                }
            }
        };
        
        this.chartInstances.acquisitionsChart = this.safelyCreateChart('acquisitionsChart', 'bar', data, options);
    }
    
    renderLoanStatusChart(data) {
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    align: 'center',
                    labels: {
                        padding: 12,
                        usePointStyle: true,
                        boxWidth: 8,
                        font: {
                            size: 10,
                            family: "'Lato', 'Helvetica', 'Arial', sans-serif"
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(53, 73, 94, 0.9)',
                    titleFont: {
                        size: 12,
                        family: "'Lato', 'Helvetica', 'Arial', sans-serif"
                    },
                    bodyFont: {
                        size: 11,
                        family: "'Lato', 'Helvetica', 'Arial', sans-serif"
                    },
                    padding: 8,
                    cornerRadius: 4
                }
            },
            cutout: '65%'
        };
        
        this.chartInstances.loanStatusChart = this.safelyCreateChart('loanStatusChart', 'doughnut', data, options);
    }
    
    renderMemberActivitiesChart(data) {
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        boxWidth: 10,
                        padding: 15,
                        usePointStyle: true,
                        font: {
                            size: 11,
                            family: "'Lato', 'Helvetica', 'Arial', sans-serif"
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(53, 73, 94, 0.9)',
                    titleFont: {
                        size: 12,
                        family: "'Lato', 'Helvetica', 'Arial', sans-serif"
                    },
                    bodyFont: {
                        size: 11,
                        family: "'Lato', 'Helvetica', 'Arial', sans-serif"
                    },
                    padding: 8,
                    cornerRadius: 4
                }
            },
            scales: {
                r: {
                    angleLines: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        backdropColor: 'transparent',
                        font: {
                            size: 9
                        }
                    },
                    pointLabels: {
                        font: {
                            size: 10,
                            family: "'Lato', 'Helvetica', 'Arial', sans-serif"
                        }
                    }
                }
            },
            elements: {
                line: {
                    borderWidth: 2
                },
                point: {
                    radius: 3,
                    hoverRadius: 5
                }
            }
        };
        
        this.chartInstances.memberActivitiesChart = this.safelyCreateChart('memberActivitiesChart', 'radar', data, options);
    }
    
    renderBookConditionChart(data) {
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    align: 'center',
                    labels: {
                        padding: 12,
                        usePointStyle: true,
                        boxWidth: 8,
                        font: {
                            size: 10,
                            family: "'Lato', 'Helvetica', 'Arial', sans-serif"
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(53, 73, 94, 0.9)',
                    titleFont: {
                        size: 12,
                        family: "'Lato', 'Helvetica', 'Arial', sans-serif"
                    },
                    bodyFont: {
                        size: 11,
                        family: "'Lato', 'Helvetica', 'Arial', sans-serif"
                    },
                    padding: 8,
                    cornerRadius: 4
                }
            },
            scales: {
                r: {
                    ticks: {
                        backdropColor: 'transparent',
                        font: {
                            size: 9
                        }
                    }
                }
            }
        };
        
        this.chartInstances.bookConditionChart = this.safelyCreateChart('bookConditionChart', 'polarArea', data, options);
    }
    
    // Function to refresh all charts
    refreshAllCharts() {
        console.log("Refreshing all charts...");
        
        // Ensure full width is applied
        this.forceFullWidth();
        
        // Check if refresh is already in progress
        if (this._refreshing) {
            console.log("Chart refresh already in progress, ignoring request");
            return;
        }
        
        this._refreshing = true;
        
        // Show loading indicator
        const dashboardEl = document.querySelector('.o_dashboard_charts');
        if (dashboardEl) {
            const loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'text-center p-3 refresh-indicator';
            loadingIndicator.innerHTML = '<div class="spinner-border text-primary" role="status"></div><p class="mt-2">Refreshing charts...</p>';
            dashboardEl.appendChild(loadingIndicator);
            
            // Update button state if it exists
            const reloadBtn = document.querySelector('.reload_charts_btn');
            if (reloadBtn) {
                reloadBtn.disabled = true;
                reloadBtn.textContent = 'Refreshing...';
            }
        }
        
        // Destroy existing charts - thorough cleanup
        this.cleanupAllChartInstances();
        
        // Clear chart data to force reload
        this.chartData = null;
        
        // Use the refresh endpoint to force backend recalculation
        const refreshData = async () => {
            try {
                // Try to use Odoo's RPC mechanism to call the refresh endpoint
                let result;
                
                if (window.odoo && window.odoo.rpc) {
                    // Odoo 14+ RPC mechanism
                    console.log("Using Odoo RPC mechanism to refresh data");
                    result = await window.odoo.rpc({
                        route: '/library/dashboard/refresh',
                        params: {}
                    });
                } else if (window.rpc) {
                    // Alternative RPC mechanism
                    console.log("Using window.rpc to refresh data");
                    result = await window.rpc('/library/dashboard/refresh', {});
                } else {
                    // Fallback to jQuery AJAX for older Odoo versions
                    console.log("Using jQuery AJAX to refresh data");
                    result = await new Promise((resolve, reject) => {
                        $.ajax({
                            url: '/library/dashboard/refresh',
                            type: 'POST',
                            dataType: 'json',
                            contentType: 'application/json',
                            data: JSON.stringify({
                                jsonrpc: "2.0",
                                method: "call",
                                params: {},
                                id: new Date().getTime()
                            }),
                            success: function(response) {
                                if (response.error) {
                                    reject(response.error);
                                } else {
                                    resolve(response.result);
                                }
                            },
                            error: function(jqXHR, textStatus, errorThrown) {
                                reject(errorThrown || textStatus);
                            }
                        });
                    });
                }
                
                console.log("Successfully refreshed data:", result);
                
                if (result && result.status === 'success' && result.data) {
                    this.chartData = result.data;
                    
                    // Remove loading indicator
                    const indicator = document.querySelector('.refresh-indicator');
                    if (indicator) indicator.remove();
                    
                    // Update button state
                    const reloadBtn = document.querySelector('.reload_charts_btn');
                    if (reloadBtn) {
                        reloadBtn.disabled = false;
                        reloadBtn.textContent = 'Reload Charts';
                    }
                    
                    // Render the charts with fresh data
                    setTimeout(() => {
                        this.renderCharts();
                        this._refreshing = false;
                    }, 300);
                    
                    return;
                } else if (result && result.data) {
                    // Direct data format
                    this.chartData = result.data;
                    
                    // Remove loading indicator
                    const indicator = document.querySelector('.refresh-indicator');
                    if (indicator) indicator.remove();
                    
                    // Update button state
                    const reloadBtn = document.querySelector('.reload_charts_btn');
                    if (reloadBtn) {
                        reloadBtn.disabled = false;
                        reloadBtn.textContent = 'Reload Charts';
                    }
                    
                    // Render the charts with fresh data
                    setTimeout(() => {
                        this.renderCharts();
                        this._refreshing = false;
                    }, 300);
                    
                    return;
                } else {
                    throw new Error("Invalid response format from backend");
                }
            } catch (error) {
                console.error("Error refreshing data:", error);
                
                // Fallback to regular fetch if refresh fails
                this.fetchDataFromServer()
                    .then(() => {
                        // Remove loading indicator
                        const indicator = document.querySelector('.refresh-indicator');
                        if (indicator) indicator.remove();
                        
                        // Update button state
                        const reloadBtn = document.querySelector('.reload_charts_btn');
                        if (reloadBtn) {
                            reloadBtn.disabled = false;
                            reloadBtn.textContent = 'Reload Charts';
                        }
                        
                        this._refreshing = false;
                    })
                    .catch(fetchError => {
                        console.error("Error fetching chart data after refresh failed:", fetchError);
                        
                        // Remove loading indicator
                        const indicator = document.querySelector('.refresh-indicator');
                        if (indicator) indicator.remove();
                        
                        // Update button state and show error
                        const reloadBtn = document.querySelector('.reload_charts_btn');
                        if (reloadBtn) {
                            reloadBtn.disabled = false;
                            reloadBtn.textContent = 'Retry Refresh';
                        }
                        
                        // Show error message
                        const dashboardEl = document.querySelector('.o_dashboard_charts');
                        if (dashboardEl) {
                            dashboardEl.innerHTML += `
                                <div class="alert alert-danger">
                                    <p>Error refreshing charts: ${error.message}</p>
                                </div>
                            `;
                        }
                        
                        this._refreshing = false;
                    });
            }
        };
        
        // Execute the refresh
        refreshData();
    }
    
    // New method to thoroughly clean up all chart instances
    cleanupAllChartInstances() {
        console.log("Thoroughly cleaning up all chart instances...");
        
        // 1. Clean up our tracked instances
        if (this.chartInstances) {
            Object.entries(this.chartInstances).forEach(([id, chart]) => {
                if (chart && typeof chart.destroy === 'function') {
                    try {
                        console.log(`Destroying chart instance for ${id}`);
                        chart.destroy();
                    } catch (e) {
                        console.warn(`Error destroying chart ${id}:`, e);
                    }
                }
            });
            this.chartInstances = {};
        }
        
        // 2. Clean up any global Chart.js instances
        if (typeof Chart !== 'undefined' && Chart.instances) {
            Object.values(Chart.instances).forEach(instance => {
                try {
                    console.log(`Destroying global Chart.js instance (ID: ${instance.id})`);
                    instance.destroy();
                } catch (e) {
                    console.warn(`Error destroying global chart instance:`, e);
                }
            });
        }
        
        // 3. As a last resort, replace all chart canvases with fresh ones
        const canvasIds = [
            'loanChart', 'categoryChart', 'acquisitionsChart', 
            'loanStatusChart', 'memberActivitiesChart', 'bookConditionChart',
            'revenueChart', 'readingTimesChart'
        ];
        
        canvasIds.forEach(id => {
            const canvas = document.getElementById(id);
            if (canvas && canvas.parentNode) {
                const newCanvas = document.createElement('canvas');
                newCanvas.id = id;
                newCanvas.className = canvas.className;
                newCanvas.style.height = canvas.style.height || '250px';
                newCanvas.height = canvas.height || 250;
                newCanvas.width = canvas.width;
                
                console.log(`Replacing canvas element for ${id}`);
                canvas.parentNode.replaceChild(newCanvas, canvas);
            }
        });
    }
}

// Make LibraryDashboardController available globally
window.LibraryDashboardController = LibraryDashboardController;

// Patch Chart.js resize to prevent getComputedStyle errors
function patchChartJsResize() {
    if (typeof Chart !== 'undefined' && Chart.prototype) {
        const originalResize = Chart.prototype.resize;
        
        Chart.prototype.resize = function() {
            try {
                // Check if canvas is valid before resizing
                if (!this.canvas || !document.body.contains(this.canvas)) {
                    console.warn('Attempted to resize a chart with invalid canvas, skipping resize');
                    return;
                }
                
                // Only call original resize if canvas has dimensions
                if (this.canvas.offsetWidth > 0 && this.canvas.offsetHeight > 0) {
                    return originalResize.apply(this, arguments);
                } else {
                    console.warn('Canvas has no dimensions, skipping resize');
                }
            } catch (e) {
                console.warn('Error in patched resize method:', e);
                // Do nothing, just prevent error from bubbling up
            }
        };
        
        console.log('Successfully patched Chart.js resize method');
    }
}

// Initialize the dashboard charts
function initDashboard() {
    const dashboardController = new LibraryDashboardController();
    
    console.log("Starting dashboard initialization check...");
    
    // Try to initialize immediately if the element is already available
    const dashboardEl = document.querySelector('.o_dashboard_charts');
    if (dashboardEl) {
        console.log("Dashboard element found immediately, initializing charts...");
        dashboardController.init();
        
        // Add a cleanup handler for window unload
        window.addEventListener('beforeunload', () => {
            console.log("Cleaning up chart instances before page unload");
            // Safely destroy all charts to prevent memory leaks
            if (dashboardController.chartInstances) {
                Object.entries(dashboardController.chartInstances).forEach(([id, chart]) => {
                    try {
                        if (chart && typeof chart.destroy === 'function') {
                            chart.destroy();
                        }
                    } catch (e) {
                        console.warn(`Error destroying chart ${id} during unload:`, e);
                    }
                });
            }
        });
        
        // Also clean up on view changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                console.log("Page hidden, cleaning up charts");
                dashboardController.cleanupAllChartInstances();
            }
        });
        
        return;
    }
    
    // Otherwise set up polling to check for the element
    console.log("Dashboard element not found yet, setting up polling...");
    let checkCount = 0;
    const checkInterval = setInterval(() => {
        checkCount++;
        const dashboardEl = document.querySelector('.o_dashboard_charts');
        
        // Also try alternative selectors that might exist
        const alternativeSelectors = [
            '.oe_chart',
            '.o_form_view .oe_chart',
            '.o_content .o_form_view .oe_chart',
            '[name="graph_data"]'
        ];
        
        let elementFound = !!dashboardEl;
        
        // Check alternative selectors if main one not found
        if (!elementFound) {
            for (const selector of alternativeSelectors) {
                const el = document.querySelector(selector);
                if (el) {
                    elementFound = true;
                    console.log(`Found alternative dashboard element using selector: ${selector}`);
                    // Create a dashboard charts container if it doesn't exist
                    if (!document.querySelector('.o_dashboard_charts')) {
                        const container = document.createElement('div');
                        container.className = 'o_dashboard_charts';
                        el.appendChild(container);
                    }
                    break;
                }
            }
        }
        
        if (elementFound) {
            clearInterval(checkInterval);
            console.log("Dashboard element found on attempt " + checkCount + ", initializing charts...");
            dashboardController.init();
            window.currentDashboardController = dashboardController;
        } else if (checkCount >= 20) {
            clearInterval(checkInterval);
            console.warn("Gave up looking for dashboard element after 20 attempts");
        }
    }, 300);
    
    // Stop checking after 10 seconds to prevent infinite polling
    setTimeout(() => {
        clearInterval(checkInterval);
    }, 10000);
}

// Store the current controller globally for access in events
window.currentDashboardController = null;

// Initialize on both DOM content loaded and when view changes (Odoo specific)
document.addEventListener('DOMContentLoaded', () => {
    // Apply Chart.js patch
    patchChartJsResize();
    
    // Initialize dashboard
    initDashboard();
    
    // Set up observer for view changes
    const targetNode = document.body;
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.addedNodes && mutation.addedNodes.length) {
                for (const node of mutation.addedNodes) {
                    if (node.classList && 
                        (node.classList.contains('o_form_view') || 
                         node.classList.contains('o_content') ||
                         node.querySelector('.o_dashboard_charts'))) {
                        console.log("View change detected, checking for dashboard...");
                        
                        // Clean up any existing dashboard before initializing a new one
                        if (window.currentDashboardController) {
                            try {
                                window.currentDashboardController.cleanupAllChartInstances();
                            } catch (e) {
                                console.warn("Error cleaning up previous dashboard:", e);
                            }
                        }
                        
                        // Initialize with a delay to ensure DOM is ready
                        setTimeout(() => {
                            const dashboardController = new LibraryDashboardController();
                            window.currentDashboardController = dashboardController;
                            dashboardController.init();
                        }, 500);
                        break;
                    }
                }
            }
        }
    });
    
    observer.observe(targetNode, { childList: true, subtree: true });
});

// Add a global reload function for the button
window.refreshAllCharts = function() {
    if (window.currentDashboardController) {
        window.currentDashboardController.refreshAllCharts();
    } else {
        console.warn("No active dashboard controller found, creating new one");
        const dashboardController = new LibraryDashboardController();
        window.currentDashboardController = dashboardController;
        dashboardController.init().then(() => {
            dashboardController.refreshAllCharts();
        });
    }
};

// Export for testing and global access
window.initLibraryDashboard = initDashboard; 