define("storefrontHelpers", ["template", "utils"], function(Template, Utils) {

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
        },

        getItem : function(itemId) {
            return this.goodsMap[itemId];
        },

        initializeStorefrontHelpers : function() {
            _.bindAll(this, "buildTemplate");
        },

        //
        // Wrapper functions
        //

        wrappers : {

            //
            // Assumes that `this` (store instance) has an `assets` object
            //
            toJSON : function(func) {

                //
                // Attain the model JSON first and start
                // extending it with assets and UI related attributes
                //
                var args = _.toArray(arguments).slice(1);
                var json = func.apply(this, args);


                // Deep clone the model assets and theme since they might be manipulated
                // by this function and we don't want to affect the original objects
                json.modelAssets = $.extend(true, {}, this.assets.modelAssets);
                json.theme = $.extend(true, {}, this.assets.theme);

                // Delete field that is injected just for SDK state emulation
                delete json.theme.hooks_providers;



                // Update model assets
                var modelAssetNames = this.assets.modelAssetNames;

                // Iterate over categories, items and hooks and replace their
                // assets with the proper asset names
                _.each(json.modelAssets, function(assets, map) {
                    _.each(json.modelAssets[map], function(name, itemId) {
                        json.modelAssets[map][itemId] = modelAssetNames[itemId];
                    });
                });

                // Update theme assets
                var themeAssetNames = this.assets.themeAssetNames;
                _.each(themeAssetNames, function(name, keychain) {
                    Utils.setByKeyChain(json.theme, keychain, name);
                });

                // Remove the injected base URL (only for loading assets in the dashboard)
                // Clone explanation: Backbone's implementation to toJSON() clones the model's attributes.  This is
                // a shallow clone.  See http://underscorejs.org/#clone
                // This is why cloning the template object first is necessary.  Manipulating it directly will
                // affect the original model which we don't want
                // TODO: Remove once the storefront loads its template files (.less, .handlbars, *Views.js) from S3 URLs
                json.template = _.clone(this.assets.template);
                delete json.template.baseUrl;

                // Add custom CSS if exists
                var customCss = this.getCustomCss();
                if (customCss) json.customCss = customCss;

                return json;
            }
        }
    }
});
