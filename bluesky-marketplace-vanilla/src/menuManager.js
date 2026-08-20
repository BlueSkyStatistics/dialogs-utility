/**
 * MenuManager — framework-free controller equivalent of the React
 * MenuManagerModal + its callback wiring.
 *
 * It produces a dialog descriptor in the format menu.js consumes
 * (`compile()` → { modal, id, nav, onhelp }) and self-manages a Bootstrap
 * modal: building the markup, binding one delegated event handler, and
 * re-rendering in place after each action.
 *
 * Dependencies are injected (so the package has no hard link to the host
 * app's source files):
 *   { mMenu, hiddenStore, getT, fs, path, dialog }
 *
 * Data is read live from the injected `mMenu`:
 *   - sections  ← mMenu.mainMenu
 *   - hiddenSet ← mMenu._getHiddenSet()
 * Actions call mMenu.recreateMenuObject(), mMenu._findTabById(),
 * mMenu.injectTabButton() and persist hidden state via hiddenStore — matching
 * the behaviour of the previous React integration in init/marketplace.js.
 */

const templates = require('./templates');
const {flattenItems, collectMenus} = require('./menuUtils');
const fs = require("fs");
const path = require("path");
const {dialog, getCurrentWindow} = require("@electron/remote");
const {default: Store} = require("electron-store");

const MODAL_ID = templates.MODAL_ID;
const BODY_ID = templates.BODY_ID;

const hasDom = () => typeof document !== 'undefined';
const jq = () => (typeof window !== 'undefined' && window.$) ? window.$ : null;
const bs = () => (typeof window !== 'undefined' && window.bootstrap) ? window.bootstrap : null;

/** Escape a value for use inside a `[attr="..."]` CSS selector. */
function cssAttrEscape(value) {
    return String(value === undefined || value === null ? '' : value).replace(/(["\\])/g, '\\$1');
}

class MenuManager {
    constructor(deps = {}) {
        this.configure(deps);

        // UI-only state (mirrors React useState)
        this.activeSectionId = null;
        this.openSubmenuIds = new Set();

        // Cache for collectCustomMenus() to avoid repeated work. Call
        // invalidateCollectMenus() to force a refresh when underlying
        // data changes.
        this._collectCustomMenusCache = null;

        this._t = null;
        this._bound = false;
        this._dirty = false;
    }

    /** (Re)assign injected dependencies. */
    configure(deps = {}) {
        if ('mMenu' in deps) this.mMenu = deps.mMenu;
        if ('hiddenStore' in deps) this.hiddenStore = deps.hiddenStore;
        if ('getT' in deps) {
            this.getT = deps.getT;
            this._t = null; // re-resolve lazily
        }
        // if ('fs' in deps) this.fs = deps.fs;
        // if ('path' in deps) this.path = deps.path;
        return this;
    }

    /** Translation function for the 'menu' namespace (falls back to identity). */
    get t() {
        if (!this._t) {
            this._t = (typeof this.getT === 'function') ? this.getT('menu') : ((key) => key);
        }
        return this._t;
    }

    // ── Data access ─────────────────────────────────────────────────────────

    getSections() {
        return (this.mMenu && this.mMenu.mainMenu) || [];
    }


    _buildContext() {
        const sections = this.getSections();
        return {
            sections,
            hiddenSet: this.mMenu._getHiddenSet(),
            activeSectionId: this.activeSectionId,
            openSubmenuIds: this.openSubmenuIds,
            customMenus: this.collectCustomMenus(),
            t: this.t,
            mMenu: this.mMenu,
            manager: this
        };
    }

    _findItemById(itemId) {
        const customFiles = this.collectCustomMenus()
        return customFiles.find(i => i.id === itemId);
    }

    // ── menu.js dialog descriptor ─────────────────────────────────────────────

    compile() {
        return {
            ...this.getBuiltinModalDescriptor(),
            onhelp: {
                title: 'Menu Manager',
                r_help: '',
                body: 'Manage menu sections, show or hide dialogs, and install, remove, or delete custom menus.',
            },
            nav: {
                name: 'Menu Manager',
                icon: 'fas fa-bars',
                datasetRequired: false,
                modal: MODAL_ID,
            },
        };
    }

    /**
     * Descriptor consumed by the host's Menu._createBuiltinModals(): the same
     * { id, modal, onshow } shape as the other built-in dialogs, so the modal is
     * appended and wired through the host's standard appendItemToDOM() pipeline
     * (and rebuilt on every recreateMenuObject()). Intentionally omits `onhelp`
     * and `nav` to match the sibling modals and avoid the host help-popover
     * wiring (setupHelpPopover) running against a non-existent help button.
     */
    getBuiltinModalDescriptor() {
        return {
            id: MODAL_ID,
            // modal: () => templates.renderModalShell(this._buildContext()),
            onshow: undefined,
            onclick: 'global.menuManager.open()'
        };
    }

    // ── Rendering / lifecycle ────────────────────────────────────────────────

    /** Re-render the modal body in place from the latest data. */
    _refresh() {
        if (!hasDom()) return;
        const body = document.getElementById(BODY_ID);
        this._disposeTooltips();
        if (body) body.innerHTML = templates.renderBody(this._buildContext());
        this._initializeTooltips();
    }

    open() {
        if (!hasDom()) return undefined;
        let el = document.getElementById(MODAL_ID);
        if (!el) {
            // Normally the host creates the modal via Menu._createBuiltinModals()
            // (see getBuiltinModalDescriptor). This is a defensive fallback for
            // the case where open() is somehow called before the menu was built.
            const html = templates.renderModalShell(this._buildContext());
            const $ = jq();
            if ($) $(document.body).append(html);
            else document.body.insertAdjacentHTML('beforeend', html);
            el = document.getElementById(MODAL_ID);
            this._initializeTooltips();
        } else {
            this._refresh();
        }
        this._bindEvents();
        this._show(el);
        return el;
    }
    _disposeTooltips() {
        const $ = jq();
        if ($ && $.fn && $.fn.tooltip) {
            $(`#${MODAL_ID} [data-toggle="tooltip"], #${MODAL_ID} [data-error-tooltip]`).tooltip('dispose');
        } else {
            document.querySelectorAll(`#${MODAL_ID} [data-toggle="tooltip"], #${MODAL_ID} [data-error-tooltip]`).forEach((el) => {
                bs()?.Tooltip?.getInstance(el)?.dispose();
            });
        }
    }

    _initializeTooltips() {
        if (!hasDom()) return;
        const $ = jq();
        const regularSelector = `#${MODAL_ID} [data-toggle="tooltip"]`;
        const errorSelector = `#${MODAL_ID} [data-error-tooltip]`;
        const errorTemplate = '<div class="tooltip menu-manager-error-tooltip" role="tooltip" style="pointer-events:auto;"><div class="arrow"></div><div class="tooltip-inner" style="max-width:26rem; text-align:left;"></div></div>';

        if ($ && $.fn && $.fn.tooltip) {
            $(regularSelector).tooltip();
            $(errorSelector).each(function () {
                const trigger = this;
                $(trigger).tooltip({
                    trigger: 'manual',
                    html: true,
                    sanitize: false,
                    placement: 'top',
                    template: errorTemplate,
                    title: () => trigger.getAttribute('data-error-tooltip-content'),
                }).on('click.menuManagerErrorTooltip', function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    $(errorSelector).not(trigger).tooltip('hide');
                    $(trigger).tooltip('show');
                });
            });
        } else if (bs()?.Tooltip) {
            document.querySelectorAll(regularSelector).forEach((el) => {
                bs().Tooltip.getOrCreateInstance(el);
            });
            document.querySelectorAll(errorSelector).forEach((trigger) => {
                const tooltip = bs().Tooltip.getOrCreateInstance(trigger, {
                    trigger: 'manual',
                    html: true,
                    sanitize: false,
                    placement: 'top',
                    template: errorTemplate,
                    title: () => trigger.getAttribute('data-error-tooltip-content'),
                });
                trigger.addEventListener('click', (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    document.querySelectorAll(errorSelector).forEach((el) => {
                        if (el !== trigger) bs().Tooltip.getInstance(el)?.hide();
                    });
                    tooltip.show();
                });
            });
        }
    }

    close() {
        if (!hasDom()) return;
        this._hide(document.getElementById(MODAL_ID));
    }

    _show(el) {
        const $ = jq();
        if ($ && $.fn && $.fn.modal) {
            $(`#${MODAL_ID}`).modal('show');
            return;
        }
        const bootstrap = bs();
        if (bootstrap && bootstrap.Modal && el) {
            bootstrap.Modal.getOrCreateInstance(el).show();
            return;
        }
        if (el) {
            el.classList.add('show');
            el.style.display = 'block';
        }
    }

    _hide(el) {
        const $ = jq();
        if ($ && $.fn && $.fn.modal) {
            $(`#${MODAL_ID}`).modal('hide');
            return;
        }
        const bootstrap = bs();
        if (bootstrap && bootstrap.Modal && el) {
            const inst = bootstrap.Modal.getInstance(el) || bootstrap.Modal.getOrCreateInstance(el);
            inst.hide();
            return;
        }
        if (el) {
            el.classList.remove('show');
            el.style.display = 'none';
        }
    }

    // ── Events (single delegated handler) ─────────────────────────────────────

    _bindEvents() {
        const $ = jq();
        if (this._bound || !$) return;
        const self = this;
        // Delegate on document so it survives body re-renders and recreateMenuObject.
        $(document).on('click', `#${MODAL_ID} [data-action]`, function (e) {
            e.preventDefault();
            const el = this;
            const action = el.getAttribute('data-action');
            const itemId = el.getAttribute('data-item-id');
            const sectionId = el.getAttribute('data-section-id');
            const filePath = el.getAttribute('data-file-path');

            switch (action) {
                case 'select-section':
                    self.selectSection(sectionId);
                    break;
                case 'toggle-submenu':
                    self.toggleSubmenu(itemId);
                    break;
                case 'toggle-visibility':
                    self.toggleVisibility(itemId, el.getAttribute('data-hidden') !== 'true', sectionId);
                    break;
                case 'remove-from-section':
                    self.removeFromSection(sectionId, itemId);
                    break;
                case 'install-to-section': {
                    const select = self._findInstallSelect(itemId);
                    const targetSectionId = select && select.value;
                    if (targetSectionId) self.installToSection(targetSectionId, itemId);
                    break;
                }
                case 'delete-custom-menu':
                    self.deleteCustomMenu(itemId, filePath);
                    break;
                case 'reload-custom-menu':
                    self.handleReloadDialog(itemId);
                    break;
                default:
                    break;
            }
        });
        // Rebuild the host menu (nav) once the dialog has fully closed and
        // Bootstrap has removed its backdrop. Deferring avoids tearing down the
        // open modal mid-interaction (which would orphan the modal backdrop).
        $(document).on('hidden.bs.modal', `#${MODAL_ID}`, function () {
            self._onHidden();
        });
        $(document).on('click', function (event) {
            if (!event.target.closest(`[data-error-tooltip], .menu-manager-error-tooltip`)) {
                $(`#${MODAL_ID} [data-error-tooltip]`).tooltip('hide');
            }
        });
        this._bound = true;
    }
    handleReloadDialog(itemId) {
        const theItem = this._findItemById(itemId);
        if (theItem.resolvedDialog) {
            $(`#${theItem.resolvedDialog.id}`).remove();
            dialogCacheClear(theItem.path)
        }
        this.mMenu.setResolvedObject(theItem)
        if (theItem.sectionIds.length > 0) {
            this._markDirty();
            // this.mMenu.initMenus()
            theItem.sectionIds.forEach((sectionId) => {
                const dialogObj = this.mMenu._findDialogInTab(theItem.id, this.mMenu._findTabById(sectionId));
                if (dialogObj) {
                    dialogObj.resolvedDialog = theItem.resolvedDialog;
                }
            })
        }
        this._refresh();
    }

    _findInstallSelect(itemId) {
        if (!hasDom()) return null;
        return document.querySelector(
            `#${MODAL_ID} [data-role="install-select"][data-item-id="${cssAttrEscape(itemId)}"]`
        );
    }

    // ── UI-only state changes ─────────────────────────────────────────────────

    selectSection(sectionId) {
        this.activeSectionId = sectionId;
        this._refresh();
    }

    toggleSubmenu(itemId) {
        if (this.openSubmenuIds.has(itemId)) this.openSubmenuIds.delete(itemId);
        else this.openSubmenuIds.add(itemId);
        this._refresh();
    }

    // ── Data-changing actions (parity with init/marketplace.js) ───────────────

    toggleVisibility(itemId, hidden, sectionId=undefined) {
        if (itemId === MODAL_ID) {
            console.log('Menu manager cannot be hidden')
            return;
        }
        const hiddenSet = this.mMenu._getHiddenSet();
        hidden ? hiddenSet.add(itemId) : hiddenSet.delete(itemId)
        this.hiddenStore.set('hiddenMenuObjects', Array.from(hiddenSet.values()));

        const customMenuItem = this._findItemById(itemId);
        if (customMenuItem !== undefined) {
            customMenuItem.isHidden = hidden;
            customMenuItem.sectionIds.forEach((menuSectionId) => {
                const menuItem = this.mMenu.findDialogById(itemId, menuSectionId)
                menuItem.isHidden = hidden
            })
        } else {
            const dialog = this.mMenu.findDialogById(itemId);
            if (dialog) {
                dialog.isHidden = hidden;
            }
        }

        this._markDirty();
        this._refresh();
    }

    customMenuToJson(menuStructure) {
        return menuStructure.map(i => (
            {
                id: i.id,
                buttons: (i.buttons || []).map(btn => ({id: btn.id, path: btn._relativePath || btn.path}))
            })
        )
    }

    removeFromSection(sectionId, itemId, options = {skipRefresh: false}) {
        const customMenuStore = this.mMenu.customMenuStore
        const currentCustomMenu = this.mMenu.customMenu
        const customTabIndex = currentCustomMenu.findIndex(i => i.id === sectionId)

        const tab = currentCustomMenu[customTabIndex]
        if (tab && Array.isArray(tab.buttons)) {
            const idx = tab.buttons.findIndex((b) => b.id === itemId);
            if (idx > -1) tab.buttons.splice(idx, 1);
        }
        const newMenu = this.customMenuToJson(currentCustomMenu);
        customMenuStore.set('menu', newMenu);
        const menuTab = this.mMenu._findTabById(sectionId)
        const idx = menuTab.buttons.findIndex((b) => b.id === itemId);
        if (idx > -1) menuTab.buttons.splice(idx, 1);
        if (!options.skipRefresh) {
            this.mMenu.initMenus()
            // this.mMenu.customMenu = this.mMenu._loadCustomMenu();

            this.invalidateCollectMenus()
            this._markDirty();
            this._refresh();
        }
        // todo: remove item from main menu
    }

    _injectCustomButton(tabId, buttonConfig) {
        // const tab = this.mMenu._findTabById(tabId);
        const customMenuStore = this.mMenu.customMenuStore
        // const currentCustomMenu = customMenuStore?.get('menu', [])
        const currentCustomMenu = this.mMenu.customMenu
        const customTabIndex = currentCustomMenu.findIndex(i => i.id === tabId)
        // const {id, path, _relativePath, resolvedDialog, isCustom} = buttonConfig
        // const buttonStoreConfig = {id, path, _relativePath, resolvedDialog, isCustom}
        if (customTabIndex > -1) {
            const existingButtonIndex = currentCustomMenu[customTabIndex].buttons.findIndex(btn => {
                return btn.id === buttonConfig.id;
            });
            if (existingButtonIndex === -1) {
                currentCustomMenu[customTabIndex].buttons.push(buttonConfig)
            } else {
                console.warn('Button is there already')
            }
        } else {
            currentCustomMenu.push({ id: tabId, buttons: [buttonConfig] })
        }
        const newMenu = this.customMenuToJson(currentCustomMenu);
        customMenuStore.set('menu', newMenu);

        this.mMenu.initMenus()
        this._refresh();
        // this.mMenu.injectTabButton(tabId, buttonConfig);

        // Underlying custom-menu data changed — invalidate cache so
        // subsequent calls to collectCustomMenus() return fresh data.
        this.invalidateCollectMenus();

    }

    installToSection(sectionId, itemId) {
        const item = this._findItemById(itemId); //todo: do something if this item is not found
        if (item) {
            this._injectCustomButton(sectionId, item)
            this._markDirty();
            this._refresh();
        } else {
            console.error('For some reason item not found. Investigate it', {sectionId, itemId})
        }
    }

    deleteCustomMenu(itemId, filePath) {
        if (dialog.showMessageBoxSync(getCurrentWindow(), {
            type: "warning",
            buttons: ["OK", "Cancel"],
            message: `Are you sure you want to delete the source file [${filePath}]?`,
        }) !== 0) { //(responseObj.response
            return
        }

        try {
            fs.unlinkSync(filePath);
            const theItem = this._findItemById(itemId);
            theItem.sectionIds.forEach((sectionId) => {
                this.removeFromSection(sectionId, itemId, {skipRefresh: true});
            })
            // this.mMenu.customMenu = this.mMenu._loadCustomMenu();
            this.mMenu.initMenus()
            // Cache invalidation: we've removed items from the sections.
            this.invalidateCollectMenus();
            this._markDirty();
            this._refresh();
        } catch (err) {
            console.error('deleteCustomMenu unlink failed', err);
        }
    }

    /** Mark that a data change requires the host menu (nav) to be rebuilt on close. */
    _markDirty() {
        this._dirty = true;
    }

    /**
     * Runs when the modal has fully closed (Bootstrap `hidden.bs.modal`): resets
     * transient UI state and, if any data changed during the session, rebuilds
     * the host menu once. Safe here because the modal is closed and Bootstrap has
     * already removed its backdrop.
     */
    _onHidden() {
        this.activeSectionId = null;
        this.openSubmenuIds.clear();
        if (this._dirty) {
            this._dirty = false;
            this._recreateMenu();
        }
    }

    _recreateMenu() {
        if (this.mMenu && typeof this.mMenu.recreateMenuObject === 'function') {
            try {
                this.mMenu.recreateMenuObject();
                // Recompute custom menus after the host recreates the menu
                // object in case the operation changed customMenu data.
                this.invalidateCollectMenus();
            } catch (err) {
                console.error('MenuManager: recreateMenuObject failed', err);
            }
        }
    }

    // ── Global wiring ─────────────────────────────────────────────────────────

    registerGlobals(target) {
        const g = target
            || (typeof global !== 'undefined' ? global : (typeof window !== 'undefined' ? window : {}));
        g.openMenuManager = () => this.open();
        g.menuManager = this;
        return g;
    }


    
    /**
     * Collect custom menus and cache the result for subsequent calls.
     * If you need fresh data, call `invalidateCollectMenus()` before calling
     * this method (or pass true to the optional `noCache` flag).
     */
    collectCustomMenus(noCache = false) {
        if (!noCache && this._collectCustomMenusCache) return this._collectCustomMenusCache;

        const storeData = this.mMenu.customMenu
        const collected = collectMenus(storeData)
        const scanned = this.scanCustomDialogFiles()
        const rootDir = this.mMenu.mPlaceDir
        const result = scanned.map(f => {
            const installedItem = collected.find(i => i.item.path === f.path || i.item._relativePath === f.path)
            if (!installedItem) {
                f._relativePath = path.relative(rootDir, f.path)
                f.path = path.resolve(rootDir, f.path)
            }
            return {...f, ...installedItem?.item, sectionIds: installedItem?.sectionIds || []}
        })

        // Cache the computed result. If callers may mutate the returned
        // objects, consider returning copies or ensure callers call the
        // invalidator after making changes.
        this._collectCustomMenusCache = result;
        return result
    }

    /** Manually invalidate the cached result of `collectCustomMenus()`. */
    invalidateCollectMenus() {
        this._collectCustomMenusCache = null;
    }


    scanCustomDialogFiles() {
        const mPlaceDir = this.mMenu.mPlaceDir
        if (!mPlaceDir) {
            return []
        }
        try {
            return fs.readdirSync(mPlaceDir)
                .filter(f => f.endsWith('.js'))
                .map(f => {
                    const result = this.mMenu.addIdToDialogItem(
                        f,
                        'custom-dialog',
                        mPlaceDir
                    )
                    result._baseName = path.basename(f, '.js')
                    const iconPath = path.join(mPlaceDir, result._baseName, '.svg')
                    result.icon = fs.existsSync(iconPath) ? iconPath : undefined
                    result.isCustom = true
                    return result
                });
        } catch (e) {
            return []
        }
    }

    setCustomDialogsFolder = () => {
        const sessionStore = global.sessionStore
        const _selectFolder = () =>{
            const selectedFolders = dialog.showOpenDialogSync(
                getCurrentWindow(),
                {
                    title: 'Select path for market dialogs',
                    defaultPath: this.mMenu.mPlaceDir || sessionStore.get("HomeDir"),
                    properties: ['openDirectory', 'createDirectory', 'treatPackageAsDirectory', 'dontAddToRecent'],
                });
            return selectedFolders ? selectedFolders[0].replace("file://", "") : null;
        }
        const folderPath = _selectFolder();
        if (!folderPath) return;

        try {
            // const marketPath = path.join(folderPath, 'dialogs.json');
            this.mMenu.mPlaceDir = folderPath
            // Invalidate cached custom-menus since the folder changed.
            this.invalidateCollectMenus();
            if (fs.existsSync(this.mMenu.mPlacePath)) {
                this._markDirty()
            } else {
                const menuStructure = this.mMenu.mainMenu.map(({id, icon}) => ({id, icon, buttons: []}))
                this.mMenu.customMenuStore.set('menu', menuStructure)
            }
            this._refresh();
        } catch (error) {
            console.error('Error creating file marketplace:', error);
        }
    }

    handleRefreshClick = () => {
        this.invalidateCollectMenus();
        this._refresh();
    }
}

module.exports = {MenuManager, MODAL_ID};
