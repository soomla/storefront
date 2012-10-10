define(["jquery", "backbone", "components", "handlebars", "templates"], function($, Backbone, Components, Handlebars) {

    var StoreView = Components.BaseStoreView.extend({
        initialize : function() {
            _.bindAll(this, "wantsToLeaveStore", "updateBalance",
                            "render", "showCurrencyStore", "showGoodsStore", "openDialog",
                            "wantsToBuyVirtualGoods", "wantsToBuyCurrencyPacks");

            this.nativeAPI      = this.options.nativeAPI || window.SoomlaNative;
            this.theme          = this.model.get("theme");
            this.categoryViews  = [];

            this.model.get("virtualCurrencies").on("change:balance", this.updateBalance); // TODO: Fix
            var $this        = this,
                categories   = new Backbone.Collection(this.model.get("categories")),
                virtualGoods = this.model.get("virtualGoods");


            var VirtualGoodView = Components.ListItemView.extend({
                template        : Handlebars.getTemplate("item"),
                templateHelpers : {
                    balanceBackground : this.theme.pages.goods.listItem.balanceBackground,
                    balanceLabelStyle : this.theme.common.balanceLabelStyle,
                    itemSeparator     :$this.theme.itemSeparator
                },
                css             : { "background-image" : "url('" + $this.theme.pages.goods.listItem.background + "')" }
            });
            var CurrencyPackView = Components.ListItemView.extend({
                template        : Handlebars.getTemplate("currencyPack"),
                templateHelpers : {
                    nameStyle       : this.theme.pages.currencyPacks.listItem.nameStyle,
                    priceStyle      : this.theme.pages.currencyPacks.listItem.priceStyle,
                    itemSeparator   :$this.theme.itemSeparator
                },
                css             : { "background-image" : "url('" + this.theme.pages.currencyPacks.listItem.balanceBackground + "')" }
            });

            categories.each(function(category) {
                var categoryGoods = virtualGoods.filter(function(item) {return item.get("categoryId") == category.id});
                categoryGoods = new Backbone.Collection(categoryGoods);

                var view = new Components.SectionedListView({
                    className           : "items virtualGoods",
                    collection          : categoryGoods,
                    itemView            : VirtualGoodView,
                    template            : Handlebars.getTemplate("listContainer"),
                    templateHelpers     :_.extend({category : category.get("name")}, $this.theme.categories)
                }).on("selected", $this.wantsToBuyVirtualGoods);
                $this.categoryViews.push(view);
            });
            this.currencyPacksView = new Components.CollectionListView({
                className           : "items currencyPacks",
                collection          : this.model.get("currencyPacks"),
                itemView            : CurrencyPackView
            }).on("selected", this.wantsToBuyCurrencyPacks);

        },
        events : {
            "touchend .leave-store" : "wantsToLeaveStore",
            "touchend .buy-more"    : "showCurrencyStore",
            "touchend .back"        : "showGoodsStore"
        },
        updateBalance : function(model) {
            this.$(".balance-container label").html(model.get("balance"));
        },
        showCurrencyStore : function() {
            // When this flag is raised, there is no connectivity,
            // thus don't show the currency store
            if (this.model.get("isCurrencyStoreDisabled")) {
                alert("Buying more " + this.model.get("currency").get("name") + " is unavailable. Check your internet connectivity and try again.");
            } else {
                this.$("#goods-store").hide();
                this.$("#currency-store").show();
            }
        },
        showGoodsStore : function() {
            this.$("#currency-store").hide();
            this.$("#goods-store").show();
        },
        openDialog : function(currency) {
            this.createDialog({model : this.theme.pages.goods.noFundsModal}).render().on("closed", function(command) {
                if (command == "buyMore") this.showCurrencyStore();
            }, this);
            return this;
        },
        onRender : function() {
            var $this = this;
            this.$("#currency-store").hide();

            // Render subviews (items in goods store and currency store)
            _.each(this.categoryViews, function(view) {
                $this.$("#goods-store .items-container").append(view.render().el);
            });
            this.$("#currency-store .items-container").html(this.currencyPacksView.render().el);
        }
    });

    return {
        StoreView : StoreView
    };
});