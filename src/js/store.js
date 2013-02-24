define(["jquery", "js-api", "models", "components", "handlebars", "soomla-ios", "less", "templates", "helperViews"], function($, jsAPI, Models, Components, Handlebars, SoomlaIos) {

    // Checks if we're hosted in a parent frame.
    // If so, notify it of the given event.
    var triggerEventOnFrame = function(eventName) {
        try {
            if (frameElement && frameElement.ownerDocument.defaultView != window && frameElement.ownerDocument.defaultView.$) {
                frameElement.ownerDocument.defaultView.$(frameElement).trigger(eventName);
            }
        } catch(e) {}
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
                var templateAttributes = ["name", "orientation"];
                _.each(templateAttributes, function(attribute) {
                    if (!json.template[attribute]) throw new Error("Invalid JSON: missing `" + attribute + "` field in `template`.");
                });

                // Define which CSS, JS and Handlebars files need to be fetched
                var templatesFolder     = "/storefront-themes/templates",
                    templateName        = json.template.name,
                    cssFiles            = [templatesFolder + "/" + templateName + "/less/" + templateName + ".less"],
                    jsFiles             = [templatesFolder + "/" + templateName + "/js/" + templateName + "Views.js"],
                    htmlTemplatesPath   = templatesFolder + "/" + templateName + "/templates";


                // Append appropriate stylesheet
                // TODO: render the store as a callback to the CSS load event
                _.each(cssFiles, function(file) {
                    var isLess  = file.match(/\.less$/),
                        type    = isLess ? "text/less" : "text/css",
                        link    = $("<style>").appendTo($("head"));

                    $.get(file, function(data, textStatus, jqXHR) {
                        link.html(data).attr("type", type);
                        if (isLess) less.refreshStyles();
                    });
                });


                // Set template base path
                Handlebars.setTemplatePath(htmlTemplatesPath);


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

                require(jsFiles, function(ThemeViews) {

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
                    triggerEventOnFrame("store:initialized");
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
        triggerEventOnFrame("store:uiReady");
    });
});