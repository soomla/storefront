define("models", ["backbone", "economyModels", "utils", "urls", "template", "assetManager", "hooks"], function(Backbone, EconomyModels, Utils, Urls, Template, AssetManager, Hooks) {

    // Cache base classes.
    var RelationalModel = Backbone.RelationalModel;

    var VirtualGood                 = EconomyModels.VirtualGood,
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
        CurrencyPacksCollection     = EconomyModels.CurrencyPacksCollection,
        NonConsumable               = EconomyModels.NonConsumable,
        NonConsumablesCollection    = EconomyModels.NonConsumablesCollection;


    var duplicateCategoryErrorMessage = "A category with that name already exists.",
        duplicateCurrencyErrorMessage = "A currency with that name already exists.";


    var Store = RelationalModel.extend({
        relations: [
            {
                type: Backbone.HasMany,
                key: 'categories',
                relatedModel: Category,
                collectionType: CategoryCollection,
                reverseRelation: {
                    includeInJSON: 'id'
                }
            },
            {
                type: Backbone.HasMany,
                key: 'currencies',
                relatedModel: Currency,
                collectionType: VirtualCurrencyCollection,
                reverseRelation: {
                    includeInJSON: 'id'
                }
            },
            {
                type: Backbone.HasMany,
                key: 'nonConsumables',
                relatedModel: NonConsumable,
                collectionType: NonConsumablesCollection,
                reverseRelation: {
                    includeInJSON: 'id'
                }
            }
        ],
        initialize : function() {
            _.bindAll(this, "buildTemplate", "getBalance", "setBalance", "updateUpgradeAssets", "updateVirtualGoods");

            // Create a {ID : good} map with goods from all categories
            var goodsMap    = this.goodsMap     = {};
            var packsMap    = this.packsMap     = {};
            var categoryMap = this.categoryMap  = {};


            // Populate market items map
            _.each(this.get("currencyPacks"), function(rawPack) {
                var pack = new CurrencyPack(rawPack);
                packsMap[pack.id] = pack;
            });

            //
            // Populate goods map, flag each good with its type
            //

            // Start by filtering goods with upgrades
            var upgradableGoodIds = _(this.get("goods").goodUpgrades).chain().map(function(u) { return u.good_itemId; }).uniq().value();

            // Iterate all types of goods and instantiate
            // objects for all goods according to their classification
            _.each(_.omit(this.get("goods"), "goodUpgrades"), function(rawGoods, type) {
                _.each(rawGoods, function(rawGood) {
                    rawGood.type = type;
                    var good;

                    if (_.contains(upgradableGoodIds, rawGood.itemId)) {

                        // If a good has upgrade levels, instantiate it as a different object
                        good = new UpgradableGood(rawGood);

                        // Update upgradable model assets whenever an item ID changes
                        this.listenTo(good, "change:itemId", function(model, newItemId) {

                            // This if is for protecting against this event firing when the store is first initialized
                            // TODO: Investigate
                            if (model.previous("itemId")) {
                                this.updateUpgradeAssets(model, newItemId);
                            }
                        });
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
            _.each(this.get("goods").goodUpgrades, function(rawUpgrade) {

                // Create Upgrade objects without the good_itemId attribute
                // Since they'll be associated with Backbone Relational to that good
                var goodItemId  = rawUpgrade.good_itemId,
                    upgrade     = new Upgrade(_.omit(rawUpgrade, "good_itemId")),
                    good        = goodsMap[goodItemId];
                good.getUpgrades().add(upgrade, {silent : true});
            });


            // Fill currency packs into currency buckets (collections)
            var currencies = this.getCurrencies();
            _.each(this.get("currencyPacks"), function(pack) {
                var packs = currencies.get(pack.currency_itemId).get("packs");
                packs.add(packsMap[pack.itemId]);
            });

            // Fill goods from the raw categories into category buckets (collections)
            _.each(this.get("rawCategories"), function(rawCategory) {

                var category = new Category(_.pick(rawCategory, "name")),
                    goods    = category.get("goods");

                _.each(rawCategory.goods_itemIds, function(goodItemId) {
                    goods.add(goodsMap[goodItemId]);
                    categoryMap[goodItemId] = category;
                });

                this.getCategories().add(category);
            }, this);


            // Create hooks object
            this.hooks = new Hooks.HookManager({theme : this.get("theme"), hooks : this.get("hooks")});

            // Create theme object
            this.assets = new AssetManager({
                theme 		: this.get("theme"),
                modelAssets : this.getModelAssets()
            });

            // Clean fields that are not unnecessary to prevent duplicate data
            this.unset("rawCategories");
            this.unset("goods");
            this.unset("currencyPacks");
        },
        buildTemplate : function(json) {
            this.template = new Template(json, this.get("template").orientation);
        },
        getTemplate : function() {
            return this.template;
        },
        setCategoryAsset : function(category, url) {

            // First assign category asset, so that when the item view
            // in the store renders, it will have it accessible as a template helper
            this.assets.setCategoryAsset(category.id, url);

            // Force the preview to update by triggering a change event on the model
            category.trigger("change:asset");
        },
        setItemAsset : function(model, url, options) {

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
            this.assets.setItemAsset(id, url);

            // Force the preview to update by triggering a change event on the model
            model.trigger("change:asset");
        },
        getModelAssets : function() {
            return this.get("modelAssets");
        },
        setThemeAttribute : function(keychain, value) {
            Utils.setByKeyChain(this.get("theme"), keychain, value);
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
            this.assets.changeItemId(oldItemId, newItemId)
        },
        updateItemId : function(oldItemId, newItemId) {

            var modelAssets = this.getModelAssets();

            _.each([this.goodsMap, this.packsMap, this.categoryMap, modelAssets.items, modelAssets.categories], function(map) {
                if (_.has(map, oldItemId)) {
                    map[newItemId] = map[oldItemId];
                    delete map[oldItemId];
                }
            });
        },
        removeItemId : function(id) {

            var modelAssets = this.getModelAssets();

            _.each([this.goodsMap, this.packsMap, this.categoryMap, modelAssets.items, modelAssets.categories], function(map) {
                if (_.has(map, id)) delete map[id];
            });
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
                            if (good.get("balance") >  0) {
                                good.set("equipped", attributes.equipped);
                            } else {
                                // Don't allow equipping goods that aren't owned
                                good.set("equipped", false);
                                SoomlaJS.notEnoughGoods(good.id);
                            }
                        else
                            good.set("equipped", attributes.equipped);
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
        updateNonConsumables : function(nonConsumables) {
            _.each(nonConsumables, function(attributes, nonConsumableId) {
                this.get("nonConsumables").get(nonConsumableId).set(attributes);
            }, this);
        },
        restorePurchases : function(nonConsumables) {

            // In case the input is empty, create an object with all the
            // non-consumable items marked as owned.
            if (!nonConsumables) {
                nonConsumables = {};
                this.get("nonConsumables").each(function(nonConsumable) {
                    nonConsumables[nonConsumable.id] = {owned : true};
                });
            }
            this.updateNonConsumables(nonConsumables);
        },
        addNewCurrency : function(options) {
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
        addNewCategory : function(options) {
            var category;
            try {
                category = new Category(options);
                var assetUrl = options.assetUrl || Urls.imagePlaceholder;
                this.assets.setCategoryAsset(category.id, assetUrl);
                this.getCategories().add(category);
            } catch(e) {
                throw new Error(duplicateCategoryErrorMessage);
            }
            return category;
        },
        // TODO: Deal with upgradables
        addNewVirtualGood : function(options) {

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
                this.assets.setItemAsset(good.id, assetUrl);

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

                // Update upgradable model assets whenever an item ID changes
                if (type === "upgradable") {
                    this.listenTo(good, "change:itemId", this.updateUpgradeAssets);
                }

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
            category.get("goods").add(good, {at: 0});
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
            this.assets.removeUpgradeAsset(upgrade.getUpgradeImageAssetId());
            this.assets.removeUpgradeBarAsset(upgrade.getUpgradeBarAssetId());

            // See: http://stackoverflow.com/questions/10218578/backbone-js-how-to-disable-sync-for-delete
            upgrade.trigger('destroy', upgrade, upgrade.collection, {});
        },
        addNewCurrencyPack : function(options) {         var currencyPack = new CurrencyPack({
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
            this.assets.setItemAsset(currencyPack.id, options.assetUrl || Urls.imagePlaceholder);

            // Add pack to currency
            var currency_itemId = options.currency_itemId;
            this.getCurrency(currency_itemId).get("packs").add(currencyPack, {at: 0});

            // Add pack to other maps
            this.packsMap[currencyPack.id] = currencyPack;

            return currencyPack;
        },
        removeVirtualGood : function(good) {

            // Deal with upgradables
            if (good.is("upgradable")) {

                // Remove all upgrades in reverse order to prevent this unclear Backbone Relational bug:
                // "Uncaught TypeError: Cannot call method 'getAssociatedItemId' of undefined"
                var upgrades = good.getUpgrades();
                for (var i = upgrades.length - 1; i >= 0; i--) {
                    this.removeUpgrade(upgrades.at(i));
                }

                // Remove listeners that were in charge of updating item IDs in model assets map
                this.stopListening(good);

                // Remove zero-index bar
                this.removeItemId(good.getEmptyUpgradeBarAssetId());
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
        // TODO: Deal with upgradables
        removeCategory : function(category) {

            //
            // Remove all goods associated with this currency
            //
            var categoryGoods = category.get("goods");
            categoryGoods.each(_.bind(function(good) {

                // Remove from mappings
                this.removeItemId(good.id);
            }, this));
            categoryGoods.reset();

            // Remove the currency mappings
            this.removeItemId(category.id);

            // Remove the category model
            category.trigger('destroy', category, category.collection, {});
        },
        removeCurrency : function(currency) {

            //
            // Remove all goods associated with this currency
            //
            _.each(this.goodsMap, _.bind(function(good) {

                if (good.getCurrencyId() === currency.id) {

                    // First remove from mappings, then remove from collection
                    this.removeItemId(good.id);
                    good.trigger('destroy', good, good.collection, {});
                }
            }, this));

            //
            // Remove all packs associated with this currency
            //
            var currencyPacks = currency.get("packs");
            currencyPacks.each(_.bind(function(pack) {

                // Remove from mappings
                this.removeItemId(pack.id);
            }, this));
            currencyPacks.reset();

            // Remove the currency mappings
            this.removeItemId(currency.id);

            // Remove the currency model
            currency.trigger('destroy', currency, currency.collection, {});
        },
        getCategories : function() {
            return this.get("categories");
        },
        getCategory : function(id) {
            return this.getCategories().get(id);
        },
        getFirstCategory : function() {
            return this.getCategories().first();
        },
        getCurrencies : function() {
            return this.get("currencies");
        },
        getCurrency : function(id) {
            return this.getCurrencies().get(id);
        },
        getFirstCurrency: function() {
            return this.getCurrencies().first();
        },
        changeCategoryName : function(id, newName) {

            var oldItemId   = id,
                newItemId   = newName,
                categories  = this.getCategories(),
                category    = categories.get(id);

            // If the new item ID is a duplicate, throw an error
            if (categories.get(newItemId)) throw new Error(duplicateCategoryErrorMessage);

            // TODO: conditionally do this - only if store has category assets
            // First ensure model assets are updated
            this.updateItemId(oldItemId, newItemId);

            // then set the new values
            category.set("name", newName);

            return category;
        },
        changeCurrencyName : function(id, newName) {

            var oldItemId   = id,
                newItemId   = Currency.generateNameFor(newName),
                currencies  = this.getCurrencies(),
                currency    = currencies.get(id);

            // If the new item ID is a duplicate, throw an error
            if (currencies.get(newItemId)) throw new Error(duplicateCurrencyErrorMessage);

            // First ensure model assets are updated
            this.updateItemId(oldItemId, newItemId);

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
        toJSON : function(options) {

            (options) || (options = {});

            // Prepare a JSON using the original prototype's toJSON method
            var json = RelationalModel.prototype.toJSON.apply(this);

            // Deep clone the model assets and theme since they might be manipulated
            // by this function and we don't want to affect the original objects
            json.modelAssets = $.extend(true, {}, json.modelAssets);
            json.theme = $.extend(true, {}, json.theme);

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
            if (options.modelAssetNames) {
                _.each(json.modelAssets.items, function(name, itemId) {
                    json.modelAssets.items[itemId] = options.modelAssetNames[itemId];
                });
                _.each(json.modelAssets.categories, function(name, itemId) {
                    json.modelAssets.categories[itemId] = options.modelAssetNames[itemId];
                });
            }

            // Update model assets
            if (options.themeAssetNames) {
                _.each(options.themeAssetNames, function(name, keychain) {
                    Utils.setByKeyChain(json.theme, keychain, name);
                });
            }


            // Delete auxiliary fields
            // TODO: Check if needed
            delete json.rawCategories;
            delete json.nonConsumables;



            // Remove the injected base URL (only for loading assets in the dashboard)
            // Clone explanation: Backbone's implementation to toJSON() clones the model's attributes.  This is
            // a shallow clone.  See http://underscorejs.org/#clone
            // This is why cloning the template object first is necessary.  Manipulating it directly will
            // affect the original model which we don't want
            // TODO: Remove once the storefront loads its template files (.less, .handlbars, *Views.js) from S3 URLs
            json.template = _.clone(json.template);
            delete json.template.baseUrl;

            return json;
        }
    });

    _.extend(Store.prototype, Hooks.HooksMixin);


    // Assign store API version - to be used externally
    // i.e. when manipulating the store from the dashboard
    var API_VERSION = "0.0.1";
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
        NonConsumable               : NonConsumable,
        RelationalModel             : RelationalModel
    };
});