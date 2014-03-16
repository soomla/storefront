define("backbone", ["backboneFramework", "backboneExtensions", "backboneRelational"], function(Backbone, BackboneExtensions) {

    Backbone.View.mixin = BackboneExtensions.viewMixin;



    /**
     * Moves a model to the given index, if different from its current index. Handy
     * for shuffling models after they've been pulled into a new position via
     * drag and drop.
     */
    Backbone.Collection.prototype.move = function(model, toIndex) {
        var fromIndex = this.indexOf(model);
        if (fromIndex == -1) {
            throw new Error("Can't move a model that's not in the collection")
        }
        if (fromIndex !== toIndex) {
            this.models.splice(toIndex, 0, this.models.splice(fromIndex, 1)[0]);
            this.trigger("reset");
        }
    };

    /**
     * Finds the model with the given ID and removes it from a collection.
     * Pass {fallback : "first" \ "last"} to indicate that if the model
     * isn't found in the collection, default to removing the first \ last model
     * @param id
     * @param options
     * @returns {*}
     */
    Backbone.Collection.prototype.removeById = function(id, options) {
        if (!_.isUndefined(id)) {
            var model = this.get(id);
            return this.remove(model);
        }

        if (options) {
            if (options.fallback === "first") 	return this.remove(this.first());
            if (options.fallback === "last") 	return this.remove(this.last());
        }

        return undefined;
    };

    Backbone.Collection.prototype.getOrAdd = function(id) {
        var model = this.get(id);
        if (_.isUndefined(model)) this.add({id : id});
        return this.get(id);
    };


    return Backbone;
});
