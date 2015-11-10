var packager = require('electron-packager');
var config = require('./package.json');
 
packager({
    dir: './',
    out: '../dist',
    name: config.name,
    // platform: 'darwin,win32',
    platform: 'darwin,win32',
    arch: 'x64',
    version: '0.34.1',
    // version: '0.30.0',
    icon: './resources/icon', //<- アプリアイコン
 
    'app-bundle-id': 'edu.wisc.geology.wiscsims', //<- 自分のドメインなどを使用してください
 
    'app-version': config.version,
    'helper-bundle-id': 'edu.wisc.geology.wiscsims', //<- 自分のドメインなどを使用してください
    overwrite: true,
    asar: false,
    prune: false,
    ignore: "node_modules/(electron-packager|electron-prebuilt|\.bin)|release\.js|\.DS_Store",
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
