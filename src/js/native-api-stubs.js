/**
 * This set of functions is an API implemented by the native code and is provided for the Javascript code to invoke.
 * Since the native code should provide this interface, it is currently implemented with stubs.
 */
define("nativeApiStubs", function(){
    var _jsAPI;

    var API = {
        log : function() {
            console.log(arguments);
        },
        wantsToBuyItem : function(itemId) {
            var model;

            if (model = SoomlaJS.store.getItem(itemId)) {
                this.log("wantsToBuyVirtualGoods", arguments);
                this._wantsToBuyVirtualGoods(model, function(model) {
                    return {balance: model.get("balance") + 1};
                });
            } else if (model = SoomlaJS.store.getMarketItem(itemId)) {
                this._wantsToBuyMarketItem(model);
            }
        },
        _wantsToBuyVirtualGoods : function(model, createMap) {

            // Increment and update good balance
            var goods = {};
            goods[model.id] = createMap(model);

            if (!model.isMarketPurchaseType()) {

                // The good is purchased via other virtual items
                var balances    = {},
                    currencyId  = model.getCurrencyId(),
                    newBalance  = SoomlaJS.store.getBalance(currencyId) - model.getPrice(currencyId);

                // Check if there's enough balance for the purchase
                if (newBalance < 0) {
                    _jsAPI.errInsufficientFunds(currencyId);
                    return;
                }

                // Update currency and goods balance
                balances[currencyId] = {balance: newBalance};
                _jsAPI.currenciesUpdated(balances);
                _jsAPI.goodsUpdated(goods);
            } else {

                // Start market purchase and simulate a delay before actually giving the good
                _jsAPI.marketPurchaseStarted();
                setTimeout(function() {
                    _jsAPI.goodsUpdated(goods);
                }, 1000);
            }

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
        wantsToUpgradeVirtualGood : function(model) {
            this.log("wantsToUpgradeVirtualGood", arguments);
            this._wantsToBuyVirtualGoods(model, function(model) {
                return {currentUpgrade : model.getNextUpgrade().id };
            });
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