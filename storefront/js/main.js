require.config({
    baseUrl : "js",
    paths: {
        components              : "views/components",
        viewMixins          	: "views/view-mixins",
        marionetteExtensions    : "views/marionette-extensions",
        templates           	: "views/templates",
        backboneAddons      	: "views/backbone-addons",
        pointingDeviceSupport   : "pointing-device-support",

        // 3rd party modules
        jquery              	: "libs/jquery/jquery-1.8.0.min",
        "jquery.imagesloaded"   : "libs/jquery/jquery.imagesloaded",
        fastclick               : "libs/fastclick",
        less                	: "libs/less-1.3.0.min",
        underscore          	: "libs/underscore-min",
        backbone            	: "libs/backbone/backbone",
        backboneRelational  	: "libs/backbone/backbone-relational",
        marionette          	: "libs/backbone/backbone.marionette",
        handlebars          	: "libs/handlebars-1.0.rc.2"
    },
    shim: {
        underscore: {
            exports: '_'
        },
        "jquery.imagesloaded": {
            deps: ['jquery']
        },
        backbone: {
            deps: ['underscore'],
            exports: 'Backbone'
        },
        backboneRelational : {
            deps: ['backbone']
        },
        backboneAddons : {
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