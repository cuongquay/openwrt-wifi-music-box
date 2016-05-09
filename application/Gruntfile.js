module.exports = function (grunt) {
  'use strict';

  var globalConfig = {
    src: 'public',
    dest: 'www',
    brand: 'default'
  };

  globalConfig.brand = grunt.option('target');

  grunt.initConfig({
    globalConfig: globalConfig,
    pkg: grunt.file.readJSON('package.json'),
    banner: '/*!\n' + ' * Showcase Platform v<%= pkg.version %> (<%= pkg.homepage %>)\n' + ' * Copyright 2016-<%= grunt.template.today("yyyy") %> <%= pkg.author %>\n' + ' */\n',
    jqueryCheck: 'if (typeof jQuery === \'undefined\') { throw new Error(\'Bootstrap\\\'s JavaScript requires jQuery\') }\n\n',
    clean: ['dist/*'],
    copy: {
      main: {
        files: [
          // includes files within path - asset files
          {
            expand: true,
            cwd: 'src/',
            src: ['**/*.json', '**/*.html', '**/*.min.css', 'images/**/*', 'sound/**/*', 'fonts/**/*', 'css/default/images/*'],
            dest: 'www/'
          },
          // js files that don't need minified
          {
            expand: true,
            cwd: 'src/',
            src: ['vendor/**/*.min.js', 'app/app.js'],
            dest: '<%= globalConfig.dest %>/'
          }
        ],
      },
    },
    'jshint': {
      files: ['Gruntfile.js', '<%= globalConfig.src %>/app/app.js', '<%= globalConfig.src %>/vendor/smartwidgets', '<%= globalConfig.src %>/vendor/langs', '<%= globalConfig.src %>/vendor/speech'],
      options: {
        globals: {
          jQuery: true,
          console: true,
          module: true,
          document: true
        }
      }
    },
    'uglify': {
      options: {
        mangle: false,
        banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' + '<%= grunt.template.today("yyyy-mm-dd") %> */'
      },
      build: {
        files: [{
          expand: true,
          src: ['!node_modules/**/*', '!Gruntfile.js', '**/*.js', '!**/*.min.js', '!**/app.js'],
          dest: '<%= globalConfig.dest %>/',
          cwd: '<%= globalConfig.src %>/',
          extDot: 'last',
          ext: '.min.js'
        }]
      }
    },
    'less': {
      development: {
        options: {
          banner: '<%= banner %>'
        },
        files: {
          "<%= globalConfig.dest %>/css/<%= globalConfig.brand %>/font-awesome.css_": "<%= globalConfig.src %>/../assets/less/library/fontawesome/font-awesome.less",
          "<%= globalConfig.dest %>/css/<%= globalConfig.brand %>/bootstrap.css_": "<%= globalConfig.src %>/../assets/less/<%= globalConfig.brand %>/bootstrap.less",
          "<%= globalConfig.dest %>/css/<%= globalConfig.brand %>/error-pages.css_": "<%= globalConfig.src %>/../assets/less/<%= globalConfig.brand %>/error-pages.less",
          "<%= globalConfig.dest %>/css/<%= globalConfig.brand %>/main.css_": "<%= globalConfig.src %>/../assets/less/<%= globalConfig.brand %>/main.less"
        }
      }
    },
    'cssmin': {
      minify: {
        expand: true,
        src: ['*.css_', '!*.min.css'],
        dest: '<%= globalConfig.dest %>/css/<%= globalConfig.brand %>/',
        cwd: '<%= globalConfig.dest %>/css/<%= globalConfig.brand %>/',
        extDot: 'last',
        ext: '.min.css'
      }
    },
    watch: {
      files: ['**/app/**/*.js', '**/vendor/**/*.js', '**/vendor/**/**/*.js'],
      tasks: ["uglify"],
      options: {
        nospawn: true
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');

  grunt.registerTask('dist-test', ['jshint']);
  grunt.registerTask('default', ['uglify']);
  grunt.registerTask('dist-css', ['less', 'cssmin']);
  grunt.registerTask('dist-watch', ['watch']);
  grunt.registerTask('build', ['copy', 'uglify']);
  grunt.event.on('watch', function (action, filepath, target) {

    filepath = filepath.replace(globalConfig.src, "");
    console.log("Filepath", filepath);
    grunt.config(['uglify', 'build', 'files', '0', 'src'], '**/' + filepath);

    grunt.task.run("uglify");
  });
};