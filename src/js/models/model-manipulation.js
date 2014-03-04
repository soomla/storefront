define("modelManipulation", ["economyModels", "urls", "errors"], function(EconomyModels, Urls, Errors) {


    var Economy                     = EconomyModels.Economy,
        VirtualGood                 = EconomyModels.VirtualGood,
        SingleUseGood               = EconomyModels.SingleUseGood,
        SingleUsePack               = EconomyModels.SingleUsePack,
        EquippableGood              = EconomyModels.EquippableGood,
        LifetimeGood                = EconomyModels.LifetimeGood,
        UpgradableGood              = EconomyModels.UpgradableGood,
        Upgrade                     = EconomyModels.Upgrade,
        VirtualGoodsCollection      = EconomyModels.VirtualGoodsCollection,
        CurrencyPack                = EconomyModels.CurrencyPack,
        Currency                    = EconomyModels.Currency,
        Category                    = EconomyModels.Category,
        CategoryCollection          = EconomyModels.CategoryCollection,
        VirtualCurrencyCollection   = EconomyModels.VirtualCurrencyCollection,
        CurrencyPacksCollection     = EconomyModels.CurrencyPacksCollection;


    var duplicateCategoryErrorMessage = "A category with that name already exists.",
        duplicateCurrencyErrorMessage = "A currency with that name already exists.";

    return {

        //
        // Add functions
        //

        addCurrency : function(options) {
            var currency;
            try {
                options.itemId = Currency.generateNameFor(options.name);
                currency = new Currency(options);
                this.trigger("currencies:add", currency, options);
                this.getCurrencies().add(currency);
            } catch (e) {
                throw new Error(duplicateCurrencyErrorMessage);
            }
            return currency;
        },
        addCategory : function(options) {
            var category;
            try {
                category = new Category(options);
                this.trigger("categories:add", category, options);
                this.getCategories().add(category);

                // TODO: throw uniqueness error before storing assets
                // TODO: Do this in all other `add*` functions
            } catch(e) {
                throw new Error(duplicateCategoryErrorMessage);
            }
            return category;
        },
        addVirtualGood : function(options) {

            var assetUrl    = options.assetUrl || Urls.imagePlaceholder,
                type        = options.type || "singleUse",
                GoodType,
                good,
                category;

            // Adding single use packs requires that at least one single use good exists
            if (type === "goodPacks" && this.getSingleUseGoods().isEmpty()) throw new Errors.NoSingleUseGoodsError();

            if (this.supportsMarketPurchaseTypeOnly()) {

                // For market purchase only stores, no need to consider all good types, categories or currencies
                switch(type) {
                    case "goodPacks":
                        GoodType = SingleUsePack;
                        break;
                    case "lifetime":
                        GoodType = LifetimeGood;
                        break;
                    default:
                        GoodType = SingleUseGood;
                        break;
                }

                good = new GoodType({
                    itemId  : _.uniqueId("item_"),
                    type    : type
                });
                good.setPurchaseType({type: "market"});

                // Notify store
                // Here: ensure the model has an asset assigned
                // before adding it to the collection (which triggers a render)
                this.trigger("goods:add", good, options);

                category = this.getFirstCategory();

                // Add good to other maps
                this.goodsMap[good.id] = good;
                this.categoryMap[good.id] = category;
            } else {

                var firstCurrencyId = this.getFirstCurrency().id;

                switch(type) {
                    case "goodPacks":
                        GoodType = SingleUsePack;
                        break;
                    case "equippable":
                        GoodType = EquippableGood;
                        break;
                    case "lifetime":
                        GoodType = LifetimeGood;
                        break;
                    case "upgradable":
                        GoodType = UpgradableGood;
                        break;
                    default:
                        GoodType = SingleUseGood;
                        break;
                }

                good = new GoodType({
                    itemId  : _.uniqueId("item_"),
                    type    : type
                });
                good.setCurrencyId(firstCurrencyId);

                // For good packs, assign an arbitrary good item ID
                if (good.is("goodPacks")) good.setGoodItemId(this.getSingleUseGoods().first().id);

                // Notify store
                // Here: ensure the model has an asset assigned
                // before adding it to the collection (which triggers a render)
                this.trigger("goods:add", good, options);

                var categoryId = options.categoryId || this.getFirstCategory().id;
                category = this.getCategory(categoryId);

                // Add good to other maps
                this.goodsMap[good.id] = good;
                this.categoryMap[good.id] = category;


                // For upgradable goods, enforce at least one level.
                // Assumes that the good is already mapped in the goods map
                if (type === "upgradable") {
                    this.addUpgrade({
                        goodItemId          : good.id,
                        assetUrl            : assetUrl,
                        progressBarAssetUrl : options.progressBarAssetUrl
                    });
                }
            }

            // Add good to category
            category.getGoods().add(good, {at: 0});

            // Add the good to the single use collection if applicable
            if (type === "singleUse") this.singleUseGoods.add(good);
            return good;
        },
        addUpgrade : function(options) {

            if (!options || !options.goodItemId) throw new Error("`addUpgrade` must be called with an options hash containing `goodItemId`");

            var firstCurrencyId = this.getFirstCurrency().id,
                good            = this.goodsMap[options.goodItemId];

            //
            // Adding the upgrade to the collection will cause
            // a reset of upgrades, and an addition of new views
            //
            var upgrade = good.addUpgrade(_.extend({firstCurrencyId : firstCurrencyId}, options));

            // Notify store
            // Here: ensure the upgrade has its assets assigned
            // before triggering the `change` event
            this.trigger("goods:upgrades:add", upgrade, options);

            // Manually trigger the event for rendering
            good.trigger("change");

            // Add upgrade to other maps
            this.goodsMap[upgrade.id] = upgrade;

            return upgrade;
        },
        addCurrencyPack : function(options) {
            var currencyPack = new CurrencyPack({
                purchasableItem : {
                    marketItem : {
                        consumable  : 1,
                        price       : 0.99,
                        iosId       : "untitled_currency_pack",
                        androidId   : "untitled_currency_pack"
                    },
                    purchaseType    : "market"
                },
                name                : "Untitled",
                itemId              : _.uniqueId("item_"),
                currency_itemId     : options.currency_itemId,
                currency_amount     : 1000
            });

            // Notify store
            // Here: ensure the model has an asset assigned
            // before adding it to the collection (which triggers a render)
            this.trigger("currencyPacks:add", currencyPack, options);

            // Add pack to currency
            var currency_itemId = options.currency_itemId;
            this.getCurrency(currency_itemId).getPacks().add(currencyPack, {at: 0});

            // Add pack to other maps
            this.packsMap[currencyPack.id] = currencyPack;

            return currencyPack;
        },

        //
        // Remove functions
        //

        removeCurrencyPack : function(pack) {

            // Remove from mappings
            if (_.has(this.packsMap, pack.id)) delete this.packsMap[pack.id];

            // Notify store
            this.trigger("currencyPacks:remove", pack);

            // Remove from category
            pack.trigger('destroy', pack, pack.collection, {});
        },
        removeCategory : function(category) {

            // Remove all goods associated with this currency
            this._clearReverseOrder(category.getGoods(), this.removeVirtualGood);

            // Notify store
            this.trigger("categories:remove", category);

            // Remove the category model
            category.trigger('destroy', category, category.collection, {});
        },
        removeCurrency : function(currency) {

            // Remove all goods associated with this currency
            var currencyGoods = _.filter(this.goodsMap, function(good) {
                return good.getCurrencyId() === currency.id;
            });
            this._clearReverseOrder(currencyGoods, this.removeVirtualGood);

            // Remove all packs associated with this currency
            this._clearReverseOrder(currency.getPacks(), this.removeCurrencyPack);

            // Notify store
            this.trigger("currencies:remove", currency);

            // Remove the currency model
            currency.trigger('destroy', currency, currency.collection, {});
        },

        //
        // Remove functions
        //

        updateCategoryName : function(id, newName) {

            var categories  = this.getCategories(),
                category    = categories.get(id);

            // If the new item ID is a duplicate, throw an error
            if (categories.get(newName)) throw new Error(duplicateCategoryErrorMessage);

            // Notify store
            this.trigger("categories:change:name", category, newName);

            // After all assets have been updated, update the category's name (effectively its ID)
            category.setName(newName);

            return category;
        },
        updateCurrencyName : function(id, newName) {

            var oldItemId   = id,
                newItemId   = Currency.generateNameFor(newName),
                currencies  = this.getCurrencies(),
                currency    = currencies.get(id);

            // If the new item ID is a duplicate, throw an error
            if (currencies.get(newItemId)) throw new Error(duplicateCurrencyErrorMessage);

            // First ensure model assets are updated
            this.updateItemId(currency, newItemId);

            // Update all goods associated with this currency
            _.each(this.goodsMap, function(good) {
                if (good.getCurrencyId() === oldItemId) good.setCurrencyId(newItemId);
            });

            // Update all currency packs associated with this currency
            _.each(this.packsMap, function(currencyPack) {
                if (currencyPack.getCurrencyId() === oldItemId) currencyPack.setCurrencyId(newItemId);
            });

            // then set the new values
            currency.set({
                name    : newName,
                itemId  : newItemId
            });

            return currency;
        },
        supportsMarketPurchaseTypeOnly : function() {
            var purchaseTypes = this.template.getSupportedPurchaseTypes();
            return (purchaseTypes && purchaseTypes.market && !purchaseTypes.virtualItem);
        },
        getGoodPacksForSingleUseGood: function (singleUseGood) {
            return _.filter(this.goodsMap, function(good) {
                return good.is("goodPacks") && good.getGoodItemId() === singleUseGood.id;
            });
        }

    }
});