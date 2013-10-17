define("assetManager", ["underscore", "utils"], function(_, Utils) {

    var AssetManager = function(json) {

        // Save the raw JSON internally
        this._json = json;
    };

    _.extend(AssetManager.prototype, {
        getOfferWallsLinkAsset : function() {
            return Utils.getByKeychain(this._json, ["theme", "offerWalls", "menuLinkImage"]);
        }
    });

    return AssetManager;
});
