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

module.exports = function(chart) {
  var defs = chart.insert("defs");
  // black drop shadow



  var filter = defs.append("filter")
      .attr("id", "drop-shadow")
      //.attr('filterUnits', "userSpaceOnUse")
      //.attr('color-interpolation-filters', "sRGB");
  filter.append("feOffset")
      .attr("dx", 1)
      .attr("dy", 0)
      .attr('result',"offOut")
      .attr("in", "SourceGraphic");
  filter.append("feColorMatrix")
    .attr("type", 'matrix')
    .attr("in", 'offOut')
    .attr("result", 'matrixOut')
    .attr('values', '.9 0 0 0 0 0 .9 0 0 0 0 0 .9 0 0 0 0 0 0.7 0');
  filter.append("feGaussianBlur")
    .attr("stdDeviation", 1)
    .attr("in", 'matrixOut')
    .attr("result", 'blurOut');
  filter.append("feBlend")
      .attr("in", "SourceGraphic")
      .attr("in2", 'blurOut')
      .attr("mode", 'normal');
};
