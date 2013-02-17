/**
 * This set of functions is an API implemented by the native code and is provided for the Javascript code to invoke.
 * Since the native code should provide this interface, it is currently implemented with stubs.
 */
define({
    log : function() {
        console.log(arguments);
    },
    wantsToBuyVirtualGoods          : function(model)   { this.log("wantsToBuyVirtualGoods", arguments);    },
    wantsToBuyMarketItem            : function(model)   { this.log("wantsToBuyMarketItem", arguments);      },
    wantsToEquipGoods               : function(model)   { this.log("wantsToEquipGoods", arguments);         },
    wantsToUnequipGoods             : function(model)   { this.log("wantsToUnequipGoods", arguments);       },
    storeInitialized                : function()        { this.log("storeInitialized", arguments);          },
    wantsToLeaveStore               : function()        { this.log("wantsToLeaveStore", arguments);         },
    requestEarnedCurrency           : function(provider){ this.log("requestEarnedCurrency", arguments);     },
    playPop                         : function()        { this.log("playPop", arguments);                   }
});