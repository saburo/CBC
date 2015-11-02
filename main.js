"use strict";

var app = require('app');  // Module to control application life.
var BrowserWindow = require('browser-window');  // Module to create native browser window.
var ipc = require('ipc');
var dialog = require('dialog');
var fs = require('fs');

var defaultWindowSize = {
    width: 980,
    height: 680
}

global.defaultWindowSize = defaultWindowSize;
global.saveProgress = 0;

// Report crashes to our server.
require('crash-reporter').start();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var mainWindow = null;

// Quit when all windows are closed.
app.on('window-all-closed', function() {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    // if (process.platform != 'darwin') {
        app.quit();
    // }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        'use-content-size': true,
        width: defaultWindowSize.width,
        height: defaultWindowSize.height,
        'min-width': defaultWindowSize.width, 
        'min-height': defaultWindowSize.height
    });

    // and load the index.html of the app.
    mainWindow.loadUrl('file://' + __dirname + '/index.html');

    // Open the DevTools.
    // mainWindow.openDevTools();

    // Emitted when the window is closed.
    mainWindow.on('closed', function() {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });

});

var printPDF_args = {};

ipc.on('getPrintPDFArgs', function(e, arg) {
    e.sender.send('async-reply-getPrintPDFArgs', printPDF_args);
});

var printWin;
var savePDFEvent;


ipc.on('saveAsPDF', function(e, arg) {
    // create invisible window for printing
    savePDFEvent = e,
    printPDF_args = arg;
    printWin = new BrowserWindow({
        width: 100,
        height: 100,
        show: false
    });
    printWin.on('closed', function() {
        printWin = null;
    });
    printWin.loadUrl('file://' + __dirname + '/print.html');
    // printWin.openDevTools();
});

ipc.on('current-rendering', function(e, arg) {
    global.saveProgress = arg.val;
});

ipc.on('rendering-done', function(e, arg) {
    global.saveProgress = 90;
    printWin.webContents.printToPDF({
        pageSize: arg.paperSize,
        landscape: arg.orientation === 'landscape',
        printBackgrounds: true,
        marginsType: 1
    }, function(err, data) {
        global.saveProgress = 99;
        fs.writeFile(printPDF_args.destPath, data, function(err) {
            if(err) alert('genearte pdf error', err)
            savePDFEvent.sender.send('async-reply-print-done', true);
            printWin.close();
        });
    });
});
