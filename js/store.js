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
        "click .buy"    : "bought"
    });
    addPointingDeviceEvents(Components.ModalDialog.prototype.events, {
        "click .close"  : "close",
        "click .modal"  : "close"
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
            // TODO: Refactor function
            newStore : function(json) {
                var attributes = {};
                if (json) {

                    if (json.theme)
                        attributes.theme = json.theme;

                    if (json.virtualGoods)
                        attributes.virtualGoods = json.virtualGoods;

                    if (json.virtualCurrencies)
                        attributes.virtualCurrencies = json.virtualCurrencies;

                    if (json.currencyPacks)
                        attributes.currencyPacks = json.currencyPacks;

                    if (json.categories)
                        attributes.categories = json.categories;

                    if (json.isCurrencyStoreDisabled)
                        attributes.isCurrencyStoreDisabled = json.isCurrencyStoreDisabled;


                }

                this.store          = new Models.Store(attributes);
                var currencies      = this.store.get("virtualCurrencies"),
                    virtualGoods    = this.store.get("virtualGoods"),
                    currencyPacks   = this.store.get("currencyPacks"),
                    categories      = this.store.get("categories");

                // Add visual assets into the models
                currencies.each(    function(currency)  { currency.set("imgFilePath", json.modelAssets.virtualCurrencies[currency.id]); });
                virtualGoods.each(  function(good)      { good.set("imgFilePath", json.modelAssets.virtualGoods[good.id]);              });
                currencyPacks.each( function(pack)      { pack.set("imgFilePath", json.modelAssets.currencyPacks[pack.id]);             });

                // Add visual assets into categories.  Check if category assets are used first
                if (json.modelAssets.categories) {
                    _.each(categories, function(category) {
                        category.imgFilePath = json.modelAssets.categories[category.id];
                    });
                    this.store.set("categories", categories);
                }
            },
            // The native UI is loaded and the html needs to be rendered now
            initialize : function(json) {

                // Append appropriate stylesheet
                // TODO: render the store as a callback to the CSS load event
                var isLess  = json.cssFile.match(/\.less$/),
                    type    = isLess ? "text/less" : "text/css",
                    link    = $("<style>").appendTo($("head"));

                $.get(json.cssFile, function(data, textStatus, jqXHR) {
                    link.html(data).attr("type", type);
                    if (isLess) less.refreshStyles();
                });

                // Set template base path
                Handlebars.setTemplatePath(json.templatePath);

                // Initialize model
                this.newStore(json);
                var $this = this;

                require(json.jsFiles, function(ThemeViews) {

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

                    if (SoomlaNative && SoomlaNative.storeInitialized) SoomlaNative.storeInitialized();

                });

                return this.store;
            }
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