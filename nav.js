/**
  * This file is protected by copyright (c) 2023-2025 by BlueSky Statistics, LLC.
  * All rights reserved. The copy, modification, or distribution of this file is not
  * allowed without the prior written permission from BlueSky Statistics, LLC.
 */

const {getT} = require("../../../../localization");
let t = getT('menutoolbar')
const nav = () => ({
    "name": t('utility_File_Menu'),// {ns: 'menutoolbar'}),
    "tab": "file",
    "buttons": [
        "./loadDatasetFromPackage",
        "./marketplace",
        "./marketplacemsg"
    ]
})

module.exports = {
    nav: nav(),
    render: () => nav()
}

