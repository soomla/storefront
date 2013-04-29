define({
    uiReady : function() {
        document.location = "soomla:uiReady";
    },
    storeInitialized : function() {
        document.location = "soomla:storeInitialized";
    },
    wantsToLeaveStore : function() {
        document.location = "soomla:wantsToLeaveStore";
    },
    wantsToBuyVirtualGoods : function(itemId) {
        document.location = "soomla:wantsToBuyVirtualGoods:" + itemId;
    },
    wantsToBuyMarketItem : function(productId) {
        document.location = "soomla:wantsToBuyMarketItem:" + productId;
    },
    wantsToRestorePurchases : function() {
        document.location = "soomla:wantsToRestorePurchases";
    },
    wantsToEquipGoods : function(itemId) {
        document.location = "soomla:wantsToEquipGoods:" + itemId;
    },
    wantsToUnequipGoods : function(itemId) {
        document.location = "soomla:wantsToUnequipGoods:" + itemId;
    },
    requestEarnedCurrency : function(provider) {
        document.location = "soomla:requestEarnedCurrency:" + provider;
    },
    playPop : function() {
        document.location = "soomla:playPop";
    }
});