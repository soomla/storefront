define(["backboneRelational"], function() {

    var CurrencyPack = Backbone.RelationalModel.extend({
        idAttribute : "itemId"
    });
    var VirtualGood = Backbone.RelationalModel.extend({
        idAttribute : "itemId",
        defaults : {
            balance     : 0,
            equipped    : false
        },
        getCurrencyId : function() {
            return _.keys(this.get("priceModel").values)[0];
        },
        getPrice : function(currencyId) {
            return this.get("priceModel").values[currencyId];
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
            balance : 0,
            itemId  : "currency_coins"
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
                key: 'virtualCurrencies',
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
            var goodsMap = this.goodsMap = {};
            this.get("categories").each(function(category) {
                category.get("goods").each(function(good) {
                    goodsMap[good.id] = good;
                });
            });
        },
        setBalance : function(balances) {
            var model = this.get("virtualCurrencies");
            _.each(balances, function(balance, currency) {
                model.get(currency).set("balance", balance);
            });
            return this;
        },
        getBalance : function(currency) {
            return this.get("virtualCurrencies").get(currency).get("balance");
        },
        updateVirtualGoods : function(goods) {
            var $this = this;

            _.each(goods, function(attributes, good) {
                var good = $this.goodsMap[good];

                if (attributes.balance)
                    good.set("balance", attributes.balance);

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

                if (attributes.price) {
                    // TODO: Support passing multiple prices in different currencies
                    // Currently this code always takes the currency of the first price it encounters
                    // regardless of the number of prices passed
                    var priceModel = _.clone(good.get("priceModel"));
                    if (_.isArray(attributes.price)) {
                        _.each(attributes.price, function(price, currency) {priceModel.values[currency] = price; });
                    } else {
                        if (priceModel.type === "static") priceModel.values = attributes.price;
                    }
                    good.set("priceModel", priceModel);
                }
            });
            return this;
        },
        updateNonConsumables : function(nonConsumables) {
            var $this = this;
            _.each(nonConsumables, function(attributes, nonConsumableId) {
                $this.get("nonConsumables").get(nonConsumableId).set(attributes);
            });
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
        VirtualCurrencyCollection   : VirtualCurrencyCollection,
        CurrencyPacksCollection     : CurrencyPacksCollection,
        NonConsumable               : NonConsumable,
        RelationalModel             : Backbone.RelationalModel
    };
});