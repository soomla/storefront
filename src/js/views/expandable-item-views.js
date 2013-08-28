define("expandableItemViews", ["marionette", "itemViews", "cssUtils", "jquery.fastbutton"], function(Marionette, ItemViews, CssUtils) {


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

    // Use the vendor specific transitionend event
    var transitionendEvent = CssUtils.getTransitionendEvent();

    // Save local instance of ItemView
    var ItemView = ItemViews.ItemView;


    var ExpandableUpgradableItemView = ItemViews.UpgradableItemView.extend({
        onUpgradeChange : function() {
            ItemViews.UpgradableItemView.prototype.onUpgradeChange.call(this);
            this.collapse({noSound: true});
        }
    });


    var ExpandableEquipppableItemView = ItemViews.EquippableItemView.extend({
        onBalanceChange : function() {
            if (this.model.get("balance") >  0) {
                this.$el.addClass("owned");
                if (this.expanded) this.collapse({noSound: true});
            } else {
                this.$el.removeClass("owned");
            }
        }
    });


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


    var ExpandableLifetimeItemView = ItemViews.LifetimeItemView.extend();


    //
    // Extend functionality with expandable module and vendor prefixed transitionend event
    //
    _.each([ExpandableUpgradableItemView, ExpandableEquipppableItemView, ExpandableSingleUseItemView, ExpandableLifetimeItemView], function(View) {
        View.mixin = Backbone.View.mixin; // TODO: Solve this hack
        View.mixin(ExpandableModule);
        View.prototype.triggers[transitionendEvent] = "expandCollapseTransitionend";
    });


    return {
        ExpandableUpgradableItemView    : ExpandableUpgradableItemView,
        ExpandableEquipppableItemView   : ExpandableEquipppableItemView,
        ExpandableSingleUseItemView     : ExpandableSingleUseItemView,
        ExpandableLifetimeItemView      : ExpandableLifetimeItemView
    };
});
