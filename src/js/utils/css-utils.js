define("cssUtils", function() {


    // Prepare variables for vendor prefixed transition and animation event detection
    var el              = document.createElement("p"),
        transition      = false,
        transitionString= 'transition',
        animation       = false,
        animationString = 'animation',
        keyframePrefix  = '',
        domPrefixes     = 'webkit Webkit moz Moz o ms MS khtml'.split(' '),
        vendorPrefix,
        endSuffix,
        i;


    // Detect vendor-specific transitionend event name
    if (el.style.transition) transition = true;
    if (transition === false) {
        for (i = 0; i < domPrefixes.length; i++) {
            if (el.style[ domPrefixes[i] + 'Transition' ] !== undefined) {
                vendorPrefix = domPrefixes[ i ];
                transitionString = vendorPrefix + 'Transition';
                transition = true;
                break;
            }
        }
    }

    // Detect vendor-specific animationend event name
    if (el.style.animationName) animation = true;
    if (animation === false) {
        for (i = 0; i < domPrefixes.length; i++) {
            if (el.style[ domPrefixes[i] + 'AnimationName' ] !== undefined) {
                vendorPrefix = domPrefixes[ i ];
                animationString = vendorPrefix + 'Animation';
                keyframePrefix = '-' + vendorPrefix.toLowerCase() + '-';
                animation = true;
                break;
            }
        }
    }

    // Detect end suffix
    endSuffix = (animationString.match(/^o?animation/)) ? "end" : "End";


    return {
        getTransitionendEvent : function() {
            return transitionString + endSuffix;
        },
        getAnimationendEvent : function() {
            return animationString + endSuffix;
        }
    };
});