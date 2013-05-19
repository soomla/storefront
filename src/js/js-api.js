/**
 * This set of functions is an API implemented by the Javascript code and is provided for the native code to invoke.
 */
define({
    // in case Market purchases are not supported we only want to show the goods store
    disableCurrencyStore : function() {
        // Raise a flag to indicate that the currency store can't be opened (probably due to connectivity issues)
        SoomlaJS.store.set("isCurrencyStoreDisabled", true);
    },
    /**
     *
     * Android signature : currencyPurchaseEnded(JSONObject balances)
     */
    currencyBalanceChanged: function (balances) {
        // TODO: Test if this condition is needed
        if (!!SoomlaJS.storeView) {
            SoomlaJS.storeView.closeDialog();
        }
        SoomlaJS.store.setBalance(balances);
    },
    /**
     *
     * Android signature : goodsPurchaseEnded(JSONObject virtualGoods)
     */
    goodsUpdated : function(virtualGoods) {
        SoomlaJS.store.updateVirtualGoods(virtualGoods);
    },
    nonConsumablesUpdated : function(nonConsumables) {
        SoomlaJS.store.updateNonConsumables(nonConsumables);
    },
    purchasesRestored : function(nonConsumables) {
        SoomlaJS.store.restorePurchases(nonConsumables);
    },
    insufficientFunds : function(currency) {
        SoomlaJS.storeView.openDialog(currency);
    },
    unexpectedError: function () {
        // TODO: Test if this condition is needed
        if (!!SoomlaJS.storeView) {
            SoomlaJS.storeView.closeDialog();
        }
        console.log("An unexpected error has occurred.  Please try again.");
    },
    notEnoughGoods : function(itemId) {
        // TODO: Fix broken get for attribute that doesn't exist
        var good = SoomlaJS.store.get("virtualGoods").get(itemId);
        alert("Cannot use " + good.get("name"));
    },
    // The native UI is going to be destroyed
    destroy : function() {
        alert("Sorry bub, not implemented yet.");
    },
    marketPurchaseStarted : function() {
        SoomlaJS.storeView.openDialog();
    },
    marketPurchaseCancelled : function() {
        SoomlaJS.storeView.closeDialog();
    },
    changeViewToItem: function (itemId) {
        SoomlaJS.storeView.changeViewToItem(itemId);
    }
});