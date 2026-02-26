const path = require('path')
const Store = require("electron-store").default;
const fs = require("fs");
const {dialog} = require("@electron/remote");
const hiddenStore = new Store({name:`hideconfig`});

function addDialog(ev, it, id, chapterOverride) {
    const filePath = path.normalize(fs.realpathSync(require.resolve(it)))
    global.dialogCacheClear(filePath)

    let isOlderDialog = false // true means dialog existed but was hidden (HIDE)
    const modal = id !== undefined && global.mMenu.main_nav.modals.find(i => i.id === id || i._filePath === filePath)
    if (!modal) {
        const {dialog: dialogObj, path} = global.getDialog(it, 'item', true)
        dialogObj._filePath = path
        global.mMenu.main_nav.modals.push(dialogObj)

        let hiddenObjects = hiddenStore.get('hiddenMenuObjects', []);
        const idx = hiddenObjects.indexOf(it)

        if (idx > -1) {
            hiddenObjects.splice(idx, 1)
            hiddenStore.set('hiddenMenuObjects', hiddenObjects)
            isOlderDialog = true
        }
    }
    const chapter = chapterOverride || $(ev.target).closest('.card').attr('bs-tab')
    global.mMenu.addMenuItem(it, chapter, isOlderDialog);
    // global.mMenu.reloadMarketDialog()
    // global.mMenu.recreateMenuObject()
}

const deleteDialog = (ev, itm, id) => {
    // todo: show confirmation dialog
    const dialogsDir = path.dirname(itm); // Path from the card where 'delete' was clicked
    const chapter = ev.target.closest("div > .card").getAttribute("bs-tab");

    let dialogJsonDir;
    let userDialogJson;

    const markets = store.get("market", {markets: []}).markets;

    // Locate and update the relevant dialogs.json
    for (const market of markets) {
        if (!market.path.endsWith("dialogs.json")) continue;

        dialogJsonDir = path.dirname(market.path);
        userDialogJson = JSON.parse(fs.readFileSync(path.normalize(market.path)));

        const menu = userDialogJson.menu.find((menuItem) => menuItem.name === chapter);
        if (!menu) continue;

        const buttonIndex = menu.buttons.findIndex((button) => {
            if (button.startsWith("./")) {
                const absPath = path
                    .join(dialogJsonDir, button.replace(".", ""))
                    .replace(/\\/g, "/");
                return absPath === itm;
            }
            return button === itm;
        });

        if (buttonIndex !== -1) {
            menu.buttons.splice(buttonIndex, 1);
            break;
        }
    }

    // Save updated dialogs.json if changes were made
    if (dialogJsonDir && userDialogJson) {
        fs.writeFileSync(
            path.join(dialogJsonDir, "dialogs.json"),
            JSON.stringify(userDialogJson, null, 2)
        );
    }

    // Remove menu item and associated DOM elements
    // mMenu.removeMenuItem(itm, $(ev.target).closest('div[role="tabpanel"]').attr("bs-tab"));
    $(ev.target).closest(".card").remove();
    $(`button[data-modal='${id}']`).remove();

    const modalElement = $(`#${id}`)[0];
    if (modalElement) modalElement.remove();

    // Clear dialog cache and remove modal from main navigation
    const filePath = fs.realpathSync(itm.endsWith(".js") ? itm : `${itm}.js`);
    global.dialogCacheClear(filePath);

    const modalIndex = global.mMenu.main_nav.modals.findIndex((modal) => modal.id === id || modal._filePath === filePath);
    if (modalIndex !== -1) {
        global.mMenu.main_nav.modals.splice(modalIndex, 1);
        global.mMenu.saveMain()
    }

    let hiddenObjects = hiddenStore.get('hiddenMenuObjects', []);
    const idx = hiddenObjects.indexOf(itm)

    if (idx > -1) {
        hiddenObjects.splice(idx, 1)
        hiddenStore.set('hiddenMenuObjects', hiddenObjects)
    }

    // todo: delete from main

    // Delete the file
    try {
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
    // global.mMenu.removeMenuItem(item, chapterOverride || $(ev.target).closest('.card').attr('bs-tab'))
    const chapterName = chapterOverride || $(ev.target).closest('.card').attr('bs-tab')
    let filePath = fs.realpathSync(item.endsWith('.js') ? item : `${item}.js`)
    filePath = require.resolve(filePath)
    global.mMenu.removeMenuItem(chapterName, filePath)
    global.dialogCacheClear(filePath)

    let attrval = (process.platform === 'win32') ? $(ev.target).attr("onclick").replace(/\\/g, "\\\\") : $(ev.target).attr("onclick")
    $("#marketplace .card").find(`button[onclick="${attrval}"]`).each((index, item) => {
        $(item).parent().find('.btn-outline-primary').removeClass('hidden')
        $(item).addClass('hidden')
        $(item).parent().find('.btn-refresh').addClass('hidden')
    })
    $(`button[data-modal='${id}']`).remove()
    $(`button[onclick='r_before_modal("${id}")']`).remove()
    $(`#${id}`).remove()

    // const modalIndex = global.mMenu.main_nav.modals.findIndex((i) => i.id === id || i._filePath === filePath);
    // if (modalIndex !== -1) {
    //     global.mMenu.main_nav.modals.splice(modalIndex, 1);
    //     global.mMenu.saveMain()
    //     const chapter = global.mMenu.main.menu.find(chapter => chapter.name === chapterOverride)
    //     const chapterButtonIndex = chapter.buttons.findIndex(i => i === item)
    //     chapterButtonIndex > -1 && global.mMenu.main.menu.find(chapter => chapter.name === chapterOverride)?.buttons.splice(chapterButtonIndex, 1)
    // }

    global?.mMenu?.reloadMarketDialog()
    global?.mMenu?.recreateMenuObject()
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

function openDialogsFolder() {
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