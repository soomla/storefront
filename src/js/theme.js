define("theme", ["underscore", "utils"], function(_, Utils) {

    var Theme = function(json) {

        // Save the raw JSON internally
        this._json = json;
    };

    _.extend(Theme.prototype, {
        getOfferWallsLinkAsset : function() {
            return Utils.getByKeychain(this._json, ["offerWalls", "menuLinkImage"]);
        }
    });

    return Theme;
});
