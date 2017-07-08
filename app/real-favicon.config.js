// Configuration file for 'gulp-real-favicon' use in `gulpfile.babel.js`

// To disable the use of gulp-real-favicon, turn the boolean off in the gulpfile.

const siteinfo = require('./siteinfo.json');            // Siteinfo is loaded
const appName = siteinfo.name || "My Site";             // App name (usually site's name)
const appUrl = siteinfo.url || "https://example.com";   // URL (for bookmarking)
const appColor = siteinfo.color;
const appColorFore = "#247cbf";  // Main foreground color
const appColorBack = "#ffffff";  // Main background / secondary color
if(appColor){
  const appColorFore = appColorFore || "#247cbf";  // Main foreground color
  const appColorBack = appColorBack || "#ffffff";  // Main background / secondary color
}
const appFavVersion = "e4fDD2So21"; // Change to random string whenever you change favicon


module.exports = {
  masterPicture: 'app/favicon.png',
  dest: 'dist',
  iconsPath: '/',
  design: {
    ios: {
      pictureAspect: 'backgroundAndMargin',
      backgroundColor: appColorBack,
      margin: '35%',
      assets: {
        ios6AndPriorIcons: false,
        ios7AndLaterIcons: false,
        precomposedIcons: false,
        declareOnlyDefaultIcon: true
      },
      appName: appName
    },
    desktopBrowser: {},
    windows: {
      pictureAspect: 'whiteSilhouette',
      backgroundColor: appColorFore,
      onConflict: 'override',
      assets: {
        windows80Ie10Tile: true,
        windows10Ie11EdgeTiles: {
          small: false,
          medium: true,
          big: false,
          rectangle: false
        }
      },
      appName: appName
    },
    androidChrome: {
      pictureAspect: 'shadow',
      themeColor: appColorBack,
      manifest: {
        name: appName,
        startUrl: appUrl,
        display: 'standalone',
        orientation: 'notSet',
        onConflict: 'override',
        declared: true
      },
      assets: {
        legacyIcon: false,
        lowResolutionIcons: false
      }
    },
    safariPinnedTab: {
      pictureAspect: 'blackAndWhite',
      threshold: 71.09375,
      themeColor: appColorFore
    }
  },
  settings: {
    scalingAlgorithm: 'Lanczos',
    errorOnImageTooSmall: false
  },
  versioning: {
    paramName: 'v',
    paramValue: appFavVersion
  },
  markupFile: 'dist/favicon.json'
};