define("marionetteExtensions", ["marionetteFramework"], function(Marionette) {

    _.extend(Marionette.View.prototype, {

        forwardEvent : function(event, target, targetEvent) {
            var source = this;
            target.listenTo(source, event, function() {
                var args = _.toArray(arguments);

                // Forward to the target event.  If none was give, forward to same event name
                target.trigger.apply(target, [targetEvent || event].concat(args));
            });

            return this;
        }
    });


    // Inspired by https://github.com/kjbekkelund/writings/blob/master/published/backbone-mixins.md

    var Utils = {

        viewMixin : function() {
            var to = this.prototype;

            _.each(arguments, function(from) {

                // we add those methods which exists on `from` but not on `to` to the latter
                // all except for the methods we want to extend
                _.defaults(to, _.omit(from, "initialize", "onClose", "onRender"));

                // ...and we do the same for events and triggers
                _.each(["events", "triggers", "ui"], function(property) {

                    // We want to extend the target object with this property
                    // only if the source object has it.
                    if (_.isObject(from[property])) {

                        // Override the property with the extended property
                        // This is so that it will apply to the "extendee" prototype
                        // and won't affect the parent prototype
                        to[property] = _.extend({}, to[property], from[property]);
                    }
                });

                // we then extend `to`'s `initialize`, `onClose`, `onRender`
                Utils.extendMethod(to, from, "initialize");
                Utils.extendMethod(to, from, "onClose");
                Utils.extendMethod(to, from, "onRender");
            });

            return this;
        },

        // Helper method to extend an already existing method
        extendMethod : function(to, from, methodName, options) {
            (options) || (options = {});

            // if the method is defined on `from` ...
            if (!_.isUndefined(from[methodName])) {
                var oldFunction = to[methodName],
                    newFunction = from[methodName];

                // ... we either assign in on `to` if it doesn't exist
                if (_.isUndefined(oldFunction)) {
                    to[methodName] = newFunction;
                } else {

                    // ... or we create a new function on `to` which invokes both the original and the new functions
                    to[methodName] = function() {

                        var oldReturn;

                        //
                        // The order in which we invoke the old and new functions is determined by the
                        // `preemptive` option.  If it is provided, invoke the new function, then the old one
                        // Otherwise, invoke the old function and then the new one.
                        // Always return the old function's return value
                        //
                        if (options.preemptive) {
                            newFunction.apply(this, arguments);
                            oldReturn = oldFunction.apply(this, arguments);
                        } else {
                            oldReturn = oldFunction.apply(this, arguments);
                            newFunction.apply(this, arguments);
                        }

                        // and then return the expected result,
                        // i.e. what the method on `to` returns
                        return oldReturn;
                    };
                }
            }
        }
    };

    Marionette.View.mixin = Utils.viewMixin;
});