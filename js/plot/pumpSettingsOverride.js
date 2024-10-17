/* jshint esversion:6 */
var d3 = require('d3');
var _ = require('lodash');
var moment = require('moment-timezone');

var { SETTINGS_OVERRIDE_LABELS } = require('../data/util/constants');

module.exports = function(pool, opts) {
  opts = opts || {};

  function settingsOverride(selection) {
    opts.xScale = pool.xScale().copy();

    var isFabricatedNewDayOverride = datum => {
      return _.includes(
        _.map(_.get(datum, 'annotations', []), 'code'),
        'tandem/pumpSettingsOverride/fabricated-from-new-day'
      );
    };

    selection.each(function(currentData) {
      var filteredData = _.filter(currentData, { subType: 'pumpSettingsOverride' });

      // Because the new datums are fabricated at upload when they cross midnight, we stitch them
      // together by adding the fabricated datum's duration to the previous one, so long as the
      // previous one is not also a fabricated datum.
      var stitchedData = _.reduce(filteredData, (res, datum) => {
        var prevDatum = res[res.length - 1];

        if (prevDatum && (isFabricatedNewDayOverride(datum) && !isFabricatedNewDayOverride(prevDatum))) {
          res[res.length - 1].normalEnd = datum.normalEnd;
          res[res.length - 1].duration += datum.duration;
        } else {
          // No need to stitch, but we still want to truncate the override end if it's scheduled to
          // extend into the future
          res.push({
            ...datum,
            normalEnd: _.min([datum.normalEnd, moment().tz(opts.timezoneName).valueOf()]),
          });
        }

        return res;
      }, []);

      var radius = 7;
      var yPosition = radius + 2;

      var markers = d3.select(this)
        .selectAll('.d3-basal-marker-group.d3-pump-settings-override-group')
        .data(stitchedData, function(d) {
          return d.id;
        });

      var markersGroups = markers
        .enter()
        .append('g')
        .attr('class', function(d) {
          return `d3-basal-marker-group-override-${d.overrideType}-${d.id}`;
        })
        .classed({ 'd3-basal-marker-group': true, 'd3-pump-settings-override-group': true });

      markersGroups.append('line').attr({
        x1: settingsOverride.xPosition,
        y1: yPosition,
        x2: settingsOverride.endXPosition,
        y2: yPosition,
        class: 'd3-marker-extension-line'
      });

      markersGroups.append('line').attr({
        x1: settingsOverride.xPosition,
        y1: yPosition,
        x2: settingsOverride.xPosition,
        y2: pool.height(),
        class: 'd3-basal-group-line'
      });

      markersGroups.append('circle').attr({
        class: 'd3-basal-group-circle',
        cx: settingsOverride.xPosition,
        cy: yPosition,
        r: radius
      });

      markersGroups
        .append('text')
        .attr({
          x: settingsOverride.xPosition,
          y: yPosition,
          class: 'd3-basal-group-label'
        })
        .text(d => _.get(SETTINGS_OVERRIDE_LABELS, [d.source, d.overrideType, 'marker'], (d.overrideType || 'O').toUpperCase()).charAt(0));

      markersGroups.append('rect').attr({
        x: d => settingsOverride.xPosition(d) - radius,
        y: 0,
        width: d => (settingsOverride.endXPosition(d) - settingsOverride.xPosition(d)) + radius,
        height: radius * 2,
        class: 'd3-marker-extension-hover-target'
      });

      markers.exit().remove();

      var highlight = pool.highlight(markers);

      // tooltips
      selection.selectAll('.d3-pump-settings-override-group').on('mouseover', function(d) {
        highlight.on(d3.select(this));
        var parentContainer = document.getElementsByClassName('patient-data')[0].getBoundingClientRect();
        var chartNavContainer = document.getElementById('tidelineScrollNav').getBoundingClientRect();
        var container = this.getBoundingClientRect();
        container.y = container.top - parentContainer.top;

        var chartExtents = {
          left: chartNavContainer.left,
          right: chartNavContainer.right,
          width: chartNavContainer.right - chartNavContainer.left,
        };

        settingsOverride.addTooltip(d3.select(this).datum(), container, chartExtents);
      });
      selection.selectAll('.d3-pump-settings-override-group').on('mouseout', function() {
        highlight.off();
        if (_.get(opts, 'onPumpSettingsOverrideOut', false)){
          opts.onPumpSettingsOverrideOut();
        }
      });
    });
  }

  settingsOverride.xPosition = function(d) {
    return opts.xScale(d.normalTime);
  };

  settingsOverride.endXPosition = function(d) {
    return opts.xScale(d.normalEnd);
  };

  settingsOverride.yPosition = function(d) {
    return opts.yScale(d.rate);
  };

  settingsOverride.addTooltip = function(d, rect, chartExtents) {
    if (_.get(opts, 'onPumpSettingsOverrideHover', false)) {
      opts.onPumpSettingsOverrideHover({
        data: d,
        rect,
        chartExtents,
      });
    }
  };

  return settingsOverride;
};
