/*
 * == BSD2 LICENSE ==
 * Copyright (c) 2014, Tidepool Project
 *
 * This program is free software; you can redistribute it and/or modify it under
 * the terms of the associated License, which is identical to the BSD 2-Clause
 * License as published by the Open Source Initiative at opensource.org.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the License for more details.
 *
 * You should have received a copy of the License along with this program; if
 * not, you can obtain one from Tidepool Project at tidepool.org.
 * == BSD2 LICENSE ==
 */

var chai = require('chai');
var assert = chai.assert;
var expect = chai.expect;
var _ = require('lodash');

var BasalUtil = require('../js/data/basalutil');

describe('BasalUtil', function() {
  var bu = new BasalUtil([]);
  it('should be a function', function() {
    assert.isFunction(BasalUtil);
  });

  it('should be a (newable) constructor', function() {
    expect(bu).to.exist;
  });

  describe('getBasalPathGroupType', function() {
    it('should return the path group type `automated` for an automated basal', function() {
      expect(bu.getBasalPathGroupType({ deliveryType: 'automated' })).to.equal('automated');
    });

    it('should return the path group type `manual` for a non-automated basal', function() {
      expect(bu.getBasalPathGroupType({ deliveryType: 'scheduled' })).to.equal('manual');
      expect(bu.getBasalPathGroupType({ deliveryType: 'temp' })).to.equal('manual');
      expect(bu.getBasalPathGroupType({ deliveryType: 'suspend' })).to.equal('manual');
    });

    it('should return the path group type `manual` for a suspend suppressing non-automated delivery', function() {
      expect(bu.getBasalPathGroupType({ deliveryType: 'suspend', suppressed: { deliveryType: 'scheduled' } })).to.equal('manual');
      expect(bu.getBasalPathGroupType({ deliveryType: 'suspend', suppressed: { deliveryType: 'temp' } })).to.equal('manual');
    });

    it('should return the path group type `automated` for a suspend suppressing automated delivery', function() {
      expect(bu.getBasalPathGroupType({ deliveryType: 'suspend', suppressed: { deliveryType: 'automated' } })).to.equal('automated');
    });
  });

  describe('getBasalPathGroups', function() {
    it('should return an array of groupings of automated and manual data', function() {
      var mixedBasals = [
        { deliveryType: 'automated' },
        { deliveryType: 'scheduled' },
        { deliveryType: 'scheduled' },
        { deliveryType: 'automated' },
        { deliveryType: 'automated' },
      ];
      var result = bu.getBasalPathGroups(mixedBasals);
      expect(result).to.be.an('array');
      expect(result.length).to.equal(3);

      _.each(result, function(group, groupIndex) {
        expect(group).to.be.an('array');

        var expectedSubType = groupIndex === 1 ? 'scheduled' : 'automated';
        _.each(group, function(datum) {
          expect(datum.deliveryType).to.equal(expectedSubType);
        });
      });
    });
  });
});
