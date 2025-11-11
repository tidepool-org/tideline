var d3 = require('d3');
var _ = require('lodash');

var eventImage = require('../../img/event/event.svg');

/**
 * Module for adding event markers to a chart pool
 *
 * @param  {Object} pool the chart pool
 * @param  {Object|null} opts configuration options
 * @return {Object}      event object
 */
module.exports = function(pool, opts = {}) {
  function event(selection) {
    selection.each(function(currentData) {
      var filteredData = _.filter(currentData, d => _.isString(d.tags?.event));

      var events = d3.select(this)
        .selectAll('g.d3-event-group')
        .data(filteredData, function(d) {
          return d.id;
        });

      var eventGroup = events.enter()
        .append('g')
        .attr({
          'class': 'd3-event-group',
          id: function(d) {
            return 'event_' + d.id;
          }
        });

      event.addeventToPool(eventGroup);

      events.exit().remove();

      // tooltips
      selection.selectAll('.d3-event-group').on('mouseover', function() {
        var parentContainer = document.getElementsByClassName('patient-data')[0].getBoundingClientRect();
        var chartNavContainer = document.getElementById('tidelineScrollNav').getBoundingClientRect();
        var container = this.getBoundingClientRect();
        container.y = container.top - parentContainer.top;

        var chartExtents = {
          left: chartNavContainer.left,
          right: chartNavContainer.right,
          width: chartNavContainer.right - chartNavContainer.left,
        };

        event.addTooltip(d3.select(this).datum(), container, chartExtents);
      });

      selection.selectAll('.d3-event-group').on('mouseout', function() {
        if (_.get(opts, 'onEventOut', false)) {
          opts.onEventOut();
        }
      });
    });
  };

  event.addTooltip = function(d, rect, chartExtents) {
    if (_.get(opts, 'onEventHover', false)) {
      opts.onEventHover({
        data: d,
        rect: rect,
        chartExtents,
      });
    }
  };

  event.addeventToPool = function(selection) {
    opts.xScale = pool.xScale().copy();
    selection.append('image')
      .attr({
        'xlink:href': eventImage,
        x: event.xPositionCorner,
        y: event.yPositionCorner,
        width: opts.size,
        height: opts.size
      })
      .classed({'d3-image': true, 'd3-event': true});
  };

  event.xPositionCorner = function(d) {
    return opts.xScale(d.normalTime) - opts.size / 2;
  };

  event.yPositionCorner = function(d) {
    return pool.height() / 2 - opts.size / 2;
  };

  return event;
};
