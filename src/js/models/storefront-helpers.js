define("storefrontHelpers", ["template"], function(Template) {

    //
    // `this` refers to an instance of the `Store` object
    // This module should be mixed into `Store.prototype`
    //
    return {

        // A function for injecting model and theme assets
        // externally after the object has been created
        injectAssets : function(modelAssetNames, themeAssetNames) {
            this.assets.modelAssetNames = modelAssetNames;
            this.assets.themeAssetNames = themeAssetNames;
        },
        buildTemplate : function(json) {
            this.template = new Template(json, this.options.template.orientation);
        }
    }
});
