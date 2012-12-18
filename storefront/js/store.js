define(["jquery", "js-api", "native-api", "models", "components", "handlebars", "soomla-ios", "less", "templates"], function($, jsAPI, NativeAPI, Models, Components, Handlebars, SoomlaIos, Less) {

    // If pointing devices are enable (i.e. in the desktop generator \ mobile preview),
    // extend the views to capture their events.
    var addPointingDeviceEvents = function(target, events) {
        if (top.enablePointingDeviceEvents) {
            (target) || (target = {});
            _.extend(target, events);
        }
    };
    addPointingDeviceEvents(Components.ListItemView.prototype.triggers, {click : "selected"});
    addPointingDeviceEvents(Components.ExpandableListItemView.prototype.events, {
        click           : "onSelect"
    });
    addPointingDeviceEvents(Components.ExpandableListItemView.prototype.triggers, {
        "click .buy"    : "buy"
    });
    addPointingDeviceEvents(Components.ModalDialog.prototype.triggers, {
        "click .close"      : "cancel",
        "click .modal"      : "cancel",
        "click .buy-more"   : "buyMore",
        "click .cancel"     : "cancel"
    });

    $(function() {

        var recursiveThemeUpdate = function(obj) {
            _.each(obj, function(value, key) {
                if (_.isObject(value)) {
                    recursiveThemeUpdate(value);
                } else if (key == "template" && Handlebars.templates[value] && _.isFunction(Handlebars.templates[value])) {
                    obj[key] = Handlebars.templates[value];
                }
            });
        };

        window.SoomlaJS = _.extend({}, jsAPI, {
            // The native UI is loaded and the html needs to be rendered now
            initialize : function(json) {

                // First, validate JSON attributes
                if (!json) {
                    throw new Error("No JSON passed to `initialize`");
                }
                var attributes = ["template", "modelAssets", "theme", "virtualGoods", "virtualCurrencies", "currencyPacks", "categories"];
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

                // Initialize model
                this.store = new Models.Store(json);
                var $this = this;

                require(json.template.jsFiles, function(ThemeViews) {

                    // Add pointing device events
                    addPointingDeviceEvents(ThemeViews.StoreView.prototype.events, {
                        "click .leave-store"    : "wantsToLeaveStore",
                        "click .buy-more"       : "showCurrencyStore",
                        "click .back"           : "showGoodsStore"
                    });

                    // Initialize view
                    $this.storeView = new ThemeViews.StoreView({
                        model : $this.store,
                        el : $("#main"),
                        callbacks : json ? json.callbacks : {},
                        template : Handlebars.getTemplate("template")
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