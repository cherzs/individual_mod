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
    }
    
    async init() {
        try {
            if (this.initialized) return;
            
            // Load Chart.js if not already loaded
            await waitForChartJs();
            
            // Force full width on all parent containers
            this.forceFullWidth();
            
            // Inject chart template and initialize
            this.injectChartTemplate();
            this.loadChartData();
            
            this.initialized = true;
        } catch (error) {
            console.error("Dashboard initialization error:", error);
            this.error = error.message || "Initialization failed";
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
                <div class="chart-actions text-center mt-4">
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
        try {
            // Find the dashboard element
            const dashboardEl = document.querySelector('.o_dashboard_charts');
            if (!dashboardEl) {
                console.error("Dashboard element not found");
                return;
            }
            
            // Find the graph_data field in various ways Odoo might render it
            let graphDataValue = null;
            
            // Priority 1: Look for the specific class we added to the field
            const chartDataField = document.querySelector('.o_chart_data');
            if (chartDataField) {
                graphDataValue = chartDataField.value || chartDataField.textContent;
                if (graphDataValue) {
                    console.log("Found graph_data via o_chart_data class");
                }
            }
            
            // If not found, try other selectors
            if (!graphDataValue) {
                // Method 1: Try to find the invisible field (multiple ways Odoo might render it)
                const graphDataSelectors = [
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
            }
            
            // Method 2: Look for data attribute on the form
            if (!graphDataValue) {
                const formView = document.querySelector('.o_form_view');
                if (formView && formView.dataset.graphData) {
                    graphDataValue = formView.dataset.graphData;
                    console.log("Found graph_data via data attribute");
                }
            }
            
            // Method 3: Try to find it in the rendered view somewhere
            if (!graphDataValue) {
                // Look for any element containing JSON data
                const jsonElements = document.querySelectorAll('*');
                for (const el of jsonElements) {
                    const content = el.textContent;
                    if (content && content.includes('"loan_trend"') && content.includes('"book_categories"')) {
                        try {
                            // Try to extract a valid JSON string
                            const jsonMatch = content.match(/(\{.*"loan_trend".*\})/);
                            if (jsonMatch && jsonMatch[1]) {
                                graphDataValue = jsonMatch[1];
                                console.log("Found graph_data in DOM text content");
                                break;
                            }
                        } catch (e) {
                            // Continue searching
                        }
                    }
                }
            }
            
            // Method 4: If the field is not in the DOM but we can find a model ID, fetch from server
            if (!graphDataValue) {
                // Find record ID from URL or element
                const recordIdMatch = window.location.href.match(/\/(\d+)(?:\?|$)/);
                const recordId = recordIdMatch ? recordIdMatch[1] : null;
                
                if (recordId) {
                    console.log(`Found record ID: ${recordId}, fetching data from server`);
                    this.fetchDataFromServer();
                    return; // Exit early as data will be loaded async
                }
            }
            
            // Method 5: If we still can't find it, try the API endpoint
            if (!graphDataValue) {
                console.log("Attempting to fetch chart data from API endpoint");
                this.fetchDataFromServer();
                return; // Exit early as data will be loaded async
            }
            
            if (!graphDataValue) {
                console.error("No chart data found bro");
                return;
            }
            
            try {
                this.chartData = JSON.parse(graphDataValue);
                console.log("Successfully parsed chart data");
            } catch (parseError) {
                console.error("Error parsing JSON data:", parseError);
                return;
            }
            
            // Add a small delay to ensure the DOM is ready
            setTimeout(() => {
                this.renderCharts();
            }, 300);
        } catch (error) {
            console.error("Error loading chart data:", error);
            this.error = error.message || "Failed to load chart data";
        }
    }
    
    // New method to fetch data from the API endpoint
    fetchDataFromServer() {
        console.log("Fetching dashboard data from server API...");
        
        return new Promise((resolve, reject) => {
            // Try to fetch from Odoo controller endpoint
            fetch('/library/dashboard/data')
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log("Successfully fetched data from API");
                    if (data && data.data) {
                        this.chartData = data.data;
                    } else {
                        console.warn("API response did not contain expected data structure");
                        this.chartData = this.getSampleChartData();
                    }
                    
                    // Render charts after a small delay
                    setTimeout(() => {
                        this.renderCharts();
                        resolve();
                    }, 300);
                })
                .catch(error => {
                    console.error("Error fetching chart data from API:", error);
                    
                    // Still attempt to use hardcoded sample data as fallback
                    console.log("Using sample chart data as fallback");
                    this.chartData = this.getSampleChartData();
                    
                    setTimeout(() => {
                        this.renderCharts();
                        resolve(); // Still resolve, as we're using fallback data
                    }, 300);
                });
        });
    }
    
    // Extract sample data to a separate method for reuse
    getSampleChartData() {
        return {
            // 1. Line chart for loan trends
            'loan_trend': {
                'labels': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                'datasets': [{
                    'label': 'Loans',
                    'data': [12, 19, 3, 5, 2, 3],
                    'backgroundColor': 'rgba(75, 192, 192, 0.2)',
                    'borderColor': 'rgba(75, 192, 192, 1)',
                    'borderWidth': 2,
                    'tension': 0.1
                }]
            },
            
            // 2. Pie chart for book categories
            'book_categories': {
                'labels': ['Fiction', 'Non-Fiction', 'Sci-Fi', 'Biography', 'History'],
                'datasets': [{
                    'data': [30, 20, 15, 25, 10],
                    'backgroundColor': [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(153, 102, 255, 0.7)',
                    ],
                    'borderColor': 'rgba(255, 255, 255, 1)',
                    'borderWidth': 1
                }]
            },
            
            // 3. Bar chart for monthly book acquisitions
            'book_acquisitions': {
                'labels': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                'datasets': [{
                    'label': 'New Books',
                    'data': [5, 7, 10, 3, 8, 12],
                    'backgroundColor': 'rgba(54, 162, 235, 0.7)',
                    'borderColor': 'rgba(54, 162, 235, 1)',
                    'borderWidth': 1
                }]
            },
            
            // 4. Doughnut chart for loan status
            'loan_status': {
                'labels': ['Active', 'Returned', 'Overdue', 'Lost'],
                'datasets': [{
                    'data': [45, 30, 15, 10],
                    'backgroundColor': [
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 159, 64, 0.7)',
                        'rgba(255, 99, 132, 0.7)'
                    ],
                    'borderColor': 'rgba(255, 255, 255, 1)',
                    'borderWidth': 1,
                    'hoverOffset': 4
                }]
            },
            
            // 5. Radar chart for member activities
            'member_activities': {
                'labels': ['Loans', 'Returns', 'Renewals', 'Reservations', 'Visits'],
                'datasets': [{
                    'label': 'Regular Members',
                    'data': [65, 59, 90, 81, 56],
                    'fill': true,
                    'backgroundColor': 'rgba(54, 162, 235, 0.2)',
                    'borderColor': 'rgba(54, 162, 235, 1)',
                    'pointBackgroundColor': 'rgba(54, 162, 235, 1)',
                    'pointBorderColor': '#fff',
                    'pointHoverBackgroundColor': '#fff',
                    'pointHoverBorderColor': 'rgba(54, 162, 235, 1)'
                }, {
                    'label': 'Premium Members',
                    'data': [28, 48, 40, 19, 96],
                    'fill': true,
                    'backgroundColor': 'rgba(255, 99, 132, 0.2)',
                    'borderColor': 'rgba(255, 99, 132, 1)',
                    'pointBackgroundColor': 'rgba(255, 99, 132, 1)',
                    'pointBorderColor': '#fff',
                    'pointHoverBackgroundColor': '#fff',
                    'pointHoverBorderColor': 'rgba(255, 99, 132, 1)'
                }]
            },
            
            // 6. Polar area chart for book condition
            'book_condition': {
                'labels': ['New', 'Good', 'Fair', 'Poor', 'Damaged'],
                'datasets': [{
                    'data': [11, 16, 7, 3, 2],
                    'backgroundColor': [
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(255, 159, 64, 0.7)',
                        'rgba(255, 99, 132, 0.7)'
                    ],
                    'borderWidth': 1
                }]
            }
        };
    }
    
    renderCharts() {
        // Ensure full width is applied
        this.forceFullWidth();
        
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error("Chart.js is not available!");
            document.querySelectorAll('.o_dashboard_charts').forEach(el => {
                el.innerHTML = `
                    <div class="alert alert-danger">
                        <p>Chart.js library could not be loaded. Please refresh the page.</p>
                        <button class="btn btn-primary" onclick="location.reload()">Refresh Page</button>
                    </div>
                `;
            });
            return;
        }
        
        // Log the data for debugging
        console.log("Rendering charts with data:", this.chartData);
        
        // Destroy existing charts to prevent duplicates
        if (this.chartInstances) {
            Object.values(this.chartInstances).forEach(chart => {
                if (chart && typeof chart.destroy === 'function') {
                    chart.destroy();
                }
            });
            this.chartInstances = {};
        }
        
        // Add a manual button to reload charts
        const dashboardEl = document.querySelector('.o_dashboard_charts');
        if (dashboardEl && !document.querySelector('.reload_charts_btn')) {
            const reloadBtn = document.createElement('button');
            reloadBtn.className = 'btn btn-secondary reload_charts_btn';
            reloadBtn.textContent = 'Reload Charts';
            reloadBtn.style.marginBottom = '15px';
            reloadBtn.onclick = () => this.refreshAllCharts();
            dashboardEl.prepend(reloadBtn);
        }
        
        try {
            // If data is available, render the charts
            if (this.chartData) {
                this.renderChartWithFallback('loan_trend', this.renderLoanTrendsChart.bind(this));
                this.renderChartWithFallback('book_categories', this.renderCategoriesChart.bind(this));
                this.renderChartWithFallback('book_acquisitions', this.renderAcquisitionsChart.bind(this));
                this.renderChartWithFallback('loan_status', this.renderLoanStatusChart.bind(this));
                this.renderChartWithFallback('member_activities', this.renderMemberActivitiesChart.bind(this));
                this.renderChartWithFallback('book_condition', this.renderBookConditionChart.bind(this));
                this.renderChartWithFallback('revenue', this.renderRevenueChart.bind(this));
                this.renderChartWithFallback('reading_times', this.renderReadingTimesChart.bind(this));
                
                // Add resize listener for responsive charts
                if (!this._resizeListenerAdded) {
                    window.addEventListener('resize', this.handleResize.bind(this));
                    this._resizeListenerAdded = true;
                }
                
                console.log("All charts rendered successfully");
            } else {
                console.error("No chart data available");
                document.querySelectorAll('.chart_section canvas').forEach(canvas => {
                    const section = canvas.closest('.chart_section');
                    if (section) {
                        section.innerHTML += `
                            <div class="chart-error mt-3">
                                <p>No data available for this chart</p>
                            </div>
                        `;
                    }
                });
            }
        } catch (error) {
            console.error("Error rendering charts:", error);
            document.querySelectorAll('.o_dashboard_charts').forEach(el => {
                el.innerHTML += `
                    <div class="alert alert-danger">
                        <p>Error rendering charts: ${error.message}</p>
                    </div>
                `;
            });
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
                // Generate fallback data if real data is not available
                console.log(`Data for ${chartKey} not found, using sample data`);
                let sampleData;
                
                // Get sample data based on chart type
                switch (chartKey) {
                    case 'loan_trend':
                        sampleData = this.generateLoan_trendData();
                        break;
                    case 'book_categories':
                        sampleData = this.generateBook_categoriesData();
                        break;
                    case 'book_acquisitions':
                        sampleData = this.generateBook_acquisitionsData();
                        break;
                    case 'loan_status':
                        sampleData = this.generateLoan_statusData();
                        break;
                    case 'member_activities':
                        sampleData = this.generateMember_activitiesData();
                        break;
                    case 'book_condition':
                        sampleData = this.generateBook_conditionData();
                        break;
                    case 'revenue':
                        sampleData = this.generateRevenueData();
                        break;
                    case 'reading_times':
                        sampleData = this.generateReadingTimesData();
                        break;
                    default:
                        console.error(`No sample data generator for ${chartKey}`);
                        return;
                }
                
                // Render with sample data
                renderFunction(sampleData);
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
    
    // Add sample data generator methods
    generateLoan_trendData() {
        return {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Book Loans',
                data: [12, 19, 3, 5, 2, 3],
                backgroundColor: 'rgba(26, 115, 232, 0.2)',
                borderColor: 'rgba(26, 115, 232, 0.8)',
                borderWidth: 2,
                tension: 0.4,
                pointBackgroundColor: 'rgba(26, 115, 232, 1)',
                pointBorderColor: '#fff',
                pointRadius: 5,
                pointHoverRadius: 7,
                fill: true
            }]
        };
    }
    
    generateBook_categoriesData() {
        return {
            labels: ['Fiction', 'Non-Fiction', 'Sci-Fi', 'Biography', 'History'],
            datasets: [{
                data: [35, 25, 15, 15, 10],
                backgroundColor: [
                    'rgba(26, 115, 232, 0.8)',
                    'rgba(52, 168, 83, 0.8)',
                    'rgba(251, 188, 5, 0.8)',
                    'rgba(241, 108, 119, 0.8)',
                    'rgba(103, 58, 183, 0.8)'
                ],
                borderColor: [
                    'rgba(26, 115, 232, 1)',
                    'rgba(52, 168, 83, 1)',
                    'rgba(251, 188, 5, 1)',
                    'rgba(241, 108, 119, 1)',
                    'rgba(103, 58, 183, 1)'
                ],
                borderWidth: 1,
                hoverOffset: 4
            }]
        };
    }
    
    generateBook_acquisitionsData() {
        return {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'New Books',
                data: [5, 7, 10, 8, 12, 15],
                backgroundColor: 'rgba(66, 133, 244, 0.8)',
                borderColor: 'rgba(66, 133, 244, 1)',
                borderWidth: 1,
                borderRadius: 4,
                barThickness: 25,
                maxBarThickness: 35
            }]
        };
    }
    
    generateLoan_statusData() {
        return {
            labels: ['Active', 'Returned', 'Overdue'],
            datasets: [{
                data: [65, 25, 10],
                backgroundColor: [
                    'rgba(52, 168, 83, 0.8)',
                    'rgba(251, 188, 5, 0.8)',
                    'rgba(234, 67, 53, 0.8)'
                ],
                borderColor: [
                    'rgba(52, 168, 83, 1)',
                    'rgba(251, 188, 5, 1)',
                    'rgba(234, 67, 53, 1)'
                ],
                borderWidth: 1,
                hoverOffset: 4,
                cutout: '60%'
            }]
        };
    }
    
    generateMember_activitiesData() {
        return {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [
                {
                    label: 'New Members',
                    data: [5, 8, 6, 9, 12, 8],
                    backgroundColor: 'rgba(26, 115, 232, 0.8)',
                    borderColor: 'rgba(26, 115, 232, 1)',
                    borderWidth: 1,
                    borderRadius: 4,
                    barThickness: 15,
                    maxBarThickness: 20
                },
                {
                    label: 'Active Members',
                    data: [15, 20, 18, 22, 28, 32],
                    backgroundColor: 'rgba(255, 138, 101, 0.8)',
                    borderColor: 'rgba(255, 138, 101, 1)',
                    borderWidth: 1,
                    borderRadius: 4,
                    barThickness: 15,
                    maxBarThickness: 20
                }
            ]
        };
    }
    
    generateBook_conditionData() {
        return {
            labels: ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'],
            datasets: [{
                data: [45, 25, 15, 10, 5],
                backgroundColor: [
                    'rgba(52, 168, 83, 0.8)',
                    'rgba(0, 158, 224, 0.8)',
                    'rgba(255, 138, 101, 0.8)',
                    'rgba(103, 58, 183, 0.8)',
                    'rgba(251, 188, 5, 0.8)'
                ],
                borderColor: 'rgba(255, 255, 255, 0.5)',
                borderWidth: 2
            }]
        };
    }
    
    generateRevenueData() {
        return {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Revenue ($)',
                data: [1200, 1900, 1500, 2200, 1800, 2500],
                backgroundColor: 'rgba(0, 184, 169, 0.8)',
                borderColor: 'rgba(0, 184, 169, 1)',
                borderWidth: 1,
                borderRadius: 4,
                barThickness: 25,
                maxBarThickness: 35
            }]
        };
    }
    
    generateReadingTimesData() {
        return {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [
                {
                    label: 'Weekday Reading Hours',
                    data: [3.5, 4.2, 3.8, 5.1, 4.3, 0, 0],
                    backgroundColor: 'rgba(103, 58, 183, 0.8)',
                    borderColor: 'rgba(103, 58, 183, 1)',
                    borderWidth: 1,
                    borderRadius: 4,
                    barThickness: 15,
                    maxBarThickness: 20
                },
                {
                    label: 'Weekend Reading Hours',
                    data: [0, 0, 0, 0, 0, 7.5, 8.2],
                    backgroundColor: 'rgba(186, 104, 200, 0.8)',
                    borderColor: 'rgba(186, 104, 200, 1)',
                    borderWidth: 1,
                    borderRadius: 4,
                    barThickness: 15,
                    maxBarThickness: 20
                }
            ]
        };
    }
    
    // Handle window resize to adjust charts
    handleResize() {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        
        this.resizeTimeout = setTimeout(() => {
            Object.values(this.chartInstances).forEach(chart => {
                if (chart) chart.resize();
            });
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
        
        // Re-fetch chart data
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
            .catch(error => {
                console.error("Error refreshing charts:", error);
                
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
            // Destroy all charts to prevent memory leaks
            Object.values(dashboardController.chartInstances).forEach(chart => {
                if (chart instanceof Chart) {
                    chart.destroy();
                }
            });
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

// Initialize on both DOM content loaded and when view changes (Odoo specific)
document.addEventListener('DOMContentLoaded', initDashboard);

// Try to detect Odoo view switches (this is Odoo 15+ specific)
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.addedNodes && mutation.addedNodes.length) {
            for (const node of mutation.addedNodes) {
                if (node.classList && 
                    (node.classList.contains('o_form_view') || 
                     node.classList.contains('o_content') ||
                     node.querySelector('.o_dashboard_charts'))) {
                    console.log("View change detected, checking for dashboard...");
                    setTimeout(initDashboard, 500);
                    break;
                }
            }
        }
    }
});

// Start observing once DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const targetNode = document.body;
    observer.observe(targetNode, { childList: true, subtree: true });
});

// Export for testing
window.initLibraryDashboard = initDashboard; 