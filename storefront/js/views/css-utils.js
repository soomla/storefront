define(function() {
    // Determine which CSS transition event to bind according to the browser vendor
    var transEndEventNames = {
        'WebkitTransition' : 'webkitTransitionEnd',
        'MozTransition'    : 'transitionend',
        'OTransition'      : 'oTransitionEnd',
        'msTransition'     : 'MSTransitionEnd',
        'transition'       : 'transitionend'
    };

    return {
        getTransitionendEvent : function() {
            return transEndEventNames[ Modernizr.prefixed('transition') ];
        }
    };
});