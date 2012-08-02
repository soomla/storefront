define(["native-api", "models", "storeViews"], function(NativeAPI, Models, StoreViews) {

    $(function() {

        window.SoomlaJS = _.extend({}, NativeAPI, {
            newStore : function(json) {
                var attributes = {};
                if (json) {

                    if (json.background) attributes.background = json.background;
                    if (json.template) {
                        if (json.template.name)
                            attributes.templateName = json.template.name;
                        if (json.template.elements) {

                            if (json.template.elements.buyMore && json.template.elements.buyMore.text)
                                attributes.moreCurrencyText = json.template.elements.buyMore.text;

                            if (json.template.elements.title && json.template.elements.title.name)
                                attributes.templateTitle = json.template.elements.title.name;
                        }
                    }
                    if (json.virtualGoods)
                        attributes.virtualGoods = json.virtualGoods;

                    if (json.currency)
                        attributes.currency = json.currency;
                }

                this.store = new Models.Store(attributes);
            },
            // The native UI is loaded and the html needs to be rendered now
            initialize : function(json) {
                this.newStore(json);
                new StoreViews.StoreView({ model : this.store }).render();
                return this.store;
            }
        });

    });
});