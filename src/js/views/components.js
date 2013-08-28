define("components", ["jquery", "backbone", "itemViews", "expandableItemViews", "collectionViews", "viewMixins", "jquery.fastbutton", "imagesloaded", "iscroll"], function($, Backbone, ItemViews, ExpandableItemViews, CollectionViews, ViewMixins) {


    // Save a local copy
    var BaseView = ItemViews.BaseView;


    // TODO: Separate into several views that are template specific
    var ModalDialog = BaseView.extend({
        className : "modal-container",
        initialize : function() {
            _.bindAll(this, "close");
        },
        triggers : {
            "fastclick .close"    : "cancel",
            "fastclick .modal"    : "cancel",
            "fastclick .buy-more" : "buyMore",
            "fastclick .cancel"   : "cancel"
        },
        onRender : function() {
            this.options.parent.append(this.$el);
        },
        // The modal dialog model is a simple object, not a Backbone model
        serializeData : function() {
            return this.model;
        }
    });


    var SoomlaInfoModalDialog = Backbone.View.extend({
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

            if (!(options.model && options.model.get("theme"))) {
                var err = new Error("You must initialize the store with a model and make sure it has a theme");
                err.name = "InvalidInitializationError";
                throw err;
            }

            // Bind native API
            this.nativeAPI = options.nativeAPI || window.SoomlaNative;
            _.bindAll(this, "leaveStore", "wantsToLeaveStore", "wantsToBuyItem", "wantsToRestorePurchases", "playSound", "conditionalPlaySound", "render");

            // Assign theme before initialize function is called
            this.theme = options.model.get("theme");

            // Create an object to store all child views
            this.children = new Backbone.ChildViewContainer();

            // Wrap onRender function if it exists
            if (this.onRender && _.isFunction(this.onRender)) {
                var originalOnRender = this.onRender;
                this.onRender = _.bind(function() {
                    originalOnRender.call(this);
                    this.createIScrolls();
                    this.changeViewToItem(this.options.initViewItemId);
                    this.finalizeRendering();
                }, this);
            }

            // Apply original Backbone.View constructor
            BaseView.prototype.constructor.apply(this, arguments);

            // Balance currency balance changes
            this.model.getCurrencies().on("change:balance", this.updateBalance, this);

            // Listen to market purchase events
            this.listenTo(this.model, "goods:update:before currencies:update:before", this.closeDialog, this);
        },
        serializeData : function() {
            var currencies  = this.model.getCurrencies().toJSON(),
                modelAssets = this.model.getModelAssets();

            _.each(currencies, function(currency) {
                currency.imgFilePath = modelAssets.items[currency.itemId];
            });
            return _.extend({}, this.theme, {currencies : currencies});
        },
        openDialog : function(currencyId) {

            // Ensure dialog is closed
            this.closeDialog();

            this.dialog = new ModalDialog({
                parent 	: this.$el,
                template: Handlebars.getTemplate("modalDialog"),
                model	: !currencyId ? this.loadingModal : this.dialogModal
            });

            if (currencyId) {
                this.dialog.on("cancel buyMore", function () {
                    this.playSound();
                    this.dialog.close();
                }, this).on("buyMore", function () {
                    this.showCurrencyPacks(currencyId);
                }, this);
            }

            return this.dialog.render();
        },
        openMessageDialog : function(text) {

            // Ensure dialog is closed
            this.closeDialog();

            this.dialog = new ModalDialog({
                parent  : this.$el,
                template: Handlebars.getTemplate("modalDialog"),
                model   : _.extend({text : text}, this.messageDialogOptions)
            }).on("cancel", function () {
                this.playSound();
                this.dialog.close();
            }, this);

            return this.dialog.render();
        },
        closeDialog: function () {
            if (this.dialog) this.dialog.close();
        },
        updateBalance : function(currency) {
            var balanceHolder = this.$("#balance-container label[data-currency='" + currency.id + "']");
            $(balanceHolder).text(currency.get("balance"));
            // 
			if(currency.previous("balance") < currency.get("balance")){

                // In the case of external balance injection, the dialog might not be defined
                if (this.dialog) this.dialog.close();

                $(balanceHolder).addClass("changed"); 
                setTimeout(function(){
                    $(balanceHolder).removeClass("changed");
                }, 1000);
            }


        },
        createIScrolls : function() {
            if (this.iscrollRegions) {

                // Create a hash with all the iscrolls
                this.iscrolls = {};
                _.each(this.iscrollRegions, function (value, region) {
                    var _this = this,
                        options = $.extend({}, value.options);
                    options.onScrollEndBinded = options.onScrollEnd;
                    options.onScrollEnd = function () {
                        options.onScrollEndBinded(_this, this);
                    };
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
                var _this = this,
                	$body = $("body"),
                    isIphone = $body.hasClass("iphone");
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
                    if (isIphone) attrs["line-height"] =  (1 / zoomFactor);

                    $body.css(attrs);
                };
                $(window).resize(adjustBodySize);
                adjustBodySize();
            }
        },
        addSoomlaInfoModal : function() {
            var dialog = new SoomlaInfoModalDialog({ el : $("#soomla-info-modal") });
            var selector = this.model.get("template").noBranding ? ".nobrand" : ".soombot";
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
    });
    _.extend(BaseStoreView.prototype, ViewMixins);


    return _.extend({}, ItemViews, ExpandableItemViews, CollectionViews, {
        ModalDialog     : ModalDialog,
        BaseStoreView   : BaseStoreView
    });
});