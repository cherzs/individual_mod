from odoo import models, fields, api, _

class Author(models.Model):
    _name = 'custom.author'
    _description = 'Author'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'name asc'

    name = fields.Char('Name', required=True, tracking=True)
    birth_date = fields.Date('Birth Date')
    biography = fields.Text('Biography')
    image = fields.Binary('Photo')
    active = fields.Boolean(default=True)

    book_ids = fields.One2many('custom.book', 'author_id', string='Books')
    book_count = fields.Integer(compute='_compute_book_count', string='Books Count')

    @api.depends('book_ids')
    def _compute_book_count(self):
        for author in self:
            author.book_count = len(author.book_ids)

    def action_view_books(self):
        self.ensure_one()
        return{
            'name': _('Books by %s', self.name),
            'type': 'ir.actions.act_window',
            'res_model': 'custom.book',
            'domain': [('author_id', '=', self.id)],
            'view_mode': 'tree, form',
            'view_id': self.env.ref('library_management.view_book_tree').id,
            'context': {'default_author_id': self.id}
        }