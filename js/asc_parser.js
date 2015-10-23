module.exports = {
	getCPS: function(k, l) {
		var cpsIndex = k.indexOf('#block') + 4,
			cpsIndex2 = k.indexOf('#block', cpsIndex) - 4,
		lab = l[cpsIndex - 2],
		cps = {};
		for (var m = 1; m < lab.length - 1; m++) {
			cps[lab[m]] = [];
			for (var i = cpsIndex; i <= cpsIndex2; i++) {
				cps[lab[m]].push(l[i][m + 1] * 1);
			}
		}
		return cps;
	},

	sum: function(data) {
		return data.reduce(function(a, b) { return a + b; });
	},

	stdev: function(data) {
		var n = data.length;
		var mean = this.sum(data) / n
		var s = this.sum(data.map(function(a) { return Math.pow(a - mean, 2); })) / (n - 1)
		return Math.sqrt(s);
	},

	arrayMax: function(arr) {
		return arr.reduce(function(a, b) { return (a > b ? a : b); });
	},

	arrayMin: function(arr) {
		return arr.reduce(function(a, b) { return (a < b ? a : b); });
	},

	statCPS: function(data) {
		var out = {};
		var masses = Object.keys(data);
		for (var m in masses) {
			var mass = masses[m];
			var cps = data[mass];
			var n = cps.length;
			var total = this.sum(cps);
			var mean = total / n;
			out[mass] = {
				total: total,
				mean: mean,
				max: this.arrayMax(cps),
				min: this.arrayMin(cps),
				stdev: this.stdev(cps),
				order: Math.floor(Math.log(mean) / Math.LN10),  
			}
		}
		return out;
	},

	cycleNum: function(n) {
		var out = [];
		for (var i = 1; i <= n; i++) {
			out.push(i);
		}
		return out;
	},

	getComment: function(k, l) {
		var comIndex = k.indexOf('File Description :') + 1;
		return l[comIndex][0].trim().replace(/^\"?(.*?)\"?$/, '$1');
	},

	parseAsc: function(asc) {
		var lines = asc.split('\r\n').map(function(a) {
			return a.split('\t').map(function(b) {
				return b.trim();
			});
		});
		var myKeys = lines.map(function(a) {return a[0].trim();})
		var comment = this.getComment(myKeys, lines);
		var cps = this.getCPS(myKeys, lines);
		var cycleNumber = cps[Object.keys(cps)[0]].length;
		var st = this.statCPS(cps);
		return {
			cps: cps,
			cycleNumber: cycleNumber,
			comment: comment,
			stat: st,
		};
	},

	dump: function (arr,level) {
		var dumped_text = "";
		if(!level) level = 0;

		var level_padding = "";
		for(var j=0;j<level+1;j++) {
			level_padding += "    ";
		}
		if(typeof(arr) == 'object') {
			for(var item in arr) {
				var value = arr[item];
				if(typeof(value) == 'object') {
					dumped_text += level_padding + "'" + item + "' ...\n";
					dumped_text += dump(value,level+1);
				} else {
					dumped_text += level_padding + "'" + item + "': \"" + value + "\"\n";
				}
			}
		} else {
			dumped_text = "===>"+arr+"<===("+typeof(arr)+")";
		}
		return dumped_text;
	}

};
