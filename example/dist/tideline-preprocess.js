!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var n;"undefined"!=typeof window?n=window:"undefined"!=typeof global?n=global:"undefined"!=typeof self&&(n=self),(n.tideline||(n.tideline={})).preprocess=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

var tideline = window.tideline;
var watson = tideline.watson;
var _ = tideline.lib._;
var TidelineData = tideline.TidelineData;
var SegmentUtil = tideline.data.SegmentUtil;

var log = tideline.lib.bows('Preprocess');

function alwaysTrue() {
  return true;
}

function notZero(e) {
  return e.value !== 0;
}

var TYPES_TO_INCLUDE = {
  // basals with value 0 don't get excluded because they are legitimate targets for visualization
  'basal-rate-segment': alwaysTrue,
  bolus: notZero,
  carbs: notZero,
  cbg: notZero,
  message: notZero,
  smbg: notZero,
  settings: notZero
};

var Preprocess = {

  REQUIRED_TYPES: ['basal-rate-segment', 'bolus', 'carbs', 'cbg', 'message', 'smbg', 'settings'],

  OPTIONAL_TYPES: [],

  MMOL_STRING: 'mmol/L',

  MGDL_STRING: 'mg/dL',

  MMOL_TO_MGDL: 18,

  mungeBasals: function(data) {
    var segments = new SegmentUtil(_.where(data, {'type': 'basal-rate-segment'}));
    data = _.reject(data, function(d) {
      return d.type === 'basal-rate-segment';
    });
    data = data.concat(segments.actual.concat(segments.getUndelivered('scheduled')));
    return data;
  },

  editBoluses: function(data) {
    // two adjustments to boluses here:
    // changed `extended` to false when extendedDelivery = 0
    // (these are instances where someone changed their mind about a combo bolus, basically)
    // ~and~
    // when there is a joinKey to a wizard event from which we can obtain
    // the recommendation for a bolus, extract it to populate the `recommended` field
    var wizards = _.indexBy(data, function(d) {
      if (d.type === 'wizard') {
        return d.joinKey;
      }
    });
    return _.map(data, function(d) {
      if (d.type === 'bolus' && d.joinKey != null) {
        var joined = wizards[d.joinKey];
        if (joined && joined.payload.estimate != null) {
          d.recommended = joined.payload.estimate;
        }
        return d;
      }
      if (d.extended && d.extendedDelivery === 0) {
        d.extended = false;
        return d;
      }
      else {
        return d;
      }
    });
  },

  filterData: function(data) {
    // filter out types we aren't using for visualization
    //  ~and~
    // because of how the Tidepool back end parses some data sources
    // we're creating things like carb events with values of 0, which
    // we don't want to visualize, so...
    // this function also removes all data with value 0 except for basals, since
    // we do want to visualize basals (e.g., temps) with value 0.0

    var counts = {};

    function incrementCount(count, type) {
      if (counts[count] == null) {
        counts[count] = {};
      }

      if (counts[count][type] == null) {
        counts[count][type] = 0;
      }

      ++counts[count][type];
    }

    var nonZeroData = _.filter(data, function(d) {
      var includeFn = TYPES_TO_INCLUDE[d.type];
      if (includeFn == null) {
        incrementCount('excluded', d.type);
        return false;
      }

      var retVal = includeFn(d);
      incrementCount(retVal ? 'included' : 'excluded', d.type);
      return retVal;
    });

    log('Excluded:', counts.excluded || 0);
    log('# of data points', nonZeroData.length);
    log('Data types:', counts.included);

    return nonZeroData;
  },

  runWatson: function(data) {
    data = watson.normalizeAll(data);
    // Ensure the data is properly sorted
    data = _.sortBy(data, function(d) {
      // ISO8601 format lexicographically sorts according to timestamp
      return d.normalTime;
    });
    return data;
  },

  checkRequired: function(tidelineData) {
    _.forEach(this.REQUIRED_TYPES, function(type) {
      if (!tidelineData.grouped[type]) {
        log('No', type, 'data! Replaced with empty array.');
        tidelineData.grouped[type] = [];
      }
    });

    return tidelineData;
  },

  translateMmol: function(data) {
    return _.map(data, function(d) {
      if (d.units === this.MMOL_STRING) {
        d.units = this.MGDL_STRING;
        d.value = parseInt(Math.round(d.value * this.MMOL_TO_MGDL, 10));
      }
      return d;
    }, this);
  },

  basalSchedulesToArray: function(basalSchedules) {
    var schedules = [];
    for(var key in basalSchedules) {
      schedules.push({
        'name': key,
        'value': basalSchedules[key]
      });
    }
    return schedules;
  },

  sortBasalSchedules: function(data) {
    return _.map(data, function(d) {
      var schedules;
      if (d.type === 'settings') {
        schedules = this.basalSchedulesToArray(d.basalSchedules);
        if (d.source === 'carelink') {
          for (var i = 0; i < schedules.length; i++) {
            if (schedules[i].name === 'standard') {
              var standard = schedules[i];
              var index = schedules.indexOf(standard);
              schedules.splice(index, 1);
              schedules.unshift(standard);
              break;
            }
          }
        }
        d.basalSchedules = schedules;
        return d;
      }
      else {
        return d;
      }
    }, this);
  },

  processData: function(data) {
    if (!(data && data.length)) {
      log('Unexpected data input, defaulting to empty array.');
      data = [];
    }

    data = this.editBoluses(data);
    data = this.filterData(data);
    data = this.mungeBasals(data);
    data = this.runWatson(data);
    data = this.translateMmol(data);
    data = this.sortBasalSchedules(data);

    var tidelineData = this.checkRequired(new TidelineData(data));

    return tidelineData;
  }
};

module.exports = Preprocess;

},{}]},{},[1])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1ZvbHVtZXMvVGlkZXBvb2wvdGlkZWxpbmUvcGx1Z2lucy9kYXRhL3ByZXByb2Nlc3MvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqIENvcHlyaWdodCAoYykgMjAxNCwgVGlkZXBvb2wgUHJvamVjdFxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTsgeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeSBpdCB1bmRlclxuICogdGhlIHRlcm1zIG9mIHRoZSBhc3NvY2lhdGVkIExpY2Vuc2UsIHdoaWNoIGlzIGlkZW50aWNhbCB0byB0aGUgQlNEIDItQ2xhdXNlXG4gKiBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieSB0aGUgT3BlbiBTb3VyY2UgSW5pdGlhdGl2ZSBhdCBvcGVuc291cmNlLm9yZy5cbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsIGJ1dCBXSVRIT1VUXG4gKiBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTU1xuICogRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiBTZWUgdGhlIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqIFxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbTsgaWZcbiAqIG5vdCwgeW91IGNhbiBvYnRhaW4gb25lIGZyb20gVGlkZXBvb2wgUHJvamVjdCBhdCB0aWRlcG9vbC5vcmcuXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqL1xuXG52YXIgdGlkZWxpbmUgPSB3aW5kb3cudGlkZWxpbmU7XG52YXIgd2F0c29uID0gdGlkZWxpbmUud2F0c29uO1xudmFyIF8gPSB0aWRlbGluZS5saWIuXztcbnZhciBUaWRlbGluZURhdGEgPSB0aWRlbGluZS5UaWRlbGluZURhdGE7XG52YXIgU2VnbWVudFV0aWwgPSB0aWRlbGluZS5kYXRhLlNlZ21lbnRVdGlsO1xuXG52YXIgbG9nID0gdGlkZWxpbmUubGliLmJvd3MoJ1ByZXByb2Nlc3MnKTtcblxuZnVuY3Rpb24gYWx3YXlzVHJ1ZSgpIHtcbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIG5vdFplcm8oZSkge1xuICByZXR1cm4gZS52YWx1ZSAhPT0gMDtcbn1cblxudmFyIFRZUEVTX1RPX0lOQ0xVREUgPSB7XG4gIC8vIGJhc2FscyB3aXRoIHZhbHVlIDAgZG9uJ3QgZ2V0IGV4Y2x1ZGVkIGJlY2F1c2UgdGhleSBhcmUgbGVnaXRpbWF0ZSB0YXJnZXRzIGZvciB2aXN1YWxpemF0aW9uXG4gICdiYXNhbC1yYXRlLXNlZ21lbnQnOiBhbHdheXNUcnVlLFxuICBib2x1czogbm90WmVybyxcbiAgY2FyYnM6IG5vdFplcm8sXG4gIGNiZzogbm90WmVybyxcbiAgbWVzc2FnZTogbm90WmVybyxcbiAgc21iZzogbm90WmVybyxcbiAgc2V0dGluZ3M6IG5vdFplcm9cbn07XG5cbnZhciBQcmVwcm9jZXNzID0ge1xuXG4gIFJFUVVJUkVEX1RZUEVTOiBbJ2Jhc2FsLXJhdGUtc2VnbWVudCcsICdib2x1cycsICdjYXJicycsICdjYmcnLCAnbWVzc2FnZScsICdzbWJnJywgJ3NldHRpbmdzJ10sXG5cbiAgT1BUSU9OQUxfVFlQRVM6IFtdLFxuXG4gIE1NT0xfU1RSSU5HOiAnbW1vbC9MJyxcblxuICBNR0RMX1NUUklORzogJ21nL2RMJyxcblxuICBNTU9MX1RPX01HREw6IDE4LFxuXG4gIG11bmdlQmFzYWxzOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgdmFyIHNlZ21lbnRzID0gbmV3IFNlZ21lbnRVdGlsKF8ud2hlcmUoZGF0YSwgeyd0eXBlJzogJ2Jhc2FsLXJhdGUtc2VnbWVudCd9KSk7XG4gICAgZGF0YSA9IF8ucmVqZWN0KGRhdGEsIGZ1bmN0aW9uKGQpIHtcbiAgICAgIHJldHVybiBkLnR5cGUgPT09ICdiYXNhbC1yYXRlLXNlZ21lbnQnO1xuICAgIH0pO1xuICAgIGRhdGEgPSBkYXRhLmNvbmNhdChzZWdtZW50cy5hY3R1YWwuY29uY2F0KHNlZ21lbnRzLmdldFVuZGVsaXZlcmVkKCdzY2hlZHVsZWQnKSkpO1xuICAgIHJldHVybiBkYXRhO1xuICB9LFxuXG4gIGVkaXRCb2x1c2VzOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgLy8gdHdvIGFkanVzdG1lbnRzIHRvIGJvbHVzZXMgaGVyZTpcbiAgICAvLyBjaGFuZ2VkIGBleHRlbmRlZGAgdG8gZmFsc2Ugd2hlbiBleHRlbmRlZERlbGl2ZXJ5ID0gMFxuICAgIC8vICh0aGVzZSBhcmUgaW5zdGFuY2VzIHdoZXJlIHNvbWVvbmUgY2hhbmdlZCB0aGVpciBtaW5kIGFib3V0IGEgY29tYm8gYm9sdXMsIGJhc2ljYWxseSlcbiAgICAvLyB+YW5kflxuICAgIC8vIHdoZW4gdGhlcmUgaXMgYSBqb2luS2V5IHRvIGEgd2l6YXJkIGV2ZW50IGZyb20gd2hpY2ggd2UgY2FuIG9idGFpblxuICAgIC8vIHRoZSByZWNvbW1lbmRhdGlvbiBmb3IgYSBib2x1cywgZXh0cmFjdCBpdCB0byBwb3B1bGF0ZSB0aGUgYHJlY29tbWVuZGVkYCBmaWVsZFxuICAgIHZhciB3aXphcmRzID0gXy5pbmRleEJ5KGRhdGEsIGZ1bmN0aW9uKGQpIHtcbiAgICAgIGlmIChkLnR5cGUgPT09ICd3aXphcmQnKSB7XG4gICAgICAgIHJldHVybiBkLmpvaW5LZXk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIF8ubWFwKGRhdGEsIGZ1bmN0aW9uKGQpIHtcbiAgICAgIGlmIChkLnR5cGUgPT09ICdib2x1cycgJiYgZC5qb2luS2V5ICE9IG51bGwpIHtcbiAgICAgICAgdmFyIGpvaW5lZCA9IHdpemFyZHNbZC5qb2luS2V5XTtcbiAgICAgICAgaWYgKGpvaW5lZCAmJiBqb2luZWQucGF5bG9hZC5lc3RpbWF0ZSAhPSBudWxsKSB7XG4gICAgICAgICAgZC5yZWNvbW1lbmRlZCA9IGpvaW5lZC5wYXlsb2FkLmVzdGltYXRlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkO1xuICAgICAgfVxuICAgICAgaWYgKGQuZXh0ZW5kZWQgJiYgZC5leHRlbmRlZERlbGl2ZXJ5ID09PSAwKSB7XG4gICAgICAgIGQuZXh0ZW5kZWQgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuIGQ7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGQ7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cbiAgZmlsdGVyRGF0YTogZnVuY3Rpb24oZGF0YSkge1xuICAgIC8vIGZpbHRlciBvdXQgdHlwZXMgd2UgYXJlbid0IHVzaW5nIGZvciB2aXN1YWxpemF0aW9uXG4gICAgLy8gIH5hbmR+XG4gICAgLy8gYmVjYXVzZSBvZiBob3cgdGhlIFRpZGVwb29sIGJhY2sgZW5kIHBhcnNlcyBzb21lIGRhdGEgc291cmNlc1xuICAgIC8vIHdlJ3JlIGNyZWF0aW5nIHRoaW5ncyBsaWtlIGNhcmIgZXZlbnRzIHdpdGggdmFsdWVzIG9mIDAsIHdoaWNoXG4gICAgLy8gd2UgZG9uJ3Qgd2FudCB0byB2aXN1YWxpemUsIHNvLi4uXG4gICAgLy8gdGhpcyBmdW5jdGlvbiBhbHNvIHJlbW92ZXMgYWxsIGRhdGEgd2l0aCB2YWx1ZSAwIGV4Y2VwdCBmb3IgYmFzYWxzLCBzaW5jZVxuICAgIC8vIHdlIGRvIHdhbnQgdG8gdmlzdWFsaXplIGJhc2FscyAoZS5nLiwgdGVtcHMpIHdpdGggdmFsdWUgMC4wXG5cbiAgICB2YXIgY291bnRzID0ge307XG5cbiAgICBmdW5jdGlvbiBpbmNyZW1lbnRDb3VudChjb3VudCwgdHlwZSkge1xuICAgICAgaWYgKGNvdW50c1tjb3VudF0gPT0gbnVsbCkge1xuICAgICAgICBjb3VudHNbY291bnRdID0ge307XG4gICAgICB9XG5cbiAgICAgIGlmIChjb3VudHNbY291bnRdW3R5cGVdID09IG51bGwpIHtcbiAgICAgICAgY291bnRzW2NvdW50XVt0eXBlXSA9IDA7XG4gICAgICB9XG5cbiAgICAgICsrY291bnRzW2NvdW50XVt0eXBlXTtcbiAgICB9XG5cbiAgICB2YXIgbm9uWmVyb0RhdGEgPSBfLmZpbHRlcihkYXRhLCBmdW5jdGlvbihkKSB7XG4gICAgICB2YXIgaW5jbHVkZUZuID0gVFlQRVNfVE9fSU5DTFVERVtkLnR5cGVdO1xuICAgICAgaWYgKGluY2x1ZGVGbiA9PSBudWxsKSB7XG4gICAgICAgIGluY3JlbWVudENvdW50KCdleGNsdWRlZCcsIGQudHlwZSk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgdmFyIHJldFZhbCA9IGluY2x1ZGVGbihkKTtcbiAgICAgIGluY3JlbWVudENvdW50KHJldFZhbCA/ICdpbmNsdWRlZCcgOiAnZXhjbHVkZWQnLCBkLnR5cGUpO1xuICAgICAgcmV0dXJuIHJldFZhbDtcbiAgICB9KTtcblxuICAgIGxvZygnRXhjbHVkZWQ6JywgY291bnRzLmV4Y2x1ZGVkIHx8IDApO1xuICAgIGxvZygnIyBvZiBkYXRhIHBvaW50cycsIG5vblplcm9EYXRhLmxlbmd0aCk7XG4gICAgbG9nKCdEYXRhIHR5cGVzOicsIGNvdW50cy5pbmNsdWRlZCk7XG5cbiAgICByZXR1cm4gbm9uWmVyb0RhdGE7XG4gIH0sXG5cbiAgcnVuV2F0c29uOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgZGF0YSA9IHdhdHNvbi5ub3JtYWxpemVBbGwoZGF0YSk7XG4gICAgLy8gRW5zdXJlIHRoZSBkYXRhIGlzIHByb3Blcmx5IHNvcnRlZFxuICAgIGRhdGEgPSBfLnNvcnRCeShkYXRhLCBmdW5jdGlvbihkKSB7XG4gICAgICAvLyBJU084NjAxIGZvcm1hdCBsZXhpY29ncmFwaGljYWxseSBzb3J0cyBhY2NvcmRpbmcgdG8gdGltZXN0YW1wXG4gICAgICByZXR1cm4gZC5ub3JtYWxUaW1lO1xuICAgIH0pO1xuICAgIHJldHVybiBkYXRhO1xuICB9LFxuXG4gIGNoZWNrUmVxdWlyZWQ6IGZ1bmN0aW9uKHRpZGVsaW5lRGF0YSkge1xuICAgIF8uZm9yRWFjaCh0aGlzLlJFUVVJUkVEX1RZUEVTLCBmdW5jdGlvbih0eXBlKSB7XG4gICAgICBpZiAoIXRpZGVsaW5lRGF0YS5ncm91cGVkW3R5cGVdKSB7XG4gICAgICAgIGxvZygnTm8nLCB0eXBlLCAnZGF0YSEgUmVwbGFjZWQgd2l0aCBlbXB0eSBhcnJheS4nKTtcbiAgICAgICAgdGlkZWxpbmVEYXRhLmdyb3VwZWRbdHlwZV0gPSBbXTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiB0aWRlbGluZURhdGE7XG4gIH0sXG5cbiAgdHJhbnNsYXRlTW1vbDogZnVuY3Rpb24oZGF0YSkge1xuICAgIHJldHVybiBfLm1hcChkYXRhLCBmdW5jdGlvbihkKSB7XG4gICAgICBpZiAoZC51bml0cyA9PT0gdGhpcy5NTU9MX1NUUklORykge1xuICAgICAgICBkLnVuaXRzID0gdGhpcy5NR0RMX1NUUklORztcbiAgICAgICAgZC52YWx1ZSA9IHBhcnNlSW50KE1hdGgucm91bmQoZC52YWx1ZSAqIHRoaXMuTU1PTF9UT19NR0RMLCAxMCkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGQ7XG4gICAgfSwgdGhpcyk7XG4gIH0sXG5cbiAgYmFzYWxTY2hlZHVsZXNUb0FycmF5OiBmdW5jdGlvbihiYXNhbFNjaGVkdWxlcykge1xuICAgIHZhciBzY2hlZHVsZXMgPSBbXTtcbiAgICBmb3IodmFyIGtleSBpbiBiYXNhbFNjaGVkdWxlcykge1xuICAgICAgc2NoZWR1bGVzLnB1c2goe1xuICAgICAgICAnbmFtZSc6IGtleSxcbiAgICAgICAgJ3ZhbHVlJzogYmFzYWxTY2hlZHVsZXNba2V5XVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBzY2hlZHVsZXM7XG4gIH0sXG5cbiAgc29ydEJhc2FsU2NoZWR1bGVzOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgcmV0dXJuIF8ubWFwKGRhdGEsIGZ1bmN0aW9uKGQpIHtcbiAgICAgIHZhciBzY2hlZHVsZXM7XG4gICAgICBpZiAoZC50eXBlID09PSAnc2V0dGluZ3MnKSB7XG4gICAgICAgIHNjaGVkdWxlcyA9IHRoaXMuYmFzYWxTY2hlZHVsZXNUb0FycmF5KGQuYmFzYWxTY2hlZHVsZXMpO1xuICAgICAgICBpZiAoZC5zb3VyY2UgPT09ICdjYXJlbGluaycpIHtcbiAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNjaGVkdWxlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKHNjaGVkdWxlc1tpXS5uYW1lID09PSAnc3RhbmRhcmQnKSB7XG4gICAgICAgICAgICAgIHZhciBzdGFuZGFyZCA9IHNjaGVkdWxlc1tpXTtcbiAgICAgICAgICAgICAgdmFyIGluZGV4ID0gc2NoZWR1bGVzLmluZGV4T2Yoc3RhbmRhcmQpO1xuICAgICAgICAgICAgICBzY2hlZHVsZXMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgICAgc2NoZWR1bGVzLnVuc2hpZnQoc3RhbmRhcmQpO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZC5iYXNhbFNjaGVkdWxlcyA9IHNjaGVkdWxlcztcbiAgICAgICAgcmV0dXJuIGQ7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGQ7XG4gICAgICB9XG4gICAgfSwgdGhpcyk7XG4gIH0sXG5cbiAgcHJvY2Vzc0RhdGE6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICBpZiAoIShkYXRhICYmIGRhdGEubGVuZ3RoKSkge1xuICAgICAgbG9nKCdVbmV4cGVjdGVkIGRhdGEgaW5wdXQsIGRlZmF1bHRpbmcgdG8gZW1wdHkgYXJyYXkuJyk7XG4gICAgICBkYXRhID0gW107XG4gICAgfVxuXG4gICAgZGF0YSA9IHRoaXMuZWRpdEJvbHVzZXMoZGF0YSk7XG4gICAgZGF0YSA9IHRoaXMuZmlsdGVyRGF0YShkYXRhKTtcbiAgICBkYXRhID0gdGhpcy5tdW5nZUJhc2FscyhkYXRhKTtcbiAgICBkYXRhID0gdGhpcy5ydW5XYXRzb24oZGF0YSk7XG4gICAgZGF0YSA9IHRoaXMudHJhbnNsYXRlTW1vbChkYXRhKTtcbiAgICBkYXRhID0gdGhpcy5zb3J0QmFzYWxTY2hlZHVsZXMoZGF0YSk7XG5cbiAgICB2YXIgdGlkZWxpbmVEYXRhID0gdGhpcy5jaGVja1JlcXVpcmVkKG5ldyBUaWRlbGluZURhdGEoZGF0YSkpO1xuXG4gICAgcmV0dXJuIHRpZGVsaW5lRGF0YTtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQcmVwcm9jZXNzO1xuIl19
(1)
});
