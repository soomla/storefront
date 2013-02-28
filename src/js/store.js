define(["jquery", "js-api", "models", "components", "handlebars", "soomla-ios", "less", "templates", "helperViews", "jquery.preload"], function($, jsAPI, Models, Components, Handlebars, SoomlaIos) {

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
                    htmlTemplatesPath   = templatesFolder  + "/" + templateName + "/templates",
                    templateDefinition  = templatesFolder  + "/" + templateName + "/template.json";


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

                // Utility function to recursively traverse the template and theme trees
                // and apply a callback function on each node that's an object
                var pickRecursive = function(templateObj, themeObj, picked, callback) {
                    _.each(templateObj, function(templateValue, templateKey) {
                        var themeValue = themeObj[templateKey];
                        if (_.isObject(templateValue)) {
                            if (!callback(templateValue, themeValue, picked)) pickRecursive(templateValue, themeValue, picked, callback);
                        }
                    });

                };

                // A function that enumerates the template definition object and
                // composes a CSS rule set.  Selectors are taken from the template definition
                // and the actual CSS rules are taken from the theme object
                var pickCss = function(templateObj, themeObj, picked) {
                    pickRecursive(templateObj, themeObj, picked, function(templateValue, themeValue, picked) {
                        if (templateValue.type === "css") {
                            picked.push({selector : templateValue.selector, rules: themeValue});
                            return true;
                        }
                        if (templateValue.type === "backgroundImage") {
                            picked.push({selector : templateValue.selector, rules: "background-image: url('" + themeValue + "');"});
                            return true;
                        }
                        return false;
                    });
                };
                // A function that enumerates the template definition object and
                // composes a list of background image URLs to preload
                var pickImages = function(templateObj, themeObj, picked) {
                    pickRecursive(templateObj, themeObj, picked, function(templateValue, themeValue, picked) {
                        if (templateValue.type === "backgroundImage") {
                            picked.push(themeValue);
                            return true;
                        }
                        return false;
                    });
                };


                var cssRequest 		= $.ajax({ url: "css.handlebars" }),
                    templateRequest = $.ajax({ url: templateDefinition }),
                	themeCss;

                // Fetch the CSS template and the template definition, then compose a theme-specific rule set
                // and add it the document head.
                // TODO: Listen to css load event and add it as a deferred object to the rest of the initialization
                $.when(cssRequest, templateRequest).then(function(cssResponse, templateResponse) {
                    var cssTemplate         = cssResponse[0],
                        template            = templateResponse[0],
                        cssRuleSet          = [],
                        backgroundImages    = [];

                    // Append theme specific styles to head
                    pickCss(template.attributes, json.theme, cssRuleSet);
                    themeCss = Handlebars.compile(cssTemplate)(cssRuleSet);
                    $(themeCss).appendTo($("head"));

                    // Preload CSS background images
                    pickImages(template.attributes, json.theme, backgroundImages);
                    backgroundImages = _.compact(backgroundImages);
                    $.preload(backgroundImages)
                });


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

                        $("#preroll-cover").remove();

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