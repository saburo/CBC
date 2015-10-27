var fs = require('fs'),
	path = require('path'),
	ipc  = require('ipc'),
	remote = require('remote'),
	dialog = remote.require('dialog');
	// dialog = require('dialog');

var XLS = require('xlsjs');
global.$ = require('jquery');
global.jQuery = global.$;

var bootstrap = require('bootstrap');

var ps = require('./asc_parser.js'),
	pt = require('./plot.js');

var doc = document;

var defWinSize = {width: 500, height:500};

var titlebarHeight = 18; // 22

var myPath = ''


ipc.on('async-reply-def-win-size', function(winSize) {
	defWinSize = winSize;
	pt.width = winSize.width - $('.list-area').width() - 18;
	pt.height = winSize.height - $('.toolbar').height() - titlebarHeight;
});

ipc.on('async-reply-print-done', function(status) {
	$('#saveAsPDF').blur();
});


var getDefaultWindowSize = function() {
	ipc.send('async-process', 'defaultWindowSize');
}

var updateFileList = function(myDir) {
	fs.readdir(myDir, function(err, list) {
		var ExcelCommentFlag = 1,
		myListItems = [],
		ascList = getASCList(list),
		excelComments = ExcelCommentFlag ? getExcelCommentList(list): false,
		Comm = '',
		content = [],
		item = '',
		i = 0;

		for (i in ascList) {
			Comm = excelComments ? excelComments[ascList[i]] : getComment(path.join(myDir, ascList[i]));
			content = [];
			content.push($('<p/>').addClass('asc-file-comment').text(Comm));
			content.push($('<p/>').addClass('asc-file-name').text(ascList[i]));

			item = $('<li/>').addClass('asc-file')
			.attr({
				'data-asc': ascList[i],
				'data-comment': Comm
			});
			item.append(content);
			myListItems.push(item);
		}
		$('#asc-list').html('').append(myListItems);
		$('.asc-file').on('click', function() {
			$('.current').removeClass('current');
			$(this).addClass('current');
			updatePlot($(this).attr('data-asc'),
			           $(this).attr('data-comment'));
		});
	});
}

var getASCList = function(list) {
	var pattern = /\.asc$/,
	pattern2 = /@(\d+)\.asc$/;

	return list.filter(function(f) {
		return f.match(pattern);
	}).sort(function(a, b) {
		a.match(pattern2);
		a1 = RegExp.$1 / 1.0;
		b.match(pattern2);
		b1 = RegExp.$1 / 1.0;
		return a1 < b1 ? -1 : 1;
	});
};

var getExcelCommentList = function(list) {
	var pattern = /\.xls$/,
	mySpreadSheet = [],
	sheetIndex = -1,
	wb = '',
	i = 2,
	myComments = {};

	mySpreadSheet = list.filter(function(f) {
		if (f.match(pattern)) {
			sheetIndex = XLS.readFile(path.join(myPath, f))
			.SheetNames.indexOf('Sum_table');
			if ( sheetIndex >= 0) return true;
		}
		return false;
	});
	if (mySpreadSheet.length == 1) {
		wb = XLS.readFile(path.join(myPath, mySpreadSheet[0])).Sheets['Sum_table'];
		for (i=2; i<= wb['!range'].e.r; i++) {
			if (wb.hasOwnProperty('A'+i)) {
				myComments[wb['A'+i].v] = wb['B'+i].v;
			}
		}
	} else if (mySpreadSheet.length > 1) {
		alert('Too many excel files');
		myComments = false;
	} else {
		myComments = false
	}
	return myComments;
};

var getComment = function(filename) {
	var data = fs.readFileSync(filename, 'utf8'),
	p = ps.parseAsc(data);
	return p.comment;
};

var updatePlot = function(fileName, comm) {
	var p = '';
	var d3 = require('d3');
	$('svg').html('');
	fs.readFile(path.join(myPath, fileName), 'utf8', function(err, data) {
		if (err) throw err;
		p = ps.parseAsc(data);
		if (comm) pt.excelComment = comm;
		pt.ascFileName = fileName;
		pt.makePlot(d3.select('svg'), p);
	});
};

var updateWindow = function() {
	var min_h = $('.graph-area').css('min-height').replace('px','') * 1,
	new_height = (min_h + ($(window).height() - (defWinSize.height - 22)));

	pt.width_re = $(window).width() - defWinSize.width * 1;
	pt.height_re = $(window).height() - (defWinSize.height - titlebarHeight);

	if ($('.current').length) {
		var fname = $('.current').attr('data-asc'),
		Comm = pt.excelComment;
		updatePlot(fname, Comm);
	}
	$('.graph-area, .asc-list, #main').css('height', new_height +'px');
};

var showSelectDir = function() {
	var retval = dialog.showOpenDialog({properties: ['openDirectory']});

	if (retval == undefined) {
		return false;
	} else {
		return retval[0];
	}
};

$(window).resize(function() {
	updateWindow();
});

$('.btn_select_dir').on('click', function() {
	var tmp = showSelectDir();
	if (tmp) {
		myPath = tmp;
		updateFileList(myPath);
	}
	$(this).blur();
});

$('#saveAsPDF').on('click', function() {
	var files = [];
	dialog.showSaveDialog(function(destPath) {
		if (destPath == undefined) return false;
		destPath = (destPath.match(/\.pdf$/)) ? destPath : destPath + '.pdf';
		$('.asc-file').each(function(d) {
			files.push({
				name: $(this).attr('data-asc'),
				comment: $(this).attr('data-comment')
			});
		});
		var args = {
			dir: myPath, 
			Files: files,
			destPath: destPath,
		}
		ipc.send('saveAsPDF', args);
	});

});

$('#chick').on('click', function() {
	getDefaultWindowSize();
	$(this).blur();
});

$('#frog').on('click', function() {
	var mainWindow = remote.getCurrentWindow();
	mainWindow.printToPDF({
		landscape: true
	}, function(err, data) {
		var dist = './test.pdf'
		fs.writeFile(dist, data, function(err) {
			if(err) alert('genearte pdf error', err);
		});
	});
	// console.log(BWindow);
	// var BrowserWindow = remote.require('browser-window');

	// var win = new BrowserWindow({ width: 800, height: 600 });
	// win.loadUrl('https://github.com');
	$(this).blur();
});

$('#saveAsSVG').on('click', function() {
	if ($('svg').length) {
		var d3 = require('d3');
		var html = d3.select(d3.select("svg").node().parentNode.cloneNode(true));

		html.select('svg').attr({
			"title": pt.excelComment,
			"version": 1.1,
			"xmlns": "http://www.w3.org/2000/svg",
			'x': '0px',
			'y': '0px',
			'id': 'Layer_1',
			'viewBox': "0 0 " + pt.width + ' ' + pt.height,
			'enable-background': "new 0 0 " + pt.width + ' ' + pt.height,
			"xml:space": 'preserve'
		});
		var headers = '<?xml version="1.0" encoding="utf-8"?>'
		+ '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" '
		+ '"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';

		html.select('.current-values').remove();
		html.select('.vline').remove();

		dialog.showSaveDialog(function(destPath) {
			if (destPath == undefined) return false;

			destPath += destPath.match(/\.svg$/) ? '' : '.svg';
			fs.writeFile(destPath, headers + html.node().innerHTML, function(err) {
				html.remove();
				if (err) { dialog.showErrorBox("ERROR", "SVG file has not been saved"); }
			});
		});
	}
	$(this).blur();
});


// initialize window
defWinSize = getDefaultWindowSize();

myPath = showSelectDir();
updateFileList(myPath);
updateWindow();


