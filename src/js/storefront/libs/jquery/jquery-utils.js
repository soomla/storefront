define("jqueryUtils", ["cssUtils"], function(CssUtils) {

    var transitionend   = CssUtils.getTransitionendEvent(),
        animationend    = CssUtils.getAnimationendEvent();


    /**
     * Common factory function for creating `transitionOnce` and `animateOnce`.
     * This jQuery plugin transitions \ animates the set of selected elements
     * by adding \ removing the given class.
     * It returns a promise that is resolved once the transition \ animation is complete.
     *
     *
     * Example Usage -
     *
     * 1. Regular:
     *    $(selector).transitionOnce({ klass: "changed"})
     *
     * 2. Shorthand:
     *    $(selector).transitionOnce("changed")
     *
     * 3. Remove class instead of adding it:
     *    $(selector).transitionOnce({ klass: "changed", method: "removeClass})
     *
     */
    var createEventChangeOnce = function(eventName) {

        return function(options) {

            // Allow passing only a class name string as a single argument instead of an options hash
            if ($.type(options) === "string") {
                var klass = options;
                options = {method : "addClass"};
                options.klass = klass;
            }

            var promises = [];

            var els = this.each(function () {
                var deferred = $.Deferred(),
                    el       = $(this);

                // handle event once and resolve promise
                el.one(eventName, deferred.resolve);

                promises.push(deferred.promise());
            });

            els[options.method](options.klass);

            return $.when.apply($, promises);
        };
    };

    $.fn.transitionOnce = createEventChangeOnce(transitionend);
    $.fn.animateOnce    = createEventChangeOnce(animationend);
});
