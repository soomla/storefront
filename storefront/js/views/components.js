define(["jquery", "backbone", "viewMixins", "marionette", "cssUtils", "fastclick", "marionetteExtensions", "jquery.imagesloaded", "iscroll"], function($, Backbone, ViewMixins, Marionette, CssUtils, FastClick) {


    var transitionendEvent = CssUtils.getTransitionendEvent();

    var BaseView = Marionette.ItemView;

    var ModalDialog = BaseView.extend({
        className : "modal-container",
        initialize : function() {
            _.bindAll(this, "close");
        },
        triggers : {
            "touchend .close"    : "cancel",
            "touchend .modal"    : "cancel",
            "touchend .buy-more" : "buyMore",
            "touchend .cancel"   : "cancel"
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
            _.bindAll(this, "onBeforeRender");
            this.model.on("change:balance change:priceModel", this.render);
            new FastClick(this.el);
        },
        timedTriggers : {
            click : "selected"
        },
        onBeforeRender : function() {
            var css = this.options.css || this.css;
            if (css) this.$el.css(css);
        }
    });

    var BuyOnceItemView = ListItemView.extend({
        initialize : function() {
            _.bindAll(this, "onBeforeRender");
            this.model.on("change", this.render, this);
            this.model.on("change:owned", this.disable, this);
            new FastClick(this.el);
        },
        timedTriggers : {
            "click" : "buy"
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
        initialize : function() {
            _.bindAll(this, "onBeforeRender", "bought", "equipped");
            this.model.on("change:priceModel", this.render);
            this.model.on("change:balance", this.bought);
            this.model.on("change:equipped", this.equipped);
        },
        timedTriggers : {
            "click .buy"    : "buy",
            "click .equip"  : "equip"
        },
        ui : {
            "buy"       : ".buy",
            "equip"     : ".equip",
            "active"    : ".active"
        },
        bought : function() {
            this.ui.buy.hide();
            this.ui.equip.show();
        },
        equipped : function() {
            var equipped = this.model.get("equipped");
            if (equipped) {
                this.ui.equip.hide();
                this.ui.active.show();
                this.trigger("equipped");
            } else {
                this.ui.active.hide();
                this.ui.equip.show();
            }
        },
        onRender : function() {
            new FastClick(this.ui.buy[0]);
            new FastClick(this.ui.equip[0]);
        }
    });

    var GridItemView = ListItemView.extend({
        tagName : "div"
    });

    // TODO: Write unit test for this component
    var ExpandableListItemView = ListItemView.extend({
        constructor : function(options) {
            ListItemView.prototype.constructor.apply(this, arguments);
            _.bindAll(this, "onSelect");
            this.model.on({
                "change:equipped" : this.render,
                "change:balance"  : function() {
                    if (this.model.get("balance") > 0)
                        this.collapse();
                }
            });

            this.expanded = false;
            new FastClick(this.el);
        },
        timedEvents : {
            "click"      : "onSelect"
        },
        // TODO: Change to click or use FastClick button
        timedTriggers : {
            "click .buy" : "buy"
        },
        triggers : {}, // Will be filled dynamically with vendor prefixed events
        onSelect : function() {

            // If the product was already purchase it, now toggle between equipping or not equipping
            if (this.model.get("balance") == 1) {
                this.trigger(this.model.get("equipped") ? "unequipped" : "equipped", this.model);
                return;
            }

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
            this.iscroll = new iScroll(this.getIScrollWrapper(), {hScroll: false});
        },
        refreshIScroll : function() {
            this.iscroll.refresh();
        },
        getIScrollWrapper : function() {
            return this.options.iscrollWrapper || this.iscrollWrapper || this.el;
        }
    });

    var ExpandableIScrollCollectionListView = IScrollCollectionListView.extend({
        itemView : ExpandableListItemView,
        onItemviewExpandCollapseTransitionend : function() {
            this.iscroll.refresh();
        }
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
        GridItemView                        : GridItemView,
        ModalDialog                         : ModalDialog,
        CollectionListView                  : CollectionListView,
        IScrollCollectionListView           : IScrollCollectionListView,
        ExpandableIScrollCollectionListView : ExpandableIScrollCollectionListView,
        CarouselView                        : CarouselView,
        BaseStoreView                       : BaseStoreView
    };
});