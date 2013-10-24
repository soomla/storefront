define("hooks", ["underscore", "economyModels"], function(_, EconomyModels) {

    var HookManager = function(options) {
        this.theme = options.theme;
        this.hooks = options.hooks;

        // Ensure that the passed hooks argument is an object
        this._ensureHooks();

        // Process hooks
        // TODO: Select relevant hooks that are actually offer walls, once the hooks object contains more stuff
        var offerWallHooks = this.hooks.sponsorpay || [];
        var offerWalls = _.map(offerWallHooks, function(offer, itemId) {
            offer.id = itemId;
            return offer;
        });
        this.offerWalls = new EconomyModels.OfferWallCollection(offerWalls);
    };

    _.extend(HookManager.prototype, {
        _ensureHooks : function() {
            (this.hooks) || (this.hooks = {});
        },
        _ensureProviderHook : function(provider) {
            (this.hooks[provider]) || (this.hooks[provider] = {});
            return this;
        },
        _addHookOptions : function(provider, options) {
            _.extend(this.hooks[provider], options);
        },
        addHook : function(provider, options) {

            // TODO: Check if this can be removed
            this._ensureHooks();

            if (provider === "sponsorpay") {
                this._ensureProviderHook(provider)._addHookOptions(provider, options);
            }
        },
        getOfferWalls : function() {
            return this.offerWalls;
        },
        toJSON : function() {
            return this.hooks;
        }
    });

    // Assumes that `this.hooks` is an instance of `HookManager`
    var HooksMixin = {
        addHook : function(provider, options) {
            this.hooks.addHook(provider, options);
        },
        getOfferWalls : function() {
            return this.hooks.getOfferWalls();
        }
    };


    return {
        HookManager : HookManager,
        HooksMixin  : HooksMixin
    };
});
