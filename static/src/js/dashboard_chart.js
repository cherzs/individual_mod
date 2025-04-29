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
    }
    
    async init() {
        try {
            if (this.initialized) return;
            
            // Load Chart.js if not already loaded
            await waitForChartJs();
            
            // Inject chart template and initialize
            this.injectChartTemplate();
            this.loadChartData();
            
            this.initialized = true;
        } catch (error) {
            console.error("Dashboard initialization error:", error);
            this.error = error.message || "Initialization failed";
        }
    }
    
    injectChartTemplate() {
        const dashboardContainer = document.querySelector('.o_dashboard_charts');
        if (!dashboardContainer) {
            console.error("Dashboard container not found");
            return;
        }
        
        // Insert the chart HTML
        dashboardContainer.innerHTML = `
            <div class="o_dashboard_chart">
                <div class="charts_container">
                    <div class="chart_row">
                        <div class="chart_section">
                            <h3>Loan Trends</h3>
                            <canvas id="loanChart"></canvas>
                        </div>
                        <div class="chart_section">
                            <h3>Book Categories</h3>
                            <canvas id="categoryChart"></canvas>
                        </div>
                    </div>
                    <div class="chart_row">
                        <div class="chart_section">
                            <h3>Book Acquisitions</h3>
                            <canvas id="acquisitionsChart"></canvas>
                        </div>
                        <div class="chart_section">
                            <h3>Loan Status</h3>
                            <canvas id="loanStatusChart"></canvas>
                        </div>
                    </div>
                    <div class="chart_row">
                        <div class="chart_section">
                            <h3>Member Activities</h3>
                            <canvas id="memberActivitiesChart"></canvas>
                        </div>
                        <div class="chart_section">
                            <h3>Book Condition</h3>
                            <canvas id="bookConditionChart"></canvas>
                        </div>
                    </div>
                    <div class="chart_row">
                        <div class="chart_section">
                            <h3>Revenue by Month</h3>
                            <canvas id="revenueChart"></canvas>
                        </div>
                        <div class="chart_section">
                            <h3>Popular Reading Times</h3>
                            <canvas id="readingTimesChart"></canvas>
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
        fetch('/library/dashboard/data')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Server returned ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("Successfully fetched data from API");
                this.chartData = data;
                // Render charts after a small delay
                setTimeout(() => {
                    this.renderCharts();
                }, 300);
            })
            .catch(error => {
                console.error("Error fetching chart data from API:", error);
                this.error = error.message || "Failed to fetch chart data";
                
                // Still attempt to use hardcoded sample data as fallback
                this.chartData = this.getSampleChartData();
                setTimeout(() => {
                    this.renderCharts();
                }, 300);
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
        try {
            if (!this.chartData || typeof Chart === 'undefined') {
                console.warn("Chart data or Chart.js not available");
                return;
            }
            
            const chartData = this.chartData;
            
            // Properly destroy any existing charts
            Object.keys(this.chartInstances).forEach(key => {
                if (this.chartInstances[key] instanceof Chart) {
                    this.chartInstances[key].destroy();
                    console.log(`Destroyed existing chart: ${key}`);
                }
                this.chartInstances[key] = null;
            });
            
            // Clear the chart instances object
            this.chartInstances = {};
            
            // Render all charts
            this.renderLoanTrendsChart(chartData.loan_trend);
            this.renderCategoriesChart(chartData.book_categories);
            this.renderAcquisitionsChart(chartData.book_acquisitions);
            this.renderLoanStatusChart(chartData.loan_status);
            this.renderMemberActivitiesChart(chartData.member_activities);
            this.renderBookConditionChart(chartData.book_condition);
            
            // Render new charts
            this.renderRevenueChart(chartData.revenue_data || this.generateRevenueData());
            this.renderReadingTimesChart(chartData.reading_times || this.generateReadingTimesData());
            
            console.log("All charts rendered successfully");
            
            // Apply resize listener to ensure charts remain responsive
            if (!window._chartResizeListener) {
                window._chartResizeListener = true;
                window.addEventListener('resize', this.handleResize.bind(this));
            }
        } catch (error) {
            console.error("Error rendering charts:", error);
            this.error = error.message || "Failed to render charts";
            
            // Display error message in the chart container
            const chartContainers = document.querySelectorAll('.chart_section');
            chartContainers.forEach(container => {
                const canvas = container.querySelector('canvas');
                if (canvas) {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'alert alert-danger';
                    wrapper.textContent = `Error rendering chart: ${error.message}`;
                    container.appendChild(wrapper);
                }
            });
        }
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
    
    // Generate sample data if not provided by the model
    generateRevenueData() {
        return {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Revenue',
                data: [1200, 1900, 1300, 1500, 2200, 1800],
                backgroundColor: 'rgba(153, 102, 255, 0.5)',
                borderColor: 'rgba(153, 102, 255, 1)',
                borderWidth: 1
            }]
        };
    }
    
    generateReadingTimesData() {
        return {
            labels: ['Morning', 'Afternoon', 'Evening', 'Night'],
            datasets: [{
                label: 'Weekdays',
                data: [20, 30, 45, 25],
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }, {
                label: 'Weekends',
                data: [15, 40, 55, 35],
                backgroundColor: 'rgba(255, 159, 64, 0.5)',
                borderColor: 'rgba(255, 159, 64, 1)',
                borderWidth: 1
            }]
        };
    }
    
    // Render Revenue Chart
    renderRevenueChart(data) {
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        boxWidth: 15,
                        padding: 15,
                        font: {
                            size: 13
                        }
                    }
                },
                tooltip: {
                    padding: 10,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 13
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    grid: {
                        display: true,
                        drawBorder: false
                    },
                    ticks: {
                        callback: function(value) {
                            return '$ ' + value;
                        },
                        font: {
                            size: 12
                        },
                        padding: 5
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 12
                        },
                        padding: 5
                    }
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
                    labels: {
                        boxWidth: 15,
                        padding: 15,
                        font: {
                            size: 13
                        }
                    }
                },
                tooltip: {
                    padding: 10,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 13
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        font: {
                            size: 12
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 12
                        }
                    }
                }
            },
            elements: {
                line: {
                    tension: 0.4
                },
                point: {
                    radius: 4,
                    hoverRadius: 6
                }
            }
        };
        
        this.chartInstances.readingTimesChart = this.safelyCreateChart('readingTimesChart', 'line', data, options);
    }
    
    // Helper method to safely create a chart
    safelyCreateChart(canvasId, chartType, data, options) {
        try {
            const canvas = document.getElementById(canvasId);
            if (!canvas || !data) {
                console.warn(`Cannot render chart: canvas #${canvasId} or data not available`);
                return null;
            }
            
            // Ensure any existing chart is destroyed
            if (this.chartInstances[canvasId]) {
                this.chartInstances[canvasId].destroy();
                this.chartInstances[canvasId] = null;
            }
            
            // Also check if the canvas has a Chart instance attached to it
            try {
                const existingChart = Chart.getChart(canvas);
                if (existingChart) {
                    console.log(`Destroying existing chart on canvas #${canvasId}`);
                    existingChart.destroy();
                }
            } catch (e) {
                console.warn(`Error checking for existing chart on canvas #${canvasId}:`, e);
            }
            
            // Create a new chart
            const chart = new Chart(canvas, {
                type: chartType,
                data: data,
                options: options || {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
            
            return chart;
        } catch (error) {
            console.error(`Error creating ${chartType} chart on canvas #${canvasId}:`, error);
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
                    labels: {
                        font: {
                            size: 13
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            elements: {
                point: {
                    radius: 4,
                    hoverRadius: 6
                }
            }
        };
        
        this.chartInstances.loanChart = this.safelyCreateChart('loanChart', 'line', data, options);
    }
    
    renderCategoriesChart(data) {
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 15,
                        font: {
                            size: 13
                        }
                    }
                },
                tooltip: {
                    padding: 10,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)'
                }
            }
        };
        
        this.chartInstances.categoryChart = this.safelyCreateChart('categoryChart', 'pie', data, options);
    }
    
    renderAcquisitionsChart(data) {
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: {
                            size: 13
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
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
                    labels: {
                        padding: 15,
                        font: {
                            size: 13
                        }
                    }
                },
                tooltip: {
                    padding: 10,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)'
                }
            },
            cutout: '60%'
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
                    labels: {
                        font: {
                            size: 13
                        }
                    }
                }
            },
            scales: {
                r: {
                    pointLabels: {
                        font: {
                            size: 12
                        }
                    }
                }
            },
            elements: {
                line: {
                    borderWidth: 3
                },
                point: {
                    radius: 4,
                    hoverRadius: 6
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
                    labels: {
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.7)'
                }
            }
        };
        
        this.chartInstances.bookConditionChart = this.safelyCreateChart('bookConditionChart', 'polarArea', data, options);
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