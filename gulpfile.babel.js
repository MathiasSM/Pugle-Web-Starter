'use strict'; // Fail fast and fail loudly

// =============================================================================
// IMPORTS: Gulp, filesystem-related, utils, gulp plugins.
// =============================================================================
import gulp from 'gulp';                         // Gulp (This is a Gulpfile!)

import fs from 'fs';                             // Filesystem utilities
import del from 'del';                           // Delete File with globbing
import path from 'path';                         // Path-related tools
import glob from 'glob';                         // Globbing
import replace from 'replace';                   // Search-and-replace on files

import runSequence from 'run-sequence';          // Run sequences of tasks
import browserSync from 'browser-sync';          // Sync browsers in development
import workboxBuild from 'workbox-build';        // Service-Worker tools
import {output as pagespeed} from 'psi';         // Pagespeed Insights

import gulpLoadPlugins from 'gulp-load-plugins'; // Easy loading of plugins
const $ = gulpLoadPlugins();   

var production = true;  // Enable favicon generation (requires internet)          
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
  let responsiveConfig = require('./app/config/responsive.config.js');
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
    'app/scripts/main.js'                   // Google's Service-Worker tool
    // Your JS files here
  ],{nodir: true })
  .pipe($.newer('.tmp/scripts'))      // PIPE: Turn on 'scripts' cache
  .pipe($.sourcemaps.init())          // PIPE: Initialize sourcemap
    .pipe($.babel())                  // PIPE: Compile ES6 with Babel
    .pipe($.sourcemaps.write())       // PIPE: Write current sourcemap
    .pipe(gulp.dest('.tmp/scripts'))  // PIPE: Copy to cache
    .pipe($.concat('main.min.js'))    // PIPE: Concat all to single file
    .pipe($.uglify({                  // PIPE: Minify JS file
      output:{comments:false}}))
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
  let htmlminConfig = require('./app/config/htmlmin.config.js');
  let favicons = production ? fs.readFileSync('./.tmp/favicon.html') : "";
  return gulp.src([               // SRC: Every Pug file not in root or templates
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
  .pipe($.insert                  // PIPE: Insert favicon-related meta tags
    .transform((contents, file) =>
      contents.replace(
        /<\/head>/,
        favicons+"</head>")
  ))
  .pipe($.save('html'))           // PIPE: Save Pipe for later use
    .pipe($.sitemap({               // PIPE: Generate sitemap
      siteUrl: 'https://example.com',
      lastmod: (file) => new Date(file.stat.mtime)
    }))   
    .pipe(gulp.dest('./dist'))      // PIPE: Save sitemap to 'dist'
  .pipe($.save.restore('html'))     // PIPE: Restore old Pipe
  .pipe($.htmlmin(htmlminConfig)) // PIPE: Minify HTML
  .pipe($.size({                  // PIPE: Report size for each file
    title: 'html', 
    showFiles: true}))
  .pipe(gulp.dest('dist'))        // PIPE: Write files to 'dist'
});


// =============================================================================
// TASK: favicon
// DESC: Generates favicons.
// =============================================================================
gulp.task('favicon', () => {
  let config =  require('./app/config/favicon.config.js');
  return gulp.src("app/favicon.png")          // SRC: Source favicon image
  .pipe($.favicons(config))                   // PIPE: Generate Favicons
  .pipe(gulp.dest("dist"))                    // PIPE: Save to 'dist'
  .pipe($.imagemin({                          // PIPE: Optimize all images
    progressive: true,
    interlaced: true
  }))
  .pipe($.size({title: 'favicons'}))          // PIPE: Report file size
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
gulp.task('serve', ['build:dev'], () => {
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
// TASK: generate-sw 
// DESC: Generate a service worker file that will provide offline functionality 
//        for local resources. 
// INFO: See `html5rocks.com/en/tutorials/service-worker/introduction/` for
//        an in-depth explanation of what service workers are and why use them.
// =============================================================================
gulp.task('generate-sw', () => {
  return workboxBuild.generateSW({
    cacheId: 'puggle-web-starter',
    swDest: 'dist/sw.js',
    globDirectory: 'dist',
    // Add/remove glob patterns to match your directory setup.
    globPatterns: [
      'images/**/*',
      'scripts/**/*.js',
      'styles/**/*.css',
      '**.{html,json}'
    ],
    modifyUrlPrefix: {
      'dist/': ''
    }
  })
  .then(() => {
    return gulp.src('dist/sw.js')
    .pipe($.babel())
    .pipe($.uglify({output:{comments:false}}))
    .pipe(gulp.dest('dist'))
  })
});


// =============================================================================
// TASK: build :dev :prod
// DESC: Build site (dev version has no SW)
// =============================================================================
gulp.task('build:prod', ['clean'], cb => {
  production = true;
  return runSequence(
    ['styles'],
    ['favicon','lint', 'scripts', 'images', 'copy'],
    'html',
    'generate-sw',
    cb
  );
});


gulp.task('build:dev', ['clean'], cb => {
  production = false;
  return runSequence(
    'styles',
    ['lint', 'html', 'scripts', 'images', 'copy'],
    // In development, loading the SW might cause caching headaches
    cb
  );
});


// =============================================================================
// TASK: default
// DESC: Run `gulp` for building production site.
// =============================================================================
gulp.task('default', ['build:prod']);


// =============================================================================
// =============================================================================
// You can also load custom tasks from a `tasks` directory by:
// 1. Run: `npm install --save-dev require-dir` from the command-line
// 2. Uncomment the next line:
// try { require('require-dir')('tasks'); } catch (err) { console.error(err); }
