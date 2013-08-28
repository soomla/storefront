define("cssUtils", ["modernizr"], function() {
    // Determine which CSS transition event to bind according to the browser vendor
    var transEndEventNames = {
        'WebkitTransition' : 'webkitTransitionEnd',
        'MozTransition'    : 'transitionend',
        'OTransition'      : 'oTransitionEnd',
        'msTransition'     : 'MSTransitionEnd',
        'transition'       : 'transitionend'
    };


    // Prepare variables for vendor prefixed animation event detection
    var el              = document.createElement("p"),
        animation       = false,
        animationString = 'animation',
        keyframePrefix  = '',
        domPrefixes     = 'webkit Webkit moz Moz o ms MS khtml'.split(' '),
        prefix          = '',
        endSuffix;


    // Detect animationend event name
    if (el.style.animationName) animation = true;
    if (animation === false) {
        for (var i = 0; i < domPrefixes.length; i++) {
            if (el.style[ domPrefixes[i] + 'AnimationName' ] !== undefined) {
                prefix = domPrefixes[ i ];
                animationString = prefix + 'Animation';
                keyframePrefix = '-' + prefix.toLowerCase() + '-';
                animation = true;
                break;
            }
        }
    }
    endSuffix = (animationString.match(/^o?animation/)) ? "end" : "End";


    return {
        getTransitionendEvent : function() {
            return transEndEventNames[ Modernizr.prefixed('transition') ];
        },
        getAnimationendEvent : function() {
            return animationString + endSuffix;
        }
    };
});