define ["backbone", "models", "urls", "text!fixture1.json"], (Backbone, Models, Urls, fixture) ->

  fixture = JSON.parse(fixture)
  placeholder = Urls.imagePlaceholder

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
        Backbone.Relational.store.reset(@currency)


      # TODO: Test adding duplicates
      # TODO: Test adding the objects to internal maps (?)

      it "addCurrency: it should add a new currency model", ->
        @currency = @store.addCurrency({name: "coins"})
        expect(@store.getCurrency("currency_coins")).toEqual @currency

      it "addCurrency: it should add an asset for the currency", ->
        @currency = @store.addCurrency({name: "coins"})
        expect(@store.assets.getItemAsset "currency_coins").toBeDefined()

      it "removeCurrency: it should remove the currency", ->
        size = @store.getCurrencies().size()
        currency = @store.getCurrencies().last()
        @store.removeCurrency(currency)
        expect(@store.getCurrencies().size()).toBe (size - 1)
        console.log @store.assets
        expect(@store.assets.getItemAsset(currency.id)).toBe placeholder

      it "addCategory: it should add a new category model", ->
        @category = @store.addCategory({name: "Spaceships"})
        expect(@store.getCategory("Spaceships")).toEqual @category

      it "addCategory: it should add an asset for the category", ->
        @category = @store.addCategory({name: "Spaceships"})
        expect(@store.assets.getCategoryAsset "Powerups").toBeDefined()
