/* global chai */

var _ = require('lodash');
var expect = chai.expect;

var tideline = require('../../js/index');
var chartDailyFactory = require('../../plugins/blip/chartdailyfactory');

var BG_CLASSES = {
  high: { boundary: 250 },
  low: { boundary: 70 },
  target: { boundary: 180 },
  'very-low': { boundary: 54 },
};

var DATA = [
  { id: 'a', type: 'deviceEvent', subType: 'reservoirChange', source: 'Insulet', normalTime: '2024-01-01T06:00:00.000Z' },
  { id: 'b', type: 'deviceEvent', subType: 'reservoirChange', source: 'Insulet', normalTime: '2024-01-03T18:00:00.000Z' },
];

// jsdom reports zero for both dimensions; the factory refuses an unsized element.
function container() {
  var el = document.createElement('div');
  el.id = 'tidelineContainer';
  Object.defineProperty(el, 'offsetWidth', { value: 960 });
  Object.defineProperty(el, 'offsetHeight', { value: 480 });
  document.body.appendChild(el);
  return el;
}

describe('chartDailyFactory site-change plot registration', function() {
  var siteChange;

  beforeEach(function() {
    siteChange = jest.spyOn(tideline.plot, 'siteChange');
  });

  afterEach(function() {
    jest.restoreAllMocks();
    document.body.innerHTML = '';
  });

  // tideline.plot.siteChange(pool, opts) — collect the opts each registration received.
  function siteChangeOptsForEachCall() {
    return _.map(siteChange.mock.calls, function(args) { return args[1]; });
  }

  // Build a chart through the same setupPools + load sequence blip's Daily view uses.
  function load(options) {
    var chart = chartDailyFactory(container(), _.assign({ bgClasses: BG_CLASSES }, options));
    chart.setupPools();
    chart.load(DATA, true);
    return chart;
  }

  it('registers no site-change plot type for an undeclared selection', function() {
    load({ siteChangeSource: 'undeclared' });
    expect(siteChangeOptsForEachCall()).to.have.length(0);
  });

  it('registers no site-change plot type when nothing is selected', function() {
    load({});
    expect(siteChangeOptsForEachCall()).to.have.length(0);
  });

  _.each(['cannulaPrime', 'tubingPrime', 'reservoirChange'], function(subType) {
    it('registers the site-change plot type for ' + subType, function() {
      load({ siteChangeSource: subType });
      expect(siteChangeOptsForEachCall()).to.have.length(1);
      expect(siteChangeOptsForEachCall()[0].siteChangeSource).to.equal(subType);
    });
  });

  it('forwards siteChangeSourceLabel to the plot', function() {
    load({ siteChangeSource: 'reservoirChange', siteChangeSourceLabel: 'Pod Change' });
    expect(siteChangeOptsForEachCall()[0].siteChangeSourceLabel).to.equal('Pod Change');
  });
});
