define(["jquery", "backbone", "components", "handlebars", "templates"], function($, Backbone, Components, Handlebars) {

    var StoreView = Components.BaseStoreView.extend({
        initialize : function() {
            _.bindAll(this, "wantsToLeaveStore", "updateBalance",
                            "render", "showCurrencyStore", "showGoodsStore", "openDialog",
                            "wantsToBuyVirtualGoods", "wantsToBuyCurrencyPacks");

            this.nativeAPI  = this.options.nativeAPI || window.SoomlaNative;
            this.theme      = this.model.get("theme");

            this.model.get("virtualCurrencies").on("change:balance", this.updateBalance); // TODO: Fix
            var $this = this;


            var VirtualGoodView = Components.ListItemView.extend({
                template        : Handlebars.getTemplate("item"),
                templateHelpers : { itemBackground : this.theme.pages.goods.listItem.itemBackground },
                css             : { "background-image" : "url('" + this.theme.pages.goods.listItem.background + "')" }
            });
            var CurrencyPackView = Components.ListItemView.extend({
                template        : Handlebars.getTemplate("currencyPack"),
                templateHelpers : { itemBackground : this.theme.pages.currencyPacks.listItem.itemBackground },
                css             : { "background-image" : "url('" + this.theme.pages.currencyPacks.listItem.background + "')" }
            });

            var virtualGoodsView = new Components.CollectionListView({
                className           : "items virtualGoods",
                collection          : this.model.get("virtualGoods"),
                itemView            : VirtualGoodView
            }).on("selected", this.wantsToBuyVirtualGoods);
            var currencyPacksView = new Components.CollectionListView({
                className           : "items currencyPacks",
                collection          : this.model.get("currencyPacks"),
                itemView            : CurrencyPackView
            }).on("selected", this.wantsToBuyCurrencyPacks);

            this.children = {
                "#goods-store .items-container" : virtualGoodsView,
                "#currency-store .items-container" : currencyPacksView
            };
        },
        events : {
            "touchend .leave-store" : "wantsToLeaveStore",
            "touchend .buy-more"    : "showCurrencyStore",
            "touchend .back"        : "showGoodsStore"
        },
        updateBalance : function(model) {
            this.$(".header .balance label").html(model.get("balance"));
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
            this.$("#currency-store").hide();
        }
    });

    return {
        StoreView : StoreView
    };
});