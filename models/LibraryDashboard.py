# -*- coding: utf-8 -*-
from odoo import models, fields, api, _
import json
import logging

_logger = logging.getLogger(__name__)

class LibraryDashboard(models.Model):
    _name = 'custom.library.dashboard'
    _description = 'Library Dashboard'

    name = fields.Char('Name', default='Library Dashboard')
    book_count = fields.Integer('Book Count', compute='_compute_counts')
    loan_count = fields.Integer('Loan Count', compute='_compute_counts')
    overdue_count = fields.Integer('Overdue Count', compute='_compute_counts')
    member_count = fields.Integer('Member Count', compute='_compute_counts')
    
    total_revenue_mtd = fields.Monetary('Revenue MTD', compute='_compute_revenue')
    total_revenue_ytd = fields.Monetary('Revenue YTD', compute='_compute_revenue')
    average_loan_duration = fields.Float('Avg Loan Duration (days)', compute='_compute_statistics')
    
    most_borrowed_genre_id = fields.Many2one('custom.book.genre', string='Most Borrowed Genre', compute='_compute_statistics')
    most_active_member_id = fields.Many2one('res.partner', string='Most Active Member', compute='_compute_statistics')
    revenue_growth = fields.Float('Revenue Growth (%)', compute='_compute_revenue')
    
    graph_data = fields.Text('Graph Data', compute='_compute_graph_data')
    
    currency_id = fields.Many2one('res.currency', related='company_id.currency_id')
    company_id = fields.Many2one('res.company', default=lambda self: self.env.company)
    
    @api.model
    def default_get(self, fields_list):
        """Create a new record if none exists."""
        res = super(LibraryDashboard, self).default_get(fields_list)
        return res
        
    @api.model
    def _get_default_dashboard(self):
        """Ensure at least one dashboard record exists."""
        dashboard = self.search([], limit=1)
        if not dashboard:
            dashboard = self.create({'name': 'Library Dashboard'})
        return dashboard
        
    @api.model
    def search_read(self, domain=None, fields=None, offset=0, limit=None, order=None):
        """Override search_read to ensure at least one record exists"""
        if not self.search_count([]):
            self.create({'name': 'Library Dashboard'})
        return super(LibraryDashboard, self).search_read(domain=domain, fields=fields, 
                                                         offset=offset, limit=limit, order=order)
    
    @api.model
    def _compute_graph_data_static(self):
        """Ensure graph data is always generated even without a record"""
        # Re-generate data in static context
        # This is useful for TransientModel where record might not exist yet
        try:
            # Ensure we have at least one record to display
            record_count = self.search_count([])
            if record_count == 0:
                # Create a new dashboard record that will be displayed
                self.create({'name': 'Library Dashboard'})
        except Exception as e:
            _logger.error("Failed to initialize dashboard: %s", e)
    
    @api.depends()
    def _compute_counts(self):
        for record in self:
            record.book_count = self.env['custom.book'].search_count([])
            record.loan_count = self.env['custom.book.loan'].search_count([])
            record.overdue_count = self.env['custom.book.loan'].search_count([('state', '=', 'overdue')])
            record.member_count = self.env['custom.library.member'].search_count([])
    
    @api.depends()
    def _compute_revenue(self):
        for record in self:
            # Implementasi perhitungan revenue
            record.total_revenue_mtd = 0
            record.total_revenue_ytd = 0
            record.revenue_growth = 0
    
    @api.depends()
    def _compute_statistics(self):
        for record in self:
            # Implementasi statistik
            record.average_loan_duration = 0
            record.most_borrowed_genre_id = False
            record.most_active_member_id = False
    
    @api.depends()
    def _compute_graph_data(self):
        for record in self:
            try:
                # Generate chart data for the dashboard
                data = {
                    # 1. Line chart for loan trends
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
                    
                    # 2. Pie chart for book categories
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
                    
                    # 3. Bar chart for monthly book acquisitions
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
                    
                    # 4. Doughnut chart for loan status
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
                    
                    # 5. Radar chart for member activities
                    'member_activities': {
                        'labels': ['Loans', 'Returns', 'Renewals', 'Reservations', 'Visits'],
                        'datasets': [{
                            'label': 'Regular Members',
                            'data': [65, 59, 90, 81, 56],
                            'fill': True,
                            'backgroundColor': 'rgba(54, 162, 235, 0.2)',
                            'borderColor': 'rgba(54, 162, 235, 1)',
                            'pointBackgroundColor': 'rgba(54, 162, 235, 1)',
                            'pointBorderColor': '#fff',
                            'pointHoverBackgroundColor': '#fff',
                            'pointHoverBorderColor': 'rgba(54, 162, 235, 1)'
                        }, {
                            'label': 'Premium Members',
                            'data': [28, 48, 40, 19, 96],
                            'fill': True,
                            'backgroundColor': 'rgba(255, 99, 132, 0.2)',
                            'borderColor': 'rgba(255, 99, 132, 1)',
                            'pointBackgroundColor': 'rgba(255, 99, 132, 1)',
                            'pointBorderColor': '#fff',
                            'pointHoverBackgroundColor': '#fff',
                            'pointHoverBorderColor': 'rgba(255, 99, 132, 1)'
                        }]
                    },
                    
                    # 6. Polar area chart for book condition
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
                    },
                    
                    # 7. Bar chart for revenue by month
                    'revenue_data': {
                        'labels': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                        'datasets': [{
                            'label': 'Revenue',
                            'data': [1200, 1900, 1300, 1500, 2200, 1800],
                            'backgroundColor': 'rgba(153, 102, 255, 0.5)',
                            'borderColor': 'rgba(153, 102, 255, 1)',
                            'borderWidth': 1
                        }]
                    },
                    
                    # 8. Line chart for popular reading times
                    'reading_times': {
                        'labels': ['Morning', 'Afternoon', 'Evening', 'Night'],
                        'datasets': [{
                            'label': 'Weekdays',
                            'data': [20, 30, 45, 25],
                            'backgroundColor': 'rgba(54, 162, 235, 0.5)',
                            'borderColor': 'rgba(54, 162, 235, 1)',
                            'borderWidth': 1
                        }, {
                            'label': 'Weekends',
                            'data': [15, 40, 55, 35],
                            'backgroundColor': 'rgba(255, 159, 64, 0.5)',
                            'borderColor': 'rgba(255, 159, 64, 1)',
                            'borderWidth': 1
                        }]
                    }
                }
                
                # Store as JSON
                record.graph_data = json.dumps(data)
            except Exception as e:
                # Provide fallback data in case of error
                record.graph_data = json.dumps({
                    'error': str(e),
                    'loan_trend': {
                        'labels': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                        'datasets': [{
                            'label': 'Loans',
                            'data': [12, 19, 3, 5, 2, 3],
                            'backgroundColor': 'rgba(75, 192, 192, 0.2)',
                            'borderColor': 'rgba(75, 192, 192, 1)',
                        }]
                    },
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
                        }]
                    }
                })
    
    def action_view_books(self):
        return {
            'name': _('Books'),
            'type': 'ir.actions.act_window',
            'res_model': 'custom.book',
            'view_mode': 'tree,form',
        }
    
    def action_view_loans(self):
        return {
            'name': _('Loans'),
            'type': 'ir.actions.act_window',
            'res_model': 'custom.book.loan',
            'view_mode': 'tree,form',
        }
    
    def action_view_overdue(self):
        return {
            'name': _('Overdue Loans'),
            'type': 'ir.actions.act_window',
            'res_model': 'custom.book.loan',
            'view_mode': 'tree,form',
            'domain': [('state', '=', 'overdue')],
        }
    
    def action_view_members(self):
        return {
            'name': _('Members'),
            'type': 'ir.actions.act_window',
            'res_model': 'custom.library.member',
            'view_mode': 'tree,form',
        } 