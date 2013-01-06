define(["handlebars", "underscore", "jquery"], function(Handlebars, _, $) {

    Handlebars.registerHelper('formatCurrency', function(value) {
        return parseFloat(value).toFixed(2);
    });

    // A helper for generating @font-face CSS directives from the
    // theme's fonts, and classes using them
    Handlebars.registerHelper("fontFaceStylesheet", function(fonts) {

        var buffer = "<style>\n", i;
        _.each(fonts, function(font, index) {
            i = index + 1;

            // Define the font face with a numbered name and source URL
            buffer += "\t@font-face {\n";
            buffer += "\t\tfont-family: FontFace" + i + ";\n";
            buffer += "\t\tsrc: url('" + font.url + "');\n";

            // Add additional font face properties if they exist
            if (font.stretch)   buffer += "\t\tfont-stretch: "  + font.stretch  + ";\n";
            if (font.weight)    buffer += "\t\tfont-weight: "   + font.weight   + ";\n";

            // Add a numbered class that will apply the font face
            buffer += "\t}\n";
            buffer += "\t.font-face-" + i + "{ font-family: FontFace" + i + "; }\n";
        });

        buffer += "</style>";

        // return the finished buffer
        return new Handlebars.SafeString(buffer);
    });

    _.extend(Handlebars, {
        _templatePath : "",
        setTemplatePath : function(templatePath) {
            this._templatePath = templatePath;
        },
        getTemplate : function (path, name) {
            // Normalize arguments
            if (!name) {
                name = path;
                path = this._templatePath;
            }

            if (Handlebars.templates === undefined || Handlebars.templates[name] === undefined) {
                $.ajax({
                    url : path + "/" + name + '.handlebars',
                    success : function (data) {
                        if (Handlebars.templates === undefined) {
                            Handlebars.templates = {};
                        }
                        Handlebars.templates[name] = Handlebars.compile(data);
                    },
                    async : false
                });
            }
            return Handlebars.templates[name];
        }
    });

});