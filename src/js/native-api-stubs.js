/**
 * This set of functions is an API implemented by the native code and is provided for the Javascript code to invoke.
 * Since the native code should provide this interface, it is currently implemented with stubs.
 */
define(function(){
    var _jsAPI;

    var API = {
        log : function() {
            console.log(arguments);
        },
        wantsToBuyItem : function(itemId) {
            var model;

            if (model = SoomlaJS.store.getItem(itemId)) {
                this._wantsToBuyVirtualGoods(model);
            } else if (model = SoomlaJS.store.getMarketItem(itemId)) {
                this._wantsToBuyMarketItem(model);
            }
        },
        _wantsToBuyVirtualGoods : function(model) {
            this.log("wantsToBuyVirtualGoods", arguments);
            var goods       = {},
                balances    = {},
                currencyId  = model.getCurrencyId(),
                newBalance  = SoomlaJS.store.getBalance(currencyId) - model.getPrice(currencyId);

            // Check if there's enough balance for the purchase
            if (newBalance < 0) {
                _jsAPI.errInsufficientFunds(currencyId);
                return;
            }

            // Increment good balance
            goods[model.id] = {balance: model.get("balance") + 1};

            // Update currency balance
            balances[currencyId] = {balance: newBalance};

            _jsAPI.goodsUpdated(goods);
            _jsAPI.currenciesUpdated(balances);
        },
        _wantsToBuyMarketItem : function(model) {
            this.log("wantsToBuyMarketItem", arguments);

            var amount = model.get("currency_amount");

            // If a market item has the amount field it's a consumable market item (i.e. currency pack)
            if (amount) {

                // Calculate and assign the new currency balance
                var balances    = {},
                    currencyId  = model.getCurrencyId(),
                    newBalance  = SoomlaJS.store.getBalance(currencyId) + amount;

                balances[currencyId] = {balance: newBalance};

                _jsAPI.marketPurchaseStarted();
                setTimeout(function() {
                    _jsAPI.currenciesUpdated(balances);
                }, 1000);
            } else {

                // The market item has no amount and is thus a non-consumable (i.e. "Remove Ads")
                // Mark it as "owned"
                var nonConsumables = {};
                nonConsumables[model.id] = {owned : true};
                _jsAPI.purchasesRestored(nonConsumables);

                // TODO: Add a timeout for showing the dialog
            }
        },
        wantsToRestorePurchases : function() {
            this.log("wantsToRestorePurchases", arguments);

            _jsAPI.purchasesRestored();
        },
        wantsToEquipGoods : function(model) {
            this.log("wantsToEquipGoods", arguments);
            var goods           = {},
                categoryGoods   = SoomlaJS.store.getGoodCategory(model.id).get("goods");

            // First unequip all other owned goods in category ("single" equipping enforcement)
            // TODO: Change the logic to support different scopes of equipping, i.e. single, category, global
            categoryGoods.each(function(good) {
                if (good.get("balance") > 0) goods[good.id] = {equipped: false};
            });

            // Then equip the given good
            goods[model.id] = {equipped: !model.get("equipped")};
            _jsAPI.goodsUpdated(goods);
        },
        wantsToUnequipGoods : function(model) {
            this.log("wantsToUnequipGoods", arguments);
            var goods = {};
            goods[model.id] = {equipped: !model.get("equipped")};
            _jsAPI.goodsUpdated(goods);
        },
        storeInitialized                : function()        { this.log("storeInitialized", arguments);          },
        wantsToLeaveStore               : function()        { this.log("wantsToLeaveStore", arguments);         },
        requestEarnedCurrency           : function(provider){ this.log("requestEarnedCurrency", arguments);     },
        playSound                       : function()        { this.log("playSound", arguments); return this;    },
        injectJsApi : function(jsAPI) {
            _jsAPI = jsAPI;
        }
    };
    return API;
});