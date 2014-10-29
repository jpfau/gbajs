module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-typescript');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-open');
 
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        connect: {
            server: {
                options: {
                    port: 8080,
                    base: 'out/'
                }
            }
        },
        copy: {
            main: {
                files: [
                    {expand: true, cwd: 'lib', src: ['**'], dest: 'out/'}
                ]
            }
        },
        typescript: {
            base: {
                src: ['lib/**/*.ts'],
                dest: 'out',
                options: {
                    basePath: 'lib',
                    module: 'amd',
                    target: 'es5',
                    sourceMap: true,
                    declaration: true,
                    comments: true,
                    noImplicitAny: true
                }
            }
        },
        watch: {
            files: 'lib/**/*.ts',
            tasks: ['typescript']
        },
        open: {
            dev: {
                path: 'http://localhost:8080/index.html'
            }
        }
    });
 
    grunt.registerTask('default', ['typescript', 'copy', 'connect', 'open', 'watch']);
 
};
