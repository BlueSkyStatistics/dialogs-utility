/**
 * @bluesky/marketplace-vanilla
 *
 * Framework-free ("vanilla") adaptation of the React MenuManager dialog,
 * packaged as a plain CommonJS module that BlueSkyJS can `require` directly.
 *
 * Exports:
 *   - MenuManager      the controller class.
 *   - render()         menu.js dialog factory → { modal, id, nav, onhelp }.
 *                      (menu.js calls render() with no arguments.)
 *   - initMenuManager(deps)
 *                      construct/configure the shared instance, inject host
 *                      dependencies, register global.openMenuManager, and
 *                      return the instance. Call this once at app startup.
 *   - getInstance(deps) the shared MenuManager singleton.
 *
 * Typical host wiring (BlueSkyJS init/marketplace.js):
 *
 *   const { initMenuManager } = require('@bluesky/marketplace-vanilla');
 *   const { getT } = require('../localization');
 *   initMenuManager({
 *     mMenu: global.mMenu,
 *     hiddenStore: global.hiddenStore,
 *     getT,
 *     fs: require('fs'),
 *     path: require('path'),
 *     dialog: require('@electron/remote').dialog,
 *   });
 *   // global.openMenuManager() now opens the dialog (wired from the File menu).
 */

const {MenuManager, MODAL_ID} = require('./src/menuManager');

let instance = null;

/** Get (creating if needed) the shared MenuManager instance. */
function getInstance(deps) {
    if (!instance) {
        instance = new MenuManager(deps || {});
    } else if (deps) {
        instance.configure(deps);
    }
    return instance;
}

/**
 * menu.js dialog factory. Returns the dialog descriptor; menu.js reads the
 * exported `render` and calls it with no arguments (see menu.js getDialog).
 */
function render() {
    const {getT} = requireFromRoot("localization");
    const mm = initMenuManager({
        mMenu: global.mMenu,
        hiddenStore: global.mMenu.hiddenStore,
        getT,
    });
    return mm.compile();
}

/**
 * Initialize the shared instance with host dependencies and wire globals.
 * Returns the instance.
 */
function initMenuManager(deps) {
    const mm = getInstance(deps);
    mm.registerGlobals();
    return mm;
}

module.exports = {
    MenuManager,
    MODAL_ID,
    getInstance,
    render,
    initMenuManager,
};
