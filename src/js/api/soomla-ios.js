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
    wantsToBuyVirtualGoods : function(model) {
        this._callNative("wantsToBuyVirtualGoods:" + model.toJSON().itemId);
    },
    wantsToEquipGoods : function(model) {
        this._callNative("wantsToEquipGoods:" + model.toJSON().itemId);
    },
    wantsToUnequipGoods : function(model) {
        this._callNative("wantsToUnequipGoods:" + model.toJSON().itemId);
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
    wantsToUpgradeVirtualGood : function(model) {
        this._callNative("wantsToUpgradeVirtualGood:" + model.toJSON().itemId);
    },
    wantsToInitiateHook : function(provider, options) {
        this._callNative("wantsToInitiateHook:" + provider + ":" + JSON.stringify(options));
    }
});
