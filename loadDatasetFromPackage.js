class loadDatasetFromPackage extends baseModal {
    static dialogId = 'loadDatasetFromPackage'
    static t = baseModal.makeT(loadDatasetFromPackage.dialogId)

    constructor() {
        const config = {
            id: loadDatasetFromPackage.dialogId,
            label: loadDatasetFromPackage.t('title'),
            splitProcessing: false,
            modalType: "one",
            RCode: `
                 require(utils)
                 BSkyLoadRpkgDataset(datasetname =BSkyGetDatasetNameFromPackageDatasetList("{{selected.selectADataset | safe}}"), 
                     \t datasetobj =BSkyGetDatasetNameFromPackageDatasetList("{{selected.selectADataset | safe}}"), \n\tRPkgName=BSkyGetPackageNameFromPackageDatasetList("{{selected.selectADataset | safe}}"))
 
                 BSkyLoadRefresh(BSkyGetDatasetNameFromPackageDatasetList("{{selected.selectADataset | safe}}"))
             `,
            pre_start_r: JSON.stringify({
                selectAPackage: "c('All_Installed_Packages',installed.packages()[,1])",
                selectADataset: "BSkyGetDatasetNameTitle ()",
            })
        }
        const objects = {
            selectAPackage: {
                el: new selectVar(config, {
                    no: 'selectAPackage',
                    label: loadDatasetFromPackage.t('selectAPackage'),
                    multiple: false,
                    extraction: "NoPrefix|UseComma",
                    options: [],
                    default: "",
                    onselect_r: {selectADataset: "BSkyGetDatasetNameTitle(package = c('{{value}}'))"}
                })
            },
            label1: {el: new labelVar(config, {label: loadDatasetFromPackage.t('label1'), h: 6})},
            selectADataset: {
                el: new selectVar(config, {
                    no: 'selectADataset',
                    label: loadDatasetFromPackage.t('selectADataset'),
                    multiple: false,
                    extraction: "NoPrefix|UseComma",
                    options: [],
                    default: "",
                })
            },
            label2: {el: new labelVar(config, {label: loadDatasetFromPackage.t('label2'), h: 6})},
        }
        const content = {
            items: [objects.selectAPackage.el.content, objects.label1.el.content, objects.selectADataset.el.content, objects.label2.el.content],
            nav: {
                name: loadDatasetFromPackage.t('navigation'),
                icon: "icon-package_install",
                positionInNav: 1,
                onclick: `r_before_modal("${config.id}")`,
                modal_id: config.id
            }
        }
        super(config, objects, content);
        const r_help = "help(data,package='utils')"
        this.help = {
            title: loadDatasetFromPackage.t('help.title'),
            r_help: r_help,
            body: `
<b>${loadDatasetFromPackage.t('help.body.descriptionTitle')}</b>
<br/>
${loadDatasetFromPackage.t('help.body.descriptionText')}
<br/>
<b>${loadDatasetFromPackage.t('help.body.usageTitle')}</b>
<br/>
<code>
    #${loadDatasetFromPackage.t('help.body.usageCode1')}
    <br/>
    ${loadDatasetFromPackage.t('help.body.usageCode2')}
    <br/>
    #${loadDatasetFromPackage.t('help.body.usageCode3')}
    <br/>
    ${loadDatasetFromPackage.t('help.body.usageCode4')}
    <br/>
</code>
<br/>
<b>${loadDatasetFromPackage.t('help.body.argumentsTitle')}</b>
<br/>
<ul>
    <li>${loadDatasetFromPackage.t('help.body.argumentsList.0')}</li>
    <li>${loadDatasetFromPackage.t('help.body.argumentsList.1')}</li>
    <li>${loadDatasetFromPackage.t('help.body.argumentsList.2')}</li>
</ul>
<b>${loadDatasetFromPackage.t('help.body.detailsTitle')}</b>
<br/>
${loadDatasetFromPackage.t('help.body.detailsText')}
<br/>
<b>${loadDatasetFromPackage.t('help.body.valueTitle')}</b>
<br/>
${loadDatasetFromPackage.t('help.body.valueText')}
<br/>
<b>${loadDatasetFromPackage.t('help.body.examplesTitle')}</b>
<br/>
<code>
    ${loadDatasetFromPackage.t('help.body.exampleCode')}
</code>
<br/>
<b>${loadDatasetFromPackage.t('help.body.packageTitle')}</b>
<br/>
${loadDatasetFromPackage.t('help.body.packageText')}
<br/>
<b>${loadDatasetFromPackage.t('help.body.helpTitle')}</b>
<br/>
${loadDatasetFromPackage.t('help.body.helpText', {r_help: r_help})}
`
        }
    }
}


module.exports = {render: () => new loadDatasetFromPackage().render()}