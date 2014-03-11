define("dimensionHelpers", ["economyModels"], function(EconomyModels) {

    //
    // `this` refers to an instance of the `Store` object
    // This module should be mixed into `Store.prototype`
    //
    return {
        getModelAssetDimensions : function(model) {
            if (model instanceof EconomyModels.VirtualGood) {

                if (model.is("upgradable")) {
                    return this.template.getVirtualGoodAssetDimensions("goodUpgrades");
                } else {
                    return this.template.getVirtualGoodAssetDimensions(model.get("type"));
                }

            } else if (model instanceof EconomyModels.Currency) {
                return this.template.getCurrencyAssetDimensions();
            } else if (model instanceof EconomyModels.CurrencyPack) {
                return this.template.getCurrencyPackAssetDimensions();
            } else {
                throw "Unknown model type";
            }
        },
        getCategoryAssetDimensions : function() {
            return this.template.getCategoryAssetDimensions();
        }
    }
});
