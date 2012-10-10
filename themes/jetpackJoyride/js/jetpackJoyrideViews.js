define(["jquery", "backbone", "components", "handlebars", "templates"], function($, Backbone, Components, Handlebars) {

    var HeaderView = Backbone.View.extend({
        initialize : function() {
            _.bindAll(this, "switchHeader");
            this.state = "menu";
        },
        events : {
            "click .back" : function() {
                this.trigger(this.state == "menu" ? "quit" : "back");
            }
        },
        switchHeader : function(title, backImage) {
            this.$(".title-container h1").html(title);
            this.$(".back img").attr("src", backImage);
        }
    });


    var StoreView = Components.BaseStoreView.extend({
        initialize : function() {
            _.bindAll(this, "wantsToLeaveStore", "updateBalance",
                            "render", "openDialog", "toggleItemBackground",
                            "switchCategory", "showMenu",
                            "wantsToBuyVirtualGoods", "wantsToBuyCurrencyPacks");

            this.nativeAPI  = this.options.nativeAPI || window.SoomlaNative;
            this.theme      = this.model.get("theme");

            this.model.get("virtualCurrencies").on("change:balance", this.updateBalance);


            var virtualGoods    = this.model.get("virtualGoods"),
                currencyPacks   = this.model.get("currencyPacks"),
                categories      = new Backbone.Collection(this.model.get("categories")),
                templateHelpers = { images : this.theme.images },
                $this           = this;


            var VirtualGoodView = Components.ExpandableListItemView.extend({
                template        : Handlebars.getTemplate("item"),
                templateHelpers : templateHelpers,
                css             : { "background-image" : "url('" + this.theme.images.itemBackgroundImage + "')" }
            });
            var CurrencyPackView = Components.ExpandableListItemView.extend({
                template        : Handlebars.getTemplate("currencyPack"),
                templateHelpers : templateHelpers,
                css             : { "background-image" : "url('" + this.theme.images.itemBackgroundImage + "')" }
            });
            var CategoryView = Components.ListItemView.extend({
                template        : Handlebars.getTemplate("categoryMenuItem")
            });

            this.currencyPacksView = new Components.CollectionListView({
                className           : "items currencyPacks category",
                collection          : currencyPacks,
                itemView            : CurrencyPackView
            }).on("bought", this.wantsToBuyCurrencyPacks);



            this.pageViews = [];
            categories.each(function(category) {
                // Currency packs have a view of their own so don't add one for their category
                if (category.get("name") == "currencyPacks") return;

                var categoryGoods = virtualGoods.filter(function(item) {return item.get("categoryId") == category.id});
                categoryGoods = new Backbone.Collection(categoryGoods);
                var categoryName = category.get("name");

                var view = new Components.CollectionListView({
                    className           : "items virtualGoods category " + categoryName,
                    category            : category,
                    collection          : categoryGoods,
                    itemView            : VirtualGoodView
                }).on({
                    bought      : $this.wantsToBuyVirtualGoods,
                    equipped    : $this.wantsToEquipGoods,
                    unequipped  : $this.wantsToUnequipGoods,
                    expanded    : $this.toggleItemBackground,
                    collapsed   : $this.toggleItemBackground
                });

                $this.pageViews.push(view);
            });
            this.pageViews.push(this.currencyPacksView);

            this.categoryMenuView = new Components.CollectionListView({
                className           : "menu items clearfix",
                collection          : categories,
                itemView            : CategoryView
            }).on("selected", this.switchCategory);

            this.header = new HeaderView().on({
                "back" : this.showMenu,
                "quit" : this.wantsToLeaveStore
            }, this);
        },
        switchCategory : function(model) {
            this.header.state = "category";
            var categoryName = model.get("name"),
                categoryTitle = model.get("title");
            this.$(".menu").hide();
            this.$(".category").hide();
            this.$(".category." + categoryName).show();
            this.header.switchHeader(categoryTitle, this.theme.images.backImage);
        },
        toggleItemBackground : function(view) {
            var image = this.theme.images[view.expanded ? "itemBackgroundImageExpanded" : "itemBackgroundImage"];
            view.$el.css("background-image", "url('" + image + "')");
        },
        showMenu : function() {
            this.header.state = "menu";
            this.$(".menu").show();
            this.$(".category").hide();
            this.header.switchHeader(this.theme.pages.menu.title, this.theme.images.quitImage);
        },
        updateBalance : function(model) {
            this.$(".balance-container label").html(model.get("balance"));
        },
        showCurrencyStore : function() {},
        showGoodsStore : function() {},
        openDialog : function(currency) {
            this.createDialog({model : this.theme.noFundsModal}).render();
            return this;
        },
        onRender : function() {
            // Render child views (items in goods store and currency store)
            this.header.setElement(this.$(".header"));
            this.$(".pages").append(this.categoryMenuView.render().el);

            var $this = this;
            _.each(this.pageViews, function(view) {
                $this.$(".pages").append(view.render().el);
            });
        }
    });


    return {
        StoreView : StoreView
    };
});