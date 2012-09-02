define(["backboneRelational"], function() {

    var CurrencyPack = Backbone.RelationalModel.extend({});
    var Currency = Backbone.RelationalModel.extend({
        defaults : {
            name    : "coins",
            balance : 0,
            itemId  : "currency_coin"
        },
        idAttribute : "itemId"
    });
    var VirtualGood             = Backbone.RelationalModel.extend({
        idAttribute : "itemId",
        defaults : {
            balance     : 0,
            consumable  : true
        },
        initialize : function() {
            _.bindAll(this, "isConsumable");
        },
        isConsumable : function() {
            return this.get("consumable");
        }
    });


    var VirtualCurrencyCollection   = Backbone.Collection.extend({ model : Currency     }),
        CurrencyPacksCollection     = Backbone.Collection.extend({ model : CurrencyPack }),
        VirtualGoodsCollection      = Backbone.Collection.extend({ model : VirtualGood  });


    var Store = Backbone.RelationalModel.extend({
        relations: [
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
        defaults : {
            templateName        : "basic",
            templateTitle       : "Store",
            moreCurrencyText    : "Get more coins",
            orientationLanscape : false,
            templateProperties  : {
                orientation : "horizontal"
            }
        },
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
            var model = this.get("virtualGoods");
            _.each(goods, function(attributes, good) {
                var good = model.get(good);
                _.each(attributes, function(value, attribute) {
                    good.set(attribute, value);
                })
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
        VirtualCurrencyCollection   : VirtualCurrencyCollection
    };
});