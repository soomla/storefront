require.config({
    baseUrl : "js",

    // Cancel timeout for really slow devices
    waitSeconds : 0,

    paths: {
        store                   : "store",
        economyModels           : "economy-models",
        models                  : "models",
        jsAPI                   : "js-api",
        components              : "views/components",
        itemViews               : "views/item-views",
        expandableItemViews     : "views/expandable-item-views",
        collectionViews         : "views/collection-views",
        helperViews             : "views/helper-views",
        viewMixins          	: "views/view-mixins",
        marionetteExtensions    : "views/marionette-extensions",
        cssUtils                : "views/css-utils",
        templates           	: "views/templates",
        utils                   : "utils",
        urls                    : "urls",
        userAgent               : "user-agent",
        nativeApiStubs          : "native-api-stubs",
        soomlaiOS               : "soomla-ios",

        // 3rd party modules
        jquery              	: "libs/jquery/jquery-1.9.1.min",
        "jquery.fastbutton"     : "libs/jquery/jquery.google.fastbutton",
        "jquery.preload"        : "libs/jquery/jquery.preload",
        imagesloaded            : "libs/imagesloaded-3.0.4",
        eventie                 : "libs/eventie-1.0.3",
        eventEmitter            : "libs/event-emitter-4.2.0",
        fastbutton              : "libs/google.fastbutton",
        less                	: "libs/less-1.3.3",
        iscroll                 : "libs/iscroll",
        underscore          	: "libs/underscore-1.4.4",
        backboneFramework       : "libs/backbone/backbone-1.0.0",
        backbone            	: "libs/backbone/backbone",
        backboneRelational  	: "libs/backbone/backbone-relational-0.8.5",
        backboneExtensions      : "libs/backbone/backbone-extensions",
        marionette          	: "libs/backbone/backbone.marionette.core-1.0.3",
        "backbone.babysitter"   : "libs/backbone/backbone.babysitter-0.0.6",
        "backbone.wreqr"        : "libs/backbone/backbone.wreqr-0.2.0",
        handlebars          	: "libs/handlebars-1.0.rc.2"
    },
    shim: {
        underscore: {
            exports: '_'
        },
        "imagesloaded": {
            deps: ['jquery']
        },
        "jquery.preload": {
            deps: ['jquery']
        },
        "jquery.fastbutton": {
            deps: ['jquery', 'fastbutton']
        },
        "backboneFramework" : {
            deps: ['underscore'],
            exports: 'Backbone'
        },
        backbone : {
            deps: ['backboneFramework']
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