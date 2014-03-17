require.config({

    // Allow the base URL to be overriden for development environment purposes
    baseUrl : (typeof requirejsOverrideBaseUrl !== "undefined") ? requirejsOverrideBaseUrl : "js",

    // Cancel timeout for really slow devices
    waitSeconds : 0,

    paths: {

        // Initialization
        init                    : "storefront/init",

        // Models
        economyModels           : "js-store/src/models/economy-models",
        storeModel              : "js-store/src/models/store-model",
        models                  : "js-store/src/models/models",
        hooks                   : "js-store/src/models/hooks",
        modelManipulation       : "js-store/src/models/model-manipulation",

        // Utilities
        utils                   : "js-store/src/utils/utils",
        stringUtils             : "js-store/src/utils/string-utils",
        urls                    : "js-store/src/utils/urls",
        constants               : "js-store/src/utils/constants",
        errors                  : "js-store/src/utils/errors",

        // External mixins for dashboard \ storefront UI
        dashboardHelpers        : "external/dashboard-helpers",
        template                : "external/template",

        // Storefront UI related modules and Native APIs
        storefrontHelpers       : "storefront/storefront-helpers",
        assetManager            : "storefront/asset-manager",
        soomlaAndroid           : "storefront/soomla-android",
        soomlaiOS               : "storefront/soomla-ios",
        nativeApiStubs          : "storefront/native-api-stubs",
        jsAPI                   : "storefront/js-api",
        messaging               : "storefront/messaging",

        // Storefront utilities
        cssUtils                : "storefront/utils/css-utils",
        userAgent               : "storefront/utils/user-agent",

        // Storefront views
        itemViews               : "storefront/views/item-views",
        expandableItemViews     : "storefront/views/expandable-item-views",
        collectionViews         : "storefront/views/collection-views",
        helperViews             : "storefront/views/helper-views",
        templates           	: "storefront/views/templates",
        components              : "storefront/views/components",


        // Storefront - 3rd party modules
        imagesloaded            : "storefront/libs/imagesloaded-3.0.4",
        eventie                 : "storefront/libs/eventie-1.0.3",
        eventEmitter            : "storefront/libs/event-emitter-4.2.0",
        less                	: "storefront/libs/less-1.3.3",
        fastbutton              : "storefront/libs/google.fastbutton",
        iscroll                 : "storefront/libs/iscroll",
        handlebars          	: "storefront/libs/handlebars-1.0.rc.2",

        // jQuery related
        jquery              	: "storefront/libs/jquery/jquery-1.9.1.min",
        "jquery.pnotify"        : "storefront/libs/jquery/jquery.pnotify",
        jqueryUtils             : "storefront/libs/jquery/jquery-utils",
        "jquery.preload"        : "storefront/libs/jquery/jquery.preload",
        "jquery.fastbutton"     : "storefront/libs/jquery/jquery.google.fastbutton",

        // Backbone related
        underscore          	: "js-store/src/libs/underscore-1.6.0",
        backboneFramework       : "js-store/src/libs/backbone/backbone-1.1.0",
        backboneRelational  	: "js-store/src/libs/backbone/backbone-relational-0.8.6",
        backboneExtensions      : "js-store/src/libs/backbone/backbone-extensions",
        marionetteFramework 	: "storefront/libs/backbone/backbone.marionette.core-1.4.0",
        marionetteExtensions    : "storefront/libs/backbone/marionette-extensions",
        "backbone.babysitter"   : "storefront/libs/backbone/backbone.babysitter-0.0.6",
        "backbone.wreqr"        : "storefront/libs/backbone/backbone.wreqr-0.2.0",

        // Aggregative modules
        backbone            	: "js-store/src/libs/backbone/backbone",
        marionette            	: "storefront/libs/backbone/marionette"
    },
    shim: {
        "imagesloaded": {
            deps: ['jquery']
        },
        "backboneFramework" : {
            deps: ['underscore'],

            // Eventhough Backbone 1.1.2 is an AMD module, still export it to the window
            // because some Backbone plugins assume it's there
            exports: "Backbone"
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
        },


        // Storefront related shims
        "jquery.fastbutton": {
            deps: ['jquery', 'fastbutton']
        },
        "jquery.preload": {
            deps: ['jquery']
        }

        // No need to export globally in 'shim' section
    }
});

require(["init"]);