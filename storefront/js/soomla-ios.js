define([], function() {
    return {
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
        wantsToBuyCurrencyPacks : function(productId) {
            document.location = "soomla:wantsToBuyCurrencyPacks:" + productId;
        }
    };
});