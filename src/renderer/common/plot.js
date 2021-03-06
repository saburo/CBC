var d3 = require("d3");

module.exports = {

    PDB: 0.0112372,
    VSMOW: 0.00200520,

    width:  730,  
    height: 605,

    margin: {},

    ascFileName: '',

    excelComment: null,

    scale: {},

    maskedData: [],

    config: {},

    stat: {},

    plotType: ['cps', 'delta'],

    data: {},

    circleSize: 5,

    printFlag: false, 

    titleFlag: true,

    titleContents: ['comment'],

    averages: ['hydride', 'delta'],

    iso: 'C',

    f02: d3.format('0.2f'),
    f03: d3.format('0.3f'),
    f04: d3.format('0.4f'),
    f05: d3.format('0.5f'),

    updateCurrentValue: function(cycle) {
        var self = this;
            txt = '',
            t = '',
            suffix = '',
            label = '',
            padding = 10,
            xOffset = 48.90625 + padding,
            cv = d3.select('.current-values'),
            color = this.config.color,
            data = this.data;

        cv.selectAll("*").remove();

        cv.append('text').text('Cycle# ' + cycle);
        this.plotType.forEach(function(v, i) {
            if (v === 'cps') {
                suffix = ' [cps]';
                d3.keys(data.cps).forEach(function(vv, ii) {
                    txt = self.formatLabels(vv) + ': ' + data.cps[vv][cycle - 1] + suffix;
                    t = cv.append('text').html(txt).attr({
                        x: xOffset,
                        fill: color.cps[vv],
                    });
                    xOffset += t.node().getBBox().width + padding;
                });
            } else {
                label = self.config.labels[v];
                suffix = (v === 'hydride') ? ' [\u00D7E' + self.config.order['hydride'] + ']' : ' [\u2030]';
                txt = label + ': ' + self.f03(data.plotData[cycle - 1][v]) + suffix;
                t = cv.append('text').html(txt).attr({
                    x: xOffset,
                    fill: color[v],
                });
                xOffset += t.node().getBBox().width + padding;
            }
        });
    },

    addCPSLegendFlag: function() {
        return true;
    },

    addAverageLineFlag: function() {
        return true;
    },

    getRange: function(dataType, margin) {
        // margin [%]
        var values = [],
            myKeys = [],
            i = 0,
            vMargin = 0
            self = this;

        margin = margin || 20;

        if (dataType === 'cps') {
            myKeys = d3.keys(self.data.plotData[0].cps);
            for (i=0; i<self.data.plotData.length; i++) {
                myKeys.forEach(function(v) {
                    values.push(self.data.plotData[i]['cps'][v]);
                });
            }
        } else {
            self.data.plotData.forEach(function(v, i) {
                values.push(self.data.plotData[i][dataType]);
            });
        }
        if (this.addCPSLegendFlag() || this.addAverageLinesFlag()) {
            vMargin = 0.5;
        }
        margin = Math.abs(d3.max(values) - d3.min(values)) * margin / 100 || 0;
        return [d3.min(values) - margin, d3.max(values) + margin * (1 + vMargin)];
    },

    filterMaskedData: function() {
        var self = this;
        return self.data.plotData.filter(function(v, i) {
            return self.maskedData.indexOf(i + 1) < 0
        });
    },

    addTitle: function(obj) {
        var self = this;
        var title = [];
        self.titleContents.forEach(function(v, i) {
            if (v === 'filename') {
                title.push('<tspan font-weight="normal">[' + self.ascFileName + ']</tspan>');
            } else {
                title.push(self.excelComment.replace(/^\[A\]\s/, ''));
            }
        });
        obj.append('g').classed('title', true)
            .append('text')
            .append('tspan')
            .attr({
                'text-anchor': 'middle',
                x: this.width / 2,
                y: this.margin.top - 10, // title y-position from topmost
                'font-weight': 'bold',
            })
            .style({})
            .html(title.join(' '));
    },

    addCPSLegend: function(obj) {
        if (!obj.select('.legend').empty()) return;
        var self = this;
        var keys = d3.keys(self.stat);
        var legend = obj.append('g').classed('legend', true).attr({
            transform: 'translate('+ self.scale.cps.x(1) + ',' + 20 + ')'
        });
        var color = this.config.color.cps;
        var li = '';
        var r = self.circleSize;
        var xOffset = 0;
        keys.forEach(function(v, i) {
            li = legend.append('g').classed('legend-item', true);
            li.append('circle').attr({
                fill: color[v],
                stroke: 'none',
                r: r,
                cx: 0, cy: -(6 - r/2)
            });
            var myOrder = ' [\u00D7E+' + self.stat[v].order + ']';
            li.append('text').html(self.formatLabels(v) + myOrder).attr({
                x: r + 4,
                y: 0, 
                fill: color[v],
                stroke: 'none',
            }).style({
                'font-size': '12px',
                'text-anchor': 'start'
            });
            li.attr({transform: 'translate(' + xOffset +','+ 0 + ')'});
            xOffset += li.node().getBBox().width + 20; // padding-right = 20
        })
    },

    addAverageLine: function(obj, t) {
        var self = this;
        var stat = self.calcAverage(t);
        var avLine = obj.select('.average-line'),
            avText = obj.select('.average-text');
        var l = self.data.plotData.length;

        if (avLine.empty()) {
            avLine = obj.append('g').append('line').classed('average-line', true);
            var yVal= (self.printFlag) ? stat.mean : stat.min
            avLine.attr({
                x1: self.scale[t].x(1), x2: self.scale[t].x(l),
                y1: self.scale[t].y(yVal), y2: self.scale[t].y(yVal),
                fill: 'none',
                stroke: self.config.color[t],
                'stroke-width': 1,
                'stroke-dasharray': ("6, 3")
            });
        }
        if (avText.empty()) {
            avText = obj.append('g').append('text').classed('average-text', true);
            avText.attr({
                fill: this.config.color[t],
                'font-size': '12px',
                'text-anchor': 'end',
                x: self.scale[t].x(l), y: 20
            });
        }
        avLine.transition().duration(200)
            // .attr({y1: self.scale[t].y(stat.max), y2: self.scale[t].y(stat.max)})
            // .transition().duration(200)
            .attr({y1: self.scale[t].y(stat.mean), y2: self.scale[t].y(stat.mean)});
        var suffix = (t==='hydride') ? ' [\u00D7E' + this.config.order.hydride + ']' : ' [\u2030]';
        avText.text('Average & 2SE: ' + self.f02(stat.mean) + ' ± ' + self.f02(stat.se2) + suffix);
    },

    calcAverage: function(t) {
        var i = 0,
            v = [];
        this.filterMaskedData().forEach(function(o, i) {
            v.push(o[t]);
        });
        return {
            mean:   d3.mean(v), 
            stdev2: d3.deviation(v) * 2,
            se2:  (d3.deviation(v) * 2) / Math.sqrt(v.length),
            min:  d3.min(v),
            max:  d3.max(v)
        };
    },

    drawPoints: function(obj, t, size) {
        var self = this;
        var keys = (t==='cps') ? Object.keys(self.data.plotData[0].cps) : ['dummy'];
        keys.forEach(function(v, i) {
            obj.append("circle")
                .attr({
                    cx: function(d) { return self.scale[t].x(d.cycle); },
                    cy: function(d) { return self.scale[t].y(t==='cps' ? d.cps[v] : d[t]); },
                    r: size||10, stroke: 'none',
                    fill: t==='cps' ? self.config.color[t][v] : self.config.color[t]
                });
        });
    },

    drawConnLine: function(obj, t) {
        var self = this;
        var lineGen = null;
        var keys = (t==='cps') ? Object.keys(self.data.plotData[0].cps) : ['dummy'];

        keys.forEach(function(v, i) {
            lineGen = d3.svg.line()
                        .x(function(d) { return self.scale[t].x(d.cycle); })
                        .y(function(d) { return self.scale[t].y(t==='cps' ? d.cps[v] : d[t]); });
            obj.append('path').classed('connLines', true)
                .attr({
                    d: lineGen(self.filterMaskedData()),
                    stroke: t==='cps' ? self.config.color[t][v] : self.config.color[t],
                    'stroke-width': 1, fill: 'none'
                });
        })
    },

    makeAxis: function(obj, pos, scale, maxsize, lastFlag) {
        if (pos === 'x') {
            var attr = {
                    'class': 'x axis', 
                    transform: "translate(0," + maxsize + ")"
                },
                orient = 'bottom',
                tickSize = 6,
                ticks = 4;
                var Axis = d3.svg.axis()
                    .scale(scale)
                    .ticks(ticks)
                    .orient('bottom')
                    .tickSize(tickSize, 0)
                    .tickFormat('');
                obj.append('g').attr({class: 'x2 axis',transform: 'translate(0,0)'}).call(Axis);
        } else {
            var attr = {'class': 'y axis'},
                orient = 'left',
                tickSize = 6,
                ticks = 5;
        }
        var Axis = d3.svg.axis()
                    .scale(scale)
                    .ticks(ticks)
                    .orient(orient)
                    .tickSize(-tickSize, -maxsize);
        if (pos === 'x' && lastFlag===false) Axis.tickFormat('');
        return obj.append('g').attr(attr).call(Axis);
    },

    // makePlot: function(svg, data, plotType, margin, printFlag, options) {
    makePlot: function(svg, data, options) {
        this.config = this.isotopeSysConfig(this.checkIsoSys(data));
        this.data = data;
        this.data['plotData'] = this.makePlotData(data);
        this.stat = data.stat;

        this.plotType = options.plotType || this.plotType;
        this.printFlag = options.printFlag || this.printFlag;
        this.maskedData = options.maskedData || this.maskedData;
        this.titleContents = options.titleContents || this.titleContents;
        this.averages = options.averages || this.averages;

        var self = this;
        var margin = options.margin || {top: 35, right: 20, bottom: 60, left: 60},
            width = this.width - margin.left - margin.right,
            height = (this.height - margin.top - margin.bottom) / self.plotType.length; // divide by number of plots
        this.margin = margin;

        // Add background (white)
        svg.append('g').append('rect').classed('background', true).attr({
            width: this.width,
            height: this.height,
            fill: '#fff',
            stroke: 'none'
        });

        var container = svg.append('g').classed('chart-frame', true)
            svg.attr({
                width: width + margin.left + margin.right,
                height: self.plotType.length * height + margin.top + margin.bottom
            });

        if (!self.printFlag) {
            var currentVal = svg.append('g').classed('current-values', true).attr({
                        'font-size': '11px',
                        'text-anchor': 'start',
                        transform: 'translate(' + margin.left + ',' + (this.height - 5)  + ')'
                    });
            var vline = container.append('g').attr({
                    transform: 'translate(' + margin.left + ',' + margin.top + ')',
                    width: width,
                    height: self.plotType.length * height,
                }).append('line').classed('vline hide', true).attr({
                    x1: 0, x2: 0,
                    y1: 0, y2: self.plotType.length * height,
                    fill: 'none',
                    stroke: 'rgba(255,0,255,0.8)',
                    'stroke-width': .2
                });

            var maskedArea = container.append('g').classed('masked-area', true)
                            .append('rect').attr({
                                height: self.plotType.length * height,
                                width: 0, 
                                transform: 'translate(' + margin.left + ',' + margin.top + ')',
                                fill: 'rgba(255,0,0,0.1)'
                            });
        }

        var plots = {},
            x = 0, y = 0;
            // plotData = this.makePlotData(data);
        if (self.titleContents.length) {
            self.addTitle(svg);
        }

        // Main loop
        for (var i in self.plotType) {
            var t = self.plotType[i];

            // Create scales
            this.scale[t] = {
                x: d3.scale.linear().domain([0, data.cycleNumber + 1]).range([0, width]),
                y: d3.scale.linear().domain(this.getRange(t)).range([height, 0])
            }
            this.scale['x'] = this.scale[t].x;

            // Create plot frame
            x = margin.left, y = (margin.top/1 + i * height/1);
            plots[t] = container.append('g').classed('plot ' + t, true)
                    .attr({
                        transform: "translate(" + x + "," + y + ")",
                        width: width,
                        height: height,
                    });
            if (self.averages.indexOf(t) >= 0) {
                this.addAverageLine(plots[t], t);
            }
            if (t === 'cps') {
                this.addCPSLegend(plots[t], self.scale);
            }

            var lastFlag = (parseInt(i) === (parseInt(self.plotType.length) - 1)) ? true : false;
            // Create Axis bases
            var xAxis = this.makeAxis(plots[t], 'x', this.scale[t].x, height, lastFlag);
            var yAxis = this.makeAxis(plots[t], 'y', this.scale[t].y, width);

            // Axis title
            yAxis.append("text")
                .attr({
                    y: -34,
                    x: -height / 2,
                    transform: 'rotate(-90)',
                }).style({
                    'font-size': '16px',
                    "text-anchor": "middle",
                }).html(self.config.labels[t]);

            // Create line and point frame
            plots[t].append('g').classed('line', true);
            plots[t].append('g').classed('point', true);

            var line = plots[t].select('.line').selectAll('path')
                                .data(self.data.plotData)
                                .enter()
                                .append('g');

            var point = plots[t].select('.point').selectAll('circle')
                                .data(self.data.plotData)
                                .enter()
                                .append('g');

            this.drawConnLine(line, t);
            this.drawPoints(point, t,  self.circleSize);

        } // Main loop

        xAxis.append('text').text('Cycle #').attr({
            y: 30,
            x: width / 2,
            'text-anchor': 'middle',
        }).style({
            'font-size': '14px',
        });

        if (!self.printFlag) {
            var mouseReceiver = container.append('g').classed('mouse-receiver', true).append('rect').attr({
                transform: 'translate(' + margin.left + ',' + margin.top + ')',
                width: width,
                height: self.plotType.length * height,
                fill: 'rgba(255,255,255,0)'
            });

            /*
             * Actions
             *
             */

            var startPointX = -1,
                startPoint = 0;
            mouseReceiver.on('mouseenter', function() {
                vline.classed('hide', false);
                d3.select('.current-values').classed('hide', false);
            });
            mouseReceiver.on('mouseout', function() {
                vline.classed('hide', true);
                d3.select('.current-values').classed('hide', true);
            });
            mouseReceiver.on('mousemove', function() {
                if (startPointX > 0) return; // dragging

                if (self.isHover(this)) {
                    vline.classed('hide', false);
                    d3.select('.current-values').classed('hide', false);
                } else {
                    vline.classed('hide', true);
                    d3.select('.current-values').classed('hide', true);
                    return;
                }

                var m = d3.mouse(this);
                var x = self.scale[t].x(d3.round(self.scale[t].x.invert(m[0])))
                vline.attr({x1: x, x2: x});
                self.updateCurrentValue(parseInt(self.scale[t].x.invert(x), 10));
            });

            mouseReceiver.on('dblclick', function() {
                if (self.isHover(this)) return;
                self.maskedData = [];
                d3.selectAll('.masked').classed('masked', false);
                self.plotType.map(function(t) {
                    plots[t].selectAll('.connLines').remove();
                    self.drawConnLine(plots[t], t);
                    if (self.averages.indexOf(t) >= 0) {
                        self.addAverageLine(plots[t], t);
                    }
                });
            });

            // data masking
            var dragstarted = function(d) {
                if (!self.isHover(this)) return;
                
                startPointX = self.getCurrentX(this);
                maskedArea.attr({
                    x: self.scale.x(startPointX - 0.3)
                }).classed('hide', false);
                vline.classed('hide', true);
            };
            var dragged = function() {
                if (!self.isHover(this) || startPointX < 0) return;

                var currentX = self.getCurrentX(this);
                var diff = currentX - startPointX;
                var x = (diff < 0) ? currentX : startPointX;
                var margin = self.scale.x(0.3);
                maskedArea.attr({
                    x: self.scale.x(x) - margin, 
                    width: Math.abs(self.scale.x(diff)) + margin * 2
                });
            };
            var dragended = function() {
                if (startPointX < 0) return;
                var currentX = self.getCurrentX(this);
                currentX = (currentX < 1) ? 1 : currentX; 
                var current = self.scale.x(currentX);
                var maskRange = [startPointX, currentX].sort(function(a,b){ return a-b }); 
                if (!self.isHover(this)) {
                    currentX = (self.data.cycleNumber < currentX) ? self.data.cycleNumber : 1;  
                }
                maskedArea.attr({width: 0}).classed('hide', true);
                self.maskData(container, maskRange, plots);
                vline.attr({x1: current, x2: current })
                                    .classed('hide', false);
                startPointX = -1;
            };
            var drag = d3.behavior.drag()
                        .on('dragstart', dragstarted)
                        .on('drag', dragged)
                        .on('dragend', dragended);

            mouseReceiver.call(drag);
        }

        if (self.maskedData.length) {
            var p = d3.selectAll('.point');
            self.maskedData.forEach(function(cycle) {
                p.selectAll('g').forEach(function(v, j) {
                    d3.select(v[cycle - 1]).selectAll('circle')
                        .classed('masked', true);
                });
            });
        }

        // if (self.printFlag) console.log(self.ascFileName);
    },

    maskData: function(obj, range, plotObj) {
        var self = this,
            ind = -1,
            classFlag = true,
            p = d3.selectAll('.point');

        if (typeof range === 'number') range = [range, range];
        for (var i=range[0]; i<=range[1]; i++) {
            ind = self.maskedData.indexOf(i);
            if (ind === -1) {
                self.maskedData.push(i);
                classFlag = true;
            } else {
                self.maskedData.splice(ind, 1);
                classFlag = false;
            }
            p.selectAll('g').forEach(function(v, j) {
                d3.select(v[i - 1]).selectAll('circle')
                    .classed('masked', classFlag);
            });
        }
        if (self.maskedData.length === self.data.cycleNumber) {
            alert('You can\'t mask all cycles!');
            for (var i=range[0]; i<=range[1]; i++) {
                ind = self.maskedData.indexOf(i);
                if (ind === -1) {
                    self.maskedData.push(i);
                    classFlag = true;
                } else {
                    self.maskedData.splice(ind, 1);
                    classFlag = false;
                }
                p.selectAll('g').forEach(function(v, j) {
                    d3.select(v[i - 1]).selectAll('circle')
                        .classed('masked', classFlag);
                });
            }
            return;
        }
        self.plotType.forEach(function(v, i) {
            plotObj[v].selectAll('.connLines').remove();
            self.drawConnLine(plotObj[v], v);
            if (self.averages.indexOf(v) >= 0) {
                self.addAverageLine(plotObj[v], v);
            }
        });
    },

    getCurrent: function(me) {
        return this.scale.x(this.getCurrentX(me));
    },

    getCurrentX: function(me) {
        return d3.round(this.scale.x.invert(d3.mouse(me)[0]));
    },

    isHover: function(me) {
        var currentX = self.getCurrentX(me);
        return (currentX > 0 && currentX <= this.data.cycleNumber);
    },

    makePlotData: function(data) {
        var out = [],
            myKeys = Object.keys(data.cps);
            l = data.cps[myKeys[0]].length,
            i = 0,
            cycleData = {},
            hydrideRatio = [];

        var nume = data.cps[this.config.hydrideRatio[0]],
            deno = data.cps[this.config.hydrideRatio[1]];
        for (i=0; i<l; i++) {
            hydrideRatio.push(nume[i] / deno[i]);
        }
        var hydrideOrder = Math.ceil(Math.log(d3.mean(hydrideRatio)) / Math.LN10) - 1;
        this.config['order'] = {hydride: hydrideOrder};

        nume = data.cps[this.config.deltaRatio[0]],
        deno = data.cps[this.config.deltaRatio[1]];
        for (i=0; i<l; i++) { // cycle loop
            cycleData = {cycle: (i + 1)}; // init + add cycle key 
            cycleData['cps'] = {};
            for (var k in myKeys) { // isotope loop for cps
                var key = myKeys[k];
                cycleData['cps'][key] = data.cps[key][i] / Math.pow(10, data.stat[key].order);
            }
            cycleData['delta'] = (nume[i] / deno[i] / this.config.deltaScale - 1) * 1000;
            cycleData['hydride'] = hydrideRatio[i] / Math.pow(10, hydrideOrder);
            out.push(cycleData);
        }
        return out;
    },

    checkIsoSys: function(data) {
        var element = 'O';
        return Object.keys(data.cps)[0].replace(/\d+/, '');
    },

    formatLabels: function(txt) {
        var pa1 = /(\d+)/g,
            re1 = '<tspan baseline-shift="super" font-size="60%">$1</tspan>',
            // suf = '</tspan>',
            pa2 = /delta/g,
            re2 = '\u03B4',
            ret = txt.replace(' ', '').replace(pa1, re1).replace(pa2,re2);
        return '<tspan>' + ret + '</tspan>';
    },

    isotopeSysConfig: function(iso) {
        if (iso === 'O' || iso === 'O2') {
            var Scale = this.VSMOW,
                // [0: 16O, 1: 16O 1H, 2: 18O]
                dRatio = ['18O', '16O'], // [numerator, denominator]
                hRatio = ['16O 1H', '16O'];
                color = {
                    cps: {
                        '16O':    'red',
                        '18O':    'green',
                        '16O 1H': '#00A7EA'
                    },
                    hydride: '#24557F',
                    delta: 'magenta'
                    // delta: '#f172ac'
                    // delta: '#FDAA4C'
                },
                label = {
                    cps: 'cps',
                    hydride: this.formatLabels('16O1H/16O'),
                    delta: this.formatLabels('delta18O'),
                },
                suffix = {
                    hydride: '',
                    delta: '[\u2030]'
                };
        } else if (iso === 'C') {
            var Scale = this.PDB,
                // [0: 12C, 1: 13C, 2: 13C 1H]
                dRatio = ['13C', '12C']; // [numerator, denominator]
                hRatio = ['13C 1H', '13C'];
                color = {
                    cps: {
                        '12C':    'red', 
                        '13C':    'green', 
                        '13C 1H': '#00A7EA'
                    },
                    hydride: '#24557F',
                    // delta: '#FC4482'
                    delta: 'magenta'
                },
                label = {
                    cps: 'cps',
                    hydride: this.formatLabels('13C1H/13C'),
                    delta: this.formatLabels('delta13C'),
                },
                suffix = {
                    hydride: '',
                    delta: '[\u2030]'
                };
        }

        return {
            deltaScale: Scale,
            deltaRatio: dRatio,
            hydrideRatio: hRatio,
            color: color,
            labels: label,
            suffix: suffix
        };
    }
}
