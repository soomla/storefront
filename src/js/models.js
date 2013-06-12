define("models", ["backbone", "backboneRelational"], function(Backbone) {


    /**
     * Moves a model to the given index, if different from its current index. Handy
     * for shuffling models after they've been pulled into a new position via
     * drag and drop.
     */
    Backbone.Collection.prototype.move = function(model, toIndex) {
        var fromIndex = this.indexOf(model);
        if (fromIndex == -1) {
            throw new Error("Can't move a model that's not in the collection")
        }
        if (fromIndex !== toIndex) {
            this.models.splice(toIndex, 0, this.models.splice(fromIndex, 1)[0]);
            this.trigger("reset");
        }
    };



    var CurrencyPack = Backbone.RelationalModel.extend({
        idAttribute : "itemId",
        getCurrencyId : function() {
            return this.get("currency_itemId");
        },
        getPrice : function() {
            return this.get("purchasableItem").marketItem.price;
        }
    });
    var VirtualGood = Backbone.RelationalModel.extend({
        idAttribute : "itemId",
        defaults : {
            balance     : 0,
            equipped    : false,
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
        }
    });

    var NonConsumable = Backbone.RelationalModel.extend({
        idAttribute : "itemId"
    });


    var CurrencyPacksCollection     = Backbone.Collection.extend({ model : CurrencyPack }),
        VirtualGoodsCollection      = Backbone.Collection.extend({ model : VirtualGood  }),
        NonConsumablesCollection    = Backbone.Collection.extend({ model : NonConsumable  });

    var Currency = Backbone.RelationalModel.extend({
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

    var Category = Backbone.RelationalModel.extend({
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

    var CategoryCollection          = Backbone.Collection.extend({ model : Category }),
        VirtualCurrencyCollection   = Backbone.Collection.extend({ model : Currency });


    var Store = Backbone.RelationalModel.extend({
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

            // Populate goods map, flag each good with its type
            _.each(this.get("goods"), function(rawGoods, type) {
                _.each(rawGoods, function(rawGood) {
                    rawGood.type = type;
                    var good = new VirtualGood(rawGood);
                    goodsMap[good.id] = good;
                });
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

            _.each([this.goodsMap, this.marketItemsMap, this.categoryMap, this.get("modelAssets").items], function(map) {
                if (_.has(map, oldItemId)) {
                    map[newItemId] = map[oldItemId];
                    delete map[oldItemId];
                }
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
        addNewVirtualGood : function(options) {
            var firstCurrencyId = this.get("currencies").at(0).id;
            var good = new VirtualGood({
                itemId  : _.uniqueId("untitled_good_"),
                type    : options.type || "singleUse"
            });
            good.get("purchasableItem").pvi_itemId = firstCurrencyId;

            // Ensure the model has an asset assigned directly and in the `modelAssets`
            // before adding it to the collection (which triggers a render)
            var modelAssets = this.get("modelAssets");
            modelAssets.items[good.id] = "";

            var categoryId = options.categoryId || this.get("categories").first().id;
            this.get("categories").get(categoryId).get("goods").add(good, {at: 0});

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
            var modelAssets = this.get("modelAssets");
            modelAssets.items[currencyPack.id] = "";

            var currency_itemId = options.currency_itemId;
            this.get("currencies").get(currency_itemId).get("packs").add(currencyPack, {at: 0});

            return currencyPack;
        },
        removeCategory : function(category) {
            this.get("categories").remove(category);
        },
        removeCurrency : function(currency) {
            this.get("currencies").remove(currency);
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
            var json = Backbone.RelationalModel.prototype.toJSON.apply(this);


            // Remove all fields injected into models during runtime
            // e.g. balance, equipped...
            _.each(json.currencies, function(currency) {
                delete currency.balance;
            });
            _.each(json.categories, function(category) {
                _.each(category.goods, function(good) {
                    delete good.balance;
                    delete good.equipped;
                });
            });


            // Construct categories and goods
            json.goods = {goodUpgrades : [], lifetime : [], equippable : [], singleUse : [], goodPacks : []};
            _.each(json.categories, function(category) {

                category.goods_itemIds = [];

                _.each(category.goods, function(good) {

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
            if (options.assetNameMap) {
                _.each(json.modelAssets.items, function(name, itemId) {
                    json.modelAssets.items[itemId] = options.assetNameMap[itemId];
                });
                _.each(json.modelAssets.categories, function(name, itemId) {
                    json.modelAssets.categories[itemId] = options.assetNameMap[itemId];
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
        VirtualGoodsCollection      : VirtualGoodsCollection,
        CurrencyPack                : CurrencyPack,
        Store                       : Store,
        Currency                    : Currency,
        Category                    : Category,
        VirtualCurrencyCollection   : VirtualCurrencyCollection,
        CurrencyPacksCollection     : CurrencyPacksCollection,
        NonConsumable               : NonConsumable,
        RelationalModel             : Backbone.RelationalModel
    };
});