

class tocModal {
    htmlTemplate = `<div class="modal left modal-toc fade" id="{{modal.id}}" tabindex="-1" role="dialog" 
data-backdrop="false" data-keyboard="false"
aria-labelledby="{{modal.id}}Label"
aria-hidden="true">
<div class="modal-dialog modal-sm marketplace" role="document">
    <div class="modal-content" id="{{modal.id}}modelcontentdiv">
        <div class="modal-header pr-1 pl-3">
            <div class="row w-100">
                <div class="col-7">
                    <h5 class="modal-title" id="{{modal.id}}Label">{{modal.label}}</h5>
                </div>
                <div class="col-5 float-right pt-2">
                    <button type="button" data-dismiss="modal" class="close enable-tooltip"
                    data-toggle="tooltip" title="Close dialog">
                        <i class="fas fa-times"></i>
                    </button>               
                    <button type="button" action="help" class="close btn-tooltip mr-0 enable-tooltip" id="{{modal.id}}Help"
                    data-toggle="tooltip" title="Help on dialog">
                        <i class="fas fa-question"></i>
                    </button>
                </div>
            </div>
        </div>
        <div class="modal-body" data-actions-box="true">
            <div class="d-flex flex-nowrap">
                <div class="nav flex-column nav-pills" id="toc-pils" role="tablist" aria-orientation="vertical">
                    {{each(options.elements)}}
                        {{@this | safe}}
                    {{/each}} 
                </div>
            </div>
        </div>
    </div>
</div>
</div>
`
        id = "toc";
    label = "Table of contents";
    content;
    chapter_template = `<a class="nav-link" href="#{{elementid}}" aria-selected="false">{{toc_item_name}}</a>`
    help = {
        title: "Table of contents Help",
        r_help: "",
        body: ``
    }

    renderContent() {
        if ($("#toggleTocControl").length == 0) {
            $("#outputTabControls").append(`<li class="nav-item">
                <a class="nav-link btn btn-secondary btn-top-menu mb-0" id="toggleTocControl" href="javascript:void(0)" role="tab" onclick='togleModal("#toc",  false )'>
                    <i class="fas fa-list"></i></a>
            </li>`)
        }
        return Sqrl.Render(this.htmlTemplate, {modal: {id: this.id, label: this.label}, elements: []})
    }

    onShow() {
        $(`#${this.id}modelcontentdiv`).css("width", "330px");
        var items = []
        var itemsElements = $(`#output_div_${getActiveTab()} h2`)
        for (var i=0; i<itemsElements.length; i++) {
            var name = $(itemsElements[i]).text()
            var itemId = $(itemsElements[i]).closest(".container").parent().attr('id')
            items.push(Sqrl.Render(this.chapter_template, {
                "toc_item_name": name,
                "elementid": itemId
            }))
        }
        $("#toc-pils").html(items.join(""))
    }

    onHide() {
        $("#toc-pils").children().remove()
    }

    compile(onShow, onHide, onSubmit, onSyntax, help, onSave) {
        return {
            modal: this.renderContent(),
            id: this.id,
            onshow: this.onShow.bind(this),
            onhide: this.onHide.bind(this),
            onsubmit: null,
            // onsyntax: null,
            onhelp:  this,help,
            onsave: null,
            nav: {
                name: "Table of Contents",
                icon: "fas fa-list",
                datasetRequired: false,
                modal: this.id
            },
            template: this.htmlTemplate
        }
    }

}

module.exports.item = new tocModal().compile();