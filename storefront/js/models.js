define(["backboneRelational"], function() {

    var Category = Backbone.RelationalModel.extend({
        defaults : {
            name    : "General"
        }
    });
    var CurrencyPack = Backbone.RelationalModel.extend({
        idAttribute : "itemId"
    });
    var Currency = Backbone.RelationalModel.extend({
        defaults : {
            name    : "coins",
            balance : 0,
            itemId  : "currency_coin"
        },
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
        }
    });


    var CategoryCollection          = Backbone.Collection.extend({ model : Category     }),
        VirtualCurrencyCollection   = Backbone.Collection.extend({ model : Currency     }),
        CurrencyPacksCollection     = Backbone.Collection.extend({ model : CurrencyPack }),
        VirtualGoodsCollection      = Backbone.Collection.extend({ model : VirtualGood  });


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
                key: 'virtualGoods',
                relatedModel: VirtualGood,
                collectionType: VirtualGoodsCollection,
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
                key: 'currencyPacks',
                relatedModel: CurrencyPack,
                collectionType: CurrencyPacksCollection,
                reverseRelation: {
                    key: 'belongsTo',
                    includeInJSON: 'id'
                }
            }
        ],
        initialize : function() {
            _.bindAll(this, "getBalance", "setBalance", "updateVirtualGoods");
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
            var virtualGoods    = this.get("virtualGoods"),
                $this           = this;
            _.each(goods, function(attributes, good) {
                var good = virtualGoods.get(good);

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
        RelationalModel             : Backbone.RelationalModel
    };
});