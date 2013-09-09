define("jqueryUtils", ["cssUtils"], function(CssUtils) {

    var transitionend   = CssUtils.getTransitionendEvent(),
        animationend    = CssUtils.getAnimationendEvent();


    /**
     * Common factory function for creating `transitionOnce` and `animateOnce`.
     * This jQuery plugin transitions \ animates the set of selected elements
     * by adding the given class, and removing it once the change is complete.
     * It returns a promise that is resolved once the transition \ animation is complete.
     *
     *
     * Example Usage -
     *
     * 1. Regular:
     *    $(selector).transitionOnce({ klass: "changed"})
     *
     * 2. Shorthand:
     *    $(selector).transitionOnce({ klass: "changed"})
     *
     * 3. Without removing class when transition completes:
     *    $(selector).transitionOnce({ klass: "changed", remove: false})
     *
     */
    var createEventChangeOnce = function(eventName) {

        return function(options) {

            // Allow passing only a class name string as a single argument instead of an options hash
            if ($.type(options) === "string") {
                var klass = options;
                options = {};
                options.klass = klass;
            }

            var promises = [];

            this.each(function () {
                var deferred = $.Deferred(),
                    el       = $(this);

                // handle event once and resolve promise
                el.one(eventName, function() {
                    if (options.remove !== false) el.removeClass(options.klass);
                    deferred.resolve();
                });

                promises.push(deferred.promise());
            }).addClass(options.klass);

            return $.when.apply($, promises);
        };
    };

    $.fn.transitionOnce = createEventChangeOnce(transitionend);
    $.fn.animateOnce    = createEventChangeOnce(animationend);
});
