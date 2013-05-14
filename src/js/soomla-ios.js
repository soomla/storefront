define({
    _callNative : function(command) {

        var iFrame = document.createElement("IFRAME");

        iFrame.setAttribute("src", "soomla:" + command);

        document.body.appendChild(iFrame); 

        iFrame.parentNode.removeChild(iFrame);

        iFrame = null;

    },
    uiReady : function() {
        this._callNative("uiReady");
    },
    storeInitialized : function() {
        this._callNative("storeInitialized");
    },
    wantsToLeaveStore : function() {
        this._callNative("wantsToLeaveStore");
    },
    wantsToBuyVirtualGoods : function(itemId) {
        this._callNative("wantsToBuyVirtualGoods:" + itemId);
    },
    wantsToBuyMarketItem : function(productId) {
        this._callNative("wantsToBuyMarketItem:" + productId);
    },
    wantsToRestorePurchases : function() {
        this._callNative("wantsToRestorePurchases");
    },
    wantsToEquipGoods : function(itemId) {
        this._callNative("wantsToEquipGoods:" + itemId);
    },
    wantsToUnequipGoods : function(itemId) {
        this._callNative("wantsToUnequipGoods:" + itemId);
    },
    requestEarnedCurrency : function(provider) {
        this._callNative("requestEarnedCurrency:" + provider);
    },
    playPop : function() {
        this._callNative("playPop");
    },


    //
    // New Model API
    //
    wantsToBuyItem : function(model) {
        this._callNative("wantsToBuyItem:" + model.toJSON().itemId);
    },
    wantsToRestoreTransactions : function() {
        this._callNative("wantsToRestoreTransactions");
    },
    wantsToUpgradeVirtualGood : function(model) {
        this._callNative("wantsToUpgradeVirtualGood:" + model.toJSON().itemId);
    }
});
