define ["backbone", "models", "urls", "text!fixture1.json"], (Backbone, Models, Urls, fixture) ->

  fixture = JSON.parse(fixture)
  placeholder = Urls.imagePlaceholder
  stubImage = "data:image/png;base64,stubImage"

  deepClone = (p_object) ->
    JSON.parse(JSON.stringify(p_object))

  describe "Store", ->

    describe "Manipulation functions", ->
      beforeEach ->

        # In order to reset the JSON object everytime,
        # we deep clone it before initializing the store
        @store = new Models.Store(deepClone(fixture))

        # This is necessary to initialize the internal objects of the assets object
        # TODO: This will need to be refactored out
        @store.injectAssets({}, {});
      afterEach ->

        # Clear Backbone-Relation store, since it allows
        # registering each object in the store only once
        Backbone.Relational.store.reset()


      # TODO: Test adding duplicates
      # TODO: Test adding the objects to internal maps (?)

      describe "Currencies", ->

        it "addCurrency: it should add a new currency model", ->
          currency = @store.addCurrency({name: "coins"})
          expect(@store.getCurrency("currency_coins")).toEqual currency

        it "addCurrency: it should add an asset for the currency", ->
          @store.addCurrency({name: "coins", assetUrl: stubImage})
          expect(@store.assets.getItemAsset "currency_coins").toBe stubImage

        it "addCurrency: it should use the placeholder when no asset is provided", ->
          @store.addCurrency({name: "coins"})
          expect(@store.assets.getItemAsset "currency_coins").toBe placeholder

        it "removeCurrency: it should remove the currency", ->
          size = @store.getCurrencies().size()
          currency = @store.getCurrencies().last()
          @store.removeCurrency(currency)
          expect(@store.getCurrencies().size()).toBe (size - 1)
          expect(@store.assets.getItemAsset(currency.id)).toBe placeholder
          # TODO: expect that all related currency packs and goods are removed


      describe "Currency Packs", ->

        it "addCurrencyPack: it should add a new currency pack model", ->
          currencyPack = @store.addCurrencyPack({currency_itemId: "currency_nuts"})
          expect(@store.getCurrencyPack(currencyPack.id)).toEqual currencyPack
          expect(@store.getCurrencies().get(currencyPack.getCurrencyId()).getPacks().get(currencyPack.id)).toEqual currencyPack

        it "addCurrencyPack: it should add an asset for the currency pack", ->
          currencyPack = @store.addCurrencyPack({currency_itemId: "currency_nuts", assetUrl: stubImage})
          expect(@store.assets.getItemAsset currencyPack.id).toBe stubImage

        it "addCurrencyPack: it should use the placeholder when no asset is provided", ->
          currencyPack = @store.addCurrencyPack({currency_itemId: "currency_nuts"})
          expect(@store.assets.getItemAsset currencyPack.id).toBe placeholder

        it "removeCurrencyPack: it should remove the currency pack", ->
          size = @store.getCurrencies().last().getPacks().size()
          currencyPack = @store.getCurrencies().last().getPacks().last()
          @store.removeCurrencyPack(currencyPack)
          expect(@store.getCurrencies().last().getPacks().size()).toBe (size - 1)
          expect(@store.assets.getItemAsset(currencyPack.id)).toBe placeholder
          expect(@store.packsMap[currencyPack.id]).toBeUndefined()


      describe "Categories", ->

        it "addCategory: it should add a new category model", ->
          category = @store.addCategory({name: "Spaceships"})
          expect(@store.getCategory("Spaceships")).toEqual category

        it "addCategory: it should add an asset for the category", ->
          @store.addCategory({name: "Spaceships", assetUrl: stubImage})
          expect(@store.assets.getCategoryAsset "Spaceships").toBe stubImage

        it "addCategory: it should use the placeholder when no asset is provided", ->
          @store.addCategory({name: "Spaceships"})
          expect(@store.assets.getCategoryAsset "Spaceships").toBe placeholder

        it "removeCategory: it should remove the category", ->
          size = @store.getCategories().size()
          category = @store.getCategories().last()
          @store.removeCategory(category)
          expect(@store.getCategories().size()).toBe (size - 1)

          # Assumes that the store fixture provides a category asset
          expect(@store.assets.getCategoryAsset(category.id)).toBe placeholder
          # TODO: expect that all related goods are removed



      describe "Virtual Goods", ->

        it "getGoodPacksForSingleUseGood: returns good packs associated with the given single use good", ->
          good = @store.getItem("switch")
          expect(@store.getGoodPacksForSingleUseGood(good).length).toBe 2
