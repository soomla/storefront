define ["backbone", "models", "utils", "urls", "assetManager", "template", "errors", "text!modelFixture.json", "text!templateFixture.json"], (Backbone, Models, Utils, Urls, Assets, Template, Errors, modelFixture, templateFixture) ->

  # Prepare variables used in many test cases
  modelFixture    = JSON.parse(modelFixture)
  templateFixture = JSON.parse(templateFixture)
  placeholder     = Urls.imagePlaceholder
  barPlaceholder  = Urls.progressBarPlaceholder
  stubImage       = "data:image/png;base64,stubImage"


  # Helper function for cloning deep objects
  deepClone = (obj) ->
    JSON.parse(JSON.stringify(obj))


  # Helper function to correctly set up the prototype chain, for subclasses.
  # Similar to `goog.inherits`, but uses a hash of prototype properties and
  # class properties to be extended.
  extend = (target, protoProps) ->
    parent = target
    child = null

    # The constructor function for the new subclass is either defined by you
    # (the "constructor" property in your `extend` definition), or defaulted
    # by us to simply call the parent's constructor.
    if (protoProps && _.has(protoProps, 'constructor'))
      child = protoProps.constructor;
    else
      child = ->
        parent.apply(@, arguments)

    # Set the prototype chain to inherit from `parent`, without calling
    # `parent`'s constructor function.
    Surrogate = ->
      @.constructor = child
      return

    Surrogate.prototype = parent.prototype
    child.prototype = new Surrogate

    # Add prototype properties (instance properties) to the subclass,
    # if supplied.
    if (protoProps)
      _.extend(child.prototype, protoProps)

    # Set a convenience property in case the parent's prototype is needed
    # later.
    child.__super__ = parent.prototype
    child


  describe "Store - static methods", ->

    beforeEach ->
      @Store = extend(Models.Store)
      @Store.mixin = Models.Store.mixin

    afterEach ->

    it "mixin: should mixin attributes (from muliple modules) not names 'wrappers'", ->
      @Store.mixin({
        foo: (x)-> x
        bar: {a: 1}
        wrappers: {}
      }, {
        soom: 2
        la: ()->
      })
      expect(typeof @Store.prototype.foo).toBe "function"
      expect(@Store.prototype.bar).toEqual {a: 1}
      expect(typeof @Store.prototype.wrappers).toBeUndefined
      expect(@Store.prototype.soom).toBe 2
      expect(typeof @Store.prototype.la).toBe "function"

    xit "mixin: should wrap functions if they have an implementation provided in 'wrappers'", ->
      # TODO: Use spies
      @Store.prototype.log = ()->
      @Store.mixin({
        wrappers: {
          log: ->
        }
      })

      # TODO: Call store.log and check that both functions were called


  describe "Store", ->

    describe "Manipulation functions", ->
      beforeEach ->

        # In order to reset the JSON object everytime,
        # we deep clone it before initializing the store
        @store = new Models.Store(deepClone(modelFixture))

        # This is necessary to initialize the internal objects of the template object
        # TODO: This will need to be refactored out
        @store.buildTemplate(deepClone(templateFixture))
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

        it "addCurrency: should throw an exception when adding a currency with an existing name", ->
          expect(=>
            @store.addCurrency({name: "nuts"})
          ).toThrow()

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

        it "updateCurrencyName: updates an existing currency's name", ->
          currency = @store.updateCurrencyName("currency_nuts", "coins")
          expect(@store.getCurrency("currency_coins")).toEqual currency
          expect(@store.getCurrency("currency_nuts")).toBeUndefined()

        it "updateCurrencyName: updates an existing currency's asset mappings", ->
          asset = @store.assets.getItemAsset("currency_nuts")
          @store.updateCurrencyName("currency_nuts", "coins")
          expect(@store.assets.getItemAsset "currency_coins").toBe asset
          expect(@store.assets.getItemAsset "currency_nuts").not.toBe asset

        it "updateCurrencyName: should throw an exception when updating a category with an existing name", ->
          expect(=>
            @store.updateCurrencyName("currency_nuts", "nuts")
          ).toThrow()


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

        it "addCategory: should throw an exception when adding a category with an existing name", ->
          expect(=>
            @store.addCategory({name: "ANIMALS"})
          ).toThrow()

        it "removeCategory: it should remove the category", ->
          size = @store.getCategories().size()
          category = @store.getCategories().last()
          @store.removeCategory(category)
          expect(@store.getCategories().size()).toBe (size - 1)

          # Assumes that the store fixture provides a category asset
          expect(@store.assets.getCategoryAsset(category.id)).toBe placeholder
          # TODO: expect that all related goods are removed

        it "updateCategoryName: updates an existing category's name", ->
          category = @store.updateCategoryName("ANIMALS", "SAVAGES")
          expect(@store.getCategory("SAVAGES")).toEqual category
          expect(@store.getCategory("ANIMALS")).toBeUndefined()

        it "updateCategoryName: updates an existing category's asset mappings", ->
          asset = @store.assets.getCategoryAsset("ANIMALS")
          @store.updateCategoryName("ANIMALS", "SAVAGES")
          expect(@store.assets.getCategoryAsset "SAVAGES").toBe asset
          expect(@store.assets.getCategoryAsset "ANIMALS").not.toBe asset

        it "updateCategoryName: should throw an exception when updating a category with an existing name", ->
          expect(=>
            @store.updateCategoryName("ANIMALS", "HINTS")
          ).toThrow()


      describe "Virtual Goods", ->

        it "addVirtualGood: adds all types of goods to the head of the category", ->
          _.each ["singleUse", "lifetime", "equippable", "goodPacks", "upgradable"], (type) ->
            good = @store.addVirtualGood({type: type, categoryId: "HINTS"})
            expect(@store.getItem(good.id)).toEqual good
            expect(@store.getCategory("HINTS").getGoods().first(good)).toBeTruthy()
            expect(good.getType()).toBe type
          , @

        it "addVirtualGood: should add an asset for the good", ->
          good = @store.addVirtualGood({type: "singleUse", categoryId: "HINTS", assetUrl: stubImage})
          expect(@store.assets.getItemAsset(good.id)).toEqual stubImage

        it "addVirtualGood: should use the placeholder when no asset is provided", ->
          good = @store.addVirtualGood({type: "singleUse", categoryId: "HINTS"})
          expect(@store.assets.getItemAsset(good.id)).toEqual placeholder

        it "addVirtualGood: should add a single use good by default if the type isn't provided", ->
          good = @store.addVirtualGood({type: "singleUse", categoryId: "HINTS"})
          expect(@store.getSingleUseGoods().contains(good)).toBeTruthy()

        it "addVirtualGood: should add single use goods to the dedicated single use goods collection", ->
          good = @store.addVirtualGood({categoryId: "HINTS"})
          expect(good.getType()).toBe "singleUse"

        it "addVirtualGood: should assign the first virtual currency by default", ->
          good = @store.addVirtualGood({type: "singleUse"})
          expect(@store.getFirstCategory().getGoods().contains(good)).toBeTruthy()

        it "addVirtualGood: should assign the first virtual currency by default", ->
          good = @store.addVirtualGood({type: "singleUse", categoryId: "HINTS"})
          expect(good.getCurrencyId()).toBe @store.getFirstCurrency().id

        it "addVirtualGood: should assign the first single use good for good packs by default", ->
          good = @store.addVirtualGood({type: "goodPacks", categoryId: "HINTS"})
          expect(good.getGoodItemId()).toBe @store.getSingleUseGoods().first().id

        it "addVirtualGood: should throw an error if adding a good pack before having any single use goods", ->
          @store.getCategories().each(@store.removeCategory, @store)

          # TODO: Investigate why this needs to be called.  The single use collection should be updated when goods are removed
          @store.getSingleUseGoods().reset()

          expect(=>
            @store.addVirtualGood({type: "goodPacks", categoryId: "HINTS"})
          ).toThrow(new Errors.NoSingleUseGoodsError())

        it "removeVirtualGood: should remove the good", ->
          good = @store.getItem("switch")
          @store.removeVirtualGood(good)
          expect(@store.getItem("switch")).toBeUndefined()

        it "removeVirtualGood: should remove the good's asset", ->
          good = @store.getItem("switch")
          asset = @store.assets.getItemAsset("switch")
          @store.removeVirtualGood(good)
          expect(@store.assets.getItemAsset("switch")).toBe placeholder
          expect(asset).not.toBe placeholder

        it "removeVirtualGood: should remove single use goods from the single use goods collection", ->
          good = @store.getItem("switch")
          @store.removeVirtualGood(good)
          expect(@store.getSingleUseGoods().get("switch")).toBeUndefined()

        it "removeVirtualGood: should remove single use packs associated with a single use good", ->
          good = @store.getItem("switch")
          @store.removeVirtualGood(good)
          expect(@store.getItem("switch_pack_5")).toBeUndefined()
          expect(@store.getItem("switch_pack_10")).toBeUndefined()
          expect(@store.assets.getItemAsset("switch_pack_5")).toBe placeholder
          expect(@store.assets.getItemAsset("switch_pack_10")).toBe placeholder

        it "removeVirtualGood: should remove all good upgrades associated with a good", ->
          good = @store.getItem("speed_boost")
          @store.removeVirtualGood(good)

          expect(@store.assets.getItemAsset("speed_boost_upgrade0_bar")).toBe placeholder
          _.each ["speed_boost_upgrade1", "speed_boost_upgrade2", "speed_boost_upgrade3"], (upgrade)=>
            expect(@store.getItem(upgrade)).toBeUndefined()
            expect(@store.assets.getItemAsset(upgrade)).toBe placeholder
            expect(@store.assets.getItemAsset(upgrade + "_bar")).toBe placeholder


        describe "Market Purhcase only", ->

          it "addVirtualGood: should add a market purchase virtual good", ->
            delete @store.template.supportedFeatures.purchaseTypes.virtualItem
            good = @store.addVirtualGood({type: "singleUse"})
            expect(good.isMarketPurchaseType()).toBeTruthy()

          it "addVirtualGood: should add an asset for good", ->
            delete @store.template.supportedFeatures.purchaseTypes.virtualItem
            good = @store.addVirtualGood({type: "singleUse", assetUrl: stubImage})
            expect(@store.assets.getItemAsset(good.id)).toEqual stubImage

          it "addVirtualGood: should use the placeholder when no asset is provided", ->
            delete @store.template.supportedFeatures.purchaseTypes.virtualItem
            good = @store.addVirtualGood({type: "singleUse"})
            expect(@store.assets.getItemAsset(good.id)).toEqual placeholder


        describe "Upgradable Goods", ->

          it "addVirtualGood: should add an asset for the upgradable empty bar", ->
            good = @store.addVirtualGood({type: "upgradable", categoryId: "HINTS", progressBarAssetUrl: stubImage})
            expect(@store.assets.getUpgradeBarAsset(good.getEmptyUpgradeBarAssetId())).toBe stubImage

          it "addVirtualGood: should add a mapping to the upgrade", ->
            good = @store.addVirtualGood({type: "upgradable", categoryId: "HINTS", progressBarAssetUrl: stubImage})
            expect(@store.goodsMap[good.id]).toEqual good

          it "addVirtualGood: should add a first upgrade by default", ->
            good = @store.addVirtualGood({type: "upgradable", categoryId: "HINTS", progressBarAssetUrl: stubImage})
            expect(good.getUpgrades().size()).toBe 1

          it "addUpgrade: should add an upgrade", ->
            good = @store.addVirtualGood({type: "upgradable", categoryId: "HINTS"})
            @store.addUpgrade({goodItemId: good.id})
            expect(good.getUpgrades().size()).toBe 2

          it "addUpgrade: should add a mapping to the upgrade", ->
            good = @store.addVirtualGood({type: "upgradable", categoryId: "HINTS", progressBarAssetUrl: stubImage})
            upgrade = @store.addUpgrade({goodItemId: good.id})
            expect(@store.goodsMap[upgrade.id]).toEqual upgrade

          it "addUpgrade: should assign the first virtual currency by default", ->
            good = @store.addVirtualGood({type: "upgradable", categoryId: "HINTS"})
            upgrade = @store.addUpgrade({goodItemId: good.id})
            expect(upgrade.getCurrencyId()).toBe @store.getFirstCurrency().id

          it "addUpgrade: should add assets for the upgrade", ->
            good = @store.addVirtualGood({type: "upgradable", categoryId: "HINTS"})
            upgrade = @store.addUpgrade({goodItemId: good.id, progressBarAssetUrl: stubImage, assetUrl: stubImage})
            expect(@store.assets.getUpgradeAsset(upgrade.getUpgradeBarAssetId())).toBe stubImage
            expect(@store.assets.getUpgradeAsset(upgrade.getUpgradeImageAssetId())).toBe stubImage

          it "addUpgrade: should add assets for the upgrade", ->
            good = @store.addVirtualGood({type: "upgradable", categoryId: "HINTS"})
            upgrade = @store.addUpgrade({goodItemId: good.id, progressBarAssetUrl: stubImage, assetUrl: stubImage})
            expect(@store.assets.getUpgradeAsset(upgrade.getUpgradeBarAssetId())).toBe stubImage
            expect(@store.assets.getUpgradeAsset(upgrade.getUpgradeImageAssetId())).toBe stubImage

          it "addUpgrade: should use placeholders when no assets are provided", ->
            good = @store.addVirtualGood({type: "upgradable", categoryId: "HINTS"})
            upgrade = @store.addUpgrade({goodItemId: good.id})
            expect(@store.assets.getUpgradeAsset(upgrade.getUpgradeBarAssetId())).toBe barPlaceholder
            expect(@store.assets.getUpgradeAsset(upgrade.getUpgradeImageAssetId())).toBe placeholder

          it "removeUpgrade: should remove the upgrade", ->
            upgrade = @store.getItem("speed_boost").getUpgrades().first()
            @store.removeUpgrade(upgrade)
            expect(@store.getItem("speed_boost_upgrade2")).toBeUndefined()
            expect(@store.assets.getUpgradeBarAsset(upgrade.getUpgradeBarAssetId())).toBe barPlaceholder
            expect(@store.assets.getUpgradeAsset(upgrade.getUpgradeImageAssetId())).toBe placeholder


        describe "Updating item IDs", ->

          it "updateItemId: should update the good's ID", ->
            newItemId = "newSwitch"
            oldItemId = "switch"
            good = @store.getItem(oldItemId)
            @store.updateItemId(good, newItemId)

            expect(good.id).toBe newItemId

          it "updateItemId: should update the good's mapping", ->
            newItemId = "newSwitch"
            oldItemId = "switch"
            good = @store.getItem(oldItemId)
            category = @store.getGoodCategory(good.id)
            @store.updateItemId(good, newItemId)

            expect(@store.goodsMap[newItemId]).toEqual good
            expect(@store.goodsMap[oldItemId]).toBeUndefined()
            expect(@store.categoryMap[newItemId]).toEqual category
            expect(@store.goodsMap[oldItemId]).toBeUndefined()


          it "updateItemId: should update the currency pack's mapping", ->
            newItemId = "nuts_mega_pack_new"
            oldItemId = "nuts_mega_pack"
            pack      = @store.getCurrencyPack(oldItemId)
            @store.updateItemId(pack, newItemId)

            expect(@store.packsMap[newItemId]).toEqual pack
            expect(@store.packsMap[oldItemId]).toBeUndefined()

          it "updateItemId: should update the item's assets", ->
            newItemId = "newSwitch"
            oldItemId = "switch"
            good      = @store.getItem(oldItemId)
            asset     = @store.assets.getItemAsset("switch")
            @store.updateItemId(good, newItemId)

            expect(@store.assets.getItemAsset(newItemId)).toEqual asset
            expect(@store.assets.getItemAsset(oldItemId)).toEqual placeholder

          it "updateItemId: should update the upgradable good's assets", ->
            newItemId     = "speed_boost_new"
            oldItemId     = "speed_boost"
            good          = @store.getItem(oldItemId)
            oldBarAssetId = good.getEmptyUpgradeBarAssetId()
            newBarAssetId = good.getEmptyUpgradeBarAssetId(newItemId)
            asset         = @store.assets.getItemAsset(oldBarAssetId)
            @store.updateItemId(good, newItemId)

            expect(@store.assets.getItemAsset(newBarAssetId)).toBe asset
            expect(@store.assets.getItemAsset(oldBarAssetId)).toBe placeholder


        describe "Utility functions", ->

          it "getGoodPacksForSingleUseGood: returns good packs associated with the given single use good", ->
            good = @store.getItem("switch")
            expect(@store.getGoodPacksForSingleUseGood(good).length).toBe 2

          it "supportsMarketPurchaseTypeOnly: returns good packs associated with the given single use good", ->
            expect(@store.supportsMarketPurchaseTypeOnly()).toBeFalsy()
            delete @store.template.supportedFeatures.purchaseTypes.virtualItem
            expect(@store.supportsMarketPurchaseTypeOnly()).toBeTruthy()

          it "getTemplate: should return a template object", ->
            expect(@store.getTemplate() instanceof Template).toBeTruthy()

          it "initializeAssetManager: should return an `AssetManager` object", ->
            expect(@store.assets instanceof Assets.AssetManager).toBeTruthy()

          it "getSingleUseGoods: should retunrn all goods of type 'singleUse'", ->
            goods = new Backbone.Collection
            @store.getCategories().each (category)->
              category.getGoods().each (good)->
                goods.add(good) if good.getType() == "singleUse"

            @store.getSingleUseGoods().each (good)->
              expect(goods.get(good.id).toJSON()).toEqual good.toJSON()



        describe "JSON transformation", ->

          it "toJSON: should include a correct modelAssets object", ->
            modelAssetNames = _.extend {}, modelFixture.modelAssets.items, modelFixture.modelAssets.categories, modelFixture.modelAssets.hooks
            @store.injectAssets(modelAssetNames, {});
            expect(@store.toJSON().modelAssets).toEqual modelFixture.modelAssets

          it "toJSON: should include a correct theme object", ->
            themeAssetNames = {}
            Utils.createThemeAssetMap(templateFixture.attributes, modelFixture.theme, themeAssetNames, "");
            @store.injectAssets({}, themeAssetNames);
            expect(@store.toJSON().theme).toEqual modelFixture.theme

          it "toJSON: should omit the 'template.baseUrl' attribute", ->
            json = deepClone(modelFixture)
            json.template.baseUrl = "stubUrl"
            Backbone.Relational.store.reset()
            @store = new Models.Store(json)
            @store.buildTemplate(deepClone(templateFixture))
            expect(@store.toJSON().template.baseUrl).toBeUndefined()

          it "toJSON: should include the custom CSS attribute", ->
            expect(@store.toJSON().customCss).toEqual modelFixture.customCss
