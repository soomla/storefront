define("storeView.spec", ["storeViews", "models", "components"], function (StoreViews, Models, Components) {

    // Assign to local variables for spec brevity
    var StoreView           = StoreViews.StoreView,
        CollectionListView  = Components.CollectionListView;


    describe('Soomla Store Master Views', function () {

        describe("StoreView", function() {

            var storeView, attributes, nativeAPIStub, touchendEvent, theme;

            beforeEach(function() {
                touchendEvent = $.Event("touchend", {originalEvent : {touches : [1]}});
                nativeAPIStub   = {
                    wantsToBuyVirtualGoods  : sinon.spy(),
                    wantsToBuyCurrencyPacks : sinon.spy(),
                    wantsToLeaveStore       : sinon.spy()
                };
                theme = {
                    name : "empty",
                        template : sinon.stub(),
                        virtualGoodsView: {
                        type : "Components.CollectionListView",
                        item : {
                            type : "Components.ListItemView",
                            template : sinon.stub()
                        }
                    },
                    currencyPacksView: {
                        type : "Components.CollectionListView",
                        item : {
                            type : "Components.ListItemView",
                            template : sinon.stub()
                        }
                    },
                    modalDialog : {
                        template : sinon.stub()
                    }
                };

                attributes = {
                    model       : new Models.Store({virtualCurrencies : [{}], theme : theme}),
                    el          : $("<div><div class='leave-store'></div><div class='buy-more'></div><div class='back'></div></div>"),
                    nativeAPI   : nativeAPIStub,
                    theme       : theme
                };
            });

            // TODO: Be able to require the correct path in store.js
            xit("should be defined on the SoomlaJS namespace", function() {
                var flag = false;
                window.SoomlaNative = {
                    storeInitialized : function() {
                        flag = true;
                    }
                };
                SoomlaJS.initialize({template : {name : "empty"}, theme : theme});
                waitsFor(function() {
                    return flag;
                }, "window.SoomlaNative never became available", 50);
                runs(function() {
                    expect(SoomlaJS.storeView).toBeDefined();
                    expect(SoomlaJS.storeView).toBeInstanceOf(StoreView);
                    delete SoomlaJS.store;
                    delete SoomlaJS.storeView;
                    delete window.SoomlaNative;
                });
            });

            it("should have a theme defined", function() {
               expect(new StoreView(attributes).theme).toEqual(attributes.theme);
            });

            it("should have two item collection sub-views", function() {
                storeView = new StoreView(attributes);
                expect(storeView.virtualGoodsView).toBeInstanceOf(Components.BaseCollectionView);
                expect(storeView.currencyPacksView).toBeInstanceOf(Components.BaseCollectionView);
            });

            it("should render two item collection views when instantiated and rendered", function() {
                // The empty theme has the same view type for both the virtual goods and the currency packs
                var stub = sinon.stub(eval(attributes.theme.currencyPacksView.type).prototype, "render", function(){ return this; });
                storeView = new StoreView(attributes).render();
                expect(stub.called).toBeTruthy();
                stub.restore();
            });

            it("should provide an API for opening a modal dialog", function() {
                var spy = sinon.spy(Components.ModalDialog.prototype, "render");
                storeView = new StoreView(attributes).openDialog(Models.Currency.prototype.defaults.itemId);
                expect(spy.called).toBeTruthy();
                spy.restore();
            });

            it("should leave the store when the back button is tapped", function () {
                new StoreView(attributes).$(".leave-store").trigger(touchendEvent);
                expect(nativeAPIStub.wantsToLeaveStore.called).toBeTruthy();
            });

            it("should call a 'beforeLeave' callback if provided when tapping the back button", function () {
                var spy = sinon.spy();
                storeView = new StoreView(_.extend({}, attributes, { callbacks : { beforeLeave : spy } }));
                storeView.$(".leave-store").trigger(touchendEvent);
                expect(spy.called).toBeTruthy();
            });

            it("should show the currency store when 'Buy more' is tapped", function () {
                var spy = sinon.spy(StoreView.prototype, "showCurrencyStore");
                storeView = new StoreView(attributes);
                storeView.$(".buy-more").trigger(touchendEvent);
                expect(spy.called).toBeTruthy();
                spy.restore();
            });

            it("should show the goods store when 'Back' is tapped", function () {
                var spy = sinon.spy(StoreView.prototype, "showGoodsStore");
                storeView = new StoreView(attributes);
                storeView.$(".back").trigger(touchendEvent);
                expect(spy.called).toBeTruthy();
                spy.restore();
            });

            it("should move to the currency store if the insufficient funds dialog returns 'buyMore'", function() {
                var spy = sinon.spy(StoreView.prototype, "showCurrencyStore");
                storeView = new StoreView(attributes).openDialog(Models.Currency.prototype.defaults.itemId);
                storeView.$(".buy-more").trigger(touchendEvent);
                expect(spy.called).toBeTruthy();
                spy.restore();
            });


            describe("Extended pointing device events", function() {

                beforeEach(function() {
                    _.extend(StoreView.prototype.events, {
                        "click .leave-store" : "wantsToLeaveStore",
                        "click .buy-more"    : "showCurrencyStore",
                        "click .back"        : "showGoodsStore"
                    });
                });
                afterEach(function() {
                    delete StoreView.prototype.events["click .leave-store"];
                    delete StoreView.prototype.events["click .buy-more"];
                    delete StoreView.prototype.events["click .back"];
                });

                it("should leave the store when the back button is clicked", function () {
                    storeView = new StoreView(attributes);
                    storeView.$(".leave-store").click();
                    expect(nativeAPIStub.wantsToLeaveStore.called).toBeTruthy();
                });

                it("should call a 'beforeLeave' callback if provided when clicking the back button", function () {
                    storeView = new StoreView(_.extend({}, attributes, { callbacks : { beforeLeave : sinon.spy() } }));
                    storeView.$(".leave-store").click();
                    expect(storeView.options.callbacks.beforeLeave.called).toBeTruthy();
                });

                it("should show the currency store when 'Buy more' is clicked", function () {
                    var spy = sinon.spy(StoreView.prototype, "showCurrencyStore");
                    storeView = new StoreView(attributes);
                    storeView.$(".buy-more").click();
                    expect(spy.called).toBeTruthy();
                    spy.restore();
                });

                it("should show the goods store when 'Back' is clicked", function () {
                    var spy = sinon.spy(StoreView.prototype, "showGoodsStore");
                    storeView = new StoreView(attributes);
                    storeView.$(".back").click();
                    expect(spy.called).toBeTruthy();
                    spy.restore();
                });

            });

            describe("Native API calls & Transaction management", function() {

                var modelStub, ViewStub, nativeAPIStub;

                beforeEach(function() {
                    // Create view, model and api stubs
                    ViewStub        = Backbone.View.extend({
                        render : sinon.spy(function() {return this;}),
                        triggerSelectedEvent : function() { this.trigger("selected", modelStub) }
                    });
                    modelStub       = new Models.Store({
                        currency            : {balance : 0},
                        virtualCurrencies   : [{}],
                        theme : {
                            name : "empty",
                            template : sinon.stub(),
                            virtualGoodsView: {
                                type : ViewStub,
                                item : {
                                    type : "Components.ListItemView",
                                    template : sinon.stub()
                                }
                            },
                            currencyPacksView: {
                                type : ViewStub,
                                item : {
                                    type : "Components.ListItemView",
                                    template : sinon.stub()
                                }
                            },
                            modalDialog : {
                                template : sinon.stub()
                            }
                        }
                    });
                    nativeAPIStub   = {wantsToBuyVirtualGoods : sinon.spy(), wantsToBuyCurrencyPacks : sinon.spy()};

                    attributes = {
                        model               : modelStub,
                        nativeAPI           : nativeAPIStub
                    };
                });

                it("should invoke an item purchase when the 'selected' event is captured from the virtual goods sub-view", function() {
                    storeView = new StoreView(attributes).render();
                    storeView.virtualGoodsView.triggerSelectedEvent();
                    expect(nativeAPIStub.wantsToBuyVirtualGoods.calledWith(modelStub.toJSON().itemId)).toBeTruthy();
                });

                it("should invoke a currency pack purchase when the 'selected' event is captured from the currency packs sub-view", function() {
                    storeView = new StoreView(attributes).render();
                    storeView.currencyPacksView.triggerSelectedEvent();
                    expect(nativeAPIStub.wantsToBuyCurrencyPacks.calledWith(modelStub.toJSON().productId)).toBeTruthy();
                });

                it("should update the view when the balance is changed", function() {
                    var stub = sinon.stub(StoreView.prototype, "updateBalance");
                    storeView = new StoreView(attributes);
                    storeView.model.setBalance({currency_coin : 100});
                    expect(stub.called).toBeTruthy();
                    stub.restore();  // Restore original stubbed function to prototype
                });

                // TODO: Add a test for accepting a themes object
            });

        });

    });

});

