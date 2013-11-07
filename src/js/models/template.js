define("template", ["underscore", "backbone", "utils"], function(_, Backbone, Utils) {

    var normalize = function(dimensions) {
        return {
            width   : dimensions.w,
            height  : dimensions.h
        };
    };

    // Define Backbone Entities for template attribute objects
    var Attribute = Backbone.Model.extend({
        getType : function() {
            return this.get("type");
        },
        getSelector : function() {
            return this.get("selector");
        },
        getKeychain : function() {
            return this.id.split(".");
        },
        isType : function(type) {
            return type === this.getType();
        }
    });

    var FontAttribute = Attribute.extend({
        getClass : function() {
            return this.get("class");
        }
    });

    var AttributeCollection = Backbone.Collection.extend({
        model : function(attrs, options) {
            if (attrs.type === "font") return new FontAttribute(attrs, options);
            return new Attribute(attrs, options);
        }
    });

    var Template = (function() {

        // Private members
        var _json, _orientation;

        var Template = function(json, orientation) {

            // Save the raw JSON internally
            _json = json;
            _orientation = orientation;
        };

        // Define getters
        Object.defineProperties(Template.prototype, {
            json : {
                get : function() { return _json; }
            },
            sections : {
                get : function() { return this.json.sections; }
            },
            supportedFeatures : {
                get : function() { return this.json.supportedFeatures; }
            },
            orientation : {
                get : function() { return _orientation; }
            }
        });
        return Template;
    })();



    _.extend(Template.prototype, {
        getAttributeCollection : function() {
            var collection  = [];

            // Recursive helper function
            (function addRecursive(attributes, collection, keychain) {
                _.each(attributes, function(value, key) {
                    var currentKeychain = keychain + "." + key;
                    if (value.type) {
                        currentKeychain = currentKeychain.replace(".", "");
                        collection.push(_.extend({id : currentKeychain}, value));
                    } else {
                        addRecursive(value, collection, currentKeychain);
                    }
                });
            })(this.json.attributes, collection, "");

            return collection;
        },
        getAppearanceAttributes : function() {
            var collection = this.getAttributeCollection();
            var groups = _.groupBy(collection, function(attribute) {
                return attribute.section;
            });

            // Omit hooks
            delete groups.hooks;

            return _.object(_.keys(groups), _.map(_.values(groups), function(objs) { return new AttributeCollection(objs); }));
        },
        getAppearanceSections : function() {
            return _.pick(this.sections, "global", "singleItems", "fonts");
        },
        getTemplateImageDimensions : function(keychain) {
            try {
                var res = Utils.getByKeychain(this.json.assetMetadata.template, keychain.split("."));
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
        getOfferItemAssetDimensions : function() {
            return normalize(this.json.assetMetadata.hooks.offers.item);
        },
        getOffersMenuLinkAssetDimensions : function() {
            return normalize(this.json.assetMetadata.template.hooks.common.offersMenuLinkImage);
        },
        supportsHooks : function() {

            // Checks both that `hooks` is defined,
            // and that there's at least one hook defined
            return !_.isEmpty(this.supportedFeatures.hooks);
        },
        supportsHook : function(provider) {
            var hooks = this.supportedFeatures.hooks;
            return !!(hooks && hooks[provider]);
        },
        supportsHookAction : function(provider, action) {
            var hooks = this.supportedFeatures.hooks;
            return !!(hooks && hooks[provider] && hooks[provider]["actions"][action]);
        },
        supportsOffersMenuLinkImage : function() {
            var hooks = this.supportedFeatures.hooks;
            return !!(hooks && hooks.common && hooks.common.offersMenuLinkImage);
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
