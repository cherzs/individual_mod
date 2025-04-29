# -*- coding: utf-8 -*-
from odoo import models, fields, api, _
from datetime import datetime, timedelta

class BookLoan(models.Model):
    _name = 'custom.book.loan'
    _description = 'Book Loan'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'loan_date desc'

    name = fields.Char('Reference', required=True, copy=False, readonly=True, 
                        default=lambda self: _('New'))
    book_id = fields.Many2one('custom.book', string='Book', required=True)
    member_id = fields.Many2one('res.partner', string='Member', required=True)
    
    loan_date = fields.Date('Loan Date', default=fields.Date.today, required=True)
    return_date = fields.Date('Return Date', compute='_compute_return_date', store=True)
    actual_return_date = fields.Date('Actual Return Date')
    
    state = fields.Selection([
        ('draft', 'Draft'),
        ('confirmed', 'Confirmed'),
        ('returned', 'Returned'),
        ('overdue', 'Overdue'),
        ('lost', 'Lost'),
    ], string='Status', default='draft', tracking=True)
    
    loan_duration = fields.Integer('Loan Duration (days)', default=14)
    fine_amount = fields.Monetary('Fine Amount', compute='_compute_fine', store=True)
    currency_id = fields.Many2one('res.currency', related='company_id.currency_id')
    company_id = fields.Many2one('res.company', default=lambda self: self.env.company)
    
    notes = fields.Text('Notes')
    
    @api.depends('loan_date', 'loan_duration')
    def _compute_return_date(self):
        for loan in self:
            if loan.loan_date:
                loan.return_date = loan.loan_date + timedelta(days=loan.loan_duration)
            else:
                loan.return_date = False
    
    @api.depends('return_date', 'actual_return_date', 'state')
    def _compute_fine(self):
        for loan in self:
            if loan.state == 'returned' and loan.actual_return_date and loan.return_date:
                if loan.actual_return_date > loan.return_date:
                    days_late = (loan.actual_return_date - loan.return_date).days
                    # Implement your fine calculation logic here
                    loan.fine_amount = days_late * 1.5  # Example: $1.50 per day
                else:
                    loan.fine_amount = 0
            elif loan.state == 'overdue' and loan.return_date:
                today = fields.Date.today()
                if today > loan.return_date:
                    days_late = (today - loan.return_date).days
                    loan.fine_amount = days_late * 1.5
                else:
                    loan.fine_amount = 0
            else:
                loan.fine_amount = 0
    
    @api.model
    def create(self, vals):
        if vals.get('name', _('New')) == _('New'):
            vals['name'] = self.env['ir.sequence'].next_by_code('custom.book.loan') or _('New')
        return super(BookLoan, self).create(vals)
    
    def action_confirm(self):
        for loan in self:
            loan.state = 'confirmed'
    
    def action_return(self):
        for loan in self:
            loan.actual_return_date = fields.Date.today()
            loan.state = 'returned'
    
    def action_mark_lost(self):
        for loan in self:
            loan.state = 'lost'
    
    @api.model
    def _cron_check_overdue(self):
        """Daily cron job to check for overdue loans"""
        today = fields.Date.today()
        overdue_loans = self.search([
            ('state', '=', 'confirmed'),
            ('return_date', '<', today)
        ])
        for loan in overdue_loans:
            loan.state = 'overdue' 