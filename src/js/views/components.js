define("components", ["jquery", "backbone", "itemViews", "expandableItemViews", "collectionViews", "soomlaAndroid", "soomlaiOS", "messaging", "userAgent", "constants", "jquery.fastbutton", "jquery.pnotify", "imagesloaded", "iscroll", "jqueryUtils"], function($, Backbone, ItemViews, ExpandableItemViews, CollectionViews, SoomlaAndroid, SoomlaIos, Messaging, UserAgent, Constants) {


    // Save a local copy
    var BaseView = ItemViews.BaseView;


    var ModalDialog = BaseView.extend({
        className : "modal-container",
        initialize : function(options) {
            _.bindAll(this, "close");
            this.parent = options.parent;
        },
        triggers : {
            "fastclick .close"    : "cancel",
            "fastclick .modal"    : "cancel",
            "fastclick .buy-more" : "buyMore",
            "fastclick .cancel"   : "cancel"
        },
        events : {
            "touchstart a" : "onTouchStart",
            "touchend a"   : "onTouchEnd",
            "touchcancel a": "onTouchEnd"
        },
        onTouchStart : function(event) {

            // For some reason, the current target wasn't the <a> tag but the
            // modal container, so work with the target and fetch its parent node
            this.$(event.target).parent().addClass("emulate-active");
        },
        onTouchEnd: function(event) {

            // For some reason, the current target wasn't the <a> tag but the
            // modal container, so work with the target and fetch its parent node
            this.$(event.target).parent().removeClass("emulate-active");
        },
        onRender : function() {
            this.parent.append(this.$el);
        },
        // The modal dialog model is a simple object, not a Backbone model
        serializeData : function() {
            return this.model;
        }
    });



    // Explanation:
    //
    // The idea is to manipulate an element's zoom factor so that it is perceived as big
    // and showing up on a significant portion of the screen, but not too big and not too small.
    // For this, we calculate as follows, using an example of a 460px wide modal that
    // should accommodate 80% of the screen:
    //
    // 1. Choose the dominant axis between height and width (the smaller one)
    // 2. Divide its size by the zoom factor to transform it to the template's dimensions
    // 3. Multiply it by the target ratio (80%), i.e. we want the dialog to have 80% width \ height of the viewport.
    // 4. This gives us the target width.  Then divide it by the original modal width to get the desired zoom factor
    //
    var calculateTransformedZoomFactor = function(bodyZoom, originalWidth, targetScreenWidthPortion) {
        var axisSize = innerWidth < innerHeight ? innerWidth : innerHeight;

        return ((axisSize / bodyZoom) * targetScreenWidthPortion) / originalWidth;
    };


    var SoomlaInfoModalDialog = Backbone.View.extend({
        initialize : function(options) {
            this.$soomlaInfoDialog = this.$("#soomla-info-dialog");
            this.updateZoomFactor(options.zoom);

            var deviceId = options.deviceId;

            if (deviceId && !_.isEmpty(deviceId)) {
                this.$("#device-id").html(deviceId);
                this.$soomlaInfoDialog.addClass("show-device-id");
            }
        },
        updateZoomFactor : function(zoom) {
            var zoomFactor = calculateTransformedZoomFactor(zoom, 460, 0.8);

            var attrs = {
                "zoom": zoomFactor,

                // Use "auto" instead of the zoom factor, because it was buggy on iPhone
                "-ms-text-size-adjust" 		: "auto",
                "-moz-text-size-adjust" 	: "auto",
                "-webkit-text-size-adjust" 	: "auto"
            };
            this.$soomlaInfoDialog.css(attrs);
        },
        events : {
            "fastclick" : function(event) { if (event && event.target === event.currentTarget) this.hide(); },
            "fastclick .close" : "hide"
        },
        show : function() {
            this.$el.show();
        },
        hide : function() {
            this.$el.hide();
        }
    });


    var BaseStoreView = BaseView.extend({
        constructor : function(options) {

            if (!(options.model && options.model.options.theme)) {
                var err = new Error("You must initialize the store with a model and make sure it has a theme");
                err.name = "InvalidInitializationError";
                throw err;
            }

            // Assign some of the provided options on the instance
            this.deviceId = options.deviceId;

            // Assign reference to native API on store view object.
            // This is used specifically by the Android native API module.
            this.nativeAPI = options.nativeAPI || window.SoomlaNative;
            _.bindAll(this, "leaveStore", "wantsToLeaveStore", "wantsToBuyItem", "playSound", "conditionalPlaySound", "render");

            // Assign theme before initialize function is called
            this.theme = options.model.options.theme;

            // Create an object to store all child views
            this.children = new Backbone.ChildViewContainer();

            // Wrap onRender function if it exists
            if (this.onRender && _.isFunction(this.onRender)) {
                var originalOnRender = this.onRender;
                this.onRender = _.bind(function() {
                    originalOnRender.call(this);
                    this.createIScrolls();
                    this.changeViewToItem(options.initViewItemId);
                    this.finalizeRendering();
                }, this);
            }

            // Apply original Backbone.View constructor
            BaseView.prototype.constructor.apply(this, arguments);

            // Balance currency balance changes
            this.listenTo(this.model.getCurrencies(), "change:balance", this.updateBalance, this);

            // Listen to market purchase events
            this.listenTo(this.model, "goods:update:before currencies:update:before", this.closeDialog, this);
        },
        serializeData : function() {
            var currencies  = this.model.getCurrencies().toJSON(),
                assets      = this.model.assets;

            _.each(currencies, function(currency) {
                currency.imgFilePath = assets.getItemAsset(currency.itemId);
            });
            return _.extend({}, this.theme, {currencies : currencies});
        },
        openLoadingDialog : function() {

            // Ensure dialog is closed
            this.closeDialog();

            this.dialog = new ModalDialog({
                parent      : this.$el,
                template    : Handlebars.getTemplate("modalDialog"),
                className   : "modal-container modal-loading",
                model       : this.loadingModal
            });

            return this.dialog.render();
        },
        openInsufficientFundsDialog : function(currencyId) {

            // Ensure dialog is closed
            this.closeDialog();

            this.dialog = new ModalDialog({
                parent      : this.$el,
                template    : Handlebars.getTemplate("modalDialog"),
                className   : "modal-container modal-insufficient-funds",
                model       : this.dialogModal
            }).on("cancel buyMore", function () {
                this.playSound();
                this.dialog.close();
            }, this).on("buyMore", function () {
                this.showCurrencyPacks(currencyId);
            }, this);

            return this.dialog.render();
        },
        openMessageDialog : function(text) {

            // Ensure dialog is closed
            this.closeDialog();

            this.dialog = new ModalDialog({
                parent      : this.$el,
                className   : "modal-container modal-loading",
                template    : Handlebars.getTemplate("modalDialog"),
                model       : _.extend({text : text}, this.messageDialogOptions)
            }).on("cancel", function () {
                this.playSound();
                this.dialog.close();
            }, this);

            return this.dialog.render();
        },
        closeDialog: function () {
            if (this.dialog) this.dialog.off().close();
            return this;
        },
        updateBalance : function(currency) {

            // Get the balance holder element
            var balanceHolder = (this._getBalanceHolder && _.isFunction(this._getBalanceHolder)) ?
            					this._getBalanceHolder(currency) :
								this.$("#balance-container label[data-currency='" + currency.id + "']");

            // Update label
            balanceHolder.text(currency.getBalance());

            // Animate currency label if balance was increased
			if (currency.balanceIncreased()) {

                // In the case of external balance injection, the dialog might not be defined
                if (this.dialog) this.dialog.close();

                balanceHolder.animateOnce("changed");
            }


        },
        createIScrolls : function() {
            if (this.iscrollRegions) {

                // Create a hash with all the iscrolls
                this.iscrolls = {};
                _.each(this.iscrollRegions, function (value, region) {
                    var _this = this,
                        options = $.extend({}, value.options);

                    // If the end callback is passed, wrap it. Part of Ran's work.
                    if (options.onScrollEnd) {
                        options.onScrollEndBinded = options.onScrollEnd;
                        options.onScrollEnd = function () {
                            options.onScrollEndBinded(_this, this);
                        };
                    }
                    this.iscrolls[region] = new iScroll(this.$(value.el)[0], options);
                }, this);

                // When images are loaded refresh all iscrolls
                this.once("imagesLoaded", function() {
                    _.each(this.iscrolls, function(iscroll) {
                        iscroll.refresh();
                    });
                }, this);
            }
        },
        finalizeRendering : function() {
            // When all store images are loaded, trigger an event
            // TODO: Preload images that aren't visible at first
            var _this = this;
            this.$el.imagesLoaded(function() {
                _this.trigger("imagesLoaded");
            });

            this.addSoomlaInfoModal();
            this.adjustZoom();
            return this;
        },
        adjustZoom : function() {
            if (this.zoomFunction) {
                // Adjust zoom to fit nicely in viewport
                // This helps cope with various viewports, i.e. mobile, tablet...
                var _this 		= this,
                	$body 		= $("body"),
                    $soombot    = $(".soombot"),
                    isIOS       = $body.hasClass("ios-device");

                var adjustBodySize = function() {
                    var zoomFactor      = _this.zoomFunction(),
                        zoomPercentage  = (zoomFactor * 100) + "%";

                    var attrs = {
                        "zoom": zoomFactor,
                        "-ms-text-size-adjust": zoomPercentage,
                        "-moz-text-size-adjust": zoomPercentage,
                        "-webkit-text-size-adjust": zoomPercentage
                    };

                    //
                    // Adjust the line height for the entire store view.
                    // Since the text-size-adjust property is applied to a certain zoom factor,
                    // it is imperative to set the line-height with the inverse factor to compensate
                    // for the text size changes.
                    //
                    // This injection stipulates that the entire CSS of the given store
                    // doesn't use the line-height property at all
                    //
                    if (isIOS) attrs["line-height"] =  (1 / zoomFactor);

                    $body.css(attrs);
                    $soombot.css({zoom : calculateTransformedZoomFactor(zoomFactor, 75, 0.15)});
                    _this.soomlaInfoDialog.updateZoomFactor(zoomFactor);
                };
                $(window).resize(adjustBodySize);
                adjustBodySize();
            }
        },
        addSoomlaInfoModal : function() {
            var dialog = this.soomlaInfoDialog = new SoomlaInfoModalDialog({
                el          : $("#soomla-info-modal"),
                zoom        : this.zoomFunction(),
                deviceId    : this.deviceId
            });
            var selector = this.model.isBranded() ? ".soombot" : ".nobrand";
            $(selector).show().on("fastclick", function(event) {
                dialog.show();
            });
        },
        leaveStore : function(options) {
            options || (options = {});
            if (!options.silent) this.playSound();
            this.wantsToLeaveStore();
        },
        conditionalPlaySound : function(view, options) {
            if (!(options && options.noSound)) return this.playSound();
            return this;
        }
    }, {

        // Explanation:
        // Most <a> elements in the templates have an ":active" state
        // which transitions or highlights the tapped \ clicked element somehow,
        // Android webkit doesn't support the ":active" CSS pseudo-selector, so instead
        // we emulate the same behavior by adding the ".emulate-active" class when the element
        // is tapped and removing it when the tap is released.
        // TODO: Eliminate inherent the 300ms delay when tapping (like the "fastclick" event does)
        mixinActiveTouchEmulation : (function() {

            var EmulateActiveModule = {
                onTouchStart : function(event) {
                    $(event.currentTarget).addClass("emulate-active");
                },
                onTouchEnd : function(event) {
                    $(event.currentTarget).removeClass("emulate-active");
                }
            };

            return function(overrideModule) {

                var to      = this.prototype,
                    els     = to.emulateActiveElements,
                    events  = {};

                // Proceed only if a valid selector string is found
                if (_.isString(els) && els.length > 0) {

                    // Make sure the target object has an events hash
                    if (!_.isObject(to.events)) to.events = {};

                    events["touchstart "    + els] = "onTouchStart";
                    events["touchend "      + els] = "onTouchEnd";
                    events["touchcancel "   + els] = "onTouchEnd";

                    // Inject the events into the target's events hash
                    _.defaults(to.events, events);

                    // Inject event handlers
                    _.extend(to, EmulateActiveModule, overrideModule);
                }
            };
        })()
    });


    // Extend the store view with the appropriate native API module
    // according to the user agent. The default is Android.
    _.extend(BaseStoreView.prototype, UserAgent.iOS() ? SoomlaIos : SoomlaAndroid);


    // Assign constants
    BaseStoreView.Const = {
        OFFERS_ID       : "__offers__",
        OFFERS_TITLE    : "Offers"
    };

    // Open a loading dialog and process initiate a hook
    // according to the given offer
    BaseStoreView.prototype.wantsToOpenOffer = function(offer) {

        var provider = offer.getProvider();

        var options = {action : offer.getAction()};
        if (provider.id === Constants.SPONSORPAY) {
            options.itemId = offer.getItemId();
        }

        this.wantsToInitiateHook(provider.id, options);
    };


    // Add message handling capabilities to store view
    _.extend(BaseStoreView.prototype, Messaging);


    return _.extend({}, ItemViews, ExpandableItemViews, CollectionViews, {
        ModalDialog     : ModalDialog,
        BaseStoreView   : BaseStoreView
    });
});