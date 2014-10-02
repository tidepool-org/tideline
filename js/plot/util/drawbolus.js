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

var commonbolus = require('./commonbolus');
var dt = require('../../data/util/datetime');
var format = require('../../data/util/format');

module.exports = function(pool, opts) {
  opts = opts || {};

  var defaults = {
    width: 12,
    r: 14,
    suspendMarkerWidth: 5,
    markerHeight: 2,
    triangleHeight: 4,
    triangleOffset: 4,
    bolusStroke: 2,
    triangleSize: 6,
    carbPadding: 4,
    tooltipHeightAddition: 3,
    tooltipPadding: 20
  };

  _.defaults(opts, defaults);

  var top = opts.yScale.range()[0];
  var bottom = top - opts.bolusStroke / 2;
  var mainGroup = pool.parent();

  var pluckBolus = function(d) {
    return d.bolus ? d.bolus : d;
  };

  var xPosition = function(d) {
    var x = opts.xScale(Date.parse(d.normalTime)) - opts.width/2;
    return x;
  };
  var computePathHeight = function(d) {
    return opts.yScale(d.extended) + opts.bolusStroke / 2;
  };

  var triangleLeft = function(x) { return x + opts.width/2 - opts.triangleOffset; };
  var triangleRight = function(x) { return x + opts.width/2 + opts.triangleOffset; };
  var triangleMiddle = function(x) { return x + opts.width/2; };

  var extendedTriangle = function(x, y) {
    var top = (x + opts.triangleSize) + ' ' + (y + opts.triangleSize/2);
    var bottom = (x + opts.triangleSize) + ' ' + (y - opts.triangleSize/2);
    var point = x + ' ' + y;
    return 'M' + top + 'L' + bottom + 'L' + point + 'Z';
  };

  var underrideTriangle = function(x, y) {
    return triangleLeft(x) + ',' + (y + opts.markerHeight/2) + ' ' +
      triangleMiddle(x) + ',' + (y + opts.markerHeight/2 + opts.triangleHeight) + ' ' +
      triangleRight(x) + ',' + (y + opts.markerHeight/2);
  };

  var overrideTriangle = function(x, y) {
    return triangleLeft(x) + ',' + (y + opts.markerHeight/2) + ' ' +
      triangleMiddle(x) + ',' + (y + opts.markerHeight/2 - opts.triangleHeight) + ' ' +
      triangleRight(x) + ',' + (y + opts.markerHeight/2);
  };

  return {
    carb: function(carbs) {
      var xPos = function(d) {
        return xPosition(d) + opts.width/2;
      };

      var yPos = function(d) {
        var r = opts.yScaleCarbs ? opts.yScaleCarbs(d.carbInput) : opts.r;

        var bolusValue = d.bolus ? commonbolus.getMaxValue(d) : 0;

        return opts.yScale(bolusValue) - r - (bolusValue ? opts.carbPadding : 0);
      };

      carbs.append('circle')
        .attr({
          cx: xPos,
          cy: yPos,
          r: function(d) {
            return opts.yScaleCarbs ? opts.yScaleCarbs(d.carbInput) : opts.r;
          },
          'stroke-width': 0,
          'class': 'd3-circle-carbs d3-carbs',
          id: function(d) {
            return 'carbs_' + d.id;
          }
        });

      carbs.append('text')
        .text(function(d) {
          return d.carbInput;
        })
        .attr({
          x: xPos,
          y: yPos,
          'class': 'd3-carbs-text'
        });
    },
    bolus: function(boluses) {
      // delivered amount of bolus
      boluses.append('rect')
        .attr({
          x: function(d) {
            d = pluckBolus(d);
            return xPosition(d);
          },
          y: function(d) {
            return opts.yScale(commonbolus.getDelivered(d));
          },
          width: opts.width,
          height: function(d) {
            return top - opts.yScale(commonbolus.getDelivered(d));
          },
          'class': 'd3-rect-bolus d3-bolus',
          id: function(d) {
            d = pluckBolus(d);
            return 'bolus_' + d.id;
          }
        });
    },
    suspended: function(suspended) {
      // don't draw a bolus that doesn't exist at all
      // e.g., square bolus cancelled immediately can slip through
      // unless you filter like this
      suspended = suspended.filter(function(d) {
        return commonbolus.getDelivered(d) > 0;
      });

      // draw color in the suspended portion
      suspended.append('rect')
        .attr({
          x: function(d) {
            d = pluckBolus(d);
            return xPosition(d);
          },
          y: function(d) {
            return opts.yScale(commonbolus.getMaxValue(d));
          },
          width: opts.width,
          height: function(d) {
            d = pluckBolus(d);
            return opts.yScale(commonbolus.getDelivered(d)) - opts.yScale(commonbolus.getMaxValue(d)) - 1;
          },
          'class': 'd3-rect-suspended-bolus d3-bolus'
        });

      // draw the line
      suspended.append('rect')
        .attr({
          x: function(d) {
            d = pluckBolus(d);
            return xPosition(d);
          },
          y: function(d) {
            return opts.yScale(commonbolus.getDelivered(d));
          },
          width: opts.width,
          height: opts.markerHeight,
          'class': 'd3-rect-suspended d3-bolus'
        });
    },
    underride: function(underride) {
      underride = underride.filter(function(d) {
        return commonbolus.getDelivered(d) > 0;
      });
      underride.append('rect')
        .attr({
          x: function(d) {
            d = pluckBolus(d);
            return xPosition(d);
          },
          y: function(d) {
            return opts.yScale(commonbolus.getRecommended(d));
          },
          width: opts.width,
          height: function(d) {
            return opts.yScale(commonbolus.getDelivered(d)) - opts.yScale(commonbolus.getRecommended(d));
          },
          'class': 'd3-rect-recommended d3-bolus',
          id: function(d) {
            d = pluckBolus(d);
            return 'bolus_' + d.id;
          }
        });

      // draw the line iff the programmed and delivered are the same
      // to avoid too much confusing clutter
      // tooltip still exposes fact that suggested and programmed differed
      var uninterrupted = underride.filter(function(d) {
        return commonbolus.getProgrammed(d) === commonbolus.getDelivered(d);
      });
      uninterrupted.append('rect')
        .attr({
          x: function(d) {
            d = pluckBolus(d);
            return xPosition(d);
          },
          y: function(d) {
            return opts.yScale(commonbolus.getDelivered(d));
          },
          width: opts.width,
          height: opts.markerHeight,
          'class': 'd3-rect-override d3-bolus'
        });

      uninterrupted.append('polygon')
        .attr({
          x: function(d) {
            d = pluckBolus(d);
            return xPosition(d);
          },
          y: function(d) {
            return opts.yScale(commonbolus.getDelivered(d));
          },
          points: function(d) {
            var bolus = pluckBolus(d);
            return underrideTriangle(xPosition(bolus), opts.yScale(commonbolus.getDelivered(d)));
          },
          'class': 'd3-polygon-override d3-bolus'
        });
    },
    override: function(override) {
      // draw the line iff the programmed and delivered are the same
      // to avoid too much confusing clutter
      // tooltip still exposes fact that suggested and programmed differed
      var uninterrupted = override.filter(function(d) {
        return commonbolus.getProgrammed(d) === commonbolus.getDelivered(d);
      });
      uninterrupted.append('rect')
        .attr({
          x: function(d) {
            d = pluckBolus(d);
            return xPosition(d);
          },
          y: function(d) {
            return opts.yScale(commonbolus.getRecommended(d)) - opts.markerHeight;
          },
          width: opts.width,
          height: opts.markerHeight,
          'class': 'd3-rect-override d3-bolus'
        });

      uninterrupted.append('polygon')
        .attr({
          x: function(d) {
            d = pluckBolus(d);
            return xPosition(d);
          },
          y: function(d) {
            return opts.yScale(commonbolus.getRecommended(d)) - opts.markerHeight;
          },
          points: function(d) {
            var bolus = pluckBolus(d);
            return overrideTriangle(xPosition(bolus), opts.yScale(commonbolus.getRecommended(d)) - opts.markerHeight);
          },
          'class': 'd3-polygon-override d3-bolus'
        });
    },
    extended: function(extended) {
      // extended "arm" of square- and dual-wave boluses
      extended.append('path')
        .attr({
          d: function(d) {
            d = pluckBolus(d);
            var rightEdge = xPosition(d) + opts.width;
            var doseHeight = computePathHeight(d);
            var doseEnd = opts.xScale(Date.parse(d.normalTime) + commonbolus.getMaxDuration(d));
            return 'M' + rightEdge + ' ' + doseHeight + 'L' + doseEnd + ' ' + doseHeight;
          },
          'stroke-width': opts.bolusStroke,
          'class': 'd3-path-extended d3-bolus',
          id: function(d) {
            d = pluckBolus(d);
            return 'bolus_' + d.id;
          }
        });

      // triangle
      extended.append('path')
        .attr({
          d: function(d) {
            d = pluckBolus(d);
            var doseHeight = computePathHeight(d);
            var doseEnd = opts.xScale(Date.parse(d.normalTime) + commonbolus.getMaxDuration(d)) - opts.triangleSize;
            return extendedTriangle(doseEnd, doseHeight);
          },
          'stroke-width': opts.bolusStroke,
          'class': function(d) {
            d = pluckBolus(d);

            if (d.expectedExtended) {
              return 'd3-path-extended-triangle-suspended d3-bolus';
            }

            return 'd3-path-extended-triangle d3-bolus';
          },
          id: function(d) {
            d = pluckBolus(d);
            return 'bolus_' + d.id;
          }
        });
    },
    extendedSuspended: function(suspended) {
      // red marker indicating where suspend happened
      suspended.append('path')
        .attr({
          d: function(d) {
            d = pluckBolus(d);
            var doseHeight = computePathHeight(d);
            var rightEdge = opts.xScale(Date.parse(d.normalTime) + d.duration);
            var pathEnd = rightEdge + opts.suspendMarkerWidth;

            return 'M' + rightEdge + ' ' + doseHeight + 'L' + pathEnd + ' ' + doseHeight;
          },
          'stroke-width': opts.bolusStroke,
          'class': 'd3-path-suspended d3-bolus'
        });

      // now, light-blue path representing undelivered extended bolus
      suspended.append('path')
        .attr({
          d: function(d) {
            d = pluckBolus(d);
            var doseHeight = computePathHeight(d);
            var pathEnd = opts.xScale(Date.parse(d.normalTime) + d.duration) + opts.suspendMarkerWidth;
            var doseEnd = opts.xScale(Date.parse(d.normalTime) + d.expectedDuration);

            return 'M' + pathEnd + ' ' + doseHeight + 'L' + doseEnd + ' ' + doseHeight;
          },
          'stroke-width': opts.bolusStroke,
          'class': 'd3-path-extended-suspended d3-bolus',
          id: function(d) {
            d = pluckBolus(d);
            return 'bolus_' + d.id;
          }
        });
    },
    tooltip: {
      add: function(d) {
        var tooltips = pool.tooltips();
        var res = tooltips.addForeignObjTooltip({
          cssClass: 'd3-bolus',
          datum: d,
          div: 'bolus-wizard',
          shape: 'generic',
          xPosition: function() { return xPosition(d) + opts.width/2; },
          yPosition: function() { return pool.height() - opts.tooltipHeightAddition; }
        });
        var foGroup = res.foGroup;
        this.html(foGroup, d);
        var dims = tooltips.foreignObjDimensions(foGroup);
        // foGroup.node().parentNode is the <foreignObject> itself
        // because foGroup is actually the top-level <xhtml:div> element
        tooltips.anchorForeignObj(d3.select(foGroup.node().parentNode), {
          w: dims.width + opts.tooltipPadding,
          h: dims.height,
          y: -dims.height,
          orientation: {
            'default': 'leftAndUp',
            leftEdge: 'normal',
            rightEdge: 'leftAndUp'
          },
          shape: 'generic',
          edge: res.edge
        });
      },
      html: function(group, d) {
        var bolus = pluckBolus(d);
        var justBolus = (bolus.normal === commonbolus.getMaxValue(d)) && !d.carbInput;

        var title = group.append('div')
          .attr('class', 'title');
        // timestamp goes in title
        title.append('p')
          .attr('class', 'timestamp left')
          .html(format.timestamp(bolus.normalTime));
        // interrupted boluses get priority on special headline
        if (commonbolus.getProgrammed(d) !== commonbolus.getDelivered(d)) {
          title.append('p')
            .attr('class', 'interrupted plain right')
            .text('interrupted');
          title.classed('wider', true);
        }
        // if not interrupted, then extended boluses get a headline
        else if (bolus.extended) {
          title.append('p')
            .attr('class', 'plain right')
            .text('Extended');
        }

        var tbl = group.append('table');
        // carbs
        // truthiness desirable here: don't want to display carbInput of 0
        if (d.type === 'wizard' && d.carbInput) {
          var carbRow = tbl.append('tr');
          carbRow.append('td')
            .attr('class', 'label')
            .text('Carbs');
          carbRow.append('td')
            .attr('class', 'right')
            .text(d.carbInput + ' g');
        }

        if (commonbolus.getRecommended(d) >= 0 && commonbolus.getRecommended(d) !== commonbolus.getProgrammed(d)) {
          // wizard-suggested bolus
          var sugRow = tbl.append('tr');
          sugRow.append('td')
            .attr('class', 'label')
            .text('Suggested');
          sugRow.append('td')
            .attr('class', 'right')
            .text(format.tooltipValue(commonbolus.getRecommended(d)));
        }
        // only show programmed when different from delivery
        if (commonbolus.getProgrammed(d) !== commonbolus.getDelivered(d)) {
          var intRow = tbl.append('tr');
          intRow.append('td')
            .attr('class', 'label')
            .text('Programmed');
          intRow.append('td')
            .attr('class', 'right')
            .text(format.tooltipValue(commonbolus.getProgrammed(d)));
        }
        // actual delivered bolus
        var delRow = tbl.append('tr');
        delRow.append('td')
            .attr('class', function() {
              return justBolus ? '' : 'del';
            })
          .text('Delivered');
        delRow.append('td')
          .attr('class', 'big')
          .text(format.tooltipValue(commonbolus.getDelivered(d)));

        // extended bolus
        if (bolus.extended) {
          var extRow = tbl.append('tr');
          // square bolus
          if (!bolus.normal) {
            extRow.append('td')
              .attr('class', 'dual')
              .text(format.timespan({duration: bolus.duration}) + ':');
            extRow.append('td')
              .attr('class', 'secondary')
              .text(format.percentage(bolus.extended/commonbolus.getProgrammed(bolus)) +
                ' (' + format.tooltipValue(bolus.extended) + ')');
          }
          else {
            extRow.append('td')
              .attr('class', 'dual')
              .text('Up front: ');
            extRow.append('td')
              .attr('class', 'secondary')
              .text(format.percentage(bolus.normal/commonbolus.getProgrammed(d)) +
                ' (' + format.tooltipValue(bolus.normal) + ')');
            var extRow2 = tbl.append('tr');
            extRow2.append('td')
              .attr('class', 'dual')
              .text(format.timespan({duration: bolus.duration}) + ':');
            extRow2.append('td')
              .attr('class', 'secondary')
              .text(format.percentage(bolus.extended/commonbolus.getProgrammed(bolus)) +
                ' (' + format.tooltipValue(bolus.extended) + ')');
          }
        }
      },
      remove: function(d) {
        mainGroup.select('#tooltip_' + d.id).remove();
      }
    },
    annotations: function(data, selection) {
      _.each(data, function(d) {
        var annotationOpts = {
          x: opts.xScale(Date.parse(d.normalTime)),
          y: opts.yScale(commonbolus.getMaxValue(d)),
          xMultiplier: -2,
          yMultiplier: 1,
          d: d,
          orientation: {
            up: true
          }
        };
        if (mainGroup.select('#annotation_for_' + d.id)[0][0] == null) {
          mainGroup.select('#tidelineAnnotations_bolus').call(pool.annotations(), annotationOpts);
        }
      });
    }
  };
};
