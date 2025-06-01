/**
 * This file is protected by copyright (c) 2023-2025 by BlueSky Statistics, LLC.
 * All rights reserved. The copy, modification, or distribution of this file is not
 * allowed without the prior written permission from BlueSky Statistics, LLC.
 */

const Sqrl = require('squirrelly');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

const { refreshDialog, deleteDialog, removeDialog, addDialog, uploadDialog } = require('./marketUtils');

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
                <select class="form-select mt-1 mr-1" id="addDialogsChapter" aria-label="Default select example">
                    {{each(options.dropitems)}}
                        <option value="{{@this | safe}}">{{@this | safe}}</option>
                    {{/each}}
                </select>
            </div>
            <div class="col-6">
                <span>Chapter dialogs will be added to </span>
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
                            <button type="button" class="btn btn-sm btn-outline-warning btn-refresh float-right {{if(options.uninstall=="hidden")}} hidden{{/if}}"
                                data-child="{{child}}" data-modal="{{if(options.dialog.modal)}}{{dialog.modal}}{{#else}}{{dialog.modal_id}}{{/if}}" 
                                data-action="reload" 
                                onclick="handleMarketActionClick(this)"
                            >
                                    Reload Dialog
                            </button>
                            <button type="button" 
                                class="btn btn-sm btn-outline-danger float-right" 
                                data-child="{{child}}" data-modal="{{dialog.modal}}"
                                data-action="delete" 
                                onclick="handleMarketActionClick(this)"
                            >
                                Delete
                            </button>
                        {{/if}}
                        <button type="button" 
                            class="btn btn-sm btn-outline-danger float-right {{if(options.uninstall=="hidden")}} hidden{{/if}}" 
                            data-child="{{child}}" data-modal="{{if(options.dialog.modal)}}{{dialog.modal}}{{#else}}{{dialog.modal_id}}{{/if}}"
                            data-action="hide" onclick="handleMarketActionClick(this)"
                        >
                            Hide
                        </button>
                        <button type="button" 
                            class="btn btn-sm btn-outline-warning float-right {{if(options.update=="hidden")}} hidden{{/if}}"
                        >
                            Update available
                        </button>
                        <button type="button" 
                            class="btn btn-sm btn-outline-primary float-right {{if(options.install=="hidden")}} hidden{{/if}}"
                            data-child="{{child}}" data-modal="{{if(options.dialog.modal)}}{{dialog.modal}}{{#else}}{{dialog.modal_id}}{{/if}}" 
                            data-action="install" onclick="handleMarketActionClick(this)"
                        >
                            Install
                        </button>
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
    constructor() {
        this.hiddenStore = new Store({ name: 'hideconfig' });
    }

    handleAction(button) {
        const action = button.getAttribute('data-action');
        const child = button.getAttribute('data-child');
        const modal = button.getAttribute('data-modal');

        const actionMap = {
            'refresh': () => refreshDialog(event, child, modal),
            'reload': () => refreshDialog(event, child, modal),
            'delete': () => deleteDialog(event, child, modal),
            'remove': () => removeDialog(event, child, modal),
            'hide': () => removeDialog(event, child, modal),
            'add': () => addDialog(event, child, modal),
            'install': () => addDialog(event, child, modal)
        };

        const handler = actionMap[action];
        if (handler) {
            handler();
        } else {
            console.error('Unknown action:', action);
        }
    }
}

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
        this.actionHandler = new MarketplaceActionHandler();
        this.dataProvider = new MarketplaceDataProvider();

        this.help = this._createHelpConfig();
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
        const menuList = store.get('main').menu.map(item => item.name);
        const markets = store.get('market').markets;
        const startingPoint = store.get('main').menu;
        const totalInstalled = [];
        const notInstalled = [];
        const marketToDialog = {};

        markets.forEach(market => {
            const provider = this.dataProvider.getProvider(market.provider);
            const marketData = provider(market);
            const tmpPath = market.path.replace('dialogs.json', '');

            marketData.forEach(marketItem => {
                const menuIndex = menuList.indexOf(marketItem.name);
                const menuFromMarket = this.flattenMenu(marketItem);

                if (menuIndex > -1) {
                    const installedMenu = this.flattenMenu(startingPoint[menuIndex]);
                    totalInstalled.push(...installedMenu);
                    const diff = menuFromMarket.filter(n => !totalInstalled.includes(n));
                    startingPoint[menuIndex].buttons.push(...diff);
                    notInstalled.push(...diff);
                } else {
                    startingPoint.push(marketItem);
                    const diff = menuFromMarket.filter(n => !totalInstalled.includes(n));
                    notInstalled.push(...diff);
                }

                menuFromMarket.forEach(menuName => {
                    marketToDialog[menuName] = tmpPath;
                });
            });
        });

        const hiddenObjects = this.actionHandler.hiddenStore.get('hiddenMenuObjects', []);
        const uniqueNotInstalled = [...new Set([...notInstalled, ...hiddenObjects])];

        return {
            starting_point: startingPoint,
            not_installed: uniqueNotInstalled,
            market_to_dialog: marketToDialog
        };
    }

    renderContent() {
        // Initialize dialog tree for debugging
        global.dialogTree = global.dialogTree || new Set();

        this._resetState();
        const { starting_point, not_installed, market_to_dialog } = this.mergeMarkets();

        this._processChapters(starting_point, not_installed, market_to_dialog);
        const modules = this._processModules();

        this._writeDebugInfo();

        return this._renderFinalTemplate(modules);
    }

    _resetState() {
        this.chapters = [];
        this.dropitems = [];
        this.tabs = [];
    }

    _processChapters(startingPoint, notInstalled, marketToDialog) {
        const appPath = sessionStore.get("appPath", process.cwd());
        const userDialogs = store.get("nonBaseDialogs", []);

        startingPoint.forEach(chapter => {
            if (this._shouldProcessChapter(chapter)) {
                this._addChapter(chapter);
                const cards = this._processChapterButtons(chapter, notInstalled, marketToDialog, appPath, userDialogs);
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

    _processChapterButtons(chapter, notInstalled, marketToDialog, appPath, userDialogs) {
        const cards = [];

        if (chapter.tab === 'dataset') {
            debugger
        }

        chapter.buttons.forEach(button => {
            if (typeof button === "object" && button.children === undefined) {
                cards.push(this._createDialogCard(button, chapter));
            } else if (typeof button === "object" && button.children !== undefined) {
                button.children.forEach(child => {
                    cards.push(this._createChildDialogCard(child, chapter, notInstalled, marketToDialog));
                });
            } else {
                cards.push(this._createButtonCard(button, chapter, notInstalled, marketToDialog, appPath, userDialogs));
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

    _createChildDialogCard(child, chapter, notInstalled, marketToDialog) {
        const visibility = this._calculateVisibility(child, notInstalled);
        const fixedChild = this._fixPath(child);

        try {
            const dialog = getDialog(child);
            this._addToDialogTree(chapter, dialog);

            return Sqrl.Render(this.templateManager.getTemplate('card'), {
                dialog: dialog.nav,
                chapter: chapter.name,
                uninstall: visibility.uninstall,
                install: visibility.install,
                update: 'hidden',
                delete: 'hidden',
                child: fixedChild,
                userd: false
            });
        } catch (error) {
            console.error('Error creating child dialog card:', error);
            return '';
        }
    }

    _createButtonCard(button, chapter, notInstalled, marketToDialog, appPath, userDialogs) {
        const isUserDialog = this._isUserDialog(button, userDialogs, appPath, marketToDialog);
        const visibility = this._calculateVisibility(button, notInstalled);
        const fixedButton = this._fixPath(button);

        try {
            const dialog = this._getDialogSafely(button, appPath, marketToDialog);
            if (dialog) {
                this._addToDialogTree(chapter, dialog);

                return Sqrl.Render(this.templateManager.getTemplate('card'), {
                    dialog: dialog.nav,
                    chapter: chapter.name,
                    uninstall: visibility.uninstall,
                    install: visibility.install,
                    update: 'hidden',
                    delete: 'hidden',
                    child: fixedButton,
                    userd: isUserDialog
                });
            }
        } catch (error) {
            console.error('Error creating button card:', error);
        }

        return '';
    }

    _calculateVisibility(item, notInstalled) {
        return {
            install: notInstalled.indexOf(item) > -1 ? '' : 'hidden',
            uninstall: notInstalled.indexOf(item) > -1 ? 'hidden' : ''
        };
    }

    _fixPath(itemPath) {
        return (process.platform === 'win32') ? itemPath.replace(/\\/g, "\\\\") : itemPath;
    }

    _isUserDialog(button, userDialogs, appPath, marketToDialog) {
        return userDialogs.indexOf(button) > -1 ||
            userDialogs.indexOf(path.join(appPath, button)) > -1 ||
            (Object.keys(marketToDialog).indexOf(button) > -1 &&
                userDialogs.indexOf(path.join(appPath, marketToDialog[button], button)) > -1) ||
            userDialogs.some(element => button.endsWith(path.join(element)));
    }

    _getDialogSafely(button, appPath, marketToDialog) {
        const attempts = [
            () => getDialog(button),
            () => getDialog(path.join(appPath, button)),
            () => getDialog(path.join(marketToDialog[button], button))
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
        const folderOptions = {
            title: title,
            defaultPath: sessionStore.get("HomeDir"),
            properties: ['openDirectory', 'createDirectory', 'treatPackageAsDirectory', 'dontAddToRecent']
        };

        const selectedFolders = dialog.showOpenDialogSync(getCurrentWindow(), folderOptions);
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
                this._handleSuccessfulUpload(result);
                this._updateUserDialogs(result);
            }
        } catch (error) {
            console.error('Error saving dialog:', error);
        } finally {
            saveButton.html("Upload");
            saveButton.prop('disabled', false);
        }
    }

    _handleSuccessfulUpload(result) {
        const dialog = getDialog(result['import']);
        const template = Sqrl.Render(this.templateManager.getTemplate('card'), {
            dialog: dialog.nav,
            chapter: result['chapter'],
            uninstall: 'hidden',
            install: '',
            update: 'hidden',
            delete: 'hidden',
            child: result['import'],
            userd: true
        });

        $(`#market_tab_${result['tab']}`).append(template);
        $(`#market_chapter_${result['tab']}`).trigger('click');

        setTimeout(() => {
            document.getElementById(`market_tab_${result['tab']}`).scrollIntoView(false);
        }, 1000);
    }

    _updateUserDialogs(result) {
        const userDialogs = store.get("nonBaseDialogs", []);
        store.delete("nonBaseDialogs");
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
}

// === GLOBAL ACTION HANDLER ===
const marketplaceActionHandler = new MarketplaceActionHandler();
global.handleMarketActionClick = (button) => {
    marketplaceActionHandler.handleAction(button);
};

// === MODULE EXPORTS ===
module.exports = {
    render: () => {
        console.log('Rendering Marketplace');
        global.mp = new Marketplace();
        return global.mp.compile();
    }
};