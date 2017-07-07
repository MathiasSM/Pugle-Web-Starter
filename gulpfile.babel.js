'use strict'; // Fail fast and fail loudly

// =============================================================================
// IMPORTS: Gulp, filesystem-related, utils, gulp plugins.
// =============================================================================
import gulp from 'gulp';                         // Gulp (This is a Gulpfile!)

import fs from 'fs';                             // Filesystem utilities
import del from 'del';                           // Delete File with globbing
import path from 'path';                         // Path-related tools

import runSequence from 'run-sequence';          // Run sequences of tasks
import browserSync from 'browser-sync';          // Sync browsers in development
import swPrecache from 'sw-precache';            // Service-Worker precaching
import {output as pagespeed} from 'psi';         // Pagespeed Insights

import gulpLoadPlugins from 'gulp-load-plugins'; // Easy loading of plugins
const $ = gulpLoadPlugins();               
// =============================================================================



// =============================================================================
// TASK: lint
// DESC: Lint JavaScript files
// =============================================================================
gulp.task('lint', () =>
  gulp.src([                // SRC: Every *.js in 'scripts'; don't lint modules
    'app/scripts/**/*.js',
    '!node_modules/**'     
  ],{nodir: true })
  .pipe($.eslint())         // PIPE: Lints JS files
  .pipe($.eslint.format())  // PIPE: Outputs lint results to console
  .pipe($.if(               // PIPE: Exit with error if building for Prodcution
    !browserSync.active, 
    $.eslint.failAfterError()
  ))
);


// =============================================================================
// TASK: images
// DESC: Resize and optimize images
// =============================================================================
gulp.task('images', () => {
  let responsiveConfig = require('./app/responsive.config.js');
  gulp.src([                        // SRC: Everything in 'images'
    'app/images/**',
  ],{nodir: true })
  .pipe($.cached('images'))         // PIPE: Keeps cache for lazy reloading
  .pipe($.if(                       // PIPE: Makes resized and webp versions
    (filename) => ((filename+"").indexOf("-noresize")==-1),
    $.responsive(responsiveConfig[0],responsiveConfig[1])))
  .pipe($.imagemin({                // PIPE: Optimize all images
    progressive: true,
    interlaced: true
  }))
  .pipe(gulp.dest('dist/images'))   // PIPE: Copy files over to 'dist' folder.
  .pipe($.size({title: 'images'})); // PIPE: Report total size of files.
});


// =============================================================================
// TASK: copy
// DESC: Copy not-to-be-processed files from /root
// =============================================================================
gulp.task('copy', () =>
  gulp.src([                                      // SRC: Everything in 'root'
    'app/root/**/*'
  ], {dot: true, nodir: true })
  .pipe(gulp.dest('dist'))                        // PIPE: Copy unprocessed
  .pipe($.size({title: 'copy', showFiles: true})) // PIPE: Report size for each
);


// =============================================================================
// TASK: styles
// DESC: Compile (SASS), autoprefix and minify stylesheets
// =============================================================================
gulp.task('styles', () =>
  gulp.src([                        // SRC: Every SCSS/CSS file (no imports)
    'app/styles/**/[^_]*.scss',
    'app/styles/**/*.css',
    '!app/styles/**/_*.scss'
  ],{nodir: true })
  .pipe($.newer('.tmp/styles'))             // PIPE: Turn on 'styles' cache
  .pipe($.sourcemaps.init())                // PIPE: Initialize sourcemap
    .pipe($.sass({precision: 10})           // PIPE: Compile SASS files
      .on('error', $.sass.logError))
    .pipe($.if('*.css', $.autoprefixer()))  // PIPE: Prefix all generated CSS
    .pipe(gulp.dest('.tmp/styles'))         // PIPE: Write to cache on disk
    .pipe($.if('*.css', $.cssnano()))       // PIPE: Minify all CSS
    .pipe($.size({title: 'styles'}))        // PIPE: Report minified size
  .pipe($.sourcemaps.write('./'))           // PIPE: Write sourcemap
  .pipe(gulp.dest('dist/styles'))           // PIPE: Write files to 'dist'
  .pipe(gulp.dest('.tmp/styles'))           // PIPE: Write files to cache
);


// =============================================================================
// TASK: scripts
// DESC: Concatenate and minify JS scripts
// =============================================================================
gulp.task('scripts', () =>
  gulp.src([                          // SRC: Every client-side JS (must edit!)            
    './app/scripts/main.js'                   // Google's Service-Worker tool
    // Your JS files here
  ],{nodir: true })
  .pipe($.newer('.tmp/scripts'))      // PIPE: Turn on 'scripts' cache
  .pipe($.sourcemaps.init())          // PIPE: Initialize sourcemap
    .pipe($.babel())                  // PIPE: Compile ES6 with Babel
    .pipe($.sourcemaps.write())       // PIPE: Write current sourcemap
    .pipe(gulp.dest('.tmp/scripts'))  // PIPE: Copy to cache
    .pipe($.concat('main.min.js'))    // PIPE: Concat all to single file
    .pipe($.uglify(                   // PIPE: Minify single file
      {preserveComments: 'some'}))
    .pipe($.size({title: 'scripts'})) // PIPE: Report file size
  .pipe($.sourcemaps.write('.'))      // PIPE: Write new sourcemap
  .pipe(gulp.dest('dist/scripts'))    // PIPE: Write to 'dist'
  .pipe(gulp.dest('.tmp/scripts'))    // PIPE: Write to cache
);


// =============================================================================
// TASK: html
// DESC: Compile Pug->HTML, scan for assets to concatenate and minify html.
// =============================================================================
gulp.task('html', () => {
  let siteinfo = require('./app/siteinfo.json');
  let htmlminConfig = require('./app/htmlmin.config.js');
  gulp.src([                    // SRC: Every Pug file not in root or templates
    'app/**/*.pug',             
    '!app/root/**',
    '!app/templates/**'
  ], {nodir: true })
  .pipe($.tap((file,t) => {       // PIPE: Tap Pug files, to get filename...
      let fne = path.resolve(             // ...with no extension...
        path.dirname(file.path),
        path.basename(file.path, ".pug"));
      let f = "."                         // ...to get .json, relative to cmd
        + path.sep
        + path.relative(".",fne + ".json");
      const thisFile = require(f);        // Load the json data for the page
      t.through($.pug, [{                 // PIPE: through pug plugin wiht opts:
        basename: "app",                      // - Root for extending templates
        doctype: "html",                      // - Set doctype... Handy?
        locals: {                             // - Globals
          siteinfo: siteinfo,                   // - Set siteinfo to global info
          page: thisFile                        // - Set page to its json info
        }
      }])
    }
  ))
  .pipe($.rename({                // PIPE: Rename files 
    extname: ".html"
  }))
  .pipe($.useref({                // PIPE: Scan files for concatenable assets
    searchPath: '{.tmp,app}',
    noAssets: true
  }))
  .pipe($.htmlmin(htmlminConfig)) // PIPE: Minify HTML
  .pipe($.size({                  // PIPE: Report size for each file
    title: 'html', 
    showFiles: true}))
  .pipe(gulp.dest('dist'))        // PIPE: Write files to 'dist'
});


// =============================================================================
// TASK: clean
// DESC: Clean output directory and cache
// =============================================================================
gulp.task('clean', () => del(['.tmp', 'dist/*', '!dist/.git'], {dot: true}));


// =============================================================================
// TASK: serve
// DESC: Run server and reload on file changes
// =============================================================================
gulp.task('serve', ['development'], () => {
  browserSync({                  // BROWSERSYNC: Serve files, sync browsers
    notify: false,                    // Pop-up to let user know?
    logPrefix: 'BrowserSync',         // Console-logging prefix
    scrollElementMapping: ['main'],   // Sync scrollTop of specified elements
    https: true,                      // Enable https? (selfsigned certificates)
    server: ['.tmp', 'dist'],         // What to serve?
    port: 3000                        // In which port?
  });

  gulp.watch(['app/**/*.{pug,json}'],         // 1. On any Pug or JSON change...
    ['html',browserSync.reload]);             // ... Reload its HTML
  gulp.watch(['app/styles/**/*.{scss,css}'],  // 2. On any styles change...
    ['styles', browserSync.reload]);          // ... Reload styles 
  gulp.watch(['app/scripts/**/*.js'],         // 3. On any scripts
    ['lint', 'scripts', browserSync.reload]); // ... Lint and Reload scripts
  gulp.watch(['app/images/**'],               // 4. On any images change
    ['images',browserSync.reload]);           // ... Reprocess image
  gulp.watch(['app/root/**'],                 // 5. On any 'root' file change
    ['copy',browserSync.reload]);             // Copy it over again
                                              //
                                              // Tip: Comment-out (5) for easier
                                              // reloading (processing files is
                                              // usually tedious and heavy) 
});


// =============================================================================
// TASK: production
// DESC: Build production site
// =============================================================================
gulp.task('production', ['clean'], cb =>
  runSequence(
    'styles',
    ['lint', 'html', 'scripts', 'images', 'copy'],
    'generate-service-worker',
    cb
  )
);


// =============================================================================
// TASK: development
// DESC: Build development site (no sw)
// =============================================================================
gulp.task('development', ['clean'], cb =>
  runSequence(
    'styles',
    ['lint', 'html', 'scripts', 'images', 'copy'],
    // In development, loading the SW might cause caching headaches
    cb
  )
);


// =============================================================================
// TASK: pagespeed
// DESC: Get Page Speed Insights from Google
// =============================================================================
gulp.task('pagespeed', cb => {
  const website = "example.com"; // Update to the public URL of your site
  pagespeed(website, {
    strategy: 'mobile'
    // By default we use the PageSpeed Insights free (no API key) tier.
    // Use a Google Developer API key if you have one: http://goo.gl/RkN0vE
    // key: 'YOUR_API_KEY'
  }, cb);
});


// =============================================================================
// TASK: copy-sw-scripts
// DESC: Copy over the scripts that are used in importScripts 
//        as part of the `generate-service-worker` task.
// =============================================================================
gulp.task('copy-sw-scripts', () => {
  return gulp.src([                           // SRC: Module's and kit's tools.
    'node_modules/sw-toolbox/sw-toolbox.js',
    'app/scripts/sw/runtime-caching.js'
  ])
  .pipe(gulp.dest('dist/scripts/sw'));        // PIPE: Write SW script to 'dist'
});


// =============================================================================
// TASK: generate-service-worker
// DESC: Generate a service worker file that will provide offline functionality 
//        for local resources. 
// INFO: See `html5rocks.com/en/tutorials/service-worker/introduction/` for
//        an in-depth explanation of what service workers are and why use them.
// =============================================================================
gulp.task('generate-service-worker', ['copy-sw-scripts'], () => {
  const rootDir = 'dist';
  const filepath = path.join(rootDir, 'service-worker.js');
  const pkgName = require('./package.json').name;

  return swPrecache.write(filepath, {
    // Used to avoid cache conflicts when serving on localhost.
    cacheId: pkgName,
    // sw-toolbox.js needs to be listed first. It sets up methods used in runtime-caching.js.
    importScripts: [
      'scripts/sw/sw-toolbox.js',
      'scripts/sw/runtime-caching.js'
    ],
    staticFileGlobs: [
      // Add/remove glob patterns to match your directory setup.
      rootDir+"/images/**/*",
      rootDir+"/scripts/**/*.js",
      rootDir+"/styles/**/*.css",
      rootDir+"/**/*.{html,json}"
    ],
    // Translates a static file path to the relative URL that it's served from.
    // This is '/' rather than path.sep because the paths returned from
    // glob always use '/'.
    stripPrefix: rootDir + '/'
  });
});


// =============================================================================
// TASK: default
// DESC: Run `gulp` for building production site.
// =============================================================================
gulp.task('default', ['production']);


// =============================================================================
// =============================================================================
// You can also load custom tasks from a `tasks` directory by:
// 1. Run: `npm install --save-dev require-dir` from the command-line
// 2. Uncomment the next line:
// try { require('require-dir')('tasks'); } catch (err) { console.error(err); }
