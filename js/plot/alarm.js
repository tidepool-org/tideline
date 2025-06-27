var d3 = require('d3');
var _ = require('lodash');

var alarmImage = require('../../img/alarm/alarm.svg');

/**
 * Module for adding alarm markers to a chart pool
 *
 * @param  {Object} pool the chart pool
 * @param  {Object|null} opts configuration options
 * @return {Object}      alarm object
 */
module.exports = function(pool, opts = {}) {
  function alarm(selection) {
    selection.each(function(currentData) {
      var filteredData = _.filter(currentData, { tags: { alarm: true } });

      var alarms = d3.select(this)
        .selectAll('g.d3-alarm-group')
        .data(filteredData, function(d) {
          return d.id;
        });

      var alarmGroup = alarms.enter()
        .append('g')
        .attr({
          'class': 'd3-alarm-group',
          id: function(d) {
            return 'alarm_' + d.id;
          }
        });

      alarm.addalarmToPool(alarmGroup);

      alarms.exit().remove();

      // tooltips
      selection.selectAll('.d3-alarm-group').on('mouseover', function() {
        var parentContainer = document.getElementsByClassName('patient-data')[0].getBoundingClientRect();
        var chartNavContainer = document.getElementById('tidelineScrollNav').getBoundingClientRect();
        var container = this.getBoundingClientRect();
        container.y = container.top - parentContainer.top;

        var chartExtents = {
          left: chartNavContainer.left,
          right: chartNavContainer.right,
          width: chartNavContainer.right - chartNavContainer.left,
        };

        alarm.addTooltip(d3.select(this).datum(), container, chartExtents);
      });

      selection.selectAll('.d3-alarm-group').on('mouseout', function() {
        if (_.get(opts, 'onAlarmOut', false)) {
          opts.onAlarmOut();
        }
      });
    });
  };

  alarm.addTooltip = function(d, rect, chartExtents) {
    if (_.get(opts, 'onAlarmHover', false)) {
      opts.onAlarmHover({
        data: d,
        rect: rect,
        chartExtents,
      });
    }
  };

  alarm.addalarmToPool = function(selection) {
    opts.xScale = pool.xScale().copy();
    selection.append('image')
      .attr({
        'xlink:href': alarmImage,
        x: alarm.xPositionCorner,
        y: alarm.yPositionCorner,
        width: opts.size,
        height: opts.size
      })
      .classed({'d3-image': true, 'd3-alarm': true});

    selection.on('mouseover', alarm._displayTooltip);
    selection.on('mouseout', alarm._removeTooltip);
  };

  alarm.xPositionCorner = function(d) {
    return opts.xScale(d.normalTime) - opts.size / 2;
  };

  alarm.yPositionCorner = function(d) {
    return pool.height() / 2 - opts.size / 2;
  };

  return alarm;
};
