define("template", ["underscore", "utils"], function(_, Utils) {

    var normalize = function(dimensions) {
        return {
            width   : dimensions.w,
            height  : dimensions.h
        };
    };

    var Template = function(json) {

        // Save the raw JSON internally
        this._json = json;
    };

    // Define getters
    Template.prototype.__defineGetter__("json", function() { return this._json; });
    Template.prototype.__defineGetter__("sections", function() { return this._json.sections; });
    Template.prototype.__defineGetter__("supportedFeatures", function() { return this.json.supportedFeatures; });

    _.extend(Template.prototype, {
        getTemplateImageDimensions : function(keychain) {
            try {
                var res = Utils.getByKeychain(this.json.assetMetadata.template, keychain);
                return normalize(res);
            } catch (e) {
                return undefined;
            }
        },
        getVirtualGoodAssetDimensions : function(type) {

            var dimensions = this.json.assetMetadata.economy.goods[type];

            // Upgradable goods have two dimensions
            if (type === "goodUpgrades") return {
                upgradeImage : normalize(dimensions.upgradeImage),
                upgradeBar   : normalize(dimensions.upgradeBar)
            };

            return normalize(dimensions);
        },
        getCurrencyAssetDimensions : function() {
            return normalize(this.json.assetMetadata.economy.currencies);
        },
        getCurrencyPackAssetDimensions : function() {
            return normalize(this.json.assetMetadata.economy.currencyPacks);
        },
        getCategoryAssetDimensions : function() {
            return normalize(this.json.assetMetadata.economy.categories);
        },
        supportsHooks : function() {

            // Checks both that `hooks` is defined,
            // and that there's at least one hook defined
            return !_.isEmpty(this.supportedFeatures.hooks);
        },
        supportsHook : function(provider) {
            var hooks = this.supportedFeatures.hooks;
            return (hooks && hooks[provider] === true);
        },
        getSupportedGoods : function() {
            return this.supportedFeatures.goods;
        },
        getSupportedPurchaseTypes : function() {
            return this.supportedFeatures.purchaseTypes;
        },
        supportsCategoryImages : function() {
            return !_.isUndefined(this.supportedFeatures.categoryImages);
        }
    });


    return Template;
});
