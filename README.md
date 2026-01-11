# FairWindSK Settings v2.0 - Signal K Plugin & WebApp

A Signal K plugin and web application for managing FairWindSK navigation system settings with **automatic app population from Signal K Apps API**, **grouping**, and **drag-and-drop sorting**.

## 🆕 What's New in v2.0

### Signal K Apps API Integration
- **Automatic app discovery** from `/appstore/list` endpoint
- One-click sync to populate apps from Signal K
- Automatic categorization into groups
- Version tracking for Signal K apps

### App Grouping & Organization
- Apps organized into **4 default groups**:
  - 🗺️ Navigation (charts, plotters, routes)
  - 📊 Instruments (gauges, displays, panels)
  - 🔧 Utilities (anchors, autopilot, alarms)
  - 📦 Other (everything else)
- **Drag-and-drop** apps between groups
- **Sortable** within each group
- Visual group headers with app counts

### Manual App Creation
- Add custom applications with URLs
- Define custom icons
- Full control over app metadata
- Support for external web apps

### Source Tracking
- **Signal K apps** badged as "signalk"
- **Manual apps** badged as "manual"
- Easy identification of app source

## Features

- ✅ **Bootstrap 4 UI** - Clean, professional interface
- ✅ **Admin-Only Editing** - Security with user level checking
- ✅ **RESTful API** - Complete configuration management
- ✅ **Auto-Discovery** - Sync apps from Signal K
- ✅ **Grouping** - Organize apps by category
- ✅ **Drag-and-Drop** - jQuery UI sortable
- ✅ **Manual Apps** - Add custom applications
- ✅ **Bottom Bar** - 4 quick-access slots

## Installation

```bash
# Extract ZIP
unzip signalk-fairwindsk-settings.zip

# Install to Signal K
cp -r signalk-fairwindsk-settings ~/.signalk/node_modules/

# Restart Signal K
sudo systemctl restart signalk
```

## Quick Start Guide

### 1. Access the WebApp
1. Log in to Signal K as **admin**
2. Navigate to **Webapps** → **FairWindSK Settings**

### 2. Sync Apps from Signal K
1. Go to **Applications** tab
2. Click **"Sync from Signal K"** button
3. Apps will be automatically categorized and added
4. Click **Save** to persist

### 3. Organize Apps
- **Drag apps** between groups to recategorize
- **Drag within groups** to reorder
- **Check "Active"** to enable apps
- **Click trash icon** to remove apps

### 4. Add Manual Apps
1. Click **"Add Manual App"**
2. Fill in the form:
   - **Name/ID**: Unique identifier
   - **Display Name**: Human-readable name
   - **URL**: Application URL
   - **Icon URL**: Optional icon path
   - **Description**: Optional description
   - **Group**: Select category
3. Click **"Add Application"**

### 5. Configure Bottom Bar
1. Go to **Bottom Bar** tab
2. Select up to 4 apps for quick access
3. Only active apps appear in dropdown
4. Click **Save**

## Configuration Structure

```json
{
  "apps": [
    {
      "name": "@signalk/freeboard-sk",
      "description": "Chart plotter",
      "url": "/signalk/@signalk/freeboard-sk",
      "fairwind": {
        "active": true,
        "order": 100,
        "group": "navigation",
        "source": "signalk"
      },
      "signalk": {
        "displayName": "Freeboard-SK",
        "appIcon": "/path/to/icon.png",
        "version": "2.0.0"
      }
    }
  ],
  "appGroups": [
    {
      "id": "navigation",
      "name": "Navigation",
      "order": 1,
      "apps": []
    }
  ],
  "bottomBar": ["app1", "app2", "app3", "app4"]
}
```

## App Group System

### Default Groups

| Group | ID | Purpose | Auto-categorization Keywords |
|-------|-----|---------|------------------------------|
| 🗺️ Navigation | `navigation` | Charts, routes, maps | chart, map, route, navigation, freeboard, plotter |
| 📊 Instruments | `instruments` | Gauges, displays | instrument, gauge, display, panel, kip |
| 🔧 Utilities | `utilities` | Tools, alarms | anchor, alarm, autopilot, mydata, windlass |
| 📦 Other | `other` | Miscellaneous | Everything else |

### Customizing Groups

Apps are automatically categorized based on name and description keywords. You can:
- **Drag apps** between groups to manually recategorize
- Groups are saved with app assignment

## Signal K Apps API

The plugin uses these Signal K endpoints:

### `/appstore/list`
Returns list of installed Signal K applications:
```json
[
  {
    "name": "@signalk/freeboard-sk",
    "displayName": "Freeboard-SK",
    "description": "Chart plotter",
    "icon": "/path/to/icon.png",
    "version": "2.0.0"
  }
]
```

### Sync Behavior
- **New apps**: Added with `active: false`
- **Existing apps**: Metadata updated (name, icon, version)
- **Source tracking**: Signal K apps marked as `source: "signalk"`
- **Manual apps**: Preserved (marked as `source: "manual"`)

## REST API

### GET `/plugins/fairwindsk-settings/config`
Returns complete configuration

### PUT `/plugins/fairwindsk-settings/config`
Replace entire configuration (admin only)

### PATCH `/plugins/fairwindsk-settings/config`
Partial update (admin only)

### POST `/plugins/fairwindsk-settings/config/reset`
Reset to defaults (admin only)

## Security

- **Admin-only editing**: Checks `userLevel === "admin"` via `/signalk/v1/auth/validate`
- **Read-only for guests**: Non-admin users see disabled UI with overlay
- **User info display**: Navbar shows username and access level

## Troubleshooting

### Apps Not Syncing
**Issue**: "Sync from Signal K" returns 0 apps

**Solutions**:
1. Verify Signal K apps are installed
2. Check `/appstore/list` endpoint is accessible
3. Ensure Signal K server is running
4. Check browser console for errors

### Can't Drag Apps
**Issue**: Drag-and-drop not working

**Solutions**:
1. Ensure you're logged in as admin
2. Verify jQuery UI is loaded (check browser console)
3. Try refreshing the page

### Manual App Won't Add
**Issue**: "Add Manual App" form validation fails

**Solutions**:
1. Ensure all required fields are filled
2. Name/ID must be unique
3. URL must be valid format
4. Try different app name

### Bottom Bar Empty
**Issue**: No apps in bottom bar dropdowns

**Solutions**:
1. Enable apps in Applications tab first
2. Only active apps appear in dropdown
3. Save configuration after enabling apps

## Migration from v1.0

v2.0 is **backward compatible** with v1.0 configurations:

**Automatic Upgrades**:
- Legacy `apps` array is preserved
- Missing `group` field defaults to `"other"`
- Missing `source` field defaults to `"manual"`
- `appGroups` array is created if missing

**Manual Migration**:
1. Install v2.0
2. Click "Sync from Signal K"
3. Review and reorganize apps
4. Save configuration

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
├── index.js              # Backend plugin
├── package.json          # v2.0.0
├── public/
│   ├── index.html       # Bootstrap UI with modals
│   ├── app.js           # Signal K API integration
│   ├── styles.css       # Drag-and-drop styles
│   └── icon.svg         # Plugin icon
└── README.md
```

## License

Apache License 2.0

## Credits

- **FairWindSK Team** - Original project
- **Signal K Project** - Platform and Apps API
- **Bootstrap** - UI framework
- **jQuery UI** - Drag-and-drop functionality
- **Font Awesome** - Icons

## Support

- **GitHub Issues**: Bug reports and features
- **Signal K Forum**: Community support
- **Documentation**: This README

---

**Version:** 2.0.0  
**Date:** January 2025  
**Status:** Production Ready ✅
