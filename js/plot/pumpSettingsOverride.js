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
var i18next = require('i18next');
var t = i18next.t.bind(i18next);

var _ = require('lodash');

var dt = require('../data/util/datetime');
var { SETTINGS_OVERRIDE_LABELS } = require('../data/util/constants');

module.exports = function(pool, opts) {
  opts = opts || {};

  var defaults = {
    opacity: 0.4,
    opacityDelta: 0.2,
    pathStroke: 1.5,
    timezoneAware: false,
    tooltipPadding: 20
  };

  opts = _.defaults(opts, defaults);

  function settingsOverride(selection) {
    opts.xScale = pool.xScale().copy();

    var isFabricatedNewDayOverride = datum => {
      return _.includes(
        _.map(_.get(datum, 'annotations', []), 'code'),
        'tandem/pumpSettingsOverride/fabricated-from-new-day'
      );
    };

    selection.each(function(currentData) {
      var filteredData = _.filter(currentData, {
        subType: 'pumpSettingsOverride',
      });

      var deviceEventGroup = selection
        .selectAll('.d3-deviceevent-group')
        .data(['d3-deviceevent-group']);

      deviceEventGroup
        .enter()
        .append('g')
        .attr('class', 'd3-basal-path-group');

      _.each(filteredData, (datum, index) => {
        var id = datum.id;
        var radius = 7;
        var xPosition = settingsOverride.xPosition(datum);
        var yPosition = radius + 2;
        var endXPosition = settingsOverride.endXPosition(datum);
        var overrideType = _.get(datum, 'overrideType');
        var source = datum.source;
        var prevDatum = filteredData[index - 1];
        var showMarker = !isFabricatedNewDayOverride(datum) || !isFabricatedNewDayOverride(prevDatum);

        var markers = deviceEventGroup
          .selectAll(`.d3-basal-marker-group.d3-basal-marker-group-override-${overrideType}-${id}`)
          .data([`d3-basal-marker-group d3-basal-marker-group-override-${overrideType}-${id}`]);

        var markersGroups = markers
          .enter()
          .append('g')
          .attr('class', function(d) {
            return d;
          });

        showMarker && markersGroups.append('line').attr({
          x1: xPosition,
          y1: yPosition,
          x2: xPosition,
          y2: pool.height(),
          class: 'd3-basal-group-line'
        });

        markersGroups.append('line').attr({
          x1: xPosition,
          y1: yPosition,
          x2: endXPosition,
          y2: yPosition,
          class: 'd3-marker-extension-line'
        });

        showMarker && markersGroups.append('circle').attr({
          class: 'd3-basal-group-circle',
          cx: xPosition,
          cy: yPosition,
          r: radius
        });

        showMarker && markersGroups
          .append('text')
          .attr({
            x: xPosition,
            y: yPosition,
            class: 'd3-basal-group-label'
          })
          .text(_.get(SETTINGS_OVERRIDE_LABELS, [source, datum.overrideType, 'marker'], (datum.overrideType || 'O').toUpperCase()).charAt(0));

        markers.exit().remove();
      });
    });
  }

  settingsOverride.xPosition = function(d) {
    return opts.xScale(d.normalTime);
  };

  settingsOverride.endXPosition = function(d) {
    return opts.xScale(Date.parse(dt.addDuration(d.normalTime, d.duration)));
  };

  settingsOverride.yPosition = function(d) {
    return opts.yScale(d.rate);
  };

  return settingsOverride;
};
