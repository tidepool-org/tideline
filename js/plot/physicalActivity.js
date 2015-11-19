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

var format = require('../data/util/format');
var math = require('mathjs');

var images = {
  run: require('../../img/physicalactivity/run.png'),
  bike: require('../../img/physicalactivity/bike.png'),
  walk: require('../../img/physicalactivity/walk.png'),
  default: require('../../img/physicalactivity/default.png')
};

var activityToIconMappings =  {
  run: ['Running', 'Run'],
  walk: ['Walk','Walking'],
  bike: ['Bike', 'Biking', 'Cycling']

};

var log = require('bows')('Message');

var NEW_NOTE_WIDTH = 36;
var NEW_NOTE_HEIGHT = 29;
var NEW_NOTE_X = 0;
var NEW_NOTE_Y = 45;

module.exports = function(pool, opts) {

  opts = opts || {};

  var defaults = {
    previewLength: 50,
    tooltipPadding: 20,
    highlightWidth: 4
  };

  _.defaults(opts, defaults);

  var mainGroup = pool.group();

  function physicalActivity(selection) {
    opts.xScale = pool.xScale().copy();

    selection.each(function(currentData) {
      
      var activities = d3.select(this)
        .selectAll('g.d3-physicalactivity-group')
        .data(currentData, function(d) {
            return d.id;
        });

      var activityGroups = activities.enter()
        .append('g')
        .attr({
          'class': 'd3-physicalactivity-group',
          id: function(d) {
            return 'physicalactivity_' + d.id;
          }
        });

      /*jshint camelcase: false */
      var activityName =  currentData[0].datapoint.body.activity_name;

      var image = physicalActivity.chooseImageForActivity(activityName);
      physicalActivity.addActivityToPool(activityGroups, image);

      activities.exit().remove();
    });
  }

  physicalActivity.addActivityToPool = function(selection, image) {
    
    opts.xScale = pool.xScale().copy();

    selection.append('rect')
      .attr({
        x: physicalActivity.highlightXPosition,
        y: physicalActivity.highlightYPosition,
        width: opts.size + opts.highlightWidth * 2,
        height: opts.size + opts.highlightWidth * 2,
        'class': 'd3-rect-physicalactivity hidden'
      });

    selection.append('image')
      .attr({
        'xlink:href': image,
        cursor: 'pointer',
        x: physicalActivity.xPosition,
        y: physicalActivity.yPosition,
        width: opts.size,
        height: opts.size
      })
      .classed({'d3-image': true, 'd3-physicalactivity': true});

    selection.on('mouseover', physicalActivity._displayTooltip);
    selection.on('mouseout', physicalActivity._removeTooltip);
  };

  physicalActivity.chooseImageForActivity = function(activityName) {
    var selectedImage = 'default';
    for (var key in activityToIconMappings) {
      if (activityToIconMappings[key].indexOf(activityName) > -1) {
        selectedImage = key;
        break;
      }
    }
    return images[selectedImage];
  };

  physicalActivity._displayTooltip = function(d) {
    var elem = d3.select('#physicalactivity_' + d.id + ' image');
    var tooltips = pool.tooltips();

    var tooltipText= physicalActivity.getTextForActivity(d);

    var tooltip = tooltips.addForeignObjTooltip({
      cssClass: 'svg-tooltip-message',
      datum: _.assign(d, {type: 'physicalActivity'}), // we're currently using the message pool to display the tooltip
      shape: 'generic',
      xPosition: physicalActivity.xPositionCenter,
      yPosition: physicalActivity.yPositionCenter
    });

    var foGroup = tooltip.foGroup;
    tooltip.foGroup.append('p')
      .attr('class', 'physicalActivityTooltip')
      .append('span')
      .attr('class', 'secondary')
      .html(format.datestamp(d.normalTime, d.displayOffset) + 
        ' <span class="fromto">at</span> ' + 
        format.timestamp(d.normalTime, d.displayOffset));
    tooltip.foGroup.append('p')
      .attr('class', 'physicalActivityTooltip')
      .append('span')
      .attr('class', 'secondary')
      .html(tooltipText);
    
    var dims = tooltips.foreignObjDimensions(foGroup);
    // foGroup.node().parentNode is the <foreignObject> itself
    // because foGroup is actually the top-level <xhtml:div> element
    tooltips.anchorForeignObj(d3.select(foGroup.node().parentNode), {
      w: dims.width + opts.tooltipPadding,
      h: dims.height,
      x: physicalActivity.xPositionCenter(d),
      y: -dims.height,
      orientation: {
        'default': 'leftAndDown',
        leftEdge: 'rightAndDown',
        rightEdge: 'leftAndDown'
      },
      shape: 'generic',
      edge: tooltip.edge
    });
  };

  physicalActivity.getTextForActivity = function(d) {
    /*jshint camelcase: false */
    var omhSchema = {};
    omhSchema.activity = d.datapoint.body.activity_name;
    omhSchema.reported_activity_intensity = d.datapoint.body.reported_activity_intensity;
    omhSchema.distance = d.datapoint.body.distance;
    omhSchema.effective_time_frame = d.datapoint.body.effective_time_frame;
    omhSchema.acquisition_provenance = d.datapoint.header.acquisition_provenance.source_name;

    
    var noteText = '<span class="value">'+omhSchema.activity+'</span>';
    if (omhSchema.effective_time_frame.time_interval.duration != null) {
      var duration = physicalActivity.getDurationForActivity(omhSchema.effective_time_frame.time_interval.duration);
      noteText = noteText + ' for ' + duration.value;
    }

    var additionalText = '';

    if (omhSchema.distance != null) {
      var distance = physicalActivity.getDistanceForActivity(omhSchema.distance);
      additionalText = additionalText + distance.value;
    }
    if (omhSchema.reported_activity_intensity != null) {
      if (additionalText != '') {additionalText = additionalText + '. ';}
      additionalText = additionalText + 'Reported intensity - '+omhSchema.reported_activity_intensity;
    }

    if (additionalText != '') {
      additionalText = '('+additionalText+'). ';
    }
    
    additionalText = additionalText+ 'Recorded by '+omhSchema.acquisition_provenance;

    noteText = noteText+' '+additionalText;
    return noteText;
  };

  physicalActivity.getDurationForActivity = function(omhDuration) {
    // converts all units to minutes. 
    var duration = math.unit(omhDuration.value, omhDuration.unit); 
    return {
      value: duration.to('minutes').format(1), 
      unit: 'minutes'
    }
  };

  physicalActivity.getDistanceForActivity = function(omhDistance) {
    // converts all units to miles. Could be eventually wired into a preferred units settings
    var distance = math.unit(omhDistance.value, omhDistance.unit); 
    return {
      value: distance.to('miles').format(2), 
      unit: 'miles'
    }
  };

  physicalActivity._removeTooltip = function(d) {
    var elem = d3.select('#tooltip_' + d.id).remove();
  };



 
  physicalActivity.highlightXPosition = function(d) {
    return opts.xScale(Date.parse(d.normalTime)) - opts.size / 2 - opts.highlightWidth;
  };

  physicalActivity.highlightYPosition = function(d) {
    return pool.height() / 2 - opts.size / 2 - opts.highlightWidth;
  };

  physicalActivity.xPosition = function(d) {
    return opts.xScale(Date.parse(d.normalTime)) - opts.size / 2;
  };

  physicalActivity.yPosition = function(d) {
    return pool.height() / 2 - opts.size / 2;
  };

  physicalActivity.xPositionCenter = function(d) {
    return opts.xScale(Date.parse(d.normalTime));
  };

  physicalActivity.yPositionCenter = function(d) {
    return pool.height() / 2;
  };

  return physicalActivity;
};
