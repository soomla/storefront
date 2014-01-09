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
});