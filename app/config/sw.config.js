let siteinfo = require('../siteinfo.json');
let rootDir = 'dist';
module.exports = {
  cacheId: siteinfo.name || 'puggle-web-starter',
  importScripts: [
    'scripts/sw/sw-toolbox.js',
    'scripts/sw/runtime-caching.js'
  ],
  staticFileGlobs: [
    // Add/remove glob patterns to match your directory setup.
    `${rootDir}/images/**.*`,
    `${rootDir}/scripts/**.js`,
    `${rootDir}/styles/**.css`,
    `${rootDir}/**.{html,json}`
  ],
  stripPrefix: rootDir + '/',
  handleFetch: handleFetch,
  verbose: true
}