/**
  * This file is protected by copyright (c) 2023-2025 by BlueSky Statistics, LLC.
  * All rights reserved. The copy, modification, or distribution of this file is not
  * allowed without the prior written permission from BlueSky Statistics, LLC.
 */

const nav = {
    "id": "menu-file",
    "buttons": [
        "./loadDatasetFromPackage",
        {
            "id": "menuManager",
            "icon": "fas fa-bars",
            "path": "./bluesky-marketplace-vanilla/index.js",
            "onclick": "global.openMenuManager()"
        }
    ]
}

module.exports.nav = nav

