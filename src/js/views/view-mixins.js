define({
    wantsToLeaveStore : function() {
        this.nativeAPI.wantsToLeaveStore();
    },
    wantsToBuyVirtualGoods : function(model) {
        this.nativeAPI.wantsToBuyVirtualGoods(model.toJSON().itemId);
    },
    wantsToBuyMarketItem : function(model) {
        this.nativeAPI.wantsToBuyMarketItem(model.toJSON().productId);
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
    wantsToBuyItem : function(model) {
        this.nativeAPI.wantsToBuyItem(model.toJSON().itemId);
    },
    wantsToRestoreTransactions : function() {
        this.nativeAPI.wantsToRestoreTransactions();
    },
    wantsToUpgradeVirtualGood : function(model) {
        this.nativeAPI.wantsToUpgradeVirtualGood(model.toJSON().itemId);
    }
});