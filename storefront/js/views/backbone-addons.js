define(["backbone"], function(Backbone) {

    var originalOn = Backbone.Events.on;
    var on = function(events, callback, context) {
        if (_.isObject(events)) {

            // In this case, the 2nd argument is the context object for the event handlers
            context = callback;
            var $this = this;

            // Attach all event handlers
            _.each(events, function(listener, name) {
                originalOn.call($this, name, listener, context);
            });
            return this;
        } else {
            // Fallback: use original Backbone.Events.on
            return originalOn.call(this, events, callback, context);
        }
    };
    Backbone.Events.on = on;
    _.each(["Model", "Collection", "Router", "History", "View"], function(entity) {
        Backbone[entity].prototype.on = on;
    })
});