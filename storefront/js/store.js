define(["jquery", "js-api", "models", "components", "handlebars", "soomla-ios", "less", "templates"], function($, jsAPI, Models, Components, Handlebars, SoomlaIos) {

    // If pointing devices are enable (i.e. in the desktop generator \ mobile preview),
    // extend the views to capture their events.
    var addPointingDeviceEvents = function(target, events) {
        if (top.enablePointingDeviceEvents) {
            (target) || (target = {});
            _.extend(target, events);
        }
    };

    $(function() {

        window.SoomlaJS = _.extend({}, jsAPI, {
            // The native UI is loaded and the html needs to be rendered now
            initialize : function(json, templateLoadCallback) {

                // First, validate JSON attributes
                if (!json) {
                    throw new Error("No JSON passed to `initialize`");
                }
                var attributes = ["template", "modelAssets", "theme", "virtualCurrencies", "categories"];
                _.each(attributes, function(attribute) {
                    if (!json[attribute]) throw new Error("Invalid JSON: missing `" + attribute + "` field.");
                });
                var templateAttributes = ["cssFiles", "jsFiles", "htmlTemplatesPath"];
                _.each(templateAttributes, function(attribute) {
                    if (!json.template[attribute]) throw new Error("Invalid JSON: missing `" + attribute + "` field in `template`.");
                });

                // Append appropriate stylesheet
                // TODO: render the store as a callback to the CSS load event
                _.each(json.template.cssFiles, function(file) {
                    var isLess  = file.match(/\.less$/),
                        type    = isLess ? "text/less" : "text/css",
                        link    = $("<style>").appendTo($("head"));

                    $.get(file, function(data, textStatus, jqXHR) {
                        link.html(data).attr("type", type);
                        if (isLess) less.refreshStyles();
                    });
                });


                // Set template base path
                Handlebars.setTemplatePath(json.template.htmlTemplatesPath);


                // In case we're in the old model without a category => goods relationship, normalize.
                // **********   WARNING   **********
                // This condition can be removed only if all DB records have been migrated to the new relational model
                if (json.virtualGoods) {
                    _.each(json.categories, function(category) {
                        var categoryGoods = _.filter(json.virtualGoods, (function(item) {return item.categoryId == category.id}));
                        category.goods = categoryGoods;
                    });
                    delete json.virtualGoods;
                }

                // In case we're in the old model without a currency => packs relationship, normalize.
                // **********   WARNING   **********
                // This condition can be removed only if all DB records have been migrated to the new relational model
                if (json.currencyPacks) {
                    _.each(json.virtualCurrencies, function(currency) {
                        var packs = _.filter(json.currencyPacks, (function(item) {return item.currency_itemId == currency.itemId}));
                        currency.packs = packs;
                    });
                    delete json.currencyPacks;
                }


                // Initialize model
                this.store = new Models.Store(json);
                var $this = this;

                require(json.template.jsFiles, function(ThemeViews) {

                    // Call template load callback if provided
                    if (templateLoadCallback && _.isFunction(templateLoadCallback)) templateLoadCallback(ThemeViews, Components);

                    // Initialize view
                    $this.storeView = new ThemeViews.StoreView({
                        model : $this.store,
                        el : $("#main"),
                        template : Handlebars.getTemplate("template")
                    }).on("imagesLoaded", function() {

                        // Notify window when all images are loaded
                        var evt = document.createEvent('Event');
                        evt.initEvent('imagesLoaded', true, true);
                        window.dispatchEvent(evt);
                    }).render();


                    // place modules on SoomlaJS namespace for the designer to use
                    $this.Models = Models;

                    if (SoomlaNative && SoomlaNative.storeInitialized) SoomlaNative.storeInitialized();

                });

                return this.store;
            },
            Models : Models
        });

        // Notify native code that we're initialized only if an interface exists
        // i.e. only when running in a device and not in the store builder.
        if (isMobile.iOS()){
            window.SoomlaNative = SoomlaIos;
        }

        var SoomlaNative = window.SoomlaNative || top.SoomlaNative;
        if (SoomlaNative && SoomlaNative.uiReady) {
            SoomlaNative.uiReady();
        }

    });
});