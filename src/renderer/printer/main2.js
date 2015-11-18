var fs = require('fs'),
    path = require('path'),
    remote = require('remote'),
    ipc = require('ipc'),
    d3 = require('d3'),
    ps = require('../common/asc_parser'),
    pt = require('../common/plot2');


var myPath = '';
ipc.send('getPrintPDFArgs', 'test');
ipc.on('async-reply-getPrintPDFArgs', function(args) {
    myPath = args.dir;
    var fileName = '',
        i = 0,
        p = '',
        lastFname = args.Files[args.Files.length-1].name;

    var adjust = 1.22,
        dpi = 72,
        scale = dpi * adjust,
        sizeL = 0,
        sizeS = 0;

    if (args.paperSize === 'A4') {
        sizeL = 11.7, sizeS = 8.3; // in inches
    } else if (args.paperSize === 'Letter') {
        sizeL = 11, sizeS = 8.5; // in inches
    }

    if (args.orientation === 'portrait') {
        pt.width(scale * sizeS)
          .height(scale * sizeL);
    } else if (args.orientation === 'landscape') {
        pt.width(scale * sizeL)
          .height(scale * sizeS);
    }
    pt.title(args.plotOptions.titleContents)
      .average(args.plotOptions.averages)
      .plottype(args.plotOptions.plotType)
      .maskedData(args.plotOptions.mask)
      .printflag(args.plotOptions.printFlag)
      .margin(args.plotOptions.margin);

    var myList = {};
    var total = args.Files.length;
    for (i in args.Files) {
        myList[args.Files[i].name] = args.Files[i];
        ipc.send('current-rendering', {val: Math.round(80 *(i/1 + 1) / total) });

        fs.readFile(path.join(myPath, args.Files[i].name), 'utf8', function(err, data) {
            if (err) throw err;

            var p = ps.parseAsc(data),
                o = myList[p.ascName],
                myId = p.ascName.replace(/\.asc/, '').replace(/@/, '-');
            
            var svg = d3.select('#print_area')
                        .append('svg').attr('id', 'svg-' + myId)
                        .classed('sep_pages', true);

            pt.setData(p)
              .comment(o.comment)
              .filename(p.ascName)
              .draw('#svg-' + myId);

            if (lastFname == p.ascName) ipc.send('rendering-done', args);
        });
    }
});
