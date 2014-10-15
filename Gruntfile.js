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
            all: { src: ['test/**/*.js'] },
            coverage: { src: ['coverage/instrument/test/**/*.js' ] }
        },

        jshint: {
            all: [ 'Gruntfile.js', '*.js', 'lib/**/*.js']
        },

        jsdoc2md: {
            indexed: {
                options: {
                    index: true
                },
                src: ['amqp_client.js', 'lib/**/*.js'],
                dest: 'api/README.md'
            }
        },

        env: {
            coverage: {
                DIR_FOR_CODE_COVERAGE: '../coverage/instrument/'
            }
        },
        clean: {
            coverage: {
                src: [ 'coverage/instrument' ]
            }
        },
        instrument: {
            files: ['amqp_client.js', 'lib/**/*.js', 'test/**/*.js' ],
            options: {
                lazy: true,
                basePath: 'coverage/instrument/'
            }
        },
        storeCoverage: {
            options: {
                dir: 'coverage/reports'
            }
        },
        makeReport: {
            src: 'coverage/reports/**/*.json',
            options: {
                type: 'html',
                dir: 'coverage/reports',
                print: 'detail'
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-simple-mocha');
    grunt.loadNpmTasks("grunt-jsdoc-to-markdown");
    grunt.loadNpmTasks('grunt-istanbul');

    grunt.registerTask('coverage', ['instrument', 'simplemocha:coverage', 'storeCoverage', 'makeReport']);
    grunt.registerTask('test', ['simplemocha:all']);

    grunt.registerTask('default', ['jshint', 'jsdoc2md', 'coverage']);
};
