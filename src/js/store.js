define("store", ["jquery", "jsAPI", "models", "components", "handlebars", "utils", "userAgent", "soomlaiOS", "soomlaAndroid", "nativeApiStubs", "less", "templates", "helperViews", "jquery.preload"], function($, jsAPI, Models, Components, Handlebars, Utils, UserAgent, SoomlaIos, SoomlaAndroid) {

    // Checks if we're hosted in a parent frame.
    // If so, notify it of the given event.
    var triggerEventOnFrame = function(eventName, data) {
        try {
            if (frameElement && frameElement.ownerDocument.defaultView != window && frameElement.ownerDocument.defaultView.$) {
                frameElement.ownerDocument.defaultView.$(frameElement).trigger(eventName, data);
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



	//
	// Given the template and theme JSONs, manipulates the target object to
    // hold a mapping of {<asset keychain> : <name>}
    //
    // i.e. {"pages.goods.list.background" : "img/bg.png"}
    //
    var createThemeAssetMap = function(templateObj, themeObj, target, keychain) {

         _.each(templateObj, function(templateValue, templateKey) {
            var themeValue = themeObj[templateKey];

            // Check that theme value is defined.  This is to allow
            // Template attributes that a certain theme chooses not to use
            if (_.isObject(templateValue) && !_.isUndefined(themeValue)) {
                var currentKeychain = keychain + "." + templateKey;
                if (_.contains(["image", "backgroundImage", "font"], templateValue.type)) {
                    currentKeychain = currentKeychain.replace(".", "");
                    target[currentKeychain] = themeValue;
                } else {
                    createThemeAssetMap(templateValue, themeValue, target, currentKeychain);
                }
            }
        });
    };



    $(function() {

        window.SoomlaJS = _.extend({}, jsAPI, {
            // The native UI is loaded and the html needs to be rendered now
            initialize : function(json, options) {
                (options) || (options = {});

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

                // Save an untouched copy of the theme object so we can access its original names later
                var originalTheme = $.extend(true, {}, json.theme);


                // Create an asst map: item ID => asset name
                var modelAssetNames = _.extend({}, json.modelAssets.items, json.modelAssets.categories);

                // Start by augmenting the flat paths of images to relative paths
                if (options.assets) {
                    Utils.replaceAssetUrls(json.modelAssets, options.assets);
                    Utils.replaceAssetUrls(json.theme, options.assets);
                } else {
                    _.each(json.modelAssets, function(assets) {
                        Utils.assignAssetUrls(assets, /^img/, "../theme/img");
                    });
                    Utils.replaceStringAttributes(json.theme, /^img/, "../theme/img");
                    Utils.replaceStringAttributes(json.theme, /^fonts/, "../theme/fonts");
                }

                // Add a preload modal with the theme background
/*
                var modal = json.theme.noFundsModal || json.theme.pages.goods.noFundsModal;
                var prerollEl = $("#preroll-cover");
                var prerollDlg = prerollEl.find(".preroll-dialog");
                var prerollHdr = prerollDlg.find("h1");
                prerollEl.css('background-image', 'url("' + json.theme.background + '")');
                prerollHdr.text('Loading');
                prerollHdr.attr("style", prerollHdr.attr("style") + "; " + modal.textStyle);
                prerollDlg.css('background-image', 'url("' + modal.background + '")');
                prerollDlg.toggleClass('invisible', 'false');
*/

                // Define which CSS, JS and Handlebars files need to be fetched
                // The template folder is either overridden externally in the JSON or is hardcoded
                // to the location of the template on the device
                var templateName        = json.template.name,
                    templatesFolder     = json.template.baseUrl || "../template",
                    cssFiles            = [templatesFolder + "/less/" + templateName + ".less"],
                    templateModule      = templateName + "Views",
                    templateModulePath  = (json.template.baseUrl || "../../template") + "/js/" + templateModule,
                    htmlTemplatesPath   = templatesFolder  + "/templates";

                if (options.env === "dist") {

                    // In `dist` environment, assume template javascripts are
                    // already loaded locally in a script tag and require them
                    // by their module name and not by their relative URL
                    templateModulePath = templateModule
                }

                // Ensure the correct module is loaded for the template
                // This was previously done with a non-public Require.js API
                // to alter the config paths in runtime
                // See: https://groups.google.com/forum/?fromgroups#!topic/requirejs/Hf-qNmM0ceI
				// require.s.contexts._.config.paths[templateModule] = templateModulePath;
                var paths = {};
                paths[templateModule] = templateModulePath;
                require.config({paths: paths});



                // Append appropriate stylesheet
                // TODO: render the store as a callback to the CSS load event
                _.each(cssFiles, function(file) {

                    if (options.env === "dist") {

                        // In `dist` environment the less styles are already injected
                        // into the page, only need to refresh
                        less.refreshStyles();

                    } else {

                        // In non-`dist` environment, fetch the remote less file
                        // and then Less-compile it
                        var isLess  = file.match(/\.less$/),
                            type    = isLess ? "text/less" : "text/css",
                            rel     = isLess ? "stylesheet/text" : "stylesheet",
                            link    = $("<style>", {rel : rel, type : type}).appendTo($("head"));

                        $.get(file, function(data, textStatus, jqXHR) {
                            link.html(data).attr("type", type);
                            if (isLess) less.refreshStyles();
                        });
                    }
                });


                // Set template base path
                Handlebars.setTemplatePath(htmlTemplatesPath);

                // Add the data type for the template request since
                // Android doesn't auto-convert the response to a javascript object
                var cssHandlebarsUrl    = options.cssHandlebarsUrl || "css.handlebars",
                    templateJsonUrl     = options.templateJsonUrl  || (templatesFolder  + "/template.json"),
                    cssRequest 			= $.ajax({ url: cssHandlebarsUrl }),
                    templateRequest 	= $.ajax({ url: templateJsonUrl, dataType: "json" }),
                    _this           	= this,
                    storeViewDeferred 	= $.Deferred(),
                    backgroundImagesPromise;

                // Fetch the CSS template and the template definition, then compose a theme-specific rule set
                // and add it the document head.
                $.when(cssRequest, templateRequest).then(function (cssResponse, templateResponse) {
                    var cssTemplate         = cssResponse[0],
                        template            = templateResponse[0],
                        cssRuleSet          = [],
                        backgroundImages    = [],
                        themeCss;

                    // Create an asset map for the theme assets
                    var themeAssetNames = {};
                    createThemeAssetMap(template.attributes, originalTheme, themeAssetNames, "");
                    _this.store.injectAssets(modelAssetNames, themeAssetNames);



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
                    //
                    // Even if these conditions fail, always proceed to load the store by using $.always.
                    // Worst case - some images will be missing in the UI
                    //
                    // TODO: Add condition when the injected CSS is loaded
                    $.when(backgroundImagesPromise, storeViewDeferred.promise()).always(function() {

                        $("#preroll-cover").remove();

                        // Notify window when all images are loaded
                        var evt = document.createEvent('Event');
                        evt.initEvent('imagesLoaded', true, true);
                        window.dispatchEvent(evt);

                        // Notify hosting device and wrapper iframe (if we're in an iframe) that the store is initialized and ready for work
                        SoomlaNative.storeInitialized();
                        triggerEventOnFrame("store:initialized", _.extend({
                            template : template
                        }, options));
                    });
                });


                // Initialize model
                this.store = new Models.Store(json);

                // Inject the store template to the store model once it's loaded
                templateRequest.done(this.store.buildTemplate);


                require([templateModule], function(Theme) {

                    // Initialize view
                    _this.storeView = Theme.createStoreView({
                        storeViewOptions : {
                            model 			: _this.store,
                            el 				: $("#main"),
                            template 		: Handlebars.getTemplate("template"),
                            initViewItemId 	: options.initViewItemId,
                            deviceId 		: json.deviceId
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

        //
        // Add a vendor specific classes to the body to apply device specific CSS.
        // iPhone \ iPod example: add hacks on font-face + line height problems
        //
        var $body = $("body");
        if (UserAgent.iOS()) $body.addClass("ios-device");
        if (UserAgent.Android()) $body.addClass("android-device");


        // Assign the native API.  Here are the different cases:
        //
        // 1. The module is executed with `window.SoomlaNative` present
        //    	a) 	Without a stubbed API flag - it's an Android native app.
        // 			In this case the entire API is defined on the window
        // 			with Android's javascript interface mechanism.
        //		b) 	With a stubbed API flag - it's hosted in a page which
        // 			defines the `window.SoomlaNative` object with its API flagged as stubbed.
        //
        // 2. The module is executed without `window.SoomlaNative` present.
        //    This means we're in an iOS native app.  In this case, use
        //    the iOS's native API module (which uses the custom URL scheme mechanism)
        //
        var SoomlaNative = ((window.SoomlaNative && window.SoomlaNative.STUB_API) || !UserAgent.iOS()) ? window.SoomlaNative : SoomlaIos;
		SoomlaNative.uiReady();
        triggerEventOnFrame("store:uiReady");
    });
});