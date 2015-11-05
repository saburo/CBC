"use strict";

var fs = require('fs'),
    path = require('path'),
    ipc  = require('ipc'),
    remote = require('remote'),
    dialog = remote.require('dialog');

var XLS = require('xlsx');
// var XLS = require('xlsjs');
global.$ = require('jquery');
global.jQuery = global.$;

require('jquery-ui/sortable');

var bootstrap = require('bootstrap');

var ps = require('./asc_parser'),
pt = require('./plot');

var defWinSize = remote.getGlobal('defaultWindowSize');
var myPath = '';
var searchBase = [];
var excelMultiFlag = [];


/**** IPCs ****/

ipc.on('async-reply-print-done', function(status) {
    window.clearInterval(timerId);
    var val = 100;
    $('.progress-bar').attr({'aria-valuenow': val}).css({width: val + '%'}).text(val + '%');
    window.setTimeout(function() {
        $('.myspacer').removeClass('hide');
        $('#progressbar').addClass('hide');
        $('.progress').removeClass('active');
        $('#exportModal').modal('hide');
    }, 1000);
});


/**** Functions ****/
RegExp.escape = function( value ) {
     return value.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
};

var updateFileList = function(myDir, myExcel) {
    $('#asc-list').html('<li class="asc-file">Loading...</li>');
    fs.readdir(myDir, function(err, list) {
        var ExcelCommentFlag = 1,
        myListItems = [],
        ascList = getASCList(list),
        excelComments = ExcelCommentFlag ? getExcelCommentList(list, myExcel): false,
        Comm = '',
        content = [],
        item = '',
        i = 0;
        searchBase = [];
        for (i in ascList) {
            if (excelComments.hasOwnProperty(ascList[i])) {
                Comm = excelComments[ascList[i]];
            } else {
                Comm = '[A] ' + getComment(path.join(myDir, ascList[i]));
            }
            // Comm = excelComments ? excelComments[ascList[i]] : getComment(path.join(myDir, ascList[i]));
            content = [];
            content.push($('<p/>').addClass('asc-file-comment').text(Comm));
            content.push($('<p/>').addClass('asc-file-name').text(ascList[i]));

            item = $('<li/>').addClass('asc-file')
            .attr({
                'data-asc': ascList[i],
                'data-comment': Comm
            });
            searchBase.push(ascList[i] + ' ' + Comm);
            item.append(content);
            myListItems.push(item);
        }
        $('#asc-list').html('').append(myListItems);
        $('.asc-file').on('click', function() {
            $('.current').removeClass('current');
            $(this).addClass('current');
            updatePlot($(this).attr('data-asc'),
                     $(this).attr('data-comment'), []);
        });
        if (excelMultiFlag.length > 0) {
            var options = [];
            excelMultiFlag.forEach(function(v) {
                options.push($('<option/>').attr('value', v).text(v))
            });
            var myModal = $('#selectExcelModal .modal-body');
            myModal.html('').append($('<select/>').attr('id', 'commentExcel').addClass('form-control').append(options));
            $('#selectExcelModal').modal({
                show: true
            })
        }
    });
};

var getASCList = function(list) {
    var pattern = /\.asc$/,
    pattern2 = /@(\d+)\.asc$/;

    return list.filter(function(f) {
        return f.match(pattern);
    }).sort(function(a, b) {
        a.match(pattern2);
        var a1 = RegExp.$1 / 1.0;
        b.match(pattern2);
        var b1 = RegExp.$1 / 1.0;
        return a1 - b1;
    });
};

var getExcelCommentList = function(list, excelPath) {
    var pattern = /\.xls$/,
        mySpreadSheet = [],
        sheetIndex = -1,
        wb = '',
        i = 2,
        myComments = {};
    var ascPattern = /\.asc$/;
    var ascList = list.filter(function(f) {
        return f.match(ascPattern);
    });
    var parseExcelComments = function(sheetPath) {
        // path = path.join(myPath, mySpreadSheet[0]);
        var comments = {};
        wb = XLS.readFile(sheetPath).Sheets['Sum_table'];
        for (i=2; i<= wb['!range'].e.r; i++) {
            if (wb.hasOwnProperty('A'+i)) {
                comments[wb['A'+i].v] = wb['B'+i].v;
                // myComments[wb['A'+i].v] = wb['B'+i].v;
            }
        }
        return comments;
    };

    excelMultiFlag = [];

    if (excelPath === undefined) {
        mySpreadSheet = list.filter(function(f) {
            if (f.match(pattern)) {
                sheetIndex = XLS.readFile(path.join(myPath, f))
                .SheetNames.indexOf('Sum_table');
                if (sheetIndex >= 0) return true;
            }
            return false;
        });
    } else {
        mySpreadSheet = [excelPath];
    }
    if (mySpreadSheet.length == 1) {
        myComments = parseExcelComments(path.join(myPath, mySpreadSheet[0]));
    } else if (mySpreadSheet.length > 1) {
        excelMultiFlag = mySpreadSheet;
    } 
    if (excelPath === undefined && ascList.length !== Object.keys(myComments).length) {
        if (Object.keys(myComments).length > 0) {
            excelMultiFlag = mySpreadSheet;
        }
        myComments = false;
    }

    return myComments;
};

var getComment = function(filename) {
    var data = fs.readFileSync(filename, 'utf8'),
    p = ps.parseAsc(data);
    return p.comment;
};

var getConfig = function(param) {
    var out = [];
    var checked = $('.' + param + ' input:checked');
    for (var i=0; i<checked.length; i++) {
        out.push($(checked[i]).val());
    }
    return out;
};

var updatePlot = function(fileName, comm, mask) {
    var p = '';
    var d3 = require('d3');
    $('svg').html('');
    var options = {
        plotType: getConfig('plottypes'),
        printFlag: false,
        titleContents: getConfig('titles'),
        averages: getConfig('averages'),
        maskedData: mask || pt.maskedData,
        margin: undefined, 
    };

    fs.readFile(path.join(myPath, fileName), 'utf8', function(err, data) {
        if (err) throw err;
        p = ps.parseAsc(data);
        if (comm) pt.excelComment = comm;
        pt.ascFileName = fileName;
        pt.makePlot(d3.select('svg'), p, options);
    });
};

var updateWindow = function() {
    pt.width = $(document).width() - $('#list').width();
    pt.height = $(document).height() - $('#toolbar').height();

    if ($('.current').length) {
        var fname = $('.current').attr('data-asc'),
        Comm = pt.excelComment;
        updatePlot(fname, Comm);
    }
    $('#graph, #main, #list').css('height', pt.height +'px');
    $('.asc-list').css('height', (pt.height - $('.aux').height()) + 'px')
};

var showSelectDir = function() {
    var retval = dialog.showOpenDialog({
        title: "Select data directory",
        properties: ['openDirectory']
    });

    if (retval == undefined) {
        return false;
    } else {
        return retval[0];
    }
};

var saveAsPDF = function () {
    dialog.showSaveDialog(function(destPath) {
        if (destPath == undefined) return false;
        $('.progress-bar').attr({'aria-valuenow': 0}).css({width: '0%'}).text('0%');
        $('.myspacer').addClass('hide');
        $('#progressbar').removeClass('hide');
        $('.progress').addClass('active');
        var files = [];
        destPath = (destPath.match(/\.pdf$/)) ? destPath : destPath + '.pdf';
        var mask = [];
        if($('.pages > input:checked').val() === 'all') {
            $('.asc-file').each(function(d) {
                files.push({
                    name: $(this).attr('data-asc'),
                    comment: $(this).attr('data-comment')
                });
            });

        } else {
            // single page
            var curr = $('.current');
            if (curr.length === 0) {
                alert('select file');
                return false;
            }
            files.push({
                name: $('.current') .attr('data-asc'),
                comment: $('.current') .attr('data-comment'),
            });
            if ($('#datamasking').prop('checked')) {
                mask = pt.maskedData;
            }
        }
        var args = {
            dir: myPath, 
            Files: files,
            destPath: destPath,
            paperSize: $('#paperSize > option:selected').val(),
            orientation: $('.paper-orientation > input:checked').val(),
            plotOptions: {
                plotType: getConfig('plottypes'),
                printFlag: true,
                titleContents: getConfig('titles'),
                averages: getConfig('averages'),
                // maskedData: mask || pt.maskedData,
                maskedData: mask, 
                margin: {top: 60, right: 20, bottom: 35, left: 70},
            }
        }
        updateSaveProgress();
        ipc.send('saveAsPDF', args);
    });
};

var saveAsSVG = function() {
    if ($('svg').length) {
        var d3 = require('d3');
        var html = d3.select(d3.select("svg").node().parentNode.cloneNode(true));


        // paper setting
        // paperSize: $('#paperSize > option:selected').val(),
        // orientation: $('.paper-orientation > input:checked').val()

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
        var css = '<style type="text/css"><![CDATA['
                + 'svg {font-family: Helvetica, sans-serif;}'
                + '.axis text {font: 12px sans-serif;}'
                + '.axis path, .axis line {fill: none; stroke: #000; stroke-width: 1.2; shape-rendering: crispEdges;}'
                + '.masked {opacity: 0.1;}'
                + ']]></style>';
        html.select('svg').insert('defs', ':first-child');
        html.select('defs').html(css);
        var headers = '<?xml version="1.0" encoding="utf-8"?>'
                    + '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" '
                    + '"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';

        html.select('.current-values').remove();
        html.select('.vline').remove();
        html.select('.masked-area').remove();
        html.select('.mouse-receiver').remove();

        dialog.showSaveDialog(function(destPath) {
            if (destPath == undefined) return false;

            destPath += destPath.match(/\.svg$/) ? '' : '.svg';
            fs.writeFile(destPath, headers + html.node().innerHTML, function(err) {
                html.remove();
                if (err) { dialog.showErrorBox("ERROR", "SVG file has not been saved"); }
            });
        });
    }
};

var timerId = '';
var div = 1;
var updateSaveProgress = function () {
    timerId = window.setInterval(function() {
        var val = remote.getGlobal('saveProgress');
        if (val >= 90 && val < 99 && div%3 === 0) {
            div = 1;
            ipc.send('current-rendering', {val: val/1 + 1});
        }
        div += 1;
        $('.progress-bar').attr({'aria-valuenow': val}).css({width: val + '%'}).text(val + '%');
    }, 500);
};

var resetSearchBox = function() {
    $('.remove-icon').hide();
    $('#search-word').val('');
    $('.asc-file').removeClass('hide');
    $('.hit-numbers').html('').hide();
};

/**** Event Listeners ****/

$(window).resize(function() {
    updateWindow();
});

$('.select-dir-btn').on('click', function() {
    var tmp = showSelectDir();
    if (tmp) {
        myPath = tmp;
        resetSearchBox();
        updateFileList(myPath);
        $('#folderName').text(path.basename(myPath))
        $(this).attr('title', myPath);
        $('svg').html('');
    }
    $(this).blur();
});

$('#exportas').on('click', function() {
    $('#exportModal').modal('show');
});

$('#preference').on('click', function() {
    $('#configModal').modal('show');
});


$('#print-btn').on('click', function() {
    if ($('.format > input:checked').val() === 'pdf') {
        saveAsPDF();
    } else {
        saveAsSVG();
    }
    $(this).blur();
});

$('#save-config-btn').on('click', function() {
    updateWindow();
    $('#configModal').modal('hide');
    $(this).blur();
});

$('#fileformatSVG').on('click', function() {
    $('#pageCurrent').prop('checked', true);
    $('#pageAll').prop('disabled', true);
    $('.paper-orientation > input').prop('disabled',true);
    $('.paper-size').prop('disabled',true);
});

$('#fileformatPDF').on('click', function() {
    $('#pageAll').prop('checked', true);
    $('#pageAll').prop('disabled', false);
    $('.paper-orientation > input').prop('disabled', false);
    $('.paper-size').prop('disabled', false);
});

$('#pageCurrent').on('click', function() {
    $('#datamasking').prop('disabled', false);
});

$('#pageAll').on('click', function() {
    $('#datamasking').prop('disabled', true);
});

// search

$('#search-word').on('keyup', function() {
    var kw = new RegExp(RegExp.escape($(this).val()),'ig');
    var lis = $('.asc-file');
    lis.addClass('hide');
    searchBase.forEach(function(v, i) {
        if (v.match(kw)) $(lis[i]).removeClass('hide');
    });
    if ($(this).val().length) {
        $('.remove-icon').fadeIn(100);
        $('.hit-numbers').fadeIn(100).html((lis.length - $('.asc-file.hide').length) + '<span style="color: #bbb;"> / ' + lis.length + '</span>');
    } else {
        $('.remove-icon, .hit-numbers').hide();
   }
});

$('.remove-icon').on('click', function() {
    resetSearchBox();
});

$('#select-excel-file').on('click', function() {
    var retval = $('#commentExcel > option:selected').val();
    updateFileList(myPath, retval);
    $('#selectExcelModal').modal('hide');
});

$('.plottypes').sortable();
$('.plottypes').disableSelection();
$('.remove-icon, .hit-numbers').hide();
// initialize window
// pt.width = defWinSize.width - $('.list-area').width() - 18;
// pt.height = defWinSize.height - $('.toolbar').height();


/**** Main routine (init) ****/

myPath = '/Users/saburo/Desktop/R/TEST_SIMS_DATA/20140624_d18O_garnet_stds_Kouki';
// myPath = showSelectDir();
updateFileList(myPath);
updateWindow();


