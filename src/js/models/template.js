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
        getKeychain : function() {
            return this.id.split(".");
        }
    });
    var AttributeCollection = Backbone.Collection.extend({
        model : Attribute
    });

    var Template = (function() {

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
            var collection = [];

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
        getSectionedAttributes : function() {
            var collection = this.getAttributeCollection();
            var groups = _.groupBy(collection, function(attribute) {
                return attribute.section;
            });

            return _.object(_.keys(groups), _.map(_.values(groups), function(objs) { return new AttributeCollection(objs); }));
        },
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
