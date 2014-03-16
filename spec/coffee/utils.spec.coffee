define ['utils'], (Utils) ->
  describe "Utils", ->

    it "replaceStringAttributes: should recursively replace regex-matched strings in a given object", ->
      obj = {a : "foo", b: {b1: "foobar", b2: "offbar"}, c: 100, d: {} }
      Utils.replaceStringAttributes(obj, /foo/, "off")
      expect(obj).toEqual  {a: "off", b: {b1: "offbar", b2: "offbar"}, c: 100, d: {}}

    it "setByKeyChain: should set the value of a deeply nested attribute", ->
      obj = {a : {b : {c :1}}}

      # Test array keychains
      Utils.setByKeyChain(obj, ["a", "b", "c"], 2 )
      Utils.setByKeyChain(obj, ["a", "b", "d"], 3 )
      expect(obj.a.b.c).toBe 2
      expect(obj.a.b.d).toBe 3

      # Test string keychains
      Utils.setByKeyChain(obj, "a.b.c", 4 )
      Utils.setByKeyChain(obj, "a.b.e", 5 )
      expect(obj.a.b.c).toBe 4
      expect(obj.a.b.e).toBe 5

    it "getByKeyChain: should get the value of a deeply nested attribute", ->
      obj = {a : {b : {c :1}}}

      # Test array keychains
      expect(Utils.getByKeychain(obj, ["a", "b", "c"])).toBe 1
      expect(Utils.getByKeychain(obj, ["a", "b", "d"])).toBe undefined

      # Test string keychains
      expect(Utils.getByKeychain(obj, "a.b.c")).toBe 1
      expect(Utils.getByKeychain(obj, "a.b.d")).toBe undefined


    it "createThemeAssetMap: Should flattern the theme to an asset map of {keychain: asset} ", ->
      obj = {}
      template = {
        a: {type: "image"}
        b : {
          b1: {type: "font"}
          b2: {type: "backgroundImage"}
        }
      }
      theme = {
        a: "foo"
        b: {
          b1: "bar1"
          b2: "bar2"
        }
      }
      Utils.createThemeAssetMap(template, theme, obj, "")

      expect(obj).toEqual {
        "a": "foo"
        "b.b1": "bar1"
        "b.b2": "bar2"
      }
