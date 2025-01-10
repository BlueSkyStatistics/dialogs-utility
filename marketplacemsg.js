class marketplacemsg extends baseModal {
    static dialogId = 'marketplacemsg'
    static t = baseModal.makeT(marketplacemsg.dialogId)

    constructor() {
        var config = {
            id: marketplacemsg.dialogId,
            label: marketplacemsg.t('title'),
            modalType: "one"
        }
        var objects = {
            label1: { el: new labelVar(config, { label: `${marketplacemsg.t('label1')}`, h: 6 }) },
            label2: { el: new labelVar(config, { label: marketplacemsg.t('label2'), h: 6 }) }
        }
        const content = {
            items: [ objects.label1.el.content, objects.label2.el.content],
            nav: {
                name: marketplacemsg.t('navigation'),
                icon: "icon-shoppingcart_1",
                datasetRequired: false,
                modal: config.id
            }
        }
        super(config, objects, content);
    }
}

module.exports = {
    render: () => new marketplacemsg().render()
}
