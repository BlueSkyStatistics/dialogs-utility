var Sqrl = require('squirrelly');
var path = require('path');
const fs = require('fs')
const Store = require('electron-store');
const hiddenStore = new Store({name:`hideconfig`});
const blankDialogs = {
    "menu": [
        {
            "name": "Datasets",
            "tab": "Datasets",
            "buttons": []
        },
        {
            "name": "Variables",
            "tab": "Variables",
            "buttons": []
        },
        {
            "name": "Analysis",
            "tab": "analysis",
            "buttons": []
        },
        {
            "name": "Distribution",
            "tab": "distribution",
            "buttons": []
        },
        {
            "name": "Graphics",
            "tab": "graphics",
            "buttons": []
        },
        {
            "name": "DoE",
            "tab": "DoE",
            "buttons": []
        },    
        {
            "name": "Six Sigma",
            "tab": "six_sigma",
            "buttons": []
        }, 
        {
            "name": "Model Fitting",
            "tab": "model_fitting",
            "buttons": []
        },
        {
            "name": "Model Tuning",
            "tab": "model_tuning",
            "buttons": []
        },
        {
            "name": "Model Evaluation",
            "tab": "model_statistics",
            "buttons": []
        },
        {
            "name": "Forecasting",
            "tab": "forecasting",
            "buttons": []
        },
        {
            "name": "Agreement",
            "tab": "agreement",
            "buttons": []
        }
    ]
}


class marketplace {
    htmlTemplate = `<div class="modal left fade" id="{{modal.id}}" tabindex="-1" role="dialog" 
    data-backdrop="false" data-keyboard="false"
    aria-labelledby="{{modal.id}}Label"
    aria-hidden="true">
    <div class="modal-dialog modal-lg marketplace" role="document">
        <div class="modal-content" id="{{modal.id}}modelcontentdiv">
            <div class="modal-header pr-1 pl-3">
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
            </div>
            <div class="modal-body" data-actions-box="true">
            <div class="d-flex flex-nowrap">
                <div class="nav flex-column nav-pills" id="v-pills-tab" role="tablist" aria-orientation="vertical">
                    <a class="nav-link active" id="market_chapter_modules" data-toggle="pill" href="#market_tab_modules" role="tab" aria-controls="market_tab_modules" aria-selected="true">Manage Modules</a>
                    <a class="nav-link" id="v-pills-home-tab" data-toggle="pill" href="#v-pills-home" role="tab" aria-controls="v-pills-home" aria-selected="false">Dev Environment</a>
                    {{each(options.chapters)}}
                        {{@this | safe}}
                    {{/each}} 
                </div>
                <div class="tab-content flex-fill" id="v-pills-tabContent">
                    <div class="tab-pane fade show active" id="market_tab_modules" role="tabpanel" bs-tab="modules" aria-labelledby="market_chapter_modules">
                        <label for="seachDialog" class="form-label">Search for dialog</label>
                        <div class="input-group mb-3 pr-3" id="{{modal.id}}Search">
                            <input type="text" class="form-control" placeholder="" aria-label="" aria-describedby="basic-addon1" id="seachDialog" oninput="checkForSearch()" onchange="checkForSearch()">
                            <div class="input-group-prepend">
                                <button class="btn btn-upload btn-path" type="button" onclick="searchDialog()"><i class="fas fa-search mr-1"></i>Search</button>
                            </div>
                        </div>
                        <div class="mb-3 pr-3" id="searchResults">
                        </div>
                        <label class="form-label">Modules</label>
                        {{each(options.modules)}}
                            {{@this | safe}}
                        {{/each}}
                    </div>
                    <div class="tab-pane fade" id="v-pills-home" role="tabpanel" aria-labelledby="v-pills-home-tab">
                        <!-- <ul class="nav nav-pils nav-black" style="width:100%" id="{{modal.id}}_action_type" bs-type="tab" role="tablist">
                            <li class="nav-item">
                                <a class="nav-link btn-secondary btn-top-menu active" 
                                id="{{modal.id}}_action_type_upload_tab" 
                                data-toggle="tab" href="#{{modal.id}}_action_type_upload" 
                                role="tab" aria-controls="{{modal.id}}_action_type_upload" 
                                el-group="barChartModal_count" el-index="0" 
                                aria-selected="true">Add dialog</a>
                            </li>
                            <li class="nav-item hidden">
                                <a class="nav-link btn-secondary btn-top-menu" 
                                id="{{modal.id}}_action_type_git_tab" 
                                data-toggle="tab" href="#{{modal.id}}_action_type_git" 
                                role="tab" aria-controls="{{modal.id}}_action_type_git" 
                                el-group="{{modal.id}}_action_type_git" el-index="1" 
                                aria-selected="true">Git package (Beta)</a>
                            </li>
                        </ul> -->
                        <div class="tab-content tab-content-black" id="{{modal.id}}_action_type_content">
                            <div class="tab-pane fade show active p-3" 
                                id="{{modal.id}}_action_type_upload" role="tabpanel" 
                                aria-labelledby="{{modal.id}}_action_type_upload_tab">
                                <div class="hidden" id="{{modal.id}}AddMarketplace">
                                    <label for="formFile" class="form-label">Add path to Marketplace Dialogs</label>
                                    <div>
                                        <button type="button" class="btn btn-upload" action="submit" id="{{modal.id}}Submit">Select Folder</button>  
                                    </div>
                                </div>
                                <div class="hidden" id="{{modal.id}}AddDialog">
                                    <h5>Add your dialog</h5>
                                    <div class="row">
                                        <div class="col">
                                            <div class="d-flex mr-3 justify-content-between">
                                                <label class="form-label mt-3 mr-2 small">Dialogs Location:</label>
                                                <button type="button" class="btn btn-upload btn-path" id="{{modal.id}}DialogLocation" onclick="openDialogsFolder()"></button>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="row  mt-1">
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
                                    </div>
                                </div>
                            </div>
                            <div class="tab-pane fade show p-3" 
                                id="{{modal.id}}_action_type_git" role="tabpanel" 
                                aria-labelledby="{{modal.id}}_action_type_git_tab">
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
                                            <input type="text" class="form-control" placeholder=""  id="{{modal.id}}GitUsr">
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
                                            <button type="button" class="btn btn-upload btn-path" action="submit" id="{{modal.id}}GitSubmit"">Add Package</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="mt-3 mb-3">
                        <h5>Develepoment environment usage</h5>
                            To install new dialogs you must select a folder (by clicking 'Select Folder') where the new dialogs will be intalled. Once this path is set the options to install the new dialogs will be displayed.
                            <br/>
                            <br/>
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
                        </div>
                    </div>
                    
                    {{each(options.tabs)}}
                        {{@this | safe}}
                    {{/each}}
                </div>
            </div>
        </div>
    </div>
</div>`
    id = "marketplace";
    label = "Dialog Marketplace";
    content;
    chapters = []
    dropitems = []
    tabs = []
    chapter_template = '<a class="nav-link" id="market_chapter_{{id}}" data-toggle="pill" href="#market_tab_{{id}}" role="tab" aria-controls="market_tab_{{id}}" aria-selected="false">{{chapter}}</a>'
    tab_template = `<div class="tab-pane fade" id="market_tab_{{id}}" role="tabpanel" bs-tab="{{chapter}}" aria-labelledby="market_chapter_{{id}}">
    {{each(options.cards)}}
        {{@this | safe}}
    {{/each}}
</div>
`
    card_template = `<div class="card" bs-tab="{{chapter}}">
    <div class="card-header">
        <div class="row">
            <div class="col-8 title">
                <div calas="d-flex">
                    <div class="d-inline-flex"><h6>{{dialog.name}}</h6></div>
                    <div class="d-inline-flex ml-2">
                        <div class="{{if(options.userd)}}bg-success{{#else}}bg-primary{{/if}} rounded-pill pl-3 pr-3" style="height: 20px;">{{if(options.userd)}}User Dialog{{#else}}Base dialog{{/if}}</div>
                    </div>
                </div>
            </div>
            <div class="col-4">
            {{if(options.userd)}}
                <button type="button" class="btn btn-sm btn-outline-warning btn-refresh float-right {{if(options.uninstall=="hidden")}} hidden{{/if}}" onclick="refreshDialog(event, '{{child}}', {{if(options.dialog.modal)}} '{{dialog.modal}}' {{#else}} '{{dialog.modal_id}}' {{/if}})">Reload Dialog</button> 
                <button type="button" class="btn btn-sm btn-outline-danger float-right " onclick="deleteDialog(event, '{{child}}', '{{dialog.modal}}')">Delete</button> 
            {{/if}}
                <button type="button" class="btn btn-sm btn-outline-danger float-right {{if(options.uninstall=="hidden")}} hidden{{/if}}" onclick="removeDialog(event, '{{child}}', {{if(options.dialog.modal)}} '{{dialog.modal}}' {{#else}} '{{dialog.modal_id}}' {{/if}})">Hide</button> 
                <button type="button" class="btn btn-sm btn-outline-warning float-right {{if(options.update=="hidden")}} hidden{{/if}}">Update available</button>
                <button type="button" class="btn btn-sm btn-outline-primary float-right {{if(options.install=="hidden")}} hidden{{/if}}" onclick="addDialog(event, '{{child}}', {{if(options.dialog.modal)}} '{{dialog.modal}}' {{#else}} '{{dialog.modal_id}}' {{/if}})">Install</button>                                  
            </div>
        </div>
    </div>
    <div class="card-body">
        {{if(options.dialog.description)}}{{ dialog.description | safe }}{{/if}}
    </div>
</div> `

modulesСardTemplate = `<div class="card" bs-tab="modules">
<div class="card-header">
    <div class="row">
        <div class="col-8 title">
            <div calas="d-flex">
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
            <!--
            <select class="form-select form-select-sm versionsSelect" aria-label=".form-select-sm">
                 {{each(options.module.available)}}
                     <option value="{{@this.name}}">{{@this.name}}</option>
                 {{/each}}
            </select>
            <button type="button" class="btn btn-sm btn-outline-primary float-right" data-module='{{module.name | safe}}' data-module-type='{{module.type | safe}}' data-version='{{module.version | safe}}' onclick="updateModule(event)">Update</button>
            -->
        </div>
    </div>
</div>
<div class="card-body">
{{ module.description | safe }}
</div>
</div>`

help = {
    title: "Marketplace Help",
    r_help: "",
    body: `
<b>Initialization</b>
<br/>
To install new dialogs you must select a folder (by clicking 'Select Folder') where the new dialogs will be intalled. Once this path is set the options to install the new dialogs will be displayed.
<br/>
<br/>
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
    `
}

    fileProvider(market) {
        var main = {}
        try{
            try{
                try {
                    main =JSON.parse(fs.readFileSync(market.path))
                } catch {
                    main =JSON.parse(fs.readFileSync(`./${market.path}`))
                }
            } catch {
                main = JSON.parse(fs.readFileSync(path.join(__dirname.replace("app.asar", ""), market.path)))
            }
            return main.menu
        } catch {
            return []
        }
    }

    gitProvider(market) {
        return gitClone(market)
    }
    

    flattenMenu(menu) {
        var flattened = []
        for(var i = 0; i < menu.buttons.length; i++) {
            if (typeof(menu.buttons[i]) == "object" && menu.buttons[i].children != undefined) {
                for (var child_index=0; child_index < menu.buttons[i].children.length; child_index++){
                    flattened.push(menu.buttons[i].children[child_index]) 
                }
            } else {
                flattened.push(menu.buttons[i]) 
            } 
        }
        return flattened
    }

    mergeMarkets() {
        var proviers = {
            file: this.fileProvider,
            git: this.gitProvider
        }
        var outerthis = this
        var menuList = []
        var tmp_path = ''
        var not_installed = []
        var total_installed = []
        var market_to_dialog = {}
        var starting_point = store.get('main').menu
        starting_point.forEach(item => {
            menuList.push(item.name)
        })
        var markets = store.get('market')
        markets.markets.forEach(market => {
            var marketData = proviers[market.provider](market)
            for (var i=0; i<marketData.length; i++) {
                if (menuList.indexOf(marketData[i].name) > -1) {
                    var menulist_installed = outerthis.flattenMenu(starting_point[menuList.indexOf(marketData[i].name)])
                    total_installed.push.apply(total_installed, menulist_installed)
                    var menu_from_market = outerthis.flattenMenu(marketData[i])
                    var diff = menu_from_market.filter(n => !total_installed.includes(n))
                    starting_point[menuList.indexOf(marketData[i].name)].buttons.push.apply(starting_point[menuList.indexOf(marketData[i].name)].buttons, diff)
                    not_installed.push.apply(not_installed, diff)
                } else {
                    starting_point.push(marketData[i])
                    var menu_from_market = outerthis.flattenMenu(marketData[i])
                    var diff = menu_from_market.filter(n => !total_installed.includes(n))
                    not_installed.push.apply(not_installed, diff)
                }
                tmp_path = market.path.replace('dialogs.json', '')
                for(var j=0; j<menu_from_market.length; j++){
                    market_to_dialog[menu_from_market[j]] = tmp_path
                }
            }
        })
        var hidden_objects = hiddenStore.get('hiddenMenuObjects', [])
        not_installed = [...new Set([...not_installed ,...hidden_objects])];
        return { starting_point, not_installed, market_to_dialog }
    }

    renderContent() {
        var outerthis = this
        var cards = []
        var processed_dialogs = []
        var {starting_point, not_installed, market_to_dialog} = this.mergeMarkets()
        console.log("Not Installed:",not_installed)
        var appPath = sessionStore.get("appPath", process.cwd())
        var userDialogs = store.get("nonBaseDialogs", [])
        var userd = false
        console.log("render Mkt Place=======")
        starting_point.forEach(function(chapter) {
            if (chapter.tab !== 'file' && chapter.tab !== 'tools') {
                outerthis.chapters.push(Sqrl.Render(outerthis.chapter_template, {id: chapter.tab.replace(/[^A-Z0-9]/ig, "_"), chapter: chapter.name ? chapter.name : chapter.tab}))
                outerthis.dropitems.push(chapter.name ? chapter.name : chapter.tab)
                chapter.buttons.forEach(function(button) {
                    
                    userd = false
                    if (typeof(button) == "object" && button.children == undefined) {
                        cards.push(Sqrl.Render(outerthis.card_template, {dialog: button, chapter: chapter.name}))
                    } else if (typeof(button) == "object" && button.children != undefined) {
                        button.children.forEach(function(chd) {
                                             // let child = chd.replace(/\\/g, "/")
                            let child = chd
                                                 // let child = path.normalize(chd.replace(/\\/g, "/"))
                            // console.log("Child:", child)
                            var install_visible = 'hidden' 
                            var uninstall_visible = ''
                            if (not_installed.indexOf(child) > -1) {
                                install_visible = ''
                                uninstall_visible = 'hidden'
                            }
                             child = chd.replace(/\\/g, "\\\\")
                            try {
                                cards.push(Sqrl.Render(outerthis.card_template, {dialog: require(child).item.nav, chapter: chapter.name, uninstall: uninstall_visible, install: install_visible, update: 'hidden', delete: 'hidden', child: child, userd: false}))
                            } catch(ex) {
                                if (child.startsWith(".")) {
                                    cards.push(Sqrl.Render(outerthis.card_template, {dialog: require(path.join(appPath, child)).item.nav, chapter: chapter.name, uninstall: uninstall_visible, install: install_visible, update: 'hidden', delete: 'hidden', child: child, userd: false}))
                                } else {
                                    cards.push(Sqrl.Render(outerthis.card_template, {dialog: require(child).item.nav, chapter: chapter.name, uninstall: uninstall_visible, install: install_visible, update: 'hidden', delete: 'hidden', child: child, userd: false}))
                                }
                            }
                        })
                    } else {
                        // button = button.replace(/\\/g, "/")
                        // button = button.replace(/\\/g, "\\\\")
                        // button = path.normalize(button.replace(/\\/g, "/"))
                        // console.log("Button:", button)
                        if (userDialogs.indexOf(button) > -1) {
                            userd = true
                        } else if (userDialogs.indexOf(path.join(appPath, button)) > -1){
                            userd = true
                        } else if (Object.keys(market_to_dialog).indexOf(button) > -1 && userDialogs.indexOf(path.join(appPath, market_to_dialog[button], button)) > -1){
                            userd = true
                        } else if (userDialogs.some((element) => button.endsWith(path.join(element)))) {
                            userd = true
                        }
                        var install_visible = 'hidden' 
                        var uninstall_visible = ''
                        if (not_installed.indexOf(button) > -1) {
                            install_visible = ''
                            uninstall_visible = 'hidden'
                        }
                        button = button.replace(/\\/g, "\\\\")
                        try {
                            cards.push(Sqrl.Render(outerthis.card_template, {dialog: require(button).item.nav, chapter: chapter.name, uninstall: uninstall_visible, install: install_visible, update: 'hidden', delete: 'hidden', child: button, userd: userd}))
                            processed_dialogs.push(button)
                        } catch(ex) {
                            try {
                                if (button.startsWith(".")) {
                                    cards.push(Sqrl.Render(outerthis.card_template, {dialog: require(path.join(appPath, button)).item.nav, chapter: chapter.name, uninstall: uninstall_visible, install: install_visible, update: 'hidden', delete: 'hidden', child: button, userd: userd}))
                                    processed_dialogs.push(path.join(appPath, button))
                                } else {
                                    console.log("here")
                                    cards.push(Sqrl.Render(outerthis.card_template, {dialog: require(button).item.nav, chapter: chapter.name, uninstall: uninstall_visible, install: install_visible, update: 'hidden', delete: 'hidden', child: button, userd: userd}))
                                    processed_dialogs.push(button)
                                }
                            } catch (ex) {
                                try {
                                    if (processed_dialogs.indexOf(path.join(market_to_dialog[button], button)) == -1) {
                                        cards.push(Sqrl.Render(outerthis.card_template, {dialog: require(path.join(market_to_dialog[button], button)).item.nav, chapter: chapter.name, uninstall: uninstall_visible, install: install_visible, update: 'hidden', delete: 'hidden', child: path.join( market_to_dialog[button], button).replace(/\\/g, "/"), userd: userd}))
                                        processed_dialogs.push(path.join(market_to_dialog[button], button))
                                    }
                                } catch (ex) {
                                    // dialog.showErrorBox(`skip the ${button} due to error`, `skip the ${button} due to error: \n ${ex}`);
                                    console.log(ex)
                                }
                            }
                        }
                    }
                })
                outerthis.tabs.push(Sqrl.Render(outerthis.tab_template, {cards: cards, chapter: chapter.name, id: chapter.tab.replace(/[^A-Z0-9]/ig, "_")}))
                cards = []
            }
        })
        var modules = []
        var installedModules = sessionStore.get("modulesVersions", [])
        for (var i=0; i<installedModules.length; i++) {
            installedModules[i].available = installedModules[i].available.map(a => Object.values(a)[0]);
            modules.push(Sqrl.Render(outerthis.modulesСardTemplate, {module: installedModules[i]}))
        }
        return Sqrl.Render(this.htmlTemplate, {modal: {id: outerthis.id, label: outerthis.label}, chapters: outerthis.chapters, tabs: outerthis.tabs, dropitems: outerthis.dropitems, modules: modules})
    }
    onShow() {
        var outerthis = this
        ipcRenderer.invoke('logEvent', {category: "dialog", action: "show", title: "marketplace"})
        if ($('.modal:visible').length && $('body').hasClass('modal-open')) {
            $('.modal:visible').each((index, item) => {
                if (item.id !== outerthis.id) {
                    $(`#${item.id}`).removeAttr("dataset");
                    $(`#${item.id}`).modal('hide');
                }
            });
        }
        if (mMenu.getUserDialogsPath() == undefined) {
            if ($(`#${this.id}AddMarketplace`).hasClass('hidden')) {
                $(`#${this.id}AddMarketplace`).removeClass("hidden")
            }
            if (! $(`#${this.id}AddDialog`).hasClass("hidden")) {
                $(`#${this.id}AddDialog`).addClass("hidden")
            }
        } else {
            if (! $(`#${this.id}AddMarketplace`).hasClass('hidden')) {
                $(`#${this.id}AddMarketplace`).addClass("hidden")
            }
            if ($(`#${this.id}AddDialog`).hasClass("hidden")) {
                $(`#${this.id}AddDialog`).removeClass("hidden")
            }
            $(`#${this.id}DialogLocation`).html(mMenu.getUserDialogsPath().replace('dialogs.json', '')) 
        }
    }
    onHide() {
        $("#v-pills-home-tab").trigger('click')
        $("#searchResults").children().remove()
    }

    onCreateMarketplace() {
        var main = store.get('market', {})
        var outerthis = this
        if (!mMenu.getUserDialogsPath(main) && $(`#${this.id}GitUrl`).val()=="") {
            var folder = dialog.showOpenDialogSync(getCurrentWindow(), {
                    title: 'Select path for market dialogs',
                    defaultPath: sessionStore.get("HomeDir"),
                    properties: ['openDirectory', 'createDirectory', 'treatPackageAsDirectory', 'dontAddToRecent'],
                }
            )
            if (folder !== undefined) {
                var market = {
                    name: 'User dialogs',
                    path: path.join(folder[0].replace("file://", ""), 'dialogs.json'),
                    provider: 'file'
                }
                fs.writeFileSync(path.join(folder[0].replace("file://", ""), 'dialogs.json'), JSON.stringify(blankDialogs))
                main.markets.push(market)
                var location = store.get("mplacepath")
                fs.writeFileSync(location, JSON.stringify(main))
                mMenu.reloadMarketFromFile()
                mMenu.compileNonBaseDialogs()
                $(`#${this.id}AddMarketplace`).addClass("hidden")
                $(`#${this.id}AddDialog`).removeClass("hidden")
                $(`#${this.id}DialogLocation`).html(mMenu.getUserDialogsPath().replace('dialogs.json', '')) 
            }
        } else if ($(`#${this.id}GitUrl`).val()) {
            var market = {
                name: 'Git dialogs',
                provider: 'git'
            }
            var folder = dialog.showOpenDialogSync(getCurrentWindow(), {
                title: 'Select path for git dialogs',
                defaultPath: sessionStore.get("HomeDir"),
                properties: ['openDirectory', 'createDirectory', 'treatPackageAsDirectory', 'dontAddToRecent'],
            })
            // var dialogsPath = $(`#${this.id}GitUrl`).val().split("/").last().replace(".git", "")
            market.path = path.join(folder[0].replace("file://", ""), 'dialogs.json')
            market.repo = $(`#${this.id}GitUrl`).val()
            market.branch = $(`#${this.id}GitBranch`).val()
            if ($(`#${this.id}GitUser`).val())  market.username=$(`#${this.id}GitUser`).val();
            if ($(`#${this.id}GitPwd`).val())  market.password=$(`#${this.id}GitPwd`).val();
            if ($(`#${this.id}GitKey`).val())  market.ssh_key=$(`#${this.id}GitKey`).val();
            main.markets.push(market)
            var location = store.get("mplacepath")
            fs.writeFileSync(location, JSON.stringify(main))
            gitClone(market)
        }
    }

    onSave() {
        $(`#${this.id}Save`).prop('disabled', true);
        $(`#${this.id}Save`).html('<i class="fas fa-spinner fa-spin"></i>')

        var res = uploadDialog()
        var template = this.template
        if (typeof(res) == 'object'){
            var template = Sqrl.Render(template, {dialog: require(res['import']).item.nav, chapter: res['chapter'], uninstall: 'hidden', install: '', update: 'hidden', delete: 'hidden', child: res['import'], userd: true})
            $(`#market_tab_${res['tab']}`).append(template)
            $(`#market_chapter_${res['tab']}`).trigger('click')
            setTimeout(function() {
                document.getElementById(`market_tab_${res['tab']}`).scrollIntoView(false)
            }, 1000);

            var userDialogs = store.get("nonBaseDialogs", [])
            store.delete("nonBaseDialogs")
            userDialogs.push(res['import']) // this is valied if res is an object
            store.set("nonBaseDialogs", userDialogs)
        }


        $(`#${this.id}Save`).html("Upload")
        $(`#${this.id}Save`).prop('disabled', false);
    }

    compile(onShow, onHide, onSubmit, onSyntax, help, onSave) {
        return {
            modal: this.renderContent(),
            id: this.id,
            onshow: this.onShow.bind(this),
            onhide: this.onHide.bind(this),
            onsubmit: this.onCreateMarketplace,
            // onsyntax: null,
            onhelp:  this.help,
            onsave: this.onSave,
            nav: {
                name: "Marketplace",
                icon: "icon-shoppingcart_1",
                datasetRequired: false,
                modal: this.id
            },
            template: this.card_template
        }
    }
}

module.exports.item = new marketplace().compile();