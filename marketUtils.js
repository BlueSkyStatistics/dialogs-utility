const path = require('path')
const Store = require("electron-store").default;
const fs = require("fs");
const {dialog} = require("@electron/remote");
const hiddenStore = new Store({name:`hideconfig`});



function addDialog(event, it, id, chapterOverride) {
    const chapter = chapterOverride || $(event.target).closest('.card').attr('bs-tab');
    const hidden = hiddenStore.get('hiddenMenuObjects', []);
    const isRestored = hidden.includes(it);
    global.mMenu.addDialog(it, chapter, {isRestored});
}

const deleteDialog = (ev, itm, id) => {
    const chapter = ev.target.closest("div > .card").getAttribute("bs-tab");

    // Update user's dialogs.json on disk
    const markets = store.get("market", {markets: []}).markets;
    for (const market of markets) {
        if (!market.path.endsWith("dialogs.json")) continue;
        try {
            const dialogJsonDir = path.dirname(market.path);
            const userDialogJson = JSON.parse(fs.readFileSync(path.normalize(market.path)));
            const menu = userDialogJson.menu.find(m => m.name === chapter);
            if (!menu) continue;

            const btnIdx = menu.buttons.findIndex(btn => {
                if (typeof btn === 'string' && btn.startsWith("./")) {
                    return path.join(dialogJsonDir, btn.replace(".", "")).replace(/\\/g, "/") === itm;
                }
                return btn === itm;
            });
            if (btnIdx !== -1) {
                menu.buttons.splice(btnIdx, 1);
                fs.writeFileSync(path.join(dialogJsonDir, "dialogs.json"), JSON.stringify(userDialogJson, null, 2));
                break;
            }
        } catch (err) {
            console.warn(`deleteDialog: error updating ${market.path}`, err.message);
        }
    }

    // Remove from menu (handles modals, cache, DOM)
    global.mMenu.removeDialog(itm, chapter, {modalId: id, skipRender: true});

    // Remove marketplace card from DOM
    $(ev.target).closest(".card").remove();

    // Un-hide if it was hidden
    const hidden = hiddenStore.get('hiddenMenuObjects', []);
    const hidIdx = hidden.indexOf(itm);
    if (hidIdx > -1) {
        hidden.splice(hidIdx, 1);
        hiddenStore.set('hiddenMenuObjects', hidden);
    }

    // Delete the physical file
    try {
        const filePath = fs.realpathSync(itm.endsWith(".js") ? itm : `${itm}.js`);
        fs.unlinkSync(filePath);
    } catch (error) {
        console.error(`Error deleting file: ${error.message}`);
    }
}

function refreshDialog(ev, it, id) {
    var filepat = fs.realpathSync(it.endsWith('.js') ? it : `${it}.js`)
    var cached = require.cache[filepat]
    try {
        global.dialogCacheClear(filepat)
    } catch (ex) {
        require.cache[filepat] = cached
        dialog.showErrorBox("Error reloading dialog", `${filepat} \n ${ex.stack}`)
        return 1
    }
    removeDialog(ev, it, id)
    addDialog(ev, it)
}

function removeDialog(ev, item, id, chapterOverride) {
    const chapterName = chapterOverride || $(ev.target).closest('.card').attr('bs-tab');

    // Remove from menu data + modals + caches (skip re-render, we do it below)
    global.mMenu.removeDialog(item, chapterName, {modalId: id, skipRender: true});

    // Update marketplace UI: toggle Install/Uninstall button visibility
    const attrval = (process.platform === 'win32')
        ? $(ev.target).attr("onclick").replace(/\\/g, "\\\\")
        : $(ev.target).attr("onclick");
    $("#marketplace .card").find(`button[onclick="${attrval}"]`).each((_, el) => {
        $(el).parent().find('.btn-outline-primary').removeClass('hidden');
        $(el).addClass('hidden');
        $(el).parent().find('.btn-refresh').addClass('hidden');
    });
    $(`button[onclick='r_before_modal("${id}")']`).remove();

    global.mMenu.reloadMarketDialog();
    global.mMenu.recreateMenuObject();
}

function searchDialog() {
    $("#searchResults").children().remove()
    $("#marketplace .card-header").filter(function () {
        return $(this).text().includes($("#seachDialog").val());
    }).parent().each((index, item) => {
        $("#searchResults").append($(item).clone())
    })
}

function checkForSearch() {
    if ($("#seachDialog").val() && $("#seachDialog").val().length > 2) {
        searchDialog()
    } else {
        $("#searchResults").children().remove()
    }
}

global.openDialogsFolder = () => {
    global.mMenu.openUserDialogsFolder(global.mMenu.getUserDialogsPath().replace('dialogs.json', ''))
}

function uploadDialog() {
    const fileObj = $("#formFile")[0].files[0]
    if (!fileObj) {
        dialog.showErrorBox("Dialog not specified", "Please click 'Choose File' to select a dialog file and then click 'Upload'")
        return 1
    }
    // const fp = $("#formFile")[0].files[0].path
    const fp = global.electronApi.getFilePath(fileObj)
    try {
        require(fp)
    } catch (ex) {
        dialog.showErrorBox("Error uploading dialog", `${fp} \n ${ex.stack}`)
        return 1
    }
    global.dialogCacheClear(fp)
    const dialogCode = fs.readFileSync(fp).toString();
    let dialogId
    try {
        dialogId = dialogCode.match(/id\:( )?(\"||\')([a-z,A-Z,_0-9]*)(\"||\')/g)[0].split(":")[1].trim().replace(/"/g, '').replace(/'/g, '')
    } catch {
        dialog.showErrorBox("Dialog Error", "Dialog do not contain dialog ID")
        return 1
    }
    if ($(`#${dialogId}`).length > 0) {
        dialog.showErrorBox("Dialog Error", "Dialog you trying to ingest already exists, please change dialog ID, or remove existing dialog")
        return 1
    }
    const dialogsDir = global.mMenu.getUserDialogsPath().replace('dialogs.json', '')
    if (!dialogsDir) {
        dialog.showErrorBox("Dialog Error", "No dialogs directory found, please restart app and specify market dialog directory")
        return 1
    }
    if (!fs.existsSync(dialogsDir)) {
        fs.mkdirSync(dialogsDir);
    }
    if (fs.existsSync(path.join(dialogsDir, fileObj.name))) {
        dialog.showErrorBox("Dialog Error", "Dialog with that filename already exists, please provide other name to dialog")
        return 1
    }
    fs.writeFileSync(path.join(dialogsDir, fileObj.name), dialogCode)
    if ($("#iconFile")[0].files.length > 0) {
        const iconFileObj = $("#iconFile")[0].files[0]
        const iconFilePath = global.electronApi.getFilePath(iconFileObj)
        fs.writeFileSync(
            path.join(dialogsDir, iconFileObj.name),
            fs.readFileSync(iconFilePath).toString()
        )
    }
    const chapter = $("#addDialogsChapter").val()
    // todo: fix create dialogs.json if not exists
    const userDialogs = JSON.parse(fs.readFileSync(path.join(dialogsDir, 'dialogs.json')));
    let dialogsImport = path.join(dialogsDir, fileObj.name.replace(".js", ''))
    let tab = ''
    for (let i = 0; i < userDialogs['menu'].length; i++) {
        if (userDialogs['menu'][i]['name'] === chapter) {
            if (userDialogs['menu'][i]['buttons'].indexOf(dialogsImport) === -1) {
                dialogsImport = dialogsImport.replace(/\\/g, "/");
                userDialogs['menu'][i]['buttons'].push(dialogsImport)
                tab = userDialogs['menu'][i]['tab']
            } else {
                dialog.showErrorBox("Dialog Error", "The dialog you trying to import is already present")
                return 1
            }
        }
    }
    fs.writeFileSync(path.join(dialogsDir, 'dialogs.json'), JSON.stringify(userDialogs))
    return {"import": dialogsImport, "tab": tab, "chapter": chapter}
}

module.exports = {
    addDialog,
    refreshDialog,
    removeDialog,
    deleteDialog,
    uploadDialog,
    searchDialog,
    checkForSearch
}