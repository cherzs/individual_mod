# -*- coding: utf-8 -*-
from odoo import models, fields, api, _
import json
import logging
from dateutil.relativedelta import relativedelta

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
        try:
            dashboard = self.search([], limit=1)
            if not dashboard:
                dashboard = self.create({'name': 'Library Dashboard'})
                # Force immediate computation of graph data
                dashboard._compute_graph_data()
                self.env.cr.commit()  # Commit the transaction to ensure data is saved
            elif not dashboard.graph_data:
                # If dashboard exists but has no graph data, compute it
                dashboard._compute_graph_data()
                self.env.cr.commit()  # Commit the transaction to ensure data is saved
            return dashboard
        except Exception as e:
            _logger.error("Error in _get_default_dashboard: %s", str(e))
            # Create an emergency dashboard with minimal data if all else fails
            try:
                # Use sudo to bypass any potential access rights issues
                emergency_dashboard = self.sudo().create({'name': 'Emergency Dashboard'})
                # Set a minimal graph data to avoid errors
                minimal_data = {
                    'loan_trend': {
                        'labels': ['No Data'],
                        'datasets': [{
                            'label': 'Placeholder',
                            'data': [0],
                            'backgroundColor': 'rgba(200, 200, 200, 0.7)'
                        }]
                    }
                }
                # Directly write to avoid compute methods that might fail
                emergency_dashboard.sudo().write({
                    'graph_data': json.dumps(minimal_data)
                })
                self.env.cr.commit()
                return emergency_dashboard
            except Exception as inner_e:
                _logger.error("Critical error creating emergency dashboard: %s", str(inner_e))
                # Last resort: Return a new transient record that won't be saved
                return self.new({'name': 'Fallback Dashboard', 'graph_data': json.dumps({'error': 'Dashboard unavailable'})})
        
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
                # Generate chart data using real data from models
                
                # 1. Loan Trends - Monthly loans for the last 6 months
                loan_data = self._get_loan_trend_data()
                
                # 2. Book Categories - Distribution of books by genre
                category_data = self._get_book_categories_data()
                
                # 3. Book Acquisitions - Monthly book acquisitions for the last 6 months
                acquisitions_data = self._get_book_acquisitions_data()
                
                # 4. Loan Status - Distribution of loan statuses
                loan_status_data = self._get_loan_status_data()
                
                # 5. Member Activities - Statistics on member activities
                member_activities_data = self._get_member_activities_data()
                
                # 6. Book Condition - Distribution of books by condition
                book_condition_data = self._get_book_condition_data()
                
                # 7. Revenue Data - Monthly revenue from fines/fees
                revenue_data = self._get_revenue_data()
                
                # 8. Reading Times - Distribution of when books are borrowed
                reading_times_data = self._get_reading_times_data()
                
                # Combine all data into the dashboard data structure
                data = {
                    'loan_trend': loan_data,
                    'book_categories': category_data,
                    'book_acquisitions': acquisitions_data,
                    'loan_status': loan_status_data,
                    'member_activities': member_activities_data,
                    'book_condition': book_condition_data,
                    'revenue': revenue_data,
                    'reading_times': reading_times_data
                }
                
                # Store as JSON
                record.graph_data = json.dumps(data)
                
            except Exception as e:
                _logger.error("Error generating dashboard data: %s", str(e))
                # Provide minimal fallback data in case of error
                record.graph_data = json.dumps({
                    'error': str(e),
                    'loan_trend': {
                        'labels': ['Error'],
                        'datasets': [{
                            'label': 'Data unavailable',
                            'data': [0],
                            'backgroundColor': 'rgba(255, 99, 132, 0.2)',
                            'borderColor': 'rgba(255, 99, 132, 1)',
                        }]
                    }
                })
    
    def _get_loan_trend_data(self):
        """Get monthly loan data for the last 6 months"""
        # Get the last 6 months
        today = fields.Date.today()
        months = []
        labels = []
        
        for i in range(5, -1, -1):  # Last 6 months (including current)
            month_start = today.replace(day=1) - relativedelta(months=i)
            month_end = month_start + relativedelta(months=1) - relativedelta(days=1)
            months.append((month_start, month_end))
            labels.append(month_start.strftime('%b'))
        
        # Get loan counts for each month
        loan_counts = []
        for month_start, month_end in months:
            count = self.env['custom.book.loan'].search_count([
                ('loan_date', '>=', month_start),
                ('loan_date', '<=', month_end)
            ])
            loan_counts.append(count)
        
        return {
            'labels': labels,
            'datasets': [{
                'label': 'Book Loans',
                'data': loan_counts,
                'backgroundColor': 'rgba(26, 115, 232, 0.2)',
                'borderColor': 'rgba(26, 115, 232, 0.8)',
                'borderWidth': 2,
                'tension': 0.4,
                'pointBackgroundColor': 'rgba(26, 115, 232, 1)',
                'pointBorderColor': '#fff',
                'pointRadius': 5,
                'pointHoverRadius': 7,
                'fill': True
            }]
        }
    
    def _get_book_categories_data(self):
        """Get distribution of books by genre"""
        # Query book genres and their counts
        query = """
            SELECT g.name, COUNT(b.id) as book_count
            FROM custom_book_genre g
            LEFT JOIN custom_book b ON b.genre_id = g.id
            WHERE g.active = TRUE
            GROUP BY g.id, g.name
            ORDER BY book_count DESC
            LIMIT 5
        """
        self.env.cr.execute(query)
        results = self.env.cr.fetchall()
        
        if not results:
            # Fallback if no data
            return {
                'labels': ['No Data'],
                'datasets': [{
                    'data': [1],
                    'backgroundColor': ['rgba(200, 200, 200, 0.7)'],
                    'borderColor': ['rgba(200, 200, 200, 1)'],
                    'borderWidth': 1
                }]
            }
        
        labels = [result[0] for result in results]
        data = [result[1] for result in results]
        
        # Generate colors based on the number of genres
        colors = [
            'rgba(255, 99, 132, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(153, 102, 255, 0.7)',
            'rgba(255, 159, 64, 0.7)',
            'rgba(199, 199, 199, 0.7)'
        ]
        
        border_colors = [color.replace('0.7', '1') for color in colors]
        
        # Ensure we have enough colors
        bg_colors = colors[:len(labels)]
        border_colors = border_colors[:len(labels)]
        
        return {
            'labels': labels,
            'datasets': [{
                'data': data,
                'backgroundColor': bg_colors,
                'borderColor': border_colors,
                'borderWidth': 1,
                'hoverOffset': 4
            }]
        }
    
    def _get_book_acquisitions_data(self):
        """Get monthly book acquisitions for the last 6 months"""
        # Get the last 6 months
        today = fields.Date.today()
        months = []
        labels = []
        
        for i in range(5, -1, -1):  # Last 6 months
            month_start = today.replace(day=1) - relativedelta(months=i)
            month_end = month_start + relativedelta(months=1) - relativedelta(days=1)
            months.append((month_start, month_end))
            labels.append(month_start.strftime('%b'))
        
        # Get new book counts for each month
        acquisition_counts = []
        for month_start, month_end in months:
            count = self.env['custom.book'].search_count([
                ('acquisition_date', '>=', month_start),
                ('acquisition_date', '<=', month_end)
            ])
            acquisition_counts.append(count)
        
        return {
            'labels': labels,
            'datasets': [{
                'label': 'New Books',
                'data': acquisition_counts,
                'backgroundColor': 'rgba(66, 133, 244, 0.8)',
                'borderColor': 'rgba(66, 133, 244, 1)',
                'borderWidth': 1,
                'borderRadius': 4,
                'barThickness': 25,
                'maxBarThickness': 35
            }]
        }
    
    def _get_loan_status_data(self):
        """Get distribution of loan statuses"""
        # Count loans by status
        statuses = ['confirmed', 'returned', 'overdue', 'lost']
        status_labels = ['Active', 'Returned', 'Overdue', 'Lost']
        
        status_counts = []
        for status in statuses:
            count = self.env['custom.book.loan'].search_count([('state', '=', status)])
            status_counts.append(count)
        
        # Ensure we have at least some data
        if all(count == 0 for count in status_counts):
            status_counts = [1, 0, 0, 0]  # Default to show something
        
        # Define colors for each status
        colors = [
            'rgba(52, 168, 83, 0.8)',  # Active - Green
            'rgba(66, 133, 244, 0.8)',  # Returned - Blue
            'rgba(251, 188, 5, 0.8)',   # Overdue - Yellow
            'rgba(234, 67, 53, 0.8)'    # Lost - Red
        ]
        
        border_colors = [
            'rgba(52, 168, 83, 1)',
            'rgba(66, 133, 244, 1)',
            'rgba(251, 188, 5, 1)',
            'rgba(234, 67, 53, 1)'
        ]
        
        return {
            'labels': status_labels,
            'datasets': [{
                'data': status_counts,
                'backgroundColor': colors,
                'borderColor': border_colors,
                'borderWidth': 1,
                'hoverOffset': 4,
                'cutout': '60%'
            }]
        }
    
    def _get_member_activities_data(self):
        """Get statistics on member activities by membership type"""
        # Get member types and their activities
        member_types = ['standard', 'premium', 'student', 'senior']
        labels = ['Loans', 'Returns', 'Overdue', 'Active Members', 'New Members']
        
        # Get loan counts for standard members
        standard_data = self._get_member_type_activities('standard')
        
        # Get loan counts for premium members
        premium_data = self._get_member_type_activities('premium')
        
        return {
            'labels': labels,
            'datasets': [
                {
                    'label': 'Standard Members',
                    'data': standard_data,
                    'fill': True,
                    'backgroundColor': 'rgba(54, 162, 235, 0.2)',
                    'borderColor': 'rgba(54, 162, 235, 1)',
                    'pointBackgroundColor': 'rgba(54, 162, 235, 1)',
                    'pointBorderColor': '#fff',
                    'pointHoverBackgroundColor': '#fff',
                    'pointHoverBorderColor': 'rgba(54, 162, 235, 1)'
                },
                {
                    'label': 'Premium Members',
                    'data': premium_data,
                    'fill': True,
                    'backgroundColor': 'rgba(255, 99, 132, 0.2)',
                    'borderColor': 'rgba(255, 99, 132, 1)',
                    'pointBackgroundColor': 'rgba(255, 99, 132, 1)',
                    'pointBorderColor': '#fff',
                    'pointHoverBackgroundColor': '#fff',
                    'pointHoverBorderColor': 'rgba(255, 99, 132, 1)'
                }
            ]
        }
    
    def _get_member_type_activities(self, membership_type):
        """Get activity data for a specific membership type"""
        # Get all members of this type
        members = self.env['custom.library.member'].search([
            ('membership_type', '=', membership_type)
        ])
        
        if not members:
            return [0, 0, 0, 0, 0]
        
        member_ids = [m.partner_id.id for m in members]
        
        # Count total loans
        loans_count = self.env['custom.book.loan'].search_count([
            ('member_id', 'in', member_ids)
        ])
        
        # Count returns
        returns_count = self.env['custom.book.loan'].search_count([
            ('member_id', 'in', member_ids),
            ('state', '=', 'returned')
        ])
        
        # Count overdue
        overdue_count = self.env['custom.book.loan'].search_count([
            ('member_id', 'in', member_ids),
            ('state', '=', 'overdue')
        ])
        
        # Count active members (made at least one loan)
        active_members_count = len(self.env['custom.book.loan'].search([
            ('member_id', 'in', member_ids)
        ]).mapped('member_id'))
        
        # New members (last 30 days)
        today = fields.Date.today()
        last_month = today - relativedelta(days=30)
        new_members_count = self.env['custom.library.member'].search_count([
            ('membership_date', '>=', last_month),
            ('membership_type', '=', membership_type)
        ])
        
        return [loans_count, returns_count, overdue_count, active_members_count, new_members_count]
    
    def _get_book_condition_data(self):
        """Get distribution of books by condition"""
        conditions = ['new', 'good', 'fair', 'poor', 'damaged']
        condition_labels = ['New', 'Good', 'Fair', 'Poor', 'Damaged']
        
        condition_counts = []
        for condition in conditions:
            count = self.env['custom.book'].search_count([('condition', '=', condition)])
            condition_counts.append(count)
        
        # Ensure we have at least some data
        if all(count == 0 for count in condition_counts):
            condition_counts = [1, 1, 1, 0, 0]  # Default to show something
        
        # Define colors for each condition
        colors = [
            'rgba(52, 168, 83, 0.8)',  # New - Green
            'rgba(66, 133, 244, 0.8)',  # Good - Blue
            'rgba(251, 188, 5, 0.8)',   # Fair - Yellow
            'rgba(234, 67, 53, 0.8)',   # Poor - Red
            'rgba(0, 0, 0, 0.5)'       # Damaged - Black
        ]
        
        return {
            'labels': condition_labels,
            'datasets': [{
                'data': condition_counts,
                'backgroundColor': colors,
                'borderWidth': 1
            }]
        }
    
    def _get_revenue_data(self):
        """Get monthly revenue from fines for the last 6 months"""
        # Get the last 6 months
        today = fields.Date.today()
        months = []
        labels = []
        
        for i in range(5, -1, -1):  # Last 6 months
            month_start = today.replace(day=1) - relativedelta(months=i)
            month_end = month_start + relativedelta(months=1) - relativedelta(days=1)
            months.append((month_start, month_end))
            labels.append(month_start.strftime('%b'))
        
        # Calculate revenue from fines for each month
        monthly_revenue = []
        for month_start, month_end in months:
            # Get all loans with fines in this month
            loans = self.env['custom.book.loan'].search([
                ('actual_return_date', '>=', month_start),
                ('actual_return_date', '<=', month_end),
                ('state', '=', 'returned'),
                ('fine_amount', '>', 0)
            ])
            
            # Sum all fines
            revenue = sum(loans.mapped('fine_amount'))
            monthly_revenue.append(revenue)
        
        return {
            'labels': labels,
            'datasets': [{
                'label': 'Revenue ($)',
                'data': monthly_revenue,
                'backgroundColor': 'rgba(0, 184, 169, 0.8)',
                'borderColor': 'rgba(0, 184, 169, 1)',
                'borderWidth': 1,
                'borderRadius': 4,
                'barThickness': 25,
                'maxBarThickness': 35
            }]
        }
    
    def _get_reading_times_data(self):
        """Analyze when books are borrowed (by day of week)"""
        # Get day distribution
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        weekday_counts = [0, 0, 0, 0, 0, 0, 0]
        
        # Get all loans from the past year
        today = fields.Date.today()
        last_year = today - relativedelta(years=1)
        
        loans = self.env['custom.book.loan'].search([
            ('loan_date', '>=', last_year)
        ])
        
        # Count loans by day of week
        for loan in loans:
            weekday = loan.loan_date.weekday()  # 0 = Monday, 6 = Sunday
            weekday_counts[weekday] += 1
        
        # Split into weekday and weekend data
        weekday_data = weekday_counts[:5] + [0, 0]
        weekend_data = [0, 0, 0, 0, 0] + weekday_counts[5:]
        
        return {
            'labels': days,
            'datasets': [
                {
                    'label': 'Weekday Borrows',
                    'data': weekday_data,
                    'backgroundColor': 'rgba(103, 58, 183, 0.8)',
                    'borderColor': 'rgba(103, 58, 183, 1)',
                    'borderWidth': 1,
                    'borderRadius': 4,
                    'barThickness': 15,
                    'maxBarThickness': 20
                },
                {
                    'label': 'Weekend Borrows',
                    'data': weekend_data,
                    'backgroundColor': 'rgba(186, 104, 200, 0.8)',
                    'borderColor': 'rgba(186, 104, 200, 1)',
                    'borderWidth': 1,
                    'borderRadius': 4,
                    'barThickness': 15,
                    'maxBarThickness': 20
                }
            ]
        }
    
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