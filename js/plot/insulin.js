var d3 = require('d3');
var _ = require('lodash');

var commonbolus = require('./util/commonbolus');
var drawbolus = require('./util/drawbolus');

module.exports = function(pool, opts) {
  opts = opts || {};

  var defaults = {
    width: 12
  };

  _.defaults(opts, defaults);

  var drawBolus = drawbolus(pool, opts);

  function insulin(selection) {
    opts.xScale = pool.xScale().copy();
    selection.each(function(currentData) {
      drawBolus.annotations(_.filter(currentData, function(d) { return d.annotations; }));

      var insulinData = d3.select(this)
        .selectAll('g.d3-insulin-group')
        .data(currentData, function(d) {
          return d.id;
        });

      var insulinGroups = insulinData.enter()
        .append('g')
        .attr({
          'class': 'd3-insulin-group',
          id: function(d) { return 'insulin_group_' + d.id; }
        });

      var defs = insulinGroups.append('defs');
      defs.append('pattern')
        .attr('id', 'diagonalStripes')
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('width', 5)
        .attr('height', 5)
        .attr('patternTransform', 'rotate(45)');

      defs.select('#diagonalStripes')
        .append('rect')
        .attr('width', 5)
        .attr('height', 5)
        .attr('fill', '#7CD0F0');

      defs.select('#diagonalStripes')
        .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 2)
        .attr('height', 5)
        .attr('fill', 'rgba(0, 0, 0, 0.15)');

      // sort by size so smaller insulin doses are drawn last
      insulinGroups = insulinGroups.sort(function(a,b){
        const aDose = commonbolus.getDelivered(a);
        const bDose = commonbolus.getDelivered(b);

        // in cases where the dose value is the same, tiebreak the sort by counting extended boluses
        // as 1 unit higher so that a non-extended bolus is drawn on top, enabling both to be hovered over
        if (aDose === bDose) {
          return d3.descending(a.tags?.extended ? 1 : 0, b.tags?.extended ? 1 : 0);
        }

        return d3.descending(aDose, bDose);
      });

      drawBolus.bolus(insulinGroups.filter(function(d) {
        return commonbolus.getDelivered(d);
      }));

      insulinData.exit().remove();

      var highlight = pool.highlight('.d3-wizard-group, .d3-insulin-group', opts);

      // tooltips
      selection.selectAll('.d3-insulin-group').on('mouseover', function(d) {
        highlight.on(d3.select(this));
        var parentContainer = document.getElementsByClassName('patient-data')[0].getBoundingClientRect();
        var container = this.getBoundingClientRect();
        container.y = container.top - parentContainer.top;

        drawBolus.tooltip.add(d, container);
      });
      selection.selectAll('.d3-insulin-group').on('mouseout', function(d) {
        highlight.off();
        drawBolus.tooltip.remove(d);
      });
    });
  }

  return insulin;
};
