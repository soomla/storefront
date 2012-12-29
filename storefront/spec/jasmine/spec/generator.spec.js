define("generator.spec", ["models", "components"], function (Models, Components) {

    // TODO: Restore the native API stubs that were once loaded as a module
    // window.SoomlaNative = NativeAPI;

    var objectFromString = function(str, value) {
        var keys = str.split(".");
        var lastKey = keys.pop();
        var obj, temp;
        obj = temp = {};
        _.each(keys, function(key) { temp[key] = {}; temp = temp[key]; });
        temp[lastKey] = value;
        return obj;
    };

    describe('Soomla Store', function () {

        beforeEach(function() {
            delete SoomlaJS.store;
        });

        it('should be defined', function () {
            expect(SoomlaJS).toBeDefined();
        });

        it("should create a new store", function () {
            expect(SoomlaJS.store).toBeUndefined();
            SoomlaJS.newStore();
            expect(SoomlaJS.store).toBeDefined();
            expect(SoomlaJS.store).toBeInstanceOf(Models.Store);
        });

        it("should have a default empty list of virtual currencies", function () {
            expect(new Models.Store().get("virtualCurrencies")).toBeInstanceOf(Models.VirtualCurrencyCollection);
        });

        xit("should invoke storeInitialized when initializing a store", function () {
            var spy = sinon.spy(window.SoomlaNative, "storeInitialized");
            SoomlaJS.initialize({ template : {name : "empty"} });
            expect(spy.called).toBeTruthy();
            spy.restore();
        });


        describe('=== Currency', function () {

            var store
            beforeEach(function() {
                delete SoomlaJS.store;
                store = new Models.Store({virtualCurrencies : [{}]});
            });

            it("should have an empty array of currencies by default", function() {
                expect(new Models.Store().get("virtualCurrencies").toJSON()).toEqual([]);
            });

            it("should return itself after setting balances for chaining", function() {
                expect(store.setBalance({})).toEqual(store);
            });

            it("should set a new balance with the given amount", function() {
                var store = new Models.Store({virtualCurrencies : [{ itemId : "my_currency", balance : 0 }]});
                store.setBalance({my_currency : 100});
                expect(store.getBalance("my_currency")).toEqual(100);
            });

            it("should use coins as the default currency name", function () {
                expect(store.get("virtualCurrencies").at(0).get("name")).toEqual("coins");
            });

            it("should't have a default currency image", function() {
                expect(store.get("virtualCurrencies").at(0).get("image")).toBeUndefined();
            });

            it("should have 'store_currency' as the default currency itemId", function() {
                expect(store.get("virtualCurrencies").at(0).get("itemId")).toEqual("currency_coins");
            });

            it("should start with a balance of zero", function() {
                expect(store.get("virtualCurrencies").at(0).get("balance")).toEqual(0);
            });
        });

        describe('=== Background', function () {

            it("shouldn't have a background by default", function() {
                SoomlaJS.newStore();
                expect(SoomlaJS.store.get("background")).toBeUndefined();
            });

            xit("should fail to save when no background is supplied", function() {
                SoomlaJS.newStore();
                var spy = { errorStub : function(){} };
                spyOn(spy, "errorStub");
                SoomlaJS.store.on("error", spy.errorStub).set({background : ""});
                expect(spy.errorStub).toHaveBeenCalled();
            });

        });

        describe('=== Virtual Goods', function () {

            it("should have a default balance of 0", function() {
                expect(new Models.VirtualGood().get("balance")).toEqual(0);
            });

            it("should not be equipped by default", function() {
                expect(new Models.VirtualGood().get("equipped")).toEqual(false);
            });

            it("should return itself after setting balances for chaining", function() {
                var store = new Models.Store();
                expect(store.updateVirtualGoods({})).toEqual(store);
            });

            it("should be found in a collection by 'itemId'", function() {
                var modelJSON = { itemId : 'sword' };
                var collection = new Models.VirtualGoodsCollection().add(new Models.VirtualGood(modelJSON));
                expect(collection.get("sword").toJSON()).toEqual(_.extend({}, Models.VirtualGood.prototype.defaults, modelJSON));
            });

            it("should have an empty virtual goods list by default", function() {
                SoomlaJS.newStore();
                expect(SoomlaJS.store.get("virtualGoods").toJSON()).toEqual([]);
            });

            it("should be able to add virtual goods to a nested collection", function() {
                SoomlaJS.newStore({ virtualGoods: [{ itemId : "surfboard" }] });
                expect(SoomlaJS.store.get("virtualGoods").length).toEqual(1);
                expect(SoomlaJS.store.get("virtualGoods").at(0)).toBeInstanceOf(Models.VirtualGood);
            });

            it("should increment the balance of a virtual good when it was purchased", function() {
                var store = new Models.Store({ virtualGoods: [{ itemId : "surfboard", balance : 1 }] });
                store.updateVirtualGoods({surfboard : {balance : 5}});
                expect(store.get("virtualGoods").get("surfboard").get("balance")).toEqual(5);
            });

            it("should update the price of a virtual good when an update call is recieved", function() {
                var store = new Models.Store({ virtualGoods: [{ itemId : "surfboard", balance : 1 }], virtualCurrencies : [{itemId : "currency_clam"}] });
                store.updateVirtualGoods({surfboard : {price : { "currency_clam" : 10 }}});
                var good = store.get("virtualGoods").get("surfboard");
                expect(good.get("price")).toEqual(10);
                expect(good.get("currency")).toEqual(store.get("virtualCurrencies").get("currency_clam").toJSON());
            });

            it("should use the first price for updating a virtual good when an update call is recieved with an array of prices", function() {
                var store = new Models.Store({ virtualGoods: [{ itemId : "surfboard", balance : 1 }], virtualCurrencies : [{itemId : "currency_clam"}, {itemId : "currency_dollar"}] });
                store.updateVirtualGoods({surfboard : {price : [{ "currency_dollar" : 100 }, { "currency_clam" : 10 }]}});
                var good = store.get("virtualGoods").get("surfboard");
                expect(good.get("price")).toEqual(100);
                expect(good.get("currency")).toEqual(store.get("virtualCurrencies").get("currency_dollar").toJSON());
            });

            it("should equip a virtual good when it was equipped", function() {
                var store = new Models.Store({ virtualGoods: [{ itemId : "surfboard", balance : 1 }] });
                store.updateVirtualGoods({surfboard : {equipped : true}});
                expect(store.get("virtualGoods").get("surfboard").get("equipped")).toBeTruthy();
            });

            it("should invoke 'notEnoughGoods' if a virtual good that isn't owned is trying to get equipped", function() {
                var store = new Models.Store({ virtualGoods: [{ itemId : "surfboard", balance : 0 }] });
                var stub = sinon.stub(SoomlaJS, "notEnoughGoods");
                store.updateVirtualGoods({surfboard : {equipped : true}});
                expect(store.get("virtualGoods").get("surfboard").get("equipped")).toBeFalsy();
                expect(stub.called).toBeTruthy();
                stub.restore();
            });

            // TODO: More tests on default field values and validation
        });

        describe('=== Currency Packs', function () {

            it("should have an empty currency pack list by default", function() {
                SoomlaJS.newStore();
                expect(SoomlaJS.store.get("currencyPacks").toJSON()).toEqual([]);
            });

            it("should be able to add currency packs to a nested collection", function() {
                SoomlaJS.newStore({
                    currencyPacks: [{
                        name : "Super Saver Pack",
                        description : "For you cheap skates...",
                        image : "coin.jpg",
                        itemId : "super_saver_pack",
                        marketItem : "super_saver_pack",
                        price : 2.99,
                        amount : 200
                    }]
                });
                expect(SoomlaJS.store.get("currencyPacks").length).toEqual(1);
                expect(SoomlaJS.store.get("currencyPacks").at(0)).toBeInstanceOf(Models.CurrencyPack);
            });

            // TODO: More tests on default field values and validation
        });

        describe('Input JSON parsing', function () {

            // TODO: Add a test for accepting a themes object in the JSON

            it("should initalize without a JSON argument", function() {
                SoomlaJS.newStore();
                expect(SoomlaJS.store).toBeDefined();
                expect(SoomlaJS.store).toBeInstanceOf(Models.Store);
            });

            it("should accept nested isCurrencyStoreDisabled", function() {
                SoomlaJS.newStore({isCurrencyStoreDisabled : true});
                expect(SoomlaJS.store.get("isCurrencyStoreDisabled")).toEqual(true);
            });

            it("should accept an array of virtual goods", function() {
                var virtualGood = {
                    name        : "Rip Curl Shortboard",
                    description : "Shred the small waves with this super-fast board",
                    image       : "img/boards/rip-curl.jpg",
                    price       : 100,
                    itemId      : 2988822
                };
                SoomlaJS.newStore({
                    virtualGoods : [virtualGood]
                });
                expect(SoomlaJS.store.get("virtualGoods").at(0).toJSON()).toEqual(_.extend({}, Models.VirtualGood.prototype.defaults, virtualGood));
                expect(SoomlaJS.store.get("virtualGoods").length).toEqual(1);
            });

            it("should accept an array of virtual currencies", function() {
                var virtualCurrency = {
                    name        : "Dollar",
                    description : "The best currency in the world",
                    image       : "img/coin.jpg",
                    itemId      : "currency_dollar"
                };
                SoomlaJS.newStore({
                    virtualCurrencies : [virtualCurrency]
                });
                expect(SoomlaJS.store.get("virtualCurrencies").get("currency_dollar").toJSON()).toEqual(_.extend({}, Models.Currency.prototype.defaults, virtualCurrency));
                expect(SoomlaJS.store.get("virtualCurrencies").length).toEqual(1);
            });

            // TODO: Be able to access SoomlaJS properties even though they are asynchronously set
            xit("should accept a 'beforeLeave' callback", function() {
                var callbacks = {
                    beforeLeave : function() {}
                };
                SoomlaJS.initialize({ callbacks : callbacks, template : {name : "empty"}, theme : {name : "empty"} });
                expect(SoomlaJS.storeView.options.callbacks.beforeLeave).toEqual(callbacks.beforeLeave);
            });

        });


        describe('=== Native / Javascript API', function () {

            it("should have Soomla Native API functions defined", function() {
                expect(SoomlaNative.wantsToBuyVirtualGoods).toBeDefined();
                expect(SoomlaNative.wantsToBuyCurrencyPacks).toBeDefined();
                expect(SoomlaNative.wantsToLeaveStore).toBeDefined();
            });

            it("should have Soomla Javascript API functions defined", function() {
                expect(SoomlaJS.disableCurrencyStore).toBeDefined();
                expect(SoomlaJS.currencyBalanceChanged).toBeDefined();
                expect(SoomlaJS.goodsUpdated).toBeDefined();
                expect(SoomlaJS.insufficientFunds).toBeDefined();
                expect(SoomlaJS.unexpectedError).toBeDefined();
                expect(SoomlaJS.notEnoughGoods).toBeDefined();
                expect(SoomlaJS.destroy).toBeDefined();
            });

            it("should set the store balance when currency was purchased successfully", function() {
                SoomlaJS.newStore({virtualCurrencies: [{itemId : "dollar"}]});
                SoomlaJS.currencyBalanceChanged({dollar : 100});
                expect(SoomlaJS.store.getBalance("dollar")).toEqual(100);
            });

            it("should update a virtual good's balance when it is purchased successfully", function() {
                SoomlaJS.newStore({ currency : {balance : 0} , virtualGoods : [{itemId : "surfboard", balance : 0}]});
                SoomlaJS.goodsUpdated({surfboard : {balance : 1}});
                expect(SoomlaJS.store.get("virtualGoods").get("surfboard").get("balance")).toEqual(1);
            });

            it("shouldn't set the store balance when the currency purchase failed", function() {
                SoomlaJS.newStore();
                SoomlaJS.disableCurrencyStore();
                expect(SoomlaJS.store.get("isCurrencyStoreDisabled")).toEqual(true);
            });

            // TODO: Be able to access SoomlaJS properties even though they are asynchronously set
            xit("should open a dialog when there are insufficient funds", function() {
                var stub = sinon.stub(Components.ModalDialog.prototype, "render", function(){return this;});
                SoomlaJS.newStore();
                SoomlaJS.insufficientFunds();
                expect(stub.called).toBeTruthy();
                stub.restore();  // Restore original spied function to prototype
            });
        });

    });

});
