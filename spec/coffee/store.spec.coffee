define ["backbone", "storeModel", "utils", "urls", "assetManager", "template", "errors", "dashboardHelpers",  "text!modelFixture.json", "text!templateFixture.json"], (Backbone, Store, Utils, Urls, Assets, Template, Errors, DashboardHelpers, modelFixture, templateFixture) ->

  # Prepare variables used in many test cases
  modelFixture    = JSON.parse(modelFixture)
  templateFixture = JSON.parse(templateFixture)
  placeholder     = Urls.imagePlaceholder
  barPlaceholder  = Urls.progressBarPlaceholder
  stubImage       = "data:image/png;base64,stubImage"


  # Helper function for cloning deep objects
  deepClone = (obj) ->
    JSON.parse(JSON.stringify(obj))


  # Extend Store prototype
  _.extend(Store.prototype, DashboardHelpers)


  describe "Store", ->

    describe "Manipulation functions", ->
      beforeEach ->

        # In order to reset the JSON object everytime,
        # we deep clone it before initializing the store
        @store = new Store(deepClone(modelFixture))

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

        it "addCurrency: it should add an asset for the currency", ->
          @store.addCurrency({name: "coins", assetUrl: stubImage})
          expect(@store.assets.getItemAsset "currency_coins").toBe stubImage

        it "addCurrency: it should use the placeholder when no asset is provided", ->
          @store.addCurrency({name: "coins"})
          expect(@store.assets.getItemAsset "currency_coins").toBe placeholder

        it "removeCurrency: it should remove the currency asset", ->
          currency = @store.getCurrencies().last()
          @store.removeCurrency(currency)
          expect(@store.assets.getItemAsset(currency.id)).toBe placeholder
          # TODO: expect that assets of all related currency packs and goods are removed


      describe "Currency Packs", ->

        it "addCurrencyPack: it should add an asset for the currency pack", ->
          currencyPack = @store.addCurrencyPack({currency_itemId: "currency_nuts", assetUrl: stubImage})
          expect(@store.assets.getItemAsset currencyPack.id).toBe stubImage

        it "addCurrencyPack: it should use the placeholder when no asset is provided", ->
          currencyPack = @store.addCurrencyPack({currency_itemId: "currency_nuts"})
          expect(@store.assets.getItemAsset currencyPack.id).toBe placeholder

        it "removeCurrencyPack: it should remove the currency pack asset", ->
          currencyPack = @store.getCurrencies().last().getPacks().last()
          @store.removeCurrencyPack(currencyPack)
          expect(@store.assets.getItemAsset(currencyPack.id)).toBe placeholder

        it "updateCurrencyName: updates an existing currency's asset mappings", ->
          asset = @store.assets.getItemAsset("currency_nuts")
          @store.updateCurrencyName("currency_nuts", "coins")
          expect(@store.assets.getItemAsset "currency_coins").toBe asset
          expect(@store.assets.getItemAsset "currency_nuts").not.toBe asset


      describe "Categories", ->

        it "addCategory: it should add an asset for the category", ->
          @store.addCategory({name: "Spaceships", assetUrl: stubImage})
          expect(@store.assets.getCategoryAsset "Spaceships").toBe stubImage

        it "addCategory: it should use the placeholder when no asset is provided", ->
          @store.addCategory({name: "Spaceships"})
          expect(@store.assets.getCategoryAsset "Spaceships").toBe placeholder

        it "removeCategory: it should remove the category asset", ->
          category = @store.getCategories().last()
          @store.removeCategory(category)

          # Assumes that the store fixture provides a category asset
          expect(@store.assets.getCategoryAsset(category.id)).toBe placeholder
          # TODO: expect that all assets of related goods are removed

        it "updateCategoryName: updates an existing category's asset mappings", ->
          asset = @store.assets.getCategoryAsset("ANIMALS")
          @store.updateCategoryName("ANIMALS", "SAVAGES")
          expect(@store.assets.getCategoryAsset "SAVAGES").toBe asset
          expect(@store.assets.getCategoryAsset "ANIMALS").not.toBe asset


      describe "Virtual Goods", ->

        it "addVirtualGood: should add an asset for the good", ->
          good = @store.addVirtualGood({type: "singleUse", categoryId: "HINTS", assetUrl: stubImage})
          expect(@store.assets.getItemAsset(good.id)).toEqual stubImage

        it "addVirtualGood: should use the placeholder when no asset is provided", ->
          good = @store.addVirtualGood({type: "singleUse", categoryId: "HINTS"})
          expect(@store.assets.getItemAsset(good.id)).toEqual placeholder

        it "removeVirtualGood: should remove the good's asset", ->
          good = @store.getItem("switch")
          asset = @store.assets.getItemAsset("switch")
          @store.removeVirtualGood(good)
          expect(@store.assets.getItemAsset("switch")).toBe placeholder
          expect(asset).not.toBe placeholder

        it "removeVirtualGood: should remove assets of single use packs associated with a single use good", ->
          good = @store.getItem("switch")
          @store.removeVirtualGood(good)
          expect(@store.assets.getItemAsset("switch_pack_5")).toBe placeholder
          expect(@store.assets.getItemAsset("switch_pack_10")).toBe placeholder

        it "removeVirtualGood: should remove all assets of good upgrades associated with a good", ->
          good = @store.getItem("speed_boost")
          @store.removeVirtualGood(good)

          expect(@store.assets.getItemAsset("speed_boost_upgrade0_bar")).toBe placeholder
          _.each ["speed_boost_upgrade1", "speed_boost_upgrade2", "speed_boost_upgrade3"], (upgrade)=>
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

          it "removeUpgrade: should remove the upgrade assets", ->
            upgrade = @store.getItem("speed_boost").getUpgrades().first()
            @store.removeUpgrade(upgrade)
            expect(@store.assets.getUpgradeBarAsset(upgrade.getUpgradeBarAssetId())).toBe barPlaceholder
            expect(@store.assets.getUpgradeAsset(upgrade.getUpgradeImageAssetId())).toBe placeholder


        describe "Updating item IDs", ->

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

          it "supportsMarketPurchaseTypeOnly: returns good packs associated with the given single use good", ->
            expect(@store.supportsMarketPurchaseTypeOnly()).toBeFalsy()
            delete @store.template.supportedFeatures.purchaseTypes.virtualItem
            expect(@store.supportsMarketPurchaseTypeOnly()).toBeTruthy()

          it "getTemplate: should return a template object", ->
            expect(@store.getTemplate() instanceof Template).toBeTruthy()

          it "initializeAssetManager: should return an `AssetManager` object", ->
            expect(@store.assets instanceof Assets.AssetManager).toBeTruthy()



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
            @store = new Store(json)
            @store.buildTemplate(deepClone(templateFixture))
            expect(@store.toJSON().template.baseUrl).toBeUndefined()

          it "toJSON: should include the custom CSS attribute", ->
            expect(@store.toJSON().customCss).toEqual modelFixture.customCss
