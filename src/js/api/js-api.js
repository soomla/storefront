/**
 * This set of functions is an API implemented by the Javascript code and is provided for the native code to invoke.
 */
define("jsAPI", ["underscore"], function(_) {

    return {
        currenciesUpdated : function(balances) {
            SoomlaJS.store.setBalance(balances);
        },
        goodsUpdated : function(virtualGoods) {
            SoomlaJS.store.updateVirtualGoods(virtualGoods);
        },
        notEnoughGoods : function(itemId) {
            var good = SoomlaJS.store.getItem(itemId);
            SoomlaJS.storeView.openMessageDialog("Cannot use " + good.getName());
        },
        // The native UI is going to be destroyed
        destroy : function() {
            alert("Sorry bub, not implemented yet.");
        },


        //
        // Market related functions
        //

        marketPurchaseStarted : function() {
            SoomlaJS.storeView.openLoadingDialog();
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
            SoomlaJS.storeView.openInsufficientFundsDialog(currencyId);
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
        handleMessage : function(options) {
            if (_.isString(options)) options = JSON.parse(options);
            SoomlaJS.storeView.handleMessage(options);
        },



        //
        // Functions for backward compatibility
        // Cannot be removed
        //

        nonConsumablesUpdated : function() {},


        // Private methods
        _getItemName: function(itemId) {
            var item = SoomlaJS.store.getItem(itemId);
            return (item && item.get) ? item.getName() : "item";
        }
    };
});