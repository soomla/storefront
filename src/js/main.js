require.config({
    baseUrl : "js",

    // Cancel timeout for really slow devices
    waitSeconds : 0,

    paths: {
        store                   : "store",
        models                  : "models",
        jsAPI                   : "js-api",
        components              : "views/components",
        helperViews             : "views/helper-views",
        viewMixins          	: "views/view-mixins",
        backboneExtensions      : "views/backbone-extensions",
        marionetteExtensions    : "views/marionette-extensions",
        cssUtils                : "views/css-utils",
        templates           	: "views/templates",
        utils                   : "utils",
        userAgent               : "user-agent",
        nativeApiStubs          : "native-api-stubs",
        soomlaiOS               : "soomla-ios",

        // 3rd party modules
        jquery              	: "libs/jquery/jquery-1.9.1.min",
        "jquery.imagesloaded"   : "libs/jquery/jquery.imagesloaded",
        "jquery.fastbutton"     : "libs/jquery/jquery.google.fastbutton",
        "jquery.preload"        : "libs/jquery/jquery.preload",
        fastbutton              : "libs/google.fastbutton",
        modernizr               : "libs/modernizr-2.5.3.min",
        less                	: "libs/less-1.3.0.min",
        iscroll                 : "libs/iscroll",
        underscore          	: "libs/underscore-1.4.4",
        backbone            	: "libs/backbone/backbone-1.0.0",
        backboneRelational  	: "libs/backbone/backbone-relational-0.8.5",
        marionette          	: "libs/backbone/backbone.marionette.core-1.0.3",
        "backbone.babysitter"   : "libs/backbone/backbone.babysitter-0.0.6",
        "backbone.wreqr"        : "libs/backbone/backbone.wreqr-0.2.0",
        handlebars          	: "libs/handlebars-1.0.rc.2"
    },
    shim: {
        underscore: {
            exports: '_'
        },
        "jquery.imagesloaded": {
            deps: ['jquery']
        },
        "jquery.preload": {
            deps: ['jquery']
        },
        "jquery.fastbutton": {
            deps: ['jquery', 'fastbutton']
        },
        backbone: {
            deps: ['underscore'],
            exports: 'Backbone'
        },
        backboneRelational : {
            deps: ['backbone']
        },
        marionette : {
            deps: ['backbone']
        },
        marionetteExtensions : {
            deps: ['marionette']
        },
        handlebars : {
            exports : "Handlebars"
        },
        templates : {
            deps: ['handlebars']
        }

        // No need to export globally in 'shim' section
    }
});

require(["store"]);