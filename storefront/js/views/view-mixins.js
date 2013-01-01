define({
    wantsToBuyVirtualGoods : function(model) {
        this.nativeAPI.wantsToBuyVirtualGoods(model.toJSON().itemId);
    },
    wantsToBuyMarketItem : function(model) {
        this.nativeAPI.wantsToBuyMarketItem(model.toJSON().productId);
    },
    wantsToEquipGoods : function(model) {
        this.nativeAPI.wantsToEquipGoods(model.toJSON().itemId);
    },
    wantsToUnequipGoods : function(model) {
        this.nativeAPI.wantsToUnequipGoods(model.toJSON().itemId);
    },
    wantsToLeaveStore : function() {
        this.nativeAPI.wantsToLeaveStore();
    },
    playSound :function() {
        this.nativeAPI.playPop();
        return this;
    }
});