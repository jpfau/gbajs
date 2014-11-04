module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-concurrent');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-sync');
    grunt.loadNpmTasks('grunt-typescript');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-open');

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concurrent: {
            all: {
                tasks: ['concurrent:watch', 'concurrent:serve'],
                options: {
                    logConcurrentOutput: true
                }
            },
            watch: {
                tasks: ['watch', 'typescript:watch'],
                options: {
                    logConcurrentOutput: true
                }
            },
            serve: {
                tasks: ['connect'],
                options: {
                    logConcurrentOutput: true
                }
            }
        },
        watch: {
            options: { livereload: true },
            files: 'lib/**',
            tasks: ['sync']
        },
        sync: {
            main: {
                files: [
                    {
                        cwd: 'lib',
                        src: ['**'],
                        dest: 'out'
                    }
                ],
                verbose: true
            }
        },
        typescript: {
            options: {
                basePath: 'out',
                module: 'amd',
                target: 'es5',
                sourceMap: true,
                declaration: false,
                comments: true,
                noImplicitAny: true
            },
            base: {
                src: ['out/build.d.ts'],
                dest: 'out'
            },
            watch: {
                src: ['out/build.d.ts'],
                dest: 'out',
                options: {
                    watch: true
                }
            }
        },
        connect: {
            server: {
                options: {
//                    livereload: true,
                    port: 8080,
                    base: 'out',
                    keepalive: true
                }
            }
        },
        open: {
            dev: {
                path: 'http://localhost:8080/debugger.html'
            }
        }
    });

    grunt.registerTask('build', ['sync', 'typescript:base']);
    grunt.registerTask('default', ['build', 'concurrent:all']);
    grunt.registerTask('browse', ['open']);

};
