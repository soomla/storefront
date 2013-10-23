define("soomlaAndroid", {
    wantsToLeaveStore : function() {
        this.nativeAPI.wantsToLeaveStore();
    },
    wantsToBuyVirtualGoods : function(model) {
        this.nativeAPI.wantsToBuyVirtualGoods(model.toJSON().itemId);
    },
    wantsToRestorePurchases : function() {
        this.nativeAPI.wantsToRestorePurchases();
    },
    wantsToEquipGoods : function(model) {
        this.nativeAPI.wantsToEquipGoods(model.toJSON().itemId);
    },
    wantsToUnequipGoods : function(model) {
        this.nativeAPI.wantsToUnequipGoods(model.toJSON().itemId);
    },

    // TODO: Check if used, if not - remove
    requestEarnedCurrency : function(provider) {
        this.nativeAPI.requestEarnedCurrency(provider);
    },
    playSound :function(filePath) {
        filePath || (filePath = "pop.mp3");
        this.nativeAPI.playSound(filePath);
        return this;
    },


    //
    // New Model API
    //
    wantsToBuyItem : function(itemId) {
        this.nativeAPI.wantsToBuyItem(itemId);
    },
    wantsToRestoreTransactions : function() {
        this.nativeAPI.wantsToRestoreTransactions();
    },
    wantsToUpgradeVirtualGood : function(model) {
        this.nativeAPI.wantsToUpgradeVirtualGood(model.toJSON().itemId);
    },
    wantsToOpenOfferWall : function(itemId) {
        var params = JSON.stringify({
            action  : "offerwall",
            itemId  : itemId
        });
        this.nativeAPI.wantsToInitiateHook("sponsorpay", params);
    }
});