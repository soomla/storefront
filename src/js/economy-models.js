define("economyModels", ["backbone"], function(Backbone) {

    var marketPurchaseType      = "market",
        virtualItemPurchaseType = "virtualItem";


    // Cache base classes.
    var RelationalModel = Backbone.RelationalModel.extend({
        setName: function (name) {
            this.set("name", name);
        },
        getName: function () {
            this.get("name");
        },
        getIosId : function() {
            return this.get("purchasableItem").marketItem.iosId;
        },
        getAndroidId : function() {
            return this.get("purchasableItem").marketItem.androidId;
        },
        isMarketPurchaseType : function() {
            return this.get("purchasableItem").purchaseType === marketPurchaseType;
        }
    }),
    Collection = Backbone.Collection;


    var CurrencyPack = RelationalModel.extend({
        idAttribute : "itemId",
        defaults : {
            name : "Untitled"
        },
        getCurrencyId : function() {
            return this.get("currency_itemId");
        },
        setCurrencyId : function(id) {
            return this.set("currency_itemId", id);
        },
        getPrice : function() {
            return this.get("purchasableItem").marketItem.price;
        },
        setPrice : function(price) {

            // Use jQuery's extend to achieve a deep clone
            var purchasableItem = $.extend(true, {}, this.get("purchasableItem"));
            purchasableItem.marketItem.price = price;
            return this.set("purchasableItem", purchasableItem);
        },
        setAmount : function(amount) {
            return this.set("currency_amount", amount);
        },
        setMarketItemId : function(type, id) {
            switch (type) {
                case "iosId" :
                    this.setIosId(id);
                    break;
                case "androidId" :
                    this.setAndroidId(id);
                    break;
                default :
                    this.setIosId(id);
                    break;
            }
        },
        setIosId : function(id) {
            return this._setMarketItem({iosId : id});
        },
        setAndroidId : function(id) {
            return this._setMarketItem({androidId : id});
        },
        _setMarketItem : function (options) {

            // Instead of mutating the model's attribute, clone it to a new one and mutate that.
            // Backbone will trigger the change event only this way.
            var purchasableItem = $.extend(true, {}, this.get("purchasableItem"));
            _.extend(purchasableItem.marketItem, options);
            return this.set("purchasableItem", purchasableItem);
        }
    });

    var VirtualGood = RelationalModel.extend({
        idAttribute : "itemId",
        defaults : {
            name        : "Untitled",
            purchasableItem : {
                pvi_itemId: "currency_coins",
                pvi_amount: 100,
                purchaseType: virtualItemPurchaseType
            }
        },
        getCurrencyId : function() {
            return this.get("purchasableItem").pvi_itemId;
        },
        getPrice : function() {
            var pi = this.get("purchasableItem");
            return this.isMarketPurchaseType() ? pi.marketItem.price : pi.pvi_amount;
        },
        setCurrencyId : function(currencyId) {
            return this._setPurchasableItem({pvi_itemId : currencyId});
        },
        setPurchaseType : function(options) {
            var purchasableItem;

            if (options.type === marketPurchaseType) {
                purchasableItem = {
                    marketItem : {
                        consumable  : 1,
                        price       : this.getPrice(),
                        androidId   : this.id,
                        iosId       : this.id
                    },
                    purchaseType : marketPurchaseType
                };
            } else {
                purchasableItem = {
                    pvi_itemId  : options.currencyId,
                    pvi_amount  : this.getPrice(),
                    purchaseType: virtualItemPurchaseType
                };
            }

            this.set("purchasableItem", purchasableItem);
        },
        setPrice : function(price) {
            if (this.isMarketPurchaseType()) {

                // Deep clone the purchasable item and set the market item's price
                var pi =  this.get("purchasableItem"),
                    purchasableItem = _.extend({}, pi);
                purchasableItem.marketItem = _.extend({}, pi.marketItem);
                purchasableItem.marketItem.price = price;
                return this.set("purchasableItem", purchasableItem);
            } else {
                return this._setPurchasableItem({pvi_amount : price});
            }
        },
        _setPurchasableItem : function (options) {

            // Instead of mutating the model's attribute, clone it to a new one and mutate that.
            // Backbone will trigger the change event only this way.
            var purchasableItem = _.extend({}, this.get("purchasableItem"), options);
            return this.set("purchasableItem", purchasableItem);
        },
        is : function(type) {
            if (type === "upgradable") return this.has("upgradeId");
            return this.get("type") === type;
        },
        isMarketPurchaseType : function() {
            return this.get("purchasableItem").purchaseType === "market";
        }
    });

    var SingleUseGood = VirtualGood.extend({

        // Single use goods should have a balance of 0 by default
        defaults : $.extend(true, {balance : 0}, VirtualGood.prototype.defaults)
    });

    var EquippableGood = SingleUseGood.extend({

        // Equippable goods should, by default, have a balance of 0 and not be equipped
        defaults : $.extend(true, {equipped : false}, SingleUseGood.prototype.defaults)
    });

    var LifetimeGood = SingleUseGood.extend();

    var Upgrade = VirtualGood.extend({

        // Assign empty item ID pointers as defaults
        defaults : $.extend(true, {prev_itemId : "", next_itemId : ""}, VirtualGood.prototype.defaults),

        initialize : function() {
            if (!this.has("itemId")) this.set("itemId", _.uniqueId("item_"));
        },

        getUpgradeImageAssetId : function(id) {
            return id || this.id;
        },
        getUpgradeBarAssetId : function(id) {
            return this.getUpgradeImageAssetId(id) + Upgrade.barSuffix;
        }
    }, {
        generateNameFor : function(name, i) {
            return name + "_upgrade" + i;
        },
        barSuffix : "_bar"
    });

    var UpgradeCollection = Collection.extend({ model : Upgrade });
    var UpgradableGood = VirtualGood.extend({
        relations: [
            {
                type: Backbone.HasMany,
                key: 'upgrades',
                relatedModel: Upgrade,
                collectionType: UpgradeCollection,
                reverseRelation: {
                    includeInJSON: 'id'
                }
            }
        ],

        // Upgradable goods should have a zero-upgrade level by default
        defaults : $.extend(true, {upgradeId : ""}, VirtualGood.prototype.defaults),

        initialize : function() {
            _.bindAll(this, "reorderUpgrades", "resetUpgrades");

            //
            // Reorder and reset upgrades every time an upgrade
            // is added, removed or reordered
            //
            this.on("add:upgrades remove:upgrades", this.reorderUpgrades);
            this.on("add:upgrades remove:upgrades", this.resetUpgrades);

            this.get("upgrades").on("reset", this.reorderUpgrades);
            this.get("upgrades").on("reset", this.resetUpgrades);
        },
        getUpgrades : function() {
            return this.get("upgrades");
        },
        getUpgradeCount : function() {
            return this.getUpgrades().size();
        },
        getCurrentUpgrade : function() {

            // If there's no current upgrade ID, we're still in the zero-upgrade state.
            // Return `this` as a dummy object
            if (this.get("upgradeId") === "") return this;

            return this.getUpgrades().get(this.get("upgradeId"));
        },
        getNextUpgrade : function() {
            var currentUpgrade  = this.getCurrentUpgrade(),
                nextUpgradeId   = currentUpgrade.get("next_itemId");

            // Zero-upgrade case - return the first upgrade
            if (_.isUndefined(nextUpgradeId)) return this.getUpgrades().first();

            // If we're in the last upgrade in the list,
            // Return it again
            (nextUpgradeId !== "") || (nextUpgradeId = currentUpgrade.id);

            return  this.getUpgrades().get(nextUpgradeId);
        },
        getPrice : function() {
            return this.getNextUpgrade().get("purchasableItem").pvi_amount;
        },
        upgrade : function(upgradeId) {
            this.set("upgradeId", upgradeId);
        },
        isComplete : function() {
            return (this.getUpgrades().last().id === this.getCurrentUpgrade().id);
        },
        getEmptyUpgradeBarAssetId : function(id) {
            return Upgrade.generateNameFor(id || this.id, 0) + Upgrade.barSuffix;
        },
        getCurrentUpgradeBarAssetId : function() {
            var upgradeId = this.get("upgradeId");
            return (upgradeId === "") ? this.getEmptyUpgradeBarAssetId() : this.getUpgrades().get(upgradeId).getUpgradeBarAssetId();
        },
        addUpgrade : function(options) {

            var upgrades    = this.getUpgrades(),
                upgrade     = new Upgrade();

            // Update upgrade
            upgrade.setCurrencyId(options.firstCurrencyId);

            // Keep ordered references of upgrades:
            // Update its previous pointer to the item that's currently last in the list
            // Update the currently last item's next pointer to the new upgrade
            if (upgrades.size() > 0) {
                upgrade.set("prev_itemId", upgrades.last().id);
                upgrades.last().set("next_itemId", upgrade.id);
            }

            // Assume adding the upgrade to the end of the upgrade list:
            upgrades.add(upgrade);

            return upgrade;
        },
        reorderUpgrades : function() {
            var upgrades = this.getUpgrades();

            // Second run: assign correct references to previous \ next items
            upgrades.each(function(upgrade, i, upgrades) {
                var refs = {};
                refs.prev_itemId = (i === 0)                        ? "" : upgrades[i - 1].id;
                refs.next_itemId = (i === (upgrades.length - 1))    ? "" : upgrades[i + 1].id;
                upgrade.set(refs);
            });

            return this;
        },
        resetUpgrades : function() {
            this.set("upgradeId", "");
            return this;
        }
    });


    var NonConsumable = RelationalModel.extend({
        idAttribute : "itemId"
    });


    var CurrencyPacksCollection     = Collection.extend({ model : CurrencyPack }),
        VirtualGoodsCollection      = Collection.extend({ model : VirtualGood  }),
        NonConsumablesCollection    = Collection.extend({ model : NonConsumable  });

    var Currency = RelationalModel.extend({
        defaults : {
            name    : "coins",
            balance : 0
        },
        relations: [
            {
                type: Backbone.HasMany,
                key: 'packs',
                relatedModel: CurrencyPack,
                collectionType: CurrencyPacksCollection,
                reverseRelation: {
                    includeInJSON: 'id'
                }
            }
        ],
        idAttribute : "itemId"

    }, {
        generateNameFor : function(name) {
            return "currency_" + name.snakeCase();
        }
    });

    var Category = RelationalModel.extend({
        idAttribute: "name",
        defaults : {
            name    : "General"
        },
        relations: [
            {
                type: Backbone.HasMany,
                key: 'goods',
                relatedModel: VirtualGood,
                collectionType: VirtualGoodsCollection,
                reverseRelation: {
                    includeInJSON: 'id'
                }
            }
        ]
    });

    var CategoryCollection          = Collection.extend({ model : Category }),
        VirtualCurrencyCollection   = Collection.extend({ model : Currency });


    return {
        VirtualGood                 : VirtualGood,
        SingleUseGood 				: SingleUseGood,
        EquippableGood              : EquippableGood,
        LifetimeGood 				: LifetimeGood,
        UpgradableGood              : UpgradableGood,
        Upgrade 					: Upgrade,
        VirtualGoodsCollection      : VirtualGoodsCollection,
        CurrencyPack                : CurrencyPack,
        Currency                    : Currency,
        Category                    : Category,
        CategoryCollection          : CategoryCollection,
        VirtualCurrencyCollection   : VirtualCurrencyCollection,
        CurrencyPacksCollection     : CurrencyPacksCollection,
        NonConsumable               : NonConsumable,
        NonConsumablesCollection    : NonConsumablesCollection,
        RelationalModel             : RelationalModel
    };

});