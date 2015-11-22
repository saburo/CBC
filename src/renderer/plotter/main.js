"use strict";

var fs = require('fs'),
    path = require('path'),
    ipc  = require('ipc'),
    remote = require('remote'),
    dialog = remote.require('dialog'),
    app = remote.require('app');
global.browserWindow = remote.require('browser-window');

/**** Menu ****/
require('./menu');

var XLS = require('xlsx');
global.$ = require('jquery');
global.jQuery = global.$;

require('jquery-ui');

var bootstrap = require('bootstrap'),
    base64 = require('urlsafe-base64');

var ps = require('../common/asc_parser'),
    // pt = require('../common/plot');
    pt = require('../common/plot2');

var defWinSize = remote.getGlobal('defaultWindowSize');
var myPath = '',
    myExcelFile = undefined,
    configPath = path.join(app.getPath('userData'), 'preferences.json'),
    searchBase = [],
    configStates = {},
    excelMultiFlag = [];



/**** IPCs ****/

ipc.on('async-reply-print-done', function(status) {
    window.clearInterval(timerId);
    completeProgressBar();
});

ipc.on('window-resized', function(winSize) {
    updateWindow(winSize);
});

ipc.on('move-next', function() {
    moveNext();
});
ipc.on('move-prev', function() {
    movePrev();
});


/**** Functions ****/
RegExp.escape = function( value ) {
     return value.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
};

var updateFileList = function(myDir, myExcel, cb) {
    $('#asc-list').html('<li class="asc-file">Loading...</li>');
    fs.readdir(myDir, function(err, list) {
        var ExcelCommentFlag = 1,
            myListItems = [],
            ascList = getASCList(list),
            excelComments = ExcelCommentFlag ? getExcelCommentList(list, myExcel): false,
            Comm = '',
            CommOrigin = '',
            content = [],
            item = '',
            i = 0;
            searchBase = [];

        for (i in ascList) {
            content = [];
            if (excelComments.hasOwnProperty(ascList[i])) {
                Comm = excelComments[ascList[i]];
                CommOrigin = ''
            } else {
                Comm = getComment(path.join(myDir, ascList[i]));
                CommOrigin = $('<span/>').addClass('glyphicon glyphicon-text-background')
                                         .attr('aria-hidden', true);
            }
            content.push($('<p/>').addClass('asc-file-comment').text(Comm));
            content.push($('<p/>').addClass('asc-file-name').text(ascList[i]));
            content.push($('<p/>').addClass('asc-file-comment-origin').append(CommOrigin));
            item = $('<li/>').addClass('asc-file')
                             .attr({'data-asc': ascList[i], 'data-comment': Comm });
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
            var myModal = $('#selectExcelModal .main-modal-body');
            myModal.html('').append($('<select/>').attr('id', 'commentExcel').addClass('form-control').append(options));
            $('#selectExcelModal').modal({
                show: true
            })
        }
        if (cb !== undefined) cb();
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

var reloadFolderItems = function() {
  var current = $('.current')
  updateFileList(myPath, myExcelFile, function() {
    var list = $('.asc-file');
    for(var i=0; i<list.length; i++) {
      if ($(list[i]).attr('data-asc') !== current.attr('data-asc')) continue;
      adjustItemPosition($(list[i]).addClass('current'));
      return;
    }
    $('svg').html('');
  });
};

var getConfig = function(param) {
    var out = [];
    var checked = $('.' + param + ' input:checked');
    for (var i=0; i<checked.length; i++) {
        out.push($(checked[i]).val());
    }
    return out;
};

var parseConfig = function() {
    var out = {};
    var params = ['titles', 'plottypes', 'averages'];
    params.forEach(function(v, i) {
        out[v] = getConfig(v);
    });
    // out['papersize'] = $('#paperSize > option:selected').val();
    // out['paperorientation'] = $('.paper-orientation > input:checked').val();

    return out;
};

var setConfig = function(param, item, value) {
    value = value || true;
    $('.'+param + ' input[value=' + item + ']').prop('checked', value);
    if (param==='plottypes' && (item==='hydride' || item==='delta')) {
        $('.averages input[value=' + item + ']').prop('disabled', false);
    }
};

var getConfigs = function() {
    // set default values;
    var out = {
            titles: ['comment'], plottypes: ['cps','delta'],
            averages: ['delta'],
        };
    try {
        out = JSON.parse(fs.readFileSync(configPath,'utf8'));
    } catch(e) {
        console.log('error: reading preference.json');
    }

    return out;
};

var loadConfig = function() {
    configStates = $('#configModal .modal-body').html();
    $('#configModal input').prop('checked', false);
    $('.averages input').prop('disabled', true);
    $.each(getConfigs(), function(key, v) {
        v.map(function(i) { setConfig(key, i) });
    });
};

var saveConfig = function(conf) {
    var confPath = path.join(app.getPath('userData'), 'preferences.json');
    fs.writeFile(confPath, JSON.stringify(parseConfig()), 'utf8', function(err) {
        if (err) throw err;
        updatePlot();
    });
};

var intersect = function(a, b) {
    return a.filter(function(e) {
        return $.inArray(e, b)>-1 ? true : false;
    });
};

var updatePlot = function(fileName, comm, mask) {
    var p = '';
    var config = getConfigs();
    pt.plottype(config.plottypes)
        .average(intersect(config.averages, config.plottypes))
        .title(config.titles)
    if (fileName) {
        fs.readFile(path.join(myPath, fileName), 'utf8', function(err, data) {
            if (err) throw err;
            p = ps.parseAsc(data);
            if (comm) pt.comment(comm);
            pt.setData(p).maskedData(mask).filename(fileName).draw('#myPlot');
        });
    } else {
        pt.draw('#myPlot');
    }
};

var updateWindow = function(winSize) {
    pt.width(winSize[0] - $('#list').width());
    pt.height(winSize[1] - $('#toolbar').height());
    $('#graph, #main, #list').css('height', pt.height() +'px');
    $('.asc-list').css('height', (pt.height() - $('.aux').height()) + 'px')
    if (pt.filename()) pt.draw('#myPlot');
};

var previewPlot = function() {
    var conf = parseConfig();
    pt.title(conf.titles)
        .plottype(conf.plottypes)
        .average(conf.averages)
        .draw('#myPlot');
}

var getDataDir = function(defaultDir) {
    defaultDir = defaultDir || app.getPath('userDesktop');
    var retval = dialog.showOpenDialog({
        title: "Select data directory",
        defaultPath: defaultDir,
        properties: ['openDirectory']
    });

    if (retval == undefined) {
        return false;
    } else {
        return retval[0];
    }
};

var initProgressBar = function() {
    $('.progress-bar').attr({'aria-valuenow': 0}).css({width: '0%'}).text('0%');
    $('.myspacer').addClass('hide');
    $('#progressbar').removeClass('hide');
    $('.progress').addClass('active');
};

var completeProgressBar = function(waitTime) {
    var val = 100;
    waitTime = waitTime || 1000;
    $('.progress-bar').attr({'aria-valuenow': val}).css({width: val + '%'}).text(val + '%');
    window.setTimeout(function() {
        $('.myspacer').removeClass('hide');
        $('#progressbar').addClass('hide');
        $('.progress').removeClass('active');
        $('#exportModal').modal('hide');
    }, waitTime);
};

var saveAsPDF = function () {
    dialog.showSaveDialog(function(destPath) {
        if (destPath == undefined) return false;
        initProgressBar()
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
        var plotConfig = getConfigs();
        var args = {
            dir: myPath,
            Files: files,
            destPath: destPath,
            paperSize: $('#paperSize > option:selected').val(),
            orientation: $('.paper-orientation > input:checked').val(),
            plotOptions: {
                titleContents: plotConfig.titles,
                plotType: plotConfig.plottypes,
                averages: plotConfig.averages,
                printFlag: true,
                maskedData: mask,
                margin: {top: 60, right: 20, bottom: 35, left: 70},
            }
        };
        updateSaveProgress();
        ipc.send('saveAsPDF', args);
    });
};

var saveAsSVG = function(imgFlag) {
    if ($('.current').length) {
        initProgressBar();
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

        var svgText = headers + html.node().innerHTML;

        dialog.showSaveDialog(function(destPath) {
            if (destPath == undefined) return false;
            if(imgFlag) {
                if (imgFlag === 'png') {
                    destPath += destPath.match(/\.png$/) ? '' : '.png';
                } else {
                    destPath += destPath.match(/\.jpe?g$/) ? '' : '.jpg';
                }
                svg_to_img(html[0][0], pt, destPath, imgFlag);
            } else {
                destPath += destPath.match(/\.svg$/) ? '' : '.svg';
                fs.writeFile(destPath, svgText, function(err) {
                    if (err) { dialog.showErrorBox("ERROR", "SVG file has not been saved"); }
                    completeProgressBar();
                });
            }
        });
        html.remove();
    } else {
        alert('Select data for exporting a plot');
    }
};

function svg_to_img(html, pt, destPath, format) {
    var svg = html.querySelector("svg");
    if (typeof window.XMLSerializer != "undefined") {
        var svgData = (new XMLSerializer()).serializeToString(svg);
    } else if (typeof svg.xml != "undefined") {
        var svgData = svg.xml;
    }

    var canvas = document.createElement("canvas");
    var svgSize = svg.getBoundingClientRect();
    canvas.width = pt.width();
    canvas.height = pt.height();
    var ctx = canvas.getContext("2d");
    var img = document.createElement("img");
    img.setAttribute("src", "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData))) );

    img.onload = function() {
        ctx.drawImage(img, 0, 0);
        var imgsrc = canvas.toDataURL("image/" + format, 1.0);
        var b64img = imgsrc.split(',')[1];
        img.remove();
        fs.writeFile(destPath, base64.decode(b64img), function(err) {
            if (err) { dialog.showErrorBox("ERROR", "File has not been saved"); }
            completeProgressBar();
        });
    };
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
    $('.remove-icon').fadeOut(200);
    $('#search-word').val('');
    $('.asc-file').removeClass('hide');
    $('.hit-numbers').slideUp(200).html('').hide()
};

var adjustItemPosition = function(item) {
    var al = $('#asc-list')
    al.scrollTop(al.scrollTop() + item.position().top - al.height()/2);
};

var moveNext = function() {
    var list = $('.asc-file'),
        l = list.length, i = 0;
    if ($('.current').length === 0) {
        adjustItemPosition($(list[0]).click());
        return;
    }
    for (i=0;i<l;i++) {
        var li = $(list[i]);
        if (li.hasClass('current')) {
            if (i === l-1) return;
            adjustItemPosition($(list[i+1]).click());
            return;
        }
    }
};

var movePrev = function() {
    var list = $('.asc-file'),
    l = list.length, i = 0;

    for (i=0;i<l;i++) {
        var li = $(list[i]);
        if (li.hasClass('current')) {
            if (i === 0) return;
            adjustItemPosition($(list[i-1]).click());
            return;
        }
    }
};

var initConfigInputs = function() {
    $('.plottypes, .titles').sortable({
        update: function(e, ui) {previewPlot();}
    }).disableSelection();
    $('#configModal input').on('change', function() {
        var me = $(this);
        if ($.inArray(me.val(), ['hydride', 'delta'])>-1) {
            var bool = me.prop('checked') ? false : true;
            $('.averages input[value='+me.val()+']').prop('disabled', bool);
        }
        previewPlot();
    });
}


/**** Event Listeners ****/
//--- toolbar
$('#exportas').on('click', function() {
    $('#exportModal').modal('show');
});

$('#wiscsims').on('click', function() {
    $('.flags').toggleClass("on", 800);
});

//--- list
$('.select-dir-btn').on('click', function() {
    var tmp = getDataDir();
    if (tmp) {
        myPath = tmp;
        myExcelFile = undefined;
        resetSearchBox();
        updateFileList(myPath, myExcelFile);
        $('#folderName').text(path.basename(myPath))
        $(this).attr('title', myPath);
        $('svg').html('');
    }
    $(this).blur();
});

// search
$('.search-icon').on('click', function() {
    $('#search-word').focus();
});

$('#search-word').on('keyup', function() {
    // var kw = new RegExp(RegExp.escape($(this).val()),'ig');
    var kw = new RegExp($(this).val(),'ig');
    var lis = $('.asc-file');
    lis.addClass('hide');
    searchBase.forEach(function(v, i) {
        if (v.match(kw)) $(lis[i]).removeClass('hide');
    });
    if ($(this).val().length) {
        var hits = (lis.length - $('.asc-file.hide').length)
        $('.remove-icon').fadeIn(100);
        $('.hit-numbers').slideDown(100)
                         .html( hits + '<span style="color: #ccc;"> / ' + lis.length + '</span>');
    } else {
        $('.remove-icon').fadeOut(100);
        $('.hit-numbers').slideUp(100);
   }
});

$('#search-word').on('focus', function() {
    $('.search-box, .hit-numbers').addClass('active');
});

$('#search-word').on('blur', function() {
    $('.search-box, .hit-numbers').removeClass('active');
});

$('.remove-icon').on('click', function() {
    resetSearchBox();
});

//--- Modals
// excel select modal
$('#select-excel-file').on('click', function() {
    myExcelFile = $('#commentExcel > option:selected').val();
    updateFileList(myPath, myExcelFile);
    $('#selectExcelModal').modal('hide');
});

// plot config
$('.plottypes input').on('click', function() {
    var me = $(this);
    if (me.val() === 'hydride' || me.val() === 'delta') {
        if (me.prop('checked')) {
            $('.averages input[value='+me.val()+']').prop('disabled', false);
        } else {
            $('.averages input[value='+me.val()+']').prop('disabled', true);
        }
    }
});

$('#preference').on('click', function() {
    loadConfig();
    $('#configModal').modal('show');
});

$('#save-config-btn').on('click', function() {
    saveConfig();
    $('#configModal').modal('hide');
    configStates = '';
    $(this).blur();
});

$('#cancel-config-btn').on('click', function() {
    $('#configModal .modal-body').html(configStates);
    initConfigInputs();
});

// export config
$('#print-btn').on('click', function() {
    var fmt = $('.format > input:checked').val()
    if (fmt === 'pdf') {
        saveAsPDF();
    } else if (fmt === 'svg'){
        saveAsSVG();
    } else if (fmt === 'png') {
        saveAsSVG('png');
    } else if (fmt === 'jpeg') {
        saveAsSVG('jpeg');
    }
    $(this).blur();
});

$('#fileformatSVG, #fileformatPNG, #fileformatJPG').on('click', function() {
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

$('.refresh-icon').on('click', function(event) {
  event.stopPropagation();
  reloadFolderItems();
});

// misc



/**** Main routine (init) ****/

$('.remove-icon, .hit-numbers').hide();
$('#configModal').draggable({
    handle: ".modal-header"
});
// myPath = '/Users/saburo/Desktop/R/TEST_SIMS_DATA/20140624_d18O_garnet_stds_Kouki';
// myPath = '/Users/saburo/Desktop/Data/data_asc_only';
var tmp = getDataDir();
if (tmp) {
    myPath = tmp;
    resetSearchBox();
    updateFileList(myPath, myExcelFile);
    $('#folderName').text(path.basename(myPath))
    $(this).attr('title', myPath);
    $('svg').html('');
}
initConfigInputs();
updateFileList(myPath, myExcelFile);
updateWindow(ipc.sendSync('getContentSize'));
