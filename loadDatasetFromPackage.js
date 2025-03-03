/**
  * This file is protected by copyright (c) 2023-2025 by BlueSky Statistics, LLC.
  * All rights reserved. The copy, modification, or distribution of this file is not
  * allowed without the prior written permission from BlueSky Statistics, LLC.
 */



// If we need to move dialog to specific position in nav we use positionInNav


class loadDatasetFromPackage extends baseModal {
    static dialogId = 'loadDatasetFromPackage'
    static t = baseModal.makeT(loadDatasetFromPackage.dialogId)

    constructor() {
        var config = {
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
                selectAPackage:"c('All_Installed_Packages',installed.packages()[,1])",
                selectADataset: "BSkyGetDatasetNameTitle ()",
            })
        }
        var objects = {
          
            
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
            label1: { el: new labelVar(config, { label: loadDatasetFromPackage.t('label1'), h: 6 }) },
            selectADataset: {
                el: new selectVar(config, {
                    no: 'selectADataset',
                    label: loadDatasetFromPackage.t('selectADataset'),
                    multiple: false,
                 //   required: true,
                    extraction: "NoPrefix|UseComma",
                    options: [],
                    default: "",
                   // onselect_r: {sel1: "c({{value}}, {{value}}, {{value}})"}
                })
            },
            label2: { el: new labelVar(config, { label: loadDatasetFromPackage.t('label2'), h: 6 }) },
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
        
        this.help = {
            title: loadDatasetFromPackage.t('help.title'),
            r_help: loadDatasetFromPackage.t('help.r_help'),  //r_help: "help(data,package='utils')",
            body: loadDatasetFromPackage.t('help.body')
        }
;
    }
}

module.exports = {
    render: () => new loadDatasetFromPackage().render()
}
