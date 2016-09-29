"use strict";

var app = require('electron').app;  // Module to control application life.
var BrowserWindow = require('electron').BrowserWindow;  // Module to create native browser window.
var ipcMain = require('electron').ipcMain;
var dialog = require('electron');
const {crashReporter} = require('electron');
var fs = require('fs');

var defaultWindowSize = {
    width: 980,
    height: 680
};





global.defaultWindowSize = defaultWindowSize;
global.saveProgress = 0;

// Report crashes to our server.
// crashReporter.start({});

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var plotterWindow = null;

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
    // require('../renderer/plotter/menu');
    // Create the browser window.
    plotterWindow = new BrowserWindow({
        'use-content-size': true,
        width: defaultWindowSize.width,
        height: defaultWindowSize.height,
        'min-width': defaultWindowSize.width,
        'min-height': defaultWindowSize.height,
        'web-preferences': {
            'overlay-scrollbars': true
        }
    });

    // and load the index.html of the app.
    plotterWindow.loadURL('file://' + __dirname + '/../renderer/plotter/plotter.html');

    // Open the DevTools.
    // plotterWindow.openDevTools();

    // Emitted when the window is closed.
    plotterWindow.on('closed', function() {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        plotterWindow = null;
    });

    plotterWindow.on('resize', function() {
        plotterWindow.webContents.send('window-resized', plotterWindow.getContentSize());
    });

  //  plotterWindow.setProgressBar(0.5);

});

var printPDF_args = {};

ipcMain.on('getPrintPDFArgs', function(e, arg) {
    e.sender.send('async-reply-getPrintPDFArgs', printPDF_args);
});

var printWin;
var savePDFEvent;

ipcMain.on('saveAsPDF', function(e, arg) {
    // create invisible window for printing
    savePDFEvent = e;
    printPDF_args = arg;
    printWin = new BrowserWindow({
        width: 100,
        height: 100,
        show: true
    });
    printWin.on('closed', function() {
        printWin = null;
    });
    printWin.loadURL('file://' + __dirname + '/../renderer/printer/print.html');
    // printWin.openDevTools();
});

ipcMain.on('current-rendering', function(event, arg) {
    global.saveProgress = arg.val;
});

ipcMain.on('rendering-done', function(event, arg) {
    global.saveProgress = 90;
    printWin.webContents.printToPDF({
        pageSize: arg.paperSize,
        landscape: arg.orientation === 'landscape',
        printBackgrounds: true,
        marginsType: 1
    }, function(err, data) {
        global.saveProgress = 99;
        fs.writeFile(printPDF_args.destPath, data, function(err) {
            if(err) alert('genearte pdf error', err);
            savePDFEvent.sender.send('async-reply-print-done', true);
            // printWin.close();
        });
    });
});

ipcMain.on('getContentSize', function(event, args) {
    event.returnValue = plotterWindow.getContentSize();
});
