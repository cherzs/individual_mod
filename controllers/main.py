# -*- coding: utf-8 -*-
from odoo import http
from odoo.http import request
import json
import logging

_logger = logging.getLogger(__name__)

class LibraryDashboardController(http.Controller):
    
    @http.route('/library/dashboard/data', type='json', auth='user')
    def get_dashboard_data(self):
        """Return dashboard data for charts"""
        try:
            dashboard = request.env['custom.library.dashboard'].sudo()._get_default_dashboard()
            return {
                'success': True,
                'data': json.loads(dashboard.graph_data) if dashboard.graph_data else {},
                'message': 'Data loaded successfully'
            }
        except Exception as e:
            _logger.error("Error loading dashboard data: %s", str(e))
            return {
                'success': False,
                'message': f'Error loading data: {str(e)}',
                'data': {}
            }
            
    @http.route('/library/dashboard/refresh', type='json', auth='user')
    def refresh_dashboard_data(self):
        """Refresh dashboard data by recomputing graph data"""
        try:
            dashboard = request.env['custom.library.dashboard'].sudo()._get_default_dashboard()
            # Force recomputation of graph data
            dashboard.invalidate_recordset(['graph_data'])
            dashboard._compute_graph_data()
            return {
                'success': True,
                'data': json.loads(dashboard.graph_data) if dashboard.graph_data else {},
                'message': 'Data refreshed successfully'
            }
        except Exception as e:
            _logger.error("Error refreshing dashboard data: %s", str(e))
            return {
                'success': False,
                'message': f'Error refreshing data: {str(e)}',
                'data': {}
            } 