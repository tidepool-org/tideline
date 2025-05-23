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

var d3 = require('d3');
var _ = require('lodash');

var log = require('bows')('Wizard');

var commonbolus = require('./util/commonbolus');
var drawbolus = require('./util/drawbolus');

module.exports = function(pool, opts) {
  opts = opts || {};

  var defaults = {
    width: 12
  };

  _.defaults(opts, defaults);

  var drawBolus = drawbolus(pool, opts);
  var mainGroup = pool.parent();

  return function(selection) {
    opts.xScale = pool.xScale().copy();

    selection.each(function(currentData) {
      var withAnnotations = _.filter(currentData, function(d) {
        if (d.annotations) {
          return true;
        }
        else if (d.bolus) {
          return d.bolus.annotations;
        }
      });

      drawBolus.annotations(withAnnotations);

      var wizards = d3.select(this)
        .selectAll('g.d3-wizard-group')
        .data(currentData, function(d) {
          return d.id;
        });

      var wizardGroups = wizards.enter()
        .append('g')
        .attr({
          'class': 'd3-wizard-group',
          id: function(d) {
            return 'wizard_group_' + d.id;
          }
        });

      // sort by size so smaller boluses are drawn last
      wizardGroups = wizardGroups.sort(function(a,b){
        var bolusA = a.bolus ? a.bolus : a;
        var bolusB = b.bolus ? b.bolus : b;
        return d3.descending(commonbolus.getMaxValue(bolusA), commonbolus.getMaxValue(bolusB));
      });

      var carbs = wizardGroups.filter(function(d) {
        // truthiness working for us here
        // don't want carbInputs of 0 included in filter!
        return d.carbInput;
      });

      drawBolus.carb(carbs);

      var boluses = wizardGroups.filter(function(d) {
        return d.bolus != null;
      });

      drawBolus.bolus(boluses);

      var extended = boluses.filter(function(d) {
        return d.bolus.extended || d.bolus.expectedExtended;
      });

      drawBolus.extended(extended);

      // boluses where recommended > programmed
      var underride = boluses.filter(function(d) {
        return commonbolus.isUnderride(d);
      });

      drawBolus.underride(underride);

      // boluses where programmed > recommended
      var override = boluses.filter(function(d) {
        return commonbolus.isOverride(d);
      });

      drawBolus.override(override);

      // boluses where programmed differs from delivered
      var suspended = boluses.filter(function(d) {
        return commonbolus.getDelivered(d) !== commonbolus.getProgrammed(d);
      });

      drawBolus.suspended(suspended);

      var extendedSuspended = boluses.filter(function(d) {
        if (d.bolus.expectedExtended) {
          return d.bolus.extended !== d.bolus.expectedExtended;
        }
        return false;
      });

      drawBolus.extendedSuspended(extendedSuspended);

      wizards.exit().remove();

      var highlight = pool.highlight('.d3-wizard-group, .d3-bolus-group', opts);

      // tooltips
      selection.selectAll('.d3-wizard-group').on('mouseover', function(d) {
        if (d.bolus) {
          var parentContainer = document.getElementsByClassName('patient-data')[0].getBoundingClientRect();
          var container = this.getBoundingClientRect();
          container.y = container.top - parentContainer.top;

          drawBolus.tooltip.add(d, container);
        }

        highlight.on(d3.select(this));
      });
      selection.selectAll('.d3-wizard-group').on('mouseout', function(d) {
        if (d.bolus) {
          drawBolus.tooltip.remove(d);
        }

        highlight.off();
      });
    });
  };
};
