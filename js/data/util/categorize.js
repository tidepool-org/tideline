/*
 * == BSD2 LICENSE ==
 * Copyright (c) 2017, Tidepool Project
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

/* jshint esversion:6 */

var _ = require('lodash');
var { MGDL_UNITS, MMOLL_UNITS, DEFAULT_BG_BOUNDS } = require('../../data/util/constants');

var bankersRound = function (value, precision = 0) {
  /* eslint-disable no-nested-ternary */
  const x = value * (10 ** precision);
  const r = Math.round(x);
  const br = Math.abs(x) % 1 === 0.5 ? (r % 2 === 0 ? r : r - 1) : r;
  return br / (10 ** precision);
  /* eslint-enable no-nested-ternary */
};

var Categorizer = function(bgClasses = {}, bgUnits = MGDL_UNITS){
  var classes = _.cloneDeep(bgClasses);
  var defaults = {
    'very-low': { boundary: DEFAULT_BG_BOUNDS[bgUnits].veryLow },
    low: { boundary: DEFAULT_BG_BOUNDS[bgUnits].targetLower },
    target: { boundary: DEFAULT_BG_BOUNDS[bgUnits].targetUpper },
    high: { boundary: DEFAULT_BG_BOUNDS[bgUnits].veryHigh },
  };

  _.defaults(classes, defaults);

  return function(d) {
    var precision = 0;
    if (bgUnits === MMOLL_UNITS) {
      precision = 1;
    }

    var roundedValue = bankersRound(d.value, precision);

    if (!!classes['very-low'].boundary && roundedValue < classes['very-low'].boundary) {
      return 'verylow';
    } else if (!!classes.high.boundary && roundedValue > classes.high.boundary) {
      return 'veryhigh';
    } else if (roundedValue < classes.low.boundary) {
      return 'low';
    } else if (roundedValue > classes.target.boundary) {
      return 'high';
    }

    return 'target';
  };
};

module.exports = Categorizer;
