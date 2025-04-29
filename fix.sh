#!/bin/bash

echo "Fixing Odoo dashboard issues..."

# Make this script executable
chmod +x /home/ghaly/my_project/individual_mod/fix.sh

# Clean Odoo asset cache
echo "Step 1: Cleaning Odoo's asset cache..."
if [ -d "/opt/odoo/odoo/custom_addons" ]; then
    find /opt/odoo/odoo/custom_addons -name "*.pyc" -delete
    echo "  Deleted .pyc files"
fi

# Browser cache clearing instructions
echo -e "\nStep 2: Clear your browser cache completely!"
echo "== BROWSER INSTRUCTIONS ===================================="
echo "In Chrome: Ctrl+Shift+Del -> Choose 'All time' -> Check 'Cached images and files' -> Click 'Clear data'"
echo "In Firefox: Ctrl+Shift+Del -> Choose 'Everything' -> Check 'Cache' -> Click 'Clear Now'"
echo "======================================================="

# Reset script instructions
echo -e "\nStep 3: If charts still don't show after cache clearing:"
echo "1. Open developer tools in your browser (press F12)"
echo "2. Go to the Console tab"
echo "3. Copy and paste the content of reset_assets.js"
echo "4. Press Enter to execute the reset script"

echo -e "\nStep 4: Restart your Odoo server"
echo "Command to restart Odoo service (if using systemd):"
echo "  sudo systemctl restart odoo"

echo -e "\nStep 5: Update your module in Odoo"
echo "1. Go to Apps menu in Odoo"
echo "2. Use the dropdown menu (⚙️) and select 'Update Apps List'"
echo "3. Search for 'Custom Library' module"
echo "4. Click 'Upgrade' button"

echo -e "\nDone! After following all steps, your charts should display properly." 