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
        wantsToBuyMarketItem : function(productId) {
            document.location = "soomla:wantsToBuyMarketItem:" + productId;
        }
    };
});