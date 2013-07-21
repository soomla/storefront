define("components", ["jquery", "backbone", "viewMixins", "marionette", "cssUtils", "jquery.fastbutton", "marionetteExtensions", "jquery.imagesloaded", "iscroll"], function($, Backbone, ViewMixins, Marionette, CssUtils) {


    var transitionendEvent = CssUtils.getTransitionendEvent();

    ///////////////////////   Modules   ///////////////////////

    var ExpandableModule = {
        expanded : false,
        events : {
            fastclick : "onClick"
        },
        onClick : function() {

            // Decide whether to expand or collapse
            this.expanded ? this.collapse() : this.expand();
        },
        expand : function() {
            this.expanded = true;
            this.$el.addClass("expanded");
            this.triggerMethod("expand");
        },
        collapse : function(options) {
            this.expanded = false;
            this.$el.removeClass("expanded");
            this.triggerMethod("collapse", options);
        }
    };



    ///////////////////////   Views   ///////////////////////

    var BaseView = Marionette.ItemView;


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


    var LinkView = BaseView.extend({
        constructor : function(options) {
            BaseView.prototype.constructor.apply(this, arguments);

            // Allow extenders to add this function for applying more
            // event callbacks on the view or its model
            if (this.addEvents) this.addEvents();
        },
        addEvents : function() {
            // This one is for categories - sometimes there is a model and sometimes there isn't
            // TODO: Review
            if (this.model) this.model.on("all", this.render, this);
        },
        className : "item",
        tagName : "li",
        triggers : {
            fastclick : "select"
        }
    });


    var ItemView = LinkView.extend({
        initialize : function() {
            // TODO: Remove change:balance => this.render
            this.model.on("change:balance change:purchasableItem", this.render);
        },
        addEvents : function() {
            this.model.on("change:name change:description change:currency_amount change:purchasableItem change:asset", this.render, this);
        }
    });


    var BuyOnceItemView = ItemView.extend({
        initialize : function() {
            this.model.on("change", this.render, this);
            this.model.on("change:owned", this.disable, this);
        },
        triggers : {
            "fastclick" : "buy"
        },
        disable : function() {
            if (this.model.get("owned") === true) {
                this.undelegateEvents();
                this.$el.addClass("owned");
            }
        },
        onRender : function() {

            // Check the state of the view's virtual good and update the view accordingly
            if (this.model.get("owned") === true) this.disable();
        }
    });


    /**
     * Assumes initialization with an upgradable model
     * @type {*}
     */
    var UpgradableItemView = ItemView.extend({
       className : "item upgradable",
        initialize : function() {
            this.model.on({
                "change:purchasableItem change:upgradeId"   : this.render,
                "change:upgradeId"                          : this.onUpgradeChange
            }, this);
        },
        ui : {
            upgradeBar : ".upgrade-bar"
        },
        triggers : {
            "fastclick .upgrade" : "upgrade"
        },
        onUpgradeChange : function() {
            (this.model.isComplete()) ? this.$el.addClass("complete") : this.$el.removeClass("complete");
        },
        onRender : function() {
            this.onUpgradeChange();
        }
    });
    var ExpandableUpgradableItemView = UpgradableItemView.extend({
        onUpgradeChange : function() {
            UpgradableItemView.prototype.onUpgradeChange.call(this);
            this.collapse({noSound: true});
        }
    });

    // Extend functionality with expandable module and vendor prefixed transitionend event
    ExpandableUpgradableItemView.mixin = Backbone.View.mixin; // TODO: Solve this hack
    ExpandableUpgradableItemView.mixin(ExpandableModule);
    ExpandableUpgradableItemView.prototype.triggers[transitionendEvent] = "expandCollapseTransitionend";


    /**
     * A variation of the regular item view which has
     * different UI states - regular, owned and equipped
     */
    var EquippableItemView = ItemView.extend({
        className : "item equippable",
        initialize : function() {
            this.model.on({
                "change:purchasableItem"    : this.render,
                "change:balance"            : this.onBalanceChange,
                "change:equipped"           : this.onEquippingChange
            }, this);
        },
        triggers : {
            "fastclick .buy"    : "buy",
            "fastclick .equip"  : "equip"
        },
        onBalanceChange : function() {
            (this.model.get("balance") >  0) ? this.$el.addClass("owned") : this.$el.removeClass("owned");
        },
        onEquippingChange : function() {
            this.model.get("equipped") ? this.$el.addClass("equipped") : this.$el.removeClass("equipped");
        },
        onRender : function() {

            // Check the state of the view's virtual good and update the view accordingly
            this.onBalanceChange();
            this.onEquippingChange();
        }
    });


    var ExpandableEquipppableItemView = EquippableItemView.extend({
        onBalanceChange : function() {
            if (this.model.get("balance") >  0) {
                this.$el.addClass("owned");
                if (this.expanded) this.collapse({noSound: true});
            } else {
                this.$el.removeClass("owned");
            }
        }
    });


    // Extend functionality with expandable module and vendor prefixed transitionend event
    ExpandableEquipppableItemView.mixin = Backbone.View.mixin; // TODO: Solve this hack
    ExpandableEquipppableItemView.mixin(ExpandableModule);
    ExpandableEquipppableItemView.prototype.triggers[transitionendEvent] = "expandCollapseTransitionend";


    var ExpandableSingleUseItemView = ItemView.extend({
        className : "item single-use",
        constructor : function(options) {
            ItemView.prototype.constructor.apply(this, arguments);

            // TODO: Check if this listener is necessary: might be duplicate with ItemView
            this.model.on("change:balance", this.render);
        },
        triggers : {
            "fastclick .buy" : "buy"
        }
    });

    // Extend functionality with expandable module and vendor prefixed transitionend event
    ExpandableSingleUseItemView.mixin = Backbone.View.mixin; // TODO: Solve this hack
    ExpandableSingleUseItemView.mixin(ExpandableModule);
    ExpandableSingleUseItemView.prototype.triggers[transitionendEvent] = "expandCollapseTransitionend";


    var LifetimeItemView = ItemView.extend({
        className: "item lifetime",
        triggers : {
            "fastclick .buy" : "buy"
        },
        initialize : function() {

            // TODO: Check if this listener is necessary: might be duplicate with ItemView
            this.model.on({
                "change:purchasableItem"    : this.render,
                "change:balance"            : this.onBalanceChange
            }, this);
        },
        onBalanceChange : function() {
            if (this.model.get("balance") >  0) {
                this.$el.addClass("owned");
                if (this.expanded) this.collapse({noSound: true});
            } else {
                this.$el.removeClass("owned");
            }
        },
        onRender : function() {

            // Check the state of the view's virtual good and update the view accordingly
            this.onBalanceChange();
        }
    });

    var ExpandableLifetimeItemView = LifetimeItemView.extend();

    // Extend functionality with expandable module and vendor prefixed transitionend event
    ExpandableLifetimeItemView.mixin = Backbone.View.mixin; // TODO: Solve this hack
    ExpandableLifetimeItemView.mixin(ExpandableModule);
    ExpandableLifetimeItemView.prototype.triggers[transitionendEvent] = "expandCollapseTransitionend";


    ////////////////////  Collection Views  /////////////////////

    var BaseCollectionView = Marionette.CollectionView.extend({

        appendHtml: function(collectionView, itemView, index){
            collectionView.$el[index === 0 ? "prepend" : "append"](itemView.el);
        }
    });

    var BaseCompositeView = Marionette.CompositeView.extend({

        //
        // Override Marionette's appendHtml method to support rendering
        // items in index 0
        //
        appendHtml: function(cv, iv, index){
            var $container = this.getItemViewContainer(cv);
            $container[index === 0 ? "prepend" : "append"](iv.el);
        }
    });


    // Common function for mixing into views
    var refreshIScroll = function() {
        this.iscroll.refresh();
    };


    var CollectionView = BaseCollectionView.extend({
        tagName : "ul",
        itemView : ItemView
    });

    // Currently not in use
    var ActiveCollectionView = CollectionView.extend({
        onItemviewSelect : function(view) {
            this.activeView.$el.removeClass("active");
            this.activeView = view;
            this.activeView.$el.addClass("active");
        },
        onRender : function() {
            var first = this.children.findByIndex(0);
            if (first) {
                this.activeView = first;
                this.activeView.addClass("active");
            }
        }
    });


    var IScrollCollectionView = BaseCompositeView.extend({
        itemView : ItemView,
        itemViewContainer : "[data-iscroll='true']",
        onRender : function() {
            this.iscroll = new iScroll(this.getIScrollWrapper(), {hScroll: false, vScrollbar: false});
        },
        refreshIScroll: refreshIScroll,
        scrollToItemByModel: function (model, time) {
            var view = this.children.findByModel(model),
                el = view.el;
            this.iscroll.scrollToElement(el, time);
        },
        getIScrollWrapper : function() {
            return Marionette.getOption(this, "iscrollWrapper") || this.el;
        },

        //
        // Override Marionette's appendHtml method to support rendering
        // items in index 0
        //
        appendHtml: function(cv, iv, index){
            var $container = this.getItemViewContainer(cv);

            if (index === 0) {
                $container.prepend(iv.el);
            } else {
                $container.append(iv.el);
            }
        }
    });


    var ExpandableIScrollCollectionView = IScrollCollectionView.extend({
        itemView : ExpandableEquipppableItemView,
        onItemviewExpand : function(view) {
            if (this.expandedChild) this.expandedChild.collapse({noSound: true});
            this.expandedChild = view;
        },
        onItemviewCollapse : function(view) {
            delete this.expandedChild;
        },
        collapseExpandedChild : function(options) {
            if (this.expandedChild) {
                this.expandedChild.collapse(options);
                delete this.expandedChild;
            }
        },
        onItemviewExpandCollapseTransitionend : refreshIScroll
    });


    // TODO: Write unit test for this component
    var CarouselView = Marionette.CompositeView.extend({
        tagName : "ul",
        initialize : function() {
            _.bindAll(this, "switchActive", "changeActiveByModel");
        },
        events : {
            "fastclick .next"       : "showNext",
            "fastclick .previous"   : "showPrevious"
        },
        showNext : function() {
            this.activeIndex += 1;
            if (this.activeIndex === this.children.length) this.activeIndex = 0;
            this.switchActive().trigger("next");
        },
        showPrevious : function() {
            this.activeIndex -= 1;
            if (this.activeIndex === -1) this.activeIndex = this.children.length - 1;
            this.switchActive().trigger("previous");
        },
        switchActive: function () {
            this.activeChild.$el.hide();
            this.activeChild = this.getActiveChild();
            this.activeChild.$el.show();
            return this;
        },
        getActiveChild : function() {
            return this.children.findByIndex(this.activeIndex);
        },
        changeActiveByModel: function (model) {
            var newActiveChildView = this.children.findByModel(model);
            var newActiveIndex = 0;
            this.children.each(function (view) {
                if (view.cid == newActiveChildView.cid) {
                    this.activeIndex = newActiveIndex;
                    return;
                }
                newActiveIndex++;
            }, this);
            if (newActiveIndex == this.children.length) {
                console.log('CarouselView / changeActiveByModel / Invalid model', model);
                return;
            }
            this.switchActive();
        },
        onRender : function() {
            // Initialize variables necessary for next / previous functionality
            this.activeIndex = 0;
            this.activeChild = this.getActiveChild();

            _.each(this.children, function(view) {
                view.$el.hide();
            });
            this.activeChild.$el.show();
            return this;
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


    // TODO: Write unit test for this component
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
            this.model.get("currencies").on("change:balance", this.updateBalance, this);
        },
        serializeData : function() {
            var currencies  = this.model.get("currencies").toJSON(),
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
				this.dialog.close();
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
        leaveStore : function() {
            this.playSound().wantsToLeaveStore();
        },
        conditionalPlaySound : function(view, options) {
            if (!(options && options.noSound)) return this.playSound();
            return this;
        }
    });
    _.extend(BaseStoreView.prototype, ViewMixins);


    return {
        BaseView                        : BaseView,
        ItemView                        : ItemView,
        LinkView                        : LinkView,
        BuyOnceItemView                 : BuyOnceItemView,
        UpgradableItemView              : UpgradableItemView,
        ExpandableUpgradableItemView    : ExpandableUpgradableItemView,
        EquippableItemView              : EquippableItemView,
        ExpandableEquipppableItemView   : ExpandableEquipppableItemView,
        ExpandableSingleUseItemView     : ExpandableSingleUseItemView,
        LifetimeItemView                : LifetimeItemView,
        ExpandableLifetimeItemView      : ExpandableLifetimeItemView,
        ModalDialog                     : ModalDialog,
        BaseCollectionView              : BaseCollectionView,
        BaseCompositeView               : BaseCompositeView,
        CollectionView                  : CollectionView,
        IScrollCollectionView           : IScrollCollectionView,
        ExpandableIScrollCollectionView : ExpandableIScrollCollectionView,
        CarouselView                    : CarouselView,
        BaseStoreView                   : BaseStoreView
    };
});