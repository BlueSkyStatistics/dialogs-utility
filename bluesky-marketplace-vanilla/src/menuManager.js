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
const {collectCustomMenus, flattenItems} = require('./menuUtils');

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

    getHiddenSet() {
        if (this.mMenu && typeof this.mMenu._getHiddenSet === 'function') {
            return this.mMenu._getHiddenSet();
        }
        return new Set();
    }

    _buildContext() {
        const sections = this.getSections();
        return {
            sections,
            hiddenSet: this.getHiddenSet(),
            activeSectionId: this.activeSectionId,
            openSubmenuIds: this.openSubmenuIds,
            customMenus: collectCustomMenus(sections),
            t: this.t,
        };
    }

    _findItemById(itemId) {
        for (const section of this.getSections()) {
            const found = flattenItems(section.buttons || []).find((b) => b.id === itemId);
            if (found) return found;
        }
        return null;
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
        if (body) body.innerHTML = templates.renderBody(this._buildContext());
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
        } else {
            this._refresh();
        }
        this._bindEvents();
        this._show(el);
        return el;
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
        this._bound = true;
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
        const menuItem = this.mMenu.findDialogById(itemId, sectionId)
        if (menuItem && this.hiddenStore) {
            const hiddenObjects = this.hiddenStore.get('hiddenMenuObjects', []);
            const idx = hiddenObjects.indexOf(itemId);
            if (hidden) {
                if (idx === -1) hiddenObjects.push(itemId);
                menuItem.isHidden = true;
            } else if (idx > -1) {
                hiddenObjects.splice(idx, 1);
                menuItem.isHidden = false;
            }
            this.hiddenStore.set('hiddenMenuObjects', hiddenObjects);
        }
        this._markDirty();
        this._refresh();
    }

    removeFromSection(sectionId, itemId) {
        const tab = this.mMenu && typeof this.mMenu._findTabById === 'function'
            ? this.mMenu._findTabById(sectionId)
            : null;
        if (tab && Array.isArray(tab.buttons)) {
            const idx = tab.buttons.findIndex((b) => b.id === itemId);
            if (idx > -1) tab.buttons.splice(idx, 1);
        }
        this._markDirty();
        this._refresh();
    }

    installToSection(sectionId, itemId) {
        const item = this._findItemById(itemId);
        if (item && this.mMenu && typeof this.mMenu.injectTabButton === 'function') {
            this.mMenu.injectTabButton(sectionId, item);
        }
        this._markDirty();
        this._refresh();
    }

    deleteCustomMenu(itemId, filePath) {
        for (const tab of this.getSections()) {
            if (Array.isArray(tab.buttons)) {
                tab.buttons = tab.buttons.filter((b) => b.id !== itemId);
            }
        }
        // Optional on-disk removal hook (off by default to preserve current
        // behaviour). Enable by uncommenting; mirrors oldMarketplace.deleteCustomDialog.
        // if (this.fs && filePath) {
        //     try { this.fs.unlinkSync(filePath); } catch (err) { console.error('deleteCustomMenu unlink failed', err); }
        // }
        this._markDirty();
        this._refresh();
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
}

module.exports = {MenuManager, MODAL_ID};
