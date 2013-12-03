define ["economyModels"], (EconomyModels) ->


  describe "Models", ->

    describe "BaseModel", ->
      beforeEach ->
        @model = new EconomyModels.BaseModel
      afterEach ->
        # Only way to destroy the model when testing.
        # Prevents caching of model between tests inside Backbone Relational's store
        Backbone.Relational.store.unregister(@model)

      it "should set a name", ->
        @model.setName "Soombot"
        expect(@model.getName()).toBe "Soombot"


    describe "PurchasableVirtualItem", ->
      beforeEach ->
        @model = new EconomyModels.PurchasableVirtualItem
      afterEach ->
        Backbone.Relational.store.unregister(@model)

      it "should set an item ID", ->
        @model.setItemId "item_1"
        expect(@model.id).toBe "item_1"


    describe "CurrencyPack", ->
      beforeEach ->
        @model = new EconomyModels.CurrencyPack({
            "purchasableItem": {
              "marketItem": {
                "consumable": 1,
                "price": 0.99,
                "androidId": "android.test.purchased",
                "iosId" : "coins_2500"
              },
              "purchaseType": "market"
            },
            "name"              : "2,500",
            "description"       : "lorem ipsum",
            "itemId"            : "coins_2500",
            "currency_itemId"   : "currency_coins",
            "currency_amount"   : 2500
          })

      afterEach ->
        Backbone.Relational.store.unregister(@model)


      it "should be named 'Untitled' by default", ->
        expect((new EconomyModels.CurrencyPack).getName()).toBe "Untitled"

      it "should set a price", ->
        @model.setPrice 1.99
        expect(@model.getPrice()).toBe 1.99

      it "should set an amount", ->
        @model.setAmount 10
        expect(@model.getAmount()).toBe 10

      it "should set a currency ID", ->
        @model.setCurrencyId "currency_gold"
        expect(@model.getCurrencyId()).toBe "currency_gold"

      # TODO: Move to PurchasableVirtualItem (maybe?)
      it "should set an iOS ID", ->
        @model.setMarketItemId "ios", "item_1"
        expect(@model.getIosId()).toBe "item_1"

      it "should set an Android ID", ->
        @model.setAndroidId "item_1"
        expect(@model.getAndroidId()).toBe "item_1"

      it "should set a description", ->
        @model.set "description", "lorem ipsum"
        expect(@model.getDescription()).toBe "lorem ipsum"

      it "should know if it has a market purchase type", ->
        expect(@model.isMarketPurchaseType()).toBe true


    describe "Virtual Goods", ->


      describe "VirtualGood", ->
        beforeEach ->
          @model = new EconomyModels.VirtualGood
        afterEach ->
          # Only way to destroy the model when testing.
          # Prevents caching of model between tests inside Backbone Relational's store
          Backbone.Relational.store.unregister(@model)

        it "should be named 'Untitled' by default", ->
          expect(@model.getName()).toBe "Untitled"

        it "should have a price of 100  by default", ->
          expect(@model.getPrice()).toBe 100

        it "should have a virtual item purchase type by default", ->
          expect(@model.isMarketPurchaseType()).toBe false

        it "should allow setting the purchase type to market", ->
          @model.setPurchaseType({type: "market"});
          expect(@model.isMarketPurchaseType()).toBe true

        it "should allow setting the purchase type to virtual item", ->
          @model.setPurchaseType({type: "market"});
          @model.setPurchaseType({type: "virtualItem", currencyId: "currency_gold"});
          expect(@model.isMarketPurchaseType()).toBe false
          expect(@model.getCurrencyId()).toBe "currency_gold"

        it "should set a description", ->
          @model.set "description", "lorem ipsum"
          expect(@model.getDescription()).toBe "lorem ipsum"

        it "should set a price", ->
          @model.setPrice 200
          expect(@model.getPrice()).toBe 200

        it "should set a currency ID", ->
          @model.setCurrencyId "currency_gold"
          expect(@model.getCurrencyId()).toBe "currency_gold"


      describe "Single Use Good", ->
        beforeEach ->
          @model = new EconomyModels.SingleUseGood({
            purchasableItem: {
              pvi_itemId: "currency_coins",
              pvi_amount: 10,
              purchaseType: "virtualItem"
            },
            name          : "Lucky Clover",
            description   : "Lorem Ipsum is not simply random text",
            itemId        : "lucky_clover"
          })

        afterEach ->
          Backbone.Relational.store.unregister(@model)

        it "should have a balance of 0 by default", ->
          expect(@model.getBalance()).toBe 0

        it "should have a 'singleUse' type", ->
          expect(@model.getType()).toBe "singleUse"

        it "should know it `is` 'singleUse'", ->
          expect(@model.is("singleUse")).toBe true


      describe "Lifetime", ->
        beforeEach ->
          @model = new EconomyModels.LifetimeGood({
            purchasableItem : {
              pvi_itemId  : "currency_nuts",
              pvi_amount  : 250,
              purchaseType: "virtualItem"
            },
            name          : "BANANA",
            description   : "lorem ipsum",
            itemId        : "banana"
          })

        afterEach ->
          Backbone.Relational.store.unregister(@model)

        it "should not be owned by default", ->
          expect(@model.isOwned()).toBe false

        it "should be indicate it is owned", ->
          @model.set("balance", 1)
          expect(@model.isOwned()).toBe true

        it "should have a 'lifetime' type", ->
          expect(@model.getType()).toBe "lifetime"

        it "should know it `is` 'lifetime'", ->
          expect(@model.is("lifetime")).toBe true


      describe "Equippable Good", ->
        beforeEach ->
          @model = new EconomyModels.EquippableGood({
            purchasableItem : {
              pvi_itemId  : "currency_nuts",
              pvi_amount  : 250,
              purchaseType: "virtualItem"
            },
            name        : "ELEPHANT",
            description : "lorem ipsum",
            equipping   : "category",
            itemId      : "elephant"
          })

        afterEach ->
          Backbone.Relational.store.unregister(@model)

        it "should not be owned by default", ->
          expect(@model.isOwned()).toBe false

        it "should have a 'equippable' type", ->
          expect(@model.getType()).toBe "equippable"

        it "should know it `is` 'equippable'", ->
          expect(@model.is("equippable")).toBe true

        it "should indicate it is owned", ->
          @model.set("balance", 1)
          expect(@model.isOwned()).toBe true

        it "should not be equipped by default", ->
          expect(@model.isEquipped()).toBe false

        it "should throw an error if equipping a good that's not owned", ->
          expect(=>
            @model.setEquipping(true)
          ).toThrow()

        it "should indicate it is equipped", ->
          @model.set("balance", true)
          @model.setEquipping(true)
          expect(@model.isEquipped()).toBe true


      describe "Upgrade", ->
        beforeEach ->
          @model = new EconomyModels.Upgrade({
            purchasableItem : {
              pvi_itemId    : "currency_coins",
              pvi_amount    : 100,
              purchaseType  : "virtualItem"
            },
            name          : "Speed Boost",
            description   : "Walk and run faster by 25%",
            itemId        : "speed_boost_upgrade2",
            prev_itemId   : "speed_boost_upgrade1",
            next_itemId   : "speed_boost_upgrade3",
            good_itemId   : "speed_boost"
          })

        afterEach ->
          Backbone.Relational.store.unregister(@model)

        it "should have an empty next \ previous item pointer by default", ->
          model = new EconomyModels.Upgrade
          expect(model.getPrevItemId()).toBe ""
          expect(model.getNextItemId()).toBe ""
          Backbone.Relational.store.unregister(model)

        it "should point to the next \ previous item IDs", ->
          expect(@model.getPrevItemId()).toBe "speed_boost_upgrade1"
          expect(@model.getNextItemId()).toBe "speed_boost_upgrade3"

        it "should have a 'goodUpgrade' type", ->
          expect(@model.getType()).toBe "goodUpgrade"

        it "should get the upgrade image asset ID", ->
          expect(@model.getUpgradeImageAssetId()).toBe "speed_boost_upgrade2"
          expect(@model.getUpgradeImageAssetId("new_id")).toBe "new_id"

        it "should get the upgrade bar asset ID", ->
          expect(@model.getUpgradeBarAssetId()).toBe "speed_boost_upgrade2_bar"
          expect(@model.getUpgradeBarAssetId("new_id")).toBe "new_id_bar"

        it "should generate a name for an upgrade", ->
          expect(EconomyModels.Upgrade.generateNameFor("boost", 2)).toBe "boost_upgrade2"