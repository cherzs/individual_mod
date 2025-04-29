# -*- coding: utf-8 -*-
from odoo import models, fields, api, _

class BookGenre(models.Model):
    _name = 'custom.book.genre'
    _description = 'Book Genre'
    _order = 'name'
    
    name = fields.Char('Name', required=True)
    code = fields.Char('Code', size=5)
    description = fields.Text('Description')
    active = fields.Boolean(default=True)
    
    book_ids = fields.One2many('custom.book', 'genre_id', string='Books')
    book_count = fields.Integer(compute='_compute_book_count', string='Book Count')
    
    color = fields.Integer('Color Index')
    sequence = fields.Integer('Sequence', default=10)
    
    _sql_constraints = [
        ('name_uniq', 'unique (name)', 'Genre name must be unique !'),
        ('code_uniq', 'unique (code)', 'Genre code must be unique !')
    ]
    
    @api.depends('book_ids')
    def _compute_book_count(self):
        for genre in self:
            genre.book_count = len(genre.book_ids) 