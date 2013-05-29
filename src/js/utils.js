define(function() {
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
        // applying a regex and replacement string to the assets' name
        //
        assignAssetUrls : function(obj, regex, replaceString) {
            _.each(obj, function(attributes) {
                if (_.isUndefined(attributes.url)) {
                    attributes.url = attributes.name.replace(regex, replaceString);
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