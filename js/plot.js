var d3 = require("d3"),
	$ = require('jQuery');

module.exports = {

	PDB: 0.0112372,
	VSMOW: 0.00200520,

	width:  730,  
	height: 605,

	width_re: 0,
	height_re: 0,

	plotWidth: 0, 

	ascFileName: '',

	excelComment: null,

	Scales: {},
	maskedData: [],


	iso: 'C',

	charts: {
		cps: '',
		delta: ''
	},


	myColor: function(i) {
		var cColor = ['red', 'green', '#00A7EA', 'magenta'];
		var oColor = ['red', '#00A7EA', 'green', 'magenta'];
		if (this.iso == 'C') {
			return cColor[i];
		} else if (this.iso == 'O') {
			return oColor[i];
		}
	},

	isoKeys: function() {
		if (this.iso == 'C') {
			return {numerator: '13C', denominator: '12C'};
		} else if (this.iso == 'O') {
			return {numerator: '18O', denominator: '16O'};
		}
	},

	addTitleFlag: function() {
		return 1;
	},

	addTitle: function(svg, title) {
		svg.append('g').classed('title', true)
			.append('text')
			.attr({
				'text-anchor': 'middle',
				x: (this.width + this.width_re) / 2,
				y: 20, 
				'font-weight': 'bold',
				'font-family': 'sans-serif'
			})
			.style({})
			.text(title);
	},

	addCPSLegendFlag: function() {
		return 1;
	},

	addCPSLegend: function(stat) {
		var r = 4,
			offset = 0,
			item = '',
			key = '',
			me = '',
			i = '',
			j = 0;

		legend = this.charts.cps.append("g").classed('legend', true)
					.attr("transform", 'translate(' + this.Scales.x(1) + ', 20)')
					.attr('text-anchor', 'start')
					.style({
						'fill': 'black',
						'stroke': ' none',
						"font-size": "12px",
						'font-family': 'sans-serif'
					});
		for (i in stat) {
			item = stat[i];
			key = i + ' [\u00D7E+' + item.order + ']';
			me = legend.append('g').classed('legend-item', true)
				.attr('transform', 'translate(' + offset + ', 0)');
			me.append('circle').attr({
					cx: 0, cy: -r, r: r,
					fill: this.myColor(j),
					stroke: 'white'
				});
			me.append('text').text(key.replace(' ',''))
				.attr('transform', 'translate(10, 0)');
			offset += me.node().getBBox().width + 20;
			j += 1;
		}
	},

	calcDelta: function(r) {
		var scale = (this.iso == 'C') ? this.PDB : this.VSMOW; 
		return (r / scale - 1) * 1000;
	},

	addAverageLinesFlag: function() { return 1; },

	filterMaskedData: function(data) {
		var self = this;
		return data.filter(function(v, i) {
			return self.maskedData.indexOf(i + 1) < 0
		});
	},

	getStatValues: function(data) {
		var self = this;

		return {
			mean: d3.mean(data),
			max: d3.max(data),
			min: d3.min(data),
			total: d3.sum(data),
			stdev: d3.deviation(data), 
			n: data.length
		}
	},

	addAverageLines: function(data) {
		var self = this, 
			mean = 0,
			i = 0,
			group = '',
			stat = {},
			svg = self.charts.delta,
			averageText = '',
			f03 = d3.format('0.3f'),
			dummy;
		svg.selectAll('.average-lines').remove();
		group = svg.append('g').classed('average-lines', true);
		e = self.isoKeys();
		data['ratio'] = [];
		for (i=0; i<data.cps[e.numerator].length; i++) {
			data.ratio.push(data.cps[e.numerator][i] / data.cps[e.denominator][i]);
		}
		stat = self.getStatValues(self.filterMaskedData(data.ratio));
		mean = self.calcDelta(stat.mean);
		group.append('line')
			.attr({
				x1: self.Scales.x(1), x2: self.Scales.x(data.cycleNumber),
				y1: self.Scales.y2(mean), y2: self.Scales.y2(mean)})
			.attr('stroke', self.myColor(3))
			.attr('stroke-width', 1)
			.attr('fill', 'none')
			.attr("stroke-dasharray", ("6, 3"));
		averageText = 'Average: '
					+ f03(mean) 
					+ ' ± ' 
					+ f03(2 * 1000 * stat.stdev/Math.sqrt(stat.n)/stat.mean) + '‰';
		group.append('text')
			.text(averageText)
			.attr({
				x: self.Scales.x(data.cycleNumber),
				y: 25,
				'fill': self.myColor(3),
				'font-family': 'sans-serif',
				'font-size': '12px',
				'text-anchor': 'end'
			});
	},

	getRange: function(plotData, items, margin) {
		// margin [%]
		var vlist = [],
			i = 0,
			legendMargin = 0,
			m;

		margin = 20;
		for (i=0; i<plotData.length; i++) {
			for(m in items) {
				vlist.push(plotData[i][items[m]]);
			}
		}
		if (this.addCPSLegendFlag() || this.addAverageLinesFlag()) {
			legendMargin = 0.5;
		}
		margin = Math.abs(d3.max(vlist) - d3.min(vlist)) * margin / 100 || 0;
		return [d3.min(vlist) - margin, d3.max(vlist) + margin * (1 + legendMargin)];
	},

	makePlot: function(svg, data) {
		var self = this;

		var f01 = d3.format('0.1f'),
			f02 = d3.format('0.2f'),
			f03 = d3.format('0.3f'),
			f04 = d3.format('0.4f');
		self.maskedData = [];
		var drawConnLine = function(obj, data, m, color) {
			var scale = (m == 'delta') ? self.Scales.y2 : self.Scales.y,
			lineGen = d3.svg.line()
						.x(function(d) { return self.Scales.x(d['cycle']); })
						.y(function(d) { return scale(d[m]); });
			obj.append('path').classed('connLines', true)
				.attr('d', lineGen(self.filterMaskedData(plotData)))
				.attr('stroke', color)
				.attr('stroke-width', 1)
				.attr('fill', 'none')
				.attr('opacity', 0.2);
		};

		var addPlot = function(obj, m, color) {
			var scale = (m == 'delta') ? self.Scales.y2 : self.Scales.y;
			drawConnLine(obj[1], plotData, m, color);
			obj[0].append("circle")
				.attr({
					cx: function(d) { return self.Scales.x(d['cycle']); },
					cy: function(d) { return scale(d[m]); },
					r: (data.cycleNumber > 20) ? 3 : 4,
					fill: color,
					stroke: 'white'
				})
				.style('opacity', 0.9)
				.on('click', function() {
					resetMask();
				})
		};

		var myKeys = Object.keys(data.cps);

		this.iso = myKeys[0] == '12C' ? 'C' : 'O';

		var margin = {
				top: this.addTitleFlag() ? 30 : 10,  
				right: 20,
				bottom: 60, 
				left: 50
			},
			width = this.width + this.width_re - margin.left - margin.right,
			height = (this.height + this.height_re - margin.top - margin.bottom) / 2; // divide by number of plots
		self.plotWidth = width;
		// var svg = d3.select("svg")
		svg.attr("width", width + margin.left + margin.right)
			.attr("height", 2 * height + margin.top + margin.bottom)
			.classed('chart', true);

		if (this.addTitleFlag()) {
			this.addTitle(svg, (this.excelComment) ? this.excelComment : data.comment);
		}

		var plotData = this.makePlotData(data);

		data['delta'] = plotData.map(function(d) { return f03(d.delta); });
		// set colors
		
		// make scales
		this.Scales = {
			x: d3.scale.linear().domain([0, data.cycleNumber + 1]).range([0,width]),
			y: d3.scale.linear().domain(this.getRange(plotData, myKeys, 5)).range([height,0]),
			y2: d3.scale.linear().domain(this.getRange(plotData, ['delta'], 5)).range([height,0])
		};

		var containerGroup = svg.append('g').classed('container-group', true).attr('fill', 'none');
		var vline = containerGroup.append('g').classed('vline', true)
									.attr({transform: 'translate(' + margin.left + ',' + margin.top + ')'})
									.append('line')
										.classed('hide', true)
										.attr({
											x1: self.Scales.x(1), y1: 30,
											x2: self.Scales.x(1) , y2: height * 2,
											stroke: '#ccc', 'stroke-width': 0.5
										});
		self.charts.cps = containerGroup
							.append('g').classed('chart-group cps', true)
							.attr("transform", "translate(" + margin.left + "," + margin.top + ")");  
		self.charts.cps.append('rect').attr({
			width: width + 'px',
			height: height + 'px',
			fill: 'rgba(200,200,200,0.0)'
		});
		self.charts.delta = containerGroup
							.append('g')
							.classed('chart-group delta', true)
							.attr("transform", "translate(" + margin.left + "," + (height + 0 + margin.top /1) + ")");
		var cursorReceiver = containerGroup.append('g')
								.append('rect').attr({
									width: width + 'px',
									height: height * 2 + 'px',
									fill: 'rgba(255,255,255,0)',
									transform: 'translate(' + margin.left + ',' + margin.top + ')'
								});

		// var vline = self.charts.cps.append('g').classed('vline', true)
		// 				.append('line')
		// 					.classed('hide', true)
		// 					.attr({
		// 						x1: self.Scales.x(1), y1: 30,
		// 						x2: self.Scales.x(1) , y2: height * 2,
		// 						stroke: '#ccc', 'stroke-width': 0.5
		// 					});
		var cpsline = self.charts.cps.append('g').classed('line', true);
		var cpspoint = self.charts.cps.append('g').classed('point', true);

		var line = cpsline.selectAll('path')
				.data(plotData)
				.enter()
				.append('g');

		var point = cpspoint.selectAll("circle")
				.data(plotData)
				.enter()
				.append('g');

		for (var k in myKeys) {
			addPlot([point, line], myKeys[k], self.myColor(k))
		}

		// Plot for delta values
		if (this.addAverageLinesFlag()) this.addAverageLines(data);
		var deltaline = self.charts.delta.append('g').classed('line', true);
		var deltapoint = self.charts.delta.append('g').classed('point', true);
		var line2 = deltaline.selectAll('path')
				.data(plotData)
				.enter()
				.append('g');
		var point2 = deltapoint.selectAll('circle')
				.data(plotData)
				.enter()
				.append('g');


		addPlot([point2, line2], 'delta', self.myColor(3));


		if (this.addCPSLegendFlag()) this.addCPSLegend(data.stat);
		// format axes
		var xAxis = d3.svg.axis()
						.scale(self.Scales.x)
						.ticks(4)
						.orient('bottom')
						.tickSize(-6, -height)
						.tickFormat('');
		var xAxis2 = d3.svg.axis()
						.scale(self.Scales.x)
						.ticks(4)
						.orient('bottom')
						.tickSize(-6, -height);
		var xAxis3 = d3.svg.axis()
						.scale(self.Scales.x)
						.ticks(4)
						.orient('top')
						.tickSize(-6, 0)
						.tickFormat('');
		var yAxis = d3.svg.axis()
						.ticks(5)
						.scale(self.Scales.y)
						.orient("left")
						.tickSize(-6, -width);
		var yAxis2 = d3.svg.axis()
						.ticks(5) // 軸のチックの数。
						.scale(self.Scales.y2)
						.orient("left")
						.tickSize(-6, -width);

		// make axes

		// defaults for svg exporting
		axisTextDefault = {fill: 'black', 'stroke': 'none', 'font-family': 'sans-serif', 'font-size': '12px'};
		axisLineDefault = {fill: 'none', 'stroke': 'black', 'stroke-width': 0.2}; 
		axisFrameDefault = {fill: 'none', 'stroke': 'black', 'stroke-width': 1}; 

		// CPS Y axis
		var tmp = this.getRange(plotData, myKeys, 5)
		var tmpAx = self.charts.cps.append("g")
				.attr("class", "y axis")
				.attr(axisFrameDefault)
			.call(yAxis);
		tmpAx.selectAll('text').attr(axisTextDefault);
		tmpAx.selectAll('line').attr(axisLineDefault);

		// CPS Y label
		tmpAx.append("text")
				.attr("y", -30)
				.attr("x", -height/2)
				.attr(axisTextDefault)
				.attr('transform', 'rotate(-90)')
				.style({"text-anchor": "middle", 'font-size': '18px', 'font-family': 'sans-serif'})
				.text('cps');

		// CPS X axis
		tmpAx = self.charts.cps.append("g")
				.attr("class", "x axis")
				.attr("transform", "translate(0," + height + ")")
				.attr(axisFrameDefault)
			.call(xAxis);
		tmpAx.selectAll('line').attr(axisLineDefault);

		// Delta Y axis
		var y2 = self.charts.delta.append("g")
				.attr("class", "y axis")
				.attr(axisFrameDefault)
			.call(yAxis2);
		y2.selectAll('text').attr(axisTextDefault);
		y2.selectAll('line').attr(axisLineDefault);

		var deltaLab = (this.iso == 'C') ? {mass: '13', ele: 'C'} : {mass: '18', ele: 'O'};

		// Delta Y label
		var y2t = y2.append("text")
				.attr("y", -30)
				.attr("x", -height/2)
				.attr('transform', 'rotate(-90)')
				.attr(axisTextDefault)
				.style({"text-anchor": "middle", 'font-size': '18px', 'font-family': 'sans-serif'});
		y2t.append('tspan').text('\u03B4').append('tspan').text(deltaLab.mass).attr({'baseline-shift': 'super', 'font-size': '60%'});
		y2t.append('tspan').text(deltaLab.ele).append('tspan').text('raw').attr({'baseline-shift': 'sub', 'font-size': '60%'});

		// X axis for delta
		tmpAx = self.charts.delta.append("g")
				.attr("class", "x axis")
				.attr("transform", "translate(0," + height + ")")
				.attr(axisFrameDefault)
			.call(xAxis2);
		tmpAx.selectAll('text').attr(axisTextDefault);
		tmpAx.selectAll('line').attr(axisLineDefault);

		// X label
		tmpAx.append('text')
				.attr({x: self.Scales.x(parseInt(data.cycleNumber/2 + 1)), y: 28})
				.attr(axisTextDefault)
				.style({"text-anchor": "middle", 'font-size': '16px'})
				.text('cycle #');

		// x (cycle) ticks on upper axis
		self.charts.delta.append("g")
				.attr("class", "x axis")
				.attr("transform", "translate(0,0)")
				.attr(axisLineDefault)
			.call(xAxis3);



		var currentValues = svg.append('g').classed('current-values', true)
									.attr({
										transform: 'translate(' + margin.left + ',' + (self.height + self.height_re - 10) +')',
										'font-size': '12px',
										'font-family': 'sans-serif',
										'text-anchor': 'start'
									});
									// .text('');
		var updateCurrentValue = function(cycle) {
			var keys = Object.keys(data.cps),
				out = [],
				offset = 0,
				item = '',
				key = 0;
			d3.selectAll('.cv-item').remove();

			keys.push('delta');
			var addCurrentValueItem = function(label, value, color) {
				var item = currentValues.append('g').classed('cv-item', true)
							.attr('transform', 'translate(' + offset + ', 0)');
				item.append('text')
					.text(label + ': ' + value)
					.attr('fill', color);
				offset += (item.node().getBBox().width + 15)
			};
			addCurrentValueItem('Cycle', cycle, 'black');
			for (key in keys) {
				var label = (keys[key] == 'delta') ? '\u03B4' + self.isoKeys().numerator : keys[key].replace(' ','');
				var val = (keys[key] == 'delta') ? f03(data.delta[cycle - 1]) : data.cps[keys[key]][cycle - 1]
				var col = self.myColor(key);
				addCurrentValueItem(label, val, col);
			}
		};

		var updateConnLines = function() {
			d3.selectAll('.connLines').remove();
			for (var k in myKeys) {
				drawConnLine(line, plotData, myKeys[k], self.myColor(k))
			}
			drawConnLine(line2, plotData, 'delta', self.myColor(3));
		};

		var maskData = function(cycle) {
			var tData = point.selectAll('circle')[(cycle - 1)];
			tData.push(point2.selectAll('circle')[(cycle - 1)][0]);
			var index = self.maskedData.indexOf(cycle);
			if (index < 0) {
				tData.map(function(d) { d3.select(d).classed('masked', true); });
				self.maskedData.push(cycle);
				self.addAverageLines(data);
			} else {
				tData.map(function(d, i) { d3.select(d).classed('masked', false); });
				self.maskedData.splice(index, 1);
				self.addAverageLines(data);
			}
			updateConnLines()
		};

		var resetMask = function() {
			self.maskedData = [];
			d3.selectAll('.masked').classed('masked', false);
			self.addAverageLines(data);
			updateConnLines()
		};


		cursorReceiver.on('click', function(e) {
			var p = d3.mouse(this),
				x = Math.round(self.Scales.x.invert(p[0])),
				r = false;
			if (x > 0 && x <= data.cycleNumber) {
				maskData(x);
				// r = confirm('Do you want to mask this data?\n[cycle# ' + x + ']');
				// if (r == true) maskData(x);
			} else {
				resetMask();
			}
		});
		cursorReceiver.on('mouseleave', function() {
			vline.classed('hide', true);
		});

		cursorReceiver.on('mousemove', function() {
			var p = [],
				x = 0,
				y = 0;

			p = d3.mouse(this);
			x = Math.round(self.Scales.x.invert(p[0]))
			y = p[1];
			if ((x > 0 && x <= data.cycleNumber) 
			    	&& (y > 0 && y <= height * 2)) {
				vline.attr({
					x1: self.Scales.x(x),
					x2: self.Scales.x(x)
				});
				vline.classed('hide', false);
				currentValues.classed('hide', false);
				updateCurrentValue(x);
			} else {
				vline.classed('hide', true);
				currentValues.classed('hide', true);
			}
		});
	}, // makePlot

	makePlotData: function(data) {
		var out = [],
			myKeys = Object.keys(data.cps);
			l = data.cps[myKeys[0]].length,
			i = 0;

		if (myKeys[0] == '12C') {
			// ['12C', '13C', '13C 1H']
			dScale = 0.0112372
			dRatio = [1, 0]; // [numerator, denominator]
			hRatio = [2, 1];
		} else {
			// ['16O', '16O 1H', '18O']
			dScale = 0.00200520;
			dRatio = [2, 0];
			hRatio = [1, 0];
		}
		for (i=0; i<l; i++) {
			var cycleData = {cycle:i + 1};
			for (var k in myKeys) {
				var key = myKeys[k];
				cycleData[key] = data.cps[key][i] / Math.pow(10, data.stat[key].order)
			}
			cycleData['delta'] = (data.cps[myKeys[dRatio[0]]][i] / data.cps[myKeys[dRatio[1]]][i] / dScale - 1) * 1000
			cycleData['hydrite'] = data.cps[myKeys[hRatio[0]]][i] / data.cps[myKeys[hRatio[1]]][i]
			out.push(cycleData);
		}
		return out;
	}
}
