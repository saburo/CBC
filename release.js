var packager = require('electron-packager');
var config = require('./package.json');

var platform = 'darwin,win32';
if (process.argv.length > 2) {
  var tmp = process.argv[2].toLowerCase();
  if (tmp === 'mac' || tmp === 'osx' || tmp === 'darwin') {
    platform = 'darwin';
  } else {
    platform = 'win32';
  }
}

packager({
    dir: './',
    out: '../dist',
    name: config.name,
    // platform: 'darwin,win32',
    platform: platform,
    arch: 'x64',
    version: '1.6.0',
    // version: '0.34.1',
    // version: '0.30.0',
    icon: './resources/icon', // app icon

    'app-bundle-id': 'edu.wisc.geology.wiscsims', // your domain

    'app-version': config.version,
    'helper-bundle-id': 'edu.wisc.geology.wiscsims', // your domain
    overwrite: true,
    asar: true,
    prune: true,
    ignore: "node_modules/(electron|electron-packager|electron-prebuilt|\.bin)|release\.js|\.DS_Store",
    'version-string': {
        CompanyName: 'WiscSIMS',
        FileDescription: 'Cycle by cycle plot for Stable Isotope MonkeyS',
        OriginalFilename: config.name,
        FileVersion: config.version,
        ProductVersion: config.version,
        ProductName: config.name,
        InternalName: config.name
    }
}, function done (err, appPath) {
    if(err) {
        throw new Error(err);
    }
    console.log('Done!!');
});
