# -*- coding: utf-8 -*-
from odoo import models, fields, api, _
from datetime import datetime, timedelta

class LibraryMember(models.Model):
    _name = 'custom.library.member'
    _description = 'Library Member'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    
    name = fields.Char(related='partner_id.name', store=True)
    partner_id = fields.Many2one('res.partner', string='Contact', required=True, 
                                tracking=True, ondelete='restrict')
    member_number = fields.Char('Member Number', required=True, copy=False, 
                                readonly=True, default=lambda self: _('New'))
    membership_date = fields.Date('Membership Date', default=fields.Date.today, required=True)
    expiry_date = fields.Date('Expiry Date', compute='_compute_expiry_date', store=True)
    
    active = fields.Boolean(default=True)
    membership_type = fields.Selection([
        ('standard', 'Standard'),
        ('premium', 'Premium'),
        ('student', 'Student'),
        ('senior', 'Senior')
    ], string='Membership Type', default='standard', required=True, tracking=True)
    
    loan_count = fields.Integer('Loan Count', compute='_compute_loan_count')
    overdue_count = fields.Integer('Overdue Count', compute='_compute_loan_count')
    
    notes = fields.Text('Notes')
    phone = fields.Char(related='partner_id.phone', readonly=False)
    email = fields.Char(related='partner_id.email', readonly=False)
    
    max_loan_limit = fields.Integer('Max Books Allowed', compute='_compute_loan_limit')
    currency_id = fields.Many2one('res.currency', related='company_id.currency_id')
    company_id = fields.Many2one('res.company', default=lambda self: self.env.company)
    
    @api.model
    def create(self, vals):
        if vals.get('member_number', _('New')) == _('New'):
            vals['member_number'] = self.env['ir.sequence'].next_by_code('custom.library.member') or _('New')
        return super(LibraryMember, self).create(vals)
    
    @api.depends('membership_date', 'membership_type')
    def _compute_expiry_date(self):
        for member in self:
            if member.membership_date:
                if member.membership_type == 'standard':
                    member.expiry_date = member.membership_date + timedelta(days=365)
                elif member.membership_type == 'premium':
                    member.expiry_date = member.membership_date + timedelta(days=730)
                elif member.membership_type == 'student':
                    member.expiry_date = member.membership_date + timedelta(days=180)
                elif member.membership_type == 'senior':
                    member.expiry_date = member.membership_date + timedelta(days=365)
                else:
                    member.expiry_date = member.membership_date + timedelta(days=365)
            else:
                member.expiry_date = False
    
    def _compute_loan_count(self):
        for member in self:
            loan_domain = [('member_id', '=', member.partner_id.id)]
            member.loan_count = self.env['custom.book.loan'].search_count(loan_domain)
            
            overdue_domain = loan_domain + [('state', '=', 'overdue')]
            member.overdue_count = self.env['custom.book.loan'].search_count(overdue_domain)
    
    @api.depends('membership_type')
    def _compute_loan_limit(self):
        for member in self:
            if member.membership_type == 'standard':
                member.max_loan_limit = 3
            elif member.membership_type == 'premium':
                member.max_loan_limit = 10
            elif member.membership_type == 'student':
                member.max_loan_limit = 5
            elif member.membership_type == 'senior':
                member.max_loan_limit = 7
            else:
                member.max_loan_limit = 3 