var fs = require('fs'),
	path = require('path'),
	remote = require('remote'),
	ipc = require('ipc'),
	d3 = require('d3'),
	ps = require('./asc_parser.js'),
	pt = require('./plot.js');


var myPath = '';

// letter size (landscape)
pt.width = 72 * 11;
pt.height =  72 * 8.5;

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

	var myList = {};
	for (i in args.Files) {
		myList[args.Files[i].name] = args.Files[i];

		fs.readFile(path.join(myPath, args.Files[i].name), 'utf8', function(err, data) {
			if (err) throw err;
			var p = ps.parseAsc(data);
			var o = myList[p.ascName];
			pt.excelComment = o.comment;
			pt.ascFileName = p.ascName;
			// add plot
			pt.makePlot(d3.select('#print_area').append('svg').classed('sep_pages', true), p);
			if (lastFname == p.ascName) ipc.send('rendering-done', '');
		});
	}
});


// var checkLastFile = function(all, current) {
// 	// check Files
// 	return false;
// }

// var mergePDFs = function(files) {
// 	// merge files
// }

// var printPDF = function(filename) {
// 	var currentWindow = remote.getCurrentWindow();
// 	var wc = currentWindow.webContents
// 	wc.printToPDF({
// 		marginsType: 0, // 0 - default, 1 - none, 2 - minimum
// 		pageSize: 'letter', // A4, A3, Legal, Letter, Tabloid
// 		landscape: false,
// 		printBackground: true, // Boolean
// 		printSelectionOnly: false, // Boolean
// 	}, function(err, data) {
// 		fs.writeFile(filename, data, function(err) {
// 			if(err) alert('genearte pdf error', err);
// 		});
// 	});
// };
