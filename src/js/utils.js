define("utils", function() {
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
        assignAssetUrls : function(obj, regex, replaceString) {
            _.each(obj, function(url, name) {
                obj[name] = url.replace(regex, replaceString);
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

        }

    };
});