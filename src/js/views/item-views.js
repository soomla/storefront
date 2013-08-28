define("itemViews", ["marionette", "urls", "jquery.fastbutton"], function(Marionette, Urls) {

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


    return {
        BaseView            : BaseView,
        LinkView            : LinkView,
        ItemView            : ItemView,
        BuyOnceItemView     : BuyOnceItemView,
        UpgradableItemView  : UpgradableItemView,
        LifetimeItemView    : LifetimeItemView,
        EquippableItemView  : EquippableItemView
    };
});
