var chai = require('chai');
var expect = chai.expect;

var carbFactory = require('../js/plot/carb');

// A minimal pool stub is enough: the factory only reads pool/opts lazily inside
// carb(selection); constructing the renderer just wires up the closures we test.
var carb = carbFactory({}, {});

var food = (net) => ({ nutrition: { carbohydrate: { net: net } } });

describe('carb plot getOriginalCarbs', function() {
  it('reads the EARLIEST dosing decision’s originalFood on a multi-edit chain (25→35→44 → 25, not the stale 44)', function() {
    var datum = {
      nutrition: { carbohydrate: { net: 44 } }, // final
      // earliest decision keeps the true initial entry in originalFood; its food has
      // been rewritten to the final value (stale)
      originalDosingDecision: { originalFood: food(25), food: food(44) },
      // latest decision carries no originalFood on a multi-edit chain
      dosingDecision: { food: food(44) },
    };
    expect(carb.getOriginalCarbs(datum)).to.equal(25);
  });

  it('returns the original amount for a single edit (60→50 → 60)', function() {
    var datum = {
      nutrition: { carbohydrate: { net: 50 } },
      originalDosingDecision: { originalFood: food(60), food: food(50) },
      dosingDecision: { food: food(50), originalFood: food(60) },
    };
    expect(carb.getOriginalCarbs(datum)).to.equal(60);
  });

  it('returns the pre-deletion amount when only one dosing decision exists (delete 30→0 → 30)', function() {
    var datum = {
      nutrition: { carbohydrate: { net: 0 } },
      dosingDecision: { originalFood: food(30), food: food(0) },
    };
    expect(carb.getOriginalCarbs(datum)).to.equal(30);
  });

  it('falls back to the earliest decision’s food when it has no originalFood', function() {
    var datum = {
      nutrition: { carbohydrate: { net: 35 } },
      originalDosingDecision: { food: food(35) },
      dosingDecision: { food: food(35) },
    };
    expect(carb.getOriginalCarbs(datum)).to.equal(35);
  });

  it('returns undefined when no dosing decisions are present', function() {
    expect(carb.getOriginalCarbs({ nutrition: { carbohydrate: { net: 20 } } })).to.equal(undefined);
  });
});

describe('carb plot getCurrentCarbs', function() {
  it('returns the net carbohydrate value', function() {
    expect(carb.getCurrentCarbs(food(42))).to.equal(42);
  });

  it('returns 0 when nutrition.carbohydrate is absent (deleted edited carb)', function() {
    expect(carb.getCurrentCarbs({ nutrition: {}, tags: { carbsEdited: true } })).to.equal(0);
  });

  it('returns 0 when nutrition is absent', function() {
    expect(carb.getCurrentCarbs({ tags: { carbsEdited: true } })).to.equal(0);
  });
});

describe('carb plot render', function() {
  var d3 = require('d3');

  beforeAll(function() {
    // jsdom has no SVG layout; the edited branch measures the original-value text
    window.SVGElement.prototype.getBBox = window.SVGElement.prototype.getBBox
      || function() { return { x: 0, y: 0, width: 10, height: 10 }; };
  });

  afterEach(function() {
    d3.select(document.body).selectAll('svg').remove();
  });

  it('renders an edited carb with no nutrition.carbohydrate as original / 0', function() {
    var scale = function(t) { return t; };
    scale.copy = function() { return scale; };
    var plot = carbFactory({ xScale: function() { return scale; } }, {});
    var host = d3.select(document.body).append('svg').append('g').datum([{
      id: 'a',
      normalTime: 10,
      nutrition: {},
      tags: { carbsEdited: true },
      dosingDecision: { originalFood: food(30), food: food(30) },
    }]);

    host.call(plot);

    var texts = Array.from(host.node().querySelectorAll('text')).map(n => n.textContent);
    expect(texts).to.eql(['30', '0']);
  });
});
