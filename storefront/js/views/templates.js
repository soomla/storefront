define(["handlebars", "underscore", "jquery"], function(Handlebars, _, $) {

    Handlebars.registerHelper('formatCurrency', function(value) {
        return parseFloat(value).toFixed(2);
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