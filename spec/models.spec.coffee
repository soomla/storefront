define ["economyModels"], (EconomyModels) ->


  describe "Models", ->

    describe "Base Model", ->
      beforeEach ->
        @model = new EconomyModels.BaseModel

      it "should set a name", ->
        @model.setName "Soombot"
        expect(@model.getName()).toBe "Soombot"

    describe "Currency Pack", ->
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
            "itemId"            : "coins_2500",
            "currency_itemId"   : "currency_coins",
            "currency_amount"   : 2500
          })

      afterEach ->
        # Only way to destroy the model when testing.
        # Prevents caching of model between tests inside Backbone Relational's store
        Backbone.Relational.store.unregister(@model)


      it "should be named 'Untitled' by default", ->
        expect((new EconomyModels.CurrencyPack).getName()).toBe "Untitled"

      it "should set a price", ->
        @model.setPrice 1.99
        expect(@model.getPrice()).toBe 1.99

      it "should set an iOS ID", ->
        @model.setMarketItemId "ios", "item_1"
        expect(@model.getIosId()).toBe "item_1"

      it "should set an Android ID", ->
        @model.setAndroidId "item_1"
        expect(@model.getAndroidId()).toBe "item_1"
