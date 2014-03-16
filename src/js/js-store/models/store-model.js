define("storeModel", ["backbone", "economyModels", "hooks", "modelManipulation", "dashboardHelpers"], function(Backbone, EconomyModels, Hooks, ModelManipulation, DashboardHelpers) {

    // Cache base classes.
    var RelationalModel             = Backbone.RelationalModel;

    var Economy                     = EconomyModels.Economy,
        SingleUseGood               = EconomyModels.SingleUseGood,
        SingleUsePack               = EconomyModels.SingleUsePack,
        EquippableGood              = EconomyModels.EquippableGood,
        LifetimeGood                = EconomyModels.LifetimeGood,
        UpgradableGood              = EconomyModels.UpgradableGood,
        Upgrade                     = EconomyModels.Upgrade,
        CurrencyPack                = EconomyModels.CurrencyPack,
        Category                    = EconomyModels.Category;


    var Store = function(options) {

        // Save for later reference
        this.options = options;

        _.bindAll(this, "setBalance", "updateVirtualGoods");

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


        // TODO: Create separation - don't mixin these methods that are invoked only once.
        if (_.isFunction(this.initializeAssetManager)) this.initializeAssetManager(options);
        if (_.isFunction(this.initializeStorefrontHelpers)) this.initializeStorefrontHelpers();
    };

    _.extend(
        Store.prototype,
        Backbone.Events,
        ModelManipulation,
        DashboardHelpers,
        Hooks.HooksMixin, {

            //
            // Category methods
            //

            getCategories : function() {
                return this.economy.get("categories");
            },
            getCategory : function(id) {
                return this.getCategories().get(id);
            },
            getFirstCategory : function() {
                return this.getCategories().first();
            },
            getGoodCategory: function(goodId) {
                return this.categoryMap[goodId];
            },


            //
            // Currency methods
            //

            getCurrencies : function() {
                return this.economy.get("currencies");
            },
            getCurrency : function(id) {
                return this.getCurrencies().get(id);
            },
            getFirstCurrency: function() {
                return this.getCurrencies().first();
            },
            getCurrencyPack : function(itemId) {
                return this.packsMap[itemId];
            },

            //
            // Utility methods
            //

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
            getSingleUseGoods : function() {
                return this.singleUseGoods;
            },
            toJSON : function() {

                // Prepare a JSON using the original prototype's toJSON method
                var json = RelationalModel.prototype.toJSON.apply(this.economy);

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

                return json;
            }
        });


    //
    // Store.mixin:
    // Similar to `_.extend`, but also checks for a `wappers` property
    // And wraps existing functions in `Store.prototype` with functions
    // provided in `wrappers`
    //
    _.extend(Store, {
        mixin : function(source) {
            _.each(_.toArray(arguments), function(source) {

                _.extend(this.prototype, _.omit(source, "wrappers"));
                _.each(source.wrappers, function(fn, name) {

                    // Check if the source and target are both actually functions
                    if(_.isFunction(fn) && _.isFunction(this.prototype[name])) {

                        // Wrap the original function with the new one
                        this.prototype[name] = _.wrap(this.prototype[name], fn);
                    }
                }, this);
            }, this);
        }
    });


    // Assign store API version - to be used externally
    // i.e. when manipulating the store from the dashboard
    var API_VERSION = "3.1.1";
    Object.defineProperty(Store.prototype, "API_VERSION", {
        get : function() { return API_VERSION; }
    });

    return Store;
});