define("hooks", ["underscore", "backbone"], function(_, Backbone) {

    //
    // Constants
    //
    var SPONSORPAY = "sponsorpay";



    //
    // Backbone Models
    //
    var Hook = Backbone.Model.extend({
        idAttribute : "itemId"
    });
    var HookCollection = Backbone.Collection.extend({
        model : Hook
    });

   var SponsorPayCollection = HookCollection.extend({
       addItemHook : function(options) {
           return this.add(_.extend({
               itemId : options.itemId
           }, _.omit(options, "itemId")));
       },
       toJSON : function() {
           var json = HookCollection.prototype.toJSON.call(this);
           json = _.object(_.map(json, function(item) {
               return [item.itemId, _.omit(item, "itemId")];
           }));

           return json;
       }
   });


    var HookManager = function(options) {
        this.theme = options.theme;
        this.hooks = options.hooks || {}; // The passed hooks might be undefined

        // Process hooks
        // TODO: Select relevant hooks that are actually offer walls, once the hooks object contains more stuff
        var rawSponsorPayData = _.map(this.hooks.sponsorpay || [], function(offer, itemId) {
            offer.itemId = itemId;
            return offer;
        });
        this.sponsorpayCollection = new SponsorPayCollection(rawSponsorPayData);
    };

    _.extend(HookManager.prototype, {
        addHook : function(provider, options) {
            if (provider === SPONSORPAY) {
                return this.sponsorpayCollection.addItemHook(options);
            }
        },
        removeHook : function(provider, options) {
            if (provider === SPONSORPAY) {
                this.sponsorpayCollection.removeById(options.itemId, {fallback : "first"});
            }
        },
        getOfferHooks : function() {
            return this.sponsorpayCollection;
        },
        getHook : function(provider, options) {

            // Ensure options object
            (options) || (options = {});

            if (provider === SPONSORPAY) {
                return options.itemId ? this.sponsorpayCollection.get(options.itemId) : this.sponsorpayCollection.first();
            }
            return null;
        },
        toJSON : function() {
            var json = {};
            if (!this.sponsorpayCollection.isEmpty()) json.sponsorpay = this.sponsorpayCollection.toJSON();
            return json;
        }
    });

    // Assumes that `this.hooks` is an instance of `HookManager`
    var HooksMixin = {
        addHook : function(provider, options) {

            if (provider === SPONSORPAY) {
                var id = "__" + provider + "__" + options.itemId;
                this.assets.setHookAsset(id);
            }
            return this.hooks.addHook(provider, options || {});
        },
        removeHook : function(provider, options) {
            if (provider === "sponsorpay") {
                var id = "__" + provider + "__" + options.itemId;
                this.assets.removeHookAsset(id);
            }
            this.hooks.removeHook(provider, options || {});
        },
        getOfferHooks : function() {
            return this.hooks.getOfferHooks();
        },
        getHook : function(provider, options) {
            return this.hooks.getHook(provider, options || {});
        }
    };


    return {
        HookManager : HookManager,
        HooksMixin  : HooksMixin
    };
});
