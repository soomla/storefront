define("models", ["backbone", "utils", "backboneRelational"], function(Backbone, Utils) {

    // Cache base classes.
    var RelationalModel = Backbone.RelationalModel,
        Collection 		= Backbone.Collection;



    /**
     * Moves a model to the given index, if different from its current index. Handy
     * for shuffling models after they've been pulled into a new position via
     * drag and drop.
     */
    Collection.prototype.move = function(model, toIndex) {
        var fromIndex = this.indexOf(model);
        if (fromIndex == -1) {
            throw new Error("Can't move a model that's not in the collection")
        }
        if (fromIndex !== toIndex) {
            this.models.splice(toIndex, 0, this.models.splice(fromIndex, 1)[0]);
            this.trigger("reset");
        }
    };



    var CurrencyPack = RelationalModel.extend({
        idAttribute : "itemId",
        defaults : {
            name : "Untitled"
        },
        getCurrencyId : function() {
            return this.get("currency_itemId");
        },
        getPrice : function() {
            return this.get("purchasableItem").marketItem.price;
        },
        setPrice : function(price) {
            // Use jQuery's extend to achieve a deep clone
            var purchasableItem = $.extend(true, {}, this.get("purchasableItem"));
            purchasableItem.marketItem.price = price;
            return this.set("purchasableItem", purchasableItem);
        },
        setAmount : function(amount) {
            return this.set("currency_amount", amount);
        }
    });

    var VirtualGood = RelationalModel.extend({
        idAttribute : "itemId",
        defaults : {
            name        : "Untitled",
            purchasableItem : {
                pvi_itemId: "currency_coins",
                pvi_amount: 100,
                purchaseType: "virtualItem"
            }
        },
        getCurrencyId : function() {
            return this.get("purchasableItem").pvi_itemId;
        },
        getPrice : function() {
            return this.get("purchasableItem").pvi_amount;
        },
        setCurrencyId : function(currencyId) {
            return this._setPurchasableItem({pvi_itemId : currencyId});
        },
        setPrice : function(price) {
            return this._setPurchasableItem({pvi_amount : price});
        },
        _setPurchasableItem : function(options) {

            // Instead of mutating the model's attribute, clone it to a new one and mutate that.
            // Backbone will trigger the change event only this way.
            var purchasableItem = _.extend({}, this.get("purchasableItem"), options);
            return this.set("purchasableItem", purchasableItem);
        }
    });

    var SingleUseGood = VirtualGood.extend({

        // Single use goods should have a balance of 0 by default
        defaults : $.extend(true, {balance : 0}, VirtualGood.prototype.defaults)
    });

    var EquippableGood = SingleUseGood.extend({

        // Equippable goods should, by default, have a balance of 0 and not be equipped
        defaults : $.extend(true, {equipped : false}, SingleUseGood.prototype.defaults)
    });

    var LifetimeGood = SingleUseGood.extend();

    var Upgrade = VirtualGood.extend({});

    var UpgradeCollection = Collection.extend({ model : Upgrade });
    var UpgradableGood = VirtualGood.extend({
        relations: [
            {
                type: Backbone.HasMany,
                key: 'upgrades',
                relatedModel: Upgrade,
                collectionType: UpgradeCollection,
                reverseRelation: {
                    includeInJSON: 'id'
                }
            }
        ]
    });


    var NonConsumable = RelationalModel.extend({
        idAttribute : "itemId"
    });


    var CurrencyPacksCollection     = Collection.extend({ model : CurrencyPack }),
        VirtualGoodsCollection      = Collection.extend({ model : VirtualGood  }),
        NonConsumablesCollection    = Collection.extend({ model : NonConsumable  });

    var Currency = RelationalModel.extend({
        defaults : {
            name    : "coins",
            balance : 0
        },
        relations: [
            {
                type: Backbone.HasMany,
                key: 'packs',
                relatedModel: CurrencyPack,
                collectionType: CurrencyPacksCollection,
                reverseRelation: {
                    includeInJSON: 'id'
                }
            }
        ],
        idAttribute : "itemId"

    }, {
        generateNameFor : function(name) {
            return "currency_" + name.snakeCase();
        }
    });

    var Category = RelationalModel.extend({
        idAttribute: "name",
        defaults : {
            name    : "General"
        },
        relations: [
            {
                type: Backbone.HasMany,
                key: 'goods',
                relatedModel: VirtualGood,
                collectionType: VirtualGoodsCollection,
                reverseRelation: {
                    includeInJSON: 'id'
                }
            }
        ]
    });

    var CategoryCollection          = Collection.extend({ model : Category }),
        VirtualCurrencyCollection   = Collection.extend({ model : Currency });


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
            _.bindAll(this, "getBalance", "setBalance", "updateVirtualGoods");

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
                });
            });


            // Now, add upgrades to existing upgradable goods
            _.each(this.get("goods").goodUpgrades, function(rawUpgrade) {
                var upgrade = new Upgrade(rawUpgrade);
                var good = goodsMap[upgrade.get("good_itemId")];
                good.get("upgrades").add(upgrade);
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
                    goods = category.get("goods");

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
        setItemAsset : function(model, url) {

            // Update asset map
            this.getModelAssets().items[model.id] = url;

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
        // TODO: Deal with upgradables and equippables
        updateVirtualGoods : function(goods) {
            var $this = this;
            _.each(goods, function(attributes, good) {
                var good = $this.goodsMap[good];
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
            var firstCurrencyId = this.getFirstCurrency().id;

            var GoodType;

            switch(options.type) {
                case "equippable":
                    GoodType = EquippableGood;
                    break;
                case "lifetime":
                    GoodType = LifetimeGood;
                    break;
                default:
                    GoodType = SingleUseGood;
                    break;
            }

            var good = new GoodType({
                itemId  : _.uniqueId("untitled_good_"),
                type    : options.type || "singleUse"
            });
            good.get("purchasableItem").pvi_itemId = firstCurrencyId;

            // Ensure the model has an asset assigned directly and in the `modelAssets`
            // before adding it to the collection (which triggers a render)
            var modelAssets = this.getModelAssets();
            modelAssets.items[good.id] = options.assetUrl || "";

            // Add good to category
            var categoryId  = options.categoryId || this.get("categories").first().id,
                category    = this.get("categories").get(categoryId);
            category.get("goods").add(good, {at: 0});

            // Add good to other maps
            this.goodsMap[good.id] = good;
            this.categoryMap[good.id] = category;

            return good;
        },
        addNewCurrencyPack : function(options) {
            var currencyPack = new CurrencyPack({
                purchasableItem : {
                    marketItem : {
                        consumable  : 1,
                        price       : 0.99,
                        productId   : "untitled_currency_pack"
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
        // TODO: Deal with upgradables
        removeVirtualGood : function(good) {
            var category = this.categoryMap[good.id];

            // Remove from mappings
            this.removeItemId(good.id);

            // Remove from category
            category.get("goods").remove(good);
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

                    // TODO: Deal with upgradables and equippables
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
                    json.goods[good.type].push(good);
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