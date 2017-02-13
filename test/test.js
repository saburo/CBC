process.env.NODE_ENV = 'test';
var ps = require('../src/renderer/common/asc_parser3');
var fs = require('fs');
var assert = require('assert');
var data = fs.readFileSync(__dirname + '/data/20140624@6.asc', 'utf8');
var line, key;

describe('ASC parser', function(){

  describe('public functions', function(){

    describe('init parser', function() {
      it('wait parser initialization', function() {
        var status = ps.init(data);
        assert.strictEqual(true, status);
        assert.equal(238, ps.getLines().length);
        assert.equal(238, ps.getKeys().length);
      });
    });

    describe('parsing parts', function() {
      it('parse lines', function() {
        ps.parseLines(data);
        line = ps.getLines();
        assert.equal(238, line.length);
        assert.equal('CAMECA', line[0][0]);
        assert.equal('MASSES', line[17][0]);
        assert.equal('Yield', line[77][0]);
        assert.equal('APPLYED', line[77][1]);
        assert.equal('TIMING  DATA', line[209][0]);
      });

      it('parse keys', function() {
        ps.parseKeys(line);
        key = ps.getKeys();
        assert.equal(238, key.length);
        assert.equal(true, line.length === key.length);
        assert.equal('CAMECA', key[0]);
        assert.equal('MASSES', key[17]);
        assert.equal('Yield', key[77]);
        assert.equal('TIMING  DATA', key[209]);
      });

      it('parse Date and Time', function() {
        var t = ps.getDateTime();
        // assert.strictEqual(1450112824000, t.timestamp);
        assert.strictEqual('2014/06/24 16:00:00', t.formatted);
      });

      it('parse file paths and names', function() {
        var finfo = ps.getFileInfo();
        assert.strictEqual('D:\\Cameca IMS Datas\\cips_data\\data\\20140624_d18O_garnet_stds_Kouki\\20140624@6.ais', finfo.ais.path);
        assert.strictEqual('20140624@6.ais', finfo.ais.name);
        assert.strictEqual('D:\\Cameca IMS Datas\\cips_data\\data\\20140624_d18O_garnet_stds_Kouki\\20140624@6.asc', finfo.asc.path);
        assert.strictEqual('20140624@6.asc', finfo.asc.name);
        assert.strictEqual('D:\\Cameca IMS Datas\\cips_data\\data\\20140624_d18O_garnet_stds_Kouki\\d18O_OH_CFC2H1.dis', finfo.dis.path);
        assert.strictEqual('d18O_OH_CFC2H1.dis', finfo.dis.name);
      });

      it('parse file paths and names', function() {
        assert.strictEqual('WI-STD-70 UWG-2 g1', ps.getDescription());
      });

      it('parse sample name', function() {
        assert.strictEqual('84.5_a2_3/', ps.getSampleName());
      });

      it('parse stage positions', function() {
        var pos = ps.getStagePosition();
        assert.strictEqual(-1703, pos.x);
        assert.strictEqual(295, pos.y);
      });

      it('parse acquisition params', function() {
        var params = ps.getAcquisitionParams();
        var k = Object.keys(params);
        assert.strictEqual(11, k.length);
        assert.strictEqual('DETECTOR', k[8]);
        assert.deepEqual(['16O', '16O 1H', '18O'], Object.keys(params.MASSES));
        assert.strictEqual(15.994915, params.MASSES['16O']);
        assert.strictEqual('Fc', params.TYPE['18O']);
      });

      it('parse analytical params', function() {
        var params = ps.getAnalyticalParams();
        var k = Object.keys(params);
        assert.strictEqual(21, k.length);
        assert.strictEqual('SAMPLE HV   (v)', k[0]);
        assert.strictEqual(-10000, params['SAMPLE HV   (v)']);
        assert.strictEqual(4998, params['MRP(mono)']);
        assert.strictEqual(750, params['L4 Aperture   (um)']);
      });

      it('parse comments', function() {
        assert.strictEqual('""', ps.getComments());
      });

      it('parse detector params', function() {
        var params = ps.getDetectorParams();
        var k = Object.keys(params);
        assert.strictEqual(10, k.length);
        assert.strictEqual('L\'2', k[0]);
        assert.strictEqual('FC2', k[9]);
        assert.deepEqual('DT(ns)', Object.keys(params.L2)[2]);
        assert.strictEqual(-2589204, params.C['Bkg(c/s)']);
        assert.strictEqual(-2048, params.EM['Rep b']);
      });

      it('parse correction factor status', function() {
        var params = ps.getCorrectionFactorStatus();
        var k = Object.keys(params);
        assert.strictEqual(6, k.length);
        assert.strictEqual('Yield', k[0]);
        assert.strictEqual('APPLYED', params.Background);
        assert.strictEqual('NOT APPLYED', params['Ip Normalize']);
      });

      it('parse acuisition control params', function() {
        var params = ps.getAcquisitionControlParams();
        var k = Object.keys(params);
        assert.strictEqual(8, k.length);
        assert.strictEqual('Pre-sputtering', k[0]);
        assert.strictEqual('Ip control', k[7]);
        assert.strictEqual('SELECTED', params['Pre-sputtering']);
        assert.strictEqual('NOT SELECTED', params['Ip control']);
      });

      it('parse pre-sputtering params', function() {
        var params = ps.getPresputteringParams();
        var k = Object.keys(params);
        assert.strictEqual(5, k.length);
        assert.strictEqual('Sputter Time (s)', k[0]);
        assert.strictEqual('Ip preset end', k[4]);
        assert.strictEqual(10, params['Sputter Time (s)']);
        assert.strictEqual('Current', params['Ip preset end']);
      });

      it('parse isotopic ratio definitions', function() {
        var params = ps.getIsotopicRatioDefinitions();
        var k = Object.keys(params);
        assert.strictEqual(3, k.length);
        assert.strictEqual('R0', k[0]);
        assert.strictEqual('1.000000 *16O [C] / 1.000000 *', params.R0);
        assert.strictEqual('R2', k[2]);
        assert.strictEqual('1.000000 *16O 1H [FC2] / 1.000000 *16O [C]', params.R2);
      });

      it('parse cummulated results', function() {
        var params = ps.getCummulatedResults();
        var k = Object.keys(params);
        assert.strictEqual(3, k.length);
        assert.strictEqual('R0', k[0]);
        assert.strictEqual('R2', k[2]);
        assert.deepEqual('Delta Value(permil)', Object.keys(params.R0)[6]);
        assert.strictEqual(2.769268E+9, params.R0['Mean value']);
        assert.strictEqual(7.756086E+0, params.R1['Delta Value(permil)']);
      });

      it('parse primary beam intensity', function() {
        var pb = ps.getPrimaryBeamIntensity();
        assert.strictEqual(2.135734E-9, pb.start);
        assert.strictEqual(2.107493E-9, pb.end);
        assert.strictEqual(2.1216135E-9, pb.mean);
        assert.strictEqual(1.331, ps._private.round(pb.diff, 3));
      });

      it('parse beam centering results', function() {
        var res = ps.getBeamCenteringResults();
        var k = Object.keys(res);
        assert.strictEqual(4, k.length);
        assert.strictEqual('Field App (DT1)', k[0]);
        assert.strictEqual('Option# DT FA_X', k[3]);
        assert.strictEqual('Selected', Object.keys(res['Field App (DT1)'])[0]);
        assert.strictEqual('resultY', Object.keys(res['Field App (DT1)'])[3]);
        assert.strictEqual(-7, res['Field App (DT1)'].resultX);
        assert.strictEqual(-2, res['Field App (DT1)'].resultY);
        assert.strictEqual('no', res['Option# DT FA_X'].Selected);
      });

      it('parse cps data', function() {
        var cps = ps.getCPS();
        var k = Object.keys(cps);
        assert.strictEqual(3, k.length);
        assert.strictEqual(20, Object.keys(cps[k[0]]).length);
        assert.deepEqual(['16O', '16O 1H', '18O'], Object.keys(cps));
        assert.strictEqual(5.786162E+6, cps['18O'][17]);
      });

    });
    describe('parse EM HV data with New Data', function() {

      it('parse new data', function() {
        var data = fs.readFileSync(__dirname + '/data/20151207@6.asc', 'utf8');
        assert.equal(true, ps.init(data));
      });
      
      it('parse em hv data', function() {
        var em = ps.getEMHVData();
        var k = Object.keys(em);
        assert.strictEqual(5, k.length);
        assert.strictEqual('Detector', k[1]);
        assert.strictEqual('adjust (digits)', k[4]);
        assert.strictEqual('13C', em['Measurement Species']);
        assert.strictEqual('at end', em.Mode);
        assert.strictEqual(2884, em['EM HV (digits)']);
        assert.strictEqual(3, em['adjust (digits)']);
      });
    });
    describe('parse Reference Signal with New Data', function() {

      it('parse new data for reference signal', function() {
        var data = fs.readFileSync(__dirname + '/data/20160713@133.asc', 'utf8');
        assert.equal(true, ps.init(data));
      });
      
      it('parse reference signal', function() {
        var rs = ps.getReferenceSignal();
        var k = Object.keys(rs);
        assert.strictEqual(9, k.length);
        assert.strictEqual('Measurement Species', k[0]);
        assert.strictEqual('Reference Signal INTENSITY (cps)', k[1]);
        assert.strictEqual('DSP2-X shift (digits)', k[4]);
        assert.strictEqual('Detector', k[5]);
        assert.strictEqual('Offset (v)', k[8]);
        assert.strictEqual('12C12C 1H', rs['Measurement Species']);
        assert.strictEqual(1.490648E+8 , rs['Reference Signal INTENSITY (cps)']);
        assert.strictEqual('12C 13C  /C', rs['Reference species']);
        assert.strictEqual(4.96, rs['Measurement time (s)']);
        assert.strictEqual('C', rs.Detector);
      });
    });
  });

  describe('private functions', function(){

    it('sum of numbers in array', function() {
      // assert.deepEqual(, ps._private.sum([1,2,3]));
      assert.strictEqual(6, ps._private.sum([1,2,3]));
      assert.strictEqual(0, ps._private.sum([1,2,-3]));
    });

    it('find max value of numbers in array', function() {
      assert.strictEqual(3, ps._private.arrayMax([1,2,3]));
      assert.strictEqual(2, ps._private.arrayMax([1,2,-3]));
    });

    it('find min value of numbers in array', function() {
      assert.strictEqual(1, ps._private.arrayMin([1,2,3]));
      assert.strictEqual(-3, ps._private.arrayMin([1,2,-3]));
    });

    it('calc mean value of numbers in array', function() {
      assert.strictEqual(2, ps._private.mean([1,2,3]));
      assert.strictEqual(0, ps._private.mean([1,2,-3]));
    });

    it('calc standard deviation of numbers in array', function() {
      assert.strictEqual(1, ps._private.stdev([1,2,3]));
      assert.strictEqual(2.6457513110645907, ps._private.stdev([1,2,-3]));
    });

    it('calc mean digit number of large numbers in array', function() {
      assert.strictEqual(3, ps._private.arrayOrder([1000, 2000, 3000]));
      assert.strictEqual(5, ps._private.arrayOrder([100000, 200000, 300000]));
      assert.strictEqual(-2, ps._private.arrayOrder([0.01, 0.02, 0.03]));
    });

    it('convert String to Number type when it is Number type', function() {
      assert.strictEqual('number', typeof ps._private.sanitize('2.769268E+9'));
      assert.strictEqual(2.769268E+9, ps._private.sanitize('2.769268E+9'));
      assert.strictEqual('string', typeof ps._private.sanitize('CUMULATED RESULTS'));
      assert.strictEqual('CUMULATED RESULTS', ps._private.sanitize('CUMULATED RESULTS'));
      assert.strictEqual('', ps._private.sanitize(''));
      assert.strictEqual('""', ps._private.sanitize('""'));
      assert.strictEqual(null, ps._private.sanitize(null));
      assert.strictEqual(undefined, ps._private.sanitize(undefined));
    });

    it('padded by 0', function() {
      assert.strictEqual('02', ps._private.pad0(2,2));
      assert.strictEqual('10', ps._private.pad0(10,2));
      assert.strictEqual('002', ps._private.pad0(2,3));
    });

    it('parse date and time', function() {
      var dt = new Date('Sat Dec 14 2015 11:07:04 GMT-0600');
      var d = ps._private.parseDateTime(dt);
      assert.strictEqual('2015', d.year);
      assert.strictEqual('12', d.month);
      assert.strictEqual('14', d.day);
      assert.strictEqual('11', d.hour);
      assert.strictEqual('07', d.minute);
      assert.strictEqual('04', d.second);
    });

    it('calc rounding with specified digits', function() {
      assert.strictEqual(2.1, ps._private.round(2.11, 1));
      assert.strictEqual(2.125, ps._private.round(2.1245, 3));
      assert.strictEqual(2, ps._private.round(2, 3));
    });
  });



  describe('parse various analysis conditions', function(){
      it('Oxygen two isotopes with hydride', function() {
        var data = fs.readFileSync(__dirname + '/data/20140624@5.asc', 'utf8');
        assert.equal(true, ps.init(data));
        var pa = ps.parseAll();
        assert.strictEqual('O2H', pa.isoSys);
      });

      it('Oxygen three isotopes', function() {
        var data = fs.readFileSync(__dirname + '/data/20170201@13.asc', 'utf8');
        assert.equal(true, ps.init(data));
        var pa = ps.parseAll();
        assert.strictEqual('O3', pa.isoSys);
      });

      it('Carbon two isotopes with hydride', function() {
        var data = fs.readFileSync(__dirname + '/data/20151207@6.asc', 'utf8');
        assert.equal(true, ps.init(data));
        var pa = ps.parseAll();
        assert.strictEqual('C2H', pa.isoSys);
      });

      it('Sulfur two isotopes', function() {
        var data = fs.readFileSync(__dirname + '/data/20090601@224.asc', 'utf8');
        assert.equal(true, ps.init(data));
        var pa = ps.parseAll();
        assert.strictEqual('S2', pa.isoSys);
      });

      it('Sulfur two isotopes with hydride', function() {
        var data = fs.readFileSync(__dirname + '/data/20161017@5.asc', 'utf8');
        assert.equal(true, ps.init(data));
        var pa = ps.parseAll();
        assert.strictEqual('S2H', pa.isoSys);
      });

      it('Sulfur three isotopes', function() {
        var data = fs.readFileSync(__dirname + '/data/20120124@6.asc', 'utf8');
        assert.equal(true, ps.init(data));
        var pa = ps.parseAll();
        assert.strictEqual('S3', pa.isoSys);
      });

      it('Sulfur four isotopes', function() {
        var data = fs.readFileSync(__dirname + '/data/20151228@7.asc', 'utf8');
        assert.equal(true, ps.init(data));
        var pa = ps.parseAll();
        assert.strictEqual('S4', pa.isoSys);
      });

      it('CN isotopes', function() {
        var data = fs.readFileSync(__dirname + '/data/20160713@133.asc', 'utf8');
        assert.equal(true, ps.init(data));
        var pa = ps.parseAll();
        assert.strictEqual('CN', pa.isoSys);
      });
  });

});
