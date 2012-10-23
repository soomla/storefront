define(["jquery", "backbone", "viewMixins", "marionette", "backboneAddons", "marionetteExtensions"], function($, Backbone, ViewMixins, Marionette) {

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
            this.model.on("change:balance change:price change:currency", this.render);
        },
        triggers : {
            touchend : "selected"
        },
        onBeforeRender : function() {
            var css = this.options.css || this.css;
            if (css) this.$el.css(css);
        }
    });

    /**
     * A varitaion of the regular item view which has
     * different UI states - regular, bought and equipped
     */
    var EquippableListItemView = ListItemView.extend({
        initialize : function() {
            _.bindAll(this, "onBeforeRender", "bought", "equipped");
            this.model.on("change:price change:currency", this.render);
            this.model.on("change:balance", this.bought);
            this.model.on("change:equipped", this.equipped);
        },
        triggers : {
            "touchend .buy"    : "buy",
            "touchend .equip"  : "equip"
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
            this.model.on("change:equipped", this.render);

            this.expanded = false;
            this.lastEventTime = -(this.eventInterval * 10); // Initial value for allowing first expand
        },
        events : {
            "touchend"      : "onSelect"
        },
        triggers : {
            "touchend .buy" : "buy"
        },
        onSelect : function() {
            // "touchend" on Android is triggered several times (probably a bug).
            // Protect by setting a minimum interval between events
            var currentTime = new Date().getTime();
            if ((currentTime - this.lastEventTime) < this.eventInterval) return;

            // If the product was already purchase it, now toggle between equipping or not equipping
            if (this.model.get("balance") == 1) {
                this.trigger(this.model.get("equipped") ? "unequipped" : "equipped", this.model);
                return;
            }

            if (this.expanded) {
                this.expanded = false;
                if (this.onCollapse) this.onCollapse();
                this.trigger("collapsed");
            } else {
                this.expanded = true;
                if (this.onExpand) this.onExpand();
                this.trigger("expanded");
            }

            // If the event handler was executed, update the time the event was triggered.
            this.lastEventTime = currentTime;
        },
        eventInterval : 500
    });


    ////////////////////  Collection Views  /////////////////////

    // TODO: Remove this and its specs once CollectionGridView stops extending it
    var BaseCollectionView = BaseView.extend({
        initialize : function(options) {
            this.children = []; // expose sub views for testing purposes
        },
        // Retrieve the itemView type, either from `this.options.itemView`
        // or from the `itemView` in the object definition. The "options"
        // takes precedence.
        getItemView : function(){
            var itemView = this.options.itemView || this.itemView;

            if (!itemView){
                var err = new Error("An `itemView` must be specified");
                err.name = "NoItemViewError";
                throw err;
            }
            return itemView;
        },
        buildChildViews : function() {
            var $this = this;
            this.collection.each(function(item) {
                var ItemView = $this.getItemView();
                var view = new ItemView({model : item}).bubbleEventsTo($this);
                $this.children.push(view);
            });
        }
    });

    var CollectionListView = Marionette.CollectionView.extend({
        tagName : "ul",
        initialize : function(options) {
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

    var CollectionGridView = BaseCollectionView.extend({
        constructor : function(options) {
            BaseCollectionView.prototype.constructor.apply(this, arguments);
            _.bindAll(this, "adjustWidth");
            this.buildChildViews();
        },
        itemView : GridItemView,
        adjustWidth : function() {

            // Amend element width to create a grid with a variable number of columns, but a uniform width for them.
            // CSS flex box doesn't support a perfect grid like this when elements contain excessive text.
            // Calculation: (container width) / (# of columns) - ( (item width + padding + border + margin) - (item width) )
            // This assumes that the container has no margin, border or padding.

            var subject             = this.children[0].$el,
                trueElementWidth    = (this.$el.width() / this.options.columns) - (subject.outerWidth(true) - subject.width());

            _.each(this.children, function(view) {
                view.$el.css("width", trueElementWidth);
            });
        },
        render : function() {
            var columns  = this.options.columns,
                $this    = this;

            // Render each item and append it
            var currentRow;
            _.each(this.children, function(view, i) {
                if (i % columns == 0) {
                    currentRow = $("<div>", {class : "row"});
                    $this.$el.append(currentRow);
                }
                currentRow.append(view.render().el);
            });

            // NOTE: Must set timeout 0 to return to event loop, otherwise the styles aren't applied yet and the calculation yields 0
            setTimeout(this.adjustWidth, 0);
            return this;
        }
    });

    // TODO: Write unit test for this component
    var BaseStoreView = Backbone.View.extend({
        serializeData : function() {
            return _.extend({}, this.theme, {currencies : this.model.get("virtualCurrencies").toJSON()});
        },
        openDialog : function() {
            var dialog = new ModalDialog({
                parent : this.$el,
                template : Handlebars.getTemplate("modalDialog"),
                model : this.dialogModel
            });
            dialog.on("cancel buyMore", dialog.close).on("buyMore", this.showCurrencyStore);
            return dialog.render();
        },
        render : function() {
            var context = this.serializeData();
            this.$el.html(this.options.template(context));

            // Render child views (items in goods store and currency store)
            if (this.children) {
                _.each(this.children, function(view, selector) {
                    this.$(selector).html(view.render().el);
                });
            }
            if (this.onRender) this.onRender();
            return this;
        }
    });
    _.extend(BaseStoreView.prototype, ViewMixins);

    return {
        BaseView                : BaseView,
        ListItemView            : ListItemView,
        EquippableListItemView  : EquippableListItemView,
        ExpandableListItemView  : ExpandableListItemView,
        GridItemView            : GridItemView,
        ModalDialog             : ModalDialog,
        BaseCollectionView      : BaseCollectionView,
        CollectionListView      : CollectionListView,
        CollectionGridView      : CollectionGridView,
        BaseStoreView           : BaseStoreView
    };
});