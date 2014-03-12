define ['backbone', 'models', 'assetManager', 'urls', 'hooks', 'text!modelFixture.json', 'text!templateFixture.json'], (Backbone, Models, Assets, Urls, Hooks, modelFixture, templateFixture) ->

  # Prepare variables used in many test cases
  modelFixture    = JSON.parse(modelFixture)
  templateFixture = JSON.parse(templateFixture)
  placeholder     = Urls.imagePlaceholder
  stubImage       = "data:image/png;base64,stubImage"

  deepClone = (obj) ->
    JSON.parse(JSON.stringify(obj))


  describe "Hooks Manager", ->
    beforeEach ->
      @hooks = new Hooks.HookManager {
        theme : modelFixture.theme,
        hooks : modelFixture.hooks,
        hooksProviders : modelFixture.hooks_providers || {}
      }

    afterEach ->

      # Clear Backbone-Relation store, since it allows
      # registering each object in the store only once
      Backbone.Relational.store.reset()


  describe "Hooks Mixin (Store context)", ->

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

    it "addHook: should add a hook", ->
      hook = @store.addHook("sponsorpay", {action : "offerwall"});
      expect(@store.getHookById(hook.id)).toEqual hook

    it "removeHook: should remove a hook's assets", ->
      hook = @store.addHook("sponsorpay", {action : "offerwall"});
      @store.setHookAsset(hook, {url : stubImage, name : "stubName"});
      expect(@store.assets.getHookAsset(hook.id)).toEqual stubImage
      @store.removeHook(hook)
      expect(@store.assets.getHookAsset(hook.id)).toEqual placeholder
