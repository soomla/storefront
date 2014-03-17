define ["backbone", "storeModel", "utils", "urls", "errors",  "text!modelFixture.json", "text!templateFixture.json"], (Backbone, Store, Utils, Urls, Errors, modelFixture, templateFixture) ->

  # Prepare variables used in many test cases
  modelFixture    = JSON.parse(modelFixture)
  templateFixture = JSON.parse(templateFixture)
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
      @Store = extend(Store)
      @Store.mixin = Store.mixin

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
        @store = new Store(deepClone(modelFixture))

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

        it "addCurrency: should throw an exception when adding a currency with an existing name", ->
          expect(=>
            @store.addCurrency({name: "nuts"})
          ).toThrow()

        it "removeCurrency: it should remove the currency", ->
          size = @store.getCurrencies().size()
          currency = @store.getCurrencies().last()
          @store.removeCurrency(currency)
          expect(@store.getCurrencies().size()).toBe (size - 1)
          # TODO: expect that all related currency packs and goods are removed


      describe "Currency Packs", ->

        it "addCurrencyPack: it should add a new currency pack model", ->
          currencyPack = @store.addCurrencyPack({currency_itemId: "currency_nuts"})
          expect(@store.getCurrencyPack(currencyPack.id)).toEqual currencyPack
          expect(@store.getCurrencies().get(currencyPack.getCurrencyId()).getPacks().get(currencyPack.id)).toEqual currencyPack

        it "removeCurrencyPack: it should remove the currency pack", ->
          size = @store.getCurrencies().last().getPacks().size()
          currencyPack = @store.getCurrencies().last().getPacks().last()
          @store.removeCurrencyPack(currencyPack)
          expect(@store.getCurrencies().last().getPacks().size()).toBe (size - 1)
          expect(@store.packsMap[currencyPack.id]).toBeUndefined()

        it "updateCurrencyName: updates an existing currency's name", ->
          currency = @store.updateCurrencyName("currency_nuts", "coins")
          expect(@store.getCurrency("currency_coins")).toEqual currency
          expect(@store.getCurrency("currency_nuts")).toBeUndefined()

        it "updateCurrencyName: should throw an exception when updating a category with an existing name", ->
          expect(=>
            @store.updateCurrencyName("currency_nuts", "nuts")
          ).toThrow()


      describe "Categories", ->

        it "addCategory: it should add a new category model", ->
          category = @store.addCategory({name: "Spaceships"})
          expect(@store.getCategory("Spaceships")).toEqual category

        it "addCategory: should throw an exception when adding a category with an existing name", ->
          expect(=>
            @store.addCategory({name: "ANIMALS"})
          ).toThrow()

        it "removeCategory: it should remove the category", ->
          size = @store.getCategories().size()
          category = @store.getCategories().last()
          @store.removeCategory(category)
          expect(@store.getCategories().size()).toBe (size - 1)

          # TODO: expect that all related goods are removed

        it "updateCategoryName: updates an existing category's name", ->
          category = @store.updateCategoryName("ANIMALS", "SAVAGES")
          expect(@store.getCategory("SAVAGES")).toEqual category
          expect(@store.getCategory("ANIMALS")).toBeUndefined()

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

        it "addVirtualGood: should add a single use good by default if the type isn't provided", ->
          good = @store.addVirtualGood({type: "singleUse", categoryId: "HINTS"})
          expect(@store.getSingleUseGoods().contains(good)).toBeTruthy()

        it "addVirtualGood: should add single use goods to the dedicated single use goods collection", ->
          good = @store.addVirtualGood({categoryId: "HINTS"})
          expect(good.getType()).toBe "singleUse"

        it "addVirtualGood: should assign the first category by default", ->
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

        it "removeVirtualGood: should remove single use goods from the single use goods collection", ->
          good = @store.getItem("switch")
          @store.removeVirtualGood(good)
          expect(@store.getSingleUseGoods().get("switch")).toBeUndefined()

        it "removeVirtualGood: should remove single use packs associated with a single use good", ->
          good = @store.getItem("switch")
          @store.removeVirtualGood(good)
          expect(@store.getItem("switch_pack_5")).toBeUndefined()
          expect(@store.getItem("switch_pack_10")).toBeUndefined()

        it "removeVirtualGood: should remove all good upgrades associated with a good", ->
          good = @store.getItem("speed_boost")
          @store.removeVirtualGood(good)

          _.each ["speed_boost_upgrade1", "speed_boost_upgrade2", "speed_boost_upgrade3"], (upgrade)=>
            expect(@store.getItem(upgrade)).toBeUndefined()


        describe "Upgradable Goods", ->

          it "addVirtualGood: should add a mapping to the upgrade", ->
            good = @store.addVirtualGood({type: "upgradable", categoryId: "HINTS"})
            expect(@store.goodsMap[good.id]).toEqual good

          it "addVirtualGood: should add a first upgrade by default", ->
            good = @store.addVirtualGood({type: "upgradable", categoryId: "HINTS"})
            expect(good.getUpgrades().size()).toBe 1

          it "addUpgrade: should add an upgrade", ->
            good = @store.addVirtualGood({type: "upgradable", categoryId: "HINTS"})
            @store.addUpgrade({goodItemId: good.id})
            expect(good.getUpgrades().size()).toBe 2

          it "addUpgrade: should add a mapping to the upgrade", ->
            good = @store.addVirtualGood({type: "upgradable", categoryId: "HINTS"})
            upgrade = @store.addUpgrade({goodItemId: good.id})
            expect(@store.goodsMap[upgrade.id]).toEqual upgrade

          it "addUpgrade: should assign the first virtual currency by default", ->
            good = @store.addVirtualGood({type: "upgradable", categoryId: "HINTS"})
            upgrade = @store.addUpgrade({goodItemId: good.id})
            expect(upgrade.getCurrencyId()).toBe @store.getFirstCurrency().id

          it "removeUpgrade: should remove the upgrade", ->
            upgrade = @store.getItem("speed_boost").getUpgrades().first()
            @store.removeUpgrade(upgrade)
            expect(@store.getItem("speed_boost_upgrade2")).toBeUndefined()


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


        describe "Utility functions", ->

          it "getGoodPacksForSingleUseGood: returns good packs associated with the given single use good", ->
            good = @store.getItem("switch")
            expect(@store.getGoodPacksForSingleUseGood(good).length).toBe 2

          it "getSingleUseGoods: should retunrn all goods of type 'singleUse'", ->
            goods = new Backbone.Collection
            @store.getCategories().each (category)->
              category.getGoods().each (good)->
                goods.add(good) if good.getType() == "singleUse"

            @store.getSingleUseGoods().each (good)->
              expect(goods.get(good.id).toJSON()).toEqual good.toJSON()
