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
var d3 = require('../../lib/').d3;
var _ = require('../../lib/')._;

module.exports = function(backgroundSelection, opts) {
  opts = _.defaults(opts || {}, {
    subdueOpacity: 0.6
  });

  return {
    on: function(el) {
      d3.selectAll(backgroundSelection).attr('opacity', opts.subdueOpacity);
      d3.selectAll(el).empty() ? d3.select(el).attr('opacity', 1) : d3.selectAll(el).attr('opacity', 1);
    },
    off: function() {
      d3.selectAll(backgroundSelection).attr('opacity', 1);
    }
  }
};
