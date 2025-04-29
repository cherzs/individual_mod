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
    genre_id = fields.Many2one('custom.book.genre', string='Primary Genre', tracking=True)
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
    
    # Dashboard fields
    acquisition_date = fields.Date('Acquisition Date', default=fields.Date.today)
    condition = fields.Selection([
        ('new', 'New'),
        ('good', 'Good'),
        ('fair', 'Fair'),
        ('poor', 'Poor'),
        ('damaged', 'Damaged')
    ], string='Condition', default='new', tracking=True)
    
    loan_ids = fields.One2many('custom.book.loan', 'book_id', string='Loans')
    loan_count = fields.Integer(compute='_compute_loan_count', string='Loan Count')

    @api.constrains('isbn')
    def _check_isbn(self):
        for book in self:
            if book.isbn and len(book.isbn.replace('-', '')) != 13:
                raise models.ValidationError('ISBN must be 13 digits')
    
    @api.depends('loan_ids')
    def _compute_loan_count(self):
        for book in self:
            book.loan_count = len(book.loan_ids)
    
    def action_marks_as_borrowed(self):
        for book in self:
            book.state = 'borrowed'

    def action_mark_as_available(self):
        for book in self:
            book.state = 'available'
    
    def action_mark_as_lost(self):
        for book in self:
            book.state = 'lost'
            

    