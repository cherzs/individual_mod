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
            
            // Dashboard initialization attempt
            
            // Load Chart.js if not already loaded
            await waitForChartJs().catch(e => {
                console.error("Error loading Chart.js:", e);
                throw new Error("Failed to load Chart.js library: " + e.message);
            });
            
            // Verify Chart.js is actually available
            if (typeof Chart === 'undefined') {
                throw new Error("Chart.js was not properly loaded");
            }
            
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
        } catch (error) {
            console.error("Dashboard initialization error:", error);
            this.error = error.message || "Initialization failed";
            
            // Try again with a limit
            if (this._initAttempts < MAX_INIT_ATTEMPTS) {
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
                
                // Find the dashboard element
                const dashboardEl = document.querySelector('.o_dashboard_charts');
                if (!dashboardEl) {
                    console.error("Dashboard element not found");
                    reject(new Error("Dashboard element not found"));
                    return;
                }
                
                // Try to fetch from the server - ALWAYS use server data
                try {
                    await this.fetchDataFromServer();
                    this._loadAttempts = 0; // Reset counter after successful loading
                    resolve();
                    return; // Exit after successfully fetching from server
                } catch (error) {
                    console.error("Error fetching data from server:", error);
                    
                    // Attempt to find data in the DOM as fallback
                    
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
                                break;
                            }
                        }
                    }
                    
                    // If we found data in the DOM, use it
                    if (graphDataValue) {
                        try {
                            this.chartData = JSON.parse(graphDataValue);
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
        return new Promise((resolve, reject) => {
            try {
                const fetchData = async () => {
                    try {
                        // Check if we're inside Odoo's environment
                        let result;
                        
                        if (typeof odoo !== 'undefined' && odoo.define) {
                            // Attempt to use Odoo's RPC mechanism
                            try {
                                if (typeof this._rpc !== 'undefined') {
                                    result = await this._rpc({
                                        route: '/library/dashboard/data',
                                        params: {}
                                    });
                                } else if (typeof window._rpc !== 'undefined') {
                                    result = await window._rpc({
                                        route: '/library/dashboard/data',
                                        params: {}
                                    });
                                } else if (typeof window.rpc !== 'undefined') {
                                    result = await window.rpc(
                                        '/library/dashboard/data', 
                                        {}
                                    );
                                } else {
                                    // Fallback to jQuery AJAX if Odoo's RPC not available
                                    result = await $.ajax({
                                        url: '/library/dashboard/data',
                                        type: 'POST',
                                        data: JSON.stringify({}),
                                        contentType: 'application/json',
                                        dataType: 'json'
                                    });
                                }
                            } catch (rpcError) {
                                console.error("RPC error:", rpcError);
                                reject(rpcError);
                                return;
                            }
                        } else {
                            // Fallback to regular fetch API
                            const response = await fetch('/library/dashboard/data', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({}),
                            });
                            
                            if (!response.ok) {
                                throw new Error(`Server responded with status: ${response.status}`);
                            }
                            
                            result = await response.json();
                        }
                        
                        if (!result || !result.success) {
                            reject(new Error("Server returned an error or invalid data"));
                            return;
                        }
                        
                        // Parse and store the data
                        this.chartData = result.data;
                        
                        // Update the UI immediately
                        this.renderCharts();
                        
                        resolve(result);
                    } catch (error) {
                        console.error("Error in fetchData:", error);
                        reject(error);
                    }
                };
                
                fetchData();
            } catch (error) {
                console.error("Error setting up fetch:", error);
                reject(error);
            }
        });
    }
    
    renderCharts() {
        return new Promise(async (resolve, reject) => {
            try {
                // Limit maximum render attempts
                const MAX_RENDER_ATTEMPTS = 3;
                
                // Increment render attempts
                this._renderAttempts++;
                
                // Check if we've exceeded the maximum attempts
                if (this._renderAttempts > MAX_RENDER_ATTEMPTS) {
                    console.error(`Exceeded maximum chart rendering attempts (${MAX_RENDER_ATTEMPTS}). Aborting.`);
                    this._renderAttempts = 0; // Reset for future attempts
                    reject(new Error(`Failed to render charts after ${MAX_RENDER_ATTEMPTS} attempts`));
                    return;
                }
                
                // Make sure we have data to render
                if (!this.chartData) {
                    console.error("No chart data available for rendering");
                    reject(new Error("No chart data available"));
                    return;
                }
                
                // Clear any previous errors and reset chart instances
                this.error = null;
                
                // Render each chart, handling errors individually
                // Each chart is rendered with a fallback mechanism
                await Promise.allSettled([
                    this.renderChartWithFallback('loanTrends', () => this.renderLoanTrendsChart(this.chartData.loanTrends)),
                    this.renderChartWithFallback('categories', () => this.renderCategoriesChart(this.chartData.categories)),
                    this.renderChartWithFallback('acquisitions', () => this.renderAcquisitionsChart(this.chartData.acquisitions)),
                    this.renderChartWithFallback('loanStatus', () => this.renderLoanStatusChart(this.chartData.loanStatus)),
                    this.renderChartWithFallback('memberActivities', () => this.renderMemberActivitiesChart(this.chartData.memberActivities)),
                    this.renderChartWithFallback('bookCondition', () => this.renderBookConditionChart(this.chartData.bookCondition)),
                    this.renderChartWithFallback('revenue', () => this.renderRevenueChart(this.chartData.revenue)),
                    this.renderChartWithFallback('readingTimes', () => this.renderReadingTimesChart(this.chartData.readingTimes))
                ]);
                
                // Setup resize handling
                this.handleResize();
                
                // Reset attempt counter after successful rendering
                this._renderAttempts = 0;
                
                resolve();
            } catch (error) {
                console.error("Error rendering charts:", error);
                this.error = error.message || "Failed to render charts";
                
                // Try again with a limit
                if (this._renderAttempts < MAX_RENDER_ATTEMPTS) {
                    setTimeout(() => {
                        this.renderCharts()
                            .then(resolve)
                            .catch(reject);
                    }, 800); // Wait before retrying
                    return;
                }
                
                reject(error);
            }
        });
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
            // First find the canvas to check if it exists
            const canvas = document.getElementById(canvasId);
            if (!canvas) {
                console.error(`Canvas element not found for ${canvasId}`);
                return null;
            }
            
            // Check for existing chart instance and destroy it
            if (this.chartInstances[canvasId]) {
                // If chart is already created, destroy it first
                try {
                    this.chartInstances[canvasId].destroy();
                    // Remove from our tracker
                } catch (destroyError) {
                    console.error(`Error destroying existing chart for ${canvasId}:`, destroyError);
                }
                
                // Remove from our tracker after destroy attempt
                delete this.chartInstances[canvasId];
            }
            
            // Also check the global Chart.instances for any dangling chart with this canvas
            if (window.Chart && window.Chart.instances) {
                Object.values(window.Chart.instances).forEach(instance => {
                    if (instance.canvas && instance.canvas.id === canvasId) {
                        try {
                            instance.destroy();
                        } catch (e) {
                            console.error(`Error destroying Chart.js instance for ${canvasId}:`, e);
                        }
                    }
                });
            }
            
            // Clean up the canvas to ensure a fresh start
            const parentNode = canvas.parentNode;
            const canvasHeight = canvas.height;
            const canvasWidth = canvas.width;
            const canvasClasses = canvas.className;
            const canvasStyle = canvas.getAttribute('style');
            
            // Remove and recreate the canvas to ensure a fresh start
            parentNode.removeChild(canvas);
            
            const newCanvas = document.createElement('canvas');
            newCanvas.id = canvasId;
            newCanvas.height = canvasHeight;
            newCanvas.width = canvasWidth;
            newCanvas.className = canvasClasses;
            if (canvasStyle) {
                newCanvas.setAttribute('style', canvasStyle);
            }
            
            // Add the new canvas back to the DOM
            parentNode.appendChild(newCanvas);
            
            // Create the chart with the right context
            let chartInstance;
            try {
                const ctx = newCanvas.getContext('2d');
                chartInstance = new Chart(ctx, {
                    type: chartType,
                    data: data,
                    options: options
                });
                
                // Store the instance for future reference
                this.chartInstances[canvasId] = chartInstance;
                
                return chartInstance;
            } catch (chartError) {
                console.error(`Error creating chart for ${canvasId}:`, chartError);
                
                // Fallback method if the normal approach doesn't work
                try {
                    // Try again with a simpler approach
                    const context = newCanvas.getContext('2d');
                    context.clearRect(0, 0, canvas.width, canvas.height);
                    
                    chartInstance = new Chart(context, {
                        type: chartType,
                        data: data,
                        options: options
                    });
                    
                    // Store the instance for future reference
                    this.chartInstances[canvasId] = chartInstance;
                    
                    return chartInstance;
                } catch (fallbackError) {
                    console.error(`Fallback chart creation also failed for ${canvasId}:`, fallbackError);
                    return null;
                }
            }
        } catch (error) {
            console.error(`Fatal error creating chart ${canvasId}:`, error);
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
        return new Promise(async (resolve, reject) => {
            // Prevent multiple refreshes running simultaneously
            if (this._refreshing) {
                console.warn("Chart refresh already in progress, ignoring request");
                return resolve();
            }
            
            this._refreshing = true;
            
            try {
                // Backup current data in case refresh fails
                const backupData = this.chartData ? JSON.parse(JSON.stringify(this.chartData)) : null;
                
                // Show loading indicator on all chart canvases
                const chartContainers = document.querySelectorAll('.chart_section');
                chartContainers.forEach(container => {
                    const loadingOverlay = document.createElement('div');
                    loadingOverlay.className = 'chart-loading-overlay';
                    loadingOverlay.innerHTML = `
                        <div class="spinner-border text-primary" role="status">
                            <span class="sr-only">Loading...</span>
                        </div>
                    `;
                    loadingOverlay.style.position = 'absolute';
                    loadingOverlay.style.top = '0';
                    loadingOverlay.style.left = '0';
                    loadingOverlay.style.right = '0';
                    loadingOverlay.style.bottom = '0';
                    loadingOverlay.style.backgroundColor = 'rgba(255,255,255,0.7)';
                    loadingOverlay.style.display = 'flex';
                    loadingOverlay.style.justifyContent = 'center';
                    loadingOverlay.style.alignItems = 'center';
                    loadingOverlay.style.zIndex = '10';
                    
                    // Make container position relative for absolute positioning of overlay
                    container.style.position = 'relative';
                    container.appendChild(loadingOverlay);
                });
                
                // Function to actually get the fresh data
                const refreshData = async () => {
                    try {
                        let result;
                        
                        // Check for available RPC methods
                        if (typeof this._rpc !== 'undefined') {
                            result = await this._rpc({
                                route: '/library/dashboard/data',
                                params: { refresh: true }
                            });
                        } else if (typeof window._rpc !== 'undefined') {
                            result = await window._rpc({
                                route: '/library/dashboard/data',
                                params: { refresh: true }
                            });
                        } else if (typeof window.rpc !== 'undefined') {
                            result = await window.rpc(
                                '/library/dashboard/data', 
                                { refresh: true }
                            );
                        } else {
                            // Fallback to jQuery AJAX if rpc not available
                            result = await $.ajax({
                                url: '/library/dashboard/data',
                                type: 'POST',
                                data: JSON.stringify({ refresh: true }),
                                contentType: 'application/json',
                                dataType: 'json'
                            });
                        }
                        
                        if (!result || !result.success) {
                            throw new Error("Server returned an error or invalid data");
                        }
                        
                        // Store the new data
                        this.chartData = result.data;
                        
                        // Re-render all charts with new data
                        await this.renderCharts();
                        
                        return result;
                    } catch (error) {
                        console.error("Error refreshing data:", error);
                        throw error;
                    }
                };
                
                try {
                    await refreshData();
                } catch (error) {
                    console.error("Error during refresh:", error);
                    
                    // Restore backup data if refresh failed
                    if (backupData) {
                        this.chartData = backupData;
                        await this.renderCharts();
                    }
                    
                    // Show error message to user
                    const errorToast = document.createElement('div');
                    errorToast.className = 'alert alert-danger alert-dismissible fade show';
                    errorToast.setAttribute('role', 'alert');
                    errorToast.style.position = 'fixed';
                    errorToast.style.top = '20px';
                    errorToast.style.right = '20px';
                    errorToast.style.zIndex = '9999';
                    errorToast.innerHTML = `
                        <strong>Error refreshing charts:</strong> ${error.message || "Unknown error"}
                        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    `;
                    document.body.appendChild(errorToast);
                    
                    // Remove toast after 5 seconds
                    setTimeout(() => {
                        if (errorToast.parentNode) {
                            errorToast.parentNode.removeChild(errorToast);
                        }
                    }, 5000);
                    
                    // Allow interaction with close button
                    const closeBtn = errorToast.querySelector('.close');
                    if (closeBtn) {
                        closeBtn.addEventListener('click', () => {
                            if (errorToast.parentNode) {
                                errorToast.parentNode.removeChild(errorToast);
                            }
                        });
                    }
                }
                
                // Remove loading overlays
                document.querySelectorAll('.chart-loading-overlay').forEach(overlay => {
                    if (overlay.parentNode) {
                        overlay.parentNode.removeChild(overlay);
                    }
                });
                
                this._refreshing = false;
                resolve();
            } catch (error) {
                console.error("Fatal error during chart refresh:", error);
                
                // Remove loading overlays even if there was an error
                document.querySelectorAll('.chart-loading-overlay').forEach(overlay => {
                    if (overlay.parentNode) {
                        overlay.parentNode.removeChild(overlay);
                    }
                });
                
                this._refreshing = false;
                reject(error);
            }
        });
    }
    
    // New method to thoroughly clean up all chart instances
    cleanupAllChartInstances() {
        try {
            // Destroy all chart instances we're tracking
            Object.entries(this.chartInstances).forEach(([id, instance]) => {
                try {
                    if (instance && typeof instance.destroy === 'function') {
                        instance.destroy();
                    }
                } catch (e) {
                    console.error(`Error destroying chart instance for ${id}:`, e);
                }
            });
            
            // Reset tracked instances
            this.chartInstances = {};
            
            // Also look for any global Chart.js instances that may exist
            if (window.Chart && window.Chart.instances) {
                Object.values(window.Chart.instances).forEach(instance => {
                    try {
                        if (instance && typeof instance.destroy === 'function') {
                            instance.destroy();
                        }
                    } catch (e) {
                        console.error(`Error destroying global Chart.js instance (ID: ${instance.id}):`, e);
                    }
                });
            }
            
            // In some cases, Chart.js doesn't properly clean up - force clean known canvases
            const canvasIds = [
                'loanChart',
                'categoryChart',
                'acquisitionsChart',
                'loanStatusChart',
                'memberActivitiesChart',
                'bookConditionChart',
                'revenueChart',
                'readingTimesChart'
            ];
            
            // Replace all canvas elements to ensure clean state
            canvasIds.forEach(id => {
                const canvas = document.getElementById(id);
                if (canvas) {
                    const parent = canvas.parentNode;
                    const width = canvas.width;
                    const height = canvas.height;
                    const style = canvas.getAttribute('style') || '';
                    const className = canvas.className;
                    
                    // Create a replacement canvas
                    const newCanvas = document.createElement('canvas');
                    newCanvas.id = id;
                    newCanvas.width = width;
                    newCanvas.height = height;
                    newCanvas.className = className;
                    newCanvas.setAttribute('style', style);
                    
                    // Replace the old canvas
                    if (parent) {
                        parent.replaceChild(newCanvas, canvas);
                    }
                }
            });
            
            return true;
        } catch (error) {
            console.error("Error cleaning up chart instances:", error);
            return false;
        }
    }
}

// Make LibraryDashboardController available globally
window.LibraryDashboardController = LibraryDashboardController;

// Patch Chart.js resize to prevent getComputedStyle errors
function patchChartJsResize() {
    if (typeof Chart !== 'undefined' && Chart.prototype) {
        // Store the original resize method
        const originalResize = Chart.prototype.resize;
        
        // Patch the resize method to better handle Odoo's environment
        Chart.prototype.resize = function() {
            try {
                return originalResize.apply(this, arguments);
            } catch (error) {
                console.error('Error in Chart.js resize:', error);
                // Implement more robust resize fallback if needed
            }
        };
    }
}

function initDashboard() {
    // Only execute if we're in a browser environment with a document
    if (typeof document === 'undefined') return;
    
    // Check if element is already available
    const dashboardEl = document.querySelector('.o_dashboard_charts');
    
    if (dashboardEl) {
        // Dashboard already in DOM, initialize immediately
        const dashboardController = new LibraryDashboardController();
        dashboardController.init();
        window.dashboardController = dashboardController;
        
        // Also make refresh function available globally for button
        window.refreshAllCharts = function() {
            if (window.dashboardController) {
                return window.dashboardController.refreshAllCharts();
            }
        };
        
        // Alias for compatibility
        window.reloadDashboard = window.refreshAllCharts;
        
        // Setup cleanup on page unload
        window.addEventListener('beforeunload', () => {
            if (window.dashboardController) {
                window.dashboardController.cleanupAllChartInstances();
            }
        });
        
        // Also setup cleanup when tab becomes hidden (helps with Odoo navigation)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && window.dashboardController) {
                window.dashboardController.cleanupAllChartInstances();
            }
        });
    } else {
        // Set up polling to wait for the element to appear in Odoo's SPA environment
        let checkCount = 0;
        const maxChecks = 10;
        const checkInterval = 500; // ms
        
        // Try different selectors that might contain the dashboard
        const alternativeSelectors = [
            '.o_dashboard_charts',
            '.oe_charts', 
            '.oe_dashboard', 
            '.o_library_dashboard',
            '[name="dashboard_charts"]',
            '[data-chart-container="1"]'
        ];
        
        // Check for the dashboard element
        const checkForDashboard = () => {
            checkCount++;
            
            // Try all possible selectors
            let foundElement = null;
            for (const selector of alternativeSelectors) {
                const el = document.querySelector(selector);
                if (el) {
                    foundElement = el;
                    break;
                }
            }
            
            if (foundElement) {
                // Dashboard found
                const dashboardController = new LibraryDashboardController();
                dashboardController.init();
                window.dashboardController = dashboardController;
                
                // Make refresh function available globally
                window.refreshAllCharts = function() {
                    if (window.dashboardController) {
                        return window.dashboardController.refreshAllCharts();
                    }
                };
                
                // Alias for compatibility
                window.reloadDashboard = window.refreshAllCharts;
            } else if (checkCount < maxChecks) {
                // Keep checking
                setTimeout(checkForDashboard, checkInterval);
            } else {
                // Give up after max checks
                console.warn(`Dashboard element not found after ${maxChecks} attempts`);
            }
        };
        
        // Start checking
        setTimeout(checkForDashboard, 100);
        
        // Handle Odoo view changes - important for SPA navigation
        document.addEventListener('DOMSubtreeModified', function(e) {
            // Only check meaningful DOM changes
            if (e.target.classList && 
                (e.target.classList.contains('o_content') || 
                 e.target.classList.contains('o_form_view') ||
                 e.target.classList.contains('o_main_content'))) {
                
                // Wait a moment for the DOM to stabilize
                setTimeout(() => {
                    // Clean up any existing chart controller
                    if (window.dashboardController) {
                        window.dashboardController.cleanupAllChartInstances();
                    }
                    
                    // Check for dashboard in the new view
                    let foundElement = null;
                    for (const selector of alternativeSelectors) {
                        const el = document.querySelector(selector);
                        if (el) {
                            foundElement = el;
                            break;
                        }
                    }
                    
                    if (foundElement) {
                        // Initialize new dashboard for this view
                        const dashboardController = new LibraryDashboardController();
                        dashboardController.init();
                        window.dashboardController = dashboardController;
                    }
                }, 300);
            }
        });
    }
}

// Patch Chart.js resize method for better compatibility
if (typeof Chart !== 'undefined') {
    patchChartJsResize();
}

// Initialize the dashboard when the DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}

// Re-export for module usage
export default {
    initDashboard,
    LibraryDashboardController
}; 