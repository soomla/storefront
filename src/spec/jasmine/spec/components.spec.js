define("components.spec", ["components", "backbone", "handlebars"], function (Components, Backbone, Handlebars) {

    // Assign components to local variables for spec brevity
    var ModalDialog     = Components.ModalDialog,
        BaseView        = Components.BaseView,
        ItemView        = Components.ItemView,
        CollectionView  = Components.CollectionView;

    describe('Soomla Store Backbone Components', function () {


        describe("ModalDialog component", function() {

            var modal, attributes, touchendEvent;

            beforeEach(function() {
                attributes      = {
                    model       : new Backbone.Model(),
                    parent      : $("<div>"),
                    template    : Handlebars.compile("<div class='close'></div> <div class='modal'></div> <div class='buy-more'></div> <div class='cancel'></div>")
                };
                modal           = new ModalDialog(attributes);
                touchendEvent   = $.Event("touchend", {originalEvent : {touches : [1]}});
            });

            it("should be defined", function() {
                expect(ModalDialog).toBeDefined();
            });

            it("should be an instance of Backbone.View", function() {
                expect(modal).toBeInstanceOf(Backbone.View);
            });

            it("should create a div", function() {
                expect(modal.el.nodeName).toEqual("DIV");
            });

            it("should have a class name 'modal-container'", function() {
                expect(modal.el.className).toEqual("modal-container");
            });

            it("should have a tap event on the close button and overlay", function() {
                expect(modal.events["touchend .close"]).toBeDefined();
                expect(modal.events["touchend .modal"]).toBeDefined();
            });

            it("should close the modal when the close button / overlay is tapped", function() {
                _.each([".close", ".modal"], function(selector) {
                    var spy = sinon.spy(ModalDialog.prototype, "close");
                    new ModalDialog(attributes).render().$(selector).trigger(touchendEvent);
                    expect(spy.called).toBeTruthy();
                    spy.restore();
                });
            });

            it("should remove element from DOM when closed", function() {
                modal.close(touchendEvent);
                expect(modal.$el.parent().length).toEqual(0);
            });

            it("should use the template when rendering", function() {
                modal = new ModalDialog(_.extend(attributes, {template : sinon.spy()})).render();
                expect(modal.getTemplate().called).toBeTruthy();
            });
            it("should return the itself from render / close for chaining", function() {
                modal = new ModalDialog(_.extend(attributes, {template : sinon.stub()})).render();
                expect(modal.render()).toEqual(modal);
                expect(modal.close(touchendEvent)).toEqual(modal);
            });

            it("should trigger an event when closing the view", function() {
                var spy = sinon.spy();
                new ModalDialog(attributes).render().on("closed", spy).close(touchendEvent);
                expect(spy.calledWith("cancel")).toBeTruthy();
            });

            it("should have a tap event on the 'cancel' button and 'buy more' button", function() {
                expect(modal.events["touchend .buy-more"]).toBeDefined();
                expect(modal.events["touchend .cancel"]).toBeDefined();
            });

            it("should trigger an event indicating 'Cancel' was selected when closing", function() {
                var spy = sinon.spy();
                modal.render().on("closed", spy).$(".cancel").trigger(touchendEvent);
                expect(spy.calledWith("cancel")).toBeTruthy();
            });

            it("should trigger an event indicating 'Buy more' was selected when closing", function() {
                var spy = sinon.spy();
                modal.render().on("closed", spy).$(".buy-more").trigger(touchendEvent);
                expect(spy.calledWith("buyMore")).toBeTruthy();
            });

            it("should have no event handlers attached to the view after it was closed", function() {
                var spy = sinon.spy();
                modal.render().on("testEvent", spy).close(touchendEvent).trigger("testEvent");
                expect(spy.called).toBeFalsy();
            });


        });

        describe("ItemView", function() {

            var view, attributes, model, touchendEvent;

            beforeEach(function() {
                model = new Backbone.Model();
                attributes      = { model : model };
                view            = new ItemView(attributes);
                touchendEvent   = $.Event("touchend", {originalEvent : {touches : [1]}});
            });

            it("should be defined", function() {
                expect(ItemView).toBeDefined();
            });

            it("should be an instance of a Backbone view", function() {
                expect(new ItemView({model : new Backbone.Model()})).toBeInstanceOf(Backbone.View);
            });

            it("should create a div", function() {
                expect(view.el.nodeName).toEqual("LI");
            });

            it("should have a class name 'item'", function() {
                expect(view.el.className).toEqual("item");
            });

            it("should have a tap event on the entire item", function() {
                expect(view.triggers["touchend"]).toBeDefined();
            });

            it("should accept an itemType and use the relevant template", function() {
                var spy = sinon.spy();
                new ItemView({
                    model       : new Backbone.Model(),
                    template    : spy
                }).render();
                expect(spy.called).toBeTruthy();
            });

            it("should return itself from render for chaining", function() {
                var view = new ItemView(_.extend({template : sinon.stub()}, attributes));
                expect(view.render()).toEqual(view);
            });

            it("should trigger a 'selected' event on itself with its model when tapped", function() {
                var spy = sinon.spy();
                view = new ItemView(attributes);
                view.on("select", spy).$el.trigger(touchendEvent);
                expect(spy.calledWith(model)).toBeTruthy();
            });

            it("should trigger a 'selected' event on itself with its model when clicked", function () {
                var spy = sinon.spy();
                _.extend(ItemView.prototype.triggers, { click : "select" });
                new ItemView(attributes).on("select", spy).$el.click();
                expect(spy.calledWith(model)).toBeTruthy();
                delete ItemView.prototype.triggers.click;
            });

            it("should re-render on changes to the model attributes: currency, price, balance", function () {
                _.each(["currency", "price", "balance"], function(attribute) {
                    var stub    = sinon.stub(ItemView.prototype, "render"),
                        model   = new Backbone.Model();
                    new ItemView({ model : model}).model.set(attribute, "some value");
                    expect(stub.called).toBeTruthy();
                    stub.restore();
                });
            });

        });

        describe("CollectionView", function() {

            var view,attributes, stubType;

            beforeEach(function() {
                stubType = BaseView.extend({render : sinon.spy(function() {return this;}), el : $("<div>")[0]});
                attributes  = {
                    collection : new Backbone.Collection([new Backbone.Model()]),
                    templateProperties : {},
                    itemView : stubType
                };
                view        = new CollectionView(attributes);
            });

            it("should be defined", function() {
                expect(CollectionView).toBeDefined();
            });

            it("should create a UL tag", function () {
                expect(view.el.nodeName).toEqual("UL");
            });

            it("should create instances of subviews upon construction", function() {
                expect(new CollectionView(attributes).children.length).toEqual(1);
            });

            it("should call subviews' render function when rendering", function () {
                view.render();
                expect(stubType.prototype.render.called).toBeTruthy();
            });

            it("should trigger an event when one of its items was selected", function () {
                var spy     = sinon.spy(),
                    model   = new Backbone.Model();

                // Fake a view that can fire the event
                var type        = BaseView.extend({model : model, triggerTapEvent : function(){ this.trigger("select", this.model) }});
                view = new CollectionView({
                    collection          : new Backbone.Collection([model]),
                    itemView            : type,
                    templateProperties  : {}
                }).on("selected", spy).render();

                view.children[0].triggerTapEvent();
                expect(spy.calledWith(model)).toBeTruthy();
            });

        });

    });
});
