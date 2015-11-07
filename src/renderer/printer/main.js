var fs = require('fs'),
    path = require('path'),
    remote = require('remote'),
    ipc = require('ipc'),
    d3 = require('d3'),
    ps = require('../plotter/common/asc_parser'),
    pt = require('../plotter/common/plot');


var myPath = '';

// letter size (landscape)
// pt.width = 72 * 11 * 1.22;
// pt.height =  pt.width * 0.7727272;

// pt.height = 72 * 11 * 1.22;
// pt.width =  pt.height * 0.7727272;

// console.log('w, h: ', pt.width, ', ', pt.height);

// A4 (landscape)
// pt.width = 841.89;
// pt.height = 595.28;

ipc.send('getPrintPDFArgs', 'test');
ipc.on('async-reply-getPrintPDFArgs', function(args) {
    myPath = args.dir;
    var fileName = '',
        i = 0,
        p = '',
        lastFname = args.Files[args.Files.length-1].name;

    var adjust = 1.22,
        dpi = 72,
        sizeL = 0,
        sizeS = 0;

    if (args.paperSize === 'A4') {
        sizeL = 11.7, sizeS = 8.3; // in inches
    } else if (args.paperSize === 'Letter') {
        sizeL = 11, sizeS = 8.5; // in inches
    }

    if (args.orientation === 'portrait') {
        pt.width = dpi * sizeS * adjust;
        pt.height = dpi * sizeL * adjust; 
    } else if (args.orientation === 'landscape') {
        pt.width = dpi * sizeL * adjust;
        pt.height = dpi * sizeS * adjust; 
    }

    var myList = {};
    var total = args.Files.length;
    for (i in args.Files) {
        myList[args.Files[i].name] = args.Files[i];
        ipc.send('current-rendering', {val: Math.round(80 *(i/1 + 1) / total) });

        fs.readFile(path.join(myPath, args.Files[i].name), 'utf8', function(err, data) {
            if (err) throw err;
            var p = ps.parseAsc(data);
            var o = myList[p.ascName];
            pt.excelComment = o.comment;
            pt.ascFileName = p.ascName;
            // add plot
            // var margin = {
            //     top: 60,
            //     right: 20,
            //     bottom: 35, 
            //     left: 70
            // };
            var svg = d3.select('#print_area').append('svg').classed('sep_pages', true);
            pt.makePlot(svg, p, args.plotOptions);
            if (lastFname == p.ascName) ipc.send('rendering-done', args);
        });
    }
});


// var checkLastFile = function(all, current) {
//  // check Files
//  return false;
// }

// var mergePDFs = function(files) {
//  // merge files
// }

// var printPDF = function(filename) {
//  var currentWindow = remote.getCurrentWindow();
//  var wc = currentWindow.webContents
//  wc.printToPDF({
//      marginsType: 0, // 0 - default, 1 - none, 2 - minimum
//      pageSize: 'letter', // A4, A3, Legal, Letter, Tabloid
//      landscape: false,
//      printBackground: true, // Boolean
//      printSelectionOnly: false, // Boolean
//  }, function(err, data) {
//      fs.writeFile(filename, data, function(err) {
//          if(err) alert('genearte pdf error', err);
//      });
//  });
// };
