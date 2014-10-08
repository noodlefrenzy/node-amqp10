module.exports = function(grunt) {
    grunt.initConfig({
        simplemocha: {
            options: {
              globals: ['should'],
              timeout: 3000,
              ignoreLeaks: false,
              ui: 'bdd',
              reporter: 'list'
            },
            all: { src: ['test/**/*.js'] }
        },

        jshint: {
            all: [ 'Gruntfile.js', '*.js', 'lib/**/*.js']
        },

        jsdoc: {
            all: {
                src: ['*.js', 'lib/**/*.js', 'test/**/*.js'],
                dest: 'doc'
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-simple-mocha');
    grunt.loadNpmTasks('grunt-jsdoc');

    grunt.registerTask('test', ['simplemocha']);

    grunt.registerTask('default', ['jshint', 'test', 'jsdoc']);
};
