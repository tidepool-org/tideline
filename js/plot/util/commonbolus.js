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

var _ = require('lodash');

var format = require('../../data/util/format');

module.exports = {
  getRecommended: function(d) {
    let event = d;

    if (_.get(d, 'type') === 'bolus' && (event.dosingDecision || event.wizard)) {
      event = event.dosingDecision || event.wizard;
    }

    if (!event.recommended && !event.recommendedBolus) {
      return NaN;
    }

    const netRecommendation = event.recommendedBolus
      ? _.get(event, ['recommendedBolus', 'amount'], null)
      : _.get(event, ['recommended', 'net'], null);

    if (netRecommendation != null) {
      return netRecommendation;
    }

    var rec = 0;
    rec += _.get(event, ['recommended', 'carb'], 0);
    rec += _.get(event, ['recommended', 'correction'], 0);

    return format.fixFloatingPoint(rec);
  },
  getMaxValue: function(d) {
    var wiz;
    if (d.type === 'wizard') {
      if (d.bolus) {
        wiz = _.clone(d);
        d = d.bolus;
      }
      else {
        return NaN;
      }
    }
    var programmedTotal = this.getProgrammed(d);
    var rec = 0;
    if (wiz || d.dosingDecision) {
      rec = this.getRecommended(wiz || d);
    }
    return rec > programmedTotal ? rec : programmedTotal;
  },
  getDelivered: function(d) {
    if (d.type === 'wizard') {
      if (d.bolus) {
        d = d.bolus;
      }
      else {
        return NaN;
      }
    }
    if (d.extended != null) {
      if (d.normal != null) {
        return format.fixFloatingPoint(d.extended + d.normal);
      }
      else {
        return d.extended;
      }
    }
    else {
      return d.normal;
    }
  },
  getProgrammed: function(d) {
    if (d.type === 'wizard') {
      if (d.bolus) {
        d = d.bolus;
      }
      else {
        return NaN;
      }
    }
    if (d.extended != null && d.expectedExtended != null) {
      if (d.normal != null) {
        if (d.expectedNormal != null) {
          return format.fixFloatingPoint(d.expectedNormal + d.expectedExtended);
        }
        else {
          return format.fixFloatingPoint(d.normal + d.expectedExtended);
        }
      }
      else {
        return d.expectedExtended;
      }
    }
    else if (d.extended != null) {
      if (d.normal != null) {
        if (d.expectedNormal != null) {
          return format.fixFloatingPoint(d.expectedNormal + d.extended);
        }
        else {
          return format.fixFloatingPoint(d.normal + d.extended);
        }
      }
      else {
        return d.extended;
      }
    }
    else {
      return d.expectedNormal || d.normal;
    }
  },
  getMaxDuration: function(d) {
    if (d.type === 'wizard') {
      if (d.bolus) {
        d = d.bolus;
      }
      else {
        return NaN;
      }
    }
    // don't want truthiness here because want to return expectedDuration
    // from a bolus interrupted immediately (duration = 0)
    if (d.duration == null) {
      return NaN;
    }
    return d.expectedDuration || d.duration;
  },
};
