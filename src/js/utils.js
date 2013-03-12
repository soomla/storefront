define(function() {
    return {
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