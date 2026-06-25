/* global chai */

var d3 = require('d3');
var expect = chai.expect;

var sitechangeFactory = require('../../js/plot/sitechange');

var ICONS = {
  'cannula': 'CANNULA_URL',
  'tubing': 'TUBING_URL',
  'reservoir': 'RESERVOIR_URL',
  'loop-tubing': 'LOOP_TUBING_URL',
  'twiist-cassette': 'TWIIST_CASSETTE_URL',
};

// A pool stub whose xScale maps a numeric normalTime straight to a pixel value,
// so fixtures can position icons by setting normalTime directly.
function poolStub() {
  function scale(t) { return Number(t); }
  scale.copy = function() { return scale; };
  return {
    xScale: function() { return scale; },
    height: function() { return 100; },
  };
}

// Render a fixture array through the plot and return the host <g> selection.
function render(data, opts) {
  var plot = sitechangeFactory(poolStub(), opts);
  var host = d3.select(document.body).append('svg').append('g').datum(data);
  host.call(plot);
  return host;
}

// Read an SVG <image> href. d3 sets it in the xlink namespace, so query it the same way.
var XLINK_NS = 'http://www.w3.org/1999/xlink';
function hrefOf(node) {
  return node.getAttributeNS(XLINK_NS, 'href');
}

function datum(id, subType, source, normalTime) {
  return { id: id, type: 'deviceEvent', subType: subType, source: source, normalTime: normalTime };
}

// Raw daily-data shape: site changes arrive as subType 'prime' (+ primeTarget) or
// 'reservoirChange', not the already-keyed cannulaPrime/tubingPrime form.
function primeDatum(id, primeTarget, source, normalTime) {
  return { id: id, type: 'deviceEvent', subType: 'prime', primeTarget: primeTarget, source: source, normalTime: normalTime };
}

describe('sitechange plot', function() {
  afterEach(function() {
    d3.select(document.body).selectAll('svg').remove();
    d3.select(document.body).selectAll('.patient-data, #tidelineScrollNav').remove();
  });

  describe('getIconForDatum', function() {
    var plot = sitechangeFactory(poolStub(), {});

    it('maps cannulaPrime to the cannula fill icon', function() {
      expect(plot.getIconForDatum(datum('a', 'cannulaPrime', 'Tandem', 0))).to.equal('cannula');
    });

    it('maps tubingPrime to the tubing icon for a non-loop manufacturer', function() {
      expect(plot.getIconForDatum(datum('a', 'tubingPrime', 'Tandem', 0))).to.equal('tubing');
    });

    it('maps reservoirChange to the reservoir (omnipod) icon for a non-twiist manufacturer', function() {
      expect(plot.getIconForDatum(datum('a', 'reservoirChange', 'Insulet', 0))).to.equal('reservoir');
    });

    it('maps tubingPrime on a DIY Loop to the loop-tubing icon', function() {
      expect(plot.getIconForDatum(datum('a', 'tubingPrime', 'DIY Loop', 0))).to.equal('loop-tubing');
    });

    it('maps tubingPrime on a Tidepool Loop to the loop-tubing icon', function() {
      expect(plot.getIconForDatum(datum('a', 'tubingPrime', 'Tidepool Loop', 0))).to.equal('loop-tubing');
    });

    it('maps reservoirChange on a twiist to the twiist-cassette icon', function() {
      expect(plot.getIconForDatum(datum('a', 'reservoirChange', 'twiist', 0))).to.equal('twiist-cassette');
    });

    it('falls back to the cannula fill icon for an unrecognized subType (generic non-Omnipod)', function() {
      expect(plot.getIconForDatum(datum('a', 'somethingElse', 'Tandem', 0))).to.equal('cannula');
    });

    it('maps a raw prime+cannula datum to the cannula fill icon', function() {
      expect(plot.getIconForDatum(primeDatum('a', 'cannula', 'Tandem', 0))).to.equal('cannula');
    });

    it('maps a raw prime+tubing datum to the tubing icon', function() {
      expect(plot.getIconForDatum(primeDatum('a', 'tubing', 'Tandem', 0))).to.equal('tubing');
    });

    it('maps a raw prime+tubing datum on a DIY Loop to the loop-tubing icon', function() {
      expect(plot.getIconForDatum(primeDatum('a', 'tubing', 'DIY Loop', 0))).to.equal('loop-tubing');
    });

    it('resolves the sub-type from boolean tags when subType/primeTarget are absent', function() {
      var d = { id: 'a', type: 'deviceEvent', source: 'Tandem', normalTime: 0, tags: { tubingPrime: true } };
      expect(plot.getIconForDatum(d)).to.equal('tubing');
    });
  });

  describe('rendering', function() {
    it('renders no icons when the icons map is absent', function() {
      var host = render([datum('a', 'cannulaPrime', 'Tandem', 100)], { size: 24, siteChangeSource: 'cannulaPrime' });
      expect(host.node().querySelectorAll('g.d3-sitechange-group')).to.have.length(0);
    });

    it('renders no icons when the icons map is empty', function() {
      var host = render([datum('a', 'cannulaPrime', 'Tandem', 100)], { size: 24, icons: {}, siteChangeSource: 'cannulaPrime' });
      expect(host.node().querySelectorAll('g.d3-sitechange-group')).to.have.length(0);
    });

    it('renders no icons when no siteChangeSource is selected', function() {
      var host = render([datum('a', 'cannulaPrime', 'Tandem', 100)], { size: 24, icons: ICONS });
      expect(host.node().querySelectorAll('g.d3-sitechange-group')).to.have.length(0);
    });

    it('renders only the selected subtype, ignoring other site-change subtypes', function() {
      var host = render([
        datum('a', 'cannulaPrime', 'Tandem', 100),
        datum('b', 'tubingPrime', 'Tandem', 1000),
        datum('c', 'reservoirChange', 'Tandem', 2000),
      ], { size: 24, icons: ICONS, siteChangeSource: 'cannulaPrime' });

      var groups = host.node().querySelectorAll('g.d3-sitechange-group');
      expect(groups).to.have.length(1);

      var hrefs = Array.from(host.node().querySelectorAll('g.d3-sitechange-group image'), hrefOf);
      expect(hrefs).to.deep.equal(['CANNULA_URL']);
    });

    it('ignores non site-change deviceEvent datums', function() {
      var host = render([
        datum('a', 'cannulaPrime', 'Tandem', 100),
        datum('b', 'timeChange', 'Tandem', 1000),
        datum('c', 'status', 'Tandem', 2000),
      ], { size: 24, icons: ICONS, siteChangeSource: 'cannulaPrime' });
      expect(host.node().querySelectorAll('g.d3-sitechange-group')).to.have.length(1);
    });

    it('renders one icon per site change spaced more than 5 minutes apart', function() {
      var host = render([
        datum('a', 'cannulaPrime', 'Tandem', 0),
        datum('b', 'cannulaPrime', 'Tandem', 6 * 60 * 1000),
      ], { size: 24, icons: ICONS, siteChangeSource: 'cannulaPrime' });

      var groups = host.node().querySelectorAll('g.d3-sitechange-group');
      expect(groups).to.have.length(2);

      var images = host.node().querySelectorAll('g.d3-sitechange-group image');
      expect(images).to.have.length(2);
      // x = xScale(normalTime) - size/2
      var xs = Array.from(images, function(node) { return Number(node.getAttribute('x')); });
      expect(xs).to.include.members([0 - 12, 6 * 60 * 1000 - 12]);
    });

    it('matches the selected subtype against the raw prime/primeTarget shape', function() {
      var host = render([
        primeDatum('a', 'cannula', 'Tandem', 100),
        primeDatum('b', 'tubing', 'Tandem', 1000),
        datum('c', 'reservoirChange', 'Tandem', 2000),
      ], { size: 24, icons: ICONS, siteChangeSource: 'tubingPrime' });

      var hrefs = Array.from(host.node().querySelectorAll('g.d3-sitechange-group image'), hrefOf);
      expect(hrefs).to.deep.equal(['TUBING_URL']);
    });

    it('shows a single icon for site changes within 5 minutes of each other', function() {
      var host = render([
        datum('a', 'cannulaPrime', 'Tandem', 0),
        datum('b', 'cannulaPrime', 'Tandem', 2 * 60 * 1000),
        datum('c', 'cannulaPrime', 'Tandem', 4 * 60 * 1000),
      ], { size: 24, icons: ICONS, siteChangeSource: 'cannulaPrime' });

      // All three fall within 5 minutes of the first, so only one icon is drawn.
      expect(host.node().querySelectorAll('g.d3-sitechange-group')).to.have.length(1);
      expect(host.node().querySelectorAll('g.d3-sitechange-group image')).to.have.length(1);
    });

    it('anchors the window on the last kept icon, not the last raw event', function() {
      // 0, 4min, 8min: 4min is dropped (within 5 of the kept 0). 8min is kept
      // because it is >= 5 min after the kept 0 -- even though it is only 4 min
      // after the dropped 4min. A chained collapse would instead drop 8min and
      // keep only 0, so this fixture pins the last-kept-anchor semantics.
      var host = render([
        datum('a', 'cannulaPrime', 'Tandem', 0),
        datum('b', 'cannulaPrime', 'Tandem', 4 * 60 * 1000),
        datum('c', 'cannulaPrime', 'Tandem', 8 * 60 * 1000),
      ], { size: 24, icons: ICONS, siteChangeSource: 'cannulaPrime' });

      var xs = Array.from(host.node().querySelectorAll('g.d3-sitechange-group image'), function(node) {
        return Number(node.getAttribute('x'));
      });
      expect(xs).to.deep.equal([0 - 12, 8 * 60 * 1000 - 12]);
    });
  });

  describe('hover', function() {
    function withHoverDom() {
      var patientData = document.createElement('div');
      patientData.className = 'patient-data';
      document.body.appendChild(patientData);
      var nav = document.createElement('div');
      nav.id = 'tidelineScrollNav';
      document.body.appendChild(nav);
    }

    it('fires onEventHover with a datum (not the cluster) on mouseover, and onEventOut on mouseout', function() {
      withHoverDom();
      var onEventHover = jest.fn();
      var onEventOut = jest.fn();

      var host = render([datum('a', 'cannulaPrime', 'Tandem', 100)], {
        size: 24,
        icons: ICONS,
        siteChangeSource: 'cannulaPrime',
        onEventHover: onEventHover,
        onEventOut: onEventOut,
      });

      var node = host.node().querySelector('g.d3-sitechange-group');

      node.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      expect(onEventHover.mock.calls.length).to.equal(1);

      var payload = onEventHover.mock.calls[0][0];
      expect(payload).to.be.an('object');
      // payload.data is the deviceEvent datum itself, not the internal cluster
      expect(payload.data.id).to.equal('a');
      expect(payload.data.type).to.equal('deviceEvent');
      expect(payload.data).to.not.have.property('datums');
      expect(payload).to.have.property('rect');
      expect(payload).to.have.property('chartExtents');

      node.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
      expect(onEventOut.mock.calls.length).to.equal(1);
    });
  });
});
