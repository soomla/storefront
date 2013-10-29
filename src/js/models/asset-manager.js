define("assetManager", ["underscore", "utils", "urls"], function(_, Utils, Urls) {


    var AssetManager = (function() {

        // Private members
        var _modelAssetNames, _themeAssetNames;

        var AssetManager = function(options) {

            // Save the raw JSON internally
            this.theme      = options.theme;
            this.modelAssets= options.modelAssets;
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
        getOfferWallsLinkAsset : function() {
            return Utils.getByKeychain(this.theme, ["offerWalls", "menuLinkImage"]);
        },
        getModelAssetName : function(itemId) {
            return this.modelAssetNames[itemId];
        },


        //
        // Setter functions
        //

        setCategoryAsset : function(id, url, name) {
            this.modelAssets.categories[id] = url || "";
            this.modelAssetNames[id] = name || "";
        },
        setItemAsset : function(id, url, name) {
            this._setItemAsset(id, url, name);
        },
        setUpgradeAsset : function(id, url, name) {
            this._setItemAsset(id, url, name);
        },
        setUpgradeBarAsset : function(id, url, name) {
            this._setItemAsset(id, url, name);
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
        },
        removeUpgradeAssets : function(upgradeImageAssetId, upgradeBarAssetId) {
            return this._removeItemAsset(upgradeImageAssetId)._removeItemAsset(upgradeBarAssetId);
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
        _removeItemAsset : function(id) {
            delete this.modelAssets.items[id];
            delete this.modelAssetNames[id];
            return this;
        }
    });

    var AssetsMixin = {
        getImagesPath : function() {
            return "img";
        },
        getAssetPath : function(type) {
            return (type === "font") ? "fonts" : "img";
        }
    };

    return {
        AssetManager : AssetManager,
        AssetsMixin  : AssetsMixin
    };
});
