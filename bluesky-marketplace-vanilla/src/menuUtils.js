/**
 * Menu data helpers — framework-free port of the React component's menuUtils.
 * Pure functions operating on the menu `sections` array (same shape as
 * BlueSkyJS `mMenu.mainMenu`).
 */

/**
 * Get icon class for a menu item.
 */
function getItemIcon(item) {
    if (item.icon) return item.icon;
    if (item.resolvedDialog && item.resolvedDialog.nav && item.resolvedDialog.nav.icon) {
        return item.resolvedDialog.nav.icon;
    }
    return null;
}

/**
 * Get display name for a section.
 */
function getSectionName(section, t) {
    // User-created tabs carry their own label; built-in tabs are translated by id.
    if (section.label) return section.label;
    return t(section.id);
    // return section.name || section.tab || section.id || 'Unnamed Section';
}

/**
 * Get the file path of an item (used for custom menus).
 */
function getItemFilePath(item) {
    return item.path || (item.resolvedDialog && item.resolvedDialog._filePath) || null;
}

/**
 * Flatten all items from a section's buttons, including children of submenus.
 */
function flattenItems(buttons) {
    const result = [];
    for (const btn of buttons) {
        result.push(btn);
        if (btn.children && btn.children.length > 0) {
            result.push(...flattenItems(btn.children));
        }
    }
    return result;
}

/**
 * Collect all custom menus from all sections.
 * Returns an array of { item, sectionIds[] } objects.
 */
function collectMenus(sections) {
    console.log('TODO: collect menus from store!!');
    const customMap = new Map();

    for (const section of sections) {
        const allItems = flattenItems(section.buttons || []);
        for (const item of allItems) {
            // Button groups are containers, not dialogs
            if (item.isCustom && !item.children) {
                if (customMap.has(item.id)) {
                    customMap.get(item.id).sectionIds.push(section.id);
                } else {
                    customMap.set(item.id, {
                        item,
                        sectionIds: [section.id],
                    });
                }
            }
        }
    }

    return Array.from(customMap.values());
}

/**
 * Build an id `${prefix}-${slug(label)}` that is not in `takenIds`
 * (appends -2, -3, ... on collision).
 */
function makeUniqueId(prefix, label, takenIds) {
    const slug = String(label || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'item';
    const taken = new Set(takenIds);
    const base = `${prefix}-${slug}`;
    let id = base;
    for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
    return id;
}

/** The button group (a button with children) of `section` that holds `itemId`, if any. */
function findGroupOf(section, itemId) {
    return (section && section.buttons || []).find(
        (btn) => Array.isArray(btn.children) && btn.children.some((child) => child.id === itemId)
    );
}

/** Button groups created in the menu manager for a section. */
function getCustomGroups(section) {
    return (section && section.buttons || []).filter((btn) => btn.isCustom && Array.isArray(btn.children));
}

module.exports = {
    makeUniqueId,
    findGroupOf,
    getCustomGroups,
    getItemIcon,
    getSectionName,
    getItemFilePath,
    flattenItems,
    collectMenus,
};
