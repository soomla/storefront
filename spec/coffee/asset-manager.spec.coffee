define ['assetManager', 'urls', 'hooks'], (Assets, Urls, Hooks) ->
  describe "Asset Manager", ->
    beforeEach ->
      @assets = new Assets.AssetManager {
        modelAssets: {items: {}},
        theme: {}
      }
      @assets.modelAssetNames = {}
      @assets.themeAssetNames = {}

      @asset = "asset"
      @url = "http://item.asset/url"
      @name = "assetName"


    afterEach ->
      delete @assets

    it "Should return a placeholder image for non-existent IDs", ->
      expect(@assets.getItemAsset(@asset)).toBe Urls.imagePlaceholder
      expect(@assets.getCategoryAsset(@asset)).toBe Urls.imagePlaceholder
      expect(@assets.getUpgradeAsset(@asset)).toBe Urls.imagePlaceholder
      expect(@assets.getUpgradeBarAsset(@asset)).toBe Urls.progressBarPlaceholder
      expect(@assets.getItemAsset(@asset)).toBe Urls.imagePlaceholder
      expect(@assets.getHookAsset(@asset)).toBe Urls.imagePlaceholder

    it "Should set \ get an item assets", ->
      @assets.setItemAsset(@asset, @url, @name)
      expect(@assets.getItemAsset(@asset)).toBe @url
      expect(@assets.getModelAssetName(@asset)).toBe @name

    it "Should set \ get a category assets", ->
      @assets.setCategoryAsset(@asset, @url, @name)
      expect(@assets.getCategoryAsset(@asset)).toBe @url
      expect(@assets.getModelAssetName(@asset)).toBe @name

    it "Should set \ get an upgrade asset", ->
      @assets.setUpgradeAsset(@asset, @url, @name)
      expect(@assets.getUpgradeAsset(@asset)).toBe @url
      expect(@assets.getModelAssetName(@asset)).toBe @name

    it "Should set \ get an upgrade bar asset", ->
      @assets.setUpgradeBarAsset(@asset, @url, @name)
      expect(@assets.getUpgradeBarAsset(@asset)).toBe @url
      expect(@assets.getModelAssetName(@asset)).toBe @name

    it "Should set \ get a theme asset", ->
      @assets.setThemeAsset(@asset, @url, @name)
      expect(@assets.getThemeAsset(@asset)).toBe @url
      expect(@assets.getThemeAssetName(@asset)).toBe @name

    it "Should set \ get a hook asset", ->
      hook = new Hooks.Action({
        id      : _.uniqueId("hook_"),
        itemId  : "currency_coins"
      })
      @assets.setHookAsset(hook.id, @url, @name)
      expect(@assets.getHookAsset(hook.id)).toBe @url


    # TODO: see how to store model asset names for hooks
    #    expect(@assets.getModelAssetName(@asset)).toBe @name


    it "Should set \ get a hook asset", ->
      @assets.setHookAsset("sponsorpay", @url, @name)
      expect(@assets.getHookAsset("sponsorpay", {itemId: "currency_coins"})).toBe @url
