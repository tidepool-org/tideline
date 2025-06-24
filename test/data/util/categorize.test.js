/* global expect */

var { MGDL_UNITS, MMOLL_UNITS, DEFAULT_BG_BOUNDS } = require('../../../js/data/util/constants');
var categorizer = require('../../../js/data/util/categorize');

describe('Categorize', () => {
  describe('five-way classification (verylow, low, target, high, veryhigh)', () => {
    var categorize = categorizer({}, MGDL_UNITS);

    describe('when units are mg/dL and bgBounds follow ADA Standardized CGM metrics', () => {
      it('should return `verylow` for a value < 54', () => {
        expect(categorize({ value: 50 })).to.equal('verylow');
        expect(categorize({ value: 53.45 })).to.equal('verylow');
      });

      it('should return `low` for a value between 54 - 69', () => {
        expect(categorize({ value: 53.999 })).to.equal('low');
        expect(categorize({ value: 54 })).to.equal('low');
        expect(categorize({ value: 57 })).to.equal('low');
        expect(categorize({ value: 62 })).to.equal('low');
        expect(categorize({ value: 69 })).to.equal('low');
        expect(categorize({ value: 69.1 })).to.equal('low');
        expect(categorize({ value: 69.4 })).to.equal('low');
        expect(categorize({ value: 69.4999 })).to.equal('low');
      });

      it('should return `target` for a value between 70 - 180', () => {
        expect(categorize({ value: 69.5 })).to.equal('target'); // banker's round up
        expect(categorize({ value: 69.6 })).to.equal('target');
        expect(categorize({ value: 69.8 })).to.equal('target');
        expect(categorize({ value: 70 })).to.equal('target');
        expect(categorize({ value: 91 })).to.equal('target');
        expect(categorize({ value: 145 })).to.equal('target');
        expect(categorize({ value: 166 })).to.equal('target');
        expect(categorize({ value: 180 })).to.equal('target');
        expect(categorize({ value: 180.1 })).to.equal('target');
        expect(categorize({ value: 180.4 })).to.equal('target');
        expect(categorize({ value: 180.5 })).to.equal('target'); // banker's round down
      });

      it('should return `high` for a value between 181 - 250', () => {
        expect(categorize({ value: 180.5001 })).to.equal('high');
        expect(categorize({ value: 180.8 })).to.equal('high');
        expect(categorize({ value: 181 })).to.equal('high');
        expect(categorize({ value: 200 })).to.equal('high');
        expect(categorize({ value: 231 })).to.equal('high');
        expect(categorize({ value: 250 })).to.equal('high');
        expect(categorize({ value: 250.2 })).to.equal('high');
      });


      it('should return `veryhigh` for a value > 250', () => {
        expect(categorize({ value: 250.67 })).to.equal('veryhigh');
        expect(categorize({ value: 251 })).to.equal('veryhigh');
        expect(categorize({ value: 260 })).to.equal('veryhigh');
      });
    });

    describe('when units are mmol/L and bgBounds follow ADA Standardized CGM metrics', () => {
      var categorize = categorizer({}, MMOLL_UNITS);

      it('should return `verylow` for a value < 3.0', () => {
        expect(categorize({ value: 2 })).to.equal('verylow');
        expect(categorize({ value: 2.85 })).to.equal('verylow');
        expect(categorize({ value: 2.9 })).to.equal('verylow');
        expect(categorize({ value: 2.94 })).to.equal('verylow');
      });

      it('should return `low` for a value between 3.0 - 3.8', () => {
        expect(categorize({ value: 2.96 })).to.equal('low');
        expect(categorize({ value: 3 })).to.equal('low');
        expect(categorize({ value: 3.55 })).to.equal('low');
        expect(categorize({ value: 3.8 })).to.equal('low');
        expect(categorize({ value: 3.81 })).to.equal('low');
        expect(categorize({ value: 3.84 })).to.equal('low');
        expect(categorize({ value: 3.85 })).to.equal('low'); // banker's round down
      });

      it('should return `target` for a value between 3.9 - 10.0', () => {
        expect(categorize({ value: 3.85001 })).to.equal('target');
        expect(categorize({ value: 3.88 })).to.equal('target');
        expect(categorize({ value: 3.9 })).to.equal('target');
        expect(categorize({ value: 4 })).to.equal('target');
        expect(categorize({ value: 7 })).to.equal('target');
        expect(categorize({ value: 9 })).to.equal('target');
        expect(categorize({ value: 10 })).to.equal('target');
        expect(categorize({ value: 10.001 })).to.equal('target');
        expect(categorize({ value: 10.04 })).to.equal('target');
        expect(categorize({ value: 10.05 })).to.equal('target'); // banker's round down
      });

      it('should return `high` for a value between 10.1 - 13.9', () => {
        expect(categorize({ value: 10.05001 })).to.equal('high');
        expect(categorize({ value: 10.08 })).to.equal('high');
        expect(categorize({ value: 10.1 })).to.equal('high');
        expect(categorize({ value: 12 })).to.equal('high');
        expect(categorize({ value: 13.9 })).to.equal('high');
        expect(categorize({ value: 13.93 })).to.equal('high');
      });


      it('should return `veryhigh` for a value > 13.9`', () => {
        expect(categorize({ value: 13.95 })).to.equal('veryhigh');
        expect(categorize({ value: 14 })).to.equal('veryhigh');
      });
    });
  });
});
