const path = require('path')
const Store = require("electron-store");
const fs = require("fs");
const hiddenStore = new Store({name:`hideconfig`});

function addDialog(ev, it, id) {
    const filePath = path.normalize(fs.realpathSync(require.resolve(it)))
    global.dialogCacheClear(filePath)

    let isOlderDialog = false // true means dialog existed but was hidden (HIDE)
    const modal = id !== undefined && mMenu.main_nav.modals.find(modal => modal.id === id)
    if (!modal) {
        mMenu.main_nav.modals.push(global.getDialog(it, 'item'))

        let hiddenObjects = hiddenStore.get('hiddenMenuObjects', []);
        const idx = hiddenObjects.indexOf(it)

        if (hiddenObjects.includes(it)) {
            hiddenObjects.splice(idx, 1)
            hiddenStore.set('hiddenMenuObjects', hiddenObjects)
            isOlderDialog = true
        }
    }
    mMenu.addMenuItem(it, $(ev.target).closest('.card').attr('bs-tab'), isOlderDialog);
}

function deleteDialog(ev, itm, id) {

    var dialogsDir = path.dirname(itm) //path will come from the card on which 'delete' was clicked.
    let chapter = ev.target.closest("div > .card").getAttribute('bs-tab');
    let dialogJsonDir = undefined;
    let userDialogjson = undefined;

    let markets = store.get("market", {"markets": []}).markets
    outer: {
        for (let j = 0; j < markets.length; j++) {
            try {
                // if (!regex.test(markets[j].path)) { //if (markets[j].path != `./dialogs.json`) {
                if (!markets[j].path.endsWith('dialogs.json')) { //if (markets[j].path != `./dialogs.json`) {
                    dialogJsonDir = path.dirname(markets[j].path)
                    userDialogjson = JSON.parse(fs.readFileSync(path.normalize(markets[j].path)));

                    for (let i = 0; i < userDialogjson['menu'].length; i++) {
                        if (userDialogjson['menu'][i]['name'] === chapter) {
                            for (let j = 0; j < userDialogjson['menu'][i]['buttons'].length; j++) {
                                if (userDialogjson['menu'][i]['buttons'][j].startsWith("./")) {
                                    let abspath = path.join(dialogJsonDir, (userDialogjson['menu'][i]['buttons'][j]).replace('.', '')).replace(/\\/g, "/")
                                    if (abspath === itm) {
                                        userDialogjson['menu'][i]['buttons'].splice(j, 1)
                                        break outer;
                                    }
                                } else if (userDialogjson['menu'][i]['buttons'][j] === itm) {
                                    userDialogjson['menu'][i]['buttons'].splice(j, 1)
                                    break outer;
                                }
                            }
                        }
                    }

                }
            } catch (ex) {
                console.log(ex.message)
            }
        }
    }

    if (dialogJsonDir !== undefined && userDialogjson !== undefined) {
        fs.writeFileSync(path.join(dialogJsonDir, 'dialogs.json'), JSON.stringify(userDialogjson))
    }
    mMenu.removeMenuItem(itm, $(ev.target).closest('div[role="tabpanel"]').attr('bs-tab'))

    $(ev.target).closest(".card").remove()

    $(`button[data-modal='${id}']`).remove()

    if ($(`#${id}`)[0])
        $(`#${id}`)[0].remove()
    var filepath = fs.realpathSync(itm.endsWith('.js') ? itm : `${itm}.js`)
    global.dialogCacheClear(filepath)
    for (var i = 0; i < mMenu.main_nav.modals.length; i++) {
        if (mMenu.main_nav.modals[i].id == id) {
            mMenu.main_nav.modals.splice(i, 1)
            break
        }
    }
    try {
        fs.unlinkSync(filepath);

    } catch (error) {
        console.log(error);
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

function removeDialog(ev, item, id) {
    mMenu.removeMenuItem(item, $(ev.target).closest('.card').attr('bs-tab'))
    let attrval = (process.platform === 'win32') ? $(ev.target).attr("onclick").replace(/\\/g, "\\\\") : $(ev.target).attr("onclick")
    $("#marketplace .card").find(`button[onclick="${attrval}"]`).each((index, item) => {
        item
    }).each((index, item) => {
        $(item).parent().find('.btn-outline-primary').removeClass('hidden')
        $(item).addClass('hidden')
        $(item).parent().find('.btn-refresh').addClass('hidden')
    })
    $(`button[data-modal='${id}']`).remove()
    $(`button[onclick='r_before_modal("${id}")']`).remove()
    $(`#${id}`)[0].remove()
    var filepat = fs.realpathSync(item.endsWith('.js') ? item : `${item}.js`)
    global.dialogCacheClear(filepat)
    for (var i = 0; i < mMenu.main_nav.modals.length; i++) {
        if (mMenu.main_nav.modals[i].id == id) {
            mMenu.main_nav.modals.splice(i, 1)
            break
        }
    }
}

function searchDialog() {
    $("#searchResults").children().remove()
    $("#marketplace .card-header").filter(function () {
        return $(this).text().includes($("#seachDialog").val());
    }).parent().each((index, item) => {
        $("#searchResults").append($(item).clone())
    })
}

function openDialogsFolder() {
    mMenu.openUserDialogsFolder(mMenu.getUserDialogsPath().replace('dialogs.json', ''))
}

function uploadDialog() {
    if (!$("#formFile")[0].files[0]) {
        dialog.showErrorBox("Dialog not specified", "Please click 'Choose File' to select a dialog file and then click 'Upload'")
        return 1
    }
    const fp = $("#formFile")[0].files[0].path
    try {
        require(fp)
    } catch (ex) {
        dialog.showErrorBox("Error uploading dialog", `${fp} \n ${ex.stack}`)
        return 1
    }
    global.dialogCacheClear(fp)
    var dialogCode = fs.readFileSync(fp).toString();
    try {
        var dialogId = dialogCode.match(/id\:( )?(\"||\')([a-z,A-Z,_0-9]*)(\"||\')/g)[0].split(":")[1].trim().replace(/"/g, '').replace(/'/g, '')
    } catch {
        dialog.showErrorBox("Dialog Error", "Ingestred dialog do not contain dialog ID")
        return 1
    }
    if ($(`#${dialogId}`).length > 0) {
        dialog.showErrorBox("Dialog Error", "Dialog you trying to ingest already exists, please change dialog ID, or remove existing dialog")
        return 1
    }
    var dialogsDir = mMenu.getUserDialogsPath().replace('dialogs.json', '')
    if (!dialogsDir) {
        dialog.showErrorBox("Dialog Error", "No dialogs directory found, please restart app and specify market dialog directory")
        return 1
    }
    if (!fs.existsSync(dialogsDir)) {
        fs.mkdirSync(dialogsDir);
    }
    if (fs.existsSync(path.join(dialogsDir, $("#formFile")[0].files[0].name))) {
        dialog.showErrorBox("Dialog Error", "Dialog with that filename already exists, please provide other name to dialog")
        return 1
    }
    fs.writeFileSync(path.join(dialogsDir, $("#formFile")[0].files[0].name), dialogCode)
    if ($("#iconFile")[0].files.length > 0) {
        fs.writeFileSync(path.join(dialogsDir, $("#iconFile")[0].files[0].name), fs.readFileSync($("#iconFile")[0].files[0].path).toString())
    }
    var chapter = $("#addDialogsChapter").val()
    // todo: fix create dialogs.json if not exists
    var userDialogs = JSON.parse(fs.readFileSync(path.join(dialogsDir, 'dialogs.json')));
    var dialogsImport = path.join(dialogsDir, $("#formFile")[0].files[0].name.replace(".js", ''))
    var tab = ''
    for (var i = 0; i < userDialogs['menu'].length; i++) {
        if (userDialogs['menu'][i]['name'] == chapter) {
            if (userDialogs['menu'][i]['buttons'].indexOf(dialogsImport) == -1) {
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
    uploadDialog
}