define(["backboneRelational"], function() {

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
            equipped    : false
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