# Custom Library Module

## Overview
The Custom Library module is a comprehensive solution for managing library operations within Odoo. It provides functionality for tracking books, authors, genres, member management, and book loans. The module also includes a dashboard for visualizing key metrics and analytics.

## Features
- **Book Management**: Track books with details like ISBN, publication date, condition, and price
- **Author Tracking**: Maintain a database of authors with biographical information
- **Genre Classification**: Organize books by genre with color-coding
- **Member Management**: Keep records of library members with membership types and history
- **Loan System**: Process and track book loans, returns, and overdue items
- **Fine Calculation**: Automatically calculate fines for overdue or lost books
- **Dashboard**: Visual representations of important library metrics
- **Reports and Analytics**: Generate insights about library operations

## Installation
1. Clone this repository to your Odoo addons directory:
   ```
   git clone [repository_url] /path/to/odoo/addons/individual_mod
   ```
2. Update the Odoo app list:
   - Go to Apps menu
   - Click "Update Apps List"
3. Install the Custom Library module:
   - Search for "Custom Library" in the Apps menu
   - Click Install

## Configuration
After installation, you can configure the module through the Settings menu. Some key configurations include:
- Default loan duration
- Fine calculation parameters
- Member types
- Book conditions

## Demo Data
The module comes with comprehensive demo data to help you understand how it works:
- 10 sample authors
- 12 book genres
- 12 sample books
- 8 library members
- 15 sample book loans
- A configured dashboard

Demo data is automatically loaded when you install the module in demo mode.

## Module Structure
- `models/`: Contains the data models (Book, Author, Genre, Member, Loan, Dashboard)
- `views/`: XML view definitions for UI components
- `data/`: Demo data and configuration files
- `security/`: Access control rules and permissions
- `static/`: CSS and JavaScript assets for the dashboard and charts

## Dashboard
The library dashboard provides visual insights into:
- Book inventory status
- Loan statistics
- Member activity
- Popular genres and authors
- Overdue loans and fines collected

## Development
To extend or modify this module:
1. Follow Odoo development standards
2. Use the existing architecture patterns
3. Add new models by inheriting from existing ones when appropriate
4. Update views as needed

## License
[Specify your license here]

## Author
Ghaly

## Support
For support, please contact [your contact information] 