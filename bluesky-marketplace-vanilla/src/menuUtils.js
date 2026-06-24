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
function collectCustomMenus(sections) {
    const customMap = new Map();

    for (const section of sections) {
        const allItems = flattenItems(section.buttons || []);
        for (const item of allItems) {
            if (item.isCustom) {
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

module.exports = {
    getItemIcon,
    getSectionName,
    getItemFilePath,
    flattenItems,
    collectCustomMenus,
};
