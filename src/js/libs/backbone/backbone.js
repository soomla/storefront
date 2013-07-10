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


    return Backbone;
});
