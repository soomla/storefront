define(function() {

    var Store = Backbone.Model.extend({});

    var Item = Backbone.Model.extend({});
    var ItemCollection = Backbone.Collection.extend({
        model : Item
    });

    return {
        Item : Item,
        ItemCollection: ItemCollection,
        Store : Store
    };
});