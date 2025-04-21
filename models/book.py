from odoo import models, fields, api, _

class BookGenre(models.Model):
    _name = 'custom.book.genre'
    _description = 'Book Genre'

    name = fields.Char('Name', required=True) 
    description = fields.Text('Description')
    

    _sql_constraints = [
        ('name_uniq', 'unique (name)', 'The genre name must be unique')
    ]


class Book(models.Model):
    _name = 'custom.book'
    _description = 'Library Book'
    _inherit = ['mail.thread', 'mail.activity.mixin']

    name = fields.Char('Title', required=True, tracking=True)
    isbn = fields.Char('ISBN', required=True, tracking=True)
    active = fields.Boolean(default=True)
    date_published = fields.Date('Date Published')  
    cover_image = fields.Binary('Cover Image')

    author_id = fields.Many2one('custom.author', string='Author', tracking=True)
    genre_ids = fields.Many2many('custom.book.genre', string='Genres')

    pages = fields.Integer('Number of Pages')
    description = fields.Text('Description')
    publisher = fields.Char('Publisher')

    currency_id = fields.Many2one(
        'res.currency',
        string='Currency',
        default=lambda self: self.env.company.currency_id.id
    )

    price = fields.Monetary('Price', currency_field='currency_id')
    
    state = fields.Selection([
        ('available', 'Available'),
        ('borrowed', 'Borrowed'),
        ('lost', 'Lost'),
    ], default='available', String='Status', tracking=True)

    @api.constrains('isnn')
    def _check_isbn(self):
        for book in self:
            if book.isbn and len (book.isbn.replace('-', '')) != 13:
                raise models.ValidationError('ISBN must be 13 digits')
    
    def action_marks_as_borrowed(self):
        for book in self:
            book.state = 'borrowed'

    def action_mark_as_available(self):
        for book in self:
            book.state = 'available'
    
    def action_mark_as_lost(self):
        for book in self:
            book.state = 'lost'
            

    