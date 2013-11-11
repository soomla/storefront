define("assetManager", ["underscore", "hooks", "utils", "urls"], function(_, Hooks, Utils, Urls) {


    // Arrays for testing model types
    var imageTypes      = ["image", "backgroundImage"],
        dragDropTypes   = imageTypes.concat("font");



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
        getThemeAsset : function(keychain, options) {
            (options) || (options = {});
            var defaultAsset = _.contains(dragDropTypes, options.type) ? Urls.imagePlaceholder : "";

            return Utils.getByKeychain(this.theme, keychain.split(".")) || defaultAsset;
        },
        getHookAsset : function(id, key) {
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
        getHookModelAssetName : function(id) {
            return this.getModelAssetName(id);
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
        setThemeAttribute : function(type, id, value) {

            // Default to empty strings and not `undefined`s
            Utils.setByKeyChain(this.theme, id.split("."), value || "");
        },
        setUpgradeAsset : function(id, url, name) {
            this._setItemAsset(id, url, name);
        },
        setUpgradeBarAsset : function(id, url, name) {
            this._setItemAsset(id, url, name);
        },
        setHookAsset : function(id, url, name) {

            // Ensure object
            (this.modelAssets.hooks) || (this.modelAssets.hooks = {});

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
        removeHookAsset : function(id) {
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
        }
    });


    //
    // A mixin of methods that will be exposed on the store model
    // Assumes the existence of `this.hooks`, `this.assets`, `this.template`
    //
    var AssetsMixin = {
        getImagesPath : function() {
            return "img";
        },
        getAssetPath : function(type) {
            return (type === "font") ? "fonts" : "img";
        },
        getModelAssetName : function(itemId) {
            return this.assets.getModelAssetName(itemId);
        },
        getThemeAssetName : function(itemId) {
            return this.assets.getThemeAssetName(itemId);
        },
        getHookModelAssetName : function(itemId) {
            return this.assets.getHookModelAssetName(itemId);
        },
        getOffersMenuLinkAssetName : function() {
            return this.assets.getOffersMenuLinkAssetName();
        },
        setThemeAsset : function(assetId, options) {
            (options) || (options = {});
            this.assets.setThemeAsset(assetId, options.url, options.name)
        },
        setThemeTextAttribute : function(id, value) {

            // Default to empty strings and not `undefined`s
            this.assets.setThemeAttribute("text", id, value);
        },
        setThemeCssAttribute : function(id, value) {

            // Default to empty strings and not `undefined`s
            this.assets.setThemeAttribute("css", id, value);
        },
        isBranded : function() {
            return !!this.assets.template.noBranding;
        },
        setCategoryAsset : function(category, options) {
            (options) || (options = {});

            // First assign category asset, so that when the item view
            // in the store renders, it will have it accessible as a template helper
            this.assets.setCategoryAsset(category.id, options.url, options.name);

            // Force the preview to update by triggering a change event on the model
            category.trigger("change:asset");
        },
        setItemAsset : function(model, options) {
            (options) || (options = {});
            var id = model.id;

            // Check for overrides of item ID, for example,
            // in case of multiple images like in Upgrades
            if (options) {
                if (options.upgradeImage) {
                    id = model.getUpgradeImageAssetId();
                } else if (options.upgradeBar) {
                    id = model.getUpgradeBarAssetId();
                } else if (options.upgradeBarInitial) {
                    id = model.getEmptyUpgradeBarAssetId();
                }
            }

            // Update asset map
            this.assets.setItemAsset(id, options.url, options.name);

            // Force the preview to update by triggering a change event on the model
            model.trigger("change:asset");
        },
        setHookAsset : function(hook, options) {
            (options) || (options = {});
            this.assets.setHookAsset(hook.id, options.url, options.name);

            // Force the preview to update by triggering a change event on the model
            hook.trigger("change:asset");
        },
        setOffersMenuLinkAsset : function(options) {
            (options) || (options = {});
            this.assets.setOffersMenuLinkAsset(options.url, options.name);
        }
    };

    return {
        AssetManager : AssetManager,
        AssetsMixin  : AssetsMixin
    };
});
