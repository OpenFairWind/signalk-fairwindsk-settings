// FairWindSK Settings v3.0 - Folder-based App Management

class FairWindSKSettings {
    constructor() {
        this.config = null;
        this.signalKApps = [];
        this.apiBase = '/plugins/fairwindsk-settings';
        this.signalkPathsData = this.getSignalKPathsMetadata();
        this.isAdmin = false;
        this.userLevel = null;
        this.editingFolder = null;
        this.editingApp = null;
        
        // Check for dev bypass in URL (for development/testing)
        const urlParams = new URLSearchParams(window.location.search);
        this.devMode = urlParams.get('dev') === 'true';
        if (this.devMode) {
            console.warn('DEVELOPMENT MODE ENABLED - Auth bypass active');
        }
        
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

    // Check user level - FIXED to properly detect admin
    async checkUserLevel() {
        // Development mode bypass
        if (this.devMode) {
            console.warn('DEV MODE: Bypassing auth check, assuming admin');
            this.userLevel = 'admin';
            this.isAdmin = true;
            $('#userName').text('Developer');
            $('#userLevel').text('DEV MODE').addClass('badge-warning');
            return;
        }
        
        try {
            const response = await fetch('/signalk/v1/auth/validate', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('Auth validation response:', data); // Debug log
                
                // Signal K returns different formats depending on auth state
                // When logged in as admin: { status: "COMPLETED", userLevel: "admin", username: "admin" }
                // When not logged in: { status: "NOTLOGGEDIN" } or 401
                
                // Check multiple possible fields
                const status = data.status || '';
                const userLevel = data.userLevel || '';
                const username = data.username || data.id || '';
                
                // Determine if user is admin
                this.isAdmin = (
                    userLevel.toLowerCase() === 'admin' || 
                    status.toLowerCase() === 'admin' ||
                    username.toLowerCase() === 'admin'
                );
                
                this.userLevel = userLevel || status || 'guest';
                
                $('#userName').text(username || 'Guest');
                $('#userLevel').text(this.userLevel.toUpperCase())
                    .removeClass('badge-secondary badge-success')
                    .addClass(this.isAdmin ? 'badge-success' : 'badge-secondary');
                    
                console.log('User level:', this.userLevel);
                console.log('Is admin:', this.isAdmin);
                console.log('Username:', username);
            } else {
                console.log('Auth validation failed, response not OK');
                // Not logged in or auth failed
                this.userLevel = 'guest';
                this.isAdmin = false;
                $('#userName').text('Guest');
                $('#userLevel').text('GUEST').addClass('badge-secondary');
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            // On error, check if we're in development mode or assume not logged in
            this.userLevel = 'guest';
            this.isAdmin = false;
            $('#userName').text('Guest');
            $('#userLevel').text('GUEST').addClass('badge-secondary');
        }
    }

    // Load apps from Signal K
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

    // Sync apps from Signal K
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

        if (!this.config.apps) {
            this.config.apps = [];
        }

        let addedCount = 0;
        let updatedCount = 0;

        this.signalKApps.forEach(skApp => {
            const existingApp = this.config.apps.find(app => app.name === skApp.name);

            if (!existingApp) {
                const newApp = {
                    id: this.generateId(),
                    name: skApp.name,
                    displayName: skApp.displayName || skApp.name,
                    description: skApp.description || '',
                    url: `/signalk/${skApp.name}`,
                    icon: skApp.icon || null,
                    folder: this.categorizeFolderPath(skApp.name, skApp.description),
                    active: false,
                    order: this.config.apps.length,
                    source: 'signalk',
                    version: skApp.version || null
                };
                this.config.apps.push(newApp);
                addedCount++;
            } else {
                existingApp.displayName = skApp.displayName || existingApp.displayName;
                existingApp.description = skApp.description || existingApp.description;
                existingApp.icon = skApp.icon || existingApp.icon;
                existingApp.version = skApp.version || existingApp.version;
                if (!existingApp.source) {
                    existingApp.source = 'signalk';
                }
                updatedCount++;
            }
        });

        this.populateFolderTree();
        this.populateBottomBarTab();
        this.enableSave();

        this.showNotification(
            `Synced: ${addedCount} added, ${updatedCount} updated`,
            'success'
        );
    }

    // Categorize into folder path
    categorizeFolderPath(name, description) {
        const text = (name + ' ' + (description || '')).toLowerCase();
        
        if (text.match(/chart|map|route|freeboard|plotter/)) {
            return '/navigation';
        } else if (text.match(/instrument|gauge|display|panel|kip/)) {
            return '/instruments';
        } else if (text.match(/anchor|alarm|autopilot|mydata|windlass/)) {
            return '/utilities';
        }
        
        return '/';
    }

    // Generate unique ID
    generateId() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // API Methods
    async loadConfig() {
        try {
            const response = await fetch(`${this.apiBase}/config`);
            if (!response.ok) throw new Error('Failed to load configuration');
            this.config = await response.json();
            
            // Ensure required fields
            if (!this.config.bottomBar) {
                this.config.bottomBar = ['', '', '', ''];
            }
            if (!this.config.apps) {
                this.config.apps = [];
            }
            if (!this.config.folders) {
                this.config.folders = this.getDefaultFolders();
            }
            
            // Migrate old apps
            this.config.apps.forEach(app => {
                if (!app.id) app.id = this.generateId();
                if (!app.folder) app.folder = '/';
                if (!app.source) app.source = 'manual';
                if (app.active === undefined) app.active = false;
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

    getDefaultFolders() {
        return [
            { id: 'root', name: 'Root', path: '/', parent: null, order: 0 },
            { id: 'navigation', name: 'Navigation', path: '/navigation', parent: 'root', order: 1 },
            { id: 'instruments', name: 'Instruments', path: '/instruments', parent: 'root', order: 2 },
            { id: 'utilities', name: 'Utilities', path: '/utilities', parent: 'root', order: 3 }
        ];
    }

    // UI Population
    populateUI() {
        this.populateMainTab();
        this.populateSignalKTab();
        this.populateFolderTree();
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

    populateFolderTree() {
        if (!this.config) return;

        const container = $('#folderTree');
        container.empty();

        // Build folder tree recursively
        const rootFolder = this.config.folders.find(f => f.path === '/');
        if (rootFolder) {
            const tree = this.buildFolderTreeNode(rootFolder);
            container.append(tree);
        }
    }

    buildFolderTreeNode(folder) {
        const folderId = folder.id || folder.path.replace(/\//g, '_') || 'root';
        const folderDiv = $('<div>').addClass('folder-node');
        
        // Folder header
        const header = $('<div>').addClass('folder-header');
        
        const icon = $('<i>').addClass('fas fa-folder text-primary mr-2');
        const name = $('<strong>').text(folder.name).addClass('folder-name');
        
        const actions = $('<div>').addClass('folder-actions ml-auto');
        
        if (this.isAdmin && folder.path !== '/') {
            const editBtn = $('<button>')
                .addClass('btn btn-sm btn-link text-primary')
                .html('<i class="fas fa-edit"></i>')
                .attr('title', 'Edit folder')
                .on('click', () => this.showEditFolderModal(folder));
            
            const deleteBtn = $('<button>')
                .addClass('btn btn-sm btn-link text-danger')
                .html('<i class="fas fa-trash"></i>')
                .attr('title', 'Delete folder')
                .on('click', () => this.deleteFolder(folder));
            
            actions.append(editBtn, deleteBtn);
        }
        
        header.append(icon, name, actions);
        folderDiv.append(header);
        
        // Apps in this folder
        const appsContainer = $('<div>').addClass('folder-apps ml-4');
        const appsInFolder = this.config.apps.filter(app => app.folder === folder.path);
        
        appsInFolder.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        appsInFolder.forEach(app => {
            const appItem = this.createAppItem(app);
            appsContainer.append(appItem);
        });
        
        folderDiv.append(appsContainer);
        
        // Subfolders
        const subfolders = this.config.folders.filter(f => f.parent === folderId);
        subfolders.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        const subfoldersContainer = $('<div>').addClass('subfolders ml-4');
        subfolders.forEach(subfolder => {
            const subfolderNode = this.buildFolderTreeNode(subfolder);
            subfoldersContainer.append(subfolderNode);
        });
        
        folderDiv.append(subfoldersContainer);
        
        return folderDiv;
    }

    createAppItem(app) {
        const item = $('<div>').addClass('app-item card mb-2');
        const body = $('<div>').addClass('card-body p-2');
        const row = $('<div>').addClass('row align-items-center');
        
        // Icon
        const iconCol = $('<div>').addClass('col-auto');
        if (app.icon) {
            const iconImg = $('<img>')
                .attr('src', app.icon)
                .addClass('app-icon')
                .attr('alt', app.displayName || app.name)
                .on('error', function() {
                    $(this).replaceWith($('<i>').addClass('fas fa-mobile-alt fa-2x text-primary'));
                });
            iconCol.append(iconImg);
        } else {
            iconCol.html('<i class="fas fa-mobile-alt fa-2x text-primary"></i>');
        }
        
        // Details
        const detailsCol = $('<div>').addClass('col');
        const title = $('<div>');
        const nameSpan = $('<strong>').text(app.displayName || app.name);
        const sourceBadge = $('<span>')
            .addClass(`badge badge-${app.source === 'signalk' ? 'info' : 'secondary'} ml-2`)
            .text(app.source || 'manual');
        title.append(nameSpan, sourceBadge);
        
        const desc = $('<small>').addClass('text-muted d-block').text(app.description || 'No description');
        const url = $('<small>').addClass('text-info d-block font-monospace').text(app.url || app.name);
        
        detailsCol.append(title, desc, url);
        
        // Controls
        const controlsCol = $('<div>').addClass('col-auto');
        
        // Active checkbox
        const activeDiv = $('<div>').addClass('custom-control custom-checkbox mr-2');
        const checkId = `app-${app.id}-active`;
        const checkbox = $('<input>')
            .attr('type', 'checkbox')
            .attr('id', checkId)
            .addClass('custom-control-input')
            .prop('checked', app.active || false)
            .on('change', (e) => {
                app.active = e.target.checked;
                this.enableSave();
                this.populateBottomBarTab();
            });
        const label = $('<label>')
            .attr('for', checkId)
            .addClass('custom-control-label')
            .text('Active');
        
        if (!this.isAdmin) {
            checkbox.prop('disabled', true);
        }
        
        activeDiv.append(checkbox, label);
        
        // Action buttons
        const btnGroup = $('<div>').addClass('btn-group btn-group-sm');
        
        const editBtn = $('<button>')
            .addClass('btn btn-outline-primary')
            .html('<i class="fas fa-edit"></i>')
            .attr('title', 'Edit application')
            .on('click', () => this.showEditAppModal(app));
        
        const deleteBtn = $('<button>')
            .addClass('btn btn-outline-danger')
            .html('<i class="fas fa-trash"></i>')
            .attr('title', 'Delete application')
            .on('click', () => this.deleteApp(app));
        
        if (!this.isAdmin) {
            editBtn.prop('disabled', true);
            deleteBtn.prop('disabled', true);
        }
        
        btnGroup.append(editBtn, deleteBtn);
        
        controlsCol.append(activeDiv, btnGroup);
        
        row.append(iconCol, detailsCol, controlsCol);
        body.append(row);
        item.append(body);
        
        return item;
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
                    .filter(app => app.active)
                    .forEach(app => {
                        const displayName = app.displayName || app.name;
                        select.append($('<option>').val(app.name).text(displayName));
                    });
            }
            
            select.val(this.config.bottomBar[i - 1] || '');
            
            if (!this.isAdmin) {
                select.prop('disabled', true);
            }
        }
    }

    // Folder CRUD Operations
    showAddFolderModal() {
        if (!this.isAdmin) {
            this.showNotification('Administrator access required', 'warning');
            return;
        }
        
        this.editingFolder = null;
        $('#folderModalTitle').text('Add Folder');
        $('#folderId').val('');
        $('#folderName').val('');
        this.populateFolderParentSelect();
        $('#folderModal').modal('show');
    }

    showEditFolderModal(folder) {
        if (!this.isAdmin) {
            this.showNotification('Administrator access required', 'warning');
            return;
        }
        
        this.editingFolder = folder;
        $('#folderModalTitle').text('Edit Folder');
        $('#folderId').val(folder.id);
        $('#folderName').val(folder.name);
        this.populateFolderParentSelect(folder.id);
        $('#folderParent').val(folder.parent || 'root');
        $('#folderModal').modal('show');
    }

    populateFolderParentSelect(excludeId = null) {
        const select = $('#folderParent');
        select.empty();
        
        select.append($('<option>').val('root').text('/ (Root)'));
        
        this.config.folders.forEach(folder => {
            if (folder.id !== excludeId && folder.id !== 'root') {
                select.append($('<option>').val(folder.id).text(folder.path));
            }
        });
    }

    saveFolder() {
        const form = $('#folderForm')[0];
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const folderId = $('#folderId').val();
        const folderName = $('#folderName').val();
        const parentId = $('#folderParent').val();
        
        if (this.editingFolder) {
            // Edit existing folder
            this.editingFolder.name = folderName;
            this.editingFolder.parent = parentId;
            
            // Update path
            const parent = this.config.folders.find(f => f.id === parentId);
            const parentPath = parent ? parent.path : '/';
            this.editingFolder.path = parentPath === '/' ? `/${folderName.toLowerCase()}` : `${parentPath}/${folderName.toLowerCase()}`;
            
            // Update apps in this folder
            const oldPath = this.config.folders.find(f => f.id === folderId).path;
            this.config.apps.forEach(app => {
                if (app.folder === oldPath) {
                    app.folder = this.editingFolder.path;
                }
            });
            
            this.showNotification('Folder updated', 'success');
        } else {
            // Add new folder
            const parent = this.config.folders.find(f => f.id === parentId);
            const parentPath = parent ? parent.path : '/';
            const newPath = parentPath === '/' ? `/${folderName.toLowerCase()}` : `${parentPath}/${folderName.toLowerCase()}`;
            
            // Check for duplicate path
            if (this.config.folders.find(f => f.path === newPath)) {
                this.showNotification('A folder with this path already exists', 'danger');
                return;
            }
            
            const newFolder = {
                id: this.generateId(),
                name: folderName,
                path: newPath,
                parent: parentId,
                order: this.config.folders.length
            };
            
            this.config.folders.push(newFolder);
            this.showNotification('Folder added', 'success');
        }
        
        this.populateFolderTree();
        this.enableSave();
        $('#folderModal').modal('hide');
    }

    deleteFolder(folder) {
        if (!this.isAdmin) {
            this.showNotification('Administrator access required', 'warning');
            return;
        }

        // Check if folder has apps or subfolders
        const hasApps = this.config.apps.some(app => app.folder === folder.path);
        const hasSubfolders = this.config.folders.some(f => f.parent === folder.id);
        
        if (hasApps || hasSubfolders) {
            this.showNotification('Cannot delete folder with apps or subfolders', 'danger');
            return;
        }

        if (!confirm(`Delete folder "${folder.name}"?`)) {
            return;
        }

        const index = this.config.folders.findIndex(f => f.id === folder.id);
        if (index !== -1) {
            this.config.folders.splice(index, 1);
            this.populateFolderTree();
            this.enableSave();
            this.showNotification('Folder deleted', 'success');
        }
    }

    // App CRUD Operations
    showAddAppModal() {
        if (!this.isAdmin) {
            this.showNotification('Administrator access required', 'warning');
            return;
        }
        
        this.editingApp = null;
        $('#appModalTitle').text('Add Application');
        $('#appForm')[0].reset();
        $('#appId').val('');
        this.populateAppFolderSelect();
        $('#appModal').modal('show');
    }

    showEditAppModal(app) {
        if (!this.isAdmin) {
            this.showNotification('Administrator access required', 'warning');
            return;
        }
        
        this.editingApp = app;
        $('#appModalTitle').text('Edit Application');
        $('#appId').val(app.id);
        $('#appName').val(app.name);
        $('#appDisplayName').val(app.displayName || app.name);
        $('#appUrl').val(app.url || '');
        $('#appIcon').val(app.icon || '');
        $('#appDescription').val(app.description || '');
        $('#appActive').prop('checked', app.active || false);
        this.populateAppFolderSelect();
        $('#appFolder').val(app.folder || '/');
        $('#appModal').modal('show');
    }

    populateAppFolderSelect() {
        const select = $('#appFolder');
        select.empty();
        
        this.config.folders.forEach(folder => {
            select.append($('<option>').val(folder.path).text(folder.path));
        });
    }

    saveApp() {
        const form = $('#appForm')[0];
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const appId = $('#appId').val();
        const appData = {
            name: $('#appName').val(),
            displayName: $('#appDisplayName').val(),
            url: $('#appUrl').val(),
            icon: $('#appIcon').val() || null,
            description: $('#appDescription').val() || '',
            folder: $('#appFolder').val(),
            active: $('#appActive').is(':checked')
        };
        
        if (this.editingApp) {
            // Edit existing app
            Object.assign(this.editingApp, appData);
            this.showNotification('Application updated', 'success');
        } else {
            // Add new app
            if (this.config.apps.find(app => app.name === appData.name)) {
                this.showNotification('An app with this name already exists', 'danger');
                return;
            }
            
            const newApp = {
                id: this.generateId(),
                ...appData,
                order: this.config.apps.length,
                source: 'manual'
            };
            
            this.config.apps.push(newApp);
            this.showNotification('Application added', 'success');
        }
        
        this.populateFolderTree();
        this.populateBottomBarTab();
        this.enableSave();
        $('#appModal').modal('hide');
    }

    deleteApp(app) {
        if (!this.isAdmin) {
            this.showNotification('Administrator access required', 'warning');
            return;
        }

        if (!confirm(`Delete application "${app.displayName || app.name}"?`)) {
            return;
        }

        const index = this.config.apps.findIndex(a => a.id === app.id);
        if (index !== -1) {
            this.config.apps.splice(index, 1);
            this.populateFolderTree();
            this.populateBottomBarTab();
            this.enableSave();
            this.showNotification('Application deleted', 'success');
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

        $('#addFolderBtn').on('click', () => this.showAddFolderModal());
        $('#saveFolderBtn').on('click', () => this.saveFolder());

        $('#addAppBtn').on('click', () => this.showAddAppModal());
        $('#saveAppBtn').on('click', () => this.saveApp());

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

    enableSave() {
        if (this.isAdmin) {
            $('#saveBtn').prop('disabled', false);
        }
    }

    updateUIState() {
        console.log('Updating UI state. Is admin:', this.isAdmin);
        
        if (!this.isAdmin) {
            console.log('Showing admin overlay - user is not admin');
            $('#adminOverlay').show();
            $('#overlayAuthStatus').text(`Level: ${this.userLevel}, Admin: ${this.isAdmin}`);
            // Disable form controls but keep buttons visible
            $('input:not(#saveBtn):not(#resetBtn), select, textarea').prop('disabled', true);
            $('.btn:not(#saveBtn):not(#resetBtn)').prop('disabled', true);
            $('#saveBtn, #resetBtn').prop('disabled', true);
        } else {
            console.log('Hiding admin overlay - user is admin');
            $('#adminOverlay').hide();
            // Enable all controls for admin
            $('input, select, textarea, button').prop('disabled', false);
            // Save button starts disabled until changes made
            $('#saveBtn').prop('disabled', true);
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
