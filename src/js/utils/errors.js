define(function() {

    var NoSingleUseGoodsError = function(message) {
        this.message = message || "Cannot add a single use pack if no single use goods are defined";
    };
    NoSingleUseGoodsError.prototype = new Error();
    NoSingleUseGoodsError.prototype.constructor = NoSingleUseGoodsError;
    NoSingleUseGoodsError.prototype.name = "NoSingleUseGoodsError";


    return {
        NoSingleUseGoodsError : NoSingleUseGoodsError
    };
});
