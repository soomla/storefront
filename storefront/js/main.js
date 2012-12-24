require.config({
    baseUrl : "js",
    paths: {
        components              : "views/components",
        viewMixins          	: "views/view-mixins",
        marionetteExtensions    : "views/marionette-extensions",
        templates           	: "views/templates",
        backboneAddons      	: "views/backbone-addons",

        // 3rd party modules
        jquery              	: "libs/jquery/jquery-1.8.0.min",
        less                	: "libs/less-1.3.0.min",
        underscore          	: "libs/underscore-min",
        backbone            	: "libs/backbone/backbone",
        backboneRelational  	: "libs/backbone/backbone-relational",
        marionette          	: "libs/backbone/backbone.marionette",
        handlebars          	: "libs/handlebars-1.0.0.beta.6"
    },
    shim: {
        underscore: {
            exports: '_'
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