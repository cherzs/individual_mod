{
    'name' : 'Custom Library',
    'version' : '1.0',
    'summary' : 'Custom Library',
    'description' : """
      Modulue fot managing library books and authors
      - Track books, authorts, and genres
      - Generate reports and analytics
    """,
    'author' : 'Ghaly',
    'caregory' : 'Tools',
    'depends' : ['base', 'mail'],
    'data' : [
        'security/ir.model.access.csv',
        'views/author_views.xml',
        'views/book_views.xml',
        'views/menu_views.xml',
    ],
    'demo' : [
        'views/book_genre_data.xml',
    ],
    'installable' : True,
    'application' : True,
    'auto_install' : False,
    'assets' : {},
    'sequence' : 1,
}