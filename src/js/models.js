define("models", ["backbone", "economyModels", "utils"], function(Backbone, EconomyModels, Utils) {

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
            _.bindAll(this, "getBalance", "setBalance", "updateUpgradeModelAssets", "updateVirtualGoods");

            // Create a {ID : good} map with goods from all categories
            var goodsMap 		= this.goodsMap 		= {};
            var marketItemsMap 	= this.marketItemsMap 	= {};
            var categoryMap 	= this.categoryMap 		= {};


            // Populate market items map
            _.each(this.get("currencyPacks"), function(rawPack) {
                var pack = new CurrencyPack(rawPack);
                marketItemsMap[pack.id] = pack;
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
                                this.updateUpgradeModelAssets(model, newItemId);
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
            var currencies = this.get("currencies");
            _.each(this.get("currencyPacks"), function(pack) {
                var packs = currencies.get(pack.currency_itemId).get("packs");
                packs.add(marketItemsMap[pack.itemId]);
            });

            // Fill goods from the raw categories into category buckets (collections)
            _.each(this.get("rawCategories"), function(rawCategory) {

                var category = new Category(_.pick(rawCategory, "name")),
                    goods    = category.get("goods");

                _.each(rawCategory.goods_itemIds, function(goodItemId) {
                    goods.add(goodsMap[goodItemId]);
                    categoryMap[goodItemId] = category;
                });

                this.get("categories").add(category);
            }, this);

            // Clean fields that are not unnecessary to prevent duplicate data
            this.unset("rawCategories");
            this.unset("goods");
            this.unset("currencyPacks");
        },
        setCategoryAsset : function(category, url) {

            // First assign image path to modelAssets hash, so that when the item view
            // in the store renders, it will have it accessible as a template helper
            this.getModelAssets().categories[category.id] = url;

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
            this.getModelAssets().items[id] = url;

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
        getMarketItem : function(itemId) {
            return this.marketItemsMap[itemId];
        },
        getGoodCategory: function(goodId) {
            return this.categoryMap[goodId];
        },
        updateUpgradeModelAssets : function(model, newItemId) {

            newItemId       = model.getEmptyUpgradeBarAssetId(newItemId);
            var oldItemId   = model.getEmptyUpgradeBarAssetId(model.previousAttributes().itemId),
                modelAssets = this.getModelAssets();

            modelAssets.items[newItemId] = modelAssets.items[oldItemId];
            delete modelAssets.items[oldItemId];

            // Update upgrades' model assets with new IDs

            model.getUpgrades().each(function(upgrade, i) {

                var oldItemId   = Upgrade.generateNameFor(model.previous("itemId"), i + 1),
                    oldImageId 	= upgrade.getUpgradeImageAssetId(oldItemId),
                    oldBarId 	= upgrade.getUpgradeBarAssetId(oldItemId),
                    newImageId 	= upgrade.getUpgradeImageAssetId(),
                    newBarId 	= upgrade.getUpgradeBarAssetId();


                modelAssets.items[newImageId] 	= modelAssets.items[oldImageId];
                modelAssets.items[newBarId] 	= modelAssets.items[oldBarId];
                delete modelAssets.items[oldImageId];
                delete modelAssets.items[oldBarId];
            });
        },
        updateItemId : function(oldItemId, newItemId) {

            var modelAssets = this.getModelAssets();

            _.each([this.goodsMap, this.marketItemsMap, this.categoryMap, modelAssets.items, modelAssets.categories], function(map) {
                if (_.has(map, oldItemId)) {
                    map[newItemId] = map[oldItemId];
                    delete map[oldItemId];
                }
            });
        },
        removeItemId : function(id) {

            var modelAssets = this.getModelAssets();

            _.each([this.goodsMap, this.marketItemsMap, this.categoryMap, modelAssets.items, modelAssets.categories], function(map) {
                if (_.has(map, id)) delete map[id];
            });
        },
        setBalance : function(balances) {
            var currencies = this.get("currencies");
            _.each(balances, function(attributes, currency) {
                currencies.get(currency).set("balance", attributes.balance);
            });
            return this;
        },
        getBalance : function(currency) {
            return this.get("currencies").get(currency).get("balance");
        },
        updateVirtualGoods : function(goods) {
            var _this = this;
            _.each(goods, function(attributes, good) {
                good = _this.goodsMap[good];
                if (attributes.balance){
                    good.set("balance", attributes.balance);
                    // add animation
                    $(".expanded .balance-wrap").addClass("changed");
                    setTimeout(function(){
                        $(".balance-wrap").removeClass("changed");
                    }, 1500);

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
            });
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
            options.itemId = Currency.generateNameFor(options.name);
            var currency = new Currency(options);
            this.get("currencies").add(currency);
            return currency;
        },
        addNewCategory : function(options) {
            var category = new Category(options);
            this.get("categories").add(category);
            return category;
        },
        // TODO: Deal with upgradables
        addNewVirtualGood : function(options) {
            var firstCurrencyId = this.getFirstCurrency().id,
                assetUrl        = options.assetUrl || "";

            var GoodType;

            switch(options.type) {
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

            var good = new GoodType({
                itemId  : _.uniqueId("untitled_good_"),
                type    : options.type || "singleUse"
            });
            good.setCurrencyId(firstCurrencyId);

            // Update upgradable model assets whenever an item ID changes
            if (options.type === "upgradable") {
                this.listenTo(good, "change:itemId", this.updateUpgradeModelAssets);
            }

            // Ensure the model has an asset in the `modelAssets`
            // before adding it to the collection (which triggers a render)
            var modelAssets = this.getModelAssets();

            if (options.type === "upgradable") {
                modelAssets.items[good.getEmptyUpgradeBarAssetId()] = assetUrl;
            } else {
                modelAssets.items[good.id] = assetUrl;
            }

            var categoryId  = options.categoryId || this.get("categories").first().id,
                category    = this.get("categories").get(categoryId);

            // Add good to other maps
            this.goodsMap[good.id] = good;
            this.categoryMap[good.id] = category;


            // For upgradable goods, enforce at least one level.
            // Assumes that the good is already mapped in the goods map
            if (options.type === "upgradable") {
                this.addUpgrade({
                    goodItemId  : good.id,
                    assetUrl    : assetUrl
                });
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

            // Ensure the upgrade has its assets in the `modelAssets`
            // before triggering the `change` event
            var modelAssets = this.getModelAssets();
            modelAssets.items[upgrade.getUpgradeImageAssetId()] = options.assetUrl;
            modelAssets.items[upgrade.getUpgradeBarAssetId()]   = options.assetUrl;

            // Manually trigger the event for rendering
            good.trigger("change");

            // Add upgrade to other maps
            this.goodsMap[upgrade.id] = upgrade;

            return upgrade;
        },
        removeUpgrade : function(upgrade) {
            var modelAssets = this.getModelAssets();

            // Remove from mappings and delete upgrade-specific assets
            this.removeItemId(upgrade.id);
            delete modelAssets.items[upgrade.getUpgradeImageAssetId()];
            delete modelAssets.items[upgrade.getUpgradeBarAssetId()];

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
                itemId              : _.uniqueId("untitled_currency_pack_"),
                currency_itemId     : options.currency_itemId,
                currency_amount     : 1000
            });

            // Ensure the model has an asset assigned directly and in the `modelAssets`
            // before adding it to the collection (which triggers a render)
            var modelAssets = this.getModelAssets();
            modelAssets.items[currencyPack.id] = options.assetUrl || "";

            // Add pack to currency
            var currency_itemId = options.currency_itemId;
            this.get("currencies").get(currency_itemId).get("packs").add(currencyPack, {at: 0});

            // Add pack to other maps
            this.marketItemsMap[currencyPack.id] = currencyPack;

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

            var currencyId  = pack.getCurrencyId(),
            currency    = this.get("currencies").get(currencyId);

            // Remove from mappings
            this.removeItemId(pack.id);

            // Remove from category
            currency.get("packs").remove(pack);
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
            this.get("categories").remove(category);
        },
        removeCurrency : function(currency) {

            //
            // Remove all goods associated with this currency
            //
            _.each(this.goodsMap, _.bind(function(good) {

                if (good.getCurrencyId() === currency.id) {

                    // Keep the category before deleting the mapping to it
                    var category        = this.categoryMap[good.id],
                    categoryGoods   = category.get("goods");

                    // First remove from mappings, then remove from collection
                    this.removeItemId(good.id);
                    categoryGoods.remove(good);
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
            this.get("currencies").remove(currency);
        },
        getFirstCategory : function() {
            return this.get("categories").first();
        },
        getFirstCurrency: function() {
            return this.get("currencies").first();
        },
        changeCategoryName : function(id, newName) {

            var oldItemId   = id,
                newItemId   = newName,
                category    = this.get("categories").get(id);

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
                currency    = this.get("currencies").get(id);

            // First ensure model assets are updated
            this.updateItemId(oldItemId, newItemId);

            // Update all goods associated with this currency
            _.each(this.goodsMap, function(good) {
                if (good.getCurrencyId() === oldItemId) good.setCurrencyId(newItemId);
            });

            // Update all currency packs associated with this currency
            _.each(this.marketItemsMap, function(currencyPack) {
                if (currencyPack.getCurrencyId() === oldItemId) currencyPack.setCurrencyId(newItemId);
            });

            // then set the new values
            currency.set({
                name    : newName,
                itemId  : newItemId
            });

            return currency;
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
            delete json.supportedFeatures;


            // Remove the base URL that was injected by the store bridge (only for loading assets in the dashboard)
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