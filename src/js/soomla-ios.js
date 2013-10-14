define("soomlaiOS", {
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
    wantsToRestorePurchases : function() {
        this._callNative("wantsToRestorePurchases");
    },
    wantsToEquipGoods : function(itemId) {
        this._callNative("wantsToEquipGoods:" + itemId);
    },
    wantsToUnequipGoods : function(itemId) {
        this._callNative("wantsToUnequipGoods:" + itemId);
    },

    // TODO: Check if used, if not - remove
    requestEarnedCurrency : function(provider) {
        this._callNative("requestEarnedCurrency:" + provider);
    },
    playSound : function(filePath) {
        filePath || (filePath = "pop.mp3");
        this._callNative("playSound:" + filePath);
        return this;
    },


    //
    // New Model API
    //
    wantsToBuyItem : function(itemId) {
        this._callNative("wantsToBuyItem:" + itemId);
    },
    wantsToRestoreTransactions : function() {
        this._callNative("wantsToRestoreTransactions");
    },
    wantsToUpgradeVirtualGood : function(itemId) {
        this._callNative("wantsToUpgradeVirtualGood:" + itemId);
    },
    wantsToOpenOfferWall : function(id) {
        this._callNative("wantsToOpenOfferWall:" + id);
    }
});
