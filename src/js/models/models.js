define("models", ["backbone", "economyModels", "utils", "urls", "template", "assetManager", "hooks", "modelManipulation", "dimensionHelpers"], function(Backbone, EconomyModels, Utils, Urls, Template, Assets, Hooks, ModelManipulation, DimensionHelpers) {

    // Cache base classes.
    var RelationalModel             = Backbone.RelationalModel;

    var Economy                     = EconomyModels.Economy,
        VirtualGood                 = EconomyModels.VirtualGood,
        SingleUseGood               = EconomyModels.SingleUseGood,
        SingleUsePack               = EconomyModels.SingleUsePack,
        EquippableGood              = EconomyModels.EquippableGood,
        LifetimeGood                = EconomyModels.LifetimeGood,
        UpgradableGood              = EconomyModels.UpgradableGood,
        Upgrade                     = EconomyModels.Upgrade,
        VirtualGoodsCollection      = EconomyModels.VirtualGoodsCollection,
        CurrencyPack                = EconomyModels.CurrencyPack,
        Currency                    = EconomyModels.Currency,
        Category                    = EconomyModels.Category,
        CategoryCollection          = EconomyModels.CategoryCollection,
        VirtualCurrencyCollection   = EconomyModels.VirtualCurrencyCollection,
        CurrencyPacksCollection     = EconomyModels.CurrencyPacksCollection;




    var Store = function(options) {

        // Save for later reference
        this.options = options;

        _.bindAll(this, "buildTemplate");
        _.bindAll(this, "getBalance", "setBalance", "updateUpgradeAssets", "updateVirtualGoods");

        // Create a {ID : good} map with goods from all categories
        var goodsMap    = this.goodsMap     = {};
        var packsMap    = this.packsMap     = {};
        var categoryMap = this.categoryMap  = {};

        // Hold all single use goods in a collection for quick retrieval
        // and event listening
        this.singleUseGoods = new Backbone.Collection([], {comparator : "name"});
        this.singleUseGoods.listenTo(this.singleUseGoods, "change:name", this.singleUseGoods.sort);

        // Initialize the economy only with currencies, since their raw
        // representation fits what's expected.  In contrast, raw categories need
        // to be massaged and will be added later to the economy's `categories` relational model
        this.economy = new Economy({
            currencies : options.currencies
        });


        // Populate market items map
        _.each(options.currencyPacks, function(rawPack) {
            var pack = new CurrencyPack(rawPack);
            packsMap[pack.id] = pack;
        });

        //
        // Populate goods map, flag each good with its type
        //

        // Start by filtering goods with upgrades
        var upgradableGoodIds = _(options.goods.goodUpgrades).chain().map(function(u) { return u.good_itemId; }).uniq().value();

        // Iterate all types of goods and instantiate
        // objects for all goods according to their classification
        _.each(_.omit(options.goods, "goodUpgrades"), function(rawGoods, type) {
            _.each(rawGoods, function(rawGood) {
                rawGood.type = type;
                var good;

                if (_.contains(upgradableGoodIds, rawGood.itemId)) {

                    // If a good has upgrade levels, instantiate it as a different object
                    good = new UpgradableGood(rawGood);

                } else {
                    switch (type) {
                        case "goodPacks":
                            good = new SingleUsePack(rawGood);
                            break;
                        case "equippable":
                            good = new EquippableGood(rawGood);
                            break;
                        case "lifetime":
                            good = new LifetimeGood(rawGood);
                            break;
                        default:

                            // By default instantiate goods like this
                            good = new SingleUseGood(rawGood);
                            this.singleUseGoods.add(good);
                            break;
                    }
                }

                // Keep a reference to the goods in a map
                goodsMap[good.id] = good;
            }, this);
        }, this);


        // Now, add upgrades to existing upgradable goods
        _.each(options.goods.goodUpgrades, function(rawUpgrade) {

            // Create Upgrade objects without the good_itemId attribute
            // Since they'll be associated with Backbone Relational to that good
            var goodItemId  = rawUpgrade.good_itemId,
                upgrade     = new Upgrade(_.omit(rawUpgrade, "good_itemId")),
                good        = goodsMap[goodItemId];
            good.getUpgrades().add(upgrade, {silent : true});
        });


        // Fill currency packs into currency buckets (collections)
        var currencies = this.getCurrencies();
        _.each(options.currencyPacks, function(pack) {
            var packs = currencies.get(pack.currency_itemId).getPacks();
            packs.add(packsMap[pack.itemId]);
        });

        // Fill goods from the raw categories into category buckets (collections)
        _.each(options.categories, function(rawCategory) {

            var category = new Category(_.pick(rawCategory, "name")),
                goods    = category.getGoods();

            _.each(rawCategory.goods_itemIds, function(goodItemId) {
                goods.add(goodsMap[goodItemId]);
                categoryMap[goodItemId] = category;
            });

            this.getCategories().add(category);
        }, this);


        // Create hooks object
        this.hooks = new Hooks.HookManager({theme : options.theme, hooks : options.hooks, hooksProviders : options.hooks_providers || {}});

        // Create theme object
        this.assets = new Assets.AssetManager(_.pick(options, "template", "theme", "modelAssets", "customCss"));

        if (_.isFunction(this.bindAssets)) this.bindAssets();
    };

    _.extend(Store.prototype, Backbone.Events, ModelManipulation, DimensionHelpers, {


        //
        // UI only functionality
        //
        getCurrency : function(id) {
            return this.getCurrencies().get(id);
        },


        //
        // UI + Dashboard related functionality
        //

        buildTemplate : function(json) {
            this.template = new Template(json, this.options.template.orientation);
        },
        getTemplate : function() {
            return this.template;
        },
        getCategories : function() {
            return this.economy.get("categories");
        },
        getCategory : function(id) {
            return this.getCategories().get(id);
        },
        getFirstCategory : function() {
            return this.getCategories().first();
        },
        getCurrencies : function() {
            return this.economy.get("currencies");
        }

    }, {
        // A function for injecting model and theme assets
        // externally after the object has been created
        injectAssets : function(modelAssetNames, themeAssetNames) {
            this.assets.modelAssetNames = modelAssetNames;
            this.assets.themeAssetNames = themeAssetNames;
        },
        getItem : function(itemId) {
            return this.goodsMap[itemId];
        },
        getCurrencyPack : function(itemId) {
            return this.packsMap[itemId];
        },
        getGoodCategory: function(goodId) {
            return this.categoryMap[goodId];
        },
        updateUpgradeAssets : function(model, newItemId) {

            newItemId       = model.getEmptyUpgradeBarAssetId(newItemId);
            var oldItemId   = model.getEmptyUpgradeBarAssetId(model.previousAttributes().itemId);
            this.assets.updateItemId(oldItemId, newItemId)
        },
        setBalance : function(balances) {

            // Notify listeners before updating currencies
            this.trigger("currencies:update:before");

            var currencies = this.getCurrencies();
            _.each(balances, function(attributes, currency) {
                currencies.get(currency).set("balance", attributes.balance);
            });

            // Notify listeners after updating goods
            this.trigger("currencies:update:after");
            return this;
        },
        getBalance : function(currencyId) {
            return this.getCurrency(currencyId).getBalance();
        },
        updateVirtualGoods : function(goods) {

            // Notify listeners before updating goods
            this.trigger("goods:update:before");

            var _this = this;
            _.each(goods, function(attributes, good) {

                // Safe-guard from goods that aren't in the goods map
                // i.e. upgrade levels
                if (good = _this.goodsMap[good]) {

                    if (attributes.hasOwnProperty("balance")) {
                        good.set("balance", attributes.balance);
                    }

                    if (attributes.hasOwnProperty("equipped")) {
                        if (attributes.equipped)
                            if (good.getBalance() >  0) {
                                good.setEquipping(attributes.equipped);
                            } else {

                                // Don't allow equipping goods that aren't owned
                                // TODO: Throw error
                                good.setEquipping(false);
                                SoomlaJS.notEnoughGoods(good.id);
                            }
                        else
                            good.setEquipping(attributes.equipped);
                    }

                    if (attributes.currentUpgrade && attributes.currentUpgrade !== "none") {
                        good.upgrade(attributes.currentUpgrade);
                    }
                 }
            });

            // Notify listeners after updating goods
            this.trigger("goods:update:after");
            return this;
        },
        //
        // Remove all the given collection's items in reverse order.  This prevents:
        // 1. Removal from a collection while iterating forward
        // 2. An unclear Backbone Relational bug: "Uncaught TypeError: Cannot call method 'getAssociatedItemId' of undefined"
        //
        // Accepts both Backbone collections and plain arrays of Backbone objects
        _clearReverseOrder : function(collection, removeFunction) {
            for (var i = collection.length - 1; i >= 0; i--) {

                // Apply condition on `at` function to check if `collection` is
                // a Backbone collection or a plain array
                removeFunction.call(this, collection.at ? collection.at(i) : collection[i]);
            }
        },
        getFirstCurrency: function() {
            return this.getCurrencies().first();
        },
        getSingleUseGoods : function() {
            return this.singleUseGoods;
        },
        toJSON : function() {

            // Prepare a JSON using the original prototype's toJSON method
            var json = RelationalModel.prototype.toJSON.apply(this.economy);

            // Deep clone the model assets and theme since they might be manipulated
            // by this function and we don't want to affect the original objects
            json.modelAssets = $.extend(true, {}, this.assets.modelAssets);
            json.theme = $.extend(true, {}, this.assets.theme);

            // Delete field that is injected just for SDK state emulation
            delete json.theme.hooks_providers;

            // Remove all fields injected into models during runtime
            // e.g. balance, equipped...
            _.each(json.currencies, function(currency) {
                delete currency.balance;
            });
            _.each(json.categories, function(category) {
                _.each(category.goods, function(good) {

                    if (good.upgrades) {
                        delete good.upgradeId;
                    } else {

                        switch (good.type) {
                            case "equippable":
                                delete good.balance;
                                delete good.equipped;
                                break;
                            case "lifetime":
                                delete good.balance;
                                break;
                            default:

                                // The default is single use goods
                                delete good.balance;
                                break;
                        }
                    }
                });
            });

            // Construct categories and goods
            json.goods = {goodUpgrades : [], lifetime : [], equippable : [], singleUse : [], goodPacks : []};
            _.each(json.categories, function(category) {

                category.goods_itemIds = [];

                _.each(category.goods, function(good) {

                    // If it's an upgradable good, first process its upgrades
                    // and delete them in the end.
                    if (good.upgrades) {

                        _.each(good.upgrades, function(upgrade) {
                            upgrade.good_itemId = good.itemId;
                            json.goods.goodUpgrades.push(upgrade);
                        });
                        delete good.upgrades;
                    }

                    // Add the good to its category
                    category.goods_itemIds.push(good.itemId);

                    // This is hack that enforces supporting only lifetime upgradable goods.
                    // Will need to be amended in the future to support more types.
                    var type = good.type === "upgradable" ? "lifetime" : good.type;

                    json.goods[type].push(good);
                    delete good.type;
                });

                delete category.goods;
            });


            // Construct currency packs
            json.currencyPacks = [];
            _.each(json.currencies, function(currency) {
                _.each(currency.packs, function(pack) {
                    json.currencyPacks.push(pack);
                });
                delete currency.packs;
            });

            // Assign hooks
            json.hooks = this.hooks.toJSON();


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

            var customCss = this.getCustomCss();
            if (customCss) json.customCss = customCss;

            return json;
        }
    });

    _.extend(Store.prototype, Hooks.HooksMixin, Assets.AssetsMixin);


    // Assign store API version - to be used externally
    // i.e. when manipulating the store from the dashboard
    var API_VERSION = "3.1.1";
    Object.defineProperty(Store.prototype, "API_VERSION", {
        get : function() { return API_VERSION; }
    });



    return {
        VirtualGood                 : VirtualGood,
        SingleUseGood 				: SingleUseGood,
        SingleUsePack 				: SingleUsePack,
        EquippableGood              : EquippableGood,
        LifetimeGood 				: LifetimeGood,
        UpgradableGood              : UpgradableGood,
        Upgrade 					: Upgrade,
        VirtualGoodsCollection      : VirtualGoodsCollection,
        CurrencyPack                : CurrencyPack,
        Store                       : Store,
        Currency                    : Currency,
        Category                    : Category,
        VirtualCurrencyCollection   : VirtualCurrencyCollection,
        CurrencyPacksCollection     : CurrencyPacksCollection,
        RelationalModel             : RelationalModel
    };
});