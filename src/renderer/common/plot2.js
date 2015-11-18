'use strict';

var d3 = require('d3');

module.exports = function () {
	var svg,
		data,
		stat,
		filename = undefined,
		comment = undefined,
		printFlag = false,
		frameWidth = 980,
		frameHeight = 680,
		margin = {top: 35, right: 20, bottom: 60, left: 60},
		titles = ['comment'],
		plottypes = ['cps'],
		averages = ['delta'],
		config,
		myScale = {},
		maskedData = [],
		circleSize = 5,
		myPlot = {},



		PDB = 0.0112372,
		VSMOW = 0.00200520;

	function my() {};

	my.height = function(value) {
		if (!arguments.length) return frameHeight;
		frameHeight = value;
		return my;
	};

	my.width = function(value) {
		if (!arguments.length) return frameWidth;
		frameWidth = value;
		return my;
	};

	my.filename = function(value) {
		if (!arguments.length) return filename;
		filename = value;
		return my;
	};

	my.comment = function(value) {
		if (!arguments.length) return comment;
		comment = value;
		return my;
	};

	my.plottype = function(value) {
		if (!arguments.length) return plottypes;
		if (typeof value === "object") {
			plottypes = value;
		}
		return my;
	};

	my.average = function(value) {
		if (!arguments.length) return averages;
		if (typeof value === "object") {
			averages = value;
		}
		return my;
	};

	my.setData = function(values) {
		data = values
		stat = data.stat;
		config = isotopeSysConfig();
		data['plotData'] = makePlotData(data);

		return my;
	};

	my.title = function(value) {
		if (!arguments.length) return titles;
		if (typeof value === "object") {
			titles = value;
		}
		return my;
	};

	my.maskedData = function(value) {
		if (!arguments.length) return maskedData;
		if (typeof value === "object") {
			maskedData = value;
		}
		return my;
	};

	my.printflag = function(value) {
		if (!arguments.length) return printFlag;
		printFlag = value;
		return my;
	};

	my.margin = function(value) {
		if (!arguments.length) return margin;
		if (typeof value === "object") {
			margin = value;
		}
		return my;
	};

	my.updateTitle = function() {
		var title = [],
			txt = '';
		titles.forEach(function(v, i) {
			txt = v === 'filename' ? filename : comment;
			if (i === 1) {
				txt = '<tspan font-weight="normal">[' + txt + ']</tspan>';
			}
			title.push(txt);
		});
		svg.select('.title-text').attr({
			'text-anchor': 'middle',
			x: (frameWidth - margin.left - margin.right) / 2 + margin.left,
			y: margin.top - 10, // title y-position from topmost
			'font-weight': 'bold',
		}).html(title.join(' '));
	};

	my.updateAverage = function() {
		averages.forEach(function(t, i) {
			var obj = myPlot[t];
			var stat = calcAverage(t),
				avLine = obj.select('.average-line'),
				avText = obj.select('.average-text'),
				l = data.plotData.length;

			if (avLine.empty()) {
				avLine = obj.append('g').append('line').classed('average-line', true);
				var yVal= (printFlag) ? stat.mean : stat.min
				avLine.attr({
					x1: myScale[t].x(1), x2: myScale[t].x(l),
					y1: myScale[t].y(yVal), y2: myScale[t].y(yVal),
					fill: 'none',
					stroke: config.color[t],
					'stroke-width': 1,
					'stroke-dasharray': ("6, 3")
				});
			}
			if (avText.empty()) {
				avText = obj.append('g').append('text').classed('average-text', true);
				avText.attr({
					fill: config.color[t],
					'font-size': '12px',
					'text-anchor': 'end',
					x: myScale[t].x(l), y: 20
				});
			}
			avLine.transition().ease('elastic').duration(500)
				.attr({y1: myScale[t].y(stat.mean), y2: myScale[t].y(stat.mean)});
			var suffix = (t==='hydride') ? ' [\u00D7E' + config.order.hydride + ']' : ' [\u2030]';
			avText.text('Average & 2SE: ' + f02(stat.mean) + ' ± ' + f02(stat.se2) + suffix);
		})
	};

	my.draw = function(target) {
		svg = d3.select(target);
		var width = frameWidth - (margin.left + margin.right),
			height = (frameHeight - (margin.top + margin.bottom)) / plottypes.length; // divide by number of plots
		svg.html('').append('g').append('rect').classed('background', true).attr({
			width: frameWidth,
			height: frameHeight,
			fill: '#ffffff',
			stroke: 'none'
		});
		var container = svg.append('g').classed('chart-frame', true)
			svg.attr({
				width: width + margin.left + margin.right,
				height: plottypes.length * height + margin.top + margin.bottom
			});
		svg.append('g').classed('title', true)
			.append('text')
			.append('tspan').classed('title-text', true);
		if (!printFlag) {
			var currentVal = svg.append('g').classed('current-values', true).attr({
						'font-size': '11px',
						'text-anchor': 'start',
						transform: 'translate(' + margin.left + ',' + (frameHeight - 5)  + ')'
					});
			var vline = container.append('g').attr({
					transform: 'translate(' + margin.left + ',' + margin.top + ')',
					width: width,
					height: plottypes.length * height,
				}).append('line').classed('vline hide', true).attr({
					x1: 0, x2: 0,
					y1: 0, y2: plottypes.length * height,
					fill: 'none',
					stroke: 'rgba(255,0,255,0.8)',
					'stroke-width': .2
				});

			var maskedArea = container.append('g').classed('masked-area', true)
							.append('rect').attr({
								height: plottypes.length * height,
								width: 0,
								transform: 'translate(' + margin.left + ',' + margin.top + ')',
								fill: 'rgba(255,0,0,0.1)'
							});
		}
		var x = 0, y = 0;
		for (var i in plottypes) {
			var t = plottypes[i];
			// Create scales
			myScale[t] = {
				x: d3.scale.linear().domain([0, data.cycleNumber + 1]).range([0, width]),
				y: d3.scale.linear().domain(getRange(t)).range([height, 0])
			}
			myScale['x'] = myScale[t].x;
			// Create plot frame
			x = margin.left, y = (margin.top/1 + i * height/1);
			myPlot[t] = container.append('g').classed('plot ' + t, true)
					.attr({
						transform: "translate(" + x + "," + y + ")",
						width: width,
						height: height,
					});
			var lastFlag = (parseInt(i) === (parseInt(plottypes.length) - 1)) ? true : false;
			// Create Axis bases
			var xAxis = makeAxis(myPlot[t], 'x', t, height, lastFlag),
				yAxis = makeAxis(myPlot[t], 'y', t, width);
			// Axis title
			yAxis.append("text")
				.attr({
					y: -34,
					x: -height / 2,
					transform: 'rotate(-90)',
				}).style({
					'font-size': '16px',
					"text-anchor": "middle",
				}).html(config.labels[t]);

			// Create line and point frame
			myPlot[t].append('g').classed('line', true);
			myPlot[t].append('g').classed('point', true);
			var line = myPlot[t].select('.line').selectAll('path')
								.data(data.plotData)
								.enter()
								.append('g');

			var point = myPlot[t].select('.point').selectAll('circle')
								.data(data.plotData)
								.enter()
								.append('g');

			drawConnLine(line, t);
			drawPoints(point, t, circleSize);
			if (t === 'cps') addCPSLegend();
		}

		my.updateTitle();
		my.updateAverage();

		xAxis.append('text').text('Cycle #').attr({
			y: 30,
			x: width / 2,
			'text-anchor': 'middle',
		}).style({
			'font-size': '14px',
		});

		if (!printFlag) {
			var mouseReceiver = container.append('g').classed('mouse-receiver', true).append('rect').attr({
				transform: 'translate(' + margin.left + ',' + margin.top + ')',
				width: width,
				height: plottypes.length * height,
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
				svg.select('.current-values').classed('hide', false);
			});
			mouseReceiver.on('mouseout', function() {
				vline.classed('hide', true);
				svg.select('.current-values').classed('hide', true);
			});
			mouseReceiver.on('mousemove', function() {
				if (startPointX > 0) return; // dragging

				if (isHover(this)) {
					vline.classed('hide', false);
					svg.select('.current-values').classed('hide', false);
				} else {
					vline.classed('hide', true);
					svg.select('.current-values').classed('hide', true);
					return;
				}

				var m = d3.mouse(this);
				var x = myScale[t].x(d3.round(myScale[t].x.invert(m[0])))
				vline.attr({x1: x, x2: x});
				updateCurrentValue(parseInt(myScale[t].x.invert(x), 10));
			});

			mouseReceiver.on('dblclick', function() {
				if (isHover(this)) return;
				maskedData = [];
				svg.selectAll('.masked').classed('masked', false);
				plottypes.map(function(t) {
					myPlot[t].selectAll('.connLines').remove();
					drawConnLine(myPlot[t], t);
				});
				my.updateAverage();
			});

			// data masking
			var dragstarted = function(d) {
				if (!isHover(this)) return;

				startPointX = getCurrentX(this);
				maskedArea.attr({
					x: myScale.x(startPointX - 0.3)
				}).classed('hide', false);
				vline.classed('hide', true);
			};
			var dragged = function() {
				if (!isHover(this) || startPointX < 0) return;

				var currentX = getCurrentX(this);
				var diff = currentX - startPointX;
				var x = (diff < 0) ? currentX : startPointX;
				var margin = myScale.x(0.3);
				maskedArea.attr({
					x: myScale.x(x) - margin,
					width: Math.abs(myScale.x(diff)) + margin * 2
				});
			};
			var dragended = function() {
				if (startPointX < 0) return;
				var currentX = getCurrentX(this);
				currentX = (currentX < 1) ? 1 : currentX;
				var current = myScale.x(currentX);
				var maskRange = [startPointX, currentX].sort(function(a,b){ return a-b });
				if (!isHover(this)) {
					currentX = (data.cycleNumber < currentX) ? data.cycleNumber : 1;
				}
				maskedArea.attr({width: 0}).classed('hide', true);
				maskData(container, maskRange, myPlot);
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
		if (maskedData.length) {
			var p = svg.selectAll('.point');
			maskedData.forEach(function(cycle) {
				p.selectAll('g').forEach(function(v, j) {
					d3.select(v[cycle - 1])
						.selectAll('circle').classed('masked', true);
				});
			});
		}
	};

	// private
	var makePlotData = function() {
		var out = [],
			myKeys = Object.keys(data.cps);
		var l = data.cps[myKeys[0]].length,
			i = 0,
			cycleData = {},
			hydrideRatio = [];

		var nume = data.cps[config.hydrideRatio[0]],
		deno = data.cps[config.hydrideRatio[1]];
		for (i=0; i<l; i++) {
			hydrideRatio.push(nume[i] / deno[i]);
		}
		var hydrideOrder = Math.ceil(Math.log(d3.mean(hydrideRatio)) / Math.LN10) - 1;
		config['order'] = {hydride: hydrideOrder};

		nume = data.cps[config.deltaRatio[0]],
		deno = data.cps[config.deltaRatio[1]];
		for (i=0; i<l; i++) { // cycle loop
		cycleData = {cycle: (i + 1)}; // init + add cycle key
		cycleData['cps'] = {};
		for (var k in myKeys) { // isotope loop for cps
			var key = myKeys[k];
			cycleData['cps'][key] = data.cps[key][i] / Math.pow(10, data.stat[key].order);
		}
		cycleData['delta'] = (nume[i] / deno[i] / config.deltaScale - 1) * 1000;
		cycleData['hydride'] = hydrideRatio[i] / Math.pow(10, hydrideOrder);
		out.push(cycleData);
		}
		return out;
	};
	var makeAxis = function(obj, pos, t, maxsize, lastFlag) {
		// var maxsize = pos === 'x' ? height : width;
		if (pos === 'x') {
			var orient = 'bottom',
				tickSize = 6,
				ticks = 4,
				scale = myScale.x,
				attr = {
					'class': 'x axis',
					transform: "translate(0," + maxsize + ")"
				};
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
				ticks = 5,
				scale = myScale[t].y;
		}
		var Axis = d3.svg.axis()
					.scale(scale)
					.ticks(ticks)
					.orient(orient)
					.tickSize(-tickSize, -maxsize);
		if (pos === 'x' && lastFlag===false) Axis.tickFormat('');
		return obj.append('g').attr(attr).call(Axis);
	};

	var drawConnLine = function(obj, t) {
		var lineGen = null;
		var keys = (t==='cps') ? Object.keys(data.plotData[0].cps) : ['dummy'];

		keys.forEach(function(v, i) {
			lineGen = d3.svg.line()
						.x(function(d) { return myScale[t].x(d.cycle); })
						.y(function(d) { return myScale[t].y(t==='cps' ? d.cps[v] : d[t]); });
			obj.append('path').classed('connLines', true)
				.attr({
					d: lineGen(filterMaskedData()),
					stroke: t==='cps' ? config.color[t][v] : config.color[t],
					'stroke-width': 1, fill: 'none'
				});
		})
	};

	var drawPoints = function(obj, t, size) {
		var keys = (t==='cps') ? Object.keys(data.plotData[0].cps) : ['dummy'];
		keys.forEach(function(v, i) {
			obj.append("circle")
				.attr({
					cx: function(d) { return myScale[t].x(d.cycle); },
					cy: function(d) { return myScale[t].y(t==='cps' ? d.cps[v] : d[t]); },
					r: size||10, stroke: 'none',
					fill: t==='cps' ? config.color[t][v] : config.color[t]
				});
		});
	};

	var calcAverage = function(t) {
		var i = 0,
			v = [];
		filterMaskedData().forEach(function(o, i) {
			v.push(o[t]);
		});
		return {
			mean:   d3.mean(v),
			stdev2: d3.deviation(v) * 2,
			se2:  (d3.deviation(v) * 2) / Math.sqrt(v.length),
			min:  d3.min(v),
			max:  d3.max(v)
		};
	};

	var maskData = function(obj, range, plotObj) {
		var ind = -1,
			classFlag = true,
			p = svg.selectAll('.point');

		if (typeof range === 'number') range = [range, range];
		for (var i=range[0]; i<=range[1]; i++) {
			ind = maskedData.indexOf(i);
			if (ind === -1) {
				maskedData.push(i);
				classFlag = true;
			} else {
				maskedData.splice(ind, 1);
				classFlag = false;
			}
			p.selectAll('g').forEach(function(v, j) {
				d3.select(v[i - 1]).selectAll('circle')
					.classed('masked', classFlag);
			});
		}
		if (maskedData.length === data.cycleNumber) {
			alert('You can\'t mask all cycles!');
			for (var i=range[0]; i<=range[1]; i++) {
				ind = maskedData.indexOf(i);
				if (ind === -1) {
					maskedData.push(i);
					classFlag = true;
				} else {
					maskedData.splice(ind, 1);
					classFlag = false;
				}
				p.selectAll('g').forEach(function(v, j) {
					d3.select(v[i - 1]).selectAll('circle')
						.classed('masked', classFlag);
				});
			}
			return;
		}
		plottypes.forEach(function(v, i) {
			plotObj[v].selectAll('.connLines').remove();
			drawConnLine(plotObj[v], v);
		});
		my.updateAverage();
	};

	var updateCurrentValue = function(cycle) {
		var txt = '',
			t = '',
			suffix = '',
			label = '',
			padding = 10,
			xOffset = 48.90625 + padding,
			cv = svg.select('.current-values'),
			color = config.color;

		cv.selectAll("*").remove();

		cv.append('text').text('Cycle# ' + cycle);
		plottypes.forEach(function(v, i) {
			if (v === 'cps') {
				suffix = ' [cps]';
				d3.keys(data.cps).forEach(function(vv, ii) {
					txt = formatLabels(vv) + ': ' + data.cps[vv][cycle - 1] + suffix;
					t = cv.append('text').html(txt).attr({
						x: xOffset,
						fill: color.cps[vv],
					});
					xOffset += t.node().getBBox().width + padding;
				});
			} else {
				label = config.labels[v];
				suffix = (v === 'hydride') ? ' [\u00D7E' + config.order['hydride'] + ']' : ' [\u2030]';
				txt = label + ': ' + f03(data.plotData[cycle - 1][v]) + suffix;
				t = cv.append('text').html(txt).attr({
					x: xOffset,
					fill: color[v],
				});
				xOffset += t.node().getBBox().width + padding;
			}
		});
	};

	var addCPSLegend = function() {
		var obj = myPlot['cps']
		if (!obj.select('.legend').empty()) return;
		var keys = d3.keys(stat);
		var legendXPos = data.cycleNumber>40 ? parseInt(data.cycleNumber/20) : 1;
		var legend = obj.append('g').classed('legend', true).attr({
			transform: 'translate('+ myScale.cps.x(legendXPos) + ',' + 20 + ')'
		});
		var color = config.color.cps;
		var li = '';
		var r = circleSize;
		var xOffset = 0;
		keys.forEach(function(v, i) {
			li = legend.append('g').classed('legend-item', true);
			li.append('circle').attr({
				fill: color[v],
				stroke: 'none',
				r: r,
				cx: 0, cy: -(6 - r/2)
			});
			var myOrder = ' [\u00D7E+' + stat[v].order + ']';
			li.append('text').html(formatLabels(v) + myOrder).attr({
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
		});
	};

	var getCurrent = function(me) {
		return myScale.x(getCurrentX(me));
	};

	var getCurrentX = function(me) {
		return d3.round(myScale.x.invert(d3.mouse(me)[0]));
	};

	var isHover = function(me) {
		var currentX = getCurrentX(me);
		return (currentX > 0 && currentX <= data.cycleNumber);
	};

	var filterMaskedData = function() {
		return data.plotData.filter(function(v, i) {
			return maskedData.indexOf(i + 1) < 0
		});
	};

	var isotopeSysConfig = function(iso) {
		var iso = Object.keys(data.cps)[0].replace(/\d+/, '');
		if (iso === 'O' || iso === 'O2') {
			// [0: 16O, 1: 16O 1H, 2: 18O]
			var Scale = VSMOW,
				dRatio = ['18O', '16O'], // [numerator, denominator]
				hRatio = ['16O 1H', '16O'],
				color = {
					cps: {
						'16O':    'red',
						'18O':    'green',
						'16O 1H': '#00A7EA'
					},
					hydride: '#24557F',
					delta: 'magenta'
				},
				label = {
					cps: 'cps',
					hydride: formatLabels('16O1H/16O'),
					delta: formatLabels('delta18O'),
				},
				suffix = {
					hydride: '',
					delta: '[\u2030]'
				};

		} else if (iso === 'C') {
			// [0: 12C, 1: 13C, 2: 13C 1H]
			var Scale = PDB,
				dRatio = ['13C', '12C']; // [numerator, denominator]
				hRatio = ['13C 1H', '13C'],
				color = {
					cps: {
						'12C':    'red',
						'13C':    'green',
						'13C 1H': '#00A7EA'
					},
					hydride: '#24557F',
				delta: 'magenta'
				},
				label = {
					cps: 'cps',
					hydride: formatLabels('13C1H/13C'),
					delta: formatLabels('delta13C'),
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
	};

	var formatLabels = function(txt) {
		var pa1 = /(\d+)/g,
		re1 = '<tspan baseline-shift="super" font-size="60%">$1</tspan>',
		pa2 = /delta/g,
		re2 = '\u03B4',
		ret = txt.replace(' ', '').replace(pa1, re1).replace(pa2,re2);
		return '<tspan>' + ret + '</tspan>';
	};

	var getRange = function(dataType, plotYMargin) {
		// plotYMargin [%]
		var values = [],
			myKeys = [],
			i = 0,
			vMargin = averages.length ? 0.5 : 0;
		var plotYMargin = plotYMargin || 20;

		if (dataType === 'cps') {
			myKeys = d3.keys(data.plotData[0].cps);
			for (i=0; i<data.plotData.length; i++) {
				myKeys.forEach(function(v) {
					values.push(data.plotData[i]['cps'][v]);
				});
			}
		} else {
			data.plotData.forEach(function(v, i) {
				values.push(data.plotData[i][dataType]);
			});
		}
		var vmax = d3.max(values), vmin = d3.min(values);
		plotYMargin = Math.abs(vmax - vmin) * plotYMargin / 100 || 0;
		return [vmin - plotYMargin, vmax + plotYMargin * (1 + vMargin)];
	};

	var f02 = d3.format('0.2f');
	var f03 = d3.format('0.3f');
	var f04 = d3.format('0.4f');
	var f05 = d3.format('0.5f');




	return my;
}();
