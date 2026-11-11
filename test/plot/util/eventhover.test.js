/* global chai, jest */

var d3 = require('d3');
var expect = chai.expect;

var eventhover = require('../../../js/plot/util/eventhover');

var PATIENT_DATA_RECT = { top: 40, left: 0, right: 900, bottom: 640, width: 900, height: 600 };
var NAV_RECT = { top: 600, left: 60, right: 860, bottom: 640, width: 800, height: 40 };
var GROUP_RECT = { top: 140, left: 200, right: 224, bottom: 164, width: 24, height: 24 };

// jsdom gives every element a zero rect, which would make the derived values
// indistinguishable from each other. Stub the three elements the helper measures
// so `rect.y` and `chartExtents` have values worth asserting.
function stubRect(node, rect) {
  node.getBoundingClientRect = function() {
    // A fresh plain object each call: the helper assigns `y` onto the group's rect.
    return Object.assign({}, rect);
  };
}

// Anchor elements the helper looks up by class / id.
function withHoverDom() {
  var patientData = document.createElement('div');
  patientData.className = 'patient-data';
  stubRect(patientData, PATIENT_DATA_RECT);
  document.body.appendChild(patientData);

  var nav = document.createElement('div');
  nav.id = 'tidelineScrollNav';
  stubRect(nav, NAV_RECT);
  document.body.appendChild(nav);
}

// A host <g> holding one matching group (with a bound datum) and one sibling that
// does not match the selector, so binding scope can be asserted.
function withGroups(datum) {
  var host = d3.select(document.body).append('svg').append('g');
  var match = host.append('g').attr('class', 'd3-x-group').datum(datum);
  var other = host.append('g').attr('class', 'd3-other-group').datum(datum);
  stubRect(match.node(), GROUP_RECT);
  stubRect(other.node(), GROUP_RECT);
  return { host: host, match: match.node(), other: other.node() };
}

function hover(node) {
  node.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
}

function out(node) {
  node.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
}

describe('eventhover', function() {
  afterEach(function() {
    d3.select(document.body).selectAll('svg').remove();
    d3.select(document.body).selectAll('.patient-data, #tidelineScrollNav').remove();
  });

  it('calls onHover with the bound datum, the measured rect and the chart extents', function() {
    withHoverDom();
    var datum = { id: 'a', type: 'deviceEvent' };
    var nodes = withGroups(datum);
    var onHover = jest.fn();

    eventhover(nodes.host, '.d3-x-group', { onHover: onHover });
    hover(nodes.match);

    expect(onHover.mock.calls.length).to.equal(1);
    var args = onHover.mock.calls[0];
    expect(args[0]).to.equal(datum);

    // rect.y is the group's offset within the patient-data container, not its
    // viewport top -- that is the whole reason the helper measures both.
    var rect = args[1];
    expect(rect.top).to.equal(GROUP_RECT.top);
    expect(rect.y).to.equal(GROUP_RECT.top - PATIENT_DATA_RECT.top);

    expect(args[2]).to.deep.equal({
      left: NAV_RECT.left,
      right: NAV_RECT.right,
      width: NAV_RECT.right - NAV_RECT.left,
    });
  });

  it('calls onOut on mouseout', function() {
    withHoverDom();
    var nodes = withGroups({ id: 'a' });
    var onOut = jest.fn();

    eventhover(nodes.host, '.d3-x-group', { onHover: jest.fn(), onOut: onOut });
    out(nodes.match);

    expect(onOut.mock.calls.length).to.equal(1);
  });

  it('is a no-op on mouseout when no onOut is given', function() {
    withHoverDom();
    var nodes = withGroups({ id: 'a' });

    eventhover(nodes.host, '.d3-x-group', { onHover: jest.fn() });

    expect(function() { out(nodes.match); }).to.not.throw();
  });

  it('binds only the groups matching the selector', function() {
    withHoverDom();
    var nodes = withGroups({ id: 'a' });
    var onHover = jest.fn();
    var onOut = jest.fn();

    eventhover(nodes.host, '.d3-x-group', { onHover: onHover, onOut: onOut });
    hover(nodes.other);
    out(nodes.other);

    expect(onHover.mock.calls.length).to.equal(0);
    expect(onOut.mock.calls.length).to.equal(0);
  });
});
