require.config({
    baseUrl : "js",
    paths: {
        components              : "views/components",
        helperViews             : "views/helper-views",
        viewMixins          	: "views/view-mixins",
        backboneExtensions      : "views/backbone-extensions",
        marionetteExtensions    : "views/marionette-extensions",
        cssUtils                : "views/css-utils",
        templates           	: "views/templates",

        // 3rd party modules
        jquery              	: "libs/jquery/jquery-1.9.1.min",
        "jquery.imagesloaded"   : "libs/jquery/jquery.imagesloaded",
        "jquery.fastbutton"     : "libs/jquery/jquery.google.fastbutton",
        fastbutton              : "libs/google.fastbutton",
        modernizr               : "libs/modernizr-2.5.3.min",
        less                	: "libs/less-1.3.0.min",
        iscroll                 : "libs/iscroll",
        underscore          	: "libs/underscore-min",
        backbone            	: "libs/backbone/backbone-0.9.10",
        backboneRelational  	: "libs/backbone/backbone-relational-0.7.1",
        marionette          	: "libs/backbone/backbone.marionette.core-1.0.0-rc5",
        "backbone.babysitter"   : "libs/backbone/backbone.babysitter",
        "backbone.wreqr"        : "libs/backbone/backbone.wreqr",
        handlebars          	: "libs/handlebars-1.0.rc.2"
    },
    shim: {
        underscore: {
            exports: '_'
        },
        "jquery.imagesloaded": {
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