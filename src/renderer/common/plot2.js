'use strict';

var d3 = require('d3');

module.exports = function () {
	var svg,
		data,
		stat,
		filename,
		comment,
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
		circleSize = 4,
		myPlot = {},
		yRange = {
			'cps': 0,
			'hydride': 0,
			'delta': 0,
			'capDelta': 0
		},
		significantDigit = {
			'cps':      d3.format('0.3f'),
			'hydride':  d3.format('0.4f'),
			'delta':    d3.format('0.3f'),
			'capDelta': d3.format('0.3f')
		},


		PDB = 0.0112372,
		VSMOW = 0.00200520,
		// VSMOW17 = 0.000379939, // wikipedia (VSMOW)
		VSMOW17 = 0.00038300,  // back calc from .asc data (Noriko's value)
		CDT   = 1 / 22.6436,
		CDT33 = 1 / 126.948,
		CDT36 = 1 / 6641,  // Taka's value
		// CDT36 = 1 / 6515;  // CDT
		AIR = 0.0036765; // 15N/14N(air) nitrogen isotopes

	function my() {}

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

	my.yRange = function(plottype, rng) {
		if (!arguments.length) return yRnage;
		if (arguments.length === 1) return yRange[plottype];
		if (typeof rng === "number") {
			yRange[plottype] = rng;
		} else if (isNaN(rng)) {
			yRange[plottype] = 0;
		}

		return my;
	}

	my.significantDigit = function(plottype, sd) {
		if (!arguments.length) return significantDigit;
		if (arguments.length === 1) return significantDigit[plottype];
		if (typeof sd == "number") {
			significantDigit[plottype] = d3.format('0.' + sd + 'f');
		}
		return my;
	}

	my.average = function(value) {
		if (!arguments.length) return averages;
		if (typeof value === "object") {
			averages = value;
		}
		return my;
	};

	my.setData = function(values) {
		data = values;
		stat = data.stat;
		config = isotopeSysConfig();
		plottypes = my.filterPlotTypes();
		data.plotData = makePlotData(data);

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
		var obj, myStat, avLine, avText, l;
		var aves = '';
		var sigD;
		averages.forEach(function(t, i) {
			if (plottypes.indexOf(t) === -1) return;
			obj = myPlot[t];
			myStat = calcAverage(t);
			avLine = obj.select('.average-line');
			avText = d3.select('.average-text.average-text-'+t);
			l = data.plotData.length;
			sigD = my.significantDigit(t.replace(/\d$/, ''));
			if (avLine.empty()) {
				var yVal;
				if (t === 'cps') {
					d3.keys(stat).forEach(function(v, i) {
						avLine = obj.append('g').append('line').classed('average-line average-line-'+v.replace(' ', ''), true);
						yVal = (printFlag) ? myStat[v].mean : myStat[v].min;
						avLine.attr({
							x1: myScale[t].x(1), x2: myScale[t].x(l),
							y1: myScale[t].y(yVal), y2: myScale[t].y(yVal),
							fill: 'none',
							stroke: config.color.cps[v],
							'stroke-width': 1,
							'stroke-dasharray': ("6, 3")
						});
					});
				} else {
					avLine = obj.append('g').append('line').classed('average-line', true);
					yVal = (printFlag) ? myStat.mean : myStat.min;
					avLine.attr({
						x1: myScale[t].x(1), x2: myScale[t].x(l),
						y1: myScale[t].y(yVal), y2: myScale[t].y(yVal),
						fill: 'none',
						stroke: config.color[t],
						'stroke-width': 1,
						'stroke-dasharray': ("6, 3")
					});
				}
			}

			if ((printFlag || avText.empty()) && t !== 'cps') {
				var myCF = d3.selectAll('.chart-frame')[0];
				myCF = myCF[myCF.length - 1];
				avText = d3.select(myCF)
									.append('g')
									.append('text').classed('average-text average-text-' + t, true);
				var parentPos = myPlot[t].attr('transform').match(/([\.\-\d]+)/ig);
				avText.attr({
					fill: config.color[t],
					'font-size': '12px',
					'text-anchor': 'end',
					x: myScale[t].x(l) + parentPos[0]/1,
					y: parentPos[1]/1 + 20
				})
				.on('click', function() {
					var myOrder;
					var myStat = calcAverage(t);
					if (/delta/i.test(t)) {
						myOrder = 1;
					} else if (t === 'hydride') {
						myOrder = Math.pow(10, config.order.hydride);
					}
					copyDataToClickBoard(myStat.mean * myOrder + '\t' + myStat.se2 * myOrder);
				});
			}

			if (t !== 'cps') {
				avLine.transition()
							.ease('elastic')
							.duration(500)
							.attr({
								y1: myScale[t].y(myStat.mean),
								y2: myScale[t].y(myStat.mean)
							});
			}

			if (t === 'cps') {
				var xOffset = 0;
				var tmp = d3.selectAll('.legend')[0];
				var myLegend = d3.select(tmp[tmp.length - 1]);
				var myParents = myLegend.selectAll('.legend-item')[0];
				d3.keys(stat).forEach(function(v, i) {
					var li = d3.select(myParents[i]);
					var myTarget = li.select('.ave2se-' + v.replace(' ',''));
					if (!printFlag) {
						myTarget.on('click', function() {
							var myStat = calcAverage('cps');
							copyDataToClickBoard(myStat[v].mean * Math.pow(10, stat[v].order) + '\t' +
																	 myStat[v].se2 * Math.pow(10, stat[v].order));
						});
					}
					var myOrder = ' [\u00D710<tspan baseline-shift="super" font-size="60%">' + stat[v].order + '</tspan>]';
					myTarget.html(': ' + sigD(myStat[v].mean) + ' ± ' + sigD(myStat[v].se2) + myOrder);
					li.attr({transform: 'translate(' + xOffset + ',0)'});
					xOffset += li.node().getBBox().width + 20; // padding-right = 20
					d3.select('.average-line-'+v.replace(' ','')).transition()
								.ease('elastic')
								.duration(500)
								.attr({
									y1: myScale[t].y(myStat[v].mean),
									y2: myScale[t].y(myStat[v].mean)
								});
				});
			} else {
				var suffix = (t==='hydride') ? ' [\u00D710<tspan baseline-shift="super" font-size="60%">' + config.order.hydride + '</tspan>]' : ' [\u2030]';
				avText.html('Average & 2SE: ' + sigD(myStat.mean) + ' ± ' + sigD(myStat.se2) + suffix);
			}
		});
	};

	my.filterPlotTypes = function() {
		var out = plottypes.filter(function(v, i) {
			if (v==='cps') return true;
			if (v==='hydride' && /(H$|AlMg)/.test(data.isoSys)) return true;
			if (/delta$/i.test(v)) return true;
			return false;
		});
		return out;
	};

	my.checkMultiDelta = function() {
		var deltaPos = plottypes.indexOf('delta');
		if (deltaPos > -1) {
			if (config.deltaScale2 && plottypes.indexOf('delta2') < 0) {
				plottypes.splice(deltaPos + 1, 0, 'delta2');
				var averageDeltaPos = averages.indexOf('delta');
				if (averageDeltaPos > -1) {
					averages.splice(averageDeltaPos + 1, 0, 'delta2');
				}
			}
			if (config.deltaScale3 && plottypes.indexOf('delta3') < 0) {
				var deltaPos2 = plottypes.indexOf('delta2');
				if (deltaPos2 > -1) {
					plottypes.splice(deltaPos2 + 1, 0, 'delta3');
					var averageDeltaPos = averages.indexOf('delta2');
					if (averageDeltaPos > -1) {
						averages.splice(averageDeltaPos + 1, 0, 'delta3');
					}
				}
			}
		}
		var capDeltaPos = plottypes.indexOf('capDelta');
		if (capDeltaPos > -1) {
			if (config.capDelta2 && plottypes.indexOf('capDelta2') < 0) {
				plottypes.splice(capDeltaPos + 1, 0, 'capDelta2');
				var averageDeltaPos = averages.indexOf('capDelta');
				if (averageDeltaPos > -1) {
					averages.splice(averageDeltaPos + 1, 0, 'capDelta2');
				}
			}
		}

	};

	// ===========================================================================
	my.errorDraw = function(target, txt) {
		svg = d3.select(target);
		txt = 'Error: ' + txt;
		svg.html('').append('g').append('text').html(txt).attr({
			'font-size': '28px',
			'text-anchor': 'start',
			fill: 'red',
			transform: 'translate(100, 50)',
		});
	}
	my.draw = function(target) {
		my.checkMultiDelta();
		svg = d3.select(target);
		var plotCounts = plottypes.length;
		var mouseReceiver;
		var width = frameWidth - (margin.left + margin.right),
			height = (frameHeight - (margin.top + margin.bottom)) / plotCounts; // divide by number of plots
		svg.html('').append('g').append('rect').classed('background', true).attr({
			width: frameWidth,
			height: frameHeight,
			fill: '#ffffff',
			stroke: 'none'
		});
		var container = svg.append('g').classed('chart-frame', true);
		svg.attr({
			width: width + margin.left + margin.right,
			height: plotCounts * height + margin.top + margin.bottom
		});
		var clipBoxes = container.append('defs').attr('id', 'clip-boxes');
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
					height: plotCounts * height,
				}).append('line').classed('vline hide', true).attr({
					x1: 0, x2: 0,
					y1: 0, y2: plotCounts * height,
					fill: 'none',
					stroke: 'rgba(255,0,255,0.8)',
					'stroke-width': 0.2
				});

			var maskedArea = container.append('g').classed('masked-area', true)
							.append('rect').attr({
								height: plotCounts * height,
								width: 0,
								transform: 'translate(' + margin.left + ',' + margin.top + ')',
								fill: 'rgba(255,0,0,0.1)'
							});
		}
		var x = 0, y = 0;
		var xAxis, yAxis;
		var t;

		for (var i in plottypes) {
			t = plottypes[i];
			// Create scales
			var myTempRange = [];
			if (my.yRange(t)) {
				myTempRange = getFixedRange(t, my.yRange(t));
			} else {
				myTempRange = getRange(t);
			}
			myScale[t] = {
				x: d3.scale.linear().domain([0, data.cycleNumber + 1]).range([0, width]),
				y: d3.scale.linear().domain(myTempRange).range([height, 0])
			};
			myScale.x = myScale[t].x;
			// Create plot frame
			x = margin.left; y = (margin.top/1 + i * height/1);
			// create clip path
			// clipBoxes.append('clipPath').attr('id', 'clippath' + t)
			// 		.append('rect').attr({
			// 			width: width,
			// 			height:height,
			// 			transform: "translate(" + x + "," + y + ")"
			// 			// transform: "translate(0,0)"
			// 		});
			myPlot[t] = container.append('g').classed('plot ' + t, true)
					.attr({
						transform: "translate(" + x + "," + y + ")",
						width: width,
						height: height,
					});
			var lastFlag = (parseInt(i) === (parseInt(plotCounts) - 1)) ? true : false;
			// Create Axis bases
			xAxis = makeAxis(myPlot[t], 'x', t, height, lastFlag);
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

			// create clip path
			myPlot[t].append('clipPath').attr('id', 'clippath' + t)
			.append('rect').attr({
				width: width,
				height: height,
				// transform: "translate(" + x + "," + y + ")"
				transform: "translate(0,0)"
			});
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
		}
		if (!printFlag) {
			mouseReceiver = container.append('g').classed('mouse-receiver', true).append('rect').attr({
				transform: 'translate(' + margin.left + ',' + margin.top + ')',
				width: width,
				height: plotCounts * height,
				fill: 'rgba(255,255,255,0)'
			});
		}
		if (plottypes.indexOf('cps') > -1) addCPSLegend();
		my.updateTitle();
		my.updateAverage();

		xAxis.append('text').text('Cycle #').attr({
			y: 30,
			x: width / 2,
			'text-anchor': 'middle',
		}).style({
			'font-size': '14px',
		});

		/*
		 * Actions
		 * - actions don't need for printing
		 */
		if (!printFlag) {
			d3.select('.background').on('dblclick', function() {
				resetMasking(target);
			});

			d3.select('.resetMaskBtn').on('click', function() {
				resetMasking(target);
				d3.select(this).classed('hide', true);
			});

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
				var x = myScale[t].x(d3.round(myScale[t].x.invert(m[0])));
				vline.attr({x1: x, x2: x});
				updateCurrentValue(parseInt(myScale[t].x.invert(x), 10));
			});

			mouseReceiver.on('dblclick', function() {
				if (isHover(this)) return;
				resetMasking(target);
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
				currentX = (currentX < 1) ? 1 : ((currentX > data.cycleNumber) ? data.cycleNumber : currentX);
				var current = myScale.x(currentX);
				var maskRange = [startPointX, currentX].sort(function(a,b){ return a-b; });
				if (!isHover(this)) {
					currentX = (data.cycleNumber < currentX) ? data.cycleNumber : 1;
				}
				maskedArea.attr({width: 0}).classed('hide', true);
				maskData(target, container, maskRange, myPlot, d3.event.sourceEvent.shiftKey);
				vline.attr({x1: current, x2: current }).classed('hide', false);
				startPointX = -1;
				d3.select('.resetMaskBtn').classed('hide', !maskedData.length);
				my.draw(target);
			};

			var drag = d3.behavior.drag()
						.on('dragstart', dragstarted)
						.on('drag', dragged)
						.on('dragend', dragended);

			mouseReceiver.call(drag);
		} // END - actions

		// Apply Masking status for each points
		if (maskedData.length) {
			var p = svg.selectAll('.point');
			maskedData.forEach(function(cycle) {
				p.selectAll('g').forEach(function(v, j) {
					d3.select(v[cycle - 1])
						.selectAll('circle').classed('masked', true);
				});
			});
		}
	}; // END - my.draw





	// private functions
	var copyDataToClickBoard = function(data) {
		const {clipboard} = require('electron');
		clipboard.writeText(data);
		var myAlert = d3.select('.clipboard-alert');
		if (myAlert.empty()) {
			myAlert = d3.select('#graph').append('div').attr({
				role: 'alert'
			}).style({opacity: 0})
			.classed('alert alert-danger clipboard-alert', true)
			.html('<strong>Yay!</strong> Average and 2SE have been copied to clipboard.');
		}
		myAlert.transition().delay(100)
			.style({opacity: 1, visibility: 'visible'})
			.transition().delay(1800).duration(1200)
			.style({opacity: 0})
			.transition().delay(3000).style({visibility: 'hidden'});
	};

	var resetMasking = function(target="#myPlot") {
		if (maskedData.length === 0) return;
		maskedData = [];
		svg.selectAll('.masked').classed('masked', false);
		my.draw(target);
		// plottypes.map(function(t) {
		// 	myPlot[t].selectAll('.connLines').remove();
		// 	drawConnLine(myPlot[t], t);
		// });
		// my.updateAverage();
		// d3.select('.resetMaskBtn').classed('hide', true);
	};

	var makePlotData = function() {
		var out = [],
			myKeys = Object.keys(data.cps);
		var l = data.cps[myKeys[0]].length,
			i = 0,
			cycleData = {},
			hydrideRatio = [],
			hydrideOrder,
			nume, deno;

		if (plottypes.indexOf('hydride') > -1) {
			nume = data.cps[config.hydrideRatio[0]];
			deno = data.cps[config.hydrideRatio[1]];
			for (i=0; i<l; i++) {
				hydrideRatio.push(nume[i] / deno[i]);
			}
			hydrideOrder = Math.ceil(Math.log(d3.mean(hydrideRatio)) / Math.LN10) - 1;
			config.order = {hydride: hydrideOrder};
		}


		nume = data.cps[config.deltaRatio[0]];
		deno = data.cps[config.deltaRatio[1]];

		if (config.deltaScale2) {
			var nume2 = data.cps[config.deltaRatio2[0]];
			var deno2 = data.cps[config.deltaRatio2[1]];
			if (config.deltaScale3) {
				var nume3 = data.cps[config.deltaRatio3[0]];
				var deno3 = data.cps[config.deltaRatio3[1]];
			}
		}

		for (i=0; i<l; i++) { // cycle loop
			cycleData = {cycle: (i + 1)}; // init + add cycle key
			cycleData.cps = {};
			for (var k in myKeys) { // isotope loop for cps
				var key = myKeys[k];
				cycleData.cps[key] = data.cps[key][i] / Math.pow(10, data.stat[key].order);
			}
			cycleData.delta = (nume[i] / deno[i] / config.deltaScale - 1) * 1000;
			if (config.deltaScale2) {
				cycleData.delta2 = (nume2[i] / deno2[i] / config.deltaScale2 - 1) * 1000;
				if (config.deltaScale3) {
					cycleData.delta3 = (nume3[i] / deno3[i] / config.deltaScale3 - 1) * 1000;
				}
				if (config.capDelta) {
					if (data.isoSys === 'AlMg') {
						cycleData.capDelta = config.capDelta(cycleData.delta, cycleData.delta3)
					} else {
						cycleData.capDelta = config.capDelta(cycleData.delta, cycleData.delta2)
					}
					if (config.capDelta2) {
						cycleData.capDelta2 = config.capDelta2(cycleData.delta, cycleData.delta3)
					}
				}
			}
			if (plottypes.indexOf('hydride') > -1) {
				cycleData.hydride = hydrideRatio[i] / Math.pow(10, hydrideOrder);
			}
			out.push(cycleData);
		}
		return out;
	};
	var makeAxis = function(obj, pos, t, maxsize, lastFlag) {
		var attr = {'class': 'y axis'},
				orient = 'left',
				tickSize = 6,
				ticks = 5,
				scale = myScale[t].y,
				Axis;

		if (pos === 'x') {
			orient = 'bottom';
			tickSize = 6;
			ticks = 4;
			scale = myScale.x;
			attr = {
				'class': 'x axis',
				transform: "translate(0," + maxsize + ")"
			};
				Axis = d3.svg.axis()
					.scale(scale)
					.ticks(ticks)
					.orient('bottom')
					.tickSize(tickSize, 0)
					.tickFormat('');
			obj.append('g').attr({class: 'x2 axis',transform: 'translate(0,0)'}).call(Axis);
		}
		Axis = d3.svg.axis()
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
					'stroke-width': 1, fill: 'none',
					'clip-path': "url(#clippath" + t + ")",
				});
		});
	};

	var drawPoints = function(obj, t, size) {
		var keys = (t==='cps') ? Object.keys(data.plotData[0].cps) : ['dummy'];
		keys.forEach(function(v, i) {
			obj.append("circle")
				.attr({
					cx: function(d) { return myScale[t].x(d.cycle); },
					cy: function(d) { return myScale[t].y(t==='cps' ? d.cps[v] : d[t]); },
					r: size||7, stroke: 'none',
					fill: t==='cps' ? config.color[t][v] : config.color[t],
					"clip-path": "url(#clippath" + t + ")",
				});
		});
	};

	var calcAverage = function(t) {
		var i = 0,
				v = [],
				alpha = [],
				cps = {},
				out = {},
				key;

		if (t === 'cps') {
			var myMaskedData = filterMaskedData();
			for(key in myMaskedData[0].cps) { cps[key] = []; }
			myMaskedData.forEach(function(o, i) {
				for(var key in o.cps) {
					cps[key].push(o.cps[key]);
				}
			});
			for(key in cps) {
				out[key] = {
					mean:   d3.mean(cps[key]),
					stdev2: 2 * d3.deviation(cps[key]),
					se2:  2 * d3.deviation(cps[key]) / Math.sqrt(cps[key].length),
					min:  d3.min(cps[key]),
					max:  d3.max(cps[key])
				};
			}
			return out;
		} 

		filterMaskedData().forEach(function(o, i) {
			v.push(o[t]);
			alpha.push(o[t] / 1000 + 1);
		});
		// console.log(t, v);
		if (/^delta/.test(t)) {
			out = {
				mean:   d3.mean(v),
				stdev2: 2 * 1000 * d3.deviation(alpha) / d3.mean(alpha),
				se2:  2 * 1000 * (d3.deviation(alpha) / Math.sqrt(alpha.length)) / d3.mean(alpha),
				min:  d3.min(v),
				max:  d3.max(v)
			};
		} else if (/^capDelta/.test(t)) {
			out = {
				mean:   d3.mean(v),
				stdev2: d3.deviation(v) * 2,
				se2:  (d3.deviation(v) * 2) / Math.sqrt(v.length),
				min:  d3.min(v),
				max:  d3.max(v)
			};
		} else {
			out = {
				mean:   d3.mean(v),
				stdev2: d3.deviation(v) * 2,
				se2:  (d3.deviation(v) * 2) / Math.sqrt(v.length),
				min:  d3.min(v),
				max:  d3.max(v)
			};
		}

		return out;
	};

	var maskData = function(target, obj, range, plotObj, inverseFlag=false) {
		var ind = -1,
			classFlag = true,
			p = svg.selectAll('.point'),
			originalMask;
		var applyMaskFlag = function(tar, k, flg) {
			tar.forEach(function(v, j) {
				d3.select(v[k - 1]).selectAll('circle').classed('masked', flg);
			});
		};

		if (typeof range === 'number') range = [range, range];
		originalMask = maskedData.slice(); // copy array

		if (inverseFlag) {
			maskedData = data.cps[Object.keys(data.cps)[0]].map(function(v, k) {
				applyMaskFlag(p.selectAll('g'), k + 1, true);
				return k + 1;
			});
		}

		for (var i=range[0]; i<=range[1]; i++) {
			ind = maskedData.indexOf(i);
			if (ind === -1) {
				maskedData.push(i);
				classFlag = true;
			} else {
				maskedData.splice(ind, 1);
				classFlag = false;
			}
			applyMaskFlag(p.selectAll('g'), i, classFlag);
		}
		if (maskedData.length === data.cycleNumber) {
			alert('Nope');
			resetMasking(target);
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
			sigD,
			padding = 10,
			xOffset = 48.90625 + padding,
			cv = svg.select('.current-values'),
			color = config.color;

		cv.selectAll("*").remove();

		cv.append('text').text('Cycle# ' + cycle);
		plottypes.forEach(function(v, i) {
			sigD = my.significantDigit(v.replace(/\d$/,''));
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
				suffix = (v === 'hydride') ? ' [\u00D710<tspan baseline-shift="super" font-size="60%">' + config.order.hydride + '</tspan>]' : ' [\u2030]';
				txt = label + ': ' + sigD(data.plotData[cycle - 1][v]) + suffix;
				t = cv.append('text').html(txt).attr({
					x: xOffset,
					fill: color[v],
				});
				xOffset += t.node().getBBox().width + padding;
			}
		});
	};

	var addCPSLegend = function() {
		var obj = myPlot.cps;
		var parentPos = obj.attr('transform').match(/([\.\-\d]+)/ig);
		if (!printFlag && !d3.select('.legend').empty()) return;
		var keys = d3.keys(stat);
		var legendXPos = data.cycleNumber>40 ? parseInt(data.cycleNumber/20) : 1;
		var myCF = d3.selectAll('.chart-frame')[0];
		var legend = d3.select(myCF[myCF.length - 1]).append('g').classed('legend', true).attr({
			transform: 'translate('+ (parentPos[0]/1 + myScale.cps.x(legendXPos)) + ',' + (parentPos[1]/1 + 20) + ')'
		});
		var legendTxtSize = keys.length > 3 ? 10 : 12;
		var color = config.color.cps;
		var li = '';
		var r = circleSize;
		var xOffset = 0;
		var myOrder = '';
		var average2se = '';
		var myAttrForText;
		keys.forEach(function(v, i) {
			li = legend.append('g').classed('legend-item', true);
			li.append('circle').attr({
				fill: color[v],
				stroke: 'none',
				r: r,
				cx: 0, cy: -(6 - r/2)
			});
			// myOrder = ' [\u00D7E+' + stat[v].order + ']';
			myAttrForText = {
				x: r + 4,
				y: 0,
				fill: color[v],
				stroke: 'none',
			};
			var myLegText = li.append('text')
				.attr(myAttrForText)
				.style({
					'font-size': legendTxtSize + 'px',
					'text-anchor': 'start'
				});
			myLegText.append('tspan').html(formatLabels(v));
			myLegText.append('tspan').classed('average-text ave2se-'+v.replace(' ',''), true);
			// myLegText.append('tspan').text(myOrder);
			li.attr({transform: 'translate(' + xOffset +', 0)'});
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
			return maskedData.indexOf(i + 1) < 0;
		});
	};


	var formatLabels = function(txt) {
		var pa1 = /(\d+\/\d+|\d)/g,
				re1 = '<tspan baseline-shift="super" font-size="60%">$1</tspan>',
				pa2 = /^d/,
				re2 = '\u03B4',
				pa3 = /^D/,
				re3 = '\u0394',
				ret = txt.replace(' ', '').replace(pa1, re1).replace(pa2,re2).replace(pa3,re3);
		return '<tspan>' + ret + '</tspan>';
	};
	var getFixedRange = (dataType, span) => {
		var values = [],
			myKeys = [],
			i = 0,
			k = 0;
		var dd = filterMaskedData();
		if (dataType === 'cps') {
			myKeys = d3.keys(dd[0].cps);
			for (i = 0; i < dd.length; i++) {
				for (k in myKeys) {
					values.push(dd[i].cps[myKeys[k]]);
				}
			}
		} else {
			dd.forEach(function (v, i) {
				values.push(dd[i][dataType]);
			});
		}

		var med = d3.median(values);
		var mea = d3.mean(values);
		return [med - span/2, med + span/2];
	};
	var getRange = function(dataType, plotYMargin) {
		// plotYMargin [%]
		var values = [],
				myKeys = [],
				i = 0,
				k = 0,
				vMargin = averages.length ? 0.5 : 0;
		plotYMargin = plotYMargin || 30;

		var dd = filterMaskedData();
		if (dataType === 'cps') {
			myKeys = d3.keys(dd[0].cps);
			for (i=0; i<dd.length; i++) {
				for (k in myKeys) {
					values.push(dd[i].cps[myKeys[k]]);
				}
			}
		} else {
			dd.forEach(function(v, i) {
				values.push(dd[i][dataType]);
			});
		}

		// if (dataType === 'cps') {
		// 	myKeys = d3.keys(data.plotData[0].cps);
		// 	for (i=0; i<data.plotData.length; i++) {
		// 		for (k in myKeys) {
		// 			values.push(data.plotData[i].cps[myKeys[k]]);
		// 		}
		// 	}
		// } else {
		// 	data.plotData.forEach(function(v, i) {
		// 		values.push(data.plotData[i][dataType]);
		// 	});
		// }
		var vmax = d3.max(values), vmin = d3.min(values);
		plotYMargin = Math.abs(vmax - vmin) * plotYMargin / 100 || 0;
		return [vmin - plotYMargin, vmax + plotYMargin * (1 + vMargin)];
	};

	var isotopeSysConfig = function() {
		// var iso2 = String(Object.keys(data.cps));
		// var iso = Object.keys(data.cps)[0].replace(/\d+/, '');
		// console.log(data.isoSys);

		// default values (d18O with OH)
		// O2H (oxygen two isotopes with OH)
		// [0: 16O, 1: 16O 1H, 2: 18O]
		var Scale = VSMOW,
			Scale2 = null,
			Scale3 = null,
			dRatio = ['18O', '16O'], // [numerator, denominator]
			dRatio2 = null,
			dRatio3 = null,
			capDelta = null,
			capDelta2 = null,
			hRatio = ['16O 1H', '16O'],
			color = {
				cps: {
					'16O':    'red',
					'18O':    'green',
					'16O 1H': '#00A7EA',
					'16O1H':  '#00A7EA'
				},
				hydride: '#24557F',
				delta:   'magenta',
			},
			label = {
				cps: 'cps',
				hydride: formatLabels('16O1H/16O'),
				delta: formatLabels('d18O'),
			},
			suffix = {
				hydride: '',
				delta: '[\u2030]',
			};

		// if (iso === 'C') {
		if (data.isoSys === 'C2H') {
			// C2H (carbon two isotopes with CH)
			// [0: 12C, 1: 13C, 2: 13C 1H]
				Scale = PDB;
				dRatio = ['13C', '12C']; // [numerator, denominator], ratio for delta
				hRatio = ['13C 1H', '13C'];
				color = {
					cps: {
						'12C':    'red',
						'13C':    'green',
						'13C 1H': '#00A7EA',
						'13C1H':  '#00A7EA'
					},
					hydride: '#24557F',
					delta: 'magenta'
			};
			label = { // for y axes and legends
					cps: 'cps',
					hydride: formatLabels('13C1H/13C'),
					delta: formatLabels('d13C'),
			};
			suffix = { // units and etc...
				hydride: '',
				delta: '[\u2030]'
			};
		} else if (data.isoSys === 'C2') {
			// C2H (carbon two isotopes without CH)
			// [0: 12C, 1: 13C]
				Scale = PDB;
				dRatio = ['13C', '12C']; // [numerator, denominator], ratio for delta
				hRatio = ['13C', '12C'];
				color = {
					cps: {
						'12C':    'red',
						'13C':    'green',
					},
					hydride: '#24557F',
					delta: 'magenta'
			};
			label = { // for y axes and legends
					cps: 'cps',
					hydride: formatLabels('13C1H/13C'),
					delta: formatLabels('d13C'),
			};
			suffix = { // units and etc...
				hydride: '',
				delta: '[\u2030]'
			};

		// } else if (iso2 === '32S,33S,34S,36S') {
		} else if (data.isoSys === 'S4') {
			// S4 (sulfur four isotopes)
			// [0: 32S, 1: 33S, 2: 34S, 3: 36S]
			Scale = CDT;
			Scale2 = CDT33;
			Scale3 = CDT36;
			capDelta = function(d34, d33) { // function(major, minor)
				return d33 - 1000 * (Math.pow((d34/1000 + 1), 0.515) - 1)
			};
			capDelta2 = function(d34, d36) {
				return d36 - 1000 * (Math.pow((d34/1000 + 1), 1.9) - 1)
			};
			dRatio = ['34S', '32S']; // [numerator, denominator], ratio for delta
			dRatio2 = ['33S', '32S']; // [numerator, denominator], ratio for delta
			dRatio3 = ['36S', '32S']; // [numerator, denominator], ratio for delta
			hRatio = ['33S', '32S']; // no hydride signal
			color = {
				cps: {
					'32S': 'red',
					'33S': 'orange',
					'34S': 'green',
					'36S': 'blueviolet'
				},
				hydride: '#24557F',
				delta:   'magenta',
				delta2:  '#3362CE',
				delta3:  'blueviolet',
				capDelta:  'pink',
				capDelta2: 'red',
			};
			label = { // for y axes and legends
					cps: 'cps',
					hydride: formatLabels('33S/32S'),
					delta:  formatLabels('d34S'),
					delta2: formatLabels('d33S'),
					delta3: formatLabels('d36S'),
					capDelta: formatLabels('D33S'),
					capDelta2: formatLabels('D36S'),
			};
			suffix = { // units and etc...
				hydride: '',
				delta: '[\u2030]',
				delta2: '[\u2030]',
				delta3: '[\u2030]',
				capDelta: '[\u2030]',
				capDelta2: '[\u2030]',
			};
		// } else if (iso2 === '32S,33S,34S') {
		} else if (data.isoSys === 'S3') {
			// S3 (sulfur three isotopes)
			// [0: 32S, 1: 33S, 2: 34S]
			Scale = CDT;
			Scale2 = CDT33;
			capDelta = function(d34, d33) {
				return d33 - 1000 * (Math.pow((d34/1000 + 1), 0.515) - 1)
			};
			dRatio = ['34S', '32S']; // [numerator, denominator], ratio for delta
			dRatio2 = ['33S', '32S']; // [numerator, denominator], ratio for delta
			// var dRatio3 = ['36S', '32S']; // [numerator, denominator], ratio for delta
			hRatio = ['33S', '32S']; // no hydride signal
			color = {
				cps: {
					'32S':    'red',
					'33S':    'orange',
					'34S':    'green',
				},
				hydride: '#24557F',
				delta: 'magenta',
				delta2: '#3362CE',
				capDelta: 'pink',
			};
			label = { // for y axes and legends
					cps: 'cps',
					hydride: formatLabels('33S/32S'),
					delta: formatLabels('d34S'),
					delta2: formatLabels('d33S'),
					capDelta: formatLabels('D33S'),
			};
			suffix = { // units and etc...
				hydride: '',
				delta: '[\u2030]',
				delta2: '[\u2030]',
			};
		// } else if (iso2 === '32S,32S 1H,34S') {
		} else if (data.isoSys === 'S2H') {
			// S2H (sulfur two isotopes with SH)
			Scale = CDT;
			dRatio = ['34S', '32S'];
			hRatio = ['32S 1H', '32S'];
			color = {
				cps: {
					'32S':    'red',
					'34S':    'green',
					'32S 1H': '#00A7EA',
					'32S1H': '#00A7EA'
				},
				hydride: '#24557F',
				delta: 'magenta'
			};
			label = { // for y axes and legends
					cps: 'cps',
					hydride: formatLabels('32S1H/32S'),
					delta: formatLabels('d34S'),
			};
			suffix = { // units and etc...
				hydride: '',
				delta: '[\u2030]'
			};
		// } else if (iso2 === '32S,34S') {
		} else if (data.isoSys === 'S2') {
			// S2 (sulfur two isotopes)
			// [0: 32S, 1: 34S]
			Scale = CDT;
			dRatio = ['34S', '32S']; // [numerator, denominator], ratio for delta
			hRatio = []; // no hydride signal
			color = {
				cps: {
					'32S':    'red',
					'34S':    'green'
				},
				hydride: '#24557F',
				delta: 'magenta'
			};
			label = { // for y axes and legends
					cps: 'cps',
					// hydride: formatLabels('34S/32S'),
					delta: formatLabels('d34S'),
			};
			suffix = { // units and etc...
				hydride: '',
				delta: '[\u2030]'
			};
		// } else if (iso2 === '16O,17O,18O') {
		} else if (data.isoSys === 'O3') {
			// O3 (oxygen three isotopes)
			// [0: 16O, 1: 17O, 2: 18O]
			Scale = VSMOW;
			Scale2 = VSMOW17;
			capDelta = function(d18, d17) {
				return d17 - 0.52 * d18;
			};
			dRatio = ['18O', '16O']; // [numerator, denominator], ratio for delta
			dRatio2 = ['17O', '16O']; // [numerator, denominator], ratio for delta
			// var dRatio3 = ['36S', '32S']; // [numerator, denominator], ratio for delta
			hRatio = ['17O', '16O']; // no hydride signal
			color = {
				cps: {
					'16O': 'red',
					'17O': 'blue',
					'18O': 'green',
				},
				hydride: '#24557F',
				delta: 'magenta',
				delta2: '#3362CE',
				capDelta: 'red',
			};
			label = { // for y axes and legends
					cps: 'cps',
					hydride: formatLabels('17O/16O'),
					delta: formatLabels('d18O'),
					delta2: formatLabels('d17O'),
					capDelta: formatLabels('D17O'),
			};
			suffix = { // units and etc...
				hydride: '',
				delta: '[\u2030]',
				delta2: '[\u2030]',
				capDelta: '[\u2030]',
			};

		} else if (data.isoSys === 'CN') {
			// CN (carbon and nitrogen isotopes)
			// [0: 12C12C, 1: 12C13C, 2: 12C14N, 3: 12C15N]
			Scale = PDB * 2;
			Scale2 = AIR;

			dRatio = ['12C 13C', '12C 12C']; // [numerator, denominator], ratio for delta
			dRatio2 = ['12C 15N', '12C 14N']; // [numerator, denominator], ratio for delta

			hRatio = dRatio; // no hydride signal

			color = {
				cps: {
					'12C 12C': 'red',
					'12C 13C': 'blue',
					'12C 14N': 'green',
					'12C 15N': 'orange',
				},
				hydride: '#24557F',
				delta: 'magenta',
				delta2: '#3362CE',
			};
			label = { // for y axes and legends
					cps: 'cps',
					hydride: formatLabels('--'),
					delta: formatLabels('d13C'),
					delta2: formatLabels('d15N'),
			};
			suffix = { // units and etc...
				hydride: '',
				delta: '[\u2030]',
				delta2: '[\u2030]',
			};
		} else if (data.isoSys === 'AlMg') {
			// Al-Mg (Al-Mg by multi)
			// [0: 24Mg, 1: 25Mg, 2: 26Mg, 3: 27Al]
			Scale  = 0.12663;
			Scale2 = 0.13932;
			Scale3 = Scale2 / Scale;
			capDelta = function(d25, d26_25) {
				var Coef_MS = 0.945525291828794;
				return (Math.exp(Math.log(d26_25/1000+1)-Math.log(d25/1000+1)*Coef_MS)-1)*1000
				// return d33 - 1000 * (Math.pow((d34/1000 + 1), 0.515) - 1)
			};
			dRatio  = ['25Mg', '24Mg']; // [numerator, denominator], ratio for delta
			dRatio2 = ['26Mg', '24Mg']; // [numerator, denominator], ratio for delta
			dRatio3 = ['26Mg', '25Mg']; // [numerator, denominator], ratio for delta

			hRatio = ['27Al', '24Mg'];

			color = {
				cps: {
					'24Mg': 'red',
					'25Mg': 'blue',
					'26Mg': 'green',
					'27Al': 'orange',
				},
				hydride: '#24557F',
				delta:  'magenta',
				delta2: '#3362CE',
				delta3: 'pink',
				capDelta: '#00D636',
			};
			label = { // for y axes and legends
					cps: 'cps',
					hydride: formatLabels('27Al/24Mg'),
					delta: formatLabels('d25Mg'),
					delta2: formatLabels('d26Mg'),
					delta3: formatLabels('d26/25Mg'),
					capDelta: formatLabels('D26Mg'),
			};
			suffix = { // units and etc...
				hydride: '',
				delta: '[\u2030]',
				delta2: '[\u2030]',
				delta3: '[\u2030]',
				capDelta: '[\u2030]',
			};
		}

		return {

			deltaScale: Scale,
			deltaScale2: Scale2,
			deltaScale3: Scale3,

			deltaRatio: dRatio,
			deltaRatio2: dRatio2,
			deltaRatio3: dRatio3,

			capDelta:  capDelta,
			capDelta2: capDelta2,

			hydrideRatio: hRatio,
			color: color,
			labels: label,
			suffix: suffix
		};
	};

	// var f02 = d3.format('0.2f');
	// var f03 = d3.format('0.3f');
	// var f04 = d3.format('0.4f');
	// var f05 = d3.format('0.5f');
	// var f06 = d3.format('0.6f');




	return my;
}();
