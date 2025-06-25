var d3 = require('d3');
var _ = require('lodash');

var pumpAlarmImage = require('../../img/pumpAlarm/pumpAlarm.svg');

/**
 * Module for adding pumpAlarm markers to a chart pool
 *
 * @param  {Object} pool the chart pool
 * @param  {Object|null} opts configuration options
 * @return {Object}      pumpAlarm object
 */
module.exports = function(pool, opts = {}) {
  function pumpAlarm(selection) {
    selection.each(function(currentData) {
      var filteredData = _.filter(currentData, { tags: { alarm: true } });

      var pumpAlarms = d3.select(this)
        .selectAll('g.d3-pumpAlarm-group')
        .data(filteredData, function(d) {
          return d.id;
        });

      var pumpAlarmGroup = pumpAlarms.enter()
        .append('g')
        .attr({
          'class': 'd3-pumpAlarm-group',
          id: function(d) {
            return 'pumpAlarm_' + d.id;
          }
        });

      pumpAlarm.addpumpAlarmToPool(pumpAlarmGroup);

      pumpAlarms.exit().remove();

      // tooltips
      selection.selectAll('.d3-pumpAlarm-group').on('mouseover', function() {
        var parentContainer = document.getElementsByClassName('patient-data')[0].getBoundingClientRect();
        var chartNavContainer = document.getElementById('tidelineScrollNav').getBoundingClientRect();
        var container = this.getBoundingClientRect();
        container.y = container.top - parentContainer.top;

        var chartExtents = {
          left: chartNavContainer.left,
          right: chartNavContainer.right,
          width: chartNavContainer.right - chartNavContainer.left,
        };

        pumpAlarm.addTooltip(d3.select(this).datum(), container, chartExtents);
      });

      selection.selectAll('.d3-pumpAlarm-group').on('mouseout', function() {
        if (_.get(opts, 'onPumpAlarmOut', false)) {
          opts.onPumpAlarmOut();
        }
      });
    });
  };

  pumpAlarm.addTooltip = function(d, rect, chartExtents) {
    if (_.get(opts, 'onPumpAlarmHover', false)) {
      opts.onPumpAlarmHover({
        data: d,
        rect: rect,
        chartExtents,
      });
    }
  };

  pumpAlarm.addpumpAlarmToPool = function(selection) {
    opts.xScale = pool.xScale().copy();
    selection.append('image')
      .attr({
        'xlink:href': pumpAlarmImage,
        x: pumpAlarm.xPositionCorner,
        y: pumpAlarm.yPositionCorner,
        width: opts.size,
        height: opts.size
      })
      .classed({'d3-image': true, 'd3-pumpAlarm': true});

    selection.on('mouseover', pumpAlarm._displayTooltip);
    selection.on('mouseout', pumpAlarm._removeTooltip);
  };

  pumpAlarm.xPositionCorner = function(d) {
    return opts.xScale(d.normalTime) - opts.size / 2;
  };

  pumpAlarm.yPositionCorner = function(d) {
    return pool.height() / 2 - opts.size / 2;
  };

  return pumpAlarm;
};
