// FairWindSK Settings WebApp with Signal K Apps API Integration

class FairWindSKSettings {
    constructor() {
        this.config = null;
        this.signalKApps = [];
        this.apiBase = '/plugins/fairwindsk-settings';
        this.signalkPathsData = this.getSignalKPathsMetadata();
        this.isAdmin = false;
        this.userLevel = null;
        
        this.init();
    }

    async init() {
        await this.checkUserLevel();
        await this.loadConfig();
        await this.loadSignalKApps();
        this.setupEventListeners();
        this.populateUI();
        this.updateUIState();
    }

    // Check user level
    async checkUserLevel() {
        try {
            const response = await fetch('/signalk/v1/auth/validate', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                this.userLevel = data.userLevel || 'guest';
                this.isAdmin = this.userLevel === 'admin';
                
                // Update UI
                $('#userName').text(data.username || 'Guest');
                $('#userLevel').text(this.userLevel.toUpperCase())
                    .removeClass('badge-secondary badge-success')
                    .addClass(this.isAdmin ? 'badge-success' : 'badge-secondary');
            } else {
                this.userLevel = 'guest';
                this.isAdmin = false;
                $('#userName').text('Guest');
                $('#userLevel').text('GUEST').addClass('badge-secondary');
            }
        } catch (error) {
            console.error('Error checking user level:', error);
            this.userLevel = 'guest';
            this.isAdmin = false;
            $('#userName').text('Guest');
            $('#userLevel').text('GUEST').addClass('badge-secondary');
        }
    }

    // Load apps from Signal K Apps API
    async loadSignalKApps() {
        try {
            const response = await fetch('/appstore/list');
            if (response.ok) {
                const data = await response.json();
                this.signalKApps = data || [];
                console.log('Loaded Signal K apps:', this.signalKApps.length);
            }
        } catch (error) {
            console.warn('Could not load Signal K apps:', error);
            this.signalKApps = [];
        }
    }

    // Sync apps from Signal K Apps API
    async syncAppsFromSignalK() {
        if (!this.isAdmin) {
            this.showNotification('Administrator access required', 'warning');
            return;
        }

        await this.loadSignalKApps();

        if (this.signalKApps.length === 0) {
            this.showNotification('No Signal K apps found', 'warning');
            return;
        }

        // Initialize apps array and groups if needed
        if (!this.config.apps) {
            this.config.apps = [];
        }
        if (!this.config.appGroups) {
            this.config.appGroups = this.getDefaultGroups();
        }

        let addedCount = 0;
        let updatedCount = 0;

        this.signalKApps.forEach(skApp => {
            const existingApp = this.config.apps.find(app => app.name === skApp.name);

            if (!existingApp) {
                // Add new app
                const newApp = {
                    name: skApp.name,
                    description: skApp.description || '',
                    url: `/signalk/${skApp.name}`,
                    fairwind: {
                        active: false,
                        order: this.config.apps.length * 100,
                        group: this.categorizeApp(skApp.name, skApp.description),
                        source: 'signalk'
                    },
                    signalk: {
                        displayName: skApp.displayName || skApp.name,
                        appIcon: skApp.icon || null,
                        version: skApp.version || null
                    }
                };
                this.config.apps.push(newApp);
                addedCount++;
            } else {
                // Update existing app metadata
                existingApp.description = skApp.description || existingApp.description;
                existingApp.signalk.displayName = skApp.displayName || existingApp.signalk.displayName;
                existingApp.signalk.appIcon = skApp.icon || existingApp.signalk.appIcon;
                existingApp.signalk.version = skApp.version || existingApp.signalk.version;
                if (!existingApp.fairwind.source) {
                    existingApp.fairwind.source = 'signalk';
                }
                updatedCount++;
            }
        });

        this.populateAppsTab();
        this.populateBottomBarTab();
        this.enableSave();

        this.showNotification(
            `Synced: ${addedCount} added, ${updatedCount} updated`,
            'success'
        );
    }

    // Categorize app into a group
    categorizeApp(name, description) {
        const text = (name + ' ' + (description || '')).toLowerCase();
        
        if (text.match(/chart|map|route|navigation|freeboard|plotter/)) {
            return 'navigation';
        } else if (text.match(/instrument|gauge|display|panel|kip/)) {
            return 'instruments';
        } else if (text.match(/anchor|alarm|autopilot|mydata|windlass/)) {
            return 'utilities';
        }
        
        return 'other';
    }

    // Get default groups
    getDefaultGroups() {
        return [
            { id: 'navigation', name: 'Navigation', order: 1, apps: [] },
            { id: 'instruments', name: 'Instruments', order: 2, apps: [] },
            { id: 'utilities', name: 'Utilities', order: 3, apps: [] },
            { id: 'other', name: 'Other', order: 999, apps: [] }
        ];
    }

    // API Methods
    async loadConfig() {
        try {
            const response = await fetch(`${this.apiBase}/config`);
            if (!response.ok) throw new Error('Failed to load configuration');
            this.config = await response.json();
            
            // Ensure required fields exist
            if (!this.config.bottomBar) {
                this.config.bottomBar = ['', '', '', ''];
            }
            if (!this.config.apps) {
                this.config.apps = [];
            }
            if (!this.config.appGroups) {
                this.config.appGroups = this.getDefaultGroups();
            }
            
            // Ensure all apps have a group
            this.config.apps.forEach(app => {
                if (!app.fairwind.group) {
                    app.fairwind.group = 'other';
                }
                if (!app.fairwind.source) {
                    app.fairwind.source = 'manual';
                }
            });
        } catch (error) {
            console.error('Error loading configuration:', error);
            this.showNotification('Failed to load configuration', 'danger');
        }
    }

    async saveConfig() {
        if (!this.isAdmin) {
            this.showNotification('Administrator access required', 'warning');
            return false;
        }

        try {
            const response = await fetch(`${this.apiBase}/config`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.config)
            });
            
            if (!response.ok) throw new Error('Failed to save configuration');
            
            this.showNotification('Configuration saved successfully', 'success');
            $('#saveBtn').prop('disabled', true);
            return true;
        } catch (error) {
            console.error('Error saving configuration:', error);
            this.showNotification('Failed to save configuration', 'danger');
            return false;
        }
    }

    async resetConfig() {
        if (!this.isAdmin) {
            this.showNotification('Administrator access required', 'warning');
            return;
        }

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
            $('#saveBtn').prop('disabled', true);
        } catch (error) {
            console.error('Error resetting configuration:', error);
            this.showNotification('Failed to reset configuration', 'danger');
        }
    }

    // UI Population
    populateUI() {
        this.populateMainTab();
        this.populateSignalKTab();
        this.populateAppsTab();
        this.populateBottomBarTab();
    }

    populateMainTab() {
        if (!this.config || !this.config.main) return;

        $('#windowMode').val(this.config.main.windowMode || 'centered');
        $('#windowWidth').val(this.config.main.windowWidth || 1024);
        $('#windowHeight').val(this.config.main.windowHeight || 600);
        $('#windowLeft').val(this.config.main.windowLeft || 0);
        $('#windowTop').val(this.config.main.windowTop || 0);
        $('#virtualKeyboard').prop('checked', this.config.main.virtualKeyboard || false);

        this.updateWindowFieldStates();

        if (this.config.units) {
            $('#unitAirPressure').val(this.config.units.airPressure || 'hPa');
            $('#unitAirTemperature').val(this.config.units.airTemperature || 'C');
            $('#unitWaterTemperature').val(this.config.units.waterTemperature || 'C');
            $('#unitDepth').val(this.config.units.depth || 'mt');
            $('#unitDistance').val(this.config.units.distance || 'nm');
            $('#unitVesselSpeed').val(this.config.units.vesselSpeed || 'kn');
            $('#unitWindSpeed').val(this.config.units.windSpeed || 'kn');
            $('#unitRange').val(this.config.units.range || 'rm');
        }
    }

    populateSignalKTab() {
        if (!this.config || !this.config.signalk) return;

        const tbody = $('#signalkPathsBody');
        tbody.empty();

        Object.entries(this.config.signalk).forEach(([key, value]) => {
            const row = $('<tr>');
            
            const labelCell = $('<td>').text(this.getSignalKPathLabel(key));
            const inputCell = $('<td>');
            const input = $('<input>')
                .attr('type', 'text')
                .addClass('form-control form-control-sm')
                .val(value)
                .data('pathKey', key)
                .on('change', () => this.enableSave());
            
            if (!this.isAdmin) {
                input.prop('readonly', true);
            }
            
            inputCell.append(input);
            row.append(labelCell, inputCell);
            tbody.append(row);
        });
    }

    populateAppsTab() {
        if (!this.config || !this.config.apps) return;

        const container = $('#appGroupsContainer');
        container.empty();

        // Organize apps by group
        const groupedApps = {};
        this.config.appGroups.forEach(group => {
            groupedApps[group.id] = {
                ...group,
                apps: []
            };
        });

        // Assign apps to groups
        this.config.apps.forEach(app => {
            const groupId = app.fairwind.group || 'other';
            if (groupedApps[groupId]) {
                groupedApps[groupId].apps.push(app);
            }
        });

        // Sort groups by order
        const sortedGroups = Object.values(groupedApps).sort((a, b) => a.order - b.order);

        // Render groups
        sortedGroups.forEach(group => {
            if (group.apps.length > 0) {
                const groupCard = this.createGroupCard(group);
                container.append(groupCard);
            }
        });

        // Make apps sortable within groups
        if (this.isAdmin) {
            $('.app-group-list').sortable({
                connectWith: '.app-group-list',
                handle: '.drag-handle',
                placeholder: 'app-placeholder',
                update: (event, ui) => {
                    this.updateAppOrdersAndGroups();
                    this.enableSave();
                }
            });
        }
    }

    createGroupCard(group) {
        const card = $('<div>').addClass('card mb-3');
        
        const header = $('<div>').addClass('card-header bg-light');
        const title = $('<h6>').addClass('mb-0').html(`
            <i class="fas fa-folder"></i> ${group.name}
            <span class="badge badge-secondary ml-2">${group.apps.length}</span>
        `);
        header.append(title);
        
        const body = $('<div>').addClass('card-body p-2');
        const appList = $('<div>')
            .addClass('app-group-list')
            .attr('data-group-id', group.id);
        
        // Sort apps by order
        group.apps.sort((a, b) => (a.fairwind.order || 0) - (b.fairwind.order || 0));
        
        group.apps.forEach(app => {
            const appItem = this.createAppItem(app);
            appList.append(appItem);
        });
        
        body.append(appList);
        card.append(header, body);
        
        return card;
    }

    createAppItem(app) {
        const item = $('<div>')
            .addClass('app-item card mb-2')
            .attr('data-app-name', app.name);
        
        const itemBody = $('<div>').addClass('card-body p-2');
        const row = $('<div>').addClass('row align-items-center');
        
        // Drag handle
        const dragCol = $('<div>').addClass('col-auto');
        if (this.isAdmin) {
            dragCol.html('<i class="fas fa-grip-vertical drag-handle text-muted" style="cursor: move;"></i>');
        }
        
        // Icon
        const iconCol = $('<div>').addClass('col-auto');
        const icon = $('<i>').addClass('fas fa-mobile-alt text-primary');
        iconCol.append(icon);
        
        // Details
        const detailsCol = $('<div>').addClass('col');
        const name = $('<strong>').text(app.signalk?.displayName || app.name);
        const source = $('<span>')
            .addClass(`badge badge-${app.fairwind.source === 'signalk' ? 'info' : 'secondary'} ml-2`)
            .text(app.fairwind.source || 'manual');
        const description = $('<small>').addClass('text-muted d-block').text(app.description || 'No description');
        
        detailsCol.append(name, source, description);
        
        // Controls
        const controlsCol = $('<div>').addClass('col-auto');
        
        // Active checkbox
        const activeCheck = $('<div>').addClass('custom-control custom-checkbox');
        const checkboxId = `app-active-${app.name.replace(/[^a-zA-Z0-9]/g, '')}`;
        const checkbox = $('<input>')
            .attr('type', 'checkbox')
            .attr('id', checkboxId)
            .addClass('custom-control-input')
            .prop('checked', app.fairwind.active || false)
            .on('change', (e) => {
                app.fairwind.active = e.target.checked;
                this.enableSave();
                this.populateBottomBarTab();
            });
        const label = $('<label>')
            .attr('for', checkboxId)
            .addClass('custom-control-label')
            .text('Active');
        
        if (!this.isAdmin) {
            checkbox.prop('disabled', true);
        }
        
        activeCheck.append(checkbox, label);
        
        // Delete button
        const deleteBtn = $('<button>')
            .addClass('btn btn-sm btn-danger ml-2')
            .html('<i class="fas fa-trash"></i>')
            .attr('title', 'Remove application')
            .on('click', () => this.deleteApp(app.name));
        
        if (!this.isAdmin) {
            deleteBtn.prop('disabled', true);
        }
        
        controlsCol.append(activeCheck, deleteBtn);
        
        row.append(dragCol, iconCol, detailsCol, controlsCol);
        itemBody.append(row);
        item.append(itemBody);
        
        return item;
    }

    updateAppOrdersAndGroups() {
        // Update app groups and orders based on current DOM state
        $('.app-group-list').each((i, groupList) => {
            const groupId = $(groupList).data('group-id');
            $(groupList).find('.app-item').each((index, appItem) => {
                const appName = $(appItem).data('app-name');
                const app = this.config.apps.find(a => a.name === appName);
                if (app) {
                    app.fairwind.group = groupId;
                    app.fairwind.order = index * 100;
                }
            });
        });
    }

    populateBottomBarTab() {
        if (!this.config) return;

        if (!this.config.bottomBar) {
            this.config.bottomBar = ['', '', '', ''];
        }

        for (let i = 1; i <= 4; i++) {
            const select = $(`#bottomBar${i}`);
            select.empty();
            
            select.append($('<option>').val('').text('-- None --'));
            
            if (this.config.apps) {
                this.config.apps
                    .filter(app => app.fairwind?.active)
                    .forEach(app => {
                        const displayName = app.signalk?.displayName || app.name;
                        select.append($('<option>').val(app.name).text(displayName));
                    });
            }
            
            select.val(this.config.bottomBar[i - 1] || '');
            
            if (!this.isAdmin) {
                select.prop('disabled', true);
            }
        }
    }

    // Event Listeners
    setupEventListeners() {
        $('#saveBtn').on('click', () => {
            this.collectFormData();
            this.saveConfig();
        });

        $('#resetBtn').on('click', () => this.resetConfig());

        $('#syncAppsBtn').on('click', () => this.syncAppsFromSignalK());

        $('#addManualAppBtn').on('click', () => this.showAddManualAppModal());
        
        $('#saveManualApp').on('click', () => this.addManualApp());

        $('#windowMode').on('change', () => {
            this.updateWindowFieldStates();
            this.enableSave();
        });

        $('input, select').on('change input', () => this.enableSave());

        $(document).on('change', '#signalkPathsBody input', function() {
            const key = $(this).data('pathKey');
            const value = $(this).val();
            this.config.signalk[key] = value;
            this.enableSave();
        }.bind(this));

        for (let i = 1; i <= 4; i++) {
            $(`#bottomBar${i}`).on('change', () => this.enableSave());
        }
    }

    showAddManualAppModal() {
        if (!this.isAdmin) {
            this.showNotification('Administrator access required', 'warning');
            return;
        }
        
        $('#manualAppForm')[0].reset();
        $('#addManualAppModal').modal('show');
    }

    addManualApp() {
        const form = $('#manualAppForm')[0];
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const newApp = {
            name: $('#manualAppName').val(),
            description: $('#manualAppDescription').val() || '',
            url: $('#manualAppUrl').val(),
            fairwind: {
                active: false,
                order: this.config.apps.length * 100,
                group: $('#manualAppGroup').val(),
                source: 'manual'
            },
            signalk: {
                displayName: $('#manualAppDisplayName').val(),
                appIcon: $('#manualAppIcon').val() || null
            }
        };

        // Check for duplicates
        if (this.config.apps.find(app => app.name === newApp.name)) {
            this.showNotification('An app with this name already exists', 'danger');
            return;
        }

        this.config.apps.push(newApp);
        this.populateAppsTab();
        this.populateBottomBarTab();
        this.enableSave();
        
        $('#addManualAppModal').modal('hide');
        this.showNotification('Manual application added', 'success');
    }

    deleteApp(appName) {
        if (!this.isAdmin) {
            this.showNotification('Administrator access required', 'warning');
            return;
        }

        if (!confirm('Are you sure you want to remove this application?')) {
            return;
        }

        const index = this.config.apps.findIndex(app => app.name === appName);
        if (index !== -1) {
            this.config.apps.splice(index, 1);
            this.populateAppsTab();
            this.populateBottomBarTab();
            this.enableSave();
            this.showNotification('Application removed', 'success');
        }
    }

    enableSave() {
        if (this.isAdmin) {
            $('#saveBtn').prop('disabled', false);
        }
    }

    updateUIState() {
        const isEditable = this.isAdmin;
        
        if (!isEditable) {
            $('#adminOverlay').show();
            $('input, select, button').not('#saveBtn, #resetBtn').prop('disabled', true);
            $('#saveBtn, #resetBtn').prop('disabled', true);
        } else {
            $('#adminOverlay').hide();
        }
    }

    collectFormData() {
        // Main settings
        this.config.main.windowMode = $('#windowMode').val();
        this.config.main.windowWidth = parseInt($('#windowWidth').val());
        this.config.main.windowHeight = parseInt($('#windowHeight').val());
        this.config.main.windowLeft = parseInt($('#windowLeft').val());
        this.config.main.windowTop = parseInt($('#windowTop').val());
        this.config.main.virtualKeyboard = $('#virtualKeyboard').is(':checked');

        // Units
        this.config.units.airPressure = $('#unitAirPressure').val();
        this.config.units.airTemperature = $('#unitAirTemperature').val();
        this.config.units.waterTemperature = $('#unitWaterTemperature').val();
        this.config.units.depth = $('#unitDepth').val();
        this.config.units.distance = $('#unitDistance').val();
        this.config.units.vesselSpeed = $('#unitVesselSpeed').val();
        this.config.units.windSpeed = $('#unitWindSpeed').val();
        this.config.units.range = $('#unitRange').val();

        // Signal K paths
        $('#signalkPathsBody input').each((i, input) => {
            const key = $(input).data('pathKey');
            this.config.signalk[key] = $(input).val();
        });

        // Update app orders and groups from DOM
        this.updateAppOrdersAndGroups();

        // Bottom bar
        this.config.bottomBar = [];
        for (let i = 1; i <= 4; i++) {
            this.config.bottomBar.push($(`#bottomBar${i}`).val() || '');
        }
    }

    updateWindowFieldStates() {
        const mode = $('#windowMode').val();
        const widthField = $('#windowWidth');
        const heightField = $('#windowHeight');
        const leftField = $('#windowLeft');
        const topField = $('#windowTop');

        switch (mode) {
            case 'centered':
                widthField.prop('disabled', false);
                heightField.prop('disabled', false);
                leftField.prop('disabled', true);
                topField.prop('disabled', true);
                break;
            case 'maximized':
            case 'fullscreen':
                widthField.prop('disabled', true);
                heightField.prop('disabled', true);
                leftField.prop('disabled', true);
                topField.prop('disabled', true);
                break;
            default:
                widthField.prop('disabled', false);
                heightField.prop('disabled', false);
                leftField.prop('disabled', false);
                topField.prop('disabled', false);
        }

        if (!this.isAdmin) {
            widthField.prop('disabled', true);
            heightField.prop('disabled', true);
            leftField.prop('disabled', true);
            topField.prop('disabled', true);
        }
    }

    showNotification(message, type = 'info') {
        const toast = $('#notification');
        const title = type === 'success' ? 'Success' : 
                     type === 'danger' ? 'Error' : 
                     type === 'warning' ? 'Warning' : 'Info';
        
        $('#toastTitle').text(title);
        $('#toastBody').text(message);
        
        toast.removeClass('bg-success bg-danger bg-warning bg-info')
            .addClass(`bg-${type === 'success' ? 'success' : 
                          type === 'danger' ? 'danger' : 
                          type === 'warning' ? 'warning' : 'info'}`);
        
        toast.toast('show');
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

$(document).ready(() => {
    new FairWindSKSettings();
});
