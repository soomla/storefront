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
        wantsToBuyVirtualGoods : function(model) {
            this.log("wantsToBuyVirtualGoods", arguments);
            var goods       = {},
                balances    = {},
                currencyId  = model.getCurrencyId(),
                newBalance  = SoomlaJS.store.getBalance(currencyId) - model.getPrice(currencyId);

            // Check if there's enough balance for the purchase
            if (newBalance < 0) {
                _jsAPI.insufficientFunds(currencyId);
                return;
            }

            // Increment good balance
            goods[model.id] = {balance: model.get("balance") + 1};
            // Update currency balance
            balances[currencyId] = newBalance;

            _jsAPI.goodsUpdated(goods);
            _jsAPI.currencyBalanceChanged(balances);
        },
        wantsToBuyMarketItem : function(model) {
            this.log("wantsToBuyMarketItem", arguments);

            var amount = model.get("amount");

            // If a market item has the amount field it's a consumable market item (i.e. currency pack)
            if (amount) {
                SoomlaJS.storeView.openDialog(null);
                // Calculate and assign the new currency balance
                var balances    = {},
                    currencyId  = model.get("currency_itemId"),
                    newBalance  = SoomlaJS.store.getBalance(currencyId) + amount;

                balances[currencyId] = newBalance;
                _jsAPI.currencyBalanceChanged(balances);
            } else {

                // The market item has no amount and is thus a non-consumable (i.e. "Remove Ads")
                // Mark it as "owned"
                var nonConsumables = {};
                nonConsumables[model.id] = {owned : true};
                _jsAPI.purchasesRestored(nonConsumables);
            }
        },
        wantsToRestorePurchases : function() {
            this.log("wantsToRestorePurchases", arguments);

            _jsAPI.purchasesRestored();
        },
        wantsToEquipGoods : function(model) {
            this.log("wantsToEquipGoods", arguments);
            var goods = {};

            // First unequip all other goods in category ("single" equipping enforcement)
            var categoryId      = model.get("categoryId"),
                categoryGoods   = SoomlaJS.store.get("categories").get(categoryId).get("goods");
            console.dir(categoryGoods.toJSON());
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
        playPop                         : function()        { this.log("playPop", arguments);                   },
        injectJsApi : function(jsAPI) {
            _jsAPI = jsAPI;
        }
    };
    return API;
});