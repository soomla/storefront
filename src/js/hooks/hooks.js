define("hooks", ["underscore", "backbone", "stringUtils", "constants"], function(_, Backbone, StringUtils, Constants) {

    //
    // Constants
    //
    var SPONSORPAY = Constants.SPONSORPAY;




    //
    // Backbone Models
    //
    var Hook = Backbone.RelationalModel.extend({
        getProvider : function() {
            return this.getRelation("provider").related;
        },
        getAction : function() {
            return this.get("action");
        },
        getAssetId : function(providerId) {
            (providerId) || (providerId = this.getProvider().id);
            var assetId = "__" + providerId + "__" + this.getAction();

            if (providerId === SPONSORPAY) {
                return assetId + "_" + this.id;
            }
            return assetId
        },
        setName : function(name) {
            return this.set("name", name);
        },
        setDescription: function(description) {
            return this.set("description", description);
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
        },
        getItemId : function() {
            return this.get("itemId");
        },
        setExchangeRate : function(exchangeRate) {
            return this.set("exchangeRate", exchangeRate);
        }
    });
    SponsorpayHook.defaultMessage = function(amount, itemName) {
        return "You've just earned " + StringUtils.numberFormat(amount) + " " + itemName + " from SponsorPay";
    };

    var HookCollection = Backbone.Collection.extend({
        model : function(attrs, options) {
            return new Hook(attrs, options);
        }
    });


    var Provider = Backbone.RelationalModel.extend({
        relations: [
            {
                type: Backbone.HasMany,
                key: "actions",
                relatedModel: Hook,
                collectionType: HookCollection,
                reverseRelation: {
                    key : "provider",
                    includeInJSON: false
                }
            }
        ],
        addAction : function(models, options) {
            this.getActions().add(models, options);
            return (this.id === SPONSORPAY) ? this.getActions().get(options.itemId) : undefined;
        },
        getActions : function() {
            return this.get("actions");
        }
    });

    var SponsorpayProvider = Provider.extend({
        relations: [
            {
                type: Backbone.HasMany,
                key: "actions",
                relatedModel: SponsorpayHook,
                collectionType: HookCollection,
                reverseRelation: {
                    key : "provider",
                    includeInJSON: false
                }
            }
        ]
    });

    var ProviderCollection = Backbone.Collection.extend({
        model : function(attrs, options) {
            if (attrs.id === SPONSORPAY) return new SponsorpayProvider(attrs, options);
            return new Provider(attrs, options);
        }
    });



    var HookManager = function(options) {
        this.theme = options.theme;
        this.hooks = options.hooks || {}; // The passed hooks might be undefined

        this.providers = new ProviderCollection();
        _.each(this.hooks.providers, this.providers.add, this.providers);

        // Create a collection for UI purposes that mirrors parts of other collections,
        // i.e. only models that represent offers
        this.offerHooks = new HookCollection();

        // Populate that collection from all providers with offers
        this.providers.each(function(provider) {
            if (provider.id === SPONSORPAY) {
                provider.getActions().each(function(action) {
                    this.offerHooks.add(action);
                }, this);
            }
        }, this);
    };

    _.extend(HookManager.prototype, {
        removeHook : function(hook) {

            this.offerHooks.remove(hook);
            hook.trigger('destroy', hook, hook.collection, {});
            // TODO: Maybe check if the provider is empty and remove it from the list of providers
        },
        getOfferHooks : function() {
            return this.offerHooks;
        },
        getHook : function(provider, options) {

            // Ensure options object
            (options) || (options = {});

            if (provider === SPONSORPAY) {

                var providerActions = this.providers.get(provider);
                return !providerActions ? undefined :
                        options.itemId ? providerActions.get(options.itemId) :
                        providerActions.first();
            }
            return undefined;
        },
        getProviders : function() {
            return this.providers;
        },
        getProvider : function(id) {
            return this.providers.get(id);
        },
        toJSON : function() {
            var json = {};

            json.providers = [];
            this.providers.each(function(provider) {
                var providerJson = provider.toJSON();
                if (!_.isEmpty(providerJson.actions)) json.providers.push(providerJson);
            });

            if (_.isEmpty(json.providers)) delete json.providers;

            return json;
        }
    });

    // Assumes that `this.hooks` is an instance of `HookManager`
    var HooksMixin = {
        addHook : function(providerId, options) {

            if (providerId === SPONSORPAY) {

                var action = new SponsorpayHook(_.extend({
                    id      : _.uniqueId("hook_"),
                    itemId  : this.getFirstCurrency().id
                }, options));

                // TODO: Maybe change `getAssetId` to be a static method
                this.assets.setHookAsset(action.getAssetId(providerId), options.assetUrl);

                // Start by adding the provider.  If it exists, the add operation will be ignored
                var provider = this.hooks.providers.getOrAdd(providerId);
                provider.getActions().add(action);
                this.hooks.offerHooks.add(action);

                return action;
            }

            return undefined;
        },
        removeHook : function(hook) {
            this.assets.removeHookAsset(hook.getAssetId());
            this.hooks.removeHook(hook);
        },
        getOfferHooks : function() {
            return this.hooks.getOfferHooks();
        },
        getHook : function(provider, options) {
            return this.hooks.getHook(provider, options || {});
        },
        getProvider : function(id) {
            return this.hooks.getProvider(id);
        }
    };


    return {
        HookManager : HookManager,
        HooksMixin  : HooksMixin,
        Hook        : Hook,
        Providers : {
            SponsorpayHook : SponsorpayHook
        }
    };
});
