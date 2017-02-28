module.exports = function() {
  var lines = [],
      keys = [];

  function my() {}

  my.init = function(asc) {
    if (my.parseLines(asc) && my.parseKeys(lines)) return true;
    return false;
  };

  my.parseLines = function(asc) {
    lines = asc.replace(/\r/g, '').split(/\n/).map(function(a) {
      return a.replace(/(\/{2,}|\={2,})/, '')
              .replace(/\t$/, '')
              .replace(/Option\: /, 'Option# ')
              .replace(/\s?\:\s+/, '\t')
              .split(/\t/).map(function(b) {
                return sanitize(b.trim().replace(/\s?\:$/,''));
              });
    });
    return true;
  };
  my.getLines = function() { return lines; };

  my.parseKeys = function(lines) {
    keys = lines.map(function(l) { return l[0]; });
    return true;
  };
  my.getKeys = function() { return keys; };

  my.getListedContents = function(keyword, opt) {
    opt = {
      offset: opt.offset === undefined ?  2 : opt.offset,
      length: opt.length    === undefined ? 30 : opt.length
    };
    var keyPos = keys.indexOf(keyword);
    if (keyPos < 0) return false;

    var myIndex = keyPos + opt.offset;
    var out = {}, r = '';
    for (var i = myIndex; i < myIndex + opt.length; i++) {
      r = lines[i][0];
      if (r === '') break;
      out[r] = lines[i][1];
    }

    return out;
  };

  my.getTabulatedContents = function(keyword, opt) {
    opt = {
      offset: opt.offset === undefined ?  2 : opt.offset,
      length: opt.length === undefined ? 30 : opt.length,
       label: opt.label  === undefined ?  2 : opt.label,
    };
    var myIndex = keys.indexOf(keyword) + opt.offset;
    var out = {}, rowname = '';
    var labels = lines[myIndex - opt.label].slice(1);
    var addOut = function(v, j) { out[this.r][v] = lines[this.i][j + 1]; };

    for (var i = myIndex; i < myIndex + opt.length; i++) {
      r = lines[i][0];
      if (r === '') break;
      out[r] = {};
      labels.forEach(addOut, {r: r, i: i});
    }
    return out;
  };

  my.getDateTime = function() {
    var dt = new Date(lines[0][1] + ' ' + lines[1][1]);
    var t = parseDateTime(dt);
    return {
      raw: dt,
      timestamp: dt.getTime(),
      formatted: t.year + '/' + t.month + '/' + t.day + ' ' +
                 t.hour + ':' + t.minute + ':00'
    };
  };

  my.getFileInfo = function() {
    var myIndex = keys.indexOf('ACQUISITION FILE NAME');
    var out = {
      ais: {path: lines[myIndex][1], name: ''},
      asc: {path: '', name: ''},
      dis: {path: lines[myIndex+1][1], name: ''}
    };
    out.ais.name = out.ais.path.split('\\').pop();
    out.asc.path = out.ais.path.replace(/\.ais$/, '.asc');
    out.asc.name = out.asc.path.split('\\').pop();
    out.dis.name = out.dis.path.split('\\').pop();

    return out;
  };

  my.getDescription = function() {
    var myIndex = keys.indexOf('File Description') + 1;
    return lines[myIndex][0].replace(/(^\"|\"$)/g, '');
  };

  my.getSampleName = function() {
    var myIndex = keys.indexOf('SAMPLE NAME');
    return lines[myIndex][1];
  };

  my.getStagePosition = function() {
    var myIndex = keys.indexOf('X POSITION');
    return {x: lines[myIndex][1], y: lines[myIndex][3]};
  };
  my.getAcquisitionParams = function() {
    var opt = {offset: 4, length: 20, label: 2};
    return my.getTabulatedContents('ACQUISITION PARAMETERS', opt);
  };

  my.getAnalyticalParams = function() {
    var opt = {offset: 2, length: 30};
    return my.getListedContents('ANALYTICAL PARAMETERS', opt);
  };

  my.getComments = function() {
    return lines[keys.indexOf('COMMENTS') + 1][0];
  };

  my.getDetectorParams = function () {
    var opt = {offset: 4, length: 20, label: 2};
    return my.getTabulatedContents('DETECTOR PARAMETERS', opt);
  };

  my.getCorrectionFactorStatus = function () {
    var opt = {offset: 2, length: 10};
    return my.getListedContents('CORRECTION FACTORS FOR RATIOS COMPUTATION', opt);
  };

  my.getAcquisitionControlParams = function() {
    var opt = {offset: 3, length: 20};
    return my.getListedContents('ACQUISITION CONTROL PARAMETERS', opt);
  };

  my.getPresputteringParams = function() {
    var opt = {offset: 2, length: 10};
    return my.getListedContents('Pre-sputtering PARAMETERS', opt);
  };

  my.getIsotopicRatioDefinitions = function () {
    var myIndex = keys.indexOf('ISOTOPICS RATIO') + 2;
    var out = {};
    var tmp;
    for (var i = myIndex; i<myIndex+20; i+=2) {
      if (lines[i][0] === '') break;
      tmp = lines[i][0].split(/\=/);
      out[tmp[0]] = tmp[1];
    }

    return out;
  };

  my.getCummulatedResults = function() {
    var opt = {offset: 4, length: 10, label: 2};
    return my.getTabulatedContents('CUMULATED RESULTS', opt);
  };

  my.getPrimaryBeamIntensity = function() {
    var myIndex = keys.indexOf('Primary Current START (A)');
    var out = {
      start: lines[myIndex][1],
      end: lines[myIndex + 1][1],
      mean: 0, diff: 0
    };
    out.mean = (out.start + out.end) / 2;
    out.diff = round(100 * (out.start - out.end) / out.mean, 3);

    return out;
  };

  my.getEMHVData = function() {
    var opt = {offset: 2, length: 10};
    return my.getListedContents('EM HV DATA', opt);
  };

  my.getReferenceSignal = function() {
    var out = {};
    var opt = {offset: 2, length: 10};
    var keyPos = keys.indexOf('REFERENCE SIGNAL');
    if (keyPos < 0) return false;
    out['Measurement Species'] = lines[keyPos][1].toUpperCase();
    Object.assign(out, my.getListedContents('REFERENCE SIGNAL', opt));
    Object.assign(out, my.getListedContents('DSP2-X shift (digits)', opt));

    return out;
  };

  my.getBeamCenteringResults = function() {
    var opt = {offset: 4, length: 10, label: 2};
    return my.getTabulatedContents('BEAM CENTERING RESULTS', opt);
  };

  my.getIso = function(asString=false) {
    var iso = lines[keys.indexOf("#block") + 2].slice(1);
    return asString ? String(iso).replace(/\s+/g, '') : iso;
  }

  my.getIsoSys = function() {
    isosys = 'O2H';
    myIso = my.getIso(true);
    switch (myIso) {
      // Carbon
      case '12C,13C':
        isosys = 'C2';
        break;
      case '12C,13C,13C1H':
        isosys = 'C2H';
        break;
      // Oxygen
      case '16O,16O1H,18O':
        isosys = 'O2H';
        break;
      case '16O,18O':
        isosys = 'O2';
        break;
      case '16O,17O,18O':
        isosys = 'O3';
        break;
      // Silicon
      case '28Si,30Si':
        isosys = 'Si2';
        break;
      // Sulfur
      case '32S,34S':
        isosys = 'S2';
        break;
      case '32S,32S1H,34S':
        isosys = 'S2H';
        break;
      case '32S,33S,34S':
        isosys = 'S3';
        break;
      case '32S,33S,34S,36S':
        isosys = 'S4';
        break;
      case '12C12C,12C13C,12C14N,12C15N':
        isosys = 'CN';
        break;
      // Al-Mg
      case '24Mg,25Mg,26Mg,27Al':
        isosys = 'AlMg';
        break;
    }
    return isosys;
  };

  my.getCPS = function() {
    var cpsIndex = keys.indexOf('#block') + 4,
        cpsIndex2 = keys.indexOf('#block', cpsIndex) - 4,
        lab = my.getIso(),
        cps = {};
    for (var m = 0; m < lab.length; m++) {
      cps[lab[m]] = [];
      for (var i = cpsIndex; i <= cpsIndex2; i++) {
        cps[lab[m]].push(lines[i][m + 2]);
      }
    }
    return cps;
  };


  my.statCPS = function(data) {
    var out = {};
    var masses = Object.keys(data);
    for (var m in masses) {
      var mass = masses[m];
      var cps = data[mass];
      var n = cps.length;
      var total = sum(cps);
      var mean = total / n;
      out[mass] = {
        total: total,
        mean: mean,
        max: arrayMax(cps),
        min: arrayMin(cps),
        stdev: stdev(cps),
        order: arrayOrder(cps)
      };
    }
    return out;
  };

  my.cycleNum = function(n) {
    var out = [];
    for (var i = 1; i <= n; i++) {
      out.push(i);
    }
    return out;
  };

  my.parseAsc = function(asc) {
    if(!my.init(asc)) return;

    var comment = my.getDescription();
    var fName = my.getFileInfo().asc.name;
    var cps = my.getCPS();
    var cycleNumber = cps[Object.keys(cps)[0]].length;
    var st = my.statCPS(cps);

    return {
      iso: my.getIso(true),
      isoSys: my.getIsoSys(),
      cps: cps,
      cycleNumber: cycleNumber,
      comment: comment,
      stat: st,
      ascName: fName,
    };
  };

  my.parseAll = function() {
    if (lines.length === 0) return false;

    // var comment = my.getDescription();
    // var fName = my.getFileInfo().asc.name;
    var cps = my.getCPS();
    var cycleNumber = cps[Object.keys(cps)[0]].length;
    var st = my.statCPS(cps);
    return {
      iso: my.getIso(true),
      isoSys: my.getIsoSys(),
      cps: cps,
      cycleNumber: cycleNumber,
      stat: st,
      ascName: my.getFileInfo().asc.name,
      datetime: my.getDateTime(),
      fileInfo: my.getFileInfo(),
      comment: my.getDescription(),
      sampleName: my.getSampleName(),
      stagePosition: my.getStagePosition(),
      acqParams: my.getAcquisitionParams(),
      anaParams: my.getAnalyticalParams(),
      comments: my.getComments(),
      detParams: my.getDetectorParams(),
      corrFactor: my.getCorrectionFactorStatus(),
      acqCtrParams: my.getAcquisitionControlParams(),
      presputtering: my.getPresputteringParams(),
      isoRatioDef: my.getIsotopicRatioDefinitions(),
      cummRes: my.getCummulatedResults(),
      priaryBeam: my.getPrimaryBeamIntensity(),
      emhv: my.getEMHVData(),
      referenceSignal: my.getReferenceSignal(),
      beamcentering: my.getBeamCenteringResults()
    };
  };

  // PRIVATE FUNCTION
  var sum = function(data) {
    return data.reduce(function(a, b) { return a + b; });
  };

  var mean = function(arr) {
    return sum(arr) / arr.length;
  };

  var stdev = function(data) {
    var n = data.length;
    var average = mean(data);
    var s = sum(data.map(function(a) { return Math.pow(a - average, 2); })) / (n - 1);
    return Math.sqrt(s);
  };

  var arrayMax = function(arr) {
    return arr.reduce(function(a, b) { return (a > b ? a : b); });
  };

  var arrayMin = function(arr) {
    return arr.reduce(function(a, b) { return (a < b ? a : b); });
  };

  var arrayOrder = function(arr) {
    return Math.floor(Math.log10(mean(arr)));
  };

  var sanitize = function(txt) {
    if (!txt) return txt;
    return txt.match(/[a-zA-DF-Z\=\s\/\'\"%$#@]/) ? txt : Number(txt);
  };

  var pad0 = function(num, n, by) {
    n = n || 2; by = by ? Str(by) : '0';
    num = String(num);
    var out = '';
    var l = num.length;
    if (l > n) return num;
    for (var i=0; i<n-l; i++) {
      out += by;
    }
    return out + num;
  };

  var parseDateTime = function(dt) {
    return {
      year: pad0(dt.getFullYear()),
      month: pad0(dt.getMonth() + 1, 2, 0),
      day: pad0(dt.getDate(), 2 , 0),
      hour: pad0(dt.getHours(), 2, 0),
      minute: pad0(dt.getMinutes(), 2, 0),
      second: pad0(dt.getSeconds(), 2, 0)
    };
  };

  var round = function(num, digit) {
    digit = digit || 2;
    var scale = Math.pow(10, digit);
    return Math.round(num * scale) / scale;
  };

  if (process.env.NODE_ENV === 'test') {
    my._private = {
      sum: sum,
      mean: mean,
      stdev: stdev,
      arrayMax: arrayMax,
      arrayMin: arrayMin,
      arrayOrder: arrayOrder,
      sanitize: sanitize,
      pad0: pad0,
      parseDateTime: parseDateTime,
      round: round,
    };
  }

  return my;
}();
