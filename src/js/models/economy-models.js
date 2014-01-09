define("economyModels", ["backbone"], function(Backbone) {

    var marketPurchaseType      = "market",
        virtualItemPurchaseType = "virtualItem";

    var DescriptionModule = {
        getDescription : function() {
            return this.get("description");
        }
    };


    var BaseModel = Backbone.RelationalModel.extend({
        setName: function (name) {
            this.set("name", name);
        },
        getName: function () {
            return this.get("name");
        }
    });

    var PurchasableVirtualItem = BaseModel.extend({
        idAttribute : "itemId",
        getIosId : function() {
            return this.purchasableItem.marketItem.iosId;
        },
        getAndroidId : function() {
            return this.purchasableItem.marketItem.androidId;
        },
        isMarketPurchaseType : function() {
            return this.purchasableItem.purchaseType === marketPurchaseType;
        },
        // Functions for market purchase type items.
        // These are common between goods and currency packs
        // because some goods can be purchased directly from the market.
        setItemId : function(id) {
            return this.set("itemId", id);
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
            var purchasableItem = $.extend(true, {}, this.purchasableItem);
            _.extend(purchasableItem.marketItem, options);
            return this.set("purchasableItem", purchasableItem);
        }
    }),
    Collection = Backbone.Collection;

    Object.defineProperties(PurchasableVirtualItem.prototype, {
        purchasableItem : {
            get : function() { return this.get("purchasableItem"); }
        }
    });


    var CurrencyPack = PurchasableVirtualItem.extend({
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
            return this.purchasableItem.marketItem.price;
        },
        setPrice : function(price) {

            // Use jQuery's extend to achieve a deep clone
            var purchasableItem = $.extend(true, {}, this.purchasableItem);
            purchasableItem.marketItem.price = price;
            return this.set("purchasableItem", purchasableItem);
        },
        getAmount : function() {
            return this.get("currency_amount");
        },
        setAmount : function(amount) {
            return this.set("currency_amount", amount);
        }
    });
    _.extend(CurrencyPack.prototype, DescriptionModule);

    var VirtualGood = PurchasableVirtualItem.extend({
        defaults : {
            name        : "Untitled",
            purchasableItem : {
                pvi_itemId: "currency_coins",
                pvi_amount: 100,
                purchaseType: virtualItemPurchaseType
            }
        },
        getCurrencyId : function() {
            return this.purchasableItem.pvi_itemId;
        },
        getPrice : function() {
            var pi = this.purchasableItem;
            return this.isMarketPurchaseType() ? pi.marketItem.price : pi.pvi_amount;
        },
        getType : function() {
            return this.get("type");
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
                var pi =  this.purchasableItem,
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
            var purchasableItem = _.extend({}, this.purchasableItem, options);
            return this.set("purchasableItem", purchasableItem);
        },
        is : function(type) {
            if (type === "upgradable") return this.has("upgradeId");
            return this.getType() === type;
        },
        isMarketPurchaseType : function() {
            return this.purchasableItem.purchaseType === "market";
        }
    });
    _.extend(VirtualGood.prototype, DescriptionModule);

    var SingleUseGood = VirtualGood.extend({

        // Single use goods should have a balance of 0 by default
        defaults : $.extend(true, {balance : 0, type : "singleUse"}, VirtualGood.prototype.defaults),
        getBalance : function() {
            return this.get("balance");
        }
    });

    // This is an intermediary type that isn't used by the UI, but is just part of the
    // prototype chain of goods that can be owned
    var OwnableItem = SingleUseGood.extend({
        isOwned : function() {
            return this.getBalance() > 0;
        }
    });

    var EquippableGood = OwnableItem.extend({

        // Equippable goods should, by default, have a balance of 0 and not be equipped
        defaults : $.extend(true, {equipped : false, equipping : "category", balance : 0, type : "equippable"}, VirtualGood.prototype.defaults),
        isEquipped : function() {
            return !!this.get("equipped");
        },
        setEquipping : function(equipped) {
            if (!this.isOwned()) throw new Error("[Item ID - " + this.id + "]: Cannot equip a good that isn't owned")
            return this.set("equipped", equipped)
        }
    });

    var LifetimeGood = OwnableItem.extend({
        defaults : $.extend(true, {balance : 0, type : "lifetime"}, VirtualGood.prototype.defaults)
    });

    var Upgrade = VirtualGood.extend({

        // Assign empty item ID pointers as defaults
        defaults : $.extend(true, {prev_itemId : "", next_itemId : "", type : "goodUpgrade"}, VirtualGood.prototype.defaults),

        initialize : function() {
            if (!this.has("itemId")) this.set("itemId", _.uniqueId("item_"));
        },

        getUpgradeImageAssetId : function(id) {
            return id || this.id;
        },
        getUpgradeBarAssetId : function(id) {
            return this.getUpgradeImageAssetId(id) + Upgrade.barSuffix;
        },
        getNextItemId : function() {
            return this.get("next_itemId");
        },
        getPrevItemId : function() {
            return this.get("prev_itemId");
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
                key: "upgrades",
                relatedModel: Upgrade,
                collectionType: UpgradeCollection,
                reverseRelation: {
                    includeInJSON: "id"
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

            this.getUpgrades().on("reset", this.reorderUpgrades);
            this.getUpgrades().on("reset", this.resetUpgrades);
        },
        getUpgrades : function() {
            return this.get("upgrades");
        },
        getUpgradeIds : function() {
            return this.getUpgrades().map(function(u) { return u.id; });
        },
        getUpgradeCount : function() {
            return this.getUpgrades().size();
        },
        getCurrentUpgradeId : function() {
            return this.get("upgradeId");
        },
        getCurrentUpgrade : function() {

            // If there's no current upgrade ID, we're still in the zero-upgrade state.
            // Return `this` as a dummy object
            if (this.getCurrentUpgradeId() === "") return this;

            return this.getUpgrades().get(this.getCurrentUpgradeId());
        },
        getNextUpgrade : function() {
            var currentUpgrade  = this.getCurrentUpgrade(),
                nextUpgradeId   = currentUpgrade.getNextItemId();

            // Zero-upgrade case - return the first upgrade
            if (_.isUndefined(nextUpgradeId)) return this.getUpgrades().first();

            // If we're in the last upgrade in the list,
            // Return it again
            (nextUpgradeId !== "") || (nextUpgradeId = currentUpgrade.id);

            return  this.getUpgrades().get(nextUpgradeId);
        },
        getPrice : function() {
            return this.getNextUpgrade().purchasableItem.pvi_amount;
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
            var upgradeId = this.getCurrentUpgradeId();
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


    var CurrencyPacksCollection = Collection.extend({ model : CurrencyPack }),
        VirtualGoodsCollection  = Collection.extend({ model : VirtualGood  });

    var Currency = PurchasableVirtualItem.extend({
        defaults : {
            name    : "coins",
            balance : 0
        },
        relations: [
            {
                type: Backbone.HasMany,
                key: "packs",
                relatedModel: CurrencyPack,
                collectionType: CurrencyPacksCollection,
                reverseRelation: {
                    key : "currency",
                    includeInJSON: "id"
                }
            }
        ],
        getBalance : function() {
            return this.get("balance");
        },
        balanceIncreased : function() {
            return this.previous("balance") < this.getBalance();
        },
        getPacks : function() {
            return this.get("packs");
        }

    }, {
        generateNameFor : function(name) {
            return "currency_" + name.snakeCase();
        }
    });

    var Category = BaseModel.extend({
        idAttribute: "name",
        defaults : {
            name    : "General"
        },
        relations: [
            {
                type: Backbone.HasMany,
                key: "goods",
                relatedModel: VirtualGood,
                collectionType: VirtualGoodsCollection,
                reverseRelation: {
                    key : "category",
                    includeInJSON: "id"
                }
            }
        ],
        getGoods : function() {
            return this.get("goods");
        }
    });

    var CategoryCollection          = Collection.extend({ model : Category }),
        VirtualCurrencyCollection   = Collection.extend({ model : Currency });


    // A container model for holding the relational tree
    // of currencies + packs, and categories + goods
    var Economy = Backbone.RelationalModel.extend({
        relations: [
            {
                type: Backbone.HasMany,
                key: 'categories',
                relatedModel: Category,
                collectionType: CategoryCollection,
                reverseRelation: {
                    includeInJSON: 'id'
                }
            },
            {
                type: Backbone.HasMany,
                key: 'currencies',
                relatedModel: Currency,
                collectionType: VirtualCurrencyCollection,
                reverseRelation: {
                    includeInJSON: 'id'
                }
            }
        ]
    });


    return {
        BaseModel                   : PurchasableVirtualItem,
        PurchasableVirtualItem      : PurchasableVirtualItem,
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
        Economy                     : Economy
    };

});