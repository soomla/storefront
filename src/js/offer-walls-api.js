define("offerWallsAPI", ["underscore"], function(_) {

    return {
        openOfferWall : function(options) {

            var url 	= options.url,
            	params 	= decodeURIComponent($.param(_.omit(options, "url"))),
            	src 	= "http://iframe.sponsorpay.com/mbrowser?" + params;

            var iframe = $("<iframe>", {src : src}).css({position: "fixed", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%", "z-index": 1000});

            iframe.appendTo("body");
        }
    };
});
