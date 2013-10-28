define("assetManager", ["underscore", "utils", "urls"], function(_, Utils, Urls) {

    var AssetManager = function(options) {

        // Save the raw JSON internally
        this.theme      = options.theme;
        this.modelAssets= options.modelAssets;

    };

    _.extend(AssetManager.prototype, {

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
        getOfferWallsLinkAsset : function() {
            return Utils.getByKeychain(this.theme, ["offerWalls", "menuLinkImage"]);
        },

        setCategoryAsset : function(id, url) {
            this.modelAssets.categories[id] = url;
        },
        setItemAsset : function(id, url) {
            this._setItemAsset(id, url);
        },
        setUpgradeAsset : function(id, url) {
            this._setItemAsset(id, url);
        },
        setUpgradeBarAsset : function(id, url) {
            this._setItemAsset(id, url);
        },

        removeUpgradeAsset : function(id) {
            this._removeItemAsset(id);
        },
        removeUpgradeBarAsset : function(id) {
            this._removeItemAsset(id);
        },


        changeItemId : function(oldItemId, newItemId) {
            this.modelAssets.items[newItemId] = this.modelAssets.items[oldItemId];
            delete this.modelAssets.items[oldItemId];
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
        _setItemAsset : function(id, url) {
            this.modelAssets.items[id] = url;
        },
        _removeItemAsset : function(id) {
            delete this.modelAssets.items[id];
        }
    });

    return AssetManager;
});
