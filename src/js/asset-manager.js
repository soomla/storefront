define("assetManager", ["underscore", "utils", "urls"], function(_, Utils, Urls) {

    var AssetManager = function(options) {

        // Save the raw JSON internally
        this.theme      = options.theme;
        this.modelAssets= options.modelAssets;

    };

    _.extend(AssetManager.prototype, {
        getCategoryAsset : function(categoryId) {
            return Utils.getByKeychain(this.modelAssets, ["categories", categoryId]) || Urls.imagePlaceholder;
        },
        getItemAsset : function(itemId) {
            return this._getItemAsset(itemId) || Urls.imagePlaceholder;
        },
        getUpgradeAsset : function(itemId) {
            return this._getItemAsset(itemId) || Urls.imagePlaceholder;
        },
        getUpgradeBarAsset : function(itemId) {
            return this._getItemAsset(itemId) || Urls.progressBarPlaceholder;
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
        _getItemAsset : function(itemId) {
            return Utils.getByKeychain(this.modelAssets, ["items", itemId]);
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
