/**
 * HTML template renderers — framework-free equivalents of the React
 * MenuManager components. Each function returns an HTML string.
 *
 * Markup follows the conventions proven in the BlueSky app (Bootstrap 4
 * jQuery modal mechanics + FontAwesome 5), so the dialog shows/hides through
 * the same `$(el).modal()` plugin the rest of menu.js relies on. Interactions
 * are wired with `data-action` / `data-*` attributes via a single delegated
 * handler in the controller (no inline onclick).
 *
 * The render context (`ctx`) is:
 *   { sections, hiddenSet, activeSectionId, openSubmenuIds, customMenus, t }
 */

const {
    getItemIcon,
    getSectionName,
    getItemFilePath,
} = require('./menuUtils');

const MODAL_ID = 'menuManager';
const BODY_ID = 'menuManagerBody';

/** Escape text/attribute values for safe interpolation into HTML. */
function esc(value) {
    return String(value === undefined || value === null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Equivalent of SectionList.jsx */
function renderSectionList(ctx) {
    const {sections, activeSectionId, t} = ctx;
    return `<div class="list-group">
        ${sections.map((section) => `
            <button type="button"
                class="list-group-item list-group-item-action ${section.id === activeSectionId ? 'active' : ''}"
                style="color: var(--bs-light);"
                data-action="select-section" data-section-id="${esc(section.id)}">
                ${esc(getSectionName(section, t))}
            </button>`).join('')}
    </div>`;
}

/** Equivalent of MenuItemCard.jsx */
function renderMenuItemCard(item, sectionId, ctx) {
    const icon = getItemIcon(item);
    const hidden = item.isHidden
    // const label = ctx.t(item.id);
    const label = ctx.mMenu._getButtonLabel(item)
    return `<div class="card mb-2 ${hidden ? 'border-secondary' : ''}" style="${hidden ? 'opacity:0.5;' : ''}">
        <div class="card-body d-flex align-items-center py-2 px-3">
            ${icon ? `<i class="${esc(icon)} mr-2"></i>` : ''}
            <span class="flex-grow-1 text-truncate">${esc(label)}</span>
            <button type="button"
                class="btn btn-sm ${hidden ? 'btn-outline-success' : 'btn-outline-warning'} ml-2"
                title="${hidden ? 'Show' : 'Hide'}"
                data-action="toggle-visibility" data-item-id="${esc(item.id)}" data-hidden="${hidden ? 'true' : 'false'}">
                <i class="fas ${hidden ? 'fa-eye' : 'fa-eye-slash'}"></i>
            </button>
            ${item.isCustom ? `<button type="button" class="btn btn-sm btn-outline-danger ml-2"
                title="Remove from section"
                data-action="remove-from-section" data-section-id="${esc(sectionId)}" data-item-id="${esc(item.id)}">
                <i class="fas fa-times"></i>
            </button>` : ''}
        </div>
    </div>`;
}

/** Equivalent of the SubmenuGroup helper inside SectionItems.jsx */
function renderSubmenuGroup(item, sectionId, ctx) {
    const open = ctx.openSubmenuIds.has(item.id);
    const label = ctx.t(item.id);
    const children = item.children || [];
    return `<div class="card mb-2">
        <div class="card-header d-flex align-items-center py-2 px-3" role="button" style="cursor:pointer;"
            data-action="toggle-submenu" data-item-id="${esc(item.id)}">
            <i class="fas fa-chevron-${open ? 'down' : 'right'} mr-2"></i>
            ${item.icon ? `<i class="${esc(item.icon)} mr-2"></i>` : ''}
            <span class="font-weight-bold fw-semibold">${esc(label)}</span>
            <span class="badge badge-secondary bg-secondary ml-auto">${children.length}</span>
        </div>
        ${open ? `<div class="card-body py-2 px-3">
            ${children.map((child) => renderMenuItemCard(child, sectionId, ctx)).join('')}
        </div>` : ''}
    </div>`;
}

/** Equivalent of SectionItems.jsx */
function renderSectionItems(section, ctx) {
    if (!section) {
        return '<p class="text-muted">Select a section to view its items.</p>';
    }
    const buttons = section.buttons || [];
    return `<div>${buttons.map((item) => (
        item.children
            ? renderSubmenuGroup(item, section.id, ctx)
            : renderMenuItemCard(item, section.id, ctx)
    )).join('')}</div>`;
}


function renderCustomMenuCard(item, ctx) {
    const {sections, t} = ctx;

    const icon = getItemIcon(item);
    const label = ctx.mMenu._getButtonLabel(item) || item._baseName
    // const filePath = getItemFilePath(item);
    // const availableSections = sections.filter((s) => !sectionIds.includes(s.id));

    const installedPills = item.sectionIds.length > 0 ? `<div class="mb-2">
            ${item.sectionIds.map((sid) => {
            const section = sections.find((s) => s.id === sid);
            return `<span class="badge badge-info bg-info text-dark mr-1">
                    ${esc(section ? getSectionName(section, t) : sid)}
                    <button type="button" class="btn btn-sm p-0 ml-1" aria-label="Remove"
                        style="font-size:0.7rem; line-height:1; vertical-align:baseline;"
                        data-action="remove-from-section" data-section-id="${esc(sid)}" data-item-id="${esc(item.id)}">&times;</button>
                </span>`;
        }).join('')}
        </div>` : ''

    const installControls = `<div class="d-flex align-items-center">
            <select class="form-control form-control-sm form-select form-select-sm mr-2"
                style="color: var(--dark-gray) !important;"
                data-role="install-select" data-item-id="${esc(item.id)}">
                <option value="">Install to section…</option>
                ${sections.filter(s => !item.sectionIds.includes(s.id)).map((s) => `<option value="${esc(s.id)}">${esc(getSectionName(s, t))}</option>`).join('')}
            </select>
            <button type="button" class="btn btn-sm btn-primary"
                data-action="install-to-section" data-item-id="${esc(item.id)}">
                <i class="fas fa-plus"></i>
            </button>
        </div>`

    return `<div class="card mb-2">
        <div class="card-body py-2 px-3">
            <div class="d-flex align-items-center mb-2">
                ${icon ? `<i class="${esc(icon)} mr-2"></i>` : ''}
                <span class="font-weight-bold fw-semibold flex-grow-1 text-truncate">${esc(label)}</span>
                ${item.error ? `<i class="fas fa-exclamation-triangle text-warning mr-1 mb-1" role="button" tabindex="0"
                    data-toggle="tooltip" data-placement="top" data-trigger="focus" title="${esc(item.error?.stack)}">
                    <span class="sr-only">${esc(item.error?.stack)}</span>
                </i>` : ''}
                <button type="button" class="btn btn-sm ml-2" title="Reload dialog" 
                    data-toggle="tooltip" data-placement="top"
                    data-action="reload-custom-menu" data-item-id="${esc(item.id)}" data-file-path="${esc(item.path || '')}">
                    <i class="fas fa-sync"></i>
                </button>
                <button type="button" class="btn btn-sm btn-danger ml-2" title="Delete custom menu"
                    data-toggle="tooltip" data-placement="top"
                    data-action="delete-custom-menu" data-item-id="${esc(item.id)}" data-file-path="${esc(item.path || '')}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            ${installedPills}
            ${installControls}
        </div>
    </div>`;
}

/** Equivalent of CustomMenusPanel.jsx */
function renderCustomMenusPanel(ctx) {
    const {mMenu, manager, customMenus} = ctx;
    const mPlaceDir = mMenu.mPlaceDir

    // if (!customMenus || customMenus.length === 0) {
    // const customDialogs = manager.getCustomDialogs()
        return `
        <div id="menuManagerCustomMenusPanel">
            ${customMenus.length === 0 ? '<p class="text-muted">No custom menus found.</p>' : ''}
            <label class="form-label">Add path to Marketplace Dialogs</label>
            <div>
                <span>${mPlaceDir}</span>
                <button type="button" class="btn btn-upload" onclick="menuManager.setCustomDialogsFolder()">Select Folder</button>
                ${mPlaceDir ? `<button type="button" class="btn btn-secondary" onclick="menuManager.handleRefreshClick()">Refresh</button>` : ''}
                ${mPlaceDir ? `<button type="button" class="btn btn-secondary" onclick="mMenu.openUserDialogsFolder()">Open Folder</button>` : ''}
            </div>
            <div>
                ${customMenus.map(
                    (i) => renderCustomMenuCard(i, ctx)
                ).join('')}
            </div>
        </div>
        `;
    // }
    // return `<div>${customMenus.map(({item, sectionIds}) => renderCustomMenuCard(item, sectionIds, ctx)).join('')}</div>`;
}





/** Inner body — equivalent of the body of MenuManagerModal.jsx. */
function renderBody(ctx) {
    const {sections, activeSectionId} = ctx;
    const activeSection = sections.find((s) => s.id === activeSectionId) || null;
    const itemsHeading = activeSection
        ? `Items — ${esc(activeSection.name || activeSection.id)}`
        : 'Items';

    return `
        <div class="row">
            <div class="col-4">
                <h6 class="mb-2">Sections</h6>
                ${renderSectionList(ctx)}
            </div>
            <div class="col-8">
                <h6 class="mb-2">${itemsHeading}</h6>
                <div style="overflow-y:auto;">
                    ${renderSectionItems(activeSection, ctx)}
                </div>
            </div>
        </div>
        <hr/>
        <h6 class="mb-2">Custom Menus</h6>
        <div style="overflow-y:auto;">
            ${renderCustomMenusPanel(ctx)}
        </div>
        `;
}

/** Outer modal shell — equivalent of the modal wrapper of MenuManagerModal.jsx. */
function renderModalShell(ctx) {
    return `
    <div class="modal fade" id="${MODAL_ID}" tabindex="-1" role="dialog"
        aria-labelledby="${MODAL_ID}Label" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-scrollable" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="${MODAL_ID}Label">Menu Manager</h5>
<!--                    <button type="button" class="close" data-dismiss="modal" data-bs-dismiss="modal" aria-label="Close">-->
<!--                        <span aria-hidden="true"><i class="fas fa-times"></i></span>-->
<!--                    </button>-->
                </div>
                <div class="modal-body" id="${BODY_ID}">
                    ${renderBody(ctx)}
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    </div>`;
}

module.exports = {
    MODAL_ID,
    BODY_ID,
    esc,
    renderSectionList,
    renderMenuItemCard,
    renderSubmenuGroup,
    renderSectionItems,
    renderCustomMenuCard,
    renderCustomMenusPanel,
    renderBody,
    renderModalShell,
};
