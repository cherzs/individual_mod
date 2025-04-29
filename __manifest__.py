{
    'name' : 'Custom Library',
    'version' : '1.0',
    'summary' : 'Custom Library',
    'description' : """
      Modulue for managing library books and authors
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
        'views/book_loan_views.xml',
        'views/library_dashboard.xml',
        'views/member_view.xml',
        'views/menu_views.xml',
    ],
    'demo' : [
        # First load entities with no dependencies
        'data/author_demo_data.xml',
        'data/book_genre_demo_data.xml',
        # Then load entities that depend on the above
        'data/book_demo_data.xml',
        'data/library_member_demo_data.xml',
        # Then load entities that depend on books and members
        'data/bookloan_demo_data.xml',
        # Finally load the dashboard which uses all the data
        'data/library_dashboard_demo_data.xml',
        # This is just a marker file
        'data/demo_data.xml',
        # Legacy file - kept for backward compatibility
        'views/book_genre_data.xml',
    ],
    'assets' : {
        'web.assets_backend' : [
            'individual_mod/static/src/css/dashboard.css',
            'individual_mod/static/src/css/chart_colors.css',
            'individual_mod/static/src/js/chart_loader.js',
            'individual_mod/static/src/js/chart_setup.js',
            'individual_mod/static/src/js/dashboard_chart.js',
        ],
    },
    'installable' : True,
    'application' : True,
    'auto_install' : False,
    'sequence' : 1,
}