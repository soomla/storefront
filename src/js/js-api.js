/**
 * This set of functions is an API implemented by the Javascript code and is provided for the native code to invoke.
 */
define("jsAPI", {
    // in case Market purchases are not supported we only want to show the goods store
    disableCurrencyStore : function() {
        // Raise a flag to indicate that the currency store can't be opened (probably due to connectivity issues)
        SoomlaJS.store.set("isCurrencyStoreDisabled", true);
    },
    currenciesUpdated : function(balances) {
        SoomlaJS.store.setBalance(balances);
    },
    goodsUpdated : function(virtualGoods) {
        SoomlaJS.store.updateVirtualGoods(virtualGoods);
    },
    nonConsumablesUpdated : function(nonConsumables) {
        SoomlaJS.store.updateNonConsumables(nonConsumables);
    },
    purchasesRestored : function(nonConsumables) {
        SoomlaJS.store.restorePurchases(nonConsumables);
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


    //
    // Market related functions
    //

    marketPurchaseStarted : function() {
        SoomlaJS.storeView.openDialog();
    },
    marketPurchaseCancelled : function() {
        SoomlaJS.storeView.closeDialog();
    },
    billingSupported : function() {
        // TODO: implement if needed
    },


    //
    // Restore transactions
    //

    restoreTransactionsStarted : function() {
        SoomlaJS.storeView.openMessageDialog("Restoring transactions...");
    },
    transactionsRestored : function() {
        SoomlaJS.storeView.closeDialog();
    },


    //
    // Error functions
    //

    errInsufficientFunds : function(currencyId) {
        SoomlaJS.storeView.openDialog(currencyId);
    },
    errItemNotFound : function(itemId) {
        SoomlaJS.storeView.openMessageDialog("Error: " + this._getItemName(itemId) + " not found");
    },
    errNotEnoughGoods : function(itemId) {
        SoomlaJS.storeView.openMessageDialog("Error: not enough goods of type " + this._getItemName(itemId));
    },
    errUnexpected : function() {
        SoomlaJS.storeView.openMessageDialog("Unexpected error");
    },
    errBillingNotSupported : function() {
        SoomlaJS.storeView.openMessageDialog("Billing is not supported. Please check your internet connection and try again.");
    },


    //
    // Navigation functions
    //

    changeViewToItem: function (itemId) {
        SoomlaJS.storeView.changeViewToItem(itemId);
    },


    //
    // User messaging functions
    //

    openMessageDialog : function(text) {
        SoomlaJS.storeView.openMessageDialog(text);
    },


    // Private methods
    _getItemName: function(itemId) {
        var item = SoomlaJS.store.getItem(itemId);
        return (item && item.get) ? item.get("name") : "item";
    }
});