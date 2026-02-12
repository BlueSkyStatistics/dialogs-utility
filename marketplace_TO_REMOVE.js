/**
 * This file is protected by copyright (c) 2023-2025 by BlueSky Statistics, LLC.
 * All rights reserved. The copy, modification, or distribution of this file is not
 * allowed without the prior written permission from BlueSky Statistics, LLC.
 */

const Sqrl = require('squirrelly');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store').default;

const {
    refreshDialog, deleteDialog,
    removeDialog, addDialog,
    uploadDialog, searchDialog, checkForSearch,
} = require('./marketUtils_TO_REMOVE');
const {dialog, getCurrentWindow} = require("@electron/remote");

// === CONSTANTS ===
const MARKETPLACE_CONFIG = {
    ID: "marketplace",
    LABEL: "Dialog Marketplace",
    DEFAULT_ROWS: 80,
    DEFAULT_COLS: 15
};

const DEFAULT_MENU_STRUCTURE = {
    "menu": [
        { "name": "Datasets", "tab": "Datasets", "buttons": [] },
        { "name": "Variables", "tab": "Variables", "buttons": [] },
        { "name": "Analysis", "tab": "analysis", "buttons": [] },
        { "name": "Distribution", "tab": "distribution", "buttons": [] },
        { "name": "Graphics", "tab": "graphics", "buttons": [] },
        { "name": "DoE", "tab": "DoE", "buttons": [] },
        { "name": "Six Sigma", "tab": "six_sigma", "buttons": [] },
        { "name": "Model Fitting", "tab": "model_fitting", "buttons": [] },
        { "name": "Model Tuning", "tab": "model_tuning", "buttons": [] },
        { "name": "Model Evaluation", "tab": "model_statistics", "buttons": [] },
        { "name": "Forecasting", "tab": "forecasting", "buttons": [] },
        { "name": "Agreement", "tab": "agreement", "buttons": [] }
    ]
};


// === TEMPLATE MANAGER ===
class TemplateManager {
    constructor() {
        this.templates = {
            modal: this._getModalTemplate(),
            chapter: this._getChapterTemplate(),
            tab: this._getTabTemplate(),
            card: this._getCardTemplate(),
            userDialogCard: this._getUserDialogCardTemplate(),
            baseDialogCard: this._getBaseDialogCardTemplate(),
            moduleCard: this._getModuleCardTemplate()
        };
    }

    _getModalTemplate() {
        return `<div class="modal left fade" id="{{modal.id}}" tabindex="-1" role="dialog" 
            data-backdrop="false" data-keyboard="false"
            aria-labelledby="{{modal.id}}Label" aria-hidden="true">
            <div class="modal-dialog modal-lg marketplace" role="document">
                <div class="modal-content" id="{{modal.id}}modelcontentdiv">
                    ${this._getModalHeader()}
                    ${this._getModalBody()}
                </div>
            </div>
        </div>`;
    }

    _getModalHeader() {
        return `<div class="modal-header pr-1 pl-3">
            <div class="row w-100">
                <div class="col-7">
                    <h5 class="modal-title" id="{{modal.id}}Label">{{modal.label}}</h5>
                </div>
                <div class="col-5 float-right pt-2">
                    <button type="button" data-dismiss="modal" class="close enable-tooltip"
                    data-toggle="tooltip" title="Close dialog">
                        <i class="fas fa-times"></i>
                    </button>               
                    <button type="button" action="help" class="close btn-tooltip mr-0 enable-tooltip" id="{{modal.id}}Help"
                    data-toggle="tooltip" title="Help on dialog">
                        <i class="fas fa-question"></i>
                    </button>
                    <button type="button" class="close btn-tooltip mr-0 enable-tooltip" id="custom-dialogs-refresh-btn" data-toggle="tooltip" title="Refresh custom dialogs">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>
            </div>
        </div>`;
    }

    _getModalBody() {
        return `<div class="modal-body" data-actions-box="true">
            <div class="d-flex flex-nowrap">
                ${this._getNavigationTabs()}
                ${this._getTabContent()}
            </div>
        </div>`;
    }

    _getNavigationTabs() {
        return `<div class="nav flex-column nav-pills" id="v-pills-tab" role="tablist" aria-orientation="vertical">
            <a class="nav-link active" id="market_chapter_modules" data-toggle="pill" href="#market_tab_modules" role="tab" aria-controls="market_tab_modules" aria-selected="true">Manage Modules</a>
            <a class="nav-link" id="v-pills-home-tab" data-toggle="pill" href="#v-pills-home" role="tab" aria-controls="v-pills-home" aria-selected="false">Dev Environment</a>
            {{each(options.chapters)}}
                {{@this | safe}}
            {{/each}} 
        </div>`;
    }

    _getTabContent() {
        return `<div class="tab-content flex-fill" id="v-pills-tabContent">
            ${this._getModulesTab()}
            ${this._getDevEnvironmentTab()}
            {{each(options.tabs)}}
                {{@this | safe}}
            {{/each}}
        </div>`;
    }

    _getModulesTab() {
        return `<div class="tab-pane fade show active" id="market_tab_modules" role="tabpanel" bs-tab="modules" aria-labelledby="market_chapter_modules">
            <label for="seachDialog" class="form-label">Search for dialog</label>
            <div class="input-group mb-3 pr-3" id="{{modal.id}}Search">
                <input type="text" class="form-control" placeholder="" aria-label="" aria-describedby="basic-addon1" id="seachDialog" oninput="checkForSearch()" onchange="checkForSearch()">
                <div class="input-group-prepend">
                    <button class="btn btn-upload btn-path" type="button" onclick="searchDialog()"><i class="fas fa-search mr-1"></i>Search</button>
                </div>
            </div>
            <div class="mb-3 pr-3" id="searchResults"></div>
            <label class="form-label">Modules</label>
            {{each(options.modules)}}
                {{@this | safe}}
            {{/each}}
        </div>`;
    }

    _getDevEnvironmentTab() {
        return `<div class="tab-pane fade" id="v-pills-home" role="tabpanel" aria-labelledby="v-pills-home-tab">
            <div class="tab-content tab-content-black" id="{{modal.id}}_action_type_content">
                ${this._getUploadTab()}
                ${this._getGitTab()}
            </div>
            ${this._getDevEnvironmentHelp()}
        </div>`;
    }

    _getUploadTab() {
        return `<div class="tab-pane fade show active p-3" id="{{modal.id}}_action_type_upload" role="tabpanel" aria-labelledby="{{modal.id}}_action_type_upload_tab">
            <div class="hidden" id="{{modal.id}}AddMarketplace">
                <label for="formFile" class="form-label">Add path to Marketplace Dialogs</label>
                <div>
                    <button type="button" class="btn btn-upload" action="submit" id="{{modal.id}}Submit">Select Folder</button>  
                </div>
            </div>
            <div class="hidden" id="{{modal.id}}AddDialog">
                <h5>Add your dialog</h5>
                ${this._getDialogUploadForm()}
            </div>
        </div>`;
    }

    _getDialogUploadForm() {
        return `<div class="row">
            <div class="col">
                <div class="d-flex mr-3 justify-content-between">
                    <label class="form-label mt-3 mr-2 small">Dialogs Location:</label>
                    <button type="button" class="btn btn-upload btn-path" id="{{modal.id}}DialogLocation" onclick="openDialogsFolder()"></button>
                </div>
            </div>
        </div>
        <div class="row mt-1">
            <div class="col-6">
                <input type="file" id="formFile" accept=".js">      
            </div>
            <div class="col-6">
                <span>Dialogs JS file</span>
            </div>
        </div>
        <div class="row mt-1">
            <div class="col-6">
                <input type="file" id="iconFile" accept=".svg">
            </div>
            <div class="col-6">
                <span>(Optional) Dialogs icon file (.svg only) </span>
            </div>
        </div>
        <div class="row mt-1">
            <div class="col">
                <button type="button" class="btn btn-upload" action="save" id="{{modal.id}}Save">Upload</button>  
            </div>
        </div>`;
    }

    _getGitTab() {
        return `<div class="tab-pane fade show p-3" id="{{modal.id}}_action_type_git" role="tabpanel" aria-labelledby="{{modal.id}}_action_type_git_tab">
            <div id="{{modal.id}}GitPackage">
                <div class="d-flex mr-3 justify-content-between">
                    <div class="d-inline-flex flex-fill">
                        <label class="form-label m-3 small">Url</label>
                        <input type="text" class="form-control" placeholder="" id="{{modal.id}}GitUrl">
                    </div>
                    <div class="d-inline-flex flex-fill">
                        <label class="form-label m-3 small">Branch</label>
                        <input type="text" class="form-control" placeholder="" id="{{modal.id}}GitBranch" value="main">
                    </div>
                </div>
                <div class="d-flex mr-3 justify-content-between">
                    <div class="d-inline-flex flex-fill">
                        <label class="form-label m-3 small">User</label>
                        <input type="text" class="form-control" placeholder="" id="{{modal.id}}GitUsr">
                    </div>
                    <div class="d-inline-flex flex-fill">
                        <label class="form-label m-3 small">Passkey</label>
                        <input type="text" class="form-control" placeholder="" id="{{modal.id}}GitPwd">
                    </div>
                </div>
                <div class="d-flex mr-3 justify-content-between">
                    <div class="d-inline-flex flex-fill">
                        <label class="form-label m-3 small">SSHKey</label>
                        <input type="text" class="form-control" placeholder="" id="{{modal.id}}GitKey">
                    </div>
                </div>
                <div class="d-flex mr-3">
                    <div class="d-inline-flex justify-content-center flex-fill">
                        <button type="button" class="btn btn-upload btn-path" action="submit" id="{{modal.id}}GitSubmit">Add Package</button>
                    </div>
                </div>
            </div>
        </div>`;
    }

    _getDevEnvironmentHelp() {
        return `<div class="mt-3 mb-3">
            <h5>Development environment usage</h5>
            To install new dialogs you must select a folder (by clicking 'Select Folder') where the new dialogs will be installed. Once this path is set the options to install the new dialogs will be displayed.
            <br/><br/>
            <b>Add a new dialog to the marketplace</b>
            <br/>
            You can create new dialogs and add them to marketplace by following the steps below:
            <br/>
            <ol>
                <li>From the dropdown choose the tab in the top level navigation menu where the dialog will be installed to.</li>
                <li>Select the JavaScript dialog file that contains the dialog definition</li>
                <li>Click the "Upload" button to upload the dialog. You will see a list of dialogs and click INSTALL.</li>
                <li>Close the marketplace dialog and navigate to the top level menu where you installed the dialog. You will see the new dialog available for use.</li>
            </ol>
        </div>`;
    }

    _getChapterTemplate() {
        return '<a class="nav-link" id="market_chapter_{{id}}" data-toggle="pill" href="#market_tab_{{id}}" role="tab" aria-controls="market_tab_{{id}}" aria-selected="false">{{chapter}}</a>';
    }

    _getTabTemplate() {
        return `<div class="tab-pane fade" id="market_tab_{{id}}" role="tabpanel" bs-tab="{{chapter}}" aria-labelledby="market_chapter_{{id}}">
            {{each(options.cards)}}
                {{@this | safe}}
            {{/each}}
        </div>`;
    }

    _getCardTemplate() {
        return `<div class="card" bs-tab="{{chapter}}">
            <div class="card-header">
                <div class="row">
                    <div class="col-8 title">
                        <div class="d-flex">
                            <div class="d-inline-flex"><h6>{{dialog.name}}</h6></div>
                            <div class="d-inline-flex ml-2">
                                <div class="{{if(options.userd)}}bg-success{{#else}}bg-primary{{/if}} rounded-pill pl-3 pr-3" style="height: 20px;">
                                    {{if(options.userd)}}User Dialog{{#else}}Base dialog{{/if}}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-4">
                        {{if(options.userd)}}
                            <button type="button" class="btn btn-sm btn-outline-warning btn-refresh float-right {{if(options.uninstall==\"hidden\")}} hidden{{/if}}"
                                data-child="{{child}}" data-modal="{{if(options.dialog.modal)}}{{dialog.modal}}{{#else}}{{dialog.modal_id}}{{/if}}" 
                                data-file="{{child}}" data-section="{{chapter}}"
                                data-action="reload" 
                                onclick="handleMarketActionClick(this)">
                                    Reload Dialog
                            </button>
                            <button type="button" 
                                class="btn btn-sm btn-outline-danger float-right" 
                                data-child="{{child}}" data-modal="{{dialog.modal}}"
                                data-file="{{child}}" data-section="{{chapter}}"
                                data-action="delete" 
                                onclick="handleMarketActionClick(this)">
                                Delete
                            </button>
                            <button type="button" 
                                class="btn btn-sm btn-outline-danger float-right {{if(options.uninstall==\"hidden\")}} hidden{{/if}}" 
                                data-child="{{child}}" data-modal="{{if(options.dialog.modal)}}{{dialog.modal}}{{#else}}{{dialog.modal_id}}{{/if}}"
                                data-file="{{child}}" data-section="{{chapter}}"
                                data-action="uninstall" onclick="handleMarketActionClick(this)">
                                Uninstall
                            </button>
                            <button type="button" 
                                class="btn btn-sm btn-outline-primary float-right {{if(options.install==\"hidden\")}} hidden{{/if}}"
                                data-child="{{child}}" data-modal="{{if(options.dialog.modal)}}{{dialog.modal}}{{#else}}{{dialog.modal_id}}{{/if}}"
                                data-file="{{child}}" data-section="{{chapter}}"
                                onclick="global.marketplaceActionHandler.addDialog(event, '{{child}}', '{{if(options.dialog.modal)}}{{dialog.modal}}{{#else}}{{dialog.modal_id}}{{/if}}', '{{chapter}}')">
                                Install
                            </button>
                        {{#else}}
                            <button type="button" class="btn btn-sm btn-outline-secondary float-right {{if(options.hidden)}} hidden{{/if}}" data-child="{{child}}" data-modal="{{if(options.dialog.modal)}}{{dialog.modal}}{{#else}}{{dialog.modal_id}}{{/if}}" data-action="hide" onclick="handleMarketActionClick(this)">Hide</button>
                            <button type="button" class="btn btn-sm btn-outline-success float-right {{if(options.hidden)}}{{else}} hidden{{/if}}" data-child="{{child}}" data-modal="{{if(options.dialog.modal)}}{{dialog.modal}}{{#else}}{{dialog.modal_id}}{{/if}}" data-action="show" onclick="handleMarketActionClick(this)">Show</button>
                        {{/if}}
                    </div>
                </div>
            </div>
            <div class="card-body">
                {{if(options.dialog.description)}}{{ dialog.description | safe }}{{/if}}
            </div>
        </div>`;
    }

    _getUserDialogCardTemplate() {
        return `<div class="card" bs-tab="{{chapter}}">
            <div class="card-header">
                <div class="row">
                    <div class="col-8 title">
                        <div class="d-flex">
                            <div class="d-inline-flex"><h6>{{dialog.name}}</h6></div>
                            <div class="d-inline-flex ml-2">
                                <div class="bg-success rounded-pill pl-3 pr-3" style="height: 20px;">User Dialog</div>
                            </div>
                        </div>
                    </div>
                    <div class="col-4">
                        <button type="button" class="btn btn-sm btn-outline-warning btn-refresh float-right {{if(options.uninstall==\"hidden\")}} hidden{{/if}}"
                            data-child="{{child}}" data-modal="{{if(options.dialog.modal)}}{{dialog.modal}}{{#else}}{{dialog.modal_id}}{{/if}}"
                            data-file="{{child}}" data-section="{{chapter}}"
                            data-action="reload" 
                            onclick="handleMarketActionClick(this)">Reload Dialog</button>
                        <button type="button" class="btn btn-sm btn-outline-danger float-right" 
                            data-child="{{child}}" data-modal="{{dialog.modal}}"
                            data-file="{{child}}" data-section="{{chapter}}"
                            data-action="delete" 
                            onclick="handleMarketActionClick(this)">Delete</button>
                        <button type="button" class="btn btn-sm btn-outline-danger float-right {{if(options.uninstall==\"hidden\")}} hidden{{/if}}" 
                            data-child="{{child}}" data-modal="{{if(options.dialog.modal)}}{{dialog.modal}}{{#else}}{{dialog.modal_id}}{{/if}}"
                            data-file="{{child}}" data-section="{{chapter}}"
                            data-action="uninstall" onclick="handleMarketActionClick(this)">Uninstall</button>
                        <button type="button" class="btn btn-sm btn-outline-primary float-right {{if(options.install==\"hidden\")}} hidden{{/if}}"
                            data-child="{{child}}" data-modal="{{if(options.dialog.modal)}}{{dialog.modal}}{{#else}}{{dialog.modal_id}}{{/if}}"
                            data-file="{{child}}" data-section="{{chapter}}"
                            onclick="global.marketplaceActionHandler.addDialog(event, '{{child}}', '{{if(options.dialog.modal)}}{{dialog.modal}}{{#else}}{{dialog.modal_id}}{{/if}}', '{{chapter}}')">Install</button>
                    </div>
                </div>
            </div>
            <div class="card-body">
                {{if(options.dialog.description)}}{{ dialog.description | safe }}{{/if}}
            </div>
        </div>`;
    }

    _getBaseDialogCardTemplate() {
        return `<div class="card" bs-tab="{{chapter}}">
            <div class="card-header">
                <div class="row">
                    <div class="col-8 title">
                        <div class="d-flex">
                            <div class="d-inline-flex"><h6>{{dialog.name}}</h6></div>
                            <div class="d-inline-flex ml-2">
                                <div class="bg-primary rounded-pill pl-3 pr-3" style="height: 20px;">Base dialog</div>
                            </div>
                        </div>
                    </div>
                    <div class="col-4">
                        <button type="button" class="btn btn-sm btn-outline-secondary float-right {{if(options.hidden)}} hidden{{/if}}" data-child="{{child}}" data-modal="{{if(options.dialog.modal)}}{{dialog.modal}}{{#else}}{{dialog.modal_id}}{{/if}}" data-action="hide" onclick="handleMarketActionClick(this)">Hide</button>
                        <button type="button" class="btn btn-sm btn-outline-success float-right {{if(options.hidden)}}{{else}} hidden{{/if}}" data-child="{{child}}" data-modal="{{if(options.dialog.modal)}}{{dialog.modal}}{{#else}}{{dialog.modal_id}}{{/if}}" data-action="show" onclick="handleMarketActionClick(this)">Show</button>
                    </div>
                </div>
            </div>
            <div class="card-body">
                {{if(options.dialog.description)}}{{ dialog.description | safe }}{{/if}}
            </div>
        </div>`;
    }

    _getModuleCardTemplate() {
        return `<div class="card" bs-tab="modules">
            <div class="card-header">
                <div class="row">
                    <div class="col-8 title">
                        <div class="d-flex">
                            <div class="d-inline-flex"><h6>{{module.name | safe}}</h6></div>
                            <div class="d-inline-flex ml-2">
                                <div class="bg-success rounded-pill pl-3 pr-3" style="height: 20px;">{{ module.version | safe }}</div>
                            </div>
                            <div class="d-inline-flex ml-2">
                                <div class="bg-primary rounded-pill pl-3 pr-3" style="height: 20px;">{{ module.type | safe }}</div>
                            </div>
                        </div>
                    </div>
                    <div class="col-4">
                        <!-- Future update functionality -->
                    </div>
                </div>
            </div>
            <div class="card-body">
                {{ module.description | safe }}
            </div>
        </div>`;
    }

    getTemplate(name) {
        return this.templates[name] || '';
    }
}

// === ACTION HANDLER ===
class MarketplaceActionHandler {
    static getInstance() {
        if (global.marketplaceActionHandler === undefined) {
            global.marketplaceActionHandler = new MarketplaceActionHandler();
        }
        return global.marketplaceActionHandler;
    }
    constructor() {
        this.hiddenStore = new Store({ name: 'hideconfig' });
        this.addDialog = addDialog;
        this.marketplace = global?.mp;
    }

    // Helper to determine if a dialog is a user/custom dialog
    _isUserDialog(fileOrButton) {
        const userDialogs = store.get("nonBaseDialogs", []);
        let btnPath = fileOrButton;
        if (!btnPath.endsWith('.js')) btnPath += '.js';
        btnPath = path.resolve(path.normalize(btnPath));
        return userDialogs.some(ud => {
            let udPath = ud;
            if (!udPath.endsWith('.js')) udPath += '.js';
            udPath = path.resolve(path.normalize(udPath));
            return btnPath === udPath;
        });
    }

    handleAction(button) {
        const action = button.getAttribute('data-action');
        const child = button.getAttribute('data-child');
        const modal = button.getAttribute('data-modal');
        const file = button.getAttribute('data-file');
        const section = button.getAttribute('data-section');

        // Determine dialog type
        const isUserDialog = file ? this._isUserDialog(file) : (child ? this._isUserDialog(child) : false);

        // --- Custom/User Dialog Actions ---
        if (isUserDialog) {
            switch (action) {
                case 'install':
                    this.showInstallDropdown(button, file);
                    return;
                case 'uninstall':
                    this.uninstallCustomDialog(file, section);
                    return;
                case 'delete':
                    this.deleteCustomDialog(file);
                    return;
                case 'reload':
                    this.reloadCustomDialog(file);
                    return;
                default:
                    console.error('Unknown action for user dialog:', action);
                    return;
            }
        }

        // --- Base Dialog Actions ---
        switch (action) {
            case 'hide': {
                let hiddenObjects = this.hiddenStore.get('hiddenMenuObjects', []);
                if (!hiddenObjects.includes(child)) {
                    hiddenObjects.push(child);
                    this.hiddenStore.set('hiddenMenuObjects', hiddenObjects);
                }
                global?.mMenu?.reloadMarketDialog();
                global?.mMenu?.recreateMenuObject();
                return;
            }
            case 'show': {
                let hiddenObjects = this.hiddenStore.get('hiddenMenuObjects', []);
                const idx = hiddenObjects.indexOf(child);
                if (idx > -1) {
                    hiddenObjects.splice(idx, 1);
                    this.hiddenStore.set('hiddenMenuObjects', hiddenObjects);
                }
                global?.mMenu?.reloadMarketDialog();
                global?.mMenu?.recreateMenuObject();
                return;
            }
            default:
                // For any other action, log error (base dialogs should not have install/uninstall/delete/reload)
                console.error('Unknown or invalid action for base dialog:', action);
                return;
        }
    }

    showInstallDropdown(button, file) {
        // Find the card header
        const cardHeader = button.closest('.card-header');
        if (!cardHeader) return;
        // Remove any existing dropdowns
        $(cardHeader).find('.custom-dialog-install-dropdown').remove();
        // Get chapters
        let dialogsJson;
        try {
            dialogsJson = JSON.parse(fs.readFileSync(path.normalize(mMenu.getUserDialogsPath())));
        } catch (e) {
            dialog.showErrorBox('Error', 'Could not read dialogs.json');
            return;
        }
        const chapters = dialogsJson.menu.map(m => m.name);
        // Build dropdown HTML
        const dropdownId = 'custom-dialog-chapter-select-' + Math.random().toString(36).substr(2, 9);
        const dropdownHtml = `
            <div class="custom-dialog-install-dropdown d-inline-flex align-items-center ml-2">
                <select class="form-select form-select-sm" id="${dropdownId}">
                    ${chapters.map(ch => `<option value="${ch}">${ch}</option>`).join('')}
                </select>
                <button type="button" class="btn btn-sm btn-success ml-2" data-file="${file}" data-dropdown="${dropdownId}" data-action="confirm-install">Confirm</button>
                <button type="button" class="btn btn-sm btn-secondary ml-2" data-file="${file}" data-action="cancel-install">Cancel</button>
            </div>
        `;
        // Hide the Install button and insert dropdown
        $(button).hide();
        $(cardHeader).find('.col-4').append(dropdownHtml);
        // Attach handlers
        $(cardHeader).find('[data-action="confirm-install"]').on('click', (e) => {
            const selectedChapter = $(cardHeader).find(`#${dropdownId}`).val();
            this.installCustomDialog(file, selectedChapter, button, cardHeader);
        });
        $(cardHeader).find('[data-action="cancel-install"]').on('click', (e) => {
            this.cancelInstallDropdown(button, cardHeader);
        });
    }

    cancelInstallDropdown(button, cardHeader) {
        $(cardHeader).find('.custom-dialog-install-dropdown').remove();
        $(button).show();
    }

    installCustomDialog(file, chapter, button, cardHeader) {
        if (!chapter) return;
        let dialogsJson;
        try {
            dialogsJson = JSON.parse(fs.readFileSync(path.normalize(mMenu.getUserDialogsPath())));
        } catch (e) {
            dialog.showErrorBox('Error', 'Could not read dialogs.json');
            return;
        }
        const section = dialogsJson.menu.find(m => m.name === chapter);
        if (!section) {
            dialog.showErrorBox('Error', 'Section not found');
            return;
        }
        // Normalize file path to absolute with .js extension
        let absFile = path.normalize(file);
        if (!absFile.endsWith('.js')) absFile += '.js';
        absFile = path.resolve(absFile);
        // Add dialog if not already present
        if (!section.buttons.some(btn => path.resolve(path.isAbsolute(btn) ? btn.endsWith('.js') ? btn : btn + '.js' : path.join(path.dirname(mMenu.getUserDialogsPath()), path.basename(btn.endsWith('.js') ? btn : btn + '.js'))) === absFile)) {
            section.buttons.push(absFile);
            fs.writeFileSync(path.normalize(mMenu.getUserDialogsPath()), JSON.stringify(dialogsJson, null, 2));
            dialog.showMessageBoxSync({ message: 'Dialog installed in ' + chapter });
            // Also add to menu/UI immediately
            try {
                // Fake a minimal event for addDialog
                const fakeEvent = { target: cardHeader || button };
                addDialog(fakeEvent, absFile, undefined, chapter);
            } catch (e) {
                console.error('Error calling addDialog after install:', e);
            }
            // --- Update nonBaseDialogs so _isUserDialog works immediately ---
            let userDialogs = store.get("nonBaseDialogs", []);
            if (!userDialogs.includes(absFile)) {
                userDialogs.push(absFile);
                store.set("nonBaseDialogs", userDialogs);
            }
            global?.mMenu?.reloadMarketDialog();
            global?.mMenu?.recreateMenuObject();
        } else {
            dialog.showMessageBoxSync({ message: 'Dialog already installed in ' + chapter });
        }
    }

    uninstallCustomDialog(file, sectionName) {
        let dialogsJson;
        try {
            dialogsJson = JSON.parse(fs.readFileSync(path.normalize(mMenu.getUserDialogsPath())));
        } catch (e) {
            dialog.showErrorBox('Error', 'Could not read dialogs.json');
            return;
        }
        // Normalize file path to absolute with .js extension
        let absFile = path.normalize(file);
        if (!absFile.endsWith('.js')) absFile += '.js';
        absFile = path.resolve(absFile);
        let changed = false;
        dialogsJson.menu.forEach(section => {
            if (sectionName && section.name !== sectionName) return;
            // Remove all entries that match the normalized path
            const origLen = section.buttons.length;
            section.buttons = section.buttons.filter(btn => {
                let btnPath = path.isAbsolute(btn) ? btn : path.join(path.dirname(mMenu.getUserDialogsPath()), path.basename(btn));
                if (!btnPath.endsWith('.js')) btnPath += '.js';
                btnPath = path.resolve(btnPath);
                return btnPath !== absFile;
            });
            if (section.buttons.length !== origLen) changed = true;
        });
        if (changed) {
            fs.writeFileSync(path.normalize(mMenu.getUserDialogsPath()), JSON.stringify(dialogsJson, null, 2));
            dialog.showMessageBoxSync({ message: 'Dialog uninstalled' });
            // Also remove from menu/UI immediately
            try {
                // Find the card in the DOM for event context
                const card = document.querySelector(`.card-header [data-file='${file}']`);
                const fakeEvent = { target: card };
                removeDialog(fakeEvent, absFile, undefined, sectionName);
            } catch (e) {
                console.error('Error calling removeDialog after uninstall:', e);
            }
            global?.mMenu?.reloadMarketDialog();
            global?.mMenu?.recreateMenuObject();
        } else {
            console.debug('Dialog was not installed')
        }
    }

    deleteCustomDialog(file) {
        // Uninstall from all sections (suppress message)
        try {
            this.uninstallCustomDialog(file);
        } catch (e) { /* ignore uninstall message */ }
        // Delete file
        try {
            fs.unlinkSync(file);
            dialog.showMessageBoxSync({ message: 'Dialog file deleted' });
        } catch (e) {
            dialog.showErrorBox('Error', 'Could not delete file: ' + e.message);
        }
        if (this.marketplace && typeof this.marketplace.reloadCustomDialogsTab === 'function') {
            this.marketplace.reloadCustomDialogsTab();
        }
    }

    reloadCustomDialog(file) {
        console.log('reloadCustomDialog', file, require.resolve(file))
        try {
            delete require.cache[require.resolve(file)];
            global.dialogCacheClear()
            // todo: check what is the cache key?
            global?.mMenu?.reloadMarketDialog();
            global?.mMenu?.recreateMenuObject();
            dialog.showMessageBoxSync({ message: 'Dialog reloaded' });
        } catch (e) {
            dialog.showErrorBox('Error', 'Could not reload dialog: ' + e.message);
        }
    }
}
MarketplaceActionHandler.getInstance()

// === DATA PROVIDER ===
class MarketplaceDataProvider {
    constructor() {
        this.providers = {
            file: this.fileProvider.bind(this),
            git: this.gitProvider.bind(this)
        };
    }

    fileProvider(market) {
        try {
            const paths = [market.path, `./${market.path}`, path.join(__dirname.replace("app.asar", ""), market.path)];

            for (const marketPath of paths) {
                try {
                    return JSON.parse(fs.readFileSync(marketPath)).menu;
                } catch (error) {
                    continue;
                }
            }
            return [];
        } catch (error) {
            console.error('Error in file provider:', error);
            return [];
        }
    }

    gitProvider(market) {
        return gitClone(market);
    }

    getProvider(type) {
        return this.providers[type];
    }
}

// === MARKETPLACE FACTORY ===
class MarketplaceFactory {
    static createFileBasedMarketplace(marketplaceData, folderPath) {
        const marketPath = path.join(folderPath, 'dialogs.json');
        const marketEntry = {
            name: 'User dialogs',
            path: marketPath,
            provider: 'file'
        };

        fs.writeFileSync(marketPath, JSON.stringify(DEFAULT_MENU_STRUCTURE));
        marketplaceData.markets.push(marketEntry);

        return marketEntry;
    }

    static createGitBasedMarketplace(marketplaceData, folderPath, gitConfig) {
        const marketPath = path.join(folderPath, 'dialogs.json');
        const marketEntry = {
            name: 'Git dialogs',
            path: marketPath,
            provider: 'git',
            repo: gitConfig.url,
            branch: gitConfig.branch
        };

        if (gitConfig.username) marketEntry.username = gitConfig.username;
        if (gitConfig.password) marketEntry.password = gitConfig.password;
        if (gitConfig.ssh_key) marketEntry.ssh_key = gitConfig.ssh_key;

        marketplaceData.markets.push(marketEntry);
        return marketEntry;
    }
}

// === MAIN MARKETPLACE CLASS ===
class Marketplace {
    constructor() {
        this.id = MARKETPLACE_CONFIG.ID;
        this.label = MARKETPLACE_CONFIG.LABEL;
        this.content = null;
        this.chapters = [];
        this.dropitems = [];
        this.tabs = [];

        this.templateManager = new TemplateManager();
        this.actionHandler = global.marketplaceActionHandler;
        this.actionHandler.marketplace = this;
        this.dataProvider = new MarketplaceDataProvider();

        this.help = this._createHelpConfig();
        this.customDialogs = this._scanCustomDialogs();
    }

    _createHelpConfig() {
        return {
            title: "Marketplace Help",
            r_help: "",
            body: `
                <b>Initialization</b><br/>
                To install new dialogs you must select a folder (by clicking 'Select Folder') where the new dialogs will be installed. Once this path is set the options to install the new dialogs will be displayed.
                <br/><br/>
                <b>Add a new dialog to the marketplace</b><br/>
                You can create new dialogs and add them to marketplace by following the steps below:
                <br/>
                <ol>
                    <li>From the dropdown choose the tab in the top level navigation menu where the dialog will be installed to.</li>
                    <li>Select the JavaScript dialog file that contains the dialog definition</li>
                    <li>Click the "Upload" button to upload the dialog. You will see a list of dialogs and click INSTALL.</li>
                    <li>Close the marketplace dialog and navigate to the top level menu where you installed the dialog. You will see the new dialog available for use.</li>
                </ol>
            `
        };
    }

    flattenMenu(menu) {
        const flattened = [];
        for (const button of menu.buttons) {
            if (typeof button === "object" && button.children !== undefined) {
                flattened.push(...button.children);
            } else {
                flattened.push(button);
            }
        }
        return flattened;
    }

    mergeMarkets() {
        // const mainMenu = store.get('main', {}).menu
        const mainMenu = global.mMenu.main.menu
        const menuList = mainMenu.map(item => item.name);
        const markets = store.get('market').markets;
        const totalInstalled = [];
        const notInstalled = [];
        const marketToDialog = {};
        const getDiff = (menuFromMarket) => {
            return menuFromMarket.filter(n => {
                if (typeof n === 'string') {
                    return !totalInstalled.includes(n)
                }
                return totalInstalled.findIndex(i => i.name === n.name) === -1
            });
        }

        markets.forEach(market => {
            const provider = this.dataProvider.getProvider(market.provider);
            const marketData = provider(market);
            const tmpPath = market.path.replace('dialogs.json', '')

            marketData.forEach(marketItem => {
                const menuIndex = menuList.indexOf(marketItem.name)
                const menuFromMarket = this.flattenMenu(marketItem)

                if (menuIndex > -1) {
                    const installedMenu = this.flattenMenu(mainMenu[menuIndex])
                    totalInstalled.push(...installedMenu)
                    const diff = getDiff(menuFromMarket)
                    mainMenu[menuIndex].buttons.push(...diff)
                    notInstalled.push(...diff)
                } else {
                    mainMenu.push(marketItem)
                    const diff = getDiff(menuFromMarket)
                    notInstalled.push(...diff)
                }

                menuFromMarket.forEach(menuName => {
                    marketToDialog[menuName] = tmpPath
                });
            });
        });

        const hiddenObjects = this.actionHandler.hiddenStore.get('hiddenMenuObjects', []);
        const uniqueNotInstalled = [...new Set([...notInstalled, ...hiddenObjects])];

        return {
            mainMenu: mainMenu,
            not_installed: uniqueNotInstalled,
            market_to_dialog: marketToDialog
        };
    }

    renderContent() {
        // Initialize dialog tree for debugging
        global.dialogTree = global.dialogTree || new Set();

        this._resetState();
        const { mainMenu, not_installed: notInstalled, market_to_dialog: marketToDialog } = this.mergeMarkets();

        this.notInstalled = notInstalled;
        this.marketToDialog = marketToDialog;

        this._processChapters(mainMenu);
        const modules = this._processModules();
        this._addCustomDialogsTab();
        this._writeDebugInfo();

        return this._renderFinalTemplate(modules);
    }

    _resetState() {
        this.chapters = [];
        this.dropitems = [];
        this.tabs = [];
    }

    get userDialogs() {
        return store.get("nonBaseDialogs", [])
    }

    // set userDialogs(userDialogs) {
    //     store.set("nonBaseDialogs", userDialogs);
    // }

    get appPath() {
        return sessionStore.get("appPath", process.cwd());
    }

    _processChapters(mainMenu) {

        mainMenu.forEach(chapter => {
            if (this._shouldProcessChapter(chapter)) {
                this._addChapter(chapter);
                const cards = this._processChapterButtons(chapter);
                this._addTab(chapter, cards);
            }
        });
    }

    _shouldProcessChapter(chapter) {
        return chapter.tab !== 'file' && chapter.tab !== 'tools';
    }

    _addChapter(chapter) {
        this.chapters.push(Sqrl.Render(this.templateManager.getTemplate('chapter'), {
            id: chapter.tab.replace(/[^A-Z0-9]/ig, "_"),
            chapter: chapter.name || chapter.tab
        }));
        this.dropitems.push(chapter.name || chapter.tab);
    }

    _processChapterButtons(chapter) {
        const cards = [];

        chapter.buttons.forEach(button => {
            if (typeof button === "object" && button.children === undefined) {
                cards.push(this._createDialogCard(button, chapter));
            } else if (typeof button === "object" && button.children !== undefined) {
                button.children.forEach(child => {
                    cards.push(this._createChildDialogCard(child, chapter));
                });
            } else {
                cards.push(this._createButtonCard(button, chapter));
            }
        });

        return cards;
    }

    _createDialogCard(button, chapter) {
        return Sqrl.Render(this.templateManager.getTemplate('card'), {
            dialog: button,
            chapter: chapter.name
        });
    }

    _createChildDialogCard(child, chapter) {
        const visibility = this._calculateVisibility(child);
        const fixedChild = this._fixPath(child);
        try {
            const dialog = getDialog(child);
            this._addToDialogTree(chapter, dialog);
            return Sqrl.Render(this.templateManager.getTemplate('card'), {
                dialog: dialog.nav,
                chapter: chapter.name,
                uninstall: visibility.uninstall,
                install: visibility.install,
                child: fixedChild
            });
        } catch (error) {
            console.error('Error creating child dialog card:', error);
            return '';
        }
    }

    _createButtonCard(button, chapter) {
        const isUserDialog = this.actionHandler._isUserDialog(button);
        const visibility = this._calculateVisibility(button);
        const fixedButton = this._fixPath(button);
        let isHidden = false;
        if (!isUserDialog) {
            // Check if hidden in hiddenStore
            const hiddenObjects = this.actionHandler.hiddenStore.get('hiddenMenuObjects', []);
            isHidden = hiddenObjects.includes(button);
        }
        try {
            const dialog = this._getDialogSafely(button);
            if (dialog) {
                this._addToDialogTree(chapter, dialog);
                const templateName = isUserDialog ? 'userDialogCard' : 'baseDialogCard';
                // Only pass needed options for the template
                const options = {
                    dialog: dialog.nav,
                    chapter: chapter.name,
                    child: fixedButton
                };
                if (isUserDialog) {
                    options.uninstall = visibility.uninstall;
                    options.install = visibility.install;
                    options.userd = true;
                } else {
                    options.hidden = isHidden;
                }
                return Sqrl.Render(this.templateManager.getTemplate(templateName), options);
            }
        } catch (error) {
            console.error('Error creating button card:', error);
        }
        return '';
    }

    _calculateVisibility(item) {
        return {
            install: this.notInstalled.indexOf(item) > -1 ? '' : 'hidden',
            uninstall: this.notInstalled.indexOf(item) > -1 ? 'hidden' : ''
        };
    }

    _fixPath(itemPath) {
        return (process.platform === 'win32') ? itemPath.replace(/\\/g, "\\\\") : itemPath;
    }

    _getDialogSafely(button) {
        const attempts = [
            () => getDialog(button),
            () => getDialog(path.join(this.appPath, button)),
            () => getDialog(path.join(this.marketToDialog[button], button))
        ];

        for (const attempt of attempts) {
            try {
                return attempt();
            } catch (error) {
                continue;
            }
        }

        return null;
    }

    _addToDialogTree(chapter, dialog) {
        if (dialog && global.dialogTree) {
            global.dialogTree.add(`${chapter.name} > ${dialog.nav?.name} > ${dialog.id}.json`);
        }
    }

    _addTab(chapter, cards) {
        this.tabs.push(Sqrl.Render(this.templateManager.getTemplate('tab'), {
            cards: cards,
            chapter: chapter.name,
            id: chapter.tab.replace(/[^A-Z0-9]/ig, "_")
        }));
    }

    _processModules() {
        const modules = [];
        const installedModules = sessionStore.get("modulesVersions", []);

        installedModules.forEach(module => {
            module.available = module.available.map(a => Object.values(a)[0]);
            modules.push(Sqrl.Render(this.templateManager.getTemplate('moduleCard'), { module }));
        });

        return modules;
    }

    _writeDebugInfo() {
        if (global.dialogTree) {
            try {
                const dialogTreePath = path.join(sessionStore.get('userData'), 'dialogTree.json');
                fs.writeFileSync(dialogTreePath, JSON.stringify(Array.from(global.dialogTree.values()), null, 2));
            } catch (error) {
                console.error('Error writing dialog tree:', error);
            }
        }
    }

    _renderFinalTemplate(modules) {
        return Sqrl.Render(this.templateManager.getTemplate('modal'), {
            modal: { id: this.id, label: this.label },
            chapters: this.chapters,
            tabs: this.tabs,
            dropitems: this.dropitems,
            modules: modules
        });
    }

    onShow() {
        ipcRenderer.invoke('logEvent', { category: "dialog", action: "show", title: "marketplace" });
        this._handleModalConflicts();
        this._configureMarketplaceDisplay();
    }

    _handleModalConflicts() {
        if ($('.modal:visible').length && $('body').hasClass('modal-open')) {
            $('.modal:visible').each((index, item) => {
                if (item.id !== this.id) {
                    $(`#${item.id}`).removeAttr("dataset");
                    $(`#${item.id}`).modal('hide');
                }
            });
        }
    }

    _configureMarketplaceDisplay() {
        if (mMenu.getUserDialogsPath() === undefined) {
            this._showMarketplaceSetup();
        } else {
            this._showDialogManagement();
        }
    }

    _showMarketplaceSetup() {
        $(`#${this.id}AddMarketplace`).removeClass("hidden");
        $(`#${this.id}AddDialog`).addClass("hidden");
    }

    _showDialogManagement() {
        $(`#${this.id}AddMarketplace`).addClass("hidden");
        $(`#${this.id}AddDialog`).removeClass("hidden");
        $(`#${this.id}DialogLocation`).html(mMenu.getUserDialogsPath().replace('dialogs.json', ''));
    }

    onHide() {
        $("#v-pills-home-tab").trigger('click');
        $("#searchResults").children().remove();
    }

    onCreateMarketplace() {
        const marketplaceData = store.get('market', { markets: [] });
        const gitUrl = $(`#${this.id}GitUrl`).val();
        const userHasDialogsPath = mMenu.getUserDialogsPath(marketplaceData);

        if (!userHasDialogsPath && gitUrl === "") {
            this._createFileBasedMarketplace(marketplaceData);
        } else if (gitUrl) {
            this._createGitBasedMarketplace(marketplaceData);
        }
    }

    _createFileBasedMarketplace(marketplaceData) {
        const folderPath = this._selectFolder('Select path for market dialogs');
        if (!folderPath) return;

        try {
            const marketEntry = MarketplaceFactory.createFileBasedMarketplace(marketplaceData, folderPath);
            this._updateMarketplaceConfig(marketplaceData);
            this._refreshMarketplace();
            this._showDialogManagement();
        } catch (error) {
            console.error('Error creating file marketplace:', error);
        }
    }

    _createGitBasedMarketplace(marketplaceData) {
        const folderPath = this._selectFolder('Select path for git dialogs');
        if (!folderPath) return;

        const gitConfig = {
            url: $(`#${this.id}GitUrl`).val(),
            branch: $(`#${this.id}GitBranch`).val(),
            username: $(`#${this.id}GitUser`).val(),
            password: $(`#${this.id}GitPwd`).val(),
            ssh_key: $(`#${this.id}GitKey`).val()
        };

        try {
            const marketEntry = MarketplaceFactory.createGitBasedMarketplace(marketplaceData, folderPath, gitConfig);
            this._updateMarketplaceConfig(marketplaceData);
            gitClone(marketEntry);
        } catch (error) {
            console.error('Error creating git marketplace:', error);
        }
    }

    _selectFolder(title) {
        const selectedFolders = dialog.showOpenDialogSync(
            getCurrentWindow(),
            {
                title: title,
                defaultPath: sessionStore.get("HomeDir"),
                properties: ['openDirectory', 'createDirectory', 'treatPackageAsDirectory', 'dontAddToRecent'],
            });
        return selectedFolders ? selectedFolders[0].replace("file://", "") : null;
    }

    _updateMarketplaceConfig(marketplaceData) {
        const marketplaceConfigPath = store.get("mplacepath");
        fs.writeFileSync(marketplaceConfigPath, JSON.stringify(marketplaceData));
    }

    _refreshMarketplace() {
        mMenu.reloadMarketFromFile();
        mMenu.compileNonBaseDialogs();
    }

    onSave() {
        const saveButton = $(`#${this.id}Save`);
        saveButton.prop('disabled', true);
        saveButton.html('<i class="fas fa-spinner fa-spin"></i>');

        try {
            const result = uploadDialog();
            if (typeof result === 'object') {
                this._updateUserDialogs(result);
                this._handleSuccessfulUpload(result);
            }
        } catch (error) {
            console.error('Error saving dialog:', error);
        } finally {
            saveButton.html("Upload");
            saveButton.prop('disabled', false);
        }
    }

    reloadCustomDialogsTab() {
        this.customDialogs = this._scanCustomDialogs();
        // --- Update nonBaseDialogs to match all custom dialog files ---
        const allCustomDialogPaths = this.customDialogs.map(d => d.file);
        store.set('nonBaseDialogs', allCustomDialogPaths);
        const tabContent = document.getElementById('market_tab_custom_dialogs');
        if (tabContent) {
            const newCards = this.customDialogs.flatMap(dialog => {
                if (dialog.installed) {
                    return dialog.installedSections.map(sectionName => {
                        const pill = `<div class=\"bg-success rounded-pill pl-3 pr-3\" style=\"height: 20px;\">${sectionName}</div>`;
                        return `<div class=\"card\" bs-tab=\"custom_dialogs\">\n                            <div class=\"card-header\">\n                                <div class=\"row\">\n                                    <div class=\"col-8 title\">\n                                        <div class=\"d-flex\">\n                                            <div class=\"d-inline-flex\"><h6>${dialog.name}</h6></div>\n                                            <div class=\"d-inline-flex ml-2\">${pill}</div>\n                                        </div>\n                                    </div>\n                                    <div class=\"col-4\">\n                                        <button type=\"button\" class=\"btn btn-sm btn-outline-danger float-right\" data-file=\"${dialog.file}\" data-section=\"${sectionName}\" data-action=\"uninstall\" onclick=\"handleMarketActionClick(this)\">Uninstall</button>\n                                        <button type=\"button\" class=\"btn btn-sm btn-outline-warning btn-refresh float-right ml-2\" data-file=\"${dialog.file}\" data-section=\"${sectionName}\" data-action=\"reload\" onclick=\"handleMarketActionClick(this)\">Reload</button>\n                                        <button type=\"button\" class=\"btn btn-sm btn-outline-danger float-right ml-2\" data-file=\"${dialog.file}\" data-action=\"delete\" onclick=\"handleMarketActionClick(this)\"\n                                    </div>\n                                </div>\n                            </div>\n                            <div class=\"card-body\">${dialog.description}</div>\n                        </div>`;
                    });
                } else {
                    return [`<div class=\"card\" bs-tab=\"custom_dialogs\">\n                        <div class=\"card-header\">\n                            <div class=\"row\">\n                                <div class=\"col-8 title\">\n                                    <div class=\"d-flex\">\n                                        <div class=\"d-inline-flex\"><h6>${dialog.name}</h6></div>\n                                    </div>\n                                </div>\n                                <div class=\"col-4\">\n                                    <button type=\"button\" class=\"btn btn-sm btn-outline-primary float-right\" data-file=\"${dialog.file}\" data-action=\"install\" onclick=\"handleMarketActionClick(this)\">Install</button>\n                                    <button type=\"button\" class=\"btn btn-sm btn-outline-danger float-right ml-2\" data-file=\"${dialog.file}\" data-action=\"delete\" onclick=\"handleMarketActionClick(this)\">Delete</button>\n                                </div>\n                            </div>\n                        </div>\n                        <div class=\"card-body\">${dialog.description}</div>\n                    </div>`];
                }
            });
            tabContent.innerHTML = newCards.join('');
        }
    }

    _handleSuccessfulUpload(result) {
        // After upload, switch to Custom Dialogs tab and scroll to the uploaded dialog
        const customTab = document.getElementById('market_chapter_custom_dialogs');
        if (customTab) {
            customTab.click();
        }
        this.reloadCustomDialogsTab();
        // Wait for the tab content to render, then scroll to the uploaded dialog card
        setTimeout(() => {
            // Try to find the card by dialog id or name
            const dialogName = result && result.import ? result.import.split('/').pop().replace('.js', '') : '';
            const cards = document.querySelectorAll('#market_tab_custom_dialogs .card');
            for (const card of cards) {
                const h6 = card.querySelector('h6');
                if (h6 && h6.textContent && dialogName && h6.textContent.toLowerCase().includes(dialogName.toLowerCase())) {
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    card.classList.add('border-primary');
                    setTimeout(() => card.classList.remove('border-primary'), 2000);
                    break;
                }
            }
        }, 300);
    }

    _updateUserDialogs(result) {
        const userDialogs = this.userDialogs
        // store.delete("nonBaseDialogs");
        console.log('_updateUserDialogs', result)
        userDialogs.push(result['import']);
        store.set("nonBaseDialogs", userDialogs);
    }

    compile() {
        return {
            modal: this.renderContent(),
            id: this.id,
            onshow: this.onShow.bind(this),
            onhide: this.onHide.bind(this),
            onsubmit: this.onCreateMarketplace.bind(this),
            onhelp: this.help,
            onsave: this.onSave.bind(this),
            nav: {
                name: "Marketplace",
                icon: "icon-shoppingcart_1",
                datasetRequired: false,
                modal: this.id
            },
            template: this.templateManager.getTemplate('card')
        };
    }

    _scanCustomDialogs() {
        // Scan custom_dialogs folder for .js files
        let dialogFiles = [];
        try {
            dialogFiles = fs.readdirSync(path.dirname(mMenu.getUserDialogsPath()))
                .filter(f => f.endsWith('.js'))
                .map(f => path.normalize(path.join(path.dirname(mMenu.getUserDialogsPath()), f)));
        } catch (e) {
            return [];
        }
        // Read installed dialogs from dialogs.json
        let installedMap = new Map(); // file -> [sectionName, ...]
        let dialogsJson = null;
        try {
            dialogsJson = JSON.parse(fs.readFileSync(path.normalize(mMenu.getUserDialogsPath())));
            dialogsJson.menu.forEach(section => {
                section.buttons.forEach(btn => {
                    let btnPath = path.isAbsolute(btn) ? btn : path.join(path.dirname(mMenu.getUserDialogsPath()), path.basename(btn));
                    if (!btnPath.endsWith('.js')) btnPath += '.js';
                    btnPath = path.resolve(path.normalize(btnPath));
                    if (!installedMap.has(btnPath)) installedMap.set(btnPath, []);
                    installedMap.get(btnPath).push(section.name);
                });
            });
        } catch (e) {}
        // For each .js file, extract metadata and install status
        return dialogFiles.map(file => {
            let absFile = path.resolve(path.normalize(file));
            let meta = { id: path.basename(file, '.js'), name: path.basename(file, '.js'), description: '', file: absFile };
            try {
                const dialogModule = require(absFile);
                if (dialogModule && dialogModule.item && dialogModule.item.nav) {
                    meta.name = dialogModule.item.nav.name || meta.name;
                    meta.description = dialogModule.item.nav.description || '';
                }
            } catch (e) {}
            meta.installedSections = installedMap.get(absFile) || [];
            meta.installed = meta.installedSections.length > 0;
            return meta;
        });
    }

    _addCustomDialogsTab() {
        // Add nav link
        this.chapters.push('<a class="nav-link" id="market_chapter_custom_dialogs" data-toggle="pill" href="#market_tab_custom_dialogs" role="tab" aria-controls="market_tab_custom_dialogs" aria-selected="false">Custom Dialogs</a>');
        this.dropitems.push('Custom Dialogs');
        // Render cards for each custom dialog
        const cards = this.customDialogs.flatMap(dialog => {
            if (dialog.installed) {
                // One card per installed section
                return dialog.installedSections.map(sectionName => {
                    const pill = `<div class=\"bg-success rounded-pill pl-3 pr-3\" style=\"height: 20px;\">${sectionName}</div>`;
                    return `<div class=\"card\" bs-tab=\"custom_dialogs\">
                        <div class=\"card-header\">
                            <div class=\"row\">
                                <div class=\"col-8 title\">
                                    <div class=\"d-flex\">
                                        <div class=\"d-inline-flex\"><h6>${dialog.name}</h6></div>
                                        <div class=\"d-inline-flex ml-2\">${pill}</div>
                                    </div>
                                </div>
                                <div class=\"col-4\">
                                    <button type=\"button\" class=\"btn btn-sm btn-outline-danger float-right\" data-file=\"${dialog.file}\" data-section=\"${sectionName}\" data-action=\"uninstall\" onclick=\"handleMarketActionClick(this)\">Uninstall</button>
                                    <button type=\"button\" class=\"btn btn-sm btn-outline-warning btn-refresh float-right ml-2\" data-file=\"${dialog.file}\" data-section=\"${sectionName}\" data-action=\"reload\" onclick=\"handleMarketActionClick(this)\">Reload</button>
                                    <button type=\"button\" class=\"btn btn-sm btn-outline-danger float-right ml-2\" data-file=\"${dialog.file}\" data-action=\"delete\" onclick=\"handleMarketActionClick(this)\">Delete</button>
                                </div>
                            </div>
                        </div>
                        <div class=\"card-body\">${dialog.description}</div>
                    </div>`;
                });
            } else {
                // Not installed: single card with Install button
                return [`<div class=\"card\" bs-tab=\"custom_dialogs\">
                    <div class=\"card-header\">
                        <div class=\"row\">
                            <div class=\"col-8 title\">
                                <div class=\"d-flex\">
                                    <div class=\"d-inline-flex\"><h6>${dialog.name}</h6></div>
                                </div>
                            </div>
                            <div class=\"col-4\">
                                <button type=\"button\" class=\"btn btn-sm btn-outline-primary float-right\" data-file=\"${dialog.file}\" data-action=\"install\" onclick=\"handleMarketActionClick(this)\">Install</button>
                                <button type=\"button\" class=\"btn btn-sm btn-outline-danger float-right ml-2\" data-file=\"${dialog.file}\" data-action=\"delete\" onclick=\"handleMarketActionClick(this)\">Delete</button>
                            </div>
                        </div>
                    </div>
                    <div class=\"card-body\">${dialog.description}</div>
                </div>`];
            }
        });
        this.tabs.push(`<div class=\"tab-pane fade\" id=\"market_tab_custom_dialogs\" role=\"tabpanel\" bs-tab=\"custom_dialogs\" aria-labelledby=\"market_chapter_custom_dialogs\">${cards.join('')}</div>`);
        // Attach refresh handler after DOM is updated
        setTimeout(() => {
            const btn = document.getElementById('custom-dialogs-refresh-btn');
            if (btn) {
                btn.onclick = () => {
                    this.reloadCustomDialogsTab();
                };
            }
        }, 0);
    }
}

// === GLOBAL ACTION HANDLER ===
global.handleMarketActionClick = (button) => {
    global.marketplaceActionHandler.handleAction(button);
};

// === MODULE EXPORTS ===
module.exports = {
    render: () => {
        console.log('Rendering Marketplace');
        global.mp = new Marketplace();
        return global.mp.compile();
    }
};