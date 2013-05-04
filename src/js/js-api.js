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
     * @param boolean
     */
    currencyBalanceChanged : function(balances) {

        // TODO: Chaim - close the dialog from here, before the balances are set,  and remove the alert
        alert("Close dialog now");
        SoomlaJS.store.setBalance(balances);
    },
    /**
     * Android signature : goodsPurchaseEnded(JSONObject virtualGoods)
     * @param boolean
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
    unexpectedError : function() {


        // TODO: Chaim - close the dialog from here, before the balances are set,  and remove the alert
        alert("unexpectedError arrived");
        console.log("An unexpected error has occurred.  Please try again.");
    },
    notEnoughGoods : function(itemId) {
        var good = SoomlaJS.store.get("virtualGoods").get(itemId);
        alert("Cannot use " + good.get("name"));
    },
    // The native UI is going to be destroyed
    destroy : function() {
        alert("Sorry bub, not implemented yet.");
    },
    marketPurchaseStarted : function() {

        // TODO: Chaim - open the dialog from here and remove the alert
        alert("marketPurchaseStarted arrived");
    },
    marketPurchaseCancelled : function() {

        // TODO: Chaim - close the dialog from here and remove the alert
        alert("marketPurchaseCancelled arrived");
    }
});