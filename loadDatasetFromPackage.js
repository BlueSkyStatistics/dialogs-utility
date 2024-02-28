
var localization = {
    en: {
        title: "Load a Dataset from a R Package",
        navigation: "Load Dataset",
        label1: "If the R Package is not available, go to Tools> Package> Install R Package from CRAN to install it.",
        label2:"If you don't see a dataset in the dropdown, the package selected does not contain the dataset.",
        selectAPackage: "Select a R package from which to load a dataset",
        selectADataset: "Select a dataset to load in the grid",
        help: {
            title: "Load a Dataset from a R Package",
            r_help: "help(data,package='utils')",
            body: `
<b>Description</b></br>
Loads the selected dataset in the BlueSky Statistics data grid. Uses the function data that loads specified data sets or lists the available data sets.
<br/>
<b>Usage</b>
<br/>
<code> 
#Loads the dataset into memory<br/>
data(..., package = NULL, overwrite = TRUE)<br/>
#Loads the dataset into the BlueSky Statistics data grid<br/>
BSkyLoadRefresh("dataset name")<br/>
</code> <br/>
<b>Arguments</b><br/>
<ul>
<li>
...: literal character strings or names of the datasets to be loaded
</li>
<li>
package: a character vector giving the package(s) to look in for data sets, or NULL.
</li>
<li>
overwrite: logical: should existing objects of the same name in envir be replaced?
</li>
</ul>
<b>Details</b></br>
Loads the specified dataset into the data grid</br>
<b>Value</b><br/>
A data frame.<br/>
<b>Examples</b><br/>
<code> 
## A ridiculous example...
data(oil)
BSkyLoadRefresh("oil")
</code> <br/>
<b>Package</b></br>
utils</br>
<b>Help</b></br>
For detailed help click on the R icon on the top right hand side of this dialog overlay or run the following command help(data, package ='utils') by creating a R code chunk by clicking + in the output window           
`}
    }
}
// If we need to move dialog to specific position in nav we use positionInNav


class loadDatasetFromPackage extends baseModal {
    constructor() {
        var config = {
            id: "loadDatasetFromPackage",
            label: localization.en.title,
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
                    label: localization.en.selectAPackage,
                    multiple: false,
                    extraction: "NoPrefix|UseComma",
                    options: [],
                    default: "",
                    onselect_r: {selectADataset: "BSkyGetDatasetNameTitle(package = c('{{value}}'))"}
                    
                })
            },
            label1: { el: new labelVar(config, { label: localization.en.label1, h: 6 }) },
            selectADataset: {
                el: new selectVar(config, {
                    no: 'selectADataset',
                    label: localization.en.selectADataset,
                    multiple: false,
                 //   required: true,
                    extraction: "NoPrefix|UseComma",
                    options: [],
                    default: "",
                   // onselect_r: {sel1: "c({{value}}, {{value}}, {{value}})"}
                })
            },
            label2: { el: new labelVar(config, { label: localization.en.label2, h: 6 }) },
        }
        const content = {
            items: [objects.selectAPackage.el.content, objects.label1.el.content, objects.selectADataset.el.content, objects.label2.el.content],
            nav: {
                name: localization.en.navigation,
                icon: "icon-package_install",
                positionInNav: 1,
                onclick: `r_before_modal("${config.id}")`,
                modal_id: config.id
            }
        }
        super(config, objects, content);
        this.help = localization.en.help;
    }
}
module.exports.item = new loadDatasetFromPackage().render()