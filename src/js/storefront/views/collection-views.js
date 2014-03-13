define("collectionViews", ["marionette", "itemViews", "expandableItemViews", "iscroll", "jquery.fastbutton"], function(Marionette, ItemViews, ExpandableItemViews) {


    // Save a local copy
    var ItemView = ItemViews.ItemView;



    //
    // Base collection views - override Marionette functionality
    //

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
        initialize : function() {
            _.bindAll(this, "refreshIScroll", "scrollToItemByModel");
        },
        onRender : function() {
            this.createIScroll();
            this.bindIScrollRefresh();
        },
        createIScroll : function() {
            this.triggerMethod("before:iscroll:create");
            this.iscroll = new iScroll(this.getIScrollWrapper(), this.getIScrollOptions());
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
        getIScrollOptions : function() {
            var defaults = {hScroll: false, vScrollbar: false};
            return _.extend(defaults, Marionette.getOption(this, "iscrollOptions"));
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
        },

        // Support adding and removing items from the view
        // while maintaining correct iscroll height
        bindIScrollRefresh : function() {
            this.listenTo(this, "after:item:added", this.refreshIScroll, this);
            this.listenTo(this, "item:removed", this.refreshIScroll, this);
        }
    });


    var HorizontalIScrollCollectionView = IScrollCollectionView.extend({
        iscrollOptions : {
            hScroll     : true,
            vScroll     : false,
            vScrollbar  : false,
            hScrollbar  : false
        },
        onBeforeIscrollCreate : function() {

            // Calculate iscroll container width
            // Needs to be deferred to next tick because otherwise the
            // DOM children aren't fully rendered yet and don't have a width
            setTimeout(_.bind(function() {
                var children    = this.$itemViewContainer.children(),
                    childCount  = children.length,
                    childWidth  = children.first().outerWidth(true),
                    width       = this.calculateIscrollWidth ? this.calculateIscrollWidth(childCount, childWidth) : childCount * childWidth;

                this.$itemViewContainer.width(width);
                this.iscroll.refresh();
            }, this), 0);
        }
    });


    var ExpandableIScrollCollectionView = IScrollCollectionView.extend({
        itemView : ExpandableItemViews.ExpandableEquippableItemView,
        initialize : function() {
            _.bindAll(this, "onItemviewExpandCollapseTransitionend");
        },
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


    return {
        CollectionView                  : CollectionView,
        BaseCollectionView              : BaseCollectionView,
        BaseCompositeView               : BaseCompositeView,
        IScrollCollectionView           : IScrollCollectionView,
        HorizontalIScrollCollectionView : HorizontalIScrollCollectionView,
        ExpandableIScrollCollectionView : ExpandableIScrollCollectionView,
        CarouselView                    : CarouselView
    };
});
