define("assetManager", ["underscore", "utils", "urls", "constants"], function(_, Utils, Urls, Constants) {

    //
    // Constants
    //
    var SPONSORPAY = Constants.SPONSORPAY;


    // TODO: Save local references of imagePlaceholder
    // TODO: Create set,get,update,remove methods for each type of entity \ theme asset

    var AssetManager = (function() {

        // Private members
        var _modelAssetNames, _themeAssetNames;

        var AssetManager = function(options) {

            // Save the raw JSON internally
            _.extend(this, _.pick(options, "template", "theme", "modelAssets"));
        };

        // Define getters
        Object.defineProperties(AssetManager.prototype, {
            modelAssetNames : {
                get : function()    { return _modelAssetNames; },
                set : function(val) { _modelAssetNames = val; }
            },
            themeAssetNames : {
                get : function()    { return _themeAssetNames; },
                set : function(val) { _themeAssetNames = val; }
            }
        });

        return AssetManager;
    })();

    _.extend(AssetManager.prototype, {

        //
        // Getter functions
        //

        // `key` is an optional argument.  In case the category has multiple assets
        // fetch the asset according to the given key.
        getCategoryAsset : function(categoryId, key) {
            return this._getAsset("categories", categoryId, key) || Urls.imagePlaceholder;
        },

        // `key` is an optional argument.  In case the item has multiple assets
        // fetch the asset according to the given key.
        getItemAsset : function(itemId, key) {
            return this._getItemAsset(itemId, key) || Urls.imagePlaceholder;
        },
        getUpgradeAsset : function(itemId) {
            return this._getItemAsset(itemId) || Urls.imagePlaceholder;
        },
        getUpgradeBarAsset : function(itemId) {
            return this._getItemAsset(itemId) || Urls.progressBarPlaceholder;
        },
        getThemeAsset : function(keychain) {
            return Utils.getByKeychain(this.theme, keychain) || Urls.imagePlaceholder;
        },
        getHookAsset : function(provider, options, key) {

            (options) || (options = {});

            var id;
            if (provider === SPONSORPAY) id = "__" + provider + "__" + options.itemId;

            return this._getAsset("hooks", id, key) || Urls.imagePlaceholder;
        },
        getOffersMenuLinkAsset : function() {
            return Utils.getByKeychain(this.theme, ["hooks", "common", "offersMenuLinkImage"]) || Urls.imagePlaceholder;
        },
        getModelAssetName : function(itemId) {
            return this.modelAssetNames[itemId];
        },
        getThemeAssetName : function(itemId) {
            return this.themeAssetNames[itemId];
        },
        getOffersMenuLinkAssetName : function() {
            var offersMenuLinkImageKeychain = "hooks.common.offersMenuLinkImage";
            return this.modelAssetNames[offersMenuLinkImageKeychain];
        },


        //
        // Setter functions
        //

        setCategoryAsset : function(id, url, name) {

            // Ensure object
            (this.modelAssets.categories) || (this.modelAssets.categories = {});

            // assign URL and name
            this.modelAssets.categories[id] = url || "";
            this.modelAssetNames[id] = name || "";
        },
        setItemAsset : function(id, url, name) {
            this._setItemAsset(id, url, name);
        },
        setThemeAsset : function(id, url, name) {

            // TODO: Use Backbone Deep \ nested model that will trigger events when changing the theme object.
            // TODO: Check order of events being triggered and when to re-render views using the asset

            this._setThemeAsset(id, url, name);
        },
        setUpgradeAsset : function(id, url, name) {
            this._setItemAsset(id, url, name);
        },
        setUpgradeBarAsset : function(id, url, name) {
            this._setItemAsset(id, url, name);
        },
        setHookAsset : function(provider, options, url, name) {

            // Enforce SponsorPay requirements
            this._enforceSponsorpay(provider, options);

            // Ensure object
            (this.modelAssets.hooks) || (this.modelAssets.hooks = {});

            var id;
            if (provider === SPONSORPAY) id = "__" + provider + "__" + options.itemId;

            // assign URL and name
            this.modelAssets.hooks[id] = url || "";
            this.modelAssetNames[id] = name || "";
        },
        setOffersMenuLinkAsset : function(url, name) {
            var offersMenuLinkImageKeychain = "hooks.common.offersMenuLinkImage";
            this._setThemeAsset(offersMenuLinkImageKeychain, url, name);
        },


        //
        // Removal functions
        //

        removeItemAsset : function(id) {
            return this._removeItemAsset(id);
        },
        removeCategoryAsset : function(id) {
            delete this.modelAssets.categories[id];
            delete this.modelAssetNames[id];
            if (_.isEmpty(this.modelAssets.categories)) delete this.modelAssets.categories;
        },
        removeUpgradeAssets : function(upgradeImageAssetId, upgradeBarAssetId) {
            return this._removeItemAsset(upgradeImageAssetId)._removeItemAsset(upgradeBarAssetId);
        },
        removeHookAsset : function(provider, options) {

            // Enforce SponsorPay requirements
            this._enforceSponsorpay(provider, options);

            var id;
            if (provider === SPONSORPAY) id = "__" + provider + "__" + options.itemId;

            delete this.modelAssets.hooks[id];
            delete this.modelAssetNames[id];
            if (_.isEmpty(this.modelAssets.hooks)) delete this.modelAssets.hooks;
        },


        //
        // Update functions
        //

        updateModelAssetName : function(oldItemId, newItemId) {
            this.modelAssetNames[newItemId] = this.modelAssetNames[oldItemId];
            delete this.modelAssetNames[oldItemId];
        },
        updateItemId : function(oldItemId, newItemId) {
            this.modelAssets.items[newItemId] = this.modelAssets.items[oldItemId];
            delete this.modelAssets.items[oldItemId];
        },
        updateCategoryId : function(oldItemId, newItemId) {
            this.modelAssets.categories[newItemId] = this.modelAssets.categories[oldItemId];
            delete this.modelAssets.categories[oldItemId];
        },


        //
        // Private methods
        //
        _getItemAsset : function(itemId, key) {
            return this._getAsset("items", itemId, key);
        },
        _getAsset : function(section, itemId, key) {
            var asset = Utils.getByKeychain(this.modelAssets, [section, itemId]);

            // If the asset is an object (i.e. isn't a plain string)
            // return either the asset with the provided key, or the default asset
            if (_.isObject(asset)) return key ? asset[key] : asset.default;

            // Otherwise, the asset is a plain string, return it
            return asset;
        },
        _setItemAsset : function(id, url, name) {

            // Default to empty strings and not `undefined`s
            this.modelAssets.items[id] = url || "";
            this.modelAssetNames[id] = name || "";
        },
        _setThemeAsset : function(id, url, name) {

            // Default to empty strings and not `undefined`s
            Utils.setByKeyChain(this.theme, id.split("."), url || "");
            this.themeAssetNames[id] = name || "";
        },
        _removeItemAsset : function(id) {
            delete this.modelAssets.items[id];
            delete this.modelAssetNames[id];
            return this;
        },
        _enforceSponsorpay : function(provider, options) {

            // Enforce SponsorPay requirements
            if (provider === SPONSORPAY && (_.isEmpty(options) || _.isUndefined(options.itemId))) throw new Error("SponsorPay Hook: item ID must be supplied");
        }
    });

    var AssetsMixin = {
        getImagesPath : function() {
            return "img";
        },
        getAssetPath : function(type) {
            return (type === "font") ? "fonts" : "img";
        },
        isBranded : function() {
            return !!this.assets.template.noBranding;
        }
    };

    return {
        AssetManager : AssetManager,
        AssetsMixin  : AssetsMixin
    };
});
