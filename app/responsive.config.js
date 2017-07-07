// Configuration file for 'gulp-responsive' use in `gulpfile.babel.js`
module.exports = [
  // [0]: Configs for different glob patterns
  {            
    '**/*.{jpeg,jpg,png,webp}': [  // PATTERN: Every PNG, JPG and WEBP
      { width:30,                         // SIZE: Blur. Fast blurred images.
        rename: {suffix:'-blur'}},
      { width:350,                        // SIZE: Tiny.
        rename: {suffix:'-350px'}},
      { width:350,                        // SIZE: TinySquared. Small Thumbs
        height:350, 
        rename: {suffix:'-350px-thumb'},  
        crop:"centre" },
      { width:700,                        // SIZE: Small. Small Phone
        rename: {suffix:'-700px'}},
      { width:700,                        
        rename: {suffix:'-700px',  extname: '.webp'}},
      { width:1400,                       // SIZE: Medium. Big Phone/Small laptop
        rename: {suffix:'-1400px'}},
      { width:1400,                       
        rename: {suffix:'-1400px', extname: '.webp'}},
      { width:2800,                       // SIZE: Large. Retina small
        rename: {suffix:'-2800'}},
      { width:2800,                       
        rename: {suffix:'-2800px', extname: '.webp'}},
      { width:5600,                       // SIZE: XLarge. Retina large
        rename: {suffix:'-5600px'}},
      { width:5600,                       
        rename: {suffix:'-5600px', extname: '.webp'}},
      {                                   // SIZE: Original. 
        rename: {suffix: '-original'} 
      }
    ]
  },
  // [1]: Global Configs for gulp-responsive
  {
    silent:             true,   // Silent per-image output? 
    stats:              false,  // Print summary of everything processed?
    withMetadata:       false,  // Include metadata? 
    errorOnEnlargement: false,  // Stop on image too small for given sizes?
    withoutEnlargement: true,   // Prevent enlarging images to fit sizes?
    errorOnUnusedImage: false,  // Stop on image not grabbed by glob (like svg)?
    passThroughUnused:  true    // Pass unused images through the pipe?
  }
]