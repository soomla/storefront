define("utils", function() {

    // Extend String functionality
    String.prototype.snakeCase = function(){
        return this.toLowerCase().replace(/[^0-9a-z\s]+/g, "").trim().replace(/\s+/g, "_");
    };


    return {
        // Given an object, replaces all string attributes in the object (or deeply nested)
        // that match the given regex with the given replacement string.
        // Example:
        // ( {a : "foo", {b: "foobar"} }, /foo/, "off" )  ==>  {a: "off", {b: "offbar"}}
        replaceStringAttributes : function(obj, regex, replaceString) {
            var $this = this;
            _.each(obj, function(value, key) {
                if (_.isObject(value)) {
                    // Recursive call
                    $this.replaceStringAttributes(value, regex, replaceString);
                } else if (_.isString(value) && value.match(regex)) {
                    // Replace the path
                    obj[key] = value.replace(regex, replaceString);
                }
            });
        },
        //
        // Replaces URLs for a given collection of assets by
        // applying a regex and replacement string to the assets' URL
        //
        assignAssetUrls : function recursiveAssignAssetUrls(obj, regex, replaceString) {
            _.each(obj, function(url, name) {
                if (_.isObject(url)) {
                    recursiveAssignAssetUrls(url, regex, replaceString);
                } else {
                    obj[name] = url.replace(regex, replaceString);
                }
            });
        },
        //
        // Replaces URLs for a given collection of assets by providing
        // a replacements object that maps the assets' values to new values
        //
        replaceAssetUrls : function(assets, replacements) {
            var _this = this;
            _.each(assets, function(url, name) {
                if (_.isObject(url)) {
                    _this.replaceAssetUrls(url, replacements);
                } else if (replacements[url]) {

                    // Replace the asset value with the new mapped value
                    assets[name] = replacements[url];
                }
            });
        },
        // Find all theme attributes with URLs by walking the template object.
        // Add a prefix to these URLs
        augmentThemeUrls : function(templateObj, themeObj, prefixPath) {
            var _this = this;
            _.each(templateObj, function(templateValue, templateKey) {

                var themeValue = themeObj[templateKey];
                if (_.isObject(templateValue)) {
                    switch (templateValue.type) {
                        case "image":
                            themeObj[templateKey] = prefixPath + "/" + themeValue;
                            break;
                        case "backgroundImage":
                            themeObj[templateKey] = prefixPath + "/" + themeValue;
                            break;
                        case "font":
                            themeObj[templateKey].url = prefixPath + "/" + themeValue.url;
                            break;
                        case "css":
                            break;
                        default:
                            _this.augmentThemeUrls(templateValue, themeValue, prefixPath);
                    }
                }
            });
        },
        // Set the value of deeply nested attributes
        // Example:
        // ( {a : {b : {c :10}}},  ["a", "b", "c"], 20 )  ==>  {a : {b : {c :20}}}
        setByKeyChain : function(target, keychain, value) {

            if (_.isString(keychain)) keychain = keychain.split(".");

            var obj = target;
            _.each(keychain, function(key, i) {
                if (i == keychain.length - 1) {
                    obj[key] = value;
                } else {
                    (obj[key]) || (obj[key] = {});
                    obj = obj[key];
                }
            });
        },
        // Gets the value at any depth in a nested object based on the
        // path described by the given keychain.
        //
        // Example: {a : {b : c : "10"}}, "a[b][c]"   ==>  "10"
        //
        // Based on https://github.com/documentcloud/underscore-contrib
        //
        getByKeychain: function getPath (obj, keychain) {
            // If we have reached an undefined property
            // then stop executing and return undefined
            if (obj === undefined) return void 0;

            // If the path array has no more elements, we've reached
            // the intended property and return its value
            if (keychain.length === 0) return obj;

            // If we still have elements in the path array and the current
            // value is null, stop executing and return undefined
            if (obj === null) return void 0;

            return getPath(obj[_.first(keychain)], _.rest(keychain));
        }
    };
});