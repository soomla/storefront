define ['backbone', 'models', 'urls', 'hooks', 'text!modelFixture.json', 'text!templateFixture.json'], (Backbone, Models, Urls, Hooks, modelFixture, templateFixture) ->

  # Prepare variables used in many test cases
  modelFixture    = JSON.parse(modelFixture)
  templateFixture = JSON.parse(templateFixture)

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

    afterEach ->

      # Clear Backbone-Relation store, since it allows
      # registering each object in the store only once
      Backbone.Relational.store.reset()

    it "addHook: should add a hook", ->
      hook = @store.addHook("sponsorpay", {action : "offerwall"});
      expect(@store.getHookById(hook.id)).toEqual hook
