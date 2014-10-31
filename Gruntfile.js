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
                tasks: ['watch', 'typescript'],
                options: {
                    logConcurrentOutput: true
                }
            },
            serve: {
                tasks: ['connect', 'open'],
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
            base: {
                src: ['out/build.d.ts'],
                dest: 'out',
                options: {
                    watch: true,
                    basePath: 'out',
                    module: 'amd',
                    target: 'es5',
                    sourceMap: true,
                    declaration: true,
                    comments: true,
                    noImplicitAny: true
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
                path: 'http://localhost:8080/index.html'
            }
        }
    });

    grunt.registerTask('build', ['concurrent:watch']);
    grunt.registerTask('serve', ['concurrent:serve']);
    grunt.registerTask('default', ['concurrent:all']);

};
