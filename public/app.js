// FairWindSK Settings WebApp

class FairWindSKSettings {
    constructor() {
        this.config = null;
        this.apiBase = '/plugins/fairwindsk-settings';
        this.signalkPathsData = this.getSignalKPathsMetadata();
        
        this.init();
    }

    async init() {
        await this.loadConfig();
        this.setupEventListeners();
        this.populateUI();
    }

    // API Methods
    async loadConfig() {
        try {
            const response = await fetch(`${this.apiBase}/config`);
            if (!response.ok) throw new Error('Failed to load configuration');
            this.config = await response.json();
        } catch (error) {
            console.error('Error loading configuration:', error);
            this.showNotification('Failed to load configuration', 'error');
        }
    }

    async saveConfig() {
        try {
            const response = await fetch(`${this.apiBase}/config`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.config)
            });
            
            if (!response.ok) throw new Error('Failed to save configuration');
            
            this.showNotification('Configuration saved successfully', 'success');
            return true;
        } catch (error) {
            console.error('Error saving configuration:', error);
            this.showNotification('Failed to save configuration', 'error');
            return false;
        }
    }

    async resetConfig() {
        if (!confirm('Are you sure you want to reset all settings to defaults?')) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/config/reset`, {
                method: 'POST'
            });
            
            if (!response.ok) throw new Error('Failed to reset configuration');
            
            await this.loadConfig();
            this.populateUI();
            this.showNotification('Configuration reset to defaults', 'success');
        } catch (error) {
            console.error('Error resetting configuration:', error);
            this.showNotification('Failed to reset configuration', 'error');
        }
    }

    // UI Population
    populateUI() {
        this.populateMainTab();
        this.populateConnectionTab();
        this.populateSignalKTab();
        this.populateAppsTab();
    }

    populateMainTab() {
        if (!this.config || !this.config.main) return;

        // Window settings
        document.getElementById('windowMode').value = this.config.main.windowMode || 'centered';
        document.getElementById('windowWidth').value = this.config.main.windowWidth || 1024;
        document.getElementById('windowHeight').value = this.config.main.windowHeight || 600;
        document.getElementById('windowLeft').value = this.config.main.windowLeft || 0;
        document.getElementById('windowTop').value = this.config.main.windowTop || 0;
        document.getElementById('virtualKeyboard').checked = this.config.main.virtualKeyboard || false;

        // Update window field states based on mode
        this.updateWindowFieldStates();

        // Units
        if (this.config.units) {
            document.getElementById('unitAirPressure').value = this.config.units.airPressure || 'hPa';
            document.getElementById('unitAirTemperature').value = this.config.units.airTemperature || 'C';
            document.getElementById('unitWaterTemperature').value = this.config.units.waterTemperature || 'C';
            document.getElementById('unitDepth').value = this.config.units.depth || 'mt';
            document.getElementById('unitDistance').value = this.config.units.distance || 'nm';
            document.getElementById('unitVesselSpeed').value = this.config.units.vesselSpeed || 'kn';
            document.getElementById('unitWindSpeed').value = this.config.units.windSpeed || 'kn';
            document.getElementById('unitRange').value = this.config.units.range || 'rm';
        }
    }

    populateConnectionTab() {
        if (!this.config || !this.config.connection) return;
        document.getElementById('serverUrl').value = this.config.connection.server || '';
    }

    populateSignalKTab() {
        if (!this.config || !this.config.signalk) return;

        const container = document.getElementById('signalkPaths');
        container.innerHTML = '';

        Object.entries(this.config.signalk).forEach(([key, value]) => {
            const pathItem = document.createElement('div');
            pathItem.className = 'path-item';
            
            const label = document.createElement('div');
            label.className = 'path-label';
            label.textContent = this.getSignalKPathLabel(key);
            
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'input';
            input.value = value;
            input.dataset.pathKey = key;
            
            input.addEventListener('change', (e) => {
                this.config.signalk[key] = e.target.value;
            });
            
            pathItem.appendChild(label);
            pathItem.appendChild(input);
            container.appendChild(pathItem);
        });
    }

    populateAppsTab() {
        if (!this.config || !this.config.apps) return;

        const container = document.getElementById('appsList');
        container.innerHTML = '';

        // Sort apps by order
        const sortedApps = [...this.config.apps].sort((a, b) => {
            const orderA = a.fairwind?.order || 0;
            const orderB = b.fairwind?.order || 0;
            return orderA - orderB;
        });

        sortedApps.forEach((app, index) => {
            const appCard = this.createAppCard(app, index);
            container.appendChild(appCard);
        });
    }

    createAppCard(app, index) {
        const card = document.createElement('div');
        card.className = 'app-card';
        card.dataset.index = index;

        // Icon
        const icon = document.createElement('div');
        icon.className = 'app-icon';
        if (app.signalk?.appIcon) {
            const img = document.createElement('img');
            img.src = app.signalk.appIcon.replace('file://', '/');
            img.alt = app.signalk?.displayName || app.name;
            icon.appendChild(img);
        } else {
            icon.textContent = '📱';
        }

        // Details
        const details = document.createElement('div');
        details.className = 'app-details';

        const name = document.createElement('div');
        name.className = 'app-name';
        name.textContent = app.signalk?.displayName || app.name;

        const description = document.createElement('div');
        description.className = 'app-description';
        description.textContent = app.description || 'No description';

        const url = document.createElement('div');
        url.className = 'app-url';
        url.textContent = app.name;

        details.appendChild(name);
        details.appendChild(description);
        details.appendChild(url);

        // Controls
        const controls = document.createElement('div');
        controls.className = 'app-controls';

        // Active checkbox
        const activeWrapper = document.createElement('div');
        activeWrapper.className = 'app-active';
        
        const activeCheckbox = document.createElement('input');
        activeCheckbox.type = 'checkbox';
        activeCheckbox.checked = app.fairwind?.active || false;
        activeCheckbox.addEventListener('change', (e) => {
            this.config.apps[index].fairwind.active = e.target.checked;
        });

        const activeLabel = document.createElement('label');
        activeLabel.textContent = 'Active';
        activeLabel.style.cursor = 'pointer';
        activeLabel.appendChild(activeCheckbox);

        activeWrapper.appendChild(activeLabel);

        // Order controls
        const orderWrapper = document.createElement('div');
        orderWrapper.className = 'app-order';

        const upBtn = document.createElement('button');
        upBtn.className = 'btn-icon';
        upBtn.innerHTML = '↑';
        upBtn.title = 'Move up';
        upBtn.addEventListener('click', () => this.moveApp(index, -1));

        const downBtn = document.createElement('button');
        downBtn.className = 'btn-icon';
        downBtn.innerHTML = '↓';
        downBtn.title = 'Move down';
        downBtn.addEventListener('click', () => this.moveApp(index, 1));

        orderWrapper.appendChild(upBtn);
        orderWrapper.appendChild(downBtn);

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-icon btn-delete';
        deleteBtn.innerHTML = '✕';
        deleteBtn.title = 'Remove application';
        deleteBtn.addEventListener('click', () => this.deleteApp(index));

        controls.appendChild(activeWrapper);
        controls.appendChild(orderWrapper);
        controls.appendChild(deleteBtn);

        card.appendChild(icon);
        card.appendChild(details);
        card.appendChild(controls);

        return card;
    }

    // Event Listeners
    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Save button
        document.getElementById('saveBtn').addEventListener('click', () => {
            this.collectFormData();
            this.saveConfig();
        });

        // Reset button
        document.getElementById('resetBtn').addEventListener('click', () => this.resetConfig());

        // Add app button
        document.getElementById('addAppBtn').addEventListener('click', () => this.addNewApp());

        // Window mode change
        document.getElementById('windowMode').addEventListener('change', () => {
            this.updateWindowFieldStates();
        });

        // Main settings listeners
        this.setupMainTabListeners();
    }

    setupMainTabListeners() {
        const fields = [
            'windowMode', 'windowWidth', 'windowHeight', 'windowLeft', 'windowTop',
            'virtualKeyboard', 'unitAirPressure', 'unitAirTemperature', 
            'unitWaterTemperature', 'unitDepth', 'unitDistance', 'unitVesselSpeed',
            'unitWindSpeed', 'unitRange'
        ];

        fields.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) {
                const eventType = element.type === 'checkbox' ? 'change' : 'input';
                element.addEventListener(eventType, () => {
                    // Auto-save is disabled, user must click Save
                });
            }
        });

        // Server URL
        document.getElementById('serverUrl').addEventListener('input', () => {
            // Auto-save is disabled
        });
    }

    collectFormData() {
        // Main settings
        this.config.main.windowMode = document.getElementById('windowMode').value;
        this.config.main.windowWidth = parseInt(document.getElementById('windowWidth').value);
        this.config.main.windowHeight = parseInt(document.getElementById('windowHeight').value);
        this.config.main.windowLeft = parseInt(document.getElementById('windowLeft').value);
        this.config.main.windowTop = parseInt(document.getElementById('windowTop').value);
        this.config.main.virtualKeyboard = document.getElementById('virtualKeyboard').checked;

        // Units
        this.config.units.airPressure = document.getElementById('unitAirPressure').value;
        this.config.units.airTemperature = document.getElementById('unitAirTemperature').value;
        this.config.units.waterTemperature = document.getElementById('unitWaterTemperature').value;
        this.config.units.depth = document.getElementById('unitDepth').value;
        this.config.units.distance = document.getElementById('unitDistance').value;
        this.config.units.vesselSpeed = document.getElementById('unitVesselSpeed').value;
        this.config.units.windSpeed = document.getElementById('unitWindSpeed').value;
        this.config.units.range = document.getElementById('unitRange').value;

        // Connection
        this.config.connection.server = document.getElementById('serverUrl').value;

        // Signal K paths are updated in real-time via event listeners
        // Apps are updated in real-time via event listeners
    }

    // UI Helper Methods
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
    }

    updateWindowFieldStates() {
        const mode = document.getElementById('windowMode').value;
        const widthField = document.getElementById('windowWidth');
        const heightField = document.getElementById('windowHeight');
        const leftField = document.getElementById('windowLeft');
        const topField = document.getElementById('windowTop');

        switch (mode) {
            case 'centered':
                widthField.disabled = false;
                heightField.disabled = false;
                leftField.disabled = true;
                topField.disabled = true;
                break;
            case 'maximized':
            case 'fullscreen':
                widthField.disabled = true;
                heightField.disabled = true;
                leftField.disabled = true;
                topField.disabled = true;
                break;
            default: // windowed
                widthField.disabled = false;
                heightField.disabled = false;
                leftField.disabled = false;
                topField.disabled = false;
        }
    }

    // App Management
    addNewApp() {
        const newApp = {
            name: 'new-app',
            description: 'New Application',
            fairwind: {
                active: false,
                order: this.config.apps.length * 100
            },
            signalk: {
                displayName: 'New Application',
                appIcon: null
            }
        };

        this.config.apps.push(newApp);
        this.populateAppsTab();
    }

    moveApp(index, direction) {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= this.config.apps.length) return;

        // Swap apps
        [this.config.apps[index], this.config.apps[newIndex]] = 
        [this.config.apps[newIndex], this.config.apps[index]];

        // Update orders
        this.config.apps.forEach((app, i) => {
            app.fairwind.order = (i + 1) * 100;
        });

        this.populateAppsTab();
    }

    deleteApp(index) {
        if (!confirm('Are you sure you want to remove this application?')) {
            return;
        }

        this.config.apps.splice(index, 1);
        
        // Reorder remaining apps
        this.config.apps.forEach((app, i) => {
            app.fairwind.order = (i + 1) * 100;
        });

        this.populateAppsTab();
    }

    // Utilities
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type} show`;

        setTimeout(() => {
            notification.classList.remove('show');
        }, 4000);
    }

    getSignalKPathLabel(key) {
        const labels = this.signalkPathsData.paths;
        return labels[key] || key;
    }

    getSignalKPathsMetadata() {
        return {
            paths: {
                btw: 'Bearing to Waypoint',
                cog: 'Course Over Ground',
                dpt: 'Depth',
                dtg: 'Distance to Go',
                eta: 'Estimated Time of Arrival',
                hdg: 'Heading',
                pos: 'Position',
                sog: 'Speed Over Ground',
                stw: 'Speed Through Water',
                ttg: 'Time To Go',
                vmg: 'Velocity Made Good',
                wpt: 'Waypoint',
                xte: 'Cross Track Error',
                rsa: 'Rudder Angle',
                notifications: 'Notifications',
                'notifications.abandon': 'Abandon Ship Alarm',
                'notifications.adrift': 'Adrift Alarm',
                'notifications.fire': 'Fire Alarm',
                'notifications.pob': 'Person Overboard',
                'notifications.piracy': 'Piracy Alarm',
                'notifications.sinking': 'Sinking Alarm',
                'notifications.anchor': 'Anchor Alarm',
                'anchor.bearing': 'Anchor Bearing',
                'anchor.radius': 'Anchor Current Radius',
                'anchor.distance': 'Anchor Distance',
                'anchor.fudge': 'Anchor Fudge Factor',
                'anchor.max': 'Anchor Max Radius',
                'anchor.meta': 'Anchor Metadata',
                'anchor.position': 'Anchor Position',
                'anchor.depth': 'Anchor Depth',
                'anchor.rode': 'Anchor Rode Length',
                'anchor.actions.up': 'Anchor Up',
                'anchor.actions.down': 'Anchor Down',
                'anchor.actions.reset': 'Anchor Reset',
                'anchor.actions.release': 'Anchor Release',
                'anchor.actions.drop': 'Anchor Drop',
                'anchor.actions.raise': 'Anchor Raise',
                'anchor.actions.radius': 'Anchor Set Radius',
                'anchor.actions.rode': 'Anchor Set Rode',
                'anchor.actions.set': 'Anchor Set Parameters',
                'pob.startTime': 'POB Start Time',
                'pob.bearing': 'POB Bearing',
                'pob.distance': 'POB Distance',
                'autopilot.state': 'Autopilot State',
                'autopilot.mode': 'Autopilot Mode',
                'autopilot.target.heading': 'Autopilot Target Heading',
                'autopilot.target.windAngle': 'Autopilot Target Wind Angle'
            }
        };
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new FairWindSKSettings();
});
