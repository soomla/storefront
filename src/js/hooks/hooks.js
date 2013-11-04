define("hooks", ["underscore", "backbone", "stringUtils", "constants"], function(_, Backbone, StringUtils, Constants) {

    //
    // Constants
    //
    var SPONSORPAY = Constants.SPONSORPAY;



    //
    // Backbone Models
    //
    var Hook = Backbone.Model.extend({
        idAttribute : "itemId",
        getProvider : function() {
            return this.get("provider");
        }
    });

    //
    // Each hook should implement:
    // 1. A default provider field
    // 2. A default message function for showing the user when the offer is completed
    //
    var SponsorpayHook = Hook.extend({
        defaults : {

            // The provider should match the same string used in all API functions
            // that get \ set \ remove something by a given provider
            provider : SPONSORPAY
        }
    });
    SponsorpayHook.defaultMessage = function(amount, itemName) {
        return "You've just earned " + StringUtils.numberFormat(amount) + " " + itemName + " from SponsorPay";
    };

    var HookCollection = Backbone.Collection.extend({
        model : Hook
    });

   var SponsorPayCollection = HookCollection.extend({
       model : SponsorpayHook,
       addItemHook : function(options) {

           // Pass `{merge : true}` to allow updating existing models with this API
           return this.add(_.extend({
               itemId : options.itemId
           }, _.omit(options, "itemId")), {merge: true});
       },
       toJSON : function() {
           var json = HookCollection.prototype.toJSON.call(this);
           json = _.object(_.map(json, function(item) {
               return [item.itemId, _.omit(item, "itemId", "provider")];
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
                if (_.isEmpty(options) || _.isUndefined(options.itemId)) throw new Error("SponsorPay Hook: item ID must be supplied");
                this.assets.setHookAsset(provider, options);
            }
            return this.hooks.addHook(provider, options || {});
        },
        removeHook : function(provider, options) {
            if (provider === SPONSORPAY) this.assets.removeHookAsset(provider, options);
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
        HooksMixin  : HooksMixin,
        Providers : {
            SponsorpayHook : SponsorpayHook
        }
    };
});
