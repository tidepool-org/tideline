/* global chai, jest */

var d3 = require('d3');
var expect = chai.expect;

var eventFactory = require('../../js/plot/event');

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
  var plot = eventFactory(poolStub(), opts);
  var host = d3.select(document.body).append('svg').append('g').datum(data);
  host.call(plot);
  return host;
}

// The two elements the shared hover wiring measures against.
function withHoverDom() {
  var patientData = document.createElement('div');
  patientData.className = 'patient-data';
  document.body.appendChild(patientData);
  var nav = document.createElement('div');
  nav.id = 'tidelineScrollNav';
  document.body.appendChild(nav);
}

describe('event plot', function() {
  afterEach(function() {
    d3.select(document.body).selectAll('svg').remove();
    d3.select(document.body).selectAll('.patient-data, #tidelineScrollNav').remove();
  });

  describe('hover', function() {
    it('fires onEventHover on mouseover and onEventOut on mouseout', function() {
      withHoverDom();
      var onEventHover = jest.fn();
      var onEventOut = jest.fn();

      var host = render([{ id: 'a', type: 'deviceEvent', tags: { event: 'notes' }, normalTime: 100 }], {
        size: 24,
        onEventHover: onEventHover,
        onEventOut: onEventOut,
      });

      var node = host.node().querySelector('g.d3-event-group');

      node.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      expect(onEventHover.mock.calls.length).to.equal(1);

      var payload = onEventHover.mock.calls[0][0];
      expect(payload.data.id).to.equal('a');
      expect(payload).to.have.property('rect');
      expect(payload).to.have.property('chartExtents');

      node.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
      expect(onEventOut.mock.calls.length).to.equal(1);
    });
  });
});
