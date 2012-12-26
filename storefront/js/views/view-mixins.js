define({
    wantsToBuyVirtualGoods : function(model) {
        this.nativeAPI.wantsToBuyVirtualGoods(model.toJSON().itemId);
    },
    wantsToBuyCurrencyPacks : function(model) {
        this.nativeAPI.wantsToBuyCurrencyPacks(model.toJSON().productId);
    },
    wantsToEquipGoods : function(model) {
        this.nativeAPI.wantsToEquipGoods(model.toJSON().itemId);
    },
    wantsToUnequipGoods : function(model) {
        this.nativeAPI.wantsToUnequipGoods(model.toJSON().itemId);
    },
    wantsToLeaveStore : function() {
        if (this.options.callbacks && this.options.callbacks.beforeLeave) this.options.callbacks.beforeLeave();

        // TODO: Release view bindings and destroy view
        this.nativeAPI.wantsToLeaveStore();
    },
    playSound :function() {
        this.nativeAPI.playPop();
        return this;
    }
});