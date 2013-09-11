define("template", ["underscore", "utils"], function(_, Utils) {

    var Template = function(json) {

        // Save the raw JSON internally
        this.json = json;
    };

    _.extend(Template.prototype, {
        getTemplateImageDimensions : function(keychain) {
            try {
                var res = Utils.getByKeychain(this.json.assetMetadata.template, keychain);
                return {
                    width 	: res.w,
                    height 	: res.h
                };
            } catch (e) {
                return undefined;
            }
        },
        getSections : function() {
            return this.json.sections;
        }
    });


    return Template;
});
