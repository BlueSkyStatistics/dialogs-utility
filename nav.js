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

