/*global module:false*/
require('shelljs/global');


module.exports = function (grunt) {

    var distFolder = "soomla_ui", themeFolder, theme;

    // Project configuration.
    var config = {
        meta : {
            version : '0.1.0',
            banner : '/*! PROJECT_NAME - v<%= meta.version %> - ' +
                '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
                '* http://PROJECT_WEBSITE/\n' +
                '* Copyright (c) <%= grunt.template.today("yyyy") %> ' +
                'YOUR_NAME; Licensed MIT */'
        },
        less : {
            store : {
                src  :'css/store.less',
                dest :distFolder + '/css/store.css',
                options : {
                    compress : true
                }
            }
        },
        requirejs : {
            baseUrl         : 'js',
            mainConfigFile  : 'js/main-store.js',
            name            : "main-store",
            out             : distFolder + "/js/main-store.js"
        },
        rig : {
            all : {
                src  : "js/views/templates.js",
                dest : "js/views/templates.js"
            }
        }
    };

    var themes = ls("themes");

    grunt.initConfig(config);

    grunt.loadNpmTasks('grunt-less');
    grunt.loadNpmTasks('grunt-requirejs');
    grunt.loadNpmTasks('grunt-handlebars');
    grunt.loadNpmTasks('grunt-rigger');


    // Register helper tasks

    grunt.registerTask('copy', 'Copies more necessary resources to the distribution folder', function() {

        // Copy Javascript
        mkdir("-p", distFolder + "/js/libs");
        mkdir("-p", distFolder + "/themes");
        cp("js/libs/require.js", distFolder + "/js/libs/");

        // Copy HTML & images
        cp("-R", "img", "store.html", distFolder + "/");

        // Copy themes
        cp("-R", "themes/" + theme + "/", distFolder + "/themes/");

        // Uncomment this block for deploying with mobile-preview.html.
        // This is helpful when you want to build your theme and test it
        // in a browser after it was built
        // ===================================================================
        // mkdir("-p", distFolder + "/js/libs/jquery");
        // cp("js/libs/jquery/jquery-1.8.0.min.js", distFolder + "/js/libs/jquery");
        // cp("mobile-preview.html", distFolder + "/");

        cp("js/views/templates.js", "./");
    });

    grunt.registerTask('clean', 'Cleans the distribution folder', function() {
        rm("-rf", distFolder);
    });

    grunt.registerTask('cleanup', 'Cleans leftover files from the build process', function() {
        // Restore backed up file (before Handlebars templates were appended to it).
        mv("-f", "./templates.js", "./js/views/templates.js");

        // Remove auxiliary compiled Handlebars file
        rm("-f", "./js/views/handlebars-templates.js");

        // Remove LESS and Handlebars sources from the compiled theme
        rm("-rf", themeFolder + "/less", themeFolder + "/templates");
    });


    // Default task.
    grunt.registerTask("theme", "Builds the given theme. Compiles Handlebars templates and Less CSS, minifies and concatenates JS & CSS files", function(name) {

        theme = name;
        themeFolder = distFolder + '/themes/' + theme;

        // Dynamically add less configuration specific to this theme
        var lessConfig = grunt.config.get("less");
        lessConfig[theme] = {
            src  : themeFolder + '/less/*.less',
            dest : themeFolder + '/' + theme + '.css',
            options:{
                compress:true
            }
        };

        // Dynamically add handlebars configuration specific to this theme
        grunt.config.set("handlebars", {
            all: {
                src: distFolder + "/themes/" + theme + "/templates",
                dest: "./js/views/handlebars-templates.js"
            }
        });

        // Dynamically add minify configuration specific to this theme
        grunt.config.set("min", {
            all: {
                src: themeFolder + "/js/*",
                dest: themeFolder + "/js/" + theme + "Views.js"
            }
        });

        grunt.task.run('clean copy less handlebars rig min requirejs cleanup');
    });
};
