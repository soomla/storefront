define("backboneExtensions", [], function() {

    // Taken from https://github.com/kjbekkelund/writings/blob/master/published/backbone-mixins.md

    var BackboneExtensions = {

        viewMixin : function(from) {
            var to = this.prototype;

            // we add those methods which exists on `from` but not on `to` to the latter
            _.defaults(to, from);

            // ...and we do the same for events and triggers
            _.defaults(to.events, from.events);
            _.defaults(to.triggers, from.triggers);

            // we then extend `to`'s `initialize`
            BackboneExtensions.extendMethod(to, from, "initialize");
        },

        // Helper method to extend an already existing method
        extendMethod : function(to, from, methodName) {

            // if the method is defined on from ...
            if (!_.isUndefined(from[methodName])) {
                var old = to[methodName];

                // ... we create a new function on to
                to[methodName] = function() {

                    // wherein we first call the method which exists on `to`
                    var oldReturn = old.apply(this, arguments);

                    // and then call the method on `from`
                    from[methodName].apply(this, arguments);

                    // and then return the expected result,
                    // i.e. what the method on `to` returns
                    return oldReturn;

                };
            }
        }
    };

    return BackboneExtensions;
});