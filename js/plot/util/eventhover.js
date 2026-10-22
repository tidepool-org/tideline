var d3 = require('d3');

/**
 * Bind the hover wiring shared by the events-pool plots (event, alarm, sitechange).
 *
 * mouseover measures the hovered group against the patient-data container and the
 * scroll nav, then hands (datum, rect, chartExtents) to the plot's tooltip dispatcher.
 * mouseout calls handlers.onOut when the plot was given one.
 *
 * @param {Object} selection    the plot's d3 selection
 * @param {String} groupSelector selector for the plot's icon groups
 * @param {Object} handlers
 * @param {Function} handlers.onHover called with (datum, rect, chartExtents)
 * @param {Function} [handlers.onOut] called on mouseout
 */
module.exports = function eventhover(selection, groupSelector, handlers) {
  selection.selectAll(groupSelector).on('mouseover', function() {
    var parentContainer = document.getElementsByClassName('patient-data')[0].getBoundingClientRect();
    var chartNavContainer = document.getElementById('tidelineScrollNav').getBoundingClientRect();
    var container = this.getBoundingClientRect();
    container.y = container.top - parentContainer.top;

    var chartExtents = {
      left: chartNavContainer.left,
      right: chartNavContainer.right,
      width: chartNavContainer.right - chartNavContainer.left,
    };

    handlers.onHover(d3.select(this).datum(), container, chartExtents);
  });

  selection.selectAll(groupSelector).on('mouseout', function() {
    if (handlers.onOut) {
      handlers.onOut();
    }
  });
};
