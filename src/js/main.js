require.config({
    baseUrl : "js",

    // Cancel timeout for really slow devices
    waitSeconds : 0,

    paths: {

        // Initialization
        store                   : "store",

        // Models
        economyModels           : "models/economy-models",
        models                  : "models/models",
        assetManager            : "models/asset-manager",
        template                : "models/template",

        // Views
        components              : "views/components",
        itemViews               : "views/item-views",
        expandableItemViews     : "views/expandable-item-views",
        collectionViews         : "views/collection-views",
        helperViews             : "views/helper-views",
        templates           	: "views/templates",

        // Utilities
        utils                   : "utils/utils",
        stringUtils             : "utils/string-utils",
        urls                    : "utils/urls",
        userAgent               : "utils/user-agent",
        cssUtils                : "utils/css-utils",
        constants               : "utils/constants",

        // Native APIs
        soomlaAndroid           : "api/soomla-android",
        soomlaiOS               : "api/soomla-ios",
        nativeApiStubs          : "api/native-api-stubs",
        jsAPI                   : "api/js-api",
        messaging               : "api/messaging",

        // Hooks
        hooks                   : "hooks/hooks",

        // 3rd party modules
        imagesloaded            : "libs/imagesloaded-3.0.4",
        eventie                 : "libs/eventie-1.0.3",
        eventEmitter            : "libs/event-emitter-4.2.0",
        fastbutton              : "libs/google.fastbutton",
        less                	: "libs/less-1.3.3",
        iscroll                 : "libs/iscroll",
        handlebars          	: "libs/handlebars-1.0.rc.2",

        // jQuery related
        jquery              	: "libs/jquery/jquery-1.9.1.min",
        "jquery.fastbutton"     : "libs/jquery/jquery.google.fastbutton",
        "jquery.preload"        : "libs/jquery/jquery.preload",
        "jquery.pnotify"        : "libs/jquery/jquery.pnotify",
        jqueryUtils             : "libs/jquery/jquery-utils",

        // Backbone related
        underscore          	: "libs/underscore-1.5.2",
        backboneFramework       : "libs/backbone/backbone-1.1.0",
        backboneRelational  	: "libs/backbone/backbone-relational-0.8.6",
        backboneExtensions      : "libs/backbone/backbone-extensions",
        marionetteFramework 	: "libs/backbone/backbone.marionette.core-1.4.0",
        marionetteExtensions    : "libs/backbone/marionette-extensions",
        "backbone.babysitter"   : "libs/backbone/backbone.babysitter-0.0.6",
        "backbone.wreqr"        : "libs/backbone/backbone.wreqr-0.2.0",

        // Aggregative modules
        backbone            	: "libs/backbone/backbone",
        marionette            	: "libs/backbone/marionette"
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
        marionetteFramework : {
            deps: ['backbone'],
            exports: 'Marionette'
        },
        marionette : {
            deps: ['marionetteFramework']
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