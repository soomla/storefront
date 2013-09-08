define("itemViews", ["marionette", "urls", "jquery.fastbutton", "jqueryUtils"], function(Marionette, Urls) {

    var BaseView = Marionette.ItemView.extend({
        _imagePlaceholder       : Urls.imagePlaceholder,
        _progressBarPlaceholder : Urls.progressBarPlaceholder
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
        },

        // Android webkit doesn't recognize the :active pseudo-class like iOS
        // To overcome this, we add a special helper class to the buy link when
        // it is tapped and apply the same CSS rules that apply to :active.
        events : {
            "touchstart  a"   : "onTouchStart",
            "touchend    a"   : "onTouchEnd",
            "touchcancel a"   : "onTouchEnd"
        },
        onTouchStart : function(event) {
            this.$(event.currentTarget).addClass("emulate-active");
        },
        onTouchEnd: function(event) {
            this.$(event.currentTarget).removeClass("emulate-active");
        }
    });


    var ItemView = LinkView.extend({
        initialize : function() {

            // TODO: Remove change:balance => this.render
            this.listenTo(this.model, "change:balance change:purchasableItem", this.render, this);

            // Animate balance if it changes
            if (_.isString(this.animateBalanceClass)) this.listenTo(this.model, "change:balance", this.animateBalance, this);
        },
        addEvents : function() {
            this.model.on("change:name change:description change:currency_amount change:purchasableItem change:asset", this.render, this);
        },
        animateBalance : function() {
            this.$el.animateOnce(this.animateBalanceClass);
        },

        // This is the basic set of triggers common to all purchasable items.
        // It should be overridden or extended by views extend ItemView
        triggers : {
            "fastclick .buy" : "buy"
        }
    });


    var SingleUseItemView = ItemView.extend({
        className : "item single-use"
    });


    var CurrencyPackView = ItemView.extend({
        className : "item currency-pack"
    });


    // Used for non-consumables
    // TODO: Review if necessary
    var BuyOnceItemView = ItemView.extend({
        initialize : function() {
            this.model.on("change", this.render, this);
            this.model.on("change:owned", this.disable, this);
        },

        // Override triggers
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

        // Override triggers
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


    var LifetimeItemView = ItemView.extend({
        className: "item lifetime",

        // In this view type we don't want the view to entirely re-render on
        // balance changes, so we override the parent initialize to avoid its events
        initialize : function() {

            // Balance changes affect the state of the view
            this.listenTo(this.model, {
                "change:purchasableItem"    : this.render,
                "change:balance"            : this.onBalanceChange
            }, this);
        },
        onBalanceChange : function() {
            if (this.model.get("balance") >  0) {
                this.$el.addClass("owned");
                this.onItemOwned();
            } else {

                // When the balance is changed to 0 externally, reflect it in the UI
                this.$el.removeClass("owned");
            }
        },
        onRender : function() {

            // Check the state of the view's virtual good and update the view accordingly
            this.onBalanceChange();
        },
        onItemOwned : function() {

            // Disable further interaction with this view
            this.undelegateEvents();
        }
    });


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

    // Extend triggers
    EquippableItemView.mixin({
        triggers : {
            "fastclick .equip"  : "equip"
        }
    });


    return {
        BaseView            : BaseView,
        LinkView            : LinkView,
        ItemView            : ItemView,
        SingleUseItemView   : SingleUseItemView,
        CurrencyPackView    : CurrencyPackView,
        BuyOnceItemView     : BuyOnceItemView,
        UpgradableItemView  : UpgradableItemView,
        LifetimeItemView    : LifetimeItemView,
        EquippableItemView  : EquippableItemView
    };
});
