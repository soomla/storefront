define("models", ["backbone", "economyModels", "utils", "urls", "template", "assetManager", "hooks"], function(Backbone, EconomyModels, Utils, Urls, Template, Assets, Hooks) {

    // Cache base classes.
    var RelationalModel             = Backbone.RelationalModel;

    var Economy                     = EconomyModels.Economy,
        VirtualGood                 = EconomyModels.VirtualGood,
        SingleUseGood               = EconomyModels.SingleUseGood,
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


    var duplicateCategoryErrorMessage = "A category with that name already exists.",
        duplicateCurrencyErrorMessage = "A currency with that name already exists.";



    var Store = function(options) {

        // Save for later reference
        this.options = options;

        _.bindAll(this, "buildTemplate", "getBalance", "setBalance", "updateUpgradeAssets", "updateVirtualGoods");

        // Create a {ID : good} map with goods from all categories
        var goodsMap    = this.goodsMap     = {};
        var packsMap    = this.packsMap     = {};
        var categoryMap = this.categoryMap  = {};

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
                        case "equippable":
                            good = new EquippableGood(rawGood);
                            break;
                        case "lifetime":
                            good = new LifetimeGood(rawGood);
                            break;
                        default:

                            // By default instantiate goods like this
                            good = new SingleUseGood(rawGood);
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
        this.hooks = new Hooks.HookManager({theme : options.theme, hooks : options.hooks, hooksProviders : options.hooks_providers || []});

        // Create theme object
        this.assets = new Assets.AssetManager({
            template    : options.template,
            theme 		: options.theme,
            modelAssets : options.modelAssets
        });
    };

    _.extend(Store.prototype, Backbone.Events, {
        // A function for injecting model and theme assets
        // externally after the object has been created
        injectAssets : function(modelAssetNames, themeAssetNames) {
            this.assets.modelAssetNames = modelAssetNames;
            this.assets.themeAssetNames = themeAssetNames;
        },
        buildTemplate : function(json) {
            this.template = new Template(json, this.options.template.orientation);
        },
        getTemplate : function() {
            return this.template;
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
        updateItemId : function(item, newItemId) {

            var oldItemId = item.id;

            // Update all maps
            // Check goods + category maps for virtual goods
            // Check packs map for currency packs
            _.each([this.goodsMap, this.packsMap, this.categoryMap], function(map) {
                if (_.has(map, oldItemId)) {
                    map[newItemId] = map[oldItemId];
                    delete map[oldItemId];
                }
            });

            // Update asset name maps
            if (item.is && item.is("upgradable")) {

                // Assume an overriding model asset ID was passed
                var oldEmptyUpgradeBarAssetId = item.getEmptyUpgradeBarAssetId(),
                    newEmptyUpgradeBarAssetId = item.getEmptyUpgradeBarAssetId(newItemId);

                this.assets.updateItemId(oldEmptyUpgradeBarAssetId, newEmptyUpgradeBarAssetId);
                this.assets.updateModelAssetName(oldEmptyUpgradeBarAssetId, newEmptyUpgradeBarAssetId);
            } else {
                this.assets.updateItemId(oldItemId, newItemId);
                this.assets.updateModelAssetName(oldItemId, newItemId);
            }

            // After all maps and assets have been updated, update the item's ID
            item.setItemId(newItemId);
        },
        updateCategoryId : function(category, newItemId) {

            var oldItemId = category.id;
            if (this.template.supportsCategoryImages()) {
                this.assets.updateCategoryId(oldItemId, newItemId);
                this.assets.updateModelAssetName(oldItemId, newItemId);
            }

            // After all assets have been updated, update the category's name (effectively its ID)
            category.setName(newItemId);
        },
        removeItemId : function(id) {

            // Remove ID from all maps
            // Check goods + category maps for virtual goods
            // Check packs map for currency packs
            _.each([this.goodsMap, this.packsMap, this.categoryMap], function(map) {
                if (_.has(map, id)) delete map[id];
            });

            // Remove the item from the assets
            this.assets.removeItemAsset(id);
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
        addCurrency : function(options) {
            var currency;
            try {
                options.itemId = Currency.generateNameFor(options.name);
                currency = new Currency(options);
                var assetUrl = options.assetUrl || Urls.imagePlaceholder;
                this.assets.setItemAsset(currency.id, assetUrl);
                this.getCurrencies().add(currency);
            } catch (e) {
                throw new Error(duplicateCurrencyErrorMessage);
            }
            return currency;
        },
        addCategory : function(options) {
            var category;
            try {
                category = new Category(options);
                var assetUrl = options.assetUrl || Urls.imagePlaceholder;
                this.assets.setCategoryAsset(category.id, assetUrl, "");
                this.getCategories().add(category);

                // TODO: throw uniqueness error before storing assets
                // TODO: Do this in all other `add*` functions
            } catch(e) {
                throw new Error(duplicateCategoryErrorMessage);
            }
            return category;
        },
        addVirtualGood : function(options) {

            var assetUrl    = options.assetUrl || Urls.imagePlaceholder,
                type        = options.type || "singleUse",
                GoodType,
                good,
                category;

            if (this.supportsMarketPurchaseTypeOnly()) {

                // For market purchase only stores, no need to consider all good types, categories or currencies
                switch(type) {
                    case "lifetime":
                        GoodType = LifetimeGood;
                        break;
                    default:
                        GoodType = SingleUseGood;
                        break;
                }

                good = new GoodType({
                    itemId  : _.uniqueId("item_"),
                    type    : type
                });
                good.setPurchaseType({type: "market"});

                // Ensure the model has an asset assigned
                // before adding it to the collection (which triggers a render)
                this.assets.setItemAsset(good.id, assetUrl, "");

                category = this.getFirstCategory();

                // Add good to other maps
                this.goodsMap[good.id] = good;
                this.categoryMap[good.id] = category;
            } else {

                var firstCurrencyId     = this.getFirstCurrency().id,
                progressBarAssetUrl = options.progressBarAssetUrl || Urls.progressBarAssetUrl;

                switch(type) {
                    case "equippable":
                        GoodType = EquippableGood;
                        break;
                    case "lifetime":
                        GoodType = LifetimeGood;
                        break;
                    case "upgradable":
                        GoodType = UpgradableGood;
                        break;
                    default:
                        GoodType = SingleUseGood;
                        break;
                }

                good = new GoodType({
                    itemId  : _.uniqueId("item_"),
                    type    : type
                });
                good.setCurrencyId(firstCurrencyId);

                // Ensure the model has an asset assigned
                // before adding it to the collection (which triggers a render)
                if (type === "upgradable") {
                    this.assets.setUpgradeBarAsset(good.getEmptyUpgradeBarAssetId(), progressBarAssetUrl)
                } else {
                    this.assets.setItemAsset(good.id, assetUrl);
                }

                var categoryId = options.categoryId || this.getFirstCategory().id;
                category = this.getCategory(categoryId);

                // Add good to other maps
                this.goodsMap[good.id] = good;
                this.categoryMap[good.id] = category;


                // For upgradable goods, enforce at least one level.
                // Assumes that the good is already mapped in the goods map
                if (type === "upgradable") {
                    this.addUpgrade({
                        goodItemId          : good.id,
                        assetUrl            : assetUrl,
                        progressBarAssetUrl : progressBarAssetUrl
                    });
                }
            }

            // Add good to category
            category.getGoods().add(good, {at: 0});
            return good;
        },
        addUpgrade : function(options) {

            if (!options || !options.goodItemId) throw new Error("`addUpgrade` must be called with an options hash containing `goodItemId`");

            var firstCurrencyId = this.getFirstCurrency().id,
                good            = this.goodsMap[options.goodItemId];

            //
            // Adding the upgrade to the collection will cause
            // a reset of upgrades, and an addition of new views
            //
            var upgrade = good.addUpgrade(_.extend({firstCurrencyId : firstCurrencyId}, options));

            // Ensure the upgrade has its assets assigned
            // before triggering the `change` event
            this.assets.setUpgradeAsset(upgrade.getUpgradeImageAssetId(), options.assetUrl || Urls.imagePlaceholder);
            this.assets.setUpgradeBarAsset(upgrade.getUpgradeBarAssetId(), options.progressBarAssetUrl || Urls.progressBarPlaceholder);

            // Manually trigger the event for rendering
            good.trigger("change");

            // Add upgrade to other maps
            this.goodsMap[upgrade.id] = upgrade;

            return upgrade;
        },
        removeUpgrade : function(upgrade) {

            // Remove from mappings and delete upgrade-specific assets
            this.removeItemId(upgrade.id);
            var upgradeImageAssetId = upgrade.getUpgradeImageAssetId(),
                upgradeBarAssetId   = upgrade.getUpgradeBarAssetId();
            this.assets.removeUpgradeAssets(upgradeImageAssetId, upgradeBarAssetId);

            // See: http://stackoverflow.com/questions/10218578/backbone-js-how-to-disable-sync-for-delete
            upgrade.trigger('destroy', upgrade, upgrade.collection, {});
        },
        addCurrencyPack : function(options) {
            var currencyPack = new CurrencyPack({
                purchasableItem : {
                    marketItem : {
                        consumable  : 1,
                        price       : 0.99,
                        iosId       : "untitled_currency_pack",
                        androidId   : "untitled_currency_pack"
                    },
                    purchaseType    : "market"
                },
                name                : "Untitled",
                itemId              : _.uniqueId("item_"),
                currency_itemId     : options.currency_itemId,
                currency_amount     : 1000
            });

            // Ensure the model has an asset assigned
            // before adding it to the collection (which triggers a render)
            this.assets.setItemAsset(currencyPack.id, options.assetUrl || Urls.imagePlaceholder, "");

            // Add pack to currency
            var currency_itemId = options.currency_itemId;
            this.getCurrency(currency_itemId).getPacks().add(currencyPack, {at: 0});

            // Add pack to other maps
            this.packsMap[currencyPack.id] = currencyPack;

            return currencyPack;
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
        removeVirtualGood : function(good) {

            // Deal with upgradables
            if (good.is("upgradable")) {

                // Remove all upgrades associated with this good
                this._clearReverseOrder(good.getUpgrades(), this.removeUpgrade);

                // Remove listeners that were in charge of updating item IDs in model assets map
                this.stopListening(good);

                // Remove zero-index bar
                this.assets.removeItemAsset(good.getEmptyUpgradeBarAssetId());
            }

            // Remove from mappings
            this.removeItemId(good.id);

            // Remove from category
            good.trigger('destroy', good, good.collection, {});
        },
        removeCurrencyPack : function(pack) {

            // Remove from mappings
            this.removeItemId(pack.id);

            // Remove from category
            pack.trigger('destroy', pack, pack.collection, {});
        },
        removeCategory : function(category) {

            // Remove all goods associated with this currency
            this._clearReverseOrder(category.getGoods(), this.removeVirtualGood);

            // Remove the currency mappings
            this.assets.removeCategoryAsset(category.id);

            // Remove the category model
            category.trigger('destroy', category, category.collection, {});
        },
        removeCurrency : function(currency) {

            // Remove all goods associated with this currency
            var currencyGoods = _.filter(this.goodsMap, function(good) {
                return good.getCurrencyId() === currency.id;
            });
            this._clearReverseOrder(currencyGoods, this.removeVirtualGood);

            // Remove all packs associated with this currency
            this._clearReverseOrder(currency.getPacks(), this.removeCurrencyPack);

            // Remove the currency mappings
            this.removeItemId(currency.id);

            // Remove the currency model
            currency.trigger('destroy', currency, currency.collection, {});
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
        },
        getCurrency : function(id) {
            return this.getCurrencies().get(id);
        },
        getFirstCurrency: function() {
            return this.getCurrencies().first();
        },
        updateCategoryName : function(id, newName) {

            var newItemId   = newName,
                categories  = this.getCategories(),
                category    = categories.get(id);

            // If the new item ID is a duplicate, throw an error
            if (categories.get(newItemId)) throw new Error(duplicateCategoryErrorMessage);

            // TODO: conditionally do this - only if store has category assets
            this.updateCategoryId(category, newItemId);

            return category;
        },
        updateCurrencyName : function(id, newName) {

            var oldItemId   = id,
                newItemId   = Currency.generateNameFor(newName),
                currencies  = this.getCurrencies(),
                currency    = currencies.get(id);

            // If the new item ID is a duplicate, throw an error
            if (currencies.get(newItemId)) throw new Error(duplicateCurrencyErrorMessage);

            // First ensure model assets are updated
            this.updateItemId(currency, newItemId);

            // Update all goods associated with this currency
            _.each(this.goodsMap, function(good) {
                if (good.getCurrencyId() === oldItemId) good.setCurrencyId(newItemId);
            });

            // Update all currency packs associated with this currency
            _.each(this.packsMap, function(currencyPack) {
                if (currencyPack.getCurrencyId() === oldItemId) currencyPack.setCurrencyId(newItemId);
            });

            // then set the new values
            currency.set({
                name    : newName,
                itemId  : newItemId
            });

            return currency;
        },
        supportsMarketPurchaseTypeOnly : function() {
            var purchaseTypes = this.template.getSupportedPurchaseTypes();
            return (purchaseTypes && purchaseTypes.market && !purchaseTypes.virtualItem);
        },
        getModelAssetDimensions : function(model) {
            if (model instanceof EconomyModels.VirtualGood) {

                if (model.is("upgradable")) {
                    return this.template.getVirtualGoodAssetDimensions("goodUpgrades");
                } else {
                    return this.template.getVirtualGoodAssetDimensions(model.get("type"));
                }

            } else if (model instanceof EconomyModels.Currency) {
                return this.template.getCurrencyAssetDimensions();
            } else if (model instanceof EconomyModels.CurrencyPack) {
                return this.template.getCurrencyPackAssetDimensions();
            } else {
                throw "Unknown model type";
            }
        },
        getCategoryAssetDimensions : function() {
            return this.template.getCategoryAssetDimensions();
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

            return json;
        }
    });

    _.extend(Store.prototype, Hooks.HooksMixin, Assets.AssetsMixin);


    // Assign store API version - to be used externally
    // i.e. when manipulating the store from the dashboard
    var API_VERSION = "3.0.1";
    Object.defineProperty(Store.prototype, "API_VERSION", {
        get : function() { return API_VERSION; }
    });



    return {
        VirtualGood                 : VirtualGood,
        SingleUseGood 				: SingleUseGood,
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