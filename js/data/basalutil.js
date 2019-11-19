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

/* jshint esversion:6 */

var _ = require('lodash');

var dt = require('./util/datetime');

function BasalUtil(data) {
  /**
   * getBasalPathGroupType
   * @param {Object} basal - single basal datum
   * @return {String} the path group type
   */
  this.getBasalPathGroupType = function(datum) {
    var deliveryType = _.get(datum, 'deliveryType');
    var suppressedDeliveryType = _.get(datum, 'suppressed.deliveryType');
    return _.includes([deliveryType, suppressedDeliveryType], 'automated') ? 'automated' : 'manual';
  };

  /**
   * getBasalPathGroups
   * @param {Array} basals - Array of preprocessed Tidepool basal objects
   * @return {Array} groups of alternating 'automated' and 'manual' datums
   */
  this.getBasalPathGroups = function(basals) {
    var basalPathGroups = [];
    var currentPathType;
    _.each(basals, datum => {
      var pathType = this.getBasalPathGroupType(datum);
      if (pathType !== currentPathType) {
        currentPathType = pathType;
        basalPathGroups.push([]);
      }
      _.last(basalPathGroups).push(datum);
    });

    return basalPathGroups;
  };

  this.actual = data;

  this.data = data || [];
  if (this.data.length > 0) {
    this.endpoints = [this.data[0].normalTime, dt.addDuration(this.data[this.data.length - 1].normalTime, this.data[this.data.length - 1].duration)];
  }
}

module.exports = BasalUtil;
