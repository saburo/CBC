"use strict";

var fs = require('fs'),
    path = require('path'),
    ipcRenderer  = require('electron').ipcRenderer,
    remote = require('electron').remote,
    dialog = remote.dialog,
    app = remote.app;
global.browserWindow = remote;
/**** Menu ****/
require('./menu');

var XLS = require('xlsx-browerify-shim');
global.$ = require('jquery');
global.jQuery = global.$;

global.myDebug = null;

require('jquery-ui');


var bootstrap = require('bootstrap');
var base64 = require('urlsafe-base64');

var ps = require('../common/asc_parser3');
    // pt = require('../common/plot');
var pt = require('../common/plot2');

var configFileName = 'edu.wiscsims.cbc.json';
var defWinSize = remote.getGlobal('defaultWindowSize');
var defaultDir = "D:\\IMS\\cips_data\\data";
var myPath = '';
var myExcelFile;
var configPath = path.join(app.getPath('userData'), configFileName);
var searchBase = [];
var configStates = {};
var excelMultiFlag = [];
var allData = [];
var mainIsoSys = '';

var isoConfigPath = path.join(__dirname, '../common/configs');

/**** ipcRenderers ****/
ipcRenderer.on('async-reply-print-done', function(event, status) {
    window.clearInterval(timerId);
    completeProgressBar();
});

ipcRenderer.on('window-resized', function(event, winSize) {
    updateWindow(winSize);
});

ipcRenderer.on('move-next', function() {
    moveNext();
});
ipcRenderer.on('move-prev', function() {
    movePrev();
});
ipcRenderer.on('focus-search', function() {
    $('#search-word').focus();
});



/**** Functions ****/
// RegExp.escape = function( value ) {
//      return value.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
// };

var updateFileList = function(myDir, myExcel, cb) {
    fs.readdir(myDir, function(err, list) {
        $('#asc-list').html('<li class="asc-file">Loading...</li>');
        console.log('myExcel', myExcel);
        var ExcelCommentFlag = 1,
            myListItems = [],
            ascList = getASCList(list),
            excelComments = ExcelCommentFlag ? getExcelCommentList(list, myExcel): false,
            Comm = '',
            CommOrigin = '',
            content = [],
            item = '',
            i = 0,
            tmp;
            searchBase = [];
        allData = [];
        // console.log('excelComments', excelComments);
        for (i in ascList) {
            try {
                ps.init(fs.readFileSync(path.join(myDir, ascList[i]), 'utf8'));
                tmp = ps.parseAll();
                allData.push(tmp);
            }
            catch (e) {
                alert("Error: parse .asc file (" + ascList[i] + ")");
                // console.log('Error: parseAll; ');
            }
            // if (ps.init(fs.readFileSync(path.join(myDir, ascList[i]), 'utf8'))) {
            //     tmp = ps.parseAll();
            //     allData.push(tmp);
            //     // console.log(tmp.anaParams['Sec.Anal.pressure (mb)']);
            // } else {
            //   console.log('Error: parseAll');
            // }
            content = [];
            // console.log("asc: %s, hasOwn: %s", ascList[i], excelComments.hasOwnProperty(ascList[i]));
            if (excelComments.hasOwnProperty(ascList[i])) {
                Comm = excelComments[ascList[i]];
                CommOrigin = '';
            } else {
                // console.log('asc');
              // Comm = getComment(path.join(myDir, ascList[i]));
              Comm = tmp.comment;
              CommOrigin = $('<span/>').addClass('glyphicon glyphicon-text-background')
                                        .attr('aria-hidden', true);

            }
            var addition = Math.round(tmp.cummRes.R1['Delta Value(permil)']*100)/100;
            content.push($('<p/>').addClass('asc-file-comment').text(Comm + ': ' + addition));
            content.push($('<p/>').addClass('asc-file-name').text(ascList[i] + ': ' + tmp.anaParams['Sec.Anal.pressure (mb)'] + " [" + tmp.isoSys + "]"));
            content.push($('<p/>').addClass('asc-file-comment-origin').append(CommOrigin));
            item = $('<li/>').addClass('asc-file')
                             .attr({'data-asc': ascList[i], 'data-comment': Comm, 'data-isosys': tmp.isoSys});
            searchBase.push(ascList[i] + ' ' + Comm);
            item.append(content);
            myListItems.push(item);
        }
        // console.log(allData);
        $('#asc-list').html('').append(myListItems);
        $('.asc-file').on('click', function() {
            handleAscFileClick($(this));
            // $('.current').removeClass('current');
            // $(this).addClass('current');
            // updatePlot($(this).attr('data-asc'),
            //          $(this).attr('data-comment'), []);
        });
        if (excelMultiFlag.length > 0) {
            var options = [];
            excelMultiFlag.forEach(function(v) {
                options.push($('<option/>').attr('value', v).text(v));
            });
            var myModal = $('#selectExcelModal .main-modal-body');
            myModal.html('').append($('<select/>').attr('id', 'commentExcel').addClass('form-control').append(options));
            $('#selectExcelModal').modal({
                show: true
            });
        }
        if (cb !== undefined) cb();
        loadConfig();
    });
};

var handleAscFileClick = function(me) {
    var isoConfig = getIsoConfig(me.attr('data-isosys'));
    $('.current').removeClass('current');
    me.addClass('current');
    updatePlot(me.attr('data-asc'), me.attr('data-comment'), []);
};

var getIsoConfig = function(isosys) {
    var isoConfJson = fs.readFileSync(path.join(isoConfigPath, isosys + '.json') ,'utf8');
    return JSON.parse(isoConfJson.replace(/[\r\n]+/img, ''));
};

var getDeltas = function() {
    return getIsoConfig('deltas');
};

var getScales = function() {
    return getIsoConfig('scales');
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
    var pattern = /^[^\~].*\.xlsx?$/;
    var mySpreadSheet = [];
    var sheetIndex = -1;
    var wb = '';
    var i = 2;
    var myComments = {};
    var ascPattern = /\.asc$/;
    var ascList = list.filter(function(f) {
        return f.match(ascPattern);
    });
    var parseExcelComments = function(sheetPath) {
        // path = path.join(myPath, mySpreadSheet[0]);
        var comments = {};
        wb = XLS.readFile(sheetPath).Sheets.Sum_table;
        var ulimit = 0;
        if (/\.xlsx$/.test(sheetPath)) {
            console.log(sheetPath);
        // new excel format (.xlsx)
            ulimit = /(\d+)$/.exec(wb['!ref'])[1] / 1
        } else {
        // old excel format (.xls)
            ulimit = wb['!range'].e.r
        }
        if (wb.hasOwnProperty('A8') && !/\.asc$/.test(wb['A8'].v)) {
            console.log('parsing by go');
            comments = parseExcelCommentsGo(sheetPath);
        } else {
            for (i=2; i<=ulimit; i++) {
                if (!wb.hasOwnProperty('A'+i)) continue;
                if (typeof wb['B'+i] === 'undefined') continue;
                comments[wb['A'+i].v] = wb['B'+i].v
            }
        }
        return comments;
    };

    var parseExcelCommentsGo = function(sheetPath) {
        var exePath = __dirname + '/../common/sum_table_parser';
        var exec = require('child_process').exec;
        var cmd = exePath + ' ' + sheetPath;
        var comments = {};
        if (exec(cmd, function(error, stdout, stderr) {
            var mylist = stdout.split(/\n/);
            var out2 = {};
            var tmp = [];
            var a = mylist.map(function (v) {
                out2 = {};
                tmp = v.split(/\t/);
                if (tmp[0] !== "") comments[tmp[0]] = tmp[1];
            });
            return false;
        })) return comments;
        return comments;
    };

    excelMultiFlag = [];
    if (typeof excelPath === 'undefined') {
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
    if (mySpreadSheet.length === 1) {
        myComments = parseExcelComments(path.join(myPath, mySpreadSheet[0]));
    } else if (mySpreadSheet.length > 1) {
        excelMultiFlag = mySpreadSheet;
    }
    // if (excelPath === undefined && ascList.length !== Object.keys(myComments).length) {
    if (excelPath === undefined) {
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
    var icon = $('.refresh-icon');
    var current = $('.current');
    icon.addClass('fa-spin');
    updateFileList(myPath, myExcelFile, function() {
        var list = $('.asc-file');
        for(var i=0; i<list.length; i++) {
            if ($(list[i]).attr('data-asc') !== current.attr('data-asc')) continue;
            adjustItemPosition($(list[i]).addClass('current'));
            icon.removeClass('fa-spin');
            return;
        }
        $('svg').html('');
        icon.removeClass('fa-spin');
    });
};


/***
 Config related
***/
var getConfig = function(param) {
    var out = [];
    var checked = $('.' + param + ' input:enabled:checked');
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
    if (param==='plottypes' && (/(hydride|delta|capDelta|cps)/.test(item))) {
        $('.averages input[value=' + item + ']').prop('disabled', false);
    }
};

var getConfigs = function(isosys) {
    // var isosys = getIsoSys();
    var tmp = {};
    var out = {};
    // set default values;
    var defaults = {
        titles: ['comment', 'filename'],
        plottypes: ['cps','delta'],
        averages: ['cps','delta'],
    };
    try {
        tmp = JSON.parse(fs.readFileSync(configPath,'utf8'));
        // if (tmp[isosys] !== undefined) out = tmp[isosys];
    } catch(e) {
        // no configure file
        console.log('error: reading ' + configPath);
        return defaults;
    }
    if (isosys) {
        // specified isotope system
        if (!tmp.hasOwnProperty(isosys)) {
            out = defaults;
        } else {
            out = tmp[isosys];
        }
    } else {
        // non-specified isotope system
        // return whole config file
        if (tmp.hasOwnProperty('titles')) tmp = {};
        out = tmp;
    }

    return out;
};

var loadConfig = function() {
    var isosys = getIsoSys();
    var capitalFlag = /(O3|S3|S4|AlMg)/.test(isosys);
    var hydrideFlag = /(H$|AlMg)/.test(isosys);

    $('input[value=capDelta]').prop('disabled', !capitalFlag);
    if (!capitalFlag) {
        $('input[value=capDelta]').prop('checked', false)
            .parent().addClass('disabled');
    } else {
        $('input[value=capDelta]').parent().removeClass('disabled');
    }
    $('input[value=hydride]').prop('disabled', !hydrideFlag);
    if (!hydrideFlag) {
        $('input[value=hydride]').prop('checked', false)
            .parent().addClass('disabled');
    } else {
        $('input[value=hydride]').parent().removeClass('disabled');
    }

    configStates = $('#configModal .modal-body').html();
    $('#configModal input').prop('checked', false);
    $('.averages input').prop('disabled', true);
    $.each(getConfigs(isosys), function(key, v) {
        v.map(function(i) { setConfig(key, i); });
    });
};

var saveConfig = function(conf) {
    var isosys = getIsoSys();
    var tmp = getConfigs();
    tmp[isosys] = parseConfig();
    fs.writeFile(configPath, JSON.stringify(tmp), 'utf8', function(err) {
        if (err) throw err;
        updatePlot();
    });
};

var initConfigInputs = function() {
    $('.plottypes, .titles').sortable({
        update: function(e, ui) {previewPlot();}
    }).disableSelection();
    $('#configModal .plottypes input').on('change', function() {
        var me = $(this);
        var bool = !me.prop('checked');
        var ave = $('.averages input[value='+me.val()+']');
        ave.prop('disabled', bool);
        if (bool) {
            ave.parent().addClass('disabled');
        } else {
            ave.parent().removeClass('disabled');
        }
    });
    $('#configModal input').on('change', function() {
      previewPlot();
    });
};


/*****

*****/

var intersect = function(a, b) {
    return a.filter(function(e) {
        return $.inArray(e, b)>-1 ? true : false;
    });
};

var updatePlot = function(fileName, comm, mask) {
    var p = '';
    var isosys = getIsoSys();
    var config = getConfigs(isosys);
    var isoConfig = getIsoConfig(isosys);
    var sigD = {
        'delta': isoConfig.delta['decimal-place'],
        'cps': isoConfig.cps['decimal-place'],
        'capDelta': isoConfig.capDelta === undefined ? 0 : isoConfig.capDelta['decimal-place'],
    }
    // config.averages.push('cps');
    pt.plottype(config.plottypes)
        .average(intersect(config.averages, config.plottypes))
        .title(config.titles);
    if (fileName) {
        fs.readFile(path.join(myPath, fileName), 'utf8', function(err, data) {
            if (err) throw err;
            console.log('error:', err);
            try {
                p = ps.parseAsc(data);
            } 
            catch (e) {
                pt.errorDraw("#myPlot", fileName);
                alert('Couldn\'t parse asc file');
                return
            }
            if (comm) pt.comment(comm);
            if (sigD) Object.keys(sigD).map(function(key, i) {
                pt.significantDigit(key, sigD[key]);
            })
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
    $('.asc-list').css('height', (pt.height() - $('.aux').height()) + 'px');
    if (pt.filename()) pt.draw('#myPlot');
};

var previewPlot = function() {
    var conf = parseConfig();
    pt.title(conf.titles)
        .plottype(conf.plottypes)
        .average(conf.averages)
        .draw('#myPlot');
};

var showFolderSelectDialog = function(defaultDir) {
    return dialog.showOpenDialog({
        title: "Select data directory",
        defaultPath: defaultDir,
        properties: ['openDirectory']
    });
}

var getDataDir = function(defaultDir) {
    defaultDir = defaultDir || app.getPath('userDesktop');
    var retval = showFolderSelectDialog(defaultDir)
    if (retval === undefined) {
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

var sanitizeFileName = function(text, chr) {
  chr = chr || '_';
  return text.replace(/[\/\:\s\t\;]/ig, chr);
};

var saveAsPDF = function () {
    var crt = $('.current');
    var fname = $('.pages > input:checked').val() === 'all' ?
                path.basename(myPath) :
                crt.attr('data-asc').replace(/(^\d+|\.asc)/ig,'') + '_' + sanitizeFileName(crt.attr('data-comment'));
    var saveOpts = {
      defaultPath: path.join(myPath, fname + '.pdf')
    };
    dialog.showSaveDialog(saveOpts, function(destPath) {
        // Do nothing when hit cancel button
        if (destPath === undefined) return false;

        initProgressBar();
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
                mask = pt.maskedData();
            }
        }
        var plotConfig = getConfigs(getIsoSys());
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
                margin: {top: 60, right: 30, bottom: 50, left: 70},
            }
        };
        updateSaveProgress();
        ipcRenderer.send('saveAsPDF', args);
    });
};

var saveAsSVG = function(imgFlag) {
    if ($('.current').length) {
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
            'viewBox': "0 0 " + pt.width() + ' ' + pt.height(),
            'enable-background': "new 0 0 " + pt.width() + ' ' + pt.height(),
            "xml:space": 'preserve'
        });
        var css = '<style type="text/css"><![CDATA[' +
                  'svg {font-family: Helvetica, sans-serif;}' +
                  '.axis text {font: 12px sans-serif;}' +
                  '.axis path, .axis line {fill: none; stroke: #000; stroke-width: 1.2; shape-rendering: crispEdges;}' +
                  '.masked {opacity: 0.1;}' +
                  ']]></style>';
        html.select('svg').insert('defs', ':first-child');
        html.select('defs').html(css);
        var headers = '<?xml version="1.0" encoding="utf-8"?>' +
                      '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" ' +
                      '"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';
        var removedElements = [
          '.current-values',
          '.vline',
          '.masked-area',
          '.mouse-receiver',
          '.resetMaskBtn'
        ];
        removedElements.map(function(v) {
          html.selectAll(v).remove();
        });

        var svgText = headers + html.node().innerHTML;
        var expFileName = $('.current').attr('data-asc').replace(/(^\d+|\.asc)/ig, '') + '_' +
                            sanitizeFileName($('.current').attr('data-comment'));
        var saveOpts = {
          defaultPath: path.join(myPath, expFileName + '.' + imgFlag)
        };

        dialog.showSaveDialog(saveOpts, function(destPath) {
            // for hiting cancel button
            if (destPath === undefined) return false;

            initProgressBar();
            if(imgFlag === 'svg') {
              destPath += destPath.match(/\.svg$/i) ? '' : '.svg';
              fs.writeFile(destPath, svgText, function(err) {
                  if (err) { dialog.showErrorBox("ERROR", "SVG file has not been saved"); }
                  completeProgressBar();
              });
            } else {
              var pattern = new RegExp('\\.' + imgFlag + '$', 'i');
              destPath += destPath.match(pattern) ? '' : '.' + imgFlag;
              svg_to_img(html[0][0], pt, destPath, imgFlag);
            }
        });
        html.remove();
    } else {
        alert('Select data for exporting a plot');
    }
};

function svg_to_img(html, pt, destPath, format) {
    var svg = html.querySelector("svg");
    var svgData;
    if (typeof window.XMLSerializer != "undefined") {
        svgData = (new XMLSerializer()).serializeToString(svg);
    } else if (typeof svg.xml != "undefined") {
        svgData = svg.xml;
    }

    var canvas = document.createElement("canvas");
    var svgSize = svg.getBoundingClientRect();
    canvas.width = pt.width();
    canvas.height = pt.height();
    var ctx = canvas.getContext("2d");
    var img = document.createElement("img");
    img.setAttribute("src", "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData))));

    img.onload = function() {
        ctx.drawImage(img, 0, 0);
        var imgsrc = canvas.toDataURL("image/" + format.replace('jpg', 'jpeg'), 1.0);
        var b64img = imgsrc.split(',')[1];
        img.remove();
        fs.writeFile(destPath, base64.decode(b64img), function(err) {
            if (err) { dialog.showErrorBox("ERROR", "File has not been saved"); }
            completeProgressBar();
        });
    };
}


var timerId = '';
var div = 1;
var updateSaveProgress = function () {
    timerId = window.setInterval(function() {
        var val = remote.getGlobal('saveProgress');
        if (val >= 90 && val < 99 && div%3 === 0) {
            div = 1;
            ipcRenderer.send('current-rendering', {val: val/1 + 1});
        }
        div += 1;
        $('.progress-bar').attr({'aria-valuenow': val}).css({width: val + '%'}).text(val + '%');
    }, 500);
};

var resetSearchBox = function() {
    $('.remove-icon').fadeOut(200);
    $('#search-word').val('');
    $('.asc-file').removeClass('hide');
    $('.hit-numbers').slideUp(200).html('').hide();
};

var adjustItemPosition = function(item) {
    var al = $('#asc-list');
    al.scrollTop(al.scrollTop() + item.position().top - al.height()/2);
};

var moveNext = function() {
    var j = 0;
    var list = $('.asc-file'),
        l = list.length, i = 0;
    if ($('.current').length === 0) {
        adjustItemPosition($(list[0]).click());
        return;
    }
    for (i=0;i<l;i++) {
        var li = $(list[i]);
        if (li.hasClass('current')) {
            for (j=i+1; j<l; j++) {
                if (!$(list[j]).hasClass('hide')) break;
            }
            if (j === l) return; // last item
            adjustItemPosition($(list[j]).click());
            return;
        }
    }
};

var movePrev = function() {
    var j = 0
    var list = $('.asc-file'),
    l = list.length, i = 0;

    for (i=0;i<l;i++) {
        var li = $(list[i]);
        if (li.hasClass('current')) {
            for (j=i-1; j>=0; j--) {
                if (!$(list[j]).hasClass('hide')) break;
            }
            if (j < 0) return;
            adjustItemPosition($(list[j]).click());
            return;
        }
    }
};

var getIsoSys = function() {
    var li = $('.current') ? $('.current') : $('.asc-file').first();
    return li.attr('data-isosys');
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
        $('#folderName').text(path.basename(myPath));
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
        var hits = (lis.length - $('.asc-file.hide').length);
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
    if ($('#search-word').val().trim() !== '') return;
    $('.search-box, .hit-numbers').removeClass('active');
});

$('.remove-icon').on('click', function() {
    resetSearchBox();
});

$(document).on('keyup', function(e) {
    if (e.which === 74) moveNext();
    if (e.which === 75) movePrev();
});

//--- Modals
// excel select modal
$('#select-excel-file').on('click', function() {
    myExcelFile = $('#commentExcel > option:selected').val();
    updateFileList(myPath, myExcelFile);
    $('#selectExcelModal').modal('hide');
});

// plot config
// $('.plottypes input').on('click', function() {
//     var me = $(this);
//     if (/(hydride|delta|capDelta)/.test(me.val())) {
//         if (me.prop('checked')) {
//             $('.averages input[value='+me.val()+']').prop('disabled', false);
//         } else {
//             $('.averages input[value='+me.val()+']').prop('disabled', true);
//         }
//     }
// });

$('#preference').on('click', function() {
    if (!allData.length) return;
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
    var fmt = $('.format > input:checked').val();
    if (fmt === 'pdf') {
        saveAsPDF();
    } else {
        saveAsSVG(fmt);
    }
    $(this).blur();
});

$('#fileformatSVG, #fileformatPNG, #fileformatJPG').on('click', function() {
    $('#pageCurrent').prop('checked', true);
    $('#pageAll').prop('disabled', true);
    $('.paper-orientation > input').prop('disabled',true);
    $('.paper-size').prop('disabled',true);
    $('#datamasking').prop('disabled', false);
});

$('#fileformatPDF').on('click', function() {
    // $('#pageAll').prop('checked', true);
    $('#pageAll').prop('disabled', false);
    $('.paper-orientation > input').prop('disabled', false);
    $('.paper-size').prop('disabled', false);
    if ($("#pageAll").prop('checked')) {
      $('#datamasking').prop('disabled', true);
    }
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
$('#configModal, #exportModal').draggable({
    handle: ".modal-header"
});
// var tmp = '/Users/saburo/Desktop/DATA/20140624_d18O_garnet_stds_Kouki';
// var tmp = '/Users/saburo/Desktop/Data/data_asc_only';
// var tmp = '/Users/saburo/Desktop/Sub-Maciej';
// var tmp = getDataDir();

if (!myPath) {
    myPath = getDataDir();
}

if (!myPath) {
    alert('Select directory');
    return;
}

resetSearchBox();
updateFileList(myPath, myExcelFile);
$('#folderName').text(path.basename(myPath));
// $(this).attr('title', myPath);
$('svg').html('');

initConfigInputs();
// updateFileList(myPath, myExcelFile);
updateWindow(ipcRenderer.sendSync('getContentSize'));
