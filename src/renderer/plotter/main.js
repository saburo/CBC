"use strict";

var fs = require('fs'),
    path = require('path'),
    ipc  = require('ipc'),
    remote = require('remote'),
    dialog = remote.require('dialog'),
    app = remote.require('app');
global.browserWindow = remote.require('browser-window');

var XLS = require('xlsx');
global.$ = require('jquery');
global.jQuery = global.$;

require('jquery-ui');

var bootstrap = require('bootstrap'),
    base64 = require('urlsafe-base64');

var ps = require('./common/asc_parser'),
    pt = require('./common/plot');

var defWinSize = remote.getGlobal('defaultWindowSize');
var myPath = '';
var searchBase = [];
var excelMultiFlag = [];


/**** IPCs ****/

ipc.on('async-reply-print-done', function(status) {
    window.clearInterval(timerId);
    completeProgressBar();
});

ipc.on('window-resized', function() {
    updateWindow();
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

var updateFileList = function(myDir, myExcel) {
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
                maskedData: mask, 
                margin: {top: 60, right: 20, bottom: 35, left: 70},
            }
        }
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
    canvas.width = pt.width;
    canvas.height = pt.height;
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
    // $('.active').removeClass('active');
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

/**** Event Listeners ****/
$('.select-dir-btn').on('click', function() {
    var tmp = getDataDir();
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

$('#save-config-btn').on('click', function() {
    updateWindow();
    $('#configModal').modal('hide');
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

$('.remove-icon').on('click', function() {
    resetSearchBox();
});

$('#select-excel-file').on('click', function() {
    var retval = $('#commentExcel > option:selected').val();
    updateFileList(myPath, retval);
    $('#selectExcelModal').modal('hide');
});

$('#wiscsims').on('click', function() {
    $('.flags').toggleClass("on", 800);
});

$('#search-word').on('focus', function() {
    $('.search-box, .hit-numbers').addClass('active');
});
$('#search-word').on('blur', function() {
    $('.search-box, .hit-numbers').removeClass('active');
});

/**** Main routine (init) ****/

$('.plottypes').sortable();
$('.plottypes').disableSelection();
$('.remove-icon, .hit-numbers').hide();
// myPath = '/Users/saburo/Desktop/R/TEST_SIMS_DATA/20140624_d18O_garnet_stds_Kouki';
myPath = '/Users/saburo/Desktop/R/TEST_SIMS_DATA/Miami';
// myPath = getDataDir();
updateFileList(myPath);
updateWindow();


/**** Menu ****/

var Menu = remote.require('menu');
var MenuItem = remote.require('menu-item');

var template = [
    {
        label: 'File',
        submenu: [
            {
                label: 'Open Data Directory…',
                accelerator: 'CmdOrCtrl+O',
                click: function(item, focusedWindow) {
                    $('.select-dir-btn').click();
                }
            },
            {
                label: 'Export As…',
                // accelerator: 'CmdOrCtrl+S',
                click: function(item, focusedWindow) {
                    $('#exportas').click();
                }
            }
        ]
    },
  {
    label: 'Edit',
    submenu: [
      {
        label: 'Undo',
        accelerator: 'CmdOrCtrl+Z',
        role: 'undo'
      },
      {
        label: 'Redo',
        accelerator: 'Shift+CmdOrCtrl+Z',
        role: 'redo'
      },
      {
        type: 'separator'
      },
      {
        label: 'Cut',
        accelerator: 'CmdOrCtrl+X',
        role: 'cut'
      },
      {
        label: 'Copy',
        accelerator: 'CmdOrCtrl+C',
        role: 'copy'
      },
      {
        label: 'Paste',
        accelerator: 'CmdOrCtrl+V',
        role: 'paste'
      },
      {
        label: 'Select All',
        accelerator: 'CmdOrCtrl+A',
        role: 'selectall'
      },
    ]
  },
  {
    label: 'View',
    submenu: [
      {
        label: 'Reload',
        accelerator: 'CmdOrCtrl+R',
        click: function(item, focusedWindow) {
          if (focusedWindow)
            focusedWindow.reload();
        }
      },
      {
        label: 'Toggle Full Screen',
        accelerator: (function() {
          if (process.platform == 'darwin')
            return 'Ctrl+Command+F';
          else
            return 'F11';
        })(),
        click: function(item, focusedWindow) {
          if (focusedWindow)
            focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
        }
      },
      {
        label: 'Toggle Developer Tools',
        accelerator: (function() {
          if (process.platform == 'darwin')
            return 'Alt+Command+I';
          else
            return 'Ctrl+Shift+I';
        })(),
        click: function(item, focusedWindow) {
          if (focusedWindow)
            focusedWindow.toggleDevTools();
        }
      },
      {
        label: 'Move Next Data',
        accelerator: (function() {
          if (process.platform == 'darwin')
            return 'Shift+down';
          else
            return 'Ctrl+Shift+I';
        })(),
        click: function(item, focusedWindow) {
          if (focusedWindow)
            focusedWindow.webContents.send('move-next');
        }
      },
      {
        label: 'Move Previous Data',
        accelerator: (function() {
          if (process.platform == 'darwin')
            return 'Shift+up';
          else
            return 'Ctrl+Shift+I';
        })(),
        click: function(item, focusedWindow) {
          if (focusedWindow)
            focusedWindow.webContents.send('move-prev');
        }
      },
    ]
  },
  {
    label: 'Window',
    role: 'window',
    submenu: [
      {
        label: 'Minimize',
        accelerator: 'CmdOrCtrl+M',
        role: 'minimize'
      },
      {
        label: 'Close',
        accelerator: 'CmdOrCtrl+W',
        role: 'close'
      },
    ]
  },
  {
    label: 'Help',
    role: 'help',
    submenu: [
      {
        label: 'Learn More',
        click: function() { require('shell').openExternal('http://electron.atom.io') }
      },
    ]
  },
];

if (process.platform == 'darwin') {
  var name = remote.require('app').getName();
  template.unshift({
    label: name,
    submenu: [
      {
        label: 'About ' + name,
        role: 'about'
      },
      {
        type: 'separator'
      },
      {
        label: 'Preference',
        accelerator: 'Command+,',
        click: function() {
            $('#preference').click();
        }
      },
      {
        label: 'Preference2',
        accelerator: 'Command+.',
        click: function() {
            var bw = new browserWindow({
                height: 500,
                width: 500,
                'min-height': 500,
                'min-width': 500,
                'always-on-top': true
            });
            bw.loadUrl('file://' + __dirname + '/../preference/preference.html');
            bw.on('closed', function() {
                bw = null;
            });
            bw.openDevTools();

        }
      },
      {
        type: 'separator' 
      },
      {
        label: 'Services',
        role: 'services',
        submenu: []
      },
      {
        type: 'separator'
      },
      {
        label: 'Hide ' + name,
        accelerator: 'Command+H',
        role: 'hide'
      },
      {
        label: 'Hide Others',
        accelerator: 'Command+Shift+H',
        role: 'hideothers'
      },
      {
        label: 'Show All',
        role: 'unhide'
      },
      {
        type: 'separator'
      },
      {
        label: 'Quit',
        accelerator: 'Command+Q',
        click: function() { app.quit(); }
      },
    ]
  });
  // Window menu.
  template[3].submenu.push(
    {
      type: 'separator'
    },
    {
      label: 'Bring All to Front',
      role: 'front'
    }
  );
}

Menu.setApplicationMenu(Menu.buildFromTemplate(template));
