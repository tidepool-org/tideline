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

var d3 = require('./lib/').d3;
var _ = require('./lib/')._;

var format = require('./data/util/format');

var log = require('./lib/').bows('Settings');

module.exports = function(emitter, opts) {

  opts = opts || {'bgUnits': 'mg/dL'};

  var msStartString = function(x) { return format.millisecondsAsTimeOfDay(x); };
  var defaults = {
    'sections': {
      'basal': {
        'label': 'Basal Rates',
        'columnTypes': ['basalSchedules']
      },
      'wizard': {
        'label': 'Bolus Wizard',
        'columnTypes': ['carbRatio', 'insulinSensitivity', 'bgTarget']
      }
    },
    'labelsByType': {
      'carbRatio': 'Insulin to Carb Ratio (I:C)',
      'insulinSensitivity': 'Sensitivity (ISF, Correction)',
      'bgTarget': 'BG Target'
    },
    'rowHeadersByType': {
      'basalSchedules': ['Start time', 'Value (U/hr)'],
      // TODO:
      'basalScheduleSum': ['Total', (function() { return 0.0; }())],
      'carbRatio': ['Start time', 'Value (g/U)'],
      'insulinSensitivity': ['Start time', 'Value (' + opts.bgUnits + '/U)'],
      'bgTarget': ['Start time', 'Low (' + opts.bgUnits + ')', 'High (' + opts.bgUnits + ')']
    },
    'mapsByType': {
      'basalSchedules': {
        'start': msStartString,
        'rate': function(x) { return x.toFixed(3); }
      },
      'carbRatio': {
        'start': msStartString,
        'amount': function(x) { return x; }
      },
      'insulinSensitivity': {
        'start': msStartString,
        'amount': function(x) { return x; }
      },
      'bgTarget': {
        'start': msStartString,
        'low': function(x) { return x; },
        'high': function(x) { return x; }
      }
    }
  };

  _.defaults(opts, defaults);

  var settings, basalUtil, mainDiv;

  function container(selection) {
    mainDiv = selection.append('div')
      .attr('id', 'tidelineSettings');
  }

  // getters only
  container.currentSettings = function() {
    return settings[settings.length - 1];
  };

  // getters & setters
  container.data = function(data) {
    if (!arguments.length) return settings;

    settings = data.grouped.settings;
    basalUtil = data.basalUtil;
    return container;
  };

  container.section = function(type, label, numColumns) {
    var sectionDiv = mainDiv.append('div')
      .attr({
        'id': type + 'Settings',
        'class': 'd3-settings-section'
      });

    sectionDiv.append('div')
      .attr({
        'class': 'd3-settings-section-label'
      })
      .text(label);

    if (type === 'basal'){
      var basalSchedules = container.currentSettings().basalSchedules;
      var scheduleLabels = _.pluck(basalSchedules, 'name');
      var scheduleLabelsToKeep = [];
      log(scheduleLabels);
      // remove any basal schedules that are just an empty array
      for (var k = 0; k < scheduleLabels.length; k++) {
        if (_.findWhere(basalSchedules, {'name': scheduleLabels[k]}).value.length !== 0) {
          scheduleLabelsToKeep.push(scheduleLabels[k]);
        }
      }
      scheduleLabels = scheduleLabelsToKeep;
      sectionDiv.classed('d3-settings-section-basal', true);
      container.column(sectionDiv, scheduleLabels[0], 'd3-settings-col-active');
      if (scheduleLabels.length > 1) {
        for (var i = 1; i < scheduleLabels.length; i++) {
          container.column(sectionDiv, scheduleLabels[i]);
        }
      }
    }
    else if (type === 'wizard') {
      sectionDiv.classed('d3-settings-section-wizard', true);
      for (var j = 0; j < numColumns; j++) {
        container.column(sectionDiv, opts.sections[type].columnTypes[j]);
      }
    }

    mainDiv.selectAll('.d3-settings-basal-schedule').selectAll('.d3-settings-col-label')
      .on('click', function() {
        mainDiv.selectAll('table.d3-settings-col-active')
          .classed({
            'd3-settings-col-active': false,
            'd3-settings-col-collapsed': true
          });
        d3.select(this).classed({
          'd3-settings-col-active': true,
          'd3-settings-col-collapsed': false
        });
      });

    return container;
  };

  container.tableHeaders = function(table, data) {
    table.append('tr')
      .selectAll('th')
      .data(data)
      .enter()
      .append('th')
      .attr({
        'class': 'd3-settings-table-head'
      })
      .text(function(d) {
        return d;
      });

    return container;
  };

  container.tableRows = function(table, data, datatype) {
    table.selectAll('tr.d3-settings-table-row-data')
      .data(data)
      .enter()
      .append('tr')
      .attr({
        'class': 'd3-settings-table-row-data'
      });
    if (datatype === 'basal') {
      var sum = ['Total', basalUtil.scheduleTotal(data).toFixed(3)];
      log(data);
      table.append('tr')
        .selectAll('th')
        .data(sum)
        .enter()
        .append('th')
        .attr({
          'class': 'd3-settings-table-head'
        })
        .text(function(d) {
          return d;
        });
    }
    table.append('tr')
      .attr('class', 'd3-settings-table-footer');

    return container;
  };

  container.renderRows = function(table, map) {
    var keys = Object.keys(map);
    for (var i = 0; i < keys.length; i++) {
      table.selectAll('.d3-settings-table-row-data')
        .append('td')
        .attr('class', function(d) {
          if (keys[i] === 'start') {
            return 'd3-settings-start-time';
          }
        })
        .text(function(d) {
          var key = keys[i];
          return map[key](d[key]);
        });
    }

    return container;
  };

  container.column = function(selection, datatype, scheduleClass) {
    var columnDiv = selection.append('div')
      .attr({
        'id': datatype.replace(' ', '_') + 'Settings',
        'class': 'd3-settings-col'
      });
    // all but basal rates
    if (opts.labelsByType[datatype]) {
      columnDiv.append('div')
        .attr({
          'class': 'd3-settings-col-label'
        })
        .text(opts.labelsByType[datatype]);
    }
    // basal rates
    else {
      columnDiv.classed({
        'd3-settings-basal-schedule': true
      });
      columnDiv.append('div')
        .attr('class', function() {
          if (scheduleClass) {
            return 'd3-settings-col-label ' + scheduleClass;
          }
          else {
            return 'd3-settings-col-label d3-settings-col-collapsed';
          }
        })
        .html((scheduleClass ? '<i class="icon-up"></i>' : '<i class="icon-down"></i>') + datatype);
    }

    var columnTable = columnDiv.append('table');

    // all but basal rates
    if (opts.rowHeadersByType[datatype]) {
      container.tableHeaders(columnTable, opts.rowHeadersByType[datatype])
        .tableRows(columnTable, container.currentSettings()[datatype])
        .renderRows(columnTable, opts.mapsByType[datatype]);
    }
    // basal rates
    else {

      container.tableHeaders(columnTable, opts.rowHeadersByType.basalSchedules)
        .tableRows(columnTable,
          _.findWhere(container.currentSettings().basalSchedules, {'name': datatype}).value,
          'basal')
        .renderRows(columnTable, opts.mapsByType.basalSchedules);
    }

    return container;
  };

  container.render = function() {
    if (container.data().length === 0) {
      return;
    }
    _.each(Object.keys(opts.sections), function(key) {
      container.section(key, opts.sections[key].label, opts.sections[key].columnTypes.length);
    }, container);

    mainDiv.selectAll('.d3-settings-basal-schedule').selectAll('.d3-settings-col-label')
      .on('click', function() {
        var current = d3.select(this).classed('d3-settings-col-active');
        
        mainDiv.selectAll('.d3-settings-col-label')
          .classed({
            'd3-settings-col-active': false,
            'd3-settings-col-collapsed': true
          });

        d3.select(this).selectAll('i').classed({
          'icon-up': !current,
          'icon-down': current
        });

        d3.select(this).classed({
          'd3-settings-col-active': !current,
          'd3-settings-col-collapsed': current
        });
      });

    return container;
  };

  container.clear = function() {
    mainDiv.selectAll('div').remove();

    return container;
  };

  container.hide = function() {
    // for API identity with oneday
    return container;
  };

  container.show = function() {
    // for API identity with oneday
    return container;
  };

  return container;
};
