module.exports = function(grunt) {

    var distFolder      = "./dist",
        srcFolder       = ".";

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        requirejs : {
            compile : {
                options : {
                    mainConfigFile  : srcFolder + '/main.js',
                    name            : "main",
                    out             : distFolder + "/main.js"
                }
            }
        },
        clean: [distFolder]
    });

    // Uncomment to prevent code minification
    // grunt.config("requirejs.compile.options.optimize", "none");

    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-contrib-clean');


    grunt.registerTask('default', ['clean', 'requirejs']);
};