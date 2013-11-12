define("messaging", ["jquery", "hooks", "constants", "jquery.pnotify"], function($, Hooks, Constants) {


    // The notification stack must be defined in a variable for it to work properly.
    // See: https://github.com/sciactive/pnotify#stacks
    var bottomUpStack = {"dir1": "up", "dir2": "right", "spacing1": 20, "spacing2": 20};

    return {
        handleMessage : function(options) {
            if (options.success === true && options.type === Constants.SPONSORPAY) {

                // Assume access to the store model
                var itemName    = (this.model.getCurrency(options.itemId) || this.model.getItem(options.itemId)).getName(),
                    amount      = options.amount;

                // Safeguard in case things aren't defined properly
                if (!amount || !itemName) return;

                var title   = Hooks.Providers.SponsorpayAction.defaultTitle(),
                    message = Hooks.Providers.SponsorpayAction.defaultMessage(amount, itemName);

                var notice = $.pnotify({
                    title 			: title,
                    text 			: message,
                    addclass 		: "stack-bar-bottom soomla-hook-notice",
                    closer_hover 	: false,
                    hide            : false,
                    type 			: "info",
                    cornerclass 	: "",
                    animate_speed 	: "fast",
                    maxonscreen 	: 2,
                    history 		: false,
                    stack 			: bottomUpStack
                });


                if (innerHeight <= 1024) {
                    notice.css("zoom", innerHeight <= 320 ? 3 : 2);
                }
            }
        }
    };
});
