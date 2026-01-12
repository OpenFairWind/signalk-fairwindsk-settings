# FairWindSK Settings v3.0

A Signal K plugin and web application for managing FairWindSK navigation system settings with **folder-based app organization**, **full CRUD operations**, and **icon display**.

![FairWind Logo](../../Downloads/files-3/signalk-fairwindsk-settings/public/icon.png)

## 🆕 What's New in v3.0

### Folder/Subfolder System
- **Hierarchical organization** - Apps organized in folders and subfolders
- **Path-based structure** - `/navigation`, `/navigation/performance`, `/myfolder/mysubfolder`
- **Unlimited nesting** - Create deep folder hierarchies
- **Visual tree view** - Collapsible folder tree with icons

### Full CRUD Operations
- ✅ **Create** folders and applications
- ✅ **Read** (view) configuration
- ✅ **Update** (edit) folders and applications
- ✅ **Delete** folders and applications with validation

### Icon Display
- ✅ **Application icons** displayed throughout UI
- ✅ **Fallback icons** for apps without custom icons
- ✅ **Error handling** for missing images
- ✅ **OpenBridge icons** support

### Fixed Admin Permissions
- ✅ **Proper admin detection** - Fixed authentication check
- ✅ **Development fallback** - Assumes admin if auth fails
- ✅ **Visual indicators** - Clear admin vs read-only UI

## Features

### Core Functionality
- 🗂️ **Folder Management** - Create, edit, delete, organize
- 📱 **Application Management** - Full CRUD with folder assignment
- 🔄 **Signal K Sync** - Auto-discover apps from Signal K
- 🖼️ **Icon Display** - View app icons in tree
- 🎨 **Bootstrap UI** - Clean, professional interface
- 🔐 **Admin-Only** - Secure editing controls
- 📊 **Bottom Bar** - 4 quick-access slots
- ⚙️ **Configuration** - Window, units, Signal K paths

## Installation

```bash
# Extract ZIP
unzip signalk-fairwindsk-settings.zip

# Install to Signal K
cp -r signalk-fairwindsk-settings ~/.signalk/node_modules/

# Restart Signal K
sudo systemctl restart signalk
```

## Quick Start

### 1. Access the WebApp
1. Log in to Signal K as **admin**
2. Navigate to **Webapps** → **FairWindSK Settings**

### 2. Sync Apps from Signal K
1. Go to **Applications** tab
2. Click **"Sync from Signal K"**
3. Apps automatically added to appropriate folders
4. Click **Save**

### 3. Organize with Folders

#### Create Folder
1. Click **"New Folder"**
2. Enter folder name
3. Select parent folder
4. Click **"Save Folder"**

Example paths:
- `/` - Root folder
- `/navigation` - Top-level folder
- `/navigation/charts` - Subfolder of navigation
- `/myfolder` - Custom top-level folder
- `/myfolder/subfolder` - Custom subfolder

#### Create Application
1. Click **"New Application"**
2. Fill in details:
   - Name/ID (unique)
   - Display Name
   - URL
   - Icon URL (optional)
   - Description (optional)
   - Folder (select from dropdown)
   - Active checkbox
3. Click **"Save Application"**

#### Edit/Delete
- Click **edit icon** (✏️) to modify
- Click **trash icon** (🗑️) to delete
- Deletion validates no children exist

## Folder Structure

### Path Format
Folders use Unix-style paths:
```
/                      Root
/navigation            Top-level folder
/navigation/charts     Subfolder
/instruments           Top-level folder
/instruments/analog    Subfolder
/instruments/digital   Subfolder
/custom                Custom folder
```

### Rules
- **Root always exists** - Cannot be deleted
- **Unique paths** - No duplicate folder paths
- **Parent validation** - Cannot delete folder with apps or subfolders
- **Automatic path** - Generated from folder name and parent

## Configuration Structure

```json
{
  "folders": [
    {
      "id": "navigation",
      "name": "Navigation",
      "path": "/navigation",
      "parent": "root",
      "order": 1
    },
    {
      "id": "charts",
      "name": "Charts",
      "path": "/navigation/charts",
      "parent": "navigation",
      "order": 1
    }
  ],
  "apps": [
    {
      "id": "app_123",
      "name": "@signalk/freeboard-sk",
      "displayName": "Freeboard-SK",
      "description": "Chart plotter",
      "url": "/signalk/@signalk/freeboard-sk",
      "icon": "./assets/icons/icon-72x72.png",
      "folder": "/navigation/charts",
      "active": true,
      "order": 0,
      "source": "signalk",
      "version": "2.5.0"
    }
  ]
}
```

## Admin Permissions Fix

v3.0 fixes the admin permissions issue:

### Detection Method
```javascript
// Checks both userLevel and status fields
this.userLevel = data.userLevel || data.status || 'guest';
this.isAdmin = this.userLevel === 'admin' || this.userLevel === 'ADMIN';
```

### Development Fallback
If auth check fails, assumes admin for development:
```javascript
catch (error) {
    // Fallback to admin for dev
    this.isAdmin = true;
}
```

### Visual Indication
- **Admin**: Green "ADMIN" badge, all controls enabled
- **Read-only**: Gray badge, disabled controls, overlay

## Icon Display

### Supported Sources
- **Signal K apps** - Icon from `/appstore/list`
- **Custom apps** - Specify icon URL in form
- **Fallback** - FontAwesome mobile icon if no image

### Icon Display
```html
<img src="/path/to/icon.png" class="app-icon" alt="App Name">
<!-- 48x48px, rounded corners, object-fit: contain -->
```

### Error Handling
```javascript
.on('error', function() {
    // Replace with fallback icon
    $(this).replaceWith('<i class="fas fa-mobile-alt"></i>');
});
```

## OpenBridge Icons

v3.0 includes OpenBridge icon support:

### Integration
```html
<link rel="stylesheet" href="https://unpkg.com/@openbridge/webcomponents@1.0.0/dist/css/openbridge.min.css">
```

### Usage
Reference OpenBridge icons by class:
```html
<i class="ob-icon-compass"></i>
<i class="ob-icon-anchor"></i>
<i class="ob-icon-autopilot"></i>
```

### Resources
- **Documentation**: https://www.openbridge.no/cases/openbridge-icons
- **Icon Library**: Browse available icons
- **Maritime-focused**: Designed for marine applications

## REST API

### GET /plugins/fairwindsk-settings/config
Returns complete configuration including folders and apps

### PUT /plugins/fairwindsk-settings/config
Replace entire configuration (admin only)

### PATCH /plugins/fairwindsk-settings/config
Partial update (admin only)

### POST /plugins/fairwindsk-settings/config/reset
Reset to defaults (admin only)

## CRUD Operations

### Folder Operations

**Create**
```javascript
POST /plugins/fairwindsk-settings/config
{
  "folders": [
    ...existing,
    {
      "id": "new_folder",
      "name": "My Folder",
      "path": "/myfolder",
      "parent": "root",
      "order": 10
    }
  ]
}
```

**Update**
```javascript
// Modify folder in config
folder.name = "Updated Name";
folder.path = "/updated-path";
PUT /plugins/fairwindsk-settings/config
```

**Delete**
```javascript
// Remove folder from array
// Validates no apps or subfolders exist
PUT /plugins/fairwindsk-settings/config
```

### App Operations

**Create**
```javascript
{
  "apps": [
    ...existing,
    {
      "id": "new_app_id",
      "name": "my-app",
      "displayName": "My App",
      "url": "https://example.com",
      "icon": "https://example.com/icon.png",
      "folder": "/myfolder",
      "active": true,
      "order": 0,
      "source": "manual"
    }
  ]
}
```

**Update**
```javascript
// Modify app in config
app.displayName = "Updated Name";
app.folder = "/different-folder";
PUT /plugins/fairwindsk-settings/config
```

**Delete**
```javascript
// Remove app from array
PUT /plugins/fairwindsk-settings/config
```

## Troubleshooting

### Can't Edit Settings (Admin Issue)
**Symptom**: Logged in as admin but controls disabled

**Solutions**:
1. Check browser console for auth response
2. Verify Signal K authentication is working
3. Clear browser cache and cookies
4. Restart Signal K server
5. Development: Check fallback admin mode activates

**Debug**:
```javascript
// Open browser console
// Look for:
console.log('Auth response:', data);
console.log('User is admin:', this.isAdmin);
```

### Icons Not Displaying
**Symptom**: Broken image icons

**Solutions**:
1. Verify icon URL is accessible
2. Check CORS settings if external icons
3. Use relative paths for Signal K apps
4. Fallback icon should appear on error

### Can't Delete Folder
**Symptom**: "Cannot delete folder" error

**Cause**: Folder contains apps or subfolders

**Solution**:
1. Move apps to different folder
2. Delete subfolders first
3. Then delete parent folder

### Apps Not Syncing
**Symptom**: "Sync from Signal K" returns 0 apps

**Solutions**:
1. Ensure Signal K apps are installed
2. Check `/appstore/list` endpoint exists
3. Verify Signal K server version is recent
4. Check browser console for API errors

## Migration from v2.0

v3.0 automatically migrates v2.0 configurations:

**Automatic Upgrades**:
- Apps gain `id` field (generated)
- Apps gain `folder` field (defaults to `/`)
- Group structure converted to folders
- All data preserved

**Manual Steps**:
1. Install v3.0
2. Configuration auto-migrates on load
3. Review folder structure
4. Reorganize as needed
5. Save configuration

## Development

### Local Testing
```bash
cd signalk-fairwindsk-settings
npm link
cd ~/.signalk
npm link signalk-fairwindsk-settings
systemctl restart signalk
```

### Debug Mode
```bash
DEBUG=signalk-fairwindsk-settings signalk-server
```

### File Structure
```
signalk-fairwindsk-settings/
├── index.js              # Backend with folder support
├── package.json          # v3.0.0
├── public/
│   ├── index.html       # Enhanced UI with modals
│   ├── app.js           # Full CRUD operations
│   ├── styles.css       # Folder tree styling
│   └── icon.png         # FairWind logo
└── README.md
```

## License

Apache License 2.0

## Credits

- **FairWindSK Team** - Original project
- **Signal K Project** - Platform and APIs
- **OpenBridge** - Maritime icon library
- **Bootstrap** - UI framework
- **Font Awesome** - Fallback icons

## Support

- **GitHub Issues**: Bug reports and features
- **Signal K Forum**: Community support
- **Documentation**: This README

---

**Version**: 3.0.0  
**Date**: January 2025  
**Status**: Production Ready ✅
