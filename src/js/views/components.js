define(["jquery", "backbone", "viewMixins", "marionette", "cssUtils", "jquery.fastbutton", "marionetteExtensions", "jquery.imagesloaded", "iscroll"], function($, Backbone, ViewMixins, Marionette, CssUtils) {


    var transitionendEvent = CssUtils.getTransitionendEvent();

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

    var ListItemView = BaseView.extend({
        className : "item",
        tagName : "li",
        initialize : function() {
            // TODO: Remove change:balance => this.render
            this.model.on("change:balance change:priceModel", this.render);
        },
        triggers : {
            fastclick : "select"
        },
        onBeforeRender : function() {
            var css = this.options.css || this.css;
            if (css) this.$el.css(css);
        }
    });

    var BuyOnceItemView = ListItemView.extend({
        initialize : function() {
            this.model.on("change", this.render, this);
            this.model.on("change:owned", this.disable, this);
        },
        triggers : {
            "fastclick" : "buy"
        },
        disable : function() {
            if (this.model.get("owned") === true) this.undelegateEvents();
        }
    });

    /**
     * A varitaion of the regular item view which has
     * different UI states - regular, bought and equipped
     */
    var EquippableListItemView = ListItemView.extend({
        className : "item equippable",
        initialize : function() {
            this.model.on({
                "change:priceModel" : this.render,
                "change:balance"    : this.bought,
                "change:equipped"   : this.equip
            }, this);
        },
        triggers : {
            "fastclick .buy"    : "buy",
            "fastclick .equip"  : "equip"
        },
        bought : function() {
            this.$el.addClass("owned");
        },
        equip : function() {
            var equipped = this.model.get("equipped");
            if (equipped) {
                this.$el.addClass("equipped");
                this.trigger("equip");
            } else {
                this.$el.removeClass("equipped");
            }
        }
    });

    var GridItemView = ListItemView.extend({
        tagName : "div"
    });

    // TODO: Write unit test for this component
    var ExpandableListItemView = ListItemView.extend({
        className : "item equippable",
        constructor : function(options) {
            ListItemView.prototype.constructor.apply(this, arguments);
            this.model.on({
                "change:equipped" : this.onEquippingChange,
                "change:balance"  : this.onBalanceChange
            }, this);

            this.expanded = false;
        },
        triggers : {
            "fastclick .buy"    : "buy",
            "fastclick .equip"  : "equip"
        },
        events : {
            fastclick : "onClick"
        },
        onClick : function() {

            // Decide whether to expand or collapse
            this.expanded ? this.collapse() : this.expand();
        },
        onBalanceChange : function() {
            if (this.model.get("balance") >  0) {
                this.$el.addClass("owned");
                if (this.expanded) this.collapse();
            } else {
                this.$el.removeClass("owned");
            }
        },
        onEquippingChange : function() {
            if (this.model.get("equipped")) {
                this.$el.addClass("equipped");
                this.trigger("unequipped", this.model);
            } else {
                this.$el.removeClass("equipped");
                this.trigger("unequipped", this.model);
            }
        },
        expand : function() {
            this.expanded = true;
            this.$el.addClass("expanded");
            this.triggerMethod("expand");
        },
        collapse : function() {
            this.expanded = false;
            this.$el.removeClass("expanded");
            this.triggerMethod("collapse");
        }
    });

    // TODO: Refactore with ExpandableListItemView
    var ExpandableSingleUseListItemView = ListItemView.extend({
        className : "item single-use",
        constructor : function(options) {
            ListItemView.prototype.constructor.apply(this, arguments);
            this.model.on("change:balance", this.render);
            this.expanded = false;
        },
        triggers : {
            "fastclick .buy" : "buy"
        },
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
        collapse : function() {
            this.expanded = false;
            this.$el.removeClass("expanded");
            this.triggerMethod("collapse");
        }
    });

    // Add the vendor prefixed transitionend event dynamically
    ExpandableListItemView.prototype.triggers[transitionendEvent] = "expandCollapseTransitionend";



    ////////////////////  Collection Views  /////////////////////

    // Common function for mixing into views
    var refreshIScroll = function() {
        this.iscroll.refresh();
    };


    var CollectionListView = Marionette.CollectionView.extend({
        tagName : "ul",
        initialize : function() {
            _.bindAll(this, "adjustWidth");
            this.orientation = this.options.orientation || "vertical";
        },
        itemView : ListItemView,
        adjustWidth : function() {
            // Assuming that all elements are the same width, take the full width of the first element
            // and multiply it by the number of elements.  The product will be the scrollable container's width
            var elementWidth = this.$(".item:first").outerWidth(true);
            this.$el.css("width", this.collection.length * elementWidth);
        }
    });


    var IScrollCollectionListView = Marionette.CompositeView.extend({
        tagName : "div",
        itemView : ListItemView,
        itemViewContainer : "[data-iscroll='true']",
        onRender : function() {
            this.iscroll = new iScroll(this.getIScrollWrapper(), {hScroll: false, vScrollbar: false});
        },
        refreshIScroll : refreshIScroll,
        getIScrollWrapper : function() {
            return this.options.iscrollWrapper || this.iscrollWrapper || this.el;
        }
    });

    var ExpandableIScrollCollectionListView = IScrollCollectionListView.extend({
        itemView : ExpandableListItemView,
        onItemviewExpandCollapseTransitionend : refreshIScroll
    });


    // TODO: Write unit test for this component
    var CarouselView = Marionette.CompositeView.extend({
        initialize : function() {
            _.bindAll(this, "switchActive");
        },
        events : {
            "click .next"       : "showNext",
            "click .previous"   : "showPrevious"
        },
        showNext : function() {
            this.activeIndex += 1;
            if (this.activeIndex == this.keys.length) this.activeIndex = 0;
            this.switchActive().trigger("next");
        },
        showPrevious : function() {
            this.activeIndex -= 1;
            if (this.activeIndex == -1) this.activeIndex = this.keys.length - 1;
            this.switchActive().trigger("previous");
        },
        switchActive : function() {
            this.activeChild.$el.hide();
            this.activeChild = this.children[this.keys[this.activeIndex]];
            this.activeChild.$el.show();
            return this;
        },
        onRender : function() {
            // Initialize variables necessary for next / previous functionality
            this.keys        = _.keys(this.children);
            this.activeIndex = 0;
            this.activeChild = this.children[this.keys[this.activeIndex]];

            _.each(this.children, function(view) {
                view.$el.hide();
            });
            this.activeChild.$el.show();
            return this;
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
            _.bindAll(this, "wantsToLeaveStore", "wantsToBuyVirtualGoods", "wantsToBuyMarketItem", "playSound", "render");

            // Assign theme before initialize function is called
            this.theme = options.model.get("theme");

            // Wrap onRender function if it exists
            if (this.onRender && _.isFunction(this.onRender)) {
                var originalOnRender = this.onRender;
                this.onRender = _.bind(function() {
                    originalOnRender.call(this);
                    this.finalizeRendering();
                }, this);
            }

            // Apply original Backbone.View constructor
            BaseView.prototype.constructor.apply(this, arguments);

            // Balance currency balance changes
            this.model.get("virtualCurrencies").on("change:balance", this.updateBalance, this);
        },
        serializeData : function() {
            return _.extend({}, this.theme, {currencies : this.model.get("virtualCurrencies").toJSON()});
        },
        openDialog : function() {
            var dialog = new ModalDialog({
                parent : this.$el,
                template : Handlebars.getTemplate("modalDialog"),
                model : this.dialogModel
            });

            var $this = this;
            dialog.on("cancel buyMore", function() {
                $this.playSound();
                dialog.close();
            }).on("buyMore", function() {
                $this.playSound().showCurrencyStore();
            });
            return dialog.render();
        },
        updateBalance : function(model) {
            this.$("#balance-container label").html(model.get("balance"));
        },
        finalizeRendering : function() {
            // When all store images are loaded, trigger an event
            // TODO: Preload images that aren't visible at first
            var $this = this;
            this.$el.imagesLoaded(function() {
                $this.trigger("imagesLoaded");
            });

            this.adjustZoom();
            return this;
        },
        adjustZoom : function() {
            if (this.zoomFunction) {
                // Adjust zoom to fit nicely in viewport
                // This helps cope with various viewports, i.e. mobile, tablet...
                var $this = this;
                var adjustBodySize = function() {
                    var zoomFactor      = $this.zoomFunction(),
                    zoomPercentage  = (zoomFactor * 100) + "%";
                    $("body").css({
                        "zoom"                      : zoomFactor,
                        "-ms-text-size-adjust"      : zoomPercentage,
                        "-moz-text-size-adjust"     : zoomPercentage,
                        "-webkit-text-size-adjust"  : zoomPercentage
                    });
                };
                $(window).resize(adjustBodySize);
                adjustBodySize();
            }
        }
    });
    _.extend(BaseStoreView.prototype, ViewMixins);

    return {
        BaseView                            : BaseView,
        ListItemView                        : ListItemView,
        BuyOnceItemView                     : BuyOnceItemView,
        EquippableListItemView              : EquippableListItemView,
        ExpandableListItemView              : ExpandableListItemView,
        ExpandableSingleUseListItemView     : ExpandableSingleUseListItemView,
        GridItemView                        : GridItemView,
        ModalDialog                         : ModalDialog,
        CollectionListView                  : CollectionListView,
        IScrollCollectionListView           : IScrollCollectionListView,
        ExpandableIScrollCollectionListView : ExpandableIScrollCollectionListView,
        CarouselView                        : CarouselView,
        BaseStoreView                       : BaseStoreView
    };
});