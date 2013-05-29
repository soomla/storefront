define(["jquery", "js-api", "models", "components", "handlebars", "utils", "userAgent", "soomla-ios", "less", "templates", "helperViews", "jquery.preload"], function($, jsAPI, Models, Components, Handlebars, Utils, UserAgent, SoomlaIos) {

    // Checks if we're hosted in a parent frame.
    // If so, notify it of the given event.
    var triggerEventOnFrame = function(eventName) {
        try {
            if (frameElement && frameElement.ownerDocument.defaultView != window && frameElement.ownerDocument.defaultView.$) {
                frameElement.ownerDocument.defaultView.$(frameElement).trigger(eventName);
            }
        } catch(e) {}
    };

    // Utility function to recursively traverse the template and theme trees
    // and apply a callback function on each node that's an object
    var pickRecursive = function(templateObj, themeObj, picked, callback) {
        _.each(templateObj, function(templateValue, templateKey) {
            var themeValue = themeObj[templateKey];

            // Check that theme value is defined.  This is to allow
            // Template attributes that a certain theme chooses not to use
            if (_.isObject(templateValue) && !_.isUndefined(themeValue)) {
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



    var themeRelativePath = "../theme";

    $(function() {

        window.SoomlaJS = _.extend({}, jsAPI, {
            // The native UI is loaded and the html needs to be rendered now
            initialize : function(json, templateLoadCallback) {

                // First, validate JSON attributes
                if (!json) {
                    throw new Error("No JSON passed to `initialize`");
                }
                var attributes = ["template", "modelAssets", "theme", "currencies", "categories"];
                _.each(attributes, function(attribute) {
                    if (!json[attribute]) throw new Error("Invalid JSON: missing `" + attribute + "` field.");
                });
                var templateAttributes = ["name", "orientation"];
                _.each(templateAttributes, function(attribute) {
                    if (!json.template[attribute]) throw new Error("Invalid JSON: missing `" + attribute + "` field in `template`.");
                });


                // Start by augmenting the flat paths of images to relative paths
                if (!json.imagePathsAugmented) {
                    _.each(json.modelAssets, function(assets) {
                        Utils.assignAssetUrls(assets, /^img/, "../theme/img");
                    });
                    Utils.replaceStringAttributes(json.theme, /^img/, "../theme/img");
                    Utils.replaceStringAttributes(json.theme, /^fonts/, "../theme/fonts");
                }


                // Define which CSS, JS and Handlebars files need to be fetched
                // The template folder is either overriden externally in the JSON or is hardcoded
                // to the location of the template on the device
                var templateName        = json.template.name,
                    templatesFolder     = json.template.baseUrl || "../template",
                    cssFiles            = [templatesFolder + "/less/" + templateName + ".less"],
                    jsFiles             = [templatesFolder + "/js/" + templateName + "Views.js"],
                    htmlTemplatesPath   = templatesFolder  + "/templates",
                    templateDefinition  = templatesFolder  + "/template.json";


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

                // Add the data type for the template request since
                // Android doesn't auto-convert the response to a javascript object
                var cssRequest 			= $.ajax({ url: "css.handlebars" }),
                    templateRequest 	= $.ajax({ url: templateDefinition, dataType: "json" }),
                    $this           	= this,
                    storeViewDeferred 	= $.Deferred(),
                    backgroundImagesPromise;

                // Fetch the CSS template and the template definition, then compose a theme-specific rule set
                // and add it the document head.
                $.when(cssRequest, templateRequest).then(function(cssResponse, templateResponse) {
                    var cssTemplate         = cssResponse[0],
                        template            = templateResponse[0],
                        cssRuleSet          = [],
                        backgroundImages    = [],
                        themeCss;

                    // Append theme specific styles to head with a promise
                    pickCss(template.attributes, json.theme, cssRuleSet);
                    themeCss = Handlebars.compile(cssTemplate)(cssRuleSet);
                    $(themeCss).appendTo($("head"));

                    // Preload CSS background images with a promise
                    pickImages(template.attributes, json.theme, backgroundImages);
                    backgroundImages = _.compact(backgroundImages);
                    backgroundImagesPromise = $.preload(backgroundImages);


                    // Expose UI and notify application when all conditions are met:
                    // 1. The store is rendered (and all regular images are preloaded)
                    // 2. Background images were preloaded
                    // TODO: Add condition when the injected CSS is loaded
                    $.when(backgroundImagesPromise, storeViewDeferred.promise()).then(function() {

                        $("#preroll-cover").remove();

                        // Notify window when all images are loaded
                        var evt = document.createEvent('Event');
                        evt.initEvent('imagesLoaded', true, true);
                        window.dispatchEvent(evt);

                        // Notify hosting device and wrapper iframe (if we're in an iframe) that the store is initialized and ready for work
                        if (SoomlaNative && SoomlaNative.storeInitialized) SoomlaNative.storeInitialized();
                        triggerEventOnFrame("store:initialized");
                    });
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
                    _.each(json.currencies, function(currency) {
                        var packs = _.filter(json.currencyPacks, (function(item) {return item.currency_itemId == currency.itemId}));
                        currency.packs = packs;
                    });
                    delete json.currencyPacks;
                }

                // Move the raw categories' metadata, because the `categories` attribute
                // should be saved for the backbone relational categories collection
                json.rawCategories = json.categories;
                json.categories = [];


                // Initialize model
                this.store = new Models.Store(json);

                require(jsFiles, function(Theme) {

					// Call template load callback if provided
					if (templateLoadCallback && _.isFunction(templateLoadCallback)) templateLoadCallback(Theme, Components);

					// Initialize view
                    $this.storeView = Theme.createStoreView({
                        storeViewOptions : {
                            model : $this.store,
                            el : $("#main"),
                            template : Handlebars.getTemplate("template")
                        },
                        imagesLoadedCallback : storeViewDeferred.resolve
                    });
				});

                return this.store;
            },
            // place modules on SoomlaJS namespace for the designer to use
            Models : Models,
            Components : Components
        });

        // iPhone \ iPod hack: add a "iphone" class to the body to apply
        // iPhone specific CSS hacks on font-face + line height problems
        if (UserAgent.iPhone()) {
            $("body").addClass("iphone");
        }

        // Notify native code that we're initialized only if an interface exists
        // i.e. only when running in a device and not in the store builder.
        if (UserAgent.iOS()){
            window.SoomlaNative = SoomlaIos;
        }

        var SoomlaNative = window.SoomlaNative || top.SoomlaNative;
        if (SoomlaNative && SoomlaNative.uiReady) {
            SoomlaNative.uiReady();
        }
        triggerEventOnFrame("store:uiReady");
    });
});