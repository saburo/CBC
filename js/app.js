var $ = require('jquery');
global.jQuery = $;
var fs = require('fs'),
	path = require('path');
var XLS = require('xlsjs');

var bootstrap = require('bootstrap');
var ps = require('./asc_parser.js'),
	pt = require('./plot.js');

var doc = document;

var myPath = ''

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
			$('.current').removeClass('current')
			$(this).addClass('current');
			updatePlot($(this).attr('data-asc'), $(this).attr('data-comment'));
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
	$('svg').remove();
	fs.readFile(path.join(myPath, fileName), 'utf8', function(err, data) {
		if (err) throw err;
		p = ps.parseAsc(data);
		if (comm) pt.excelComment = comm;
		pt.ascFileName = fileName;
		pt.makePlot(p);
	});
};

var showSelectDir = function() {
	var remote = require('remote')
	var dialog = remote.require('dialog');
	var retval = dialog.showOpenDialog({properties: ['openDirectory']})
	if (retval == undefined) {
		return false
	} else {
		return retval[0]
	}
}

$('.btn_select_dir').on('click', function() {
	myPath = showSelectDir();
	updateFileList(myPath);
	$('svg').remove();
});

$(window).resize(function() {
	var w = $(window).width(),
		h = $(window).height(),
		o_w = 980,
		o_h = 680 - 22,
		min_h = $('.graph-area').css('min-height').replace('px','') * 1;

	pt.width_re = w - o_w;
	pt.height_re = h - o_h;
	if ($('.current').length) {
		var fname = $('.current').find('.asc-name').attr('data-asc'),
			Comm = pt.excelComment;
			updatePlot(fname, Comm);
	}
	$('.graph-area, .asc-list, #main').css('height', (min_h + (h - o_h)) +'px');
});

$('#chicken').on('click', function() {
	$('#myModal').modal('show');
});

myPath = showSelectDir();
updateFileList(myPath);
