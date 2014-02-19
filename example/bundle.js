(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

var tideline = require('../js');
var log = window.bows('Example');

// things common to one-day and two-week views
// common event emitter
var EventEmitter = require('events').EventEmitter;
var emitter = new EventEmitter;
emitter.setMaxListeners(100);
emitter.on('navigated', function(navString) {
  $('#tidelineNavString').html(navString);
});

// common pool modules
var fill = tideline.plot.fill;
var scales = tideline.plot.scales;
var BasalUtil = tideline.data.BasalUtil;

var el = '#tidelineContainer';
var imagesBaseUrl = '../img';

// dear old Watson
var watson = require('./watson');

// set up one-day and two-week view
var createNewOneDayChart = function() {
  return new oneDayChart(el, {imagesBaseUrl: imagesBaseUrl});
};
var createNewTwoWeekChart = function() {
  return new twoWeekChart(el, {imagesBaseUrl: imagesBaseUrl});
};
var oneDay = createNewOneDayChart();
var twoWeek = createNewTwoWeekChart();


// Note to Nico: this (all the code within d3.json() below) is all rough-and-ready...
// obviously a lot of it could be refactored
// but it should be a decent demo of how the interaction between one-day and two-week views could work
// the TODO issue noted appears to be a thorny one, so I'd like to avoid it for now since there's so much else to do

// load data and draw charts
d3.json('device-data.json', function(data) {
  log('Data loaded.');
  // munge basal segments
  var vizReadyBasals = new BasalUtil(data);
  data = _.reject(data, function(d) {
    return d.type === 'basal-rate-segment';
  });
  data = data.concat(vizReadyBasals.actual.concat(vizReadyBasals.undelivered));
  // Watson the data
  data = watson.normalize(data);
  // ensure the data is properly sorted
  data = _.sortBy(data, function(d) {
    return new Date(d.normalTime).valueOf();
  });

  log('Initial one-day view.');
  oneDay.initialize(data).locate('2014-03-06T12:00:00Z');
  // attach click handlers to set up programmatic pan
  $('#tidelineNavForward').on('click', oneDay.panForward);
  $('#tidelineNavBack').on('click', oneDay.panBack);

  $('#twoWeekView').on('click', function() {
    log('Navigated to two-week view from nav bar.');
    var date = oneDay.getCurrentDay();
    // remove click handlers for programmatic pan
    $('#tidelineNavForward').off('click');
    $('#tidelineNavBack').off('click');
    oneDay.stopListening().destroy();
    $(this).parent().addClass('active');
    $('#oneDayView').parent().removeClass('active');
    $('.one-day').css('visibility', 'hidden');
    $('.two-week').css('visibility', 'visible');
    // TODO: this shouldn't be necessary, but I've screwed something up with the global two-week.js variables
    // such that its necessary to create a new twoWeek object every time you want to rerender
    twoWeek = createNewTwoWeekChart();
    // takes user to two-week view with day user was viewing in one-day view at the end of the two-week view window
    twoWeek.initialize(data, date);
  });

  $('#oneDayView').on('click', function() {
    log('Navigated to one-day view from nav bar.');
    twoWeek.destroy();
    $(this).parent().addClass('active');
    $('#twoWeekView').parent().removeClass('active');
    $('#oneDayMostRecent').parent().addClass('active');
    $('.one-day').css('visibility', 'visible');
    $('.two-week').css('visibility', 'hidden');
    // TODO: this shouldn't be necessary, but I've screwed something up with the global one-day.js variables
    // such that its necessary to create a new oneDay object every time you want to rerender
    oneDay = createNewOneDayChart();
    // takes user to one-day view of most recent data
    oneDay.initialize(data).locate();
    // attach click handlers to set up programmatic pan
    $('#tidelineNavForward').on('click', oneDay.panForward);
    $('#tidelineNavBack').on('click', oneDay.panBack);
  });

  $('#oneDayMostRecent').on('click', function() {
    log('Navigated to most recent one-day view.');
    twoWeek.destroy();
    oneDay.stopListening();
    $(this).parent().addClass('active');
    $('#twoWeekView').parent().removeClass('active');
    $('#oneDayMostRecent').parent().addClass('active');
    $('.one-day').css('visibility', 'visible');
    $('.two-week').css('visibility', 'hidden');
    // TODO: this shouldn't be necessary, but I've screwed something up with the global one-day.js variables
    // such that its necessary to create a new oneDay object every time you want to rerender
    oneDay = createNewOneDayChart();
    // takes user to one-day view of most recent data
    oneDay.initialize(data).locate();
    // attach click handlers to set up programmatic pan
    $('#tidelineNavForward').on('click', oneDay.panForward);
    $('#tidelineNavBack').on('click', oneDay.panBack);
  });

  emitter.on('selectSMBG', function(date) {
    log('Navigated to one-day view from double clicking a two-week view SMBG.');
    twoWeek.destroy();
    $('#oneDayView').parent().addClass('active');
    $('#twoWeekView').parent().removeClass('active');
    $('#oneDayMostRecent').parent().removeClass('active');
    $('.one-day').css('visibility', 'visible');
    $('.two-week').css('visibility', 'hidden');
    // TODO: this shouldn't be necessary, but I've screwed something up with the global one-day.js variables
    // such that its necessary to create a new oneDay object every time you want to rerender
    oneDay = createNewOneDayChart();
    // takes user to one-day view of date given by the .d3-smbg-time emitter
    oneDay.initialize(data).locate(date);
    // attach click handlers to set up programmatic pan
    $('#tidelineNavForward').on('click', oneDay.panForward);
    $('#tidelineNavBack').on('click', oneDay.panBack);
  });

  $('#showHideNumbers').on('click', function() {
    if ($(this).parent().hasClass('active')) {
      emitter.emit('numbers', 'hide');
      $(this).parent().removeClass('active');
      $(this).html('Show Values');
    }
    else {
      emitter.emit('numbers', 'show');
      $(this).parent().addClass('active');
      $(this).html('Hide Values');
    }
  });
});

// // one-day visualization
// // =====================
// // create a 'oneDay' object that is a wrapper around tideline components
// // for blip's (one-day) data visualization
function oneDayChart(el, options) {
  options = options || {};

  var chart = tideline.oneDay(emitter);

  var poolMessages, poolBG, poolBolus, poolBasal, poolStats;

  var create = function(el, options) {

    if (!el) {
      throw new Error('Sorry, you must provide a DOM element! :(');
    }

    // basic chart set up
    chart.defaults().width($(el).width()).height($(el).height());

    if (options.imagesBaseUrl) {
      chart.imagesBaseUrl(options.imagesBaseUrl);
    }

    return chart;
  };

  chart.initialize = function(data) {

    // initialize chart with data
    chart.data(data);
    d3.select(el).datum([null]).call(chart);
    chart.setTooltip();

    // messages pool
    poolMessages = chart.newPool().defaults()
      .id('poolMessages')
      .label('')
      .index(chart.pools().indexOf(poolMessages))
      .weight(0.5);

    // blood glucose data pool
    poolBG = chart.newPool().defaults()
      .id('poolBG')
      .label('Blood Glucose')
      .index(chart.pools().indexOf(poolBG))
      .weight(1.5);

    // carbs and boluses data pool
    poolBolus = chart.newPool().defaults()
      .id('poolBolus')
      .label('Bolus & Carbohydrates')
      .index(chart.pools().indexOf(poolBolus))
      .weight(1.5);
    
    // basal data pool
    poolBasal = chart.newPool().defaults()
      .id('poolBasal')
      .label('Basal Rates')
      .index(chart.pools().indexOf(poolBasal))
      .weight(1.0);

    // stats widget
    // poolStats = chart.newPool().defaults()
    //   .id('poolStats')
    //   .index(chart.pools().indexOf(poolStats))
    //   .weight(1.0);

    chart.arrangePools();

    // BG pool
    var scaleBG = scales.bg(_.where(data, {'type': 'cbg'}), poolBG);
    // set up y-axis
    poolBG.yAxis(d3.svg.axis()
      .scale(scaleBG)
      .orient('left')
      .outerTickSize(0)
      .tickValues([40, 80, 120, 180, 300]));
    // add background fill rectangles to BG pool
    poolBG.addPlotType('fill', fill(poolBG, {endpoints: chart.endpoints}), false);

    // add CBG data to BG pool
    poolBG.addPlotType('cbg', tideline.plot.cbg(poolBG, {yScale: scaleBG}), true);

    // add SMBG data to BG pool
    poolBG.addPlotType('smbg', tideline.plot.smbg(poolBG, {yScale: scaleBG}), true);

    // bolus & carbs pool
    var scaleBolus = scales.bolus(_.where(data, {'type': 'bolus'}), poolBolus);
    var scaleCarbs = scales.carbs(_.where(data, {'type': 'carbs'}), poolBolus);
    // set up y-axis for bolus
    poolBolus.yAxis(d3.svg.axis()
      .scale(scaleBolus)
      .orient('left')
      .outerTickSize(0)
      .ticks(3));
    // set up y-axis for carbs
    poolBolus.yAxis(d3.svg.axis()
      .scale(scaleCarbs)
      .orient('left')
      .outerTickSize(0)
      .ticks(3));
    // add background fill rectangles to bolus pool
    poolBolus.addPlotType('fill', fill(poolBolus, {endpoints: chart.endpoints}), false);

    // add carbs data to bolus pool
    poolBolus.addPlotType('carbs', tideline.plot.carbs(poolBolus, {
      yScale: scaleCarbs,
      emitter: emitter,
      data: _.where(data, {'type': 'carbs'})
    }), true);

    // add bolus data to bolus pool
    poolBolus.addPlotType('bolus', tideline.plot.bolus(poolBolus, {
      yScale: scaleBolus,
      emitter: emitter,
      data: _.where(data, {'type': 'bolus'})
    }), true);

    // basal pool
    var scaleBasal = scales.basal(_.where(data, {'type': 'basal-rate-segment'}), poolBasal);
    // set up y-axis
    poolBasal.yAxis(d3.svg.axis()
      .scale(scaleBasal)
      .orient('left')
      .outerTickSize(0)
      .ticks(4));
    // add background fill rectangles to basal pool
    poolBasal.addPlotType('fill', fill(poolBasal, {endpoints: chart.endpoints}), false);

    // add basal data to basal pool
    poolBasal.addPlotType('basal-rate-segment', tideline.plot.basal(poolBasal, {yScale: scaleBasal, data: _.where(data, {'type': 'basal-rate-segment'}) }), true);

    // messages pool
    // add background fill rectangles to messages pool
    poolMessages.addPlotType('fill', fill(poolMessages, {endpoints: chart.endpoints}), false);

    // add message images to messages pool
    poolMessages.addPlotType('message', tideline.plot.message(poolMessages, {size: 30}), true);

    return chart;
  };

  // locate the chart around a certain datetime
  // if called without an argument, locates the chart at the most recent 24 hours of data
  chart.locate = function(datetime) {

    var start, end, localData;

    if (!arguments.length) {
      start = chart.initialEndpoints[0];
      end = chart.initialEndpoints[1];
      localData = chart.getData(chart.initialEndpoints, 'both');
    }
    else {
      start = new Date(datetime);
      end = new Date(start);
      start.setUTCHours(start.getUTCHours() - 12);
      end.setUTCHours(end.getUTCHours() + 12);

      localData = chart.getData([start, end], 'both');
      chart.beginningOfData(start).endOfData(end);
    }

    chart.allData(localData, [start, end]);

    // set up click-and-drag and scroll navigation
    chart.setNav().setScrollNav().setAtDate(start);

    // render pools
    chart.pools().forEach(function(pool) {
      pool(chart.poolGroup, localData);
    });

    // add tooltips
    chart.tooltips.addGroup(d3.select('#' + poolBG.id()), 'cbg');
    chart.tooltips.addGroup(d3.select('#' + poolBG.id()), 'smbg');
    chart.tooltips.addGroup(d3.select('#' + poolBolus.id()), 'carbs');
    chart.tooltips.addGroup(d3.select('#' + poolBolus.id()), 'bolus');
    chart.tooltips.addGroup(d3.select('#' + poolBasal.id()), 'basal');

    return chart;
  };

  chart.getCurrentDay = function() {
    return chart.date();
  };

  return create(el, options);
}

// // two-week visualization
// // =====================
// // create a 'twoWeek' object that is a wrapper around tideline components
// // for blip's (two-week) data visualization
function twoWeekChart(el, options) {
  options = options || {};

  var chart = tideline.twoWeek(emitter);

  var pools = [];

  var create = function(el, options) {
    if (!el) {
      throw new Error('Sorry, you must provide a DOM element! :(');
    }

    // basic chart set up
    chart.defaults().width($(el).width()).height($(el).height());

    if (options.imagesBaseUrl) {
      chart.imagesBaseUrl(options.imagesBaseUrl);
    }

    return chart;
  };

  chart.initialize = function(data, datetime) {

    if (!datetime) {
      chart.data(_.where(data, {'type': 'smbg'}));
    }
    else {
      chart.data(_.where(data, {'type': 'smbg'}), datetime);
    }

    // initialize chart
    d3.select(el).datum([null]).call(chart);
    chart.setNav().setScrollNav();

    days = chart.days;
    // make pools for each day
    days.forEach(function(day, i) {
      var newPool = chart.newPool().defaults()
        .id('poolBG_' + day)
        .index(chart.pools().indexOf(newPool))
        .weight(1.0);
    });
    chart.arrangePools();

    var fillEndpoints = [new Date('2014-01-01T00:00:00Z'), new Date('2014-01-02T00:00:00Z')];
    var fillScale = d3.time.scale.utc()
      .domain(fillEndpoints)
      .range([chart.axisGutter(), chart.width() - chart.navGutter()]);

    chart.pools().forEach(function(pool, i) {
      pool.addPlotType('fill', fill(pool, {
        endpoints: fillEndpoints,
        scale: fillScale,
        gutter: 0.5
      }), false);
      pool.addPlotType('smbg', tideline.plot.smbgTime(pool, {emitter: emitter}), true);
      pool(chart.daysGroup, chart.dataPerDay[i]);
    });

    return chart;
  };

  return create(el, options);
}

},{"../js":4,"./watson":2,"events":22}],2:[function(require,module,exports){
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

//
// 'Good old Watson! You are the one fixed point in a changing age.' - Sherlock Holmes, "His Last Bow"
//
// This mini module is for containing anything done to Tidepool data to make it possible to plot timezone-naive
// data reliably and consistently across different browsers and in different timezones. It is named after the
// quotation listed above as well as the fact that Watson is one of literature's ur-examples of the loyal
// assistant.
//
// Try as hard as you can to keep Watson out of library code - i.e., in this repository, Watson should only be a
// requirement in files in the example/ folder (as these are blip-specific), not in the main tideline files:
// one-day.js, two-week.js, and pool.js.
//

var log = window.bows('Watson');

var watson = {
  normalize: function(a) {
    log('Watson normalized the data.');
    return _.map(a, function(i) {
      i.normalTime = i.deviceTime + 'Z';
      if (i.utcTime) {
        var d = new Date(i.utcTime);
        var offsetMinutes = d.getTimezoneOffset();
        d.setMinutes(d.getMinutes() - offsetMinutes);
        i.normalTime = d.toISOString();
      }
      else if (i.type === 'basal-rate-segment') {
        i.normalTime = i.start + 'Z';
        i.normalEnd = i.end + 'Z';
      }
      return i;
    });
  },
  print: function(arg, d) {
    console.log(arg, d.toUTCString().replace(' GMT', ''));
    return;
  },
  strip: function(d) {
    return d.toUTCString().replace(' GMT', '');
  }
};

module.exports = watson;
},{}],3:[function(require,module,exports){
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

var _ = require('../lib/underscore');
var log = require('../lib/bows')('BasalUtil');

var keysToOmit = ['id', 'start', 'end', 'vizType'];

function BasalUtil(data) {
  var actuals = [];
  var undelivereds = [];

  function addToActuals(e) {
    actuals.push(_.extend({}, e, {vizType: 'actual'}));
  }

  function addToUndelivered(e) {
    undelivereds.push(_.extend({}, e, {vizType: 'undelivered'}));
  }

  function processElement(e) {
    if (e.deliveryType === 'temp' || e.deliveryType === 'scheduled') {
      if (actuals.length === 0) {
        addToActuals(e);
      } else {
        var lastActual = actuals[actuals.length - 1];
        if (e.start === lastActual.end) {
          if (_.isEqual(_.omit(e, keysToOmit), _.omit(lastActual, keysToOmit))) {
            lastActual.end = e.end;
          } else {
            addToActuals(e);
          }
        } else if (e.start < lastActual.end) {
          // It is overlapping, so let's see how we should deal with it.

          if (e.start < lastActual.start) {
            // The current element is completely newer than the last actual, so we have to rewind a bit.
            var removedActual = actuals.pop();
            processElement(e);
            processElement(removedActual);
          } else if (e.deliveryType === 'temp') {
            // It's a temp, which wins no matter what it was before.
            // Start by setting up shared adjustments to the segments (clone lastActual and reshape it)
            var undeliveredClone = _.clone(lastActual);
            lastActual.end = e.start;

            if (e.end >= undeliveredClone.end) {
              // The temp segment is longer than the current, throw away the rest of the current
              undeliveredClone.start = e.start;
              addToUndelivered(undeliveredClone);
              addToActuals(e);
            } else {
              // The current exceeds the temp, so replace the current "chunk" and re-attach the schedule
              var endingSegment = _.clone(undeliveredClone);
              undeliveredClone.start = e.start;
              undeliveredClone.end = e.end;
              addToUndelivered(undeliveredClone);
              addToActuals(_.clone(e));

              // Re-attach the end of the schedule
              endingSegment.start = e.end;
              addToActuals(endingSegment);
            }
          } else {
            // e.deliveryType === 'scheduled'
            if (lastActual.deliveryType === 'scheduled') {
              // Scheduled overlapping a scheduled, this should not happen.
              log('Scheduled overlapped a scheduled.  Should never happen.', lastActual, e);
            } else {
              // Scheduled overlapping a temp, this can happen and the schedule should be skipped
              var undeliveredClone = _.clone(e);

              if (e.end > lastActual.end) {
                // Scheduled is longer than the temp, so preserve the tail
                var deliveredClone = _.clone(e);
                undeliveredClone.end = lastActual.end;
                deliveredClone.start = lastActual.end;
                addToUndelivered(undeliveredClone);
                addToActuals(deliveredClone);
              } else {
                // Scheduled is shorter than the temp, so completely skip it
                addToUndelivered(undeliveredClone);
              }
            }
          }
        } else {
          // e.start > lastActual.end
          log('e.start[' + e.start + '] > lastActual.end[' + lastActual.end + '].  ' +
            'BAD!!!! AAAHHHHHHH.  Sort input data plz, thx, cheezburger');
        }
      }
    }
  }

  data.forEach(processElement);

  this.actual = actuals;
  this.undelivered = undelivereds;
}

module.exports = BasalUtil;
},{"../lib/bows":5,"../lib/underscore":7}],4:[function(require,module,exports){
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

module.exports = {
  pool: require('./pool'),
  oneDay: require('./one-day'),
  twoWeek: require('./two-week'),

  data: {
    BasalUtil: require('./data/basalutil')
  },

  plot: {
    basal: require('./plot/basal'),
    bolus: require('./plot/bolus'),
    carbs: require('./plot/carbs'),
    cbg: require('./plot/cbg'),
    fill: require('./plot/fill'),
    message: require('./plot/message'),
    scales: require('./plot/scales'),
    smbgTime: require('./plot/smbg-time'),
    smbg: require('./plot/smbg'),
    tooltip: require('./plot/tooltip')
  }
};
},{"./data/basalutil":3,"./one-day":8,"./plot/basal":9,"./plot/bolus":10,"./plot/carbs":11,"./plot/cbg":12,"./plot/fill":13,"./plot/message":14,"./plot/scales":15,"./plot/smbg":17,"./plot/smbg-time":16,"./plot/tooltip":18,"./pool":19,"./two-week":20}],5:[function(require,module,exports){
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

var bows;

if (typeof window !== 'undefined') {
  bows = window.bows;
}

if (!bows) {
  // Optional dependency
  // Return a factory for a log function that does nothing
  bows = function() {
    return function() {};
  };
}

module.exports = bows;
},{}],6:[function(require,module,exports){
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

var Duration;

if (typeof window !== 'undefined') {
  Duration = window.Duration;
}

if (!Duration) {
  throw new Error('Duration.js is a required dependency');
}

module.exports = Duration;
},{}],7:[function(require,module,exports){
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

var _;

if (typeof window !== 'undefined') {
  _ = window._;
}
else {
  // Required for node tests
  // Will not get bundled into browserify build because inside an "if" block
  _ = require('underscore');
}

if (!_) {
  throw new Error('Underscore or Lodash is a required dependency');
}

module.exports = _;
},{"underscore":21}],8:[function(require,module,exports){
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

var log = require('./lib/bows')('One Day');

module.exports = function(emitter) {
  var pool = require('./pool');

  var tooltip = require('./plot/tooltip');

  var MS_IN_24 = 86400000;

  var bucket,
    id,
    width, minWidth,
    height, minHeight,
    imagesBaseUrl,
    gutter,
    axisGutter,
    nav = {},
    pools = [], gutter,
    xScale = d3.time.scale.utc(),
    xAxis = d3.svg.axis().scale(xScale).orient('top').outerTickSize(0).innerTickSize(15).tickFormat(d3.time.format.utc("%-I %p")),
    beginningOfData, endOfData, data, allData = [], buffer, endpoints,
    mainGroup, scrollHandleTrigger = true, tooltips;

  container.dataFill = {};

  var defaults = {
    bucket: $('#tidelineContainer'),
    id: 'tidelineSVG',
    minWidth: 400,
    minHeight: 400,
    imagesBaseUrl: 'img',
    nav: {
      minNavHeight: 30,
      scrollNav: true,
      scrollNavHeight: 40,
      scrollThumbRadius: 8,
      latestTranslation: 0,
      currentTranslation: 0
    },
    axisGutter: 40,
    gutter: 40,
    buffer: 5,
    tooltip: true
  };

  function container(selection) {
    selection.each(function(currentData) {
      // select the SVG if it already exists
      var mainSVG = selection.selectAll('svg').data([currentData]);
      // otherwise create a new SVG and enter   
      mainGroup = mainSVG.enter().append('svg').append('g').attr('id', 'tidelineMain');

      // update SVG dimenions and ID
      mainSVG.attr({
        'id': id,
        'width': width,
        'height': function() {
          height += + nav.axisHeight;
          if (nav.scrollNav) {
            height += nav.scrollNavHeight;
          }
          return height;
        }
      });

      mainGroup.append('rect')
        .attr({
          'id': 'poolsInvisibleRect',
          'width': width,
          'height': function() {
            if (nav.scrollNav) {
              return (height - nav.scrollNavHeight);
            }
            else {
              return height;
            }
          },
          'opacity': 0.0
        });

      // set the domain and range for the main tideline x-scale
      xScale.domain([container.initialEndpoints[0], container.initialEndpoints[1]])
        .range([container.axisGutter(), width]);

      mainGroup.append('g')
        .attr('class', 'd3-x d3-axis')
        .attr('id', 'tidelineXAxis')
        .attr('transform', 'translate(0,' + (nav.axisHeight - 1) + ')')
        .call(xAxis);

      d3.selectAll('#tidelineXAxis g.tick text').style('text-anchor', 'start').attr('transform', 'translate(5,15)');

      container.poolGroup = mainGroup.append('g').attr('id', 'tidelinePools');

      mainGroup.append('g')
        .attr('id', 'tidelineLabels');

      mainGroup.append('g')
        .attr('id', 'tidelineYAxes')
        .append('rect')
        .attr({
          'id': 'yAxesInvisibleRect',
          'height': function() {
            if (nav.scrollNav) {
              return (height - nav.scrollNavHeight);
            }
            else {
              return height;
            }
          },
          'width': container.axisGutter(),
          'fill': 'white'
        });

      if (nav.scrollNav) {
        scrollNav = mainGroup.append('g')
          .attr('class', 'x scroll')
          .attr('id', 'tidelineScrollNav');

        nav.scrollScale = d3.time.scale.utc()
          .domain([endpoints[0], container.currentEndpoints[0]])
          .range([container.axisGutter() + nav.scrollThumbRadius, width - nav.scrollThumbRadius]);
      }
    });
  }

  // non-chainable methods
  container.getData = function(endpoints, direction) {
    if (!arguments.length) {
      endpoints = container.initialEndpoints;
      direction = 'both';
    }

    var start = new Date(endpoints[0]);
    var end = new Date(endpoints[1]);

    container.currentEndpoints = [start, end];

    readings = _.filter(data, function(datapoint) {
      t = Date.parse(datapoint.normalTime);
      if (direction == 'both') {
        if ((t >= start) && (t <= end)) {
          return datapoint;
        }
      }
      else if (direction == 'left') {
        if ((t >= start) && (t < end)) {
          return datapoint;
        }
      }
      else if (direction == 'right') {
        if ((t > start) && (t <= end)) {
          return datapoint;
        }
      }
    });

    return readings;
  };

  container.panForward = function() {
    log('Jumped forward a day.');
    nav.currentTranslation -= width - container.axisGutter();
    mainGroup.transition().duration(500).tween('zoom', function() {
      var ix = d3.interpolate(nav.currentTranslation + width - container.axisGutter(), nav.currentTranslation);
      return function(t) {
        nav.pan.translate([ix(t), 0]);
        nav.pan.event(mainGroup);
      };
    });
  };

  container.panBack = function() {
    log('Jumped back a day.');
    nav.currentTranslation += width - container.axisGutter();
    mainGroup.transition().duration(500).tween('zoom', function() {
      var ix = d3.interpolate(nav.currentTranslation - width + container.axisGutter(), nav.currentTranslation);
      return function(t) {
        nav.pan.translate([ix(t), 0]);
        nav.pan.event(mainGroup);
      };
    });
  };

  container.newPool = function() {
    var p = new pool(container);
    pools.push(p);
    return p;
  };

  container.arrangePools = function() {
    var numPools = pools.length;
    var cumWeight = 0;
    pools.forEach(function(pool) {
      cumWeight += pool.weight();
    });
    // TODO: adjust for when no scrollNav
    var totalPoolsHeight = 
      container.height() - container.axisHeight() - container.scrollNavHeight() - (numPools - 1) * container.gutter();
    var poolScaleHeight = totalPoolsHeight/cumWeight;
    var actualPoolsHeight = 0;
    pools.forEach(function(pool) {
      pool.height(poolScaleHeight);
      actualPoolsHeight += pool.height();
    });
    actualPoolsHeight += (numPools - 1) * container.gutter();
    var currentYPosition = container.axisHeight();
    pools.forEach(function(pool) {
      pool.yPosition(currentYPosition);
      currentYPosition += pool.height() + container.gutter();
    });
  };

  container.stopListening = function() {
    emitter.removeAllListeners('carbTooltipOn');
    emitter.removeAllListeners('carbTooltipOff');
    emitter.removeAllListeners('bolusTooltipOn');
    emitter.removeAllListeners('bolusTooltipOff');
    emitter.removeAllListeners('noCarbTimestamp');

    return container;
  };

  container.destroy = function() {
    $('#' + this.id()).remove();
    delete pool;
  };

  container.date = function() {
    var d = new Date(xScale.domain()[0]);
    return new Date(d.setUTCHours(d.getUTCHours() + 12));
  };

  // chainable methods
  container.defaults = function(obj) {
    if (!arguments.length) {
      properties = defaults;
    }
    else {
      properties = obj;
    }
    this.bucket(properties.bucket);
    this.id(properties.id);
    this.minWidth(properties.minWidth).width(properties.width);
    this.scrollNav(properties.nav.scrollNav);
    this.minNavHeight(properties.nav.minNavHeight)
      .axisHeight(properties.nav.minNavHeight)
      .scrollThumbRadius(properties.nav.scrollThumbRadius)
      .scrollNavHeight(properties.nav.scrollNavHeight);
    this.minHeight(properties.minHeight).height(properties.minHeight);
    this.latestTranslation(properties.nav.latestTranslation)
      .currentTranslation(properties.nav.currentTranslation);
    this.axisGutter(properties.axisGutter);
    this.gutter(properties.gutter);
    this.buffer(properties.buffer);
    this.tooltips(properties.tooltips);
    this.imagesBaseUrl(properties.imagesBaseUrl);

    return container;
  };

  container.setNav = function() {
    var maxTranslation = -xScale(endpoints[0]) + axisGutter;
    var minTranslation = -xScale(endpoints[1]) + width;
    nav.pan = d3.behavior.zoom()
      .scaleExtent([1, 1])
      .x(xScale)
      .on('zoom', function() {
        if ((endOfData - xScale.domain()[1] < MS_IN_24) && !(endOfData.getTime() === endpoints[1])) {
          log('Rendering new data! (right)');
          var plusOne = new Date(container.endOfData());
          plusOne.setDate(plusOne.getDate() + 1);
          var newData = container.getData([endOfData, plusOne], 'right');
          // update endOfData
          if (plusOne <= endpoints[1]) {
            container.endOfData(plusOne); 
          }
          else {
            container.endOfData(endpoints[1]);
          }
          container.allData(newData);
          for (j = 0; j < pools.length; j++) {
            pools[j](container.poolGroup, container.allData());
          }
        }
        if ((xScale.domain()[0] - beginningOfData < MS_IN_24) && !(beginningOfData.getTime() === endpoints[0])) {
          log('Rendering new data! (left)');
          var plusOne = new Date(container.beginningOfData());
          plusOne.setDate(plusOne.getDate() - 1);
          var newData = container.getData([plusOne, beginningOfData], 'left');
          // update beginningOfData
          if (plusOne >= endpoints[0]) {
            container.beginningOfData(plusOne);
          }
          else {
            container.beginningOfData(endpoints[0]);
          }
          container.allData(newData);
          for (j = 0; j < pools.length; j++) {
            pools[j](container.poolGroup, container.allData());
          }
        }
        var e = d3.event;
        if (e.translate[0] < minTranslation) {
          e.translate[0] = minTranslation;
        }
        else if (e.translate[0] > maxTranslation) {
          e.translate[0] = maxTranslation;
        }
        nav.pan.translate([e.translate[0], 0]);
        for (var i = 0; i < pools.length; i++) {
          pools[i].pan(e);
        }
        // TODO: check if container has tooltips before transforming them
        d3.select('#d3-tooltip-group').attr('transform', 'translate(' + e.translate[0] + ',0)');
        d3.select('.d3-x.d3-axis').call(xAxis);
        d3.selectAll('#tidelineXAxis g.tick text').style('text-anchor', 'start').attr('transform', 'translate(5,15)');
        if (scrollHandleTrigger) {
          d3.select('#scrollThumb').transition().ease('linear').attr('x', function(d) {
            d.x = nav.scrollScale(xScale.domain()[0]);
            return d.x - nav.scrollThumbRadius;
          });       
        }
        container.navString(xScale.domain());
      })
      .on('zoomend', function() {
        container.currentTranslation(nav.latestTranslation);
        scrollHandleTrigger = true;
      });

    mainGroup.call(nav.pan);

    return container;
  };

  container.setScrollNav = function() {
    var translationAdjustment = axisGutter;
    scrollNav.attr('transform', 'translate(0,'  + (height - (nav.scrollNavHeight / 2)) + ')')
      .append('line')
      .attr({
        'x1': nav.scrollScale(endpoints[0]) - nav.scrollThumbRadius,
        'x2': nav.scrollScale(container.initialEndpoints[0]) + nav.scrollThumbRadius,
        'y1': 0,
        'y2': 0
      });

    var dxRightest = nav.scrollScale.range()[1];
    var dxLeftest = nav.scrollScale.range()[0];

    var drag = d3.behavior.drag()
      .origin(function(d) {
        return d;
      })
      .on('dragstart', function() {
        d3.event.sourceEvent.stopPropagation(); // silence the click-and-drag listener
      })
      .on('drag', function(d) {
        d.x += d3.event.dx;
        if (d.x > dxRightest) {
          d.x = dxRightest;
        }
        else if (d.x < dxLeftest) {
          d.x = dxLeftest;
        }
        d3.select(this).attr('x', function(d) { return d.x - nav.scrollThumbRadius; });
        var date = nav.scrollScale.invert(d.x);
        nav.currentTranslation += -xScale(date) + translationAdjustment;
        scrollHandleTrigger = false;
        nav.pan.translate([nav.currentTranslation, 0]);
        nav.pan.event(mainGroup);
      });

    scrollNav.selectAll('image')
      .data([{'x': nav.scrollScale(container.currentEndpoints[0]), 'y': 0}])
      .enter()
      .append('image')
      .attr({
        'xlink:href': imagesBaseUrl + '/ux/scroll_thumb.svg',
        'x': function(d) { return d.x - nav.scrollThumbRadius; },
        'y': -nav.scrollThumbRadius,
        'width': nav.scrollThumbRadius * 2,
        'height': nav.scrollThumbRadius * 2,
        'id': 'scrollThumb'
      })
      .call(drag);

    return container;
  };

  container.setAtDate = function (date) {
    nav.currentTranslation = -xScale(date) + axisGutter;
    nav.pan.translate([nav.currentTranslation, 0]);
    nav.pan.event(mainGroup);

    container.navString(xScale.domain());

    return container;
  };

  container.navString = function(a) {
    var formatDate = d3.time.format.utc("%A %-d %B");
    var beginning = formatDate(a[0]);
    var end = formatDate(a[1]);
    var navString;
    if (beginning === end) {
      navString = beginning;
    }
    else {
      navString = beginning + ' - ' + end;
    }
    emitter.emit('navigated', navString);
  };

  container.setTooltip = function() {
    var tooltipGroup = mainGroup.append('g')
      .attr('id', 'd3-tooltip-group');
    container.tooltips = new tooltip(container, tooltipGroup).id(tooltipGroup.attr('id'));
    return container;
  };

  // getters and setters
  container.bucket = function(x) {
    if (!arguments.length) return bucket;
    bucket = x;
    return container;
  };

  container.id = function(x) {
    if (!arguments.length) return id;
    id = x;
    return container;
  };

  container.width = function(x) {
    if (!arguments.length) return width;
    if (x >= minWidth) {
      if (x > bucket.width()) {
        width = bucket.width();
      }
      else {
        width = x;
      }
    }
    else {
      width = minWidth;
    }
    return container;
  };

  container.minWidth = function(x) {
    if (!arguments.length) return minWidth;
    minWidth = x;
    return container;
  };

  container.height = function(x) {
    if (!arguments.length) return height;
    var totalHeight = x + container.axisHeight();
    if (nav.scrollNav) {
      totalHeight += container.scrollNavHeight();
    }
    if (totalHeight >= minHeight) {
      if (totalHeight > bucket.height()) {
        height = bucket.height() - container.axisHeight();
        if (nav.scrollNav) {
          height -= container.scrollNavHeight();
        }
      }
      else {
        height = x; 
      }
    }
    else {
      height = minHeight;
    }
    return container;
  };

  container.minHeight = function(x) {
    if (!arguments.length) return minHeight;
    minHeight = x;
    return container;
  };

  container.imagesBaseUrl = function(x) {
    if (!arguments.length) return imagesBaseUrl;
    imagesBaseUrl = x;
    return container;
  };

  // nav getters and setters
  container.axisHeight = function(x) {
    if (!arguments.length) return nav.axisHeight;
    if (x >= nav.minNavHeight) {
      nav.axisHeight = x;
    }
    else {
      nav.axisHeight = nav.minNavHeight;
    }
    return container;
  };

  container.minNavHeight = function(x) {
    if (!arguments.length) return nav.minNavHeight;
    nav.minNavHeight = x;
    return container;
  };

  // nav.scrollNav getters and setters
  container.scrollNav = function(b) {
    if (!arguments.length) return nav.scrollNav;
    nav.scrollNav = b;
    return container;
  };

  container.scrollThumbRadius = function(x) {
    if (!arguments.length) return nav.scrollThumbRadius;
    nav.scrollThumbRadius = x;
    return container;
  };

  container.scrollNavHeight = function(x) {
    if (!arguments.length) return nav.scrollNavHeight;
    if (x >= nav.minNavHeight) {
      nav.scrollNavHeight = x;
    }
    else {
      nav.scrollNavHeight = nav.minNavHeight;
    }
    return container;
  };

  container.scrollScale = function(f) {
    if (!arguments.length) return nav.scrollScale;
    nav.scrollScale = f;
    return container;
  };

  container.pan = function(f) {
    if (!arguments.length) return nav.pan;
    nav.pan = f;
    return container;
  };

  container.latestTranslation = function(x) {
    if (!arguments.length) return nav.latestTranslation;
    nav.latestTranslation = x;
    return container;
  };

  container.currentTranslation = function(x) {
    if (!arguments.length) return nav.currentTranslation;
    nav.currentTranslation = x;
    return container;
  };

  // pools getter and setter
  container.pools = function(a) {
    if (!arguments.length) return pools;
    pools = a;
    return container;
  };

  container.axisGutter = function(x) {
    if (!arguments.length) return axisGutter;
    axisGutter = x;
    return container;
  };

  container.gutter = function(x) {
    if (!arguments.length) return gutter;
    gutter = x;
    return container;
  };

  // scales and axes getters and setters
  container.xScale = function(f) {
    if (!arguments.length) return xScale;
    xScale = f;
    return container;
  };

  container.xAxis = function(f) {
    if (!arguments.length) return xAxis;
    xAxis = f;
    return container;
  };

  // data getters and setters
  container.beginningOfData = function(d) {
    if (!arguments.length) return beginningOfData;
    beginningOfData = new Date(d);
    return container;
  };

  container.endOfData = function(d) {
    if (!arguments.length) return endOfData;
    endOfData = new Date(d);
    return container;
  };

  container.data = function(a) {
    if (!arguments.length) return data;

    data = a;

    var first = Date.parse(a[0].normalTime);
    var last = Date.parse(a[a.length - 1].normalTime);

    var minusOne = new Date(last);
    minusOne.setDate(minusOne.getDate() - 1);
    container.initialEndpoints = [minusOne, last];
    container.currentEndpoints = container.initialEndpoints;

    container.beginningOfData(minusOne).endOfData(last);

    endpoints = [first, last];
    container.endpoints = endpoints;

    return container;
  };

  container.allData = function(x, a) {
    if (!arguments.length) return allData;
    if (!a) {
      a = xScale.domain();
    }
    allData = allData.concat(x);
    log('Length of allData array is', allData.length);
    var plus = new Date(a[1]);
    plus.setDate(plus.getDate() + container.buffer());
    var minus = new Date(a[0]);
    minus.setDate(minus.getDate() - container.buffer());
    if (beginningOfData < minus) {
      container.beginningOfData(minus); 
      allData = _.filter(allData, function(datapoint) {
        var t = Date.parse(datapoint.normalTime);
        if (t >= minus) {
          return t;
        }
      });
    }
    if (endOfData > plus) {
      container.endOfData(plus);
      allData = _.filter(allData, function(datapoint) {
        var t = Date.parse(datapoint.normalTime);
        if (t <= plus) {
          return t;
        }
      });
    }
    allData = _.sortBy(allData, function(d) {
      return new Date(d.normalTime).valueOf();
    });
    allData = _.uniq(allData, true);
    return container;
  };

  container.buffer = function(x) {
    if (!arguments.length) return buffer;
    buffer = x;
    return container;
  };

  container.tooltips = function(b) {
    if (!arguments.length) return tooltips;
    tooltips = b;
    return container;
  };

  return container;
};
},{"./lib/bows":5,"./plot/tooltip":18,"./pool":19}],9:[function(require,module,exports){
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

var Duration = require('../lib/duration');
var log = require('../lib/bows')('Basal');

module.exports = function(pool, opts) {

  var QUARTER = ' ¼', HALF = ' ½', THREE_QUARTER = ' ¾', THIRD = ' ⅓', TWO_THIRDS = ' ⅔';

  opts = opts || {};

  var defaults = {
    classes: {
      'reg': {'tooltip': 'basal_tooltip_reg.svg', 'height': 20},
      'temp': {'tooltip': 'basal_tooltip_temp_large.svg', 'height': 40}
    },
    tooltipWidth: 180,
    xScale: pool.xScale().copy(),
    pathStroke: 1.5,
    opacity: 0.3,
    opacityDelta: 0.1
  };

  _.defaults(opts, defaults);

  function basal(selection) {
    selection.each(function(currentData) {

      // to prevent blank rectangle at beginning of domain
      var index = opts.data.indexOf(currentData[0]);
      // when near left edge currentData[0] will have index 0, so we don't want to decrement it
      if (index !== 0) {
        index--;
      }
      while ((index >= 0) && (opts.data[index].vizType !== 'actual')) {
        index--;
      }
      // when index === 0 might catch a non-basal
      if (opts.data[index].type === 'basal-rate-segment') {
        currentData.unshift(opts.data[index]);
      }

      var line = d3.svg.line()
        .x(function(d) { return d.x; })
        .y(function(d) { return d.y; })
        .interpolate('step-after');

      var actual = _.where(currentData, {'vizType': 'actual'});
      var undelivered = _.where(opts.data, {'vizType': 'undelivered', 'deliveryType': 'scheduled'});

      // TODO: remove this when we have guaranteed unique IDs for each basal rate segment again
      currentData.forEach(function(d) {
        if ((d.id.search('_actual') === -1) && (d.id.search('_undelivered') === -1)) {
          d.id = d.id + '_' + d.start.replace(/:/g, '') + '_' + d.vizType;
        }
      });

      var rects = d3.select(this)
        .selectAll('g')
        .data(currentData, function(d) {
          return d.id;
        });
      var rectGroups = rects.enter()
        .append('g')
        .attr('class', 'd3-basal-group')
        .attr('id', function(d) {
          return 'basal_group_' + d.id;
        });
      rectGroups.filter(function(d){
        if (d.vizType === 'actual') {
          return d;
        }
      })
        .append('rect')
        .attr({
          'width': function(d) {
            return basal.width(d);
          },
          'height': function(d) {
            var height = pool.height() - opts.yScale(d.value);
            if (height < 0) {
              return 0;
            }
            else {
              return height;
            }
          },
          'x': function(d) {
            return opts.xScale(new Date(d.normalTime));
          },
          'y': function(d) {
            return opts.yScale(d.value);
          },
          'opacity': '0.3',
          'class': function(d) {
            var classes;
            if (d.deliveryType === 'temp') {
              classes = 'd3-basal d3-rect-basal d3-basal-temp';
            }
            else {
              classes = 'd3-basal d3-rect-basal';
            }
            if (d.delivered !== 0) {
              classes += ' d3-rect-basal-nonzero';
            }
            return classes;
          },
          'id': function(d) {
            return 'basal_' + d.id;
          }
        });
      rectGroups.filter(function(d) {
        if (d.deliveryType !== 'temp') {
          return d;
        }
      })
        .append('rect')
        .attr({
          'width': function(d) {
            return basal.width(d);
          },
          'height': pool.height(),
          'x': function(d) {
            return opts.xScale(new Date(d.normalTime));
          },
          'y': function(d) {
            return opts.yScale.range()[1];
          },
          'class': function(d) {
            if (d.vizType === 'undelivered') {
              return 'd3-basal d3-basal-invisible d3-basal-temp';
            }
            else {
              return 'd3-basal d3-basal-invisible';
            }
          },
          'id': function(d) {
            return 'basal_invisible_' + d.id;
          }
        });
      rectGroups.filter(function(d) {
          if (d.delivered !== 0) {
            return d;
          }
        })
        .selectAll('.d3-basal-invisible')
        .classed('d3-basal-nonzero', true);
      rects.exit().remove();

      var basalGroup = d3.select(this);

      var actualPoints = [];

      actual.forEach(function(d) {
        actualPoints.push({
          'x': opts.xScale(new Date(d.normalTime)),
          'y': opts.yScale(d.value) - opts.pathStroke / 2,
        },
        {
          'x': opts.xScale(new Date(d.normalEnd)),
          'y': opts.yScale(d.value) - opts.pathStroke / 2,
        });
      });

      d3.selectAll('.d3-path-basal').remove();

      d3.select(this).append('path')
        .attr({
        'd': line(actualPoints),
        'class': 'd3-basal d3-path-basal'
      });

      if (undelivered.length !== 0) {
        var undeliveredSequences = [];
        var contiguous = [];
        undelivered.forEach(function(segment, i, segments) {
          if ((i < (segments.length - 1)) && (segment.end === segments[i + 1].start)) {
            segment.contiguousWith = 'next';
          }
          else if ((i !== 0) && (segments[i - 1].end === segment.start)) {
            segment.contiguousWith = 'previous';
          }
          else {
            segment.contiguousWith = 'none';
            undeliveredSequences.push([segment]);
          }
        });
        undelivered = undelivered.reverse();

        var anchors = _.where(undelivered, {'contiguousWith': 'previous'});

        anchors.forEach(function(anchor) {
          var index = undelivered.indexOf(anchor);
          contiguous.push(undelivered[index]);
          index++;
          while (undelivered[index].contiguousWith === 'next') {
            contiguous.push(undelivered[index]);
            index++;
            if (index > (undelivered.length - 1)) {
              break;
            }
          }
          undeliveredSequences.push(contiguous);
          contiguous = [];
        });

        undeliveredSequences.forEach(function(seq) {
          seq = seq.reverse();
          var pathPoints = _.map(seq, function(segment) {
            return [{
              'x': opts.xScale(new Date(segment.normalTime)),
              'y': opts.yScale(segment.value)
            },
            {
              'x': opts.xScale(new Date(segment.normalEnd)),
              'y': opts.yScale(segment.value)
            }];
          });
          pathPoints = _.flatten(pathPoints);
          pathPoints = _.uniq(pathPoints, function(point) {
            return JSON.stringify(point);
          });

          basalGroup.append('path')
            .attr({
              'd': line(pathPoints),
              'class': 'd3-basal d3-path-basal d3-path-basal-undelivered'
            });
        });

        basal.link_temp(_.where(actual, {'deliveryType': 'temp'}), undelivered);
      }

      // tooltips
      d3.selectAll('.d3-basal-invisible').on('mouseover', function() {
        var invisiRect = d3.select(this);
        var id = invisiRect.attr('id').replace('basal_invisible_', '');
        var d = d3.select('#basal_group_' + id).datum();
        if (invisiRect.classed('d3-basal-temp')) {
          var tempD = _.clone(_.findWhere(actual, {'deliveryType': 'temp', 'id': d.link.replace('link_', '')}));
          tempD.id = d.id;
          basal.addTooltip(tempD, 'temp', d);
        }
        else {
          basal.addTooltip(d, 'reg');
        }
        if (invisiRect.classed('d3-basal-nonzero')) {
          if (invisiRect.classed('d3-basal-temp')) {
            d3.select('#basal_' + d.link.replace('link_', '')).attr('opacity', opts.opacity + opts.opacityDelta);
          }
          else {
            d3.select('#basal_' + id).attr('opacity', opts.opacity + opts.opacityDelta);
          }
        }
      });
      d3.selectAll('.d3-basal-invisible').on('mouseout', function() {
        var invisiRect = d3.select(this);
        var id = invisiRect.attr('id').replace('basal_invisible_', '');
        var d = d3.select('#basal_group_' + id).datum();
        d3.select('#tooltip_' + id).remove();
        if (invisiRect.classed('d3-basal-temp')) {
          d3.select('#basal_' + d.link.replace('link_', '')).attr('opacity', opts.opacity);
        }
        else {
          d3.select('#basal_' + id).attr('opacity', opts.opacity);
        }
      });
    });
  }

  basal.link_temp = function(toLink, referenceArray) {
    referenceArray = referenceArray.slice(0);
    referenceArray = _.sortBy(referenceArray, function(segment) {
      return Date.parse(segment.normalTime);
    });
    toLink.forEach(function(segment, i, segments) {
      var start = _.findWhere(referenceArray, {'normalTime': segment.normalTime});
      if (start === undefined) {
        log(segment, referenceArray);
      }
      var startIndex = referenceArray.indexOf(start);
      if ((startIndex < (referenceArray.length - 1)) && (start.end === referenceArray[startIndex + 1].start)) {
        var end = _.findWhere(referenceArray, {'normalEnd': segment.normalEnd});
        var endIndex = referenceArray.indexOf(end);
        var index = startIndex;
        while (index <= endIndex) {
          referenceArray[index].link = 'link_' + segment.id;
          index++;
        }
      }
      else {
        referenceArray[startIndex].link = 'link_' + segment.id;
      }
    });
  };

  basal.timespan = function(d) {
    var start = Date.parse(d.normalTime);
    var end = Date.parse(d.normalEnd);
    var diff = end - start;
    var dur = Duration.parse(diff + 'ms');
    var hours = dur.hours();
    var minutes = dur.minutes() - (hours * 60);
    if (hours !== 0) {
      if (hours === 1) {
        switch(minutes) {
          case 0: return 'over ' + hours + ' hr';
          case 15: return 'over ' + hours + QUARTER + ' hr';
          case 20: return 'over ' + hours + THIRD + ' hr';
          case 30: return 'over ' + hours + HALF + ' hr';
          case 40: return 'over ' + hours + TWO_THIRDS + ' hr';
          case 45: return 'over ' + hours + THREE_QUARTER + ' hr';
          default: return 'over ' + hours + ' hr ' + minutes + ' min';
        }
      }
      else {
        switch(minutes) {
          case 0: return 'over ' + hours + ' hrs';
          case 15: return 'over ' + hours + QUARTER + ' hrs';
          case 20: return 'over ' + hours + THIRD + ' hrs';
          case 30: return 'over ' + hours + HALF + ' hrs';
          case 40: return 'over ' + hours + TWO_THIRDS + ' hrs';
          case 45: return 'over ' + hours + THREE_QUARTER + ' hrs';
          default: return 'over ' + hours + ' hrs ' + minutes + ' min';
        }
      }
    }
    else {
      return 'over ' + minutes + ' min';
    }
  };

  basal.width = function(d) {
    return opts.xScale(new Date(d.normalEnd)) - opts.xScale(new Date(d.normalTime));
  };

  basal.addTooltip = function(d, category, unD) {
    var tooltipHeight = opts.classes[category].height;
    d3.select('#' + 'd3-tooltip-group_basal').call(tooltips,
        d,
        // tooltipXPos
        opts.xScale(Date.parse(d.normalTime)),
        'basal',
        // timestamp
        false,
        opts.classes[category]['tooltip'],
        opts.tooltipWidth,
        tooltipHeight,
        // imageX
        opts.xScale(Date.parse(d.normalTime)) - opts.tooltipWidth / 2 + basal.width(d) / 2,
        // imageY
        function() {
          var y = opts.yScale(d.value) - tooltipHeight * 2;
          if (y < 0) {
            return 0;
          }
          else {
            return y;
          }
        },
        // textX
        opts.xScale(Date.parse(d.normalTime)) + basal.width(d) / 2,
        // textY
        function() {
          var y = opts.yScale(d.value) - tooltipHeight * 2;
          if (category === 'temp') {
            if (y < 0) {
              return tooltipHeight * (3 / 10);
            }
            else {
              return opts.yScale(d.value) - tooltipHeight * 1.7;
            }
          }
          else {
            if (y < 0) {
              return tooltipHeight / 2;
            }
            else {
              return opts.yScale(d.value) - tooltipHeight * 1.5;
            }
          }
        },
        function() {
          if (d.value === 0) {
            return '0.0U';
          }
          else {
            return d.value + 'U';
          }
        }(),
        basal.timespan(d));
    if (category === 'temp') {
      d3.select('#tooltip_' + d.id).select('.d3-tooltip-text-group').append('text')
        .attr({
          'class': 'd3-tooltip-text d3-basal',
          'x': opts.xScale(Date.parse(d.normalTime)) + basal.width(d) / 2,
          'y': function() {
            var y = opts.yScale(d.value) - tooltipHeight * 2;
            if (y < 0) {
              return tooltipHeight * (7 / 10);
            }
            else {
              return opts.yScale(d.value) - tooltipHeight * 1.3;
            }
          }
        })
        .append('tspan')
        .text('(' + unD.value + 'U scheduled)');
    }
  };

  return basal;
};

},{"../lib/bows":5,"../lib/duration":6}],10:[function(require,module,exports){
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

var Duration = require('../lib/duration');
var log = require('../lib/bows')('Bolus');

module.exports = function(pool, opts) {

  var QUARTER = ' ¼', HALF = ' ½', THREE_QUARTER = ' ¾', THIRD = ' ⅓', TWO_THIRDS = ' ⅔';

  var MS_IN_ONE = 60000;

  opts = opts || {};

  var defaults = {
    classes: {
      'unspecial': {'tooltip': 'tooltip_bolus_small.svg', 'width': 70, 'height': 24},
      'two-line': {'tooltip': 'tooltip_bolus_large.svg', 'width': 98, 'height': 39},
      'three-line': {'tooltip': 'tooltip_bolus_extralarge.svg', 'width': 98, 'height': 58}
    },
    xScale: pool.xScale().copy(),
    width: 12,
    bolusStroke: 2,
    triangleSize: 6,
    carbTooltipCatcher: 5
  };

  _.defaults(opts, defaults);

  var carbTooltipBuffer = opts.carbTooltipCatcher * MS_IN_ONE;

  // catch bolus tooltips events
  opts.emitter.on('carbTooltipOn', function(t) {
    var b = _.find(opts.data, function(d) {
      var bolusT = Date.parse(d.normalTime);
      if (bolusT >= (t - carbTooltipBuffer) && (bolusT <= (t + carbTooltipBuffer))) {
        return d;
      }
    });
    if (b) {
      bolus.addTooltip(b, bolus.getTooltipCategory(b));
      opts.emitter.emit('noCarbTimestamp', true);
    }
  });
  opts.emitter.on('carbTooltipOff', function(t) {
    var b = _.find(opts.data, function(d) {
      var bolusT = Date.parse(d.normalTime);
      if (bolusT >= (t - carbTooltipBuffer) && (bolusT <= (t + carbTooltipBuffer))) {
        return d;
      }
    });
    if (b) {
      d3.select('#tooltip_' + b.id).remove();
      opts.emitter.emit('noCarbTimestamp', false);
    }
  });

  function bolus(selection) {
    selection.each(function(currentData) {
      var boluses = d3.select(this)
        .selectAll('g')
        .data(currentData, function(d) {
          return d.id;
        });
      var bolusGroups = boluses.enter()
        .append('g')
        .attr({
          'class': 'd3-bolus-group'
        });
      var top = opts.yScale.range()[0];
      // boluses where delivered = recommended
      bolusGroups.append('rect')
        .attr({
          'x': function(d) {
            return bolus.x(d);
          },
          'y': function(d) {
            return opts.yScale(d.value);
          },
          'width': opts.width,
          'height': function(d) {
            return top - opts.yScale(d.value);
          },
          'class': 'd3-rect-bolus d3-bolus',
          'id': function(d) {
            return 'bolus_' + d.id;
          }
        });
      // boluses where recommendation and delivery differ
      var bottom = top - opts.bolusStroke / 2;
      // boluses where recommended > delivered
      var underride = bolusGroups.filter(function(d) {
        if (d.recommended > d.value) {
          return d;
        }
      });
      underride.append('rect')
        .attr({
          'x': function(d) {
            return bolus.x(d);
          },
          'y': function(d) {
            return opts.yScale(d.recommended);
          },
          'width': opts.width,
          'height': function(d) {
            return opts.yScale(d.value) - opts.yScale(d.recommended);
          },
          'class': 'd3-rect-recommended d3-bolus',
          'id': function(d) {
            return 'bolus_' + d.id;
          }
        });
      // boluses where delivered > recommended
      var override = bolusGroups.filter(function(d) {
        if (d.value > d.recommended) {
          return d;
        }
      });
      override.append('rect')
        .attr({
          'x': function(d) {
            return bolus.x(d);
          },
          'y': function(d) {
            return opts.yScale(d.recommended);
          },
          'width': opts.width,
          'height': function(d) {
            return top - opts.yScale(d.recommended);
          },
          'stroke-width': opts.bolusStroke,
          'class': 'd3-rect-recommended d3-bolus',
          'id': function(d) {
            return 'bolus_' + d.id;
          }
        });
      override.append('path')
        .attr({
          'd': function(d) {
            var leftEdge = bolus.x(d) + opts.bolusStroke / 2;
            var rightEdge = leftEdge + opts.width - opts.bolusStroke;
            var bolusHeight = opts.yScale(d.value) + opts.bolusStroke / 2;
            return "M" + leftEdge + ' ' + bottom + "L" + rightEdge + ' ' + bottom + "L" + rightEdge + ' ' + bolusHeight + "L" + leftEdge + ' ' + bolusHeight + "Z";
          },
          'stroke-width': opts.bolusStroke,
          'class': 'd3-path-bolus d3-bolus',
          'id': function(d) {
            return 'bolus_' + d.id;
          }
        });
      // square- and dual-wave boluses
      var extendedBoluses = bolusGroups.filter(function(d) {
        if (d.extended) {
          return d;
        }
      });
      extendedBoluses.append('path')
        .attr({
          'd': function(d) {
            var rightEdge = bolus.x(d) + opts.width;
            var doseHeight = opts.yScale(d.extendedDelivery) + opts.bolusStroke / 2;
            var doseEnd = opts.xScale(Date.parse(d.normalTime) + d.duration) - opts.triangleSize / 2;
            return "M" + rightEdge + ' ' + doseHeight + "L" + doseEnd + ' ' + doseHeight;
          },
          'stroke-width': opts.bolusStroke,
          'class': 'd3-path-extended d3-bolus',
          'id': function(d) {
            return 'bolus_' + d.id;
          }
        });
      extendedBoluses.append('path')
        .attr({
          'd': function(d) {
            var doseHeight = opts.yScale(d.extendedDelivery) + opts.bolusStroke / 2;
            var doseEnd = opts.xScale(Date.parse(d.normalTime) + d.duration) - opts.triangleSize;
            return bolus.triangle(doseEnd, doseHeight);
          },
          'stroke-width': opts.bolusStroke,
          'class': 'd3-path-extended-triangle d3-bolus',
          'id': function(d) {
            return 'bolus_' + d.id;
          }
        });
      boluses.exit().remove();

      // tooltips
      d3.selectAll('.d3-rect-bolus, .d3-rect-recommended').on('mouseover', function() {
        var d = d3.select(this).datum();
        var t = Date.parse(d.normalTime);
        bolus.addTooltip(d, bolus.getTooltipCategory(d));
        opts.emitter.emit('bolusTooltipOn', t);
      });
      d3.selectAll('.d3-rect-bolus, .d3-rect-recommended').on('mouseout', function() {
        var d = _.clone(d3.select(this).datum());
        var t = Date.parse(d.normalTime);
        d3.select('#tooltip_' + d.id).remove();
        opts.emitter.emit('bolusTooltipOff', t);
      });
    });
  }

  bolus.getTooltipCategory = function(d) {
    var category;
    if (((d.recommended === null) || (d.recommended === d.value)) && !d.extended) {
      category = 'unspecial';
    }
    else if ((d.recommended !== d.value) && d.extended) {
      category = 'three-line';
    }
    else {
      category = 'two-line';
    }
    return category;
  };

  bolus.addTooltip = function(d, category) {
    var tooltipWidth = opts.classes[category].width;
    var tooltipHeight = opts.classes[category].height;
    d3.select('#' + 'd3-tooltip-group_bolus')
      .call(tooltips,
        d,
        // tooltipXPos
        opts.xScale(Date.parse(d.normalTime)),
        'bolus',
        // timestamp
        true,
        opts.classes[category]['tooltip'],
        tooltipWidth,
        tooltipHeight,
        // imageX
        opts.xScale(Date.parse(d.normalTime)),
        // imageY
        function() {
          return pool.height() - tooltipHeight;
        },
        // textX
        opts.xScale(Date.parse(d.normalTime)) + tooltipWidth / 2,
        // textY
        function() {
          if (category === 'unspecial') {
            return pool.height() - tooltipHeight * (9/16);
          }
          else if (category === 'two-line') {
            return pool.height() - tooltipHeight * (3/4);
          }
          else if (category === 'three-line') {
            return pool.height() - tooltipHeight * (13/16);
          }
          else {
            return pool.height() - tooltipHeight;
          }
          
        },
        // customText
        function() {
          return d.value + 'U';
        }(),
        // tspan
        function() {
          if (d.extended) {
            return ' total';
          }
        }()
      );

    if (category === 'two-line') {
      d3.select('#tooltip_' + d.id).select('.d3-tooltip-text-group').append('text')
        .attr({
          'class': 'd3-tooltip-text d3-bolus',
          'x': opts.xScale(Date.parse(d.normalTime)) + tooltipWidth / 2,
          'y': pool.height() - tooltipHeight / 3
        })
        .append('tspan')
        .text(function() {
          if (d.recommended !== d.value) {
            return d.recommended + "U recom'd";
          }
          else if (d.extended) {
            return d.extendedDelivery + 'U ' + bolus.timespan(d);
          }
        })
        .attr('class', 'd3-bolus');
    }
    else if (category === 'three-line') {
      d3.select('#tooltip_' + d.id).select('.d3-tooltip-text-group').append('text')
        .attr({
          'class': 'd3-tooltip-text d3-bolus',
          'x': opts.xScale(Date.parse(d.normalTime)) + tooltipWidth / 2,
          'y': pool.height() - tooltipHeight / 2
        })
        .append('tspan')
        .text(function() {
          return d.recommended + "U recom'd";
        })
        .attr('class', 'd3-bolus');

      d3.select('#tooltip_' + d.id).select('.d3-tooltip-text-group').append('text')
        .attr({
          'class': 'd3-tooltip-text d3-bolus',
          'x': opts.xScale(Date.parse(d.normalTime)) + tooltipWidth / 2,
          'y': pool.height() - tooltipHeight / 4
        })
        .append('tspan')
        .text(function() {
          return d.extendedDelivery + 'U ' + bolus.timespan(d);
        })
        .attr('class', 'd3-bolus');
    }
  };

  bolus.timespan = function(d) {
    var dur = Duration.parse(d.duration + 'ms');
    var hours = dur.hours();
    var minutes = dur.minutes() - (hours * 60);
    if (hours !== 0) {
      if (hours === 1) {
        switch(minutes) {
          case 0: return 'over ' + hours + ' hr';
          case 15: return 'over ' + hours + QUARTER + ' hr';
          case 20: return 'over ' + hours + THIRD + ' hr';
          case 30: return 'over ' + hours + HALF + ' hr';
          case 40: return 'over ' + hours + TWO_THIRDS + ' hr';
          case 45: return 'over ' + hours + THREE_QUARTER + ' hr';
          default: return 'over ' + hours + ' hr ' + minutes + ' min';
        }
      }
      else {
        switch(minutes) {
          case 0: return 'over ' + hours + ' hrs';
          case 15: return 'over ' + hours + QUARTER + ' hrs';
          case 20: return 'over ' + hours + THIRD + ' hrs';
          case 30: return 'over ' + hours + HALF + ' hrs';
          case 40: return 'over ' + hours + TWO_THIRDS + ' hrs';
          case 45: return 'over ' + hours + THREE_QUARTER + ' hrs';
          default: return 'over ' + hours + ' hrs ' + minutes + ' min';
        }
      }
    }
    else {
      return 'over ' + minutes + ' min';
    }
  };
  
  bolus.x = function(d) {
    return opts.xScale(Date.parse(d.normalTime)) - opts.width/2;
  };

  bolus.triangle = function(x, y) {
    var top = (x + opts.triangleSize) + ' ' + (y + opts.triangleSize/2);
    var bottom = (x + opts.triangleSize) + ' ' + (y - opts.triangleSize/2);
    var point = x + ' ' + y;
    return "M" + top + "L" + bottom + "L" + point + "Z";
  };

  return bolus;
};

},{"../lib/bows":5,"../lib/duration":6}],11:[function(require,module,exports){
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

var log = require('../lib/bows')('Carbs');

module.exports = function(pool, opts) {

  var MS_IN_ONE = 60000;

  opts = opts || {};

  var defaults = {
    xScale: pool.xScale().copy(),
    width: 12,
    tooltipHeight: 24,
    tooltipWidth: 70,
    bolusTooltipCatcher: 5,
    tooltipTimestamp: true
  };

  _.defaults(opts, defaults);

  var bolusTooltipBuffer = opts.bolusTooltipCatcher * MS_IN_ONE;

  // catch bolus tooltips events
  opts.emitter.on('bolusTooltipOn', function(t) {
    var c = _.find(opts.data, function(d) {
      var carbT = Date.parse(d.normalTime);
      if (carbT >= (t - bolusTooltipBuffer) && (carbT <= (t + bolusTooltipBuffer))) {
        return d;
      }
    });
    if (c) {
      carbs.addTooltip(c, false);
    }
  });
  opts.emitter.on('bolusTooltipOff', function(t) {
    var c = _.find(opts.data, function(d) {
      var carbT = Date.parse(d.normalTime);
      if (carbT >= (t - bolusTooltipBuffer) && (carbT <= (t + bolusTooltipBuffer))) {
        return d;
      }
    });
    if (c) {
      d3.select('#tooltip_' + c.id).remove();
    }
  });

  opts.emitter.on('noCarbTimestamp', function(bool) {
    if (bool) {
      opts.tooltipTimestamp = false;
    }
    else {
      opts.tooltipTimestamp = true;
    }
  });

  function carbs(selection) {
    selection.each(function(currentData) {
      var rects = d3.select(this)
        .selectAll('rect')
        .data(currentData, function(d) {
          return d.id;
        });
      rects.enter()
        .append('rect')
        .attr({
          'x': function(d) {
            return opts.xScale(Date.parse(d.normalTime)) - opts.width/2;
          },
          'y': 0,
          'width': opts.width,
          'height': function(d) {
            return opts.yScale(d.value);
          },
          'class': 'd3-rect-carbs d3-carbs',
          'id': function(d) {
            return 'carbs_' + d.id;
          }
        });
        rects.exit().remove();

      // tooltips
      d3.selectAll('.d3-rect-carbs').on('mouseover', function() {
        var d = d3.select(this).datum();
        var t = Date.parse(d.normalTime);
        opts.emitter.emit('carbTooltipOn', t);
        carbs.addTooltip(d, opts.tooltipTimestamp);
      });
      d3.selectAll('.d3-rect-carbs').on('mouseout', function() {
        var d = d3.select(this).datum();
        var t = Date.parse(d.normalTime);
        d3.select('#tooltip_' + d.id).remove();
        opts.emitter.emit('carbTooltipOff', t);
      });
    });
  }

  carbs.addTooltip = function(d, category) {
    d3.select('#' + 'd3-tooltip-group_carbs')
      .call(tooltips,
        d,
        // tooltipXPos
        opts.xScale(Date.parse(d.normalTime)),
        'carbs',
        // timestamp
        category,
        'tooltip_carbs.svg',
        opts.tooltipWidth,
        opts.tooltipHeight,
        // imageX
        opts.xScale(Date.parse(d.normalTime)),
        // imageY
        function() {
          if (category) {
            return opts.yScale(d.value);
          }
          else {
            return opts.yScale.range()[0];
          }
        },
        // textX
        opts.xScale(Date.parse(d.normalTime)) + opts.tooltipWidth / 2,
        // textY
        function() {
          if (category) {
            return opts.yScale(d.value) + opts.tooltipHeight / 2;
          }
          else {
            return opts.tooltipHeight / 2;
          }
        },
        // customText
        d.value + 'g');
  };

  return carbs;
};
},{"../lib/bows":5}],12:[function(require,module,exports){
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

var log = require('../lib/bows')('CBG');

module.exports = function(pool, opts) {

  opts = opts || {};

  var cbgCircles, tooltips = pool.tooltips();

  var defaults = {
    classes: {
      'low': {'boundary': 80, 'tooltip': 'cbg_tooltip_low.svg'},
      'target': {'boundary': 180, 'tooltip': 'cbg_tooltip_target.svg'},
      'high': {'boundary': 200, 'tooltip': 'cbg_tooltip_high.svg'}
    },
    xScale: pool.xScale().copy(),
    tooltipSize: 24
  };

  _.defaults(opts, defaults);

  function cbg(selection) {
    selection.each(function(currentData) {
      var allCBG = d3.select(this).selectAll('circle')
        .data(currentData, function(d) {
          return d.id;
        });
      var cbgGroups = allCBG.enter()
        .append('circle')
        .attr('class', 'd3-cbg');
      var cbgLow = cbgGroups.filter(function(d) {
        if (d.value <= opts.classes['low']['boundary']) {
          return d;
        }
      });
      var cbgTarget = cbgGroups.filter(function(d) {
        if ((d.value > opts.classes['low']['boundary']) && (d.value <= opts.classes['target']['boundary'])) {
          return d;
        }
      });
      var cbgHigh = cbgGroups.filter(function(d) {
        if (d.value > opts.classes['target']['boundary']) {
          return d;
        }
      });
      cbgLow.attr({
          'cx': function(d) {
            return opts.xScale(Date.parse(d.normalTime));
          },
          'cy': function(d) {
            return opts.yScale(d.value);
          },
          'r': 2.5,
          'id': function(d) {
            return 'cbg_' + d.id;
          }
        })
        .datum(function(d) {
          return d;
        })
        .classed({'d3-circle-cbg': true, 'd3-bg-low': true});
      cbgTarget.attr({
          'cx': function(d) {
            return opts.xScale(Date.parse(d.normalTime));
          },
          'cy': function(d) {
            return opts.yScale(d.value);
          },
          'r': 2.5,
          'id': function(d) {
            return 'cbg_' + d.id;
          }
        })
        .classed({'d3-circle-cbg': true, 'd3-bg-target': true});
      cbgHigh.attr({
          'cx': function(d) {
            return opts.xScale(Date.parse(d.normalTime));
          },
          'cy': function(d) {
            return opts.yScale(d.value);
          },
          'r': 2.5,
          'id': function(d) {
            return 'cbg_' + d.id;
          }
        })
        .classed({'d3-circle-cbg': true, 'd3-bg-high': true});
      allCBG.exit().remove();

      // tooltips
      d3.selectAll('.d3-circle-cbg').on('mouseover', function() {
        if (d3.select(this).classed('d3-bg-low')) {
          cbg.addTooltip(d3.select(this).datum(), 'low');
        }
        else if (d3.select(this).classed('d3-bg-target')) {
          cbg.addTooltip(d3.select(this).datum(), 'target');
        }
        else {
          cbg.addTooltip(d3.select(this).datum(), 'high');
        }
      });
      d3.selectAll('.d3-circle-cbg').on('mouseout', function() {
        var id = d3.select(this).attr('id').replace('cbg_', 'tooltip_');
        d3.select('#' + id).remove();
      });
    });
  }

  cbg.addTooltip = function(d, category) {
    d3.select('#' + 'd3-tooltip-group_cbg')
      .call(tooltips,
        d,
        // tooltipXPos
        opts.xScale(Date.parse(d.normalTime)),
        'cbg',
        // timestamp
        false,
        opts.classes[category]['tooltip'],
        opts.tooltipSize,
        opts.tooltipSize,
        // imageX
        opts.xScale(Date.parse(d.normalTime)),
        // imageY
        function() {
          if ((category === 'low') || (category === 'target')) {
            return opts.yScale(d.value) - opts.tooltipSize;
          }
          else {
            return opts.yScale(d.value);
          }
        },
        // textX
        opts.xScale(Date.parse(d.normalTime)) + opts.tooltipSize / 2,
        // textY
        function() {
          if ((category === 'low') || (category === 'target')) {
            return opts.yScale(d.value) - opts.tooltipSize / 2;
          }
          else {
            return opts.yScale(d.value) + opts.tooltipSize / 2;
          }
        });
  };

  return cbg;
};
},{"../lib/bows":5}],13:[function(require,module,exports){
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

var log = require('../lib/bows')('Fill');

module.exports = function(pool, opts) {

  var first = new Date(opts.endpoints[0]),
    last = new Date(opts.endpoints[1]),
    nearest, fills = [];

  first.setMinutes(first.getMinutes() + first.getTimezoneOffset());
  last.setMinutes(last.getMinutes() + last.getTimezoneOffset());

  var defaults = {
    classes: {
      0: 'darkest',
      3: 'dark',
      6: 'lighter',
      9: 'light',
      12: 'lightest',
      15: 'lighter',
      18: 'dark',
      21: 'darkest'
    },
    duration: 3,
    scale: pool.xScale().copy(),
    gutter: 0
  };

  _.defaults(opts || {}, defaults);

  function fill(selection) {
    fill.findNearest(opts.endpoints[1]);
    var otherNear = new Date(nearest);
    otherNear.setMinutes(otherNear.getMinutes() - otherNear.getTimezoneOffset());
    fills.push({
      width: opts.scale(last) - opts.scale(nearest),
      x: opts.scale(otherNear),
      fill: opts.classes[nearest.getHours()]
    });
    current = new Date(nearest);
    while (current > first) {
      var next = new Date(current);
      next.setHours(current.getHours() - opts.duration);
      var otherNext = new Date(next);
      otherNext.setMinutes(otherNext.getMinutes() - otherNext.getTimezoneOffset());
      fills.push({
        width: opts.scale(current) - opts.scale(next),
        x: opts.scale(otherNext),
        fill: opts.classes[next.getHours()]
      });
      current = next;
    }

    selection.selectAll('rect')
      .data(fills)
      .enter()
      .append('rect')
      .attr({
        'x': function(d) {
          return d.x;
        },
        'y': 0 + opts.gutter,
        'width': function(d) {
          return d.width;
        },
        'height': pool.height() - 2 * opts.gutter,
        'class': function(d) {
          return 'd3-rect-fill d3-fill-' + d.fill;
        }
      });
  }

  fill.findNearest = function(d) {
    var date = new Date(d);
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    var hourBreaks = [];
    var i = 0;
    while (i <= 24) {
      hourBreaks.push(i);
      i += opts.duration;
    }
    for(var j = 0; j < hourBreaks.length; j++) {
      var br = hourBreaks[j];
      var nextBr = hourBreaks[j + 1];
      if ((date.getHours() >= br) && (date.getHours() < nextBr)) {
        nearest = new Date(date.getFullYear(), date.getMonth(), date.getDate(), br, 0, 0);
      }
    }
  };
  
  return fill;
};
},{"../lib/bows":5}],14:[function(require,module,exports){
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

var log = require('../lib/bows')('Message');

module.exports = function(pool, opts) {

  opts = opts || {};

  var defaults = {
    xScale: pool.xScale().copy(),
    imagesBaseUrl: pool.imagesBaseUrl()
  };

  _.defaults(opts, defaults);

  function cbg(selection) {
    selection.each(function(currentData) {
      var messages = d3.select(this)
        .selectAll('image')
        .data(currentData, function(d) {
          if (d.parentMessage === '') {
            return d.id;
          }
        });
      messages.enter()
        .append('image')
        .attr({
          'xlink:href': opts.imagesBaseUrl + '/message/post_it.svg',
          'x': function(d) {
            return opts.xScale(Date.parse(d.normalTime)) - opts.size / 2;
          },
          'y': pool.height() / 2 - opts.size / 2,
          'width': opts.size,
          'height': opts.size,
          'id': function(d) {
            return 'message_' + d.id;
          }
        })
        .classed({'d3-image': true, 'd3-message': true});
      messages.exit().remove();
    });
  }

  return cbg;
};
},{"../lib/bows":5}],15:[function(require,module,exports){
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

var scales = {
  bg: function(data, pool) {
    var scale = d3.scale.linear()
      .domain([0, d3.max(data, function(d) { return d.value; })])
      .range([pool.height(), 0]);
    return scale;
  },
  carbs: function(data, pool) {
    var scale = d3.scale.linear()
      .domain([0, d3.max(data, function(d) { return d.value; })])
      .range([0, 0.475 * pool.height()]);
    return scale;
  },
  bolus: function(data, pool) {
    var scale = d3.scale.linear()
      .domain([0, d3.max(data, function(d) { return d.value; })])
      .range([pool.height(), 0.525 * pool.height()]);
    return scale;
  },
  basal: function(data, pool) {
    var scale = d3.scale.linear()
      .domain([0, d3.max(data, function(d) { return d.value; }) * 1.1])
      .rangeRound([pool.height(), 0]);
    return scale;
  }
};

module.exports = scales;
},{}],16:[function(require,module,exports){
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

var log = require('../lib/bows')('Two-Week SMBG');
 
module.exports = function(pool, opts) {

  MS_IN_HOUR = 3600000;

  MS_IN_MIN = 60 * 1000;

  opts = opts || {};

  var defaults = {
    classes: {
      'very-low': {'boundary': 60},
      'low': {'boundary': 80, 'tooltip': 'smbg_tooltip_low.svg'},
      'target': {'boundary': 180, 'tooltip': 'smbg_tooltip_target.svg'},
      'high': {'boundary': 200, 'tooltip': 'smbg_tooltip_high.svg'},
      'very-high': {'boundary': 300}
    },
    size: 16,
    rectWidth: 32,
    xScale: pool.xScale().copy(),
    imagesBaseUrl: pool.imagesBaseUrl()
  };

  _.defaults(opts, defaults);

  function smbg(selection) {
    selection.each(function(currentData) {
      var circles = d3.select(this)
        .selectAll('g')
        .data(currentData, function(d) {
          return d.id;
        });
      var circleGroups = circles.enter()
        .append('g')
        .attr('class', 'd3-smbg-time-group');
      circleGroups.append('image')
        .attr({
          'xlink:href': function(d) {
            if (d.value <= opts.classes['very-low']['boundary']) {
              return opts.imagesBaseUrl + '/smbg/very_low.svg';
            }
            else if ((d.value > opts.classes['very-low']['boundary']) && (d.value <= opts.classes['low']['boundary'])) {
              return opts.imagesBaseUrl + '/smbg/low.svg';
            }
            else if ((d.value > opts.classes['low']['boundary']) && (d.value <= opts.classes['target']['boundary'])) {
              return opts.imagesBaseUrl + '/smbg/target.svg';
            }
            else if ((d.value > opts.classes['target']['boundary']) && (d.value <= opts.classes['high']['boundary'])) {
              return opts.imagesBaseUrl + '/smbg/high.svg';
            }
            else if (d.value > opts.classes['high']['boundary']) {
              return opts.imagesBaseUrl + '/smbg/very_high.svg';
            }
          },
          'x': function(d) {
            var localTime = new Date(d.normalTime);
            var hour = localTime.getUTCHours();
            var min = localTime.getUTCMinutes();
            var sec = localTime.getUTCSeconds();
            var msec = localTime.getUTCMilliseconds();
            var t = hour * MS_IN_HOUR + min * MS_IN_MIN + sec * 1000 + msec;
            return opts.xScale(t) - opts.size / 2;
          },
          'y': function(d) {
            return pool.height() / 2 - opts.size / 2;
          },
          'width': opts.size,
          'height': opts.size,
          'id': function(d) {
            return 'smbg_time_' + d.id;
          },
          'class': function(d) {
            if (d.value <= opts.classes['low']['boundary']) {
              return 'd3-bg-low';
            }
            else if ((d.value > opts.classes['low']['boundary']) && (d.value <= opts.classes['target']['boundary'])) {
              return 'd3-bg-target';
            }
            else if (d.value > opts.classes['target']['boundary']) {
              return 'd3-bg-high';
            }
          }
        })
        .classed({'d3-image': true, 'd3-smbg-time': true, 'd3-image-smbg': true})
        .on('dblclick', function(d) {
          d3.event.stopPropagation(); // silence the click-and-drag listener
          opts.emitter.emit('selectSMBG', d.normalTime);
        });

      circleGroups.append('rect')
        .style('display', 'none')
        .attr({
          'x': function(d) {
            var localTime = new Date(d.normalTime);
            var hour = localTime.getUTCHours();
            var min = localTime.getUTCMinutes();
            var sec = localTime.getUTCSeconds();
            var msec = localTime.getUTCMilliseconds();
            var t = hour * MS_IN_HOUR + min * MS_IN_MIN + sec * 1000 + msec;
            return opts.xScale(t) - opts.rectWidth / 2;
          },
          'y': 0,
          'width': opts.size * 2,
          'height': pool.height() / 2,
          'class': 'd3-smbg-numbers d3-rect-smbg d3-smbg-time'
        });

      // NB: cannot do same display: none strategy because dominant-baseline attribute cannot be applied
      circleGroups.append('text')
        .attr({
          'x': function(d) {
            var localTime = new Date(d.normalTime);
            var hour = localTime.getUTCHours();
            var min = localTime.getUTCMinutes();
            var sec = localTime.getUTCSeconds();
            var msec = localTime.getUTCMilliseconds();
            var t = hour * MS_IN_HOUR + min * MS_IN_MIN + sec * 1000 + msec;
            return opts.xScale(t);
          },
          'y': pool.height() / 4,
          'opacity': '0',
          'class': 'd3-smbg-numbers d3-text-smbg d3-smbg-time'
        })
        .text(function(d) {
          return d.value;
        });

      circles.exit().remove();

      opts.emitter.on('numbers', function(toggle) {
        if (toggle === 'show') {
          d3.selectAll('.d3-rect-smbg')
            .style('display', 'inline');
          d3.selectAll('.d3-text-smbg')
            .transition()
            .duration(500)
            .attr('opacity', 1);
          d3.selectAll('.d3-image-smbg')
            .transition()
            .duration(500)
            .attr({
              'height': opts.size * 0.75,
              'y': pool.height() / 2
            });
        }
        else if (toggle === 'hide') {
          d3.selectAll('.d3-rect-smbg')
            .style('display', 'none');
          d3.selectAll('.d3-text-smbg')
            .transition()
            .duration(500)
            .attr('opacity', 0);
          d3.selectAll('.d3-image-smbg')
            .transition()
            .duration(500)
            .attr({
              'height': opts.size,
              'y': pool.height() / 2 - opts.size / 2
            });
        }
      });
    });
  }

  return smbg;
};
},{"../lib/bows":5}],17:[function(require,module,exports){
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

var log = require('../lib/bows')('SMBG');

module.exports = function(pool, opts) {

  opts = opts || {};

  var defaults = {
    classes: {
      'very-low': {'boundary': 60},
      'low': {'boundary': 80, 'tooltip': 'smbg_tooltip_low.svg'},
      'target': {'boundary': 180, 'tooltip': 'smbg_tooltip_target.svg'},
      'high': {'boundary': 200, 'tooltip': 'smbg_tooltip_high.svg'},
      'very-high': {'boundary': 300}
    },
    size: 16,
    xScale: pool.xScale().copy(),
    yScale: d3.scale.linear().domain([0, 400]).range([pool.height(), 0]),
    imagesBaseUrl: pool.imagesBaseUrl(),
    tooltipWidth: 70,
    tooltipHeight: 24
  };

  _.defaults(opts, defaults);

  var tooltips = pool.tooltips();

  function smbg(selection) {
    selection.each(function(currentData) {
      var circles = d3.select(this)
        .selectAll('image')
        .data(currentData, function(d) {
          return d.id;
        });
      circles.enter()
        .append('image')
        .attr({
          'xlink:href': function(d) {
            if (d.value <= opts.classes['very-low']['boundary']) {
              return opts.imagesBaseUrl + '/smbg/very_low.svg';
            }
            else if ((d.value > opts.classes['very-low']['boundary']) && (d.value <= opts.classes['low']['boundary'])) {
              return opts.imagesBaseUrl + '/smbg/low.svg';
            }
            else if ((d.value > opts.classes['low']['boundary']) && (d.value <= opts.classes['target']['boundary'])) {
              return opts.imagesBaseUrl + '/smbg/target.svg';
            }
            else if ((d.value > opts.classes['target']['boundary']) && (d.value <= opts.classes['high']['boundary'])) {
              return opts.imagesBaseUrl + '/smbg/high.svg';
            }
            else if (d.value > opts.classes['high']['boundary']) {
              return opts.imagesBaseUrl + '/smbg/very_high.svg';
            }
          },
          'x': function(d) {
            return opts.xScale(Date.parse(d.normalTime)) - opts.size / 2;
          },
          'y': function(d) {
            return opts.yScale(d.value) - opts.size / 2;
          },
          'width': opts.size,
          'height': opts.size,
          'id': function(d) {
            return 'smbg_' + d.id;
          },
          'class': function(d) {
            if (d.value <= opts.classes['low']['boundary']) {
              return 'd3-bg-low';
            }
            else if ((d.value > opts.classes['low']['boundary']) && (d.value <= opts.classes['target']['boundary'])) {
              return 'd3-bg-target';
            }
            else if (d.value > opts.classes['target']['boundary']) {
              return 'd3-bg-high';
            }
          }
        })
        .classed({'d3-image': true, 'd3-smbg': true, 'd3-image-smbg': true});
      circles.exit().remove();

      // tooltips
      d3.selectAll('.d3-image-smbg').on('mouseover', function() {
        if (d3.select(this).classed('d3-bg-low')) {
          smbg.addTooltip(d3.select(this).datum(), 'low');
        }
        else if (d3.select(this).classed('d3-bg-target')) {
          smbg.addTooltip(d3.select(this).datum(), 'target');
        }
        else {
          smbg.addTooltip(d3.select(this).datum(), 'high');
        }
      });
      d3.selectAll('.d3-image-smbg').on('mouseout', function() {
        var id = d3.select(this).attr('id').replace('smbg_', 'tooltip_');
        d3.select('#' + id).remove();
      });
    });
  }

  smbg.addTooltip = function(d, category) {
    d3.select('#' + 'd3-tooltip-group_smbg')
      .call(tooltips,
        d,
        // tooltipXPos
        opts.xScale(Date.parse(d.normalTime)),
        'smbg',
        // timestamp
        true,
        opts.classes[category]['tooltip'],
        opts.tooltipWidth,
        opts.tooltipHeight,
        // imageX
        opts.xScale(Date.parse(d.normalTime)),
        // imageY
        function() {
          if ((category === 'low') || (category === 'target')) {
            return opts.yScale(d.value) - opts.tooltipHeight;
          }
          else {
            return opts.yScale(d.value);
          }
        },
        // textX
        opts.xScale(Date.parse(d.normalTime)) + opts.tooltipWidth / 2,
        // textY
        function() {
          if ((category === 'low') || (category === 'target')) {
            return opts.yScale(d.value) - opts.tooltipHeight / 2;
          }
          else {
            return opts.yScale(d.value) + opts.tooltipHeight / 2;
          }
        });
  };

  return smbg;
};
},{"../lib/bows":5}],18:[function(require,module,exports){
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

var log = require('../lib/bows')('Tooltip');

module.exports = function(container, tooltipsGroup) {

  var id, timestampHeight = 20;

  function tooltip(selection,
    d,
    tooltipXPos,
    path,
    makeTimestamp,
    image,
    tooltipWidth,
    tooltipHeight,
    imageX, imageY,
    textX, textY,
    customText, tspan) {
    var tooltipGroup = selection.append('g')
      .attr('class', 'd3-tooltip')
      .attr('id', 'tooltip_' + d.id);

    var imagesBaseUrl = container.imagesBaseUrl();

    var currentTranslation = container.currentTranslation();

    var locationInWindow = currentTranslation + tooltipXPos;

    var translation = 0;

    var newBasalPosition;

    // moving basal tooltips at edges of display
    if (path === 'basal') {
      if (locationInWindow > container.width() - (((container.width() - container.axisGutter()) / 24) * 3)) {
        newBasalPosition = -currentTranslation + container.width() - tooltipWidth;
        if (newBasalPosition < imageX) {
          translation = newBasalPosition - imageX;
          imageX = newBasalPosition;
        }
      }
      else if (locationInWindow < (((container.width() - container.axisGutter()) / 24) * 3)) {
        newBasalPosition = -currentTranslation + container.axisGutter();
        if (newBasalPosition > imageX) {
          translation = newBasalPosition - imageX;
          imageX = newBasalPosition;
        }
      }
    }
    // and bolus, carbs, cbg, smbg
    if ((path === 'bolus') || (path === 'carbs') || (path === 'cbg') || (path === 'smbg')) {
      if (locationInWindow > container.width() - (((container.width() - container.axisGutter()) / 24) * 3)) {
        translation = -tooltipWidth;
      }
    }

    // for now (unless I can persude Sara and Alix otherwise), high cbg values are a special case
    if (image.indexOf('cbg_tooltip_high') != -1) {
      if (locationInWindow < (((container.width() - container.axisGutter()) / 24) * 3)) {
        tooltipGroup.append('image')
          .attr({
            'xlink:href': imagesBaseUrl + '/' + path + '/' + image,
            'x': imageX,
            'y': imageY,
            'width': tooltipWidth,
            'height': tooltipHeight,
            'class': 'd3-tooltip-image'
          });

        tooltipGroup.append('text')
          .attr({
            'x': textX,
            'y': textY,
            'class': 'd3-tooltip-text d3-' + path
          })
          .text(function() {
            return d.value;
          });
      }
      else {
        tooltipGroup.append('image')
          .attr({
            'xlink:href': function() {
              var str =  imagesBaseUrl + '/' + path + '/' + image;
              return str.replace('.svg', '_left.svg');
            },
            'x': imageX - tooltipWidth,
            'y': imageY,
            'width': tooltipWidth,
            'height': tooltipHeight,
            'class': 'd3-tooltip-image'
          });

        tooltipGroup.append('text')
          .attr({
            'x': textX - tooltipWidth,
            'y': textY,
            'class': 'd3-tooltip-text d3-' + path
          })
          .text(function() {
            return d.value;
          });
      }
    }
    // if the data point is three hours from the end of the data in view or less, use a left tooltip
    else if ((locationInWindow > container.width() - (((container.width() - container.axisGutter()) / 24) * 3)) &&
      (path !== 'basal')) {
      tooltipGroup.append('image')
        .attr({
          'xlink:href': function() {
            var str =  imagesBaseUrl + '/' + path + '/' + image;
            return str.replace('.svg', '_left.svg');
          },
          'x': imageX - tooltipWidth,
          'y': imageY,
          'width': tooltipWidth,
          'height': tooltipHeight,
          'class': 'd3-tooltip-image'
        });

      if (tspan) {
        tooltipGroup.append('g')
          .attr({
            'class': 'd3-tooltip-text-group',
            'transform': 'translate(' + translation + ',0)'
          })
          .append('text')
          .attr({
            'x': textX,
            'y': textY,
            'class': 'd3-tooltip-text d3-' + path
          })
          .text(function() {
            if (customText) {
              return customText;
            }
            else {
              return d.value;
            }
          });
        tooltipGroup.select('.d3-tooltip-text-group').select('text')
          .append('tspan')
          .text(' ' + tspan);
      }
      else {
        tooltipGroup.append('g')
          .attr({
            'class': 'd3-tooltip-text-group',
            'transform': 'translate(' + translation + ',0)'
          })
          .append('text')
          .attr({
            'x': textX,
            'y': textY,
            'class': 'd3-tooltip-text d3-' + path
          })
          .text(function() {
            if (customText) {
              return customText;
            }
            else {
              return d.value;
            }
          });
      }

      // adjust the values needed for the timestamp
      // TODO: really this should be refactored
      imageX = imageX - tooltipWidth;
      textX = textX - tooltipWidth;
    }
    else {
      tooltipGroup.append('image')
        .attr({
          'xlink:href': imagesBaseUrl + '/' + path + '/' + image,
          'x': imageX,
          'y': imageY,
          'width': tooltipWidth,
          'height': tooltipHeight,
          'class': 'd3-tooltip-image'
        });

      if (tspan) {
        tooltipGroup.append('g')
        .attr({
          'class': 'd3-tooltip-text-group',
          'transform': 'translate(' + translation + ',0)'
        })
        .append('text')
        .attr({
          'x': textX,
          'y': textY,
          'class': 'd3-tooltip-text d3-' + path
        })
        .text(function() {
          if (customText) {
            return customText;
          }
          else {
            return d.value;
          }
        });
        tooltipGroup.select('.d3-tooltip-text-group').select('text')
          .append('tspan')
          .text(' ' + tspan);
      }
      else {
        tooltipGroup.append('g')
          .attr({
            'class': 'd3-tooltip-text-group',
            'transform': 'translate(' + translation + ',0)'
          })
          .append('text')
          .attr({
            'x': textX,
            'y': textY,
            'class': 'd3-tooltip-text d3-' + path
          })
          .text(function() {
            if (customText) {
              return customText;
            }
            else {
              return d.value;
            }
          });
      }

    }

    if (makeTimestamp) {
      tooltip.timestamp(d, tooltipGroup, imageX, imageY, textX, textY, tooltipWidth, tooltipHeight);
    }
  }

  tooltip.timestamp = function(d, tooltipGroup, imageX, imageY, textX, textY, tooltipWidth, tooltipHeight) {
    var magic = timestampHeight * 1.2;
    var timestampY = imageY() - timestampHeight;
    var timestampTextY = timestampY + magic / 2;

    var formatTime = d3.time.format.utc("%-I:%M %p");
    var t = formatTime(new Date(d.normalTime));
    tooltipGroup.append('rect')
      .attr({
        'x': imageX,
        'y': timestampY,
        'width': tooltipWidth,
        'height': timestampHeight,
        'class': 'd3-tooltip-rect'
      });
    tooltipGroup.append('text')
      .attr({
        'x': textX,
        'y': timestampTextY,
        'baseline-shift': (magic - timestampHeight) / 2,
        'class': 'd3-tooltip-text d3-tooltip-timestamp'
      })
      .text('at ' + t);
  };

  tooltip.addGroup = function(pool, type) {
    tooltipsGroup.append('g')
      .attr('id', tooltip.id() + '_' + type)
      .attr('transform', pool.attr('transform'));
  };

  // getters & setters
  tooltip.id = function(x) {
    if (!arguments.length) return id;
    id = tooltipsGroup.attr('id');
    return tooltip;
  };

  return tooltip;
};

},{"../lib/bows":5}],19:[function(require,module,exports){
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

var log = require('./lib/bows')('Pool');
 
module.exports = function(container) {

  var data,
    id, label,
    index, weight, yPosition,
    height, minHeight, maxHeight,
    group,
    mainSVG = d3.select(container.id()),
    xScale = container.xScale().copy(),
    imagesBaseUrl = container.imagesBaseUrl(),
    yAxis = [],
    plotTypes = [];

  var defaults = {
    minHeight: 20,
    maxHeight: 300
  };

  function pool(selection, poolData) {
    // select the pool group if it already exists
    group = selection.selectAll('#' + id).data([poolData]);
    // otherwise create a new pool group
    group.enter().append('g').attr({
      'id': id,
      'transform': 'translate(0,' + yPosition + ')'
    });
    plotTypes.forEach(function(plotType) {
      if (container.dataFill[plotType.type]) {
        plotType.data = _.where(poolData, {'type': plotType.type});
        dataGroup = group.selectAll('#' + id + '_' + plotType.type).data([plotType.data]);
        dataGroup.enter().append('g').attr('id', id + '_' + plotType.type);
        dataGroup.call(plotType.plot);
      }
      else {
        pool.noDataFill(plotType);
      }
    });
    pool.drawAxis();
    pool.drawLabel();
  }

  // chainable methods
  pool.defaults = function(obj) {
    if (!arguments.length) {
      properties = defaults;
    }
    else {
      properties = obj;
    }
    this.minHeight(properties.minHeight).maxHeight(properties.maxHeight);
    this.tooltips(container.tooltips);

    return pool;
  };

  pool.pan = function(e) {
    container.latestTranslation(e.translate[0]);
    plotTypes.forEach(function(plotType) {
      d3.select('#' + id + '_' + plotType.type).attr('transform', 'translate(' + e.translate[0] + ',0)');
    });
  };

  pool.scroll = function(e) {
    container.latestTranslation(e.translate[1]);
    plotTypes.forEach(function(plotType) {
      d3.select('#' + id + '_' + plotType.type).attr('transform', 'translate(0,' + e.translate[1] + ')');
    });
  };

  // only once methods
  pool.drawLabel = _.once(function() {
    var labelGroup = d3.select('#tidelineLabels');
    labelGroup.append('text')
      .attr({
        'id': 'pool_' + id + '_label',
        'class': 'd3-pool-label',
        'transform': 'translate(' + container.axisGutter() + ',' + yPosition + ')'
      })
      .text(label);
    return pool
  });

  pool.drawAxis = _.once(function() {
    var axisGroup = d3.select('#tidelineYAxes');
    yAxis.forEach(function(axis, i) {
      axisGroup.append('g')
        .attr('class', 'd3-y d3-axis')
        .attr('id', 'pool_' + id + '_yAxis_' + i)
        .attr('transform', 'translate(' + (container.axisGutter() - 1) + ',' + yPosition + ')')
        .call(axis);
      });
    return pool;
  });

  pool.noDataFill = _.once(function(plotType) {
    d3.select('#' + id).append('g').attr('id', id + '_' + plotType.type).call(plotType.plot);
    return pool;
  });

  // getters & setters
  pool.id = function(x) {
    if (!arguments.length) return id;
    id = x;
    return pool;
  };

  pool.label = function(x) {
    if (!arguments.length) return label;
    label = x;
    return pool;
  };

  pool.index = function(x) {
    if (!arguments.length) return index;
    index = x;
    return pool;
  };

  pool.weight = function(x) {
    if (!arguments.length) return weight;
    weight = x;
    return pool;
  };

  pool.yPosition = function(x) {
    if (!arguments.length) return yPosition;
    yPosition = x;
    return pool;
  };

  pool.minHeight = function(x) {
    if (!arguments.length) return minHeight;
    minHeight = x;
    return pool;
  };

  pool.maxHeight = function(x) {
    if (!arguments.length) return maxHeight;
    maxHeight = x;
    return pool;
  };

  pool.height = function(x) {
    if (!arguments.length) return height;
    x = x * pool.weight();
    if (x <= maxHeight) {
      if (x >= minHeight) {
        height = x;
      }
      else {
        height = minHeight;
      }
    }
    else {
      height = maxHeight;
    }
    return pool;
  };

  pool.mainSVG = function(x) {
    if (!arguments.length) return mainSVG;
    mainSVG = x;
    return pool;
  };

  pool.xScale = function(f) {
    if (!arguments.length) return xScale;
    xScale = f;
    return pool;
  };

  pool.imagesBaseUrl = function(x) {
    if (!arguments.length) return imagesBaseUrl;
    imagesBaseUrl = x;
    return pool;
  };

  // TODO: replace
  pool.yAxis = function(x) {
    if (!arguments.length) return yAxis;
    yAxis.push(x);
    return pool;
  };

  pool.addPlotType = function (dataType, plotFunction, dataFillBoolean) {
    plotTypes.push({
      type: dataType,
      plot: plotFunction
    });
    if (dataFillBoolean) {
      container.dataFill[dataType] = true;
    }
    return pool;
  };

  pool.tooltips = function(x) {
    if (!arguments.length) return tooltips;
    tooltips = x;
    return tooltips;
  };

  return pool;
};
},{"./lib/bows":5}],20:[function(require,module,exports){
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

var log = require('./lib/bows')('Two Week');

module.exports = function(emitter) {
  var pool = require('./pool');

  var MS_IN_24 = 86400000;

  var bucket,
    id,
    width, minWidth,
    height, minHeight,
    imagesBaseUrl,
    statsHeight,
    axisGutter,
    nav = {},
    pools = [],
    xScale = d3.scale.linear(),
    xAxis = d3.svg.axis().scale(xScale).orient('top').outerTickSize(0).innerTickSize(15)
      .tickValues(function() {
        a = []
        for (i = 0; i < 8; i++) {
          a.push((MS_IN_24/8) * i);
        }
        return a;
      })
      .tickFormat(function(d) {
        hour = d/(MS_IN_24/24);
        if ((hour > 0) && (hour < 12)) {
          return hour + ' am';
        }
        else if (hour > 12) {
          return (hour - 12) + ' pm';
        }
        else if (hour === 0) {
          return '12 am';
        }
        else {
          return '12 pm';
        }
      }),
    yScale = d3.time.scale.utc(),
    yAxis = d3.svg.axis().scale(yScale).orient('left').outerTickSize(0).tickFormat(d3.time.format.utc("%a %-d")),
    data, allData = [], endpoints, viewEndpoints, dataStartNoon, viewIndex,
    mainGroup, scrollNav, scrollHandleTrigger = true;

  container.dataFill = {};

  var defaults = {
    bucket: $('#tidelineContainer'),
    id: 'tidelineSVG',
    minWidth: 400,
    minHeight: 400,
    imagesBaseUrl: 'img',
    nav: {
      minNavHeight: 30,
      latestTranslation: 0,
      currentTranslation: 0,
      scrollThumbRadius: 8,
      navGutter: 20
    },
    axisGutter: 60,
    statsHeight: 50
  };

  function container(selection) {
    selection.each(function(currentData) {
      // select the SVG if it already exists
      var mainSVG = selection.selectAll('svg').data([currentData]);
      // otherwise create a new SVG and enter   
      mainGroup = mainSVG.enter().append('svg').append('g').attr('id', 'tidelineMain');

      // update SVG dimenions and ID
      mainSVG.attr({
        'id': id,
        'width': width,
        'height': height
      });

      mainGroup.append('rect')
        .attr({
          'id': 'poolsInvisibleRect',
          'width': width - nav.navGutter,
          'height': height,
          'opacity': 0.0
        });

      container.poolGroup = mainGroup.append('g').attr('id', 'tidelinePools');

      // set the domain and range for the two-week x-scale
      xScale.domain([0, MS_IN_24])
        .range([container.axisGutter(), width - nav.navGutter]);

      mainGroup.append('g')
        .attr('id', 'tidelineXAxisGroup')
        .append('rect')
        .attr({
          'id': 'xAxisInvisibleRect',
          'x': container.axisGutter(),
          'height': nav.axisHeight - 2,
          'width': width - axisGutter,
          'fill': 'white'
        });

      d3.select('#tidelineXAxisGroup')
        .append('g')
        .attr('class', 'd3-x d3-axis')
        .attr('id', 'tidelineXAxis')
        .attr('transform', 'translate(0,' + (nav.axisHeight - 1) + ')')
        .call(xAxis);

      d3.selectAll('#tidelineXAxis g.tick text').style('text-anchor', 'start').attr('transform', 'translate(5,15)');

      // set the domain and range for the main two-week y-scale
      yScale.domain(viewEndpoints)
        .range([nav.axisHeight, height - statsHeight])
        .ticks(d3.time.day.utc, 1);

      container.navString(yScale.domain());

      mainGroup.append('g')
        .attr('id', 'tidelineYAxisGroup')
        .append('rect')
        .attr({
          'id': 'yAxisInvisibleRect',
          'x': 0,
          'height': height,
          'width': axisGutter,
          'fill': 'white'
        });

      d3.select('#tidelineYAxisGroup')
        .append('g')
        .attr('class', 'd3-y d3-axis d3-day-axis')
        .attr('id', 'tidelineYAxis')
        .attr('transform', 'translate(' + (axisGutter - 1) + ',0)')
        .call(yAxis);

      container.daysGroup = container.poolGroup.append('g').attr('id', 'daysGroup');

      statsGroup = container.poolGroup.append('g').attr('id', 'poolStats')
        .attr('transform', 'translate(' + container.axisGutter() + ',' + (height - container.statsHeight()) + ')')
        .append('rect')
        .attr({
          'x': 0,
          'y': 0,
          'width': width - container.axisGutter() - container.navGutter(),
          'height': container.statsHeight(),
          'fill': 'white'
        });

      scrollNav = mainGroup.append('g')
        .attr('class', 'y scroll')
        .attr('id', 'tidelineScrollNav');

      nav.scrollScale = d3.time.scale.utc()
        .domain([dataStartNoon, dataEndNoon])
        .range([nav.axisHeight + nav.scrollThumbRadius, height - statsHeight - nav.scrollThumbRadius]);
    });
  }

  // non-chainable methods
  container.newPool = function() {
    var p = new pool(container);
    pools.push(p);
    return p;
  };

  container.arrangePools = function() {
    // 14 days = 2 weeks
    // TODO: eventually factor this out so that this view could be generalized to another time period
    var numPools = 14;
    // all two-week pools have a weight of 1.0
    var weight = 1.0;
    var cumWeight = weight * numPools;
    var totalPoolsHeight = 
      container.height() - container.axisHeight() - container.statsHeight();
    var poolScaleHeight = totalPoolsHeight/cumWeight;
    var actualPoolsHeight = 0;
    pools.forEach(function(pool) {
      pool.height(poolScaleHeight);
      actualPoolsHeight += pool.height();
      poolScaleHeight = pool.height();
    });
    var currentYPosition = container.height() - container.statsHeight() - poolScaleHeight;
    var nextBatchYPosition = currentYPosition + poolScaleHeight;
    for (var i = viewIndex; i < pools.length; i++) {
      pool = pools[i];
      pool.yPosition(currentYPosition);
      currentYPosition -= pool.height();
    }
    currentYPosition = nextBatchYPosition;
    for (var i = viewIndex - 1; i >= 0; i--) {
      pool = pools[i];
      pool.yPosition(currentYPosition);
      currentYPosition += pool.height();
    }
  };

  container.destroy = function() {
    $('#' + this.id()).remove();
    emitter.removeAllListeners('numbers');
  };

  container.navString = function(a) {
    var monthDay = d3.time.format.utc("%B %-d");
    var navString = monthDay(new Date(a[0].setUTCDate(a[0].getUTCDate() + 1))) + ' - ' + monthDay(a[1]);
    emitter.emit('navigated', navString);
  };

  // chainable methods
  container.defaults = function(obj) {
    if (!arguments.length) {
      properties = defaults;
    }
    else {
      properties = obj;
    }
    this.bucket(properties.bucket);
    this.id(properties.id);
    this.minWidth(properties.minWidth).width(properties.width);
    this.minNavHeight(properties.nav.minNavHeight).axisHeight(properties.nav.minNavHeight)
      .scrollThumbRadius(properties.nav.scrollThumbRadius)
      .navGutter(properties.nav.navGutter);
    this.minHeight(properties.minHeight).height(properties.minHeight).statsHeight(properties.statsHeight);
    this.latestTranslation(properties.nav.latestTranslation)
      .currentTranslation(properties.nav.currentTranslation);
    this.axisGutter(properties.axisGutter);
    this.imagesBaseUrl(properties.imagesBaseUrl);

    return container;
  };

  container.setNav = function() {
    var maxTranslation = -yScale(dataStartNoon) + yScale.range()[1] - (height - nav.axisHeight - statsHeight);
    var minTranslation = -yScale(dataEndNoon) + yScale.range()[1] - (height - nav.axisHeight - statsHeight);
    nav.scroll = d3.behavior.zoom()
      .scaleExtent([1, 1])
      .y(yScale)
      .on('zoom', function() {
        var e = d3.event;
        if (e.translate[1] < minTranslation) {
          e.translate[1] = minTranslation;
        }
        else if (e.translate[1] > maxTranslation) {
          e.translate[1] = maxTranslation;
        }
        nav.scroll.translate([0, e.translate[1]]);
        d3.select('.d3-y.d3-axis').call(yAxis);
        for (var i = 0; i < pools.length; i++) {
          pools[i].scroll(e);
        }
        container.navString(yScale.domain());
        if (scrollHandleTrigger) {
          d3.select('#scrollThumb').transition().ease('linear').attr('y', function(d) {
            d.y = nav.scrollScale(yScale.domain()[0]);
            return d.y - nav.scrollThumbRadius;
          });       
        }
      })
      .on('zoomend', function() {
        container.currentTranslation(nav.latestTranslation);
        scrollHandleTrigger = true;
      });

    mainGroup.call(nav.scroll);

    return container;
  };

  container.setScrollNav = function() {
    var translationAdjustment = yScale.range()[1] - (height - nav.axisHeight - statsHeight);
    var xPos = nav.navGutter / 2;

    scrollNav.append('rect')
    .attr({
      'x': 0,
      'y': nav.scrollScale(dataStartNoon) - nav.scrollThumbRadius,
      'width': nav.navGutter,
      'height': height - nav.axisHeight,
      'fill': 'white',
      'id': 'scrollNavInvisibleRect'
    });

    scrollNav.attr('transform', 'translate(' + (width - nav.navGutter) + ',0)')
      .append('line')
      .attr({
        'x1': xPos,
        'x2': xPos,
        'y1': nav.scrollScale(dataStartNoon) - nav.scrollThumbRadius,
        'y2': nav.scrollScale(dataEndNoon) + nav.scrollThumbRadius
      });

    var dyLowest = nav.scrollScale.range()[1];
    var dyHighest = nav.scrollScale.range()[0];

    var drag = d3.behavior.drag()
      .origin(function(d) {
        return d;
      })
      .on('dragstart', function() {
        d3.event.sourceEvent.stopPropagation(); // silence the click-and-drag listener
      })
      .on('drag', function(d) {
        d.y += d3.event.dy;
        if (d.y > dyLowest) {
          d.y = dyLowest;
        }
        else if (d.y < dyHighest) {
          d.y = dyHighest;
        }
        d3.select(this).attr('y', function(d) { return d.y - nav.scrollThumbRadius; });
        var date = nav.scrollScale.invert(d.y);
        nav.currentTranslation -= yScale(date) - translationAdjustment;
        scrollHandleTrigger = false;
        nav.scroll.translate([0, nav.currentTranslation]);
        nav.scroll.event(mainGroup);
      });

    scrollNav.selectAll('image')
      .data([{'x': 0, 'y': nav.scrollScale(viewEndpoints[0])}])
      .enter()
      .append('image')
      .attr({
        'xlink:href': imagesBaseUrl + '/ux/scroll_thumb.svg',
        'x': xPos - nav.scrollThumbRadius,
        'y': function(d) { return d.y - nav.scrollThumbRadius; },
        'width': 2 * nav.scrollThumbRadius,
        'height': 2 * nav.scrollThumbRadius,
        'id': 'scrollThumb'
      })
      .call(drag);

    return container;
  };

  // getters and setters
  container.bucket = function(x) {
    if (!arguments.length) return bucket;
    bucket = x;
    return container;
  };

  container.id = function(x) {
    if (!arguments.length) return id;
    id = x;
    return container;
  };

  container.width = function(x) {
    if (!arguments.length) return width;
    if (x >= minWidth) {
      if (x > bucket.width()) {
        width = bucket.width();
      }
      else {
        width = x;
      }
    }
    else {
      width = minWidth;
    }
    return container;
  };

  container.minWidth = function(x) {
    if (!arguments.length) return minWidth;
    minWidth = x;
    return container;
  };

  container.height = function(x) {
    if (!arguments.length) return height;
    var totalHeight = x + container.axisHeight();
    if (nav.scrollNav) {
      totalHeight += container.scrollNavHeight();
    }
    if (totalHeight >= minHeight) {
      if (totalHeight > bucket.height()) {
        height = bucket.height() - container.axisHeight();
        if (nav.scrollNav) {
          height -= container.scrollNavHeight();
        }
      }
      else {
        height = x; 
      }
    }
    else {
      height = minHeight;
    }
    return container;
  };

  container.minHeight = function(x) {
    if (!arguments.length) return height;
    minHeight = x;
    return container;
  };

  container.imagesBaseUrl = function(x) {
    if (!arguments.length) return imagesBaseUrl;
    imagesBaseUrl = x;
    return container;
  };

  container.statsHeight = function(x) {
    if (!arguments.length) return statsHeight;
    statsHeight = x;
    return container;
  };

  // nav getters and setters
  container.axisHeight = function(x) {
    if (!arguments.length) return nav.axisHeight;
    if (x >= nav.minNavHeight) {
      nav.axisHeight = x;
    }
    else {
      nav.axisHeight = nav.minNavHeight;
    }
    return container;
  };

  container.minNavHeight = function(x) {
    if (!arguments.length) return nav.minNavHeight;
    nav.minNavHeight = x;
    return container;
  };

  container.scrollThumbRadius = function(x) {
    if (!arguments.length) return nav.scrollThumbRadius;
    nav.scrollThumbRadius = x;
    return container
  };

  container.navGutter = function(x) {
    if (!arguments.length) return nav.navGutter;
    nav.navGutter = x;
    return container;
  };

  container.scroll = function(f) {
    if (!arguments.length) return nav.scroll;
    nav.scroll = f;
    return container;
  };

  container.latestTranslation = function(x) {
    if (!arguments.length) return nav.latestTranslation;
    nav.latestTranslation = x;
    return container;
  };

  container.currentTranslation = function(x) {
    if (!arguments.length) return nav.currentTranslation;
    nav.currentTranslation = x;
    return container;
  };

  // pools getter and setter
  container.pools = function(a) {
    if (!arguments.length) return pools;
    pools = a;
    return container;
  };

  container.axisGutter = function(x) {
    if (!arguments.length) return axisGutter;
    axisGutter = x;
    return container;
  };

  // scales and axes getters and setters
  container.xScale = function(f) {
    if (!arguments.length) return xScale;
    xScale = f;
    return container;
  };

  container.xAxis = function(f) {
    if (!arguments.length) return xAxis;
    xAxis = f;
    return container;
  };

  container.viewEndpoints = function(a) {
    if (!arguments.length) return viewEndpoints;
    viewEndpoints = a;
    return container;
  };

  // data getters and setters
  container.data = function(a, viewEndDate) {
    if (!arguments.length) return data;
    data = a;

    var first = new Date(a[0].normalTime);
    var last = new Date(a[a.length - 1].normalTime);
    
    endpoints = [first, last];
    container.endpoints = endpoints;

    function createDay(d) {
      return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0);
    }
    var days = [];
    var firstDay = createDay(new Date(container.endpoints[0]));
    var lastDay = createDay(new Date(container.endpoints[1]));
    days.push(firstDay.toISOString().slice(0,10));
    var currentDay = firstDay;
    while (currentDay < lastDay) {
      var newDay = new Date(currentDay);
      newDay.setUTCDate(newDay.getUTCDate() + 1);
      days.push(newDay.toISOString().slice(0,10));
      currentDay = newDay;
    }

    this.days = days.reverse();

    dataStartNoon = new Date(first);
    dataStartNoon.setUTCHours(12);
    dataStartNoon.setUTCMinutes(0);
    dataStartNoon.setUTCSeconds(0);
    dataStartNoon.setUTCDate(dataStartNoon.getUTCDate() - 1);

    var noon = '12:00:00Z';

    dataEndNoon = new Date(last);
    dataEndNoon.setUTCDate(dataEndNoon.getUTCDate() - 14);
    dataEndNoon = new Date(dataEndNoon.toISOString().slice(0,11) + noon);

    if (!viewEndDate) {
      viewEndDate = new Date(days[0]);
    } else {
      viewEndDate = new Date(viewEndDate);
    }

    var viewBeginning = new Date(viewEndDate);
    viewBeginning.setUTCDate(viewBeginning.getUTCDate() - 14);
    viewEndpoints = [new Date(viewBeginning.toISOString().slice(0,11) + noon), new Date(viewEndDate.toISOString().slice(0,11) + noon)];
    viewIndex = days.indexOf(viewEndDate.toISOString().slice(0,10));

    container.dataPerDay = [];

    this.days.forEach(function(day) {
      var thisDay = {
        'year': day.slice(0,4),
        'month': day.slice(5,7),
        'day': day.slice(8,10)
      };
      container.dataPerDay.push(_.filter(data, function(d) {
        var date = new Date(d.normalTime);
        if ((date.getUTCFullYear() === parseInt(thisDay.year))
          && (date.getUTCMonth() + 1 === parseInt(thisDay.month))
          && (date.getUTCDate() === parseInt(thisDay.day))) {
          return d;
        }
      }));
    });
    
    return container;
  };

  return container;
};
},{"./lib/bows":5,"./pool":19}],21:[function(require,module,exports){
//     Underscore.js 1.6.0
//     http://underscorejs.org
//     (c) 2009-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    concat           = ArrayProto.concat,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.6.0';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return obj;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, length = obj.length; i < length; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      var keys = _.keys(obj);
      for (var i = 0, length = keys.length; i < length; i++) {
        if (iterator.call(context, obj[keys[i]], keys[i], obj) === breaker) return;
      }
    }
    return obj;
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results.push(iterator.call(context, value, index, list));
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, predicate, context) {
    var result;
    any(obj, function(value, index, list) {
      if (predicate.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(predicate, context);
    each(obj, function(value, index, list) {
      if (predicate.call(context, value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, function(value, index, list) {
      return !predicate.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, predicate, context) {
    predicate || (predicate = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(predicate, context);
    each(obj, function(value, index, list) {
      if (!(result = result && predicate.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, predicate, context) {
    predicate || (predicate = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(predicate, context);
    each(obj, function(value, index, list) {
      if (result || (result = predicate.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matches(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matches(attrs));
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See [WebKit Bug 80797](https://bugs.webkit.org/show_bug.cgi?id=80797)
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    var result = -Infinity, lastComputed = -Infinity;
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      if (computed > lastComputed) {
        result = value;
        lastComputed = computed;
      }
    });
    return result;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    var result = Infinity, lastComputed = Infinity;
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      if (computed < lastComputed) {
        result = value;
        lastComputed = computed;
      }
    });
    return result;
  };

  // Shuffle an array, using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // Sample **n** random values from a collection.
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (obj.length !== +obj.length) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return value;
    return _.property(value);
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, iterator, context) {
    iterator = lookupIterator(iterator);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, iterator, context) {
      var result = {};
      iterator = lookupIterator(iterator);
      each(obj, function(value, index) {
        var key = iterator.call(context, value, index, obj);
        behavior(result, key, value);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, key, value) {
    _.has(result, key) ? result[key].push(value) : result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, key, value) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, key) {
    _.has(result, key) ? result[key]++ : result[key] = 1;
  });

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n == null) || guard) return array[0];
    if (n < 0) return [];
    return slice.call(array, 0, n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n == null) || guard) return array[array.length - 1];
    return slice.call(array, Math.max(array.length - n, 0));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    if (shallow && _.every(input, _.isArray)) {
      return concat.apply(output, input);
    }
    each(input, function(value) {
      if (_.isArray(value) || _.isArguments(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Split an array into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = function(array, predicate) {
    var pass = [], fail = [];
    each(array, function(elem) {
      (predicate(elem) ? pass : fail).push(elem);
    });
    return [pass, fail];
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(_.flatten(arguments, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.contains(other, item);
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var length = _.max(_.pluck(arguments, 'length').concat(0));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(arguments, '' + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, length = list.length; i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, length = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, length + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < length; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(length);

    while(idx < length) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    var args, bound;
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      ctor.prototype = null;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder, allowing any combination of arguments to be pre-filled.
  _.partial = function(func) {
    var boundArgs = slice.call(arguments, 1);
    return function() {
      var position = 0;
      var args = boundArgs.slice();
      for (var i = 0, length = args.length; i < length; i++) {
        if (args[i] === _) args[i] = arguments[position++];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return func.apply(this, args);
    };
  };

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) throw new Error('bindAll must be passed function names');
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    options || (options = {});
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      context = args = null;
    };
    return function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
        context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;
      if (last < wait) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) {
        timeout = setTimeout(later, wait);
      }
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = new Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = new Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] === void 0) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Objects with different constructors are not equivalent, but `Object`s
    // from different frames are.
    var aCtor = a.constructor, bCtor = b.constructor;
    if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                             _.isFunction(bCtor) && (bCtor instanceof bCtor))
                        && ('constructor' in a && 'constructor' in b)) {
      return false;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  _.constant = function(value) {
    return function () {
      return value;
    };
  };

  _.property = function(key) {
    return function(obj) {
      return obj[key];
    };
  };

  // Returns a predicate for checking whether an object has a given set of `key:value` pairs.
  _.matches = function(attrs) {
    return function(obj) {
      if (obj === attrs) return true; //avoid comparing an object to itself.
      for (var key in attrs) {
        if (attrs[key] !== obj[key])
          return false;
      }
      return true;
    }
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(Math.max(0, n));
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function() { return new Date().getTime(); };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return void 0;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}).call(this);

},{}],22:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        throw TypeError('Uncaught, unspecified "error" event.');
      }
      return false;
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      console.trace();
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}]},{},[1])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1ZvbHVtZXMvVGlkZXBvb2wvdGlkZWxpbmUvZXhhbXBsZS9leGFtcGxlLmpzIiwiL1ZvbHVtZXMvVGlkZXBvb2wvdGlkZWxpbmUvZXhhbXBsZS93YXRzb24uanMiLCIvVm9sdW1lcy9UaWRlcG9vbC90aWRlbGluZS9qcy9kYXRhL2Jhc2FsdXRpbC5qcyIsIi9Wb2x1bWVzL1RpZGVwb29sL3RpZGVsaW5lL2pzL2luZGV4LmpzIiwiL1ZvbHVtZXMvVGlkZXBvb2wvdGlkZWxpbmUvanMvbGliL2Jvd3MuanMiLCIvVm9sdW1lcy9UaWRlcG9vbC90aWRlbGluZS9qcy9saWIvZHVyYXRpb24uanMiLCIvVm9sdW1lcy9UaWRlcG9vbC90aWRlbGluZS9qcy9saWIvdW5kZXJzY29yZS5qcyIsIi9Wb2x1bWVzL1RpZGVwb29sL3RpZGVsaW5lL2pzL29uZS1kYXkuanMiLCIvVm9sdW1lcy9UaWRlcG9vbC90aWRlbGluZS9qcy9wbG90L2Jhc2FsLmpzIiwiL1ZvbHVtZXMvVGlkZXBvb2wvdGlkZWxpbmUvanMvcGxvdC9ib2x1cy5qcyIsIi9Wb2x1bWVzL1RpZGVwb29sL3RpZGVsaW5lL2pzL3Bsb3QvY2FyYnMuanMiLCIvVm9sdW1lcy9UaWRlcG9vbC90aWRlbGluZS9qcy9wbG90L2NiZy5qcyIsIi9Wb2x1bWVzL1RpZGVwb29sL3RpZGVsaW5lL2pzL3Bsb3QvZmlsbC5qcyIsIi9Wb2x1bWVzL1RpZGVwb29sL3RpZGVsaW5lL2pzL3Bsb3QvbWVzc2FnZS5qcyIsIi9Wb2x1bWVzL1RpZGVwb29sL3RpZGVsaW5lL2pzL3Bsb3Qvc2NhbGVzLmpzIiwiL1ZvbHVtZXMvVGlkZXBvb2wvdGlkZWxpbmUvanMvcGxvdC9zbWJnLXRpbWUuanMiLCIvVm9sdW1lcy9UaWRlcG9vbC90aWRlbGluZS9qcy9wbG90L3NtYmcuanMiLCIvVm9sdW1lcy9UaWRlcG9vbC90aWRlbGluZS9qcy9wbG90L3Rvb2x0aXAuanMiLCIvVm9sdW1lcy9UaWRlcG9vbC90aWRlbGluZS9qcy9wb29sLmpzIiwiL1ZvbHVtZXMvVGlkZXBvb2wvdGlkZWxpbmUvanMvdHdvLXdlZWsuanMiLCIvVm9sdW1lcy9UaWRlcG9vbC90aWRlbGluZS9ub2RlX21vZHVsZXMvdW5kZXJzY29yZS91bmRlcnNjb3JlLmpzIiwiL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2V2ZW50cy9ldmVudHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDemFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNockJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1YUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25YQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25TQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNya0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKiBcbiAqID09IEJTRDIgTElDRU5TRSA9PVxuICogQ29weXJpZ2h0IChjKSAyMDE0LCBUaWRlcG9vbCBQcm9qZWN0XG4gKiBcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOyB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5IGl0IHVuZGVyXG4gKiB0aGUgdGVybXMgb2YgdGhlIGFzc29jaWF0ZWQgTGljZW5zZSwgd2hpY2ggaXMgaWRlbnRpY2FsIHRvIHRoZSBCU0QgMi1DbGF1c2VcbiAqIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5IHRoZSBPcGVuIFNvdXJjZSBJbml0aWF0aXZlIGF0IG9wZW5zb3VyY2Uub3JnLlxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCwgYnV0IFdJVEhPVVRcbiAqIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTXG4gKiBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuIFNlZSB0aGUgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICogXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtOyBpZlxuICogbm90LCB5b3UgY2FuIG9idGFpbiBvbmUgZnJvbSBUaWRlcG9vbCBQcm9qZWN0IGF0IHRpZGVwb29sLm9yZy5cbiAqID09IEJTRDIgTElDRU5TRSA9PVxuICovXG5cbnZhciB0aWRlbGluZSA9IHJlcXVpcmUoJy4uL2pzJyk7XG52YXIgbG9nID0gd2luZG93LmJvd3MoJ0V4YW1wbGUnKTtcblxuLy8gdGhpbmdzIGNvbW1vbiB0byBvbmUtZGF5IGFuZCB0d28td2VlayB2aWV3c1xuLy8gY29tbW9uIGV2ZW50IGVtaXR0ZXJcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XG52YXIgZW1pdHRlciA9IG5ldyBFdmVudEVtaXR0ZXI7XG5lbWl0dGVyLnNldE1heExpc3RlbmVycygxMDApO1xuZW1pdHRlci5vbignbmF2aWdhdGVkJywgZnVuY3Rpb24obmF2U3RyaW5nKSB7XG4gICQoJyN0aWRlbGluZU5hdlN0cmluZycpLmh0bWwobmF2U3RyaW5nKTtcbn0pO1xuXG4vLyBjb21tb24gcG9vbCBtb2R1bGVzXG52YXIgZmlsbCA9IHRpZGVsaW5lLnBsb3QuZmlsbDtcbnZhciBzY2FsZXMgPSB0aWRlbGluZS5wbG90LnNjYWxlcztcbnZhciBCYXNhbFV0aWwgPSB0aWRlbGluZS5kYXRhLkJhc2FsVXRpbDtcblxudmFyIGVsID0gJyN0aWRlbGluZUNvbnRhaW5lcic7XG52YXIgaW1hZ2VzQmFzZVVybCA9ICcuLi9pbWcnO1xuXG4vLyBkZWFyIG9sZCBXYXRzb25cbnZhciB3YXRzb24gPSByZXF1aXJlKCcuL3dhdHNvbicpO1xuXG4vLyBzZXQgdXAgb25lLWRheSBhbmQgdHdvLXdlZWsgdmlld1xudmFyIGNyZWF0ZU5ld09uZURheUNoYXJ0ID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBuZXcgb25lRGF5Q2hhcnQoZWwsIHtpbWFnZXNCYXNlVXJsOiBpbWFnZXNCYXNlVXJsfSk7XG59O1xudmFyIGNyZWF0ZU5ld1R3b1dlZWtDaGFydCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gbmV3IHR3b1dlZWtDaGFydChlbCwge2ltYWdlc0Jhc2VVcmw6IGltYWdlc0Jhc2VVcmx9KTtcbn07XG52YXIgb25lRGF5ID0gY3JlYXRlTmV3T25lRGF5Q2hhcnQoKTtcbnZhciB0d29XZWVrID0gY3JlYXRlTmV3VHdvV2Vla0NoYXJ0KCk7XG5cblxuLy8gTm90ZSB0byBOaWNvOiB0aGlzIChhbGwgdGhlIGNvZGUgd2l0aGluIGQzLmpzb24oKSBiZWxvdykgaXMgYWxsIHJvdWdoLWFuZC1yZWFkeS4uLlxuLy8gb2J2aW91c2x5IGEgbG90IG9mIGl0IGNvdWxkIGJlIHJlZmFjdG9yZWRcbi8vIGJ1dCBpdCBzaG91bGQgYmUgYSBkZWNlbnQgZGVtbyBvZiBob3cgdGhlIGludGVyYWN0aW9uIGJldHdlZW4gb25lLWRheSBhbmQgdHdvLXdlZWsgdmlld3MgY291bGQgd29ya1xuLy8gdGhlIFRPRE8gaXNzdWUgbm90ZWQgYXBwZWFycyB0byBiZSBhIHRob3JueSBvbmUsIHNvIEknZCBsaWtlIHRvIGF2b2lkIGl0IGZvciBub3cgc2luY2UgdGhlcmUncyBzbyBtdWNoIGVsc2UgdG8gZG9cblxuLy8gbG9hZCBkYXRhIGFuZCBkcmF3IGNoYXJ0c1xuZDMuanNvbignZGV2aWNlLWRhdGEuanNvbicsIGZ1bmN0aW9uKGRhdGEpIHtcbiAgbG9nKCdEYXRhIGxvYWRlZC4nKTtcbiAgLy8gbXVuZ2UgYmFzYWwgc2VnbWVudHNcbiAgdmFyIHZpelJlYWR5QmFzYWxzID0gbmV3IEJhc2FsVXRpbChkYXRhKTtcbiAgZGF0YSA9IF8ucmVqZWN0KGRhdGEsIGZ1bmN0aW9uKGQpIHtcbiAgICByZXR1cm4gZC50eXBlID09PSAnYmFzYWwtcmF0ZS1zZWdtZW50JztcbiAgfSk7XG4gIGRhdGEgPSBkYXRhLmNvbmNhdCh2aXpSZWFkeUJhc2Fscy5hY3R1YWwuY29uY2F0KHZpelJlYWR5QmFzYWxzLnVuZGVsaXZlcmVkKSk7XG4gIC8vIFdhdHNvbiB0aGUgZGF0YVxuICBkYXRhID0gd2F0c29uLm5vcm1hbGl6ZShkYXRhKTtcbiAgLy8gZW5zdXJlIHRoZSBkYXRhIGlzIHByb3Blcmx5IHNvcnRlZFxuICBkYXRhID0gXy5zb3J0QnkoZGF0YSwgZnVuY3Rpb24oZCkge1xuICAgIHJldHVybiBuZXcgRGF0ZShkLm5vcm1hbFRpbWUpLnZhbHVlT2YoKTtcbiAgfSk7XG5cbiAgbG9nKCdJbml0aWFsIG9uZS1kYXkgdmlldy4nKTtcbiAgb25lRGF5LmluaXRpYWxpemUoZGF0YSkubG9jYXRlKCcyMDE0LTAzLTA2VDEyOjAwOjAwWicpO1xuICAvLyBhdHRhY2ggY2xpY2sgaGFuZGxlcnMgdG8gc2V0IHVwIHByb2dyYW1tYXRpYyBwYW5cbiAgJCgnI3RpZGVsaW5lTmF2Rm9yd2FyZCcpLm9uKCdjbGljaycsIG9uZURheS5wYW5Gb3J3YXJkKTtcbiAgJCgnI3RpZGVsaW5lTmF2QmFjaycpLm9uKCdjbGljaycsIG9uZURheS5wYW5CYWNrKTtcblxuICAkKCcjdHdvV2Vla1ZpZXcnKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICBsb2coJ05hdmlnYXRlZCB0byB0d28td2VlayB2aWV3IGZyb20gbmF2IGJhci4nKTtcbiAgICB2YXIgZGF0ZSA9IG9uZURheS5nZXRDdXJyZW50RGF5KCk7XG4gICAgLy8gcmVtb3ZlIGNsaWNrIGhhbmRsZXJzIGZvciBwcm9ncmFtbWF0aWMgcGFuXG4gICAgJCgnI3RpZGVsaW5lTmF2Rm9yd2FyZCcpLm9mZignY2xpY2snKTtcbiAgICAkKCcjdGlkZWxpbmVOYXZCYWNrJykub2ZmKCdjbGljaycpO1xuICAgIG9uZURheS5zdG9wTGlzdGVuaW5nKCkuZGVzdHJveSgpO1xuICAgICQodGhpcykucGFyZW50KCkuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICQoJyNvbmVEYXlWaWV3JykucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICQoJy5vbmUtZGF5JykuY3NzKCd2aXNpYmlsaXR5JywgJ2hpZGRlbicpO1xuICAgICQoJy50d28td2VlaycpLmNzcygndmlzaWJpbGl0eScsICd2aXNpYmxlJyk7XG4gICAgLy8gVE9ETzogdGhpcyBzaG91bGRuJ3QgYmUgbmVjZXNzYXJ5LCBidXQgSSd2ZSBzY3Jld2VkIHNvbWV0aGluZyB1cCB3aXRoIHRoZSBnbG9iYWwgdHdvLXdlZWsuanMgdmFyaWFibGVzXG4gICAgLy8gc3VjaCB0aGF0IGl0cyBuZWNlc3NhcnkgdG8gY3JlYXRlIGEgbmV3IHR3b1dlZWsgb2JqZWN0IGV2ZXJ5IHRpbWUgeW91IHdhbnQgdG8gcmVyZW5kZXJcbiAgICB0d29XZWVrID0gY3JlYXRlTmV3VHdvV2Vla0NoYXJ0KCk7XG4gICAgLy8gdGFrZXMgdXNlciB0byB0d28td2VlayB2aWV3IHdpdGggZGF5IHVzZXIgd2FzIHZpZXdpbmcgaW4gb25lLWRheSB2aWV3IGF0IHRoZSBlbmQgb2YgdGhlIHR3by13ZWVrIHZpZXcgd2luZG93XG4gICAgdHdvV2Vlay5pbml0aWFsaXplKGRhdGEsIGRhdGUpO1xuICB9KTtcblxuICAkKCcjb25lRGF5VmlldycpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgIGxvZygnTmF2aWdhdGVkIHRvIG9uZS1kYXkgdmlldyBmcm9tIG5hdiBiYXIuJyk7XG4gICAgdHdvV2Vlay5kZXN0cm95KCk7XG4gICAgJCh0aGlzKS5wYXJlbnQoKS5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgJCgnI3R3b1dlZWtWaWV3JykucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICQoJyNvbmVEYXlNb3N0UmVjZW50JykucGFyZW50KCkuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICQoJy5vbmUtZGF5JykuY3NzKCd2aXNpYmlsaXR5JywgJ3Zpc2libGUnKTtcbiAgICAkKCcudHdvLXdlZWsnKS5jc3MoJ3Zpc2liaWxpdHknLCAnaGlkZGVuJyk7XG4gICAgLy8gVE9ETzogdGhpcyBzaG91bGRuJ3QgYmUgbmVjZXNzYXJ5LCBidXQgSSd2ZSBzY3Jld2VkIHNvbWV0aGluZyB1cCB3aXRoIHRoZSBnbG9iYWwgb25lLWRheS5qcyB2YXJpYWJsZXNcbiAgICAvLyBzdWNoIHRoYXQgaXRzIG5lY2Vzc2FyeSB0byBjcmVhdGUgYSBuZXcgb25lRGF5IG9iamVjdCBldmVyeSB0aW1lIHlvdSB3YW50IHRvIHJlcmVuZGVyXG4gICAgb25lRGF5ID0gY3JlYXRlTmV3T25lRGF5Q2hhcnQoKTtcbiAgICAvLyB0YWtlcyB1c2VyIHRvIG9uZS1kYXkgdmlldyBvZiBtb3N0IHJlY2VudCBkYXRhXG4gICAgb25lRGF5LmluaXRpYWxpemUoZGF0YSkubG9jYXRlKCk7XG4gICAgLy8gYXR0YWNoIGNsaWNrIGhhbmRsZXJzIHRvIHNldCB1cCBwcm9ncmFtbWF0aWMgcGFuXG4gICAgJCgnI3RpZGVsaW5lTmF2Rm9yd2FyZCcpLm9uKCdjbGljaycsIG9uZURheS5wYW5Gb3J3YXJkKTtcbiAgICAkKCcjdGlkZWxpbmVOYXZCYWNrJykub24oJ2NsaWNrJywgb25lRGF5LnBhbkJhY2spO1xuICB9KTtcblxuICAkKCcjb25lRGF5TW9zdFJlY2VudCcpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgIGxvZygnTmF2aWdhdGVkIHRvIG1vc3QgcmVjZW50IG9uZS1kYXkgdmlldy4nKTtcbiAgICB0d29XZWVrLmRlc3Ryb3koKTtcbiAgICBvbmVEYXkuc3RvcExpc3RlbmluZygpO1xuICAgICQodGhpcykucGFyZW50KCkuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICQoJyN0d29XZWVrVmlldycpLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAkKCcjb25lRGF5TW9zdFJlY2VudCcpLnBhcmVudCgpLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAkKCcub25lLWRheScpLmNzcygndmlzaWJpbGl0eScsICd2aXNpYmxlJyk7XG4gICAgJCgnLnR3by13ZWVrJykuY3NzKCd2aXNpYmlsaXR5JywgJ2hpZGRlbicpO1xuICAgIC8vIFRPRE86IHRoaXMgc2hvdWxkbid0IGJlIG5lY2Vzc2FyeSwgYnV0IEkndmUgc2NyZXdlZCBzb21ldGhpbmcgdXAgd2l0aCB0aGUgZ2xvYmFsIG9uZS1kYXkuanMgdmFyaWFibGVzXG4gICAgLy8gc3VjaCB0aGF0IGl0cyBuZWNlc3NhcnkgdG8gY3JlYXRlIGEgbmV3IG9uZURheSBvYmplY3QgZXZlcnkgdGltZSB5b3Ugd2FudCB0byByZXJlbmRlclxuICAgIG9uZURheSA9IGNyZWF0ZU5ld09uZURheUNoYXJ0KCk7XG4gICAgLy8gdGFrZXMgdXNlciB0byBvbmUtZGF5IHZpZXcgb2YgbW9zdCByZWNlbnQgZGF0YVxuICAgIG9uZURheS5pbml0aWFsaXplKGRhdGEpLmxvY2F0ZSgpO1xuICAgIC8vIGF0dGFjaCBjbGljayBoYW5kbGVycyB0byBzZXQgdXAgcHJvZ3JhbW1hdGljIHBhblxuICAgICQoJyN0aWRlbGluZU5hdkZvcndhcmQnKS5vbignY2xpY2snLCBvbmVEYXkucGFuRm9yd2FyZCk7XG4gICAgJCgnI3RpZGVsaW5lTmF2QmFjaycpLm9uKCdjbGljaycsIG9uZURheS5wYW5CYWNrKTtcbiAgfSk7XG5cbiAgZW1pdHRlci5vbignc2VsZWN0U01CRycsIGZ1bmN0aW9uKGRhdGUpIHtcbiAgICBsb2coJ05hdmlnYXRlZCB0byBvbmUtZGF5IHZpZXcgZnJvbSBkb3VibGUgY2xpY2tpbmcgYSB0d28td2VlayB2aWV3IFNNQkcuJyk7XG4gICAgdHdvV2Vlay5kZXN0cm95KCk7XG4gICAgJCgnI29uZURheVZpZXcnKS5wYXJlbnQoKS5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgJCgnI3R3b1dlZWtWaWV3JykucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICQoJyNvbmVEYXlNb3N0UmVjZW50JykucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICQoJy5vbmUtZGF5JykuY3NzKCd2aXNpYmlsaXR5JywgJ3Zpc2libGUnKTtcbiAgICAkKCcudHdvLXdlZWsnKS5jc3MoJ3Zpc2liaWxpdHknLCAnaGlkZGVuJyk7XG4gICAgLy8gVE9ETzogdGhpcyBzaG91bGRuJ3QgYmUgbmVjZXNzYXJ5LCBidXQgSSd2ZSBzY3Jld2VkIHNvbWV0aGluZyB1cCB3aXRoIHRoZSBnbG9iYWwgb25lLWRheS5qcyB2YXJpYWJsZXNcbiAgICAvLyBzdWNoIHRoYXQgaXRzIG5lY2Vzc2FyeSB0byBjcmVhdGUgYSBuZXcgb25lRGF5IG9iamVjdCBldmVyeSB0aW1lIHlvdSB3YW50IHRvIHJlcmVuZGVyXG4gICAgb25lRGF5ID0gY3JlYXRlTmV3T25lRGF5Q2hhcnQoKTtcbiAgICAvLyB0YWtlcyB1c2VyIHRvIG9uZS1kYXkgdmlldyBvZiBkYXRlIGdpdmVuIGJ5IHRoZSAuZDMtc21iZy10aW1lIGVtaXR0ZXJcbiAgICBvbmVEYXkuaW5pdGlhbGl6ZShkYXRhKS5sb2NhdGUoZGF0ZSk7XG4gICAgLy8gYXR0YWNoIGNsaWNrIGhhbmRsZXJzIHRvIHNldCB1cCBwcm9ncmFtbWF0aWMgcGFuXG4gICAgJCgnI3RpZGVsaW5lTmF2Rm9yd2FyZCcpLm9uKCdjbGljaycsIG9uZURheS5wYW5Gb3J3YXJkKTtcbiAgICAkKCcjdGlkZWxpbmVOYXZCYWNrJykub24oJ2NsaWNrJywgb25lRGF5LnBhbkJhY2spO1xuICB9KTtcblxuICAkKCcjc2hvd0hpZGVOdW1iZXJzJykub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgaWYgKCQodGhpcykucGFyZW50KCkuaGFzQ2xhc3MoJ2FjdGl2ZScpKSB7XG4gICAgICBlbWl0dGVyLmVtaXQoJ251bWJlcnMnLCAnaGlkZScpO1xuICAgICAgJCh0aGlzKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAkKHRoaXMpLmh0bWwoJ1Nob3cgVmFsdWVzJyk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgZW1pdHRlci5lbWl0KCdudW1iZXJzJywgJ3Nob3cnKTtcbiAgICAgICQodGhpcykucGFyZW50KCkuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgJCh0aGlzKS5odG1sKCdIaWRlIFZhbHVlcycpO1xuICAgIH1cbiAgfSk7XG59KTtcblxuLy8gLy8gb25lLWRheSB2aXN1YWxpemF0aW9uXG4vLyAvLyA9PT09PT09PT09PT09PT09PT09PT1cbi8vIC8vIGNyZWF0ZSBhICdvbmVEYXknIG9iamVjdCB0aGF0IGlzIGEgd3JhcHBlciBhcm91bmQgdGlkZWxpbmUgY29tcG9uZW50c1xuLy8gLy8gZm9yIGJsaXAncyAob25lLWRheSkgZGF0YSB2aXN1YWxpemF0aW9uXG5mdW5jdGlvbiBvbmVEYXlDaGFydChlbCwgb3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICB2YXIgY2hhcnQgPSB0aWRlbGluZS5vbmVEYXkoZW1pdHRlcik7XG5cbiAgdmFyIHBvb2xNZXNzYWdlcywgcG9vbEJHLCBwb29sQm9sdXMsIHBvb2xCYXNhbCwgcG9vbFN0YXRzO1xuXG4gIHZhciBjcmVhdGUgPSBmdW5jdGlvbihlbCwgb3B0aW9ucykge1xuXG4gICAgaWYgKCFlbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdTb3JyeSwgeW91IG11c3QgcHJvdmlkZSBhIERPTSBlbGVtZW50ISA6KCcpO1xuICAgIH1cblxuICAgIC8vIGJhc2ljIGNoYXJ0IHNldCB1cFxuICAgIGNoYXJ0LmRlZmF1bHRzKCkud2lkdGgoJChlbCkud2lkdGgoKSkuaGVpZ2h0KCQoZWwpLmhlaWdodCgpKTtcblxuICAgIGlmIChvcHRpb25zLmltYWdlc0Jhc2VVcmwpIHtcbiAgICAgIGNoYXJ0LmltYWdlc0Jhc2VVcmwob3B0aW9ucy5pbWFnZXNCYXNlVXJsKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcblxuICAgIC8vIGluaXRpYWxpemUgY2hhcnQgd2l0aCBkYXRhXG4gICAgY2hhcnQuZGF0YShkYXRhKTtcbiAgICBkMy5zZWxlY3QoZWwpLmRhdHVtKFtudWxsXSkuY2FsbChjaGFydCk7XG4gICAgY2hhcnQuc2V0VG9vbHRpcCgpO1xuXG4gICAgLy8gbWVzc2FnZXMgcG9vbFxuICAgIHBvb2xNZXNzYWdlcyA9IGNoYXJ0Lm5ld1Bvb2woKS5kZWZhdWx0cygpXG4gICAgICAuaWQoJ3Bvb2xNZXNzYWdlcycpXG4gICAgICAubGFiZWwoJycpXG4gICAgICAuaW5kZXgoY2hhcnQucG9vbHMoKS5pbmRleE9mKHBvb2xNZXNzYWdlcykpXG4gICAgICAud2VpZ2h0KDAuNSk7XG5cbiAgICAvLyBibG9vZCBnbHVjb3NlIGRhdGEgcG9vbFxuICAgIHBvb2xCRyA9IGNoYXJ0Lm5ld1Bvb2woKS5kZWZhdWx0cygpXG4gICAgICAuaWQoJ3Bvb2xCRycpXG4gICAgICAubGFiZWwoJ0Jsb29kIEdsdWNvc2UnKVxuICAgICAgLmluZGV4KGNoYXJ0LnBvb2xzKCkuaW5kZXhPZihwb29sQkcpKVxuICAgICAgLndlaWdodCgxLjUpO1xuXG4gICAgLy8gY2FyYnMgYW5kIGJvbHVzZXMgZGF0YSBwb29sXG4gICAgcG9vbEJvbHVzID0gY2hhcnQubmV3UG9vbCgpLmRlZmF1bHRzKClcbiAgICAgIC5pZCgncG9vbEJvbHVzJylcbiAgICAgIC5sYWJlbCgnQm9sdXMgJiBDYXJib2h5ZHJhdGVzJylcbiAgICAgIC5pbmRleChjaGFydC5wb29scygpLmluZGV4T2YocG9vbEJvbHVzKSlcbiAgICAgIC53ZWlnaHQoMS41KTtcbiAgICBcbiAgICAvLyBiYXNhbCBkYXRhIHBvb2xcbiAgICBwb29sQmFzYWwgPSBjaGFydC5uZXdQb29sKCkuZGVmYXVsdHMoKVxuICAgICAgLmlkKCdwb29sQmFzYWwnKVxuICAgICAgLmxhYmVsKCdCYXNhbCBSYXRlcycpXG4gICAgICAuaW5kZXgoY2hhcnQucG9vbHMoKS5pbmRleE9mKHBvb2xCYXNhbCkpXG4gICAgICAud2VpZ2h0KDEuMCk7XG5cbiAgICAvLyBzdGF0cyB3aWRnZXRcbiAgICAvLyBwb29sU3RhdHMgPSBjaGFydC5uZXdQb29sKCkuZGVmYXVsdHMoKVxuICAgIC8vICAgLmlkKCdwb29sU3RhdHMnKVxuICAgIC8vICAgLmluZGV4KGNoYXJ0LnBvb2xzKCkuaW5kZXhPZihwb29sU3RhdHMpKVxuICAgIC8vICAgLndlaWdodCgxLjApO1xuXG4gICAgY2hhcnQuYXJyYW5nZVBvb2xzKCk7XG5cbiAgICAvLyBCRyBwb29sXG4gICAgdmFyIHNjYWxlQkcgPSBzY2FsZXMuYmcoXy53aGVyZShkYXRhLCB7J3R5cGUnOiAnY2JnJ30pLCBwb29sQkcpO1xuICAgIC8vIHNldCB1cCB5LWF4aXNcbiAgICBwb29sQkcueUF4aXMoZDMuc3ZnLmF4aXMoKVxuICAgICAgLnNjYWxlKHNjYWxlQkcpXG4gICAgICAub3JpZW50KCdsZWZ0JylcbiAgICAgIC5vdXRlclRpY2tTaXplKDApXG4gICAgICAudGlja1ZhbHVlcyhbNDAsIDgwLCAxMjAsIDE4MCwgMzAwXSkpO1xuICAgIC8vIGFkZCBiYWNrZ3JvdW5kIGZpbGwgcmVjdGFuZ2xlcyB0byBCRyBwb29sXG4gICAgcG9vbEJHLmFkZFBsb3RUeXBlKCdmaWxsJywgZmlsbChwb29sQkcsIHtlbmRwb2ludHM6IGNoYXJ0LmVuZHBvaW50c30pLCBmYWxzZSk7XG5cbiAgICAvLyBhZGQgQ0JHIGRhdGEgdG8gQkcgcG9vbFxuICAgIHBvb2xCRy5hZGRQbG90VHlwZSgnY2JnJywgdGlkZWxpbmUucGxvdC5jYmcocG9vbEJHLCB7eVNjYWxlOiBzY2FsZUJHfSksIHRydWUpO1xuXG4gICAgLy8gYWRkIFNNQkcgZGF0YSB0byBCRyBwb29sXG4gICAgcG9vbEJHLmFkZFBsb3RUeXBlKCdzbWJnJywgdGlkZWxpbmUucGxvdC5zbWJnKHBvb2xCRywge3lTY2FsZTogc2NhbGVCR30pLCB0cnVlKTtcblxuICAgIC8vIGJvbHVzICYgY2FyYnMgcG9vbFxuICAgIHZhciBzY2FsZUJvbHVzID0gc2NhbGVzLmJvbHVzKF8ud2hlcmUoZGF0YSwgeyd0eXBlJzogJ2JvbHVzJ30pLCBwb29sQm9sdXMpO1xuICAgIHZhciBzY2FsZUNhcmJzID0gc2NhbGVzLmNhcmJzKF8ud2hlcmUoZGF0YSwgeyd0eXBlJzogJ2NhcmJzJ30pLCBwb29sQm9sdXMpO1xuICAgIC8vIHNldCB1cCB5LWF4aXMgZm9yIGJvbHVzXG4gICAgcG9vbEJvbHVzLnlBeGlzKGQzLnN2Zy5heGlzKClcbiAgICAgIC5zY2FsZShzY2FsZUJvbHVzKVxuICAgICAgLm9yaWVudCgnbGVmdCcpXG4gICAgICAub3V0ZXJUaWNrU2l6ZSgwKVxuICAgICAgLnRpY2tzKDMpKTtcbiAgICAvLyBzZXQgdXAgeS1heGlzIGZvciBjYXJic1xuICAgIHBvb2xCb2x1cy55QXhpcyhkMy5zdmcuYXhpcygpXG4gICAgICAuc2NhbGUoc2NhbGVDYXJicylcbiAgICAgIC5vcmllbnQoJ2xlZnQnKVxuICAgICAgLm91dGVyVGlja1NpemUoMClcbiAgICAgIC50aWNrcygzKSk7XG4gICAgLy8gYWRkIGJhY2tncm91bmQgZmlsbCByZWN0YW5nbGVzIHRvIGJvbHVzIHBvb2xcbiAgICBwb29sQm9sdXMuYWRkUGxvdFR5cGUoJ2ZpbGwnLCBmaWxsKHBvb2xCb2x1cywge2VuZHBvaW50czogY2hhcnQuZW5kcG9pbnRzfSksIGZhbHNlKTtcblxuICAgIC8vIGFkZCBjYXJicyBkYXRhIHRvIGJvbHVzIHBvb2xcbiAgICBwb29sQm9sdXMuYWRkUGxvdFR5cGUoJ2NhcmJzJywgdGlkZWxpbmUucGxvdC5jYXJicyhwb29sQm9sdXMsIHtcbiAgICAgIHlTY2FsZTogc2NhbGVDYXJicyxcbiAgICAgIGVtaXR0ZXI6IGVtaXR0ZXIsXG4gICAgICBkYXRhOiBfLndoZXJlKGRhdGEsIHsndHlwZSc6ICdjYXJicyd9KVxuICAgIH0pLCB0cnVlKTtcblxuICAgIC8vIGFkZCBib2x1cyBkYXRhIHRvIGJvbHVzIHBvb2xcbiAgICBwb29sQm9sdXMuYWRkUGxvdFR5cGUoJ2JvbHVzJywgdGlkZWxpbmUucGxvdC5ib2x1cyhwb29sQm9sdXMsIHtcbiAgICAgIHlTY2FsZTogc2NhbGVCb2x1cyxcbiAgICAgIGVtaXR0ZXI6IGVtaXR0ZXIsXG4gICAgICBkYXRhOiBfLndoZXJlKGRhdGEsIHsndHlwZSc6ICdib2x1cyd9KVxuICAgIH0pLCB0cnVlKTtcblxuICAgIC8vIGJhc2FsIHBvb2xcbiAgICB2YXIgc2NhbGVCYXNhbCA9IHNjYWxlcy5iYXNhbChfLndoZXJlKGRhdGEsIHsndHlwZSc6ICdiYXNhbC1yYXRlLXNlZ21lbnQnfSksIHBvb2xCYXNhbCk7XG4gICAgLy8gc2V0IHVwIHktYXhpc1xuICAgIHBvb2xCYXNhbC55QXhpcyhkMy5zdmcuYXhpcygpXG4gICAgICAuc2NhbGUoc2NhbGVCYXNhbClcbiAgICAgIC5vcmllbnQoJ2xlZnQnKVxuICAgICAgLm91dGVyVGlja1NpemUoMClcbiAgICAgIC50aWNrcyg0KSk7XG4gICAgLy8gYWRkIGJhY2tncm91bmQgZmlsbCByZWN0YW5nbGVzIHRvIGJhc2FsIHBvb2xcbiAgICBwb29sQmFzYWwuYWRkUGxvdFR5cGUoJ2ZpbGwnLCBmaWxsKHBvb2xCYXNhbCwge2VuZHBvaW50czogY2hhcnQuZW5kcG9pbnRzfSksIGZhbHNlKTtcblxuICAgIC8vIGFkZCBiYXNhbCBkYXRhIHRvIGJhc2FsIHBvb2xcbiAgICBwb29sQmFzYWwuYWRkUGxvdFR5cGUoJ2Jhc2FsLXJhdGUtc2VnbWVudCcsIHRpZGVsaW5lLnBsb3QuYmFzYWwocG9vbEJhc2FsLCB7eVNjYWxlOiBzY2FsZUJhc2FsLCBkYXRhOiBfLndoZXJlKGRhdGEsIHsndHlwZSc6ICdiYXNhbC1yYXRlLXNlZ21lbnQnfSkgfSksIHRydWUpO1xuXG4gICAgLy8gbWVzc2FnZXMgcG9vbFxuICAgIC8vIGFkZCBiYWNrZ3JvdW5kIGZpbGwgcmVjdGFuZ2xlcyB0byBtZXNzYWdlcyBwb29sXG4gICAgcG9vbE1lc3NhZ2VzLmFkZFBsb3RUeXBlKCdmaWxsJywgZmlsbChwb29sTWVzc2FnZXMsIHtlbmRwb2ludHM6IGNoYXJ0LmVuZHBvaW50c30pLCBmYWxzZSk7XG5cbiAgICAvLyBhZGQgbWVzc2FnZSBpbWFnZXMgdG8gbWVzc2FnZXMgcG9vbFxuICAgIHBvb2xNZXNzYWdlcy5hZGRQbG90VHlwZSgnbWVzc2FnZScsIHRpZGVsaW5lLnBsb3QubWVzc2FnZShwb29sTWVzc2FnZXMsIHtzaXplOiAzMH0pLCB0cnVlKTtcblxuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICAvLyBsb2NhdGUgdGhlIGNoYXJ0IGFyb3VuZCBhIGNlcnRhaW4gZGF0ZXRpbWVcbiAgLy8gaWYgY2FsbGVkIHdpdGhvdXQgYW4gYXJndW1lbnQsIGxvY2F0ZXMgdGhlIGNoYXJ0IGF0IHRoZSBtb3N0IHJlY2VudCAyNCBob3VycyBvZiBkYXRhXG4gIGNoYXJ0LmxvY2F0ZSA9IGZ1bmN0aW9uKGRhdGV0aW1lKSB7XG5cbiAgICB2YXIgc3RhcnQsIGVuZCwgbG9jYWxEYXRhO1xuXG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICBzdGFydCA9IGNoYXJ0LmluaXRpYWxFbmRwb2ludHNbMF07XG4gICAgICBlbmQgPSBjaGFydC5pbml0aWFsRW5kcG9pbnRzWzFdO1xuICAgICAgbG9jYWxEYXRhID0gY2hhcnQuZ2V0RGF0YShjaGFydC5pbml0aWFsRW5kcG9pbnRzLCAnYm90aCcpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHN0YXJ0ID0gbmV3IERhdGUoZGF0ZXRpbWUpO1xuICAgICAgZW5kID0gbmV3IERhdGUoc3RhcnQpO1xuICAgICAgc3RhcnQuc2V0VVRDSG91cnMoc3RhcnQuZ2V0VVRDSG91cnMoKSAtIDEyKTtcbiAgICAgIGVuZC5zZXRVVENIb3VycyhlbmQuZ2V0VVRDSG91cnMoKSArIDEyKTtcblxuICAgICAgbG9jYWxEYXRhID0gY2hhcnQuZ2V0RGF0YShbc3RhcnQsIGVuZF0sICdib3RoJyk7XG4gICAgICBjaGFydC5iZWdpbm5pbmdPZkRhdGEoc3RhcnQpLmVuZE9mRGF0YShlbmQpO1xuICAgIH1cblxuICAgIGNoYXJ0LmFsbERhdGEobG9jYWxEYXRhLCBbc3RhcnQsIGVuZF0pO1xuXG4gICAgLy8gc2V0IHVwIGNsaWNrLWFuZC1kcmFnIGFuZCBzY3JvbGwgbmF2aWdhdGlvblxuICAgIGNoYXJ0LnNldE5hdigpLnNldFNjcm9sbE5hdigpLnNldEF0RGF0ZShzdGFydCk7XG5cbiAgICAvLyByZW5kZXIgcG9vbHNcbiAgICBjaGFydC5wb29scygpLmZvckVhY2goZnVuY3Rpb24ocG9vbCkge1xuICAgICAgcG9vbChjaGFydC5wb29sR3JvdXAsIGxvY2FsRGF0YSk7XG4gICAgfSk7XG5cbiAgICAvLyBhZGQgdG9vbHRpcHNcbiAgICBjaGFydC50b29sdGlwcy5hZGRHcm91cChkMy5zZWxlY3QoJyMnICsgcG9vbEJHLmlkKCkpLCAnY2JnJyk7XG4gICAgY2hhcnQudG9vbHRpcHMuYWRkR3JvdXAoZDMuc2VsZWN0KCcjJyArIHBvb2xCRy5pZCgpKSwgJ3NtYmcnKTtcbiAgICBjaGFydC50b29sdGlwcy5hZGRHcm91cChkMy5zZWxlY3QoJyMnICsgcG9vbEJvbHVzLmlkKCkpLCAnY2FyYnMnKTtcbiAgICBjaGFydC50b29sdGlwcy5hZGRHcm91cChkMy5zZWxlY3QoJyMnICsgcG9vbEJvbHVzLmlkKCkpLCAnYm9sdXMnKTtcbiAgICBjaGFydC50b29sdGlwcy5hZGRHcm91cChkMy5zZWxlY3QoJyMnICsgcG9vbEJhc2FsLmlkKCkpLCAnYmFzYWwnKTtcblxuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC5nZXRDdXJyZW50RGF5ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGNoYXJ0LmRhdGUoKTtcbiAgfTtcblxuICByZXR1cm4gY3JlYXRlKGVsLCBvcHRpb25zKTtcbn1cblxuLy8gLy8gdHdvLXdlZWsgdmlzdWFsaXphdGlvblxuLy8gLy8gPT09PT09PT09PT09PT09PT09PT09XG4vLyAvLyBjcmVhdGUgYSAndHdvV2Vlaycgb2JqZWN0IHRoYXQgaXMgYSB3cmFwcGVyIGFyb3VuZCB0aWRlbGluZSBjb21wb25lbnRzXG4vLyAvLyBmb3IgYmxpcCdzICh0d28td2VlaykgZGF0YSB2aXN1YWxpemF0aW9uXG5mdW5jdGlvbiB0d29XZWVrQ2hhcnQoZWwsIG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgdmFyIGNoYXJ0ID0gdGlkZWxpbmUudHdvV2VlayhlbWl0dGVyKTtcblxuICB2YXIgcG9vbHMgPSBbXTtcblxuICB2YXIgY3JlYXRlID0gZnVuY3Rpb24oZWwsIG9wdGlvbnMpIHtcbiAgICBpZiAoIWVsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1NvcnJ5LCB5b3UgbXVzdCBwcm92aWRlIGEgRE9NIGVsZW1lbnQhIDooJyk7XG4gICAgfVxuXG4gICAgLy8gYmFzaWMgY2hhcnQgc2V0IHVwXG4gICAgY2hhcnQuZGVmYXVsdHMoKS53aWR0aCgkKGVsKS53aWR0aCgpKS5oZWlnaHQoJChlbCkuaGVpZ2h0KCkpO1xuXG4gICAgaWYgKG9wdGlvbnMuaW1hZ2VzQmFzZVVybCkge1xuICAgICAgY2hhcnQuaW1hZ2VzQmFzZVVybChvcHRpb25zLmltYWdlc0Jhc2VVcmwpO1xuICAgIH1cblxuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC5pbml0aWFsaXplID0gZnVuY3Rpb24oZGF0YSwgZGF0ZXRpbWUpIHtcblxuICAgIGlmICghZGF0ZXRpbWUpIHtcbiAgICAgIGNoYXJ0LmRhdGEoXy53aGVyZShkYXRhLCB7J3R5cGUnOiAnc21iZyd9KSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgY2hhcnQuZGF0YShfLndoZXJlKGRhdGEsIHsndHlwZSc6ICdzbWJnJ30pLCBkYXRldGltZSk7XG4gICAgfVxuXG4gICAgLy8gaW5pdGlhbGl6ZSBjaGFydFxuICAgIGQzLnNlbGVjdChlbCkuZGF0dW0oW251bGxdKS5jYWxsKGNoYXJ0KTtcbiAgICBjaGFydC5zZXROYXYoKS5zZXRTY3JvbGxOYXYoKTtcblxuICAgIGRheXMgPSBjaGFydC5kYXlzO1xuICAgIC8vIG1ha2UgcG9vbHMgZm9yIGVhY2ggZGF5XG4gICAgZGF5cy5mb3JFYWNoKGZ1bmN0aW9uKGRheSwgaSkge1xuICAgICAgdmFyIG5ld1Bvb2wgPSBjaGFydC5uZXdQb29sKCkuZGVmYXVsdHMoKVxuICAgICAgICAuaWQoJ3Bvb2xCR18nICsgZGF5KVxuICAgICAgICAuaW5kZXgoY2hhcnQucG9vbHMoKS5pbmRleE9mKG5ld1Bvb2wpKVxuICAgICAgICAud2VpZ2h0KDEuMCk7XG4gICAgfSk7XG4gICAgY2hhcnQuYXJyYW5nZVBvb2xzKCk7XG5cbiAgICB2YXIgZmlsbEVuZHBvaW50cyA9IFtuZXcgRGF0ZSgnMjAxNC0wMS0wMVQwMDowMDowMFonKSwgbmV3IERhdGUoJzIwMTQtMDEtMDJUMDA6MDA6MDBaJyldO1xuICAgIHZhciBmaWxsU2NhbGUgPSBkMy50aW1lLnNjYWxlLnV0YygpXG4gICAgICAuZG9tYWluKGZpbGxFbmRwb2ludHMpXG4gICAgICAucmFuZ2UoW2NoYXJ0LmF4aXNHdXR0ZXIoKSwgY2hhcnQud2lkdGgoKSAtIGNoYXJ0Lm5hdkd1dHRlcigpXSk7XG5cbiAgICBjaGFydC5wb29scygpLmZvckVhY2goZnVuY3Rpb24ocG9vbCwgaSkge1xuICAgICAgcG9vbC5hZGRQbG90VHlwZSgnZmlsbCcsIGZpbGwocG9vbCwge1xuICAgICAgICBlbmRwb2ludHM6IGZpbGxFbmRwb2ludHMsXG4gICAgICAgIHNjYWxlOiBmaWxsU2NhbGUsXG4gICAgICAgIGd1dHRlcjogMC41XG4gICAgICB9KSwgZmFsc2UpO1xuICAgICAgcG9vbC5hZGRQbG90VHlwZSgnc21iZycsIHRpZGVsaW5lLnBsb3Quc21iZ1RpbWUocG9vbCwge2VtaXR0ZXI6IGVtaXR0ZXJ9KSwgdHJ1ZSk7XG4gICAgICBwb29sKGNoYXJ0LmRheXNHcm91cCwgY2hhcnQuZGF0YVBlckRheVtpXSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgcmV0dXJuIGNyZWF0ZShlbCwgb3B0aW9ucyk7XG59XG4iLCIvKiBcbiAqID09IEJTRDIgTElDRU5TRSA9PVxuICogQ29weXJpZ2h0IChjKSAyMDE0LCBUaWRlcG9vbCBQcm9qZWN0XG4gKiBcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOyB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5IGl0IHVuZGVyXG4gKiB0aGUgdGVybXMgb2YgdGhlIGFzc29jaWF0ZWQgTGljZW5zZSwgd2hpY2ggaXMgaWRlbnRpY2FsIHRvIHRoZSBCU0QgMi1DbGF1c2VcbiAqIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5IHRoZSBPcGVuIFNvdXJjZSBJbml0aWF0aXZlIGF0IG9wZW5zb3VyY2Uub3JnLlxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCwgYnV0IFdJVEhPVVRcbiAqIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTXG4gKiBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuIFNlZSB0aGUgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICogXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtOyBpZlxuICogbm90LCB5b3UgY2FuIG9idGFpbiBvbmUgZnJvbSBUaWRlcG9vbCBQcm9qZWN0IGF0IHRpZGVwb29sLm9yZy5cbiAqID09IEJTRDIgTElDRU5TRSA9PVxuICovXG5cbi8vXG4vLyAnR29vZCBvbGQgV2F0c29uISBZb3UgYXJlIHRoZSBvbmUgZml4ZWQgcG9pbnQgaW4gYSBjaGFuZ2luZyBhZ2UuJyAtIFNoZXJsb2NrIEhvbG1lcywgXCJIaXMgTGFzdCBCb3dcIlxuLy9cbi8vIFRoaXMgbWluaSBtb2R1bGUgaXMgZm9yIGNvbnRhaW5pbmcgYW55dGhpbmcgZG9uZSB0byBUaWRlcG9vbCBkYXRhIHRvIG1ha2UgaXQgcG9zc2libGUgdG8gcGxvdCB0aW1lem9uZS1uYWl2ZVxuLy8gZGF0YSByZWxpYWJseSBhbmQgY29uc2lzdGVudGx5IGFjcm9zcyBkaWZmZXJlbnQgYnJvd3NlcnMgYW5kIGluIGRpZmZlcmVudCB0aW1lem9uZXMuIEl0IGlzIG5hbWVkIGFmdGVyIHRoZVxuLy8gcXVvdGF0aW9uIGxpc3RlZCBhYm92ZSBhcyB3ZWxsIGFzIHRoZSBmYWN0IHRoYXQgV2F0c29uIGlzIG9uZSBvZiBsaXRlcmF0dXJlJ3MgdXItZXhhbXBsZXMgb2YgdGhlIGxveWFsXG4vLyBhc3Npc3RhbnQuXG4vL1xuLy8gVHJ5IGFzIGhhcmQgYXMgeW91IGNhbiB0byBrZWVwIFdhdHNvbiBvdXQgb2YgbGlicmFyeSBjb2RlIC0gaS5lLiwgaW4gdGhpcyByZXBvc2l0b3J5LCBXYXRzb24gc2hvdWxkIG9ubHkgYmUgYVxuLy8gcmVxdWlyZW1lbnQgaW4gZmlsZXMgaW4gdGhlIGV4YW1wbGUvIGZvbGRlciAoYXMgdGhlc2UgYXJlIGJsaXAtc3BlY2lmaWMpLCBub3QgaW4gdGhlIG1haW4gdGlkZWxpbmUgZmlsZXM6XG4vLyBvbmUtZGF5LmpzLCB0d28td2Vlay5qcywgYW5kIHBvb2wuanMuXG4vL1xuXG52YXIgbG9nID0gd2luZG93LmJvd3MoJ1dhdHNvbicpO1xuXG52YXIgd2F0c29uID0ge1xuICBub3JtYWxpemU6IGZ1bmN0aW9uKGEpIHtcbiAgICBsb2coJ1dhdHNvbiBub3JtYWxpemVkIHRoZSBkYXRhLicpO1xuICAgIHJldHVybiBfLm1hcChhLCBmdW5jdGlvbihpKSB7XG4gICAgICBpLm5vcm1hbFRpbWUgPSBpLmRldmljZVRpbWUgKyAnWic7XG4gICAgICBpZiAoaS51dGNUaW1lKSB7XG4gICAgICAgIHZhciBkID0gbmV3IERhdGUoaS51dGNUaW1lKTtcbiAgICAgICAgdmFyIG9mZnNldE1pbnV0ZXMgPSBkLmdldFRpbWV6b25lT2Zmc2V0KCk7XG4gICAgICAgIGQuc2V0TWludXRlcyhkLmdldE1pbnV0ZXMoKSAtIG9mZnNldE1pbnV0ZXMpO1xuICAgICAgICBpLm5vcm1hbFRpbWUgPSBkLnRvSVNPU3RyaW5nKCk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChpLnR5cGUgPT09ICdiYXNhbC1yYXRlLXNlZ21lbnQnKSB7XG4gICAgICAgIGkubm9ybWFsVGltZSA9IGkuc3RhcnQgKyAnWic7XG4gICAgICAgIGkubm9ybWFsRW5kID0gaS5lbmQgKyAnWic7XG4gICAgICB9XG4gICAgICByZXR1cm4gaTtcbiAgICB9KTtcbiAgfSxcbiAgcHJpbnQ6IGZ1bmN0aW9uKGFyZywgZCkge1xuICAgIGNvbnNvbGUubG9nKGFyZywgZC50b1VUQ1N0cmluZygpLnJlcGxhY2UoJyBHTVQnLCAnJykpO1xuICAgIHJldHVybjtcbiAgfSxcbiAgc3RyaXA6IGZ1bmN0aW9uKGQpIHtcbiAgICByZXR1cm4gZC50b1VUQ1N0cmluZygpLnJlcGxhY2UoJyBHTVQnLCAnJyk7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gd2F0c29uOyIsIi8qIFxuICogPT0gQlNEMiBMSUNFTlNFID09XG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQsIFRpZGVwb29sIFByb2plY3RcbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU7IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnkgaXQgdW5kZXJcbiAqIHRoZSB0ZXJtcyBvZiB0aGUgYXNzb2NpYXRlZCBMaWNlbnNlLCB3aGljaCBpcyBpZGVudGljYWwgdG8gdGhlIEJTRCAyLUNsYXVzZVxuICogTGljZW5zZSBhcyBwdWJsaXNoZWQgYnkgdGhlIE9wZW4gU291cmNlIEluaXRpYXRpdmUgYXQgb3BlbnNvdXJjZS5vcmcuXG4gKiBcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLCBidXQgV0lUSE9VVFxuICogQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2YgTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1NcbiAqIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gU2VlIHRoZSBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKiBcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW07IGlmXG4gKiBub3QsIHlvdSBjYW4gb2J0YWluIG9uZSBmcm9tIFRpZGVwb29sIFByb2plY3QgYXQgdGlkZXBvb2wub3JnLlxuICogPT0gQlNEMiBMSUNFTlNFID09XG4gKi9cblxudmFyIF8gPSByZXF1aXJlKCcuLi9saWIvdW5kZXJzY29yZScpO1xudmFyIGxvZyA9IHJlcXVpcmUoJy4uL2xpYi9ib3dzJykoJ0Jhc2FsVXRpbCcpO1xuXG52YXIga2V5c1RvT21pdCA9IFsnaWQnLCAnc3RhcnQnLCAnZW5kJywgJ3ZpelR5cGUnXTtcblxuZnVuY3Rpb24gQmFzYWxVdGlsKGRhdGEpIHtcbiAgdmFyIGFjdHVhbHMgPSBbXTtcbiAgdmFyIHVuZGVsaXZlcmVkcyA9IFtdO1xuXG4gIGZ1bmN0aW9uIGFkZFRvQWN0dWFscyhlKSB7XG4gICAgYWN0dWFscy5wdXNoKF8uZXh0ZW5kKHt9LCBlLCB7dml6VHlwZTogJ2FjdHVhbCd9KSk7XG4gIH1cblxuICBmdW5jdGlvbiBhZGRUb1VuZGVsaXZlcmVkKGUpIHtcbiAgICB1bmRlbGl2ZXJlZHMucHVzaChfLmV4dGVuZCh7fSwgZSwge3ZpelR5cGU6ICd1bmRlbGl2ZXJlZCd9KSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm9jZXNzRWxlbWVudChlKSB7XG4gICAgaWYgKGUuZGVsaXZlcnlUeXBlID09PSAndGVtcCcgfHwgZS5kZWxpdmVyeVR5cGUgPT09ICdzY2hlZHVsZWQnKSB7XG4gICAgICBpZiAoYWN0dWFscy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgYWRkVG9BY3R1YWxzKGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGxhc3RBY3R1YWwgPSBhY3R1YWxzW2FjdHVhbHMubGVuZ3RoIC0gMV07XG4gICAgICAgIGlmIChlLnN0YXJ0ID09PSBsYXN0QWN0dWFsLmVuZCkge1xuICAgICAgICAgIGlmIChfLmlzRXF1YWwoXy5vbWl0KGUsIGtleXNUb09taXQpLCBfLm9taXQobGFzdEFjdHVhbCwga2V5c1RvT21pdCkpKSB7XG4gICAgICAgICAgICBsYXN0QWN0dWFsLmVuZCA9IGUuZW5kO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhZGRUb0FjdHVhbHMoZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGUuc3RhcnQgPCBsYXN0QWN0dWFsLmVuZCkge1xuICAgICAgICAgIC8vIEl0IGlzIG92ZXJsYXBwaW5nLCBzbyBsZXQncyBzZWUgaG93IHdlIHNob3VsZCBkZWFsIHdpdGggaXQuXG5cbiAgICAgICAgICBpZiAoZS5zdGFydCA8IGxhc3RBY3R1YWwuc3RhcnQpIHtcbiAgICAgICAgICAgIC8vIFRoZSBjdXJyZW50IGVsZW1lbnQgaXMgY29tcGxldGVseSBuZXdlciB0aGFuIHRoZSBsYXN0IGFjdHVhbCwgc28gd2UgaGF2ZSB0byByZXdpbmQgYSBiaXQuXG4gICAgICAgICAgICB2YXIgcmVtb3ZlZEFjdHVhbCA9IGFjdHVhbHMucG9wKCk7XG4gICAgICAgICAgICBwcm9jZXNzRWxlbWVudChlKTtcbiAgICAgICAgICAgIHByb2Nlc3NFbGVtZW50KHJlbW92ZWRBY3R1YWwpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoZS5kZWxpdmVyeVR5cGUgPT09ICd0ZW1wJykge1xuICAgICAgICAgICAgLy8gSXQncyBhIHRlbXAsIHdoaWNoIHdpbnMgbm8gbWF0dGVyIHdoYXQgaXQgd2FzIGJlZm9yZS5cbiAgICAgICAgICAgIC8vIFN0YXJ0IGJ5IHNldHRpbmcgdXAgc2hhcmVkIGFkanVzdG1lbnRzIHRvIHRoZSBzZWdtZW50cyAoY2xvbmUgbGFzdEFjdHVhbCBhbmQgcmVzaGFwZSBpdClcbiAgICAgICAgICAgIHZhciB1bmRlbGl2ZXJlZENsb25lID0gXy5jbG9uZShsYXN0QWN0dWFsKTtcbiAgICAgICAgICAgIGxhc3RBY3R1YWwuZW5kID0gZS5zdGFydDtcblxuICAgICAgICAgICAgaWYgKGUuZW5kID49IHVuZGVsaXZlcmVkQ2xvbmUuZW5kKSB7XG4gICAgICAgICAgICAgIC8vIFRoZSB0ZW1wIHNlZ21lbnQgaXMgbG9uZ2VyIHRoYW4gdGhlIGN1cnJlbnQsIHRocm93IGF3YXkgdGhlIHJlc3Qgb2YgdGhlIGN1cnJlbnRcbiAgICAgICAgICAgICAgdW5kZWxpdmVyZWRDbG9uZS5zdGFydCA9IGUuc3RhcnQ7XG4gICAgICAgICAgICAgIGFkZFRvVW5kZWxpdmVyZWQodW5kZWxpdmVyZWRDbG9uZSk7XG4gICAgICAgICAgICAgIGFkZFRvQWN0dWFscyhlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIFRoZSBjdXJyZW50IGV4Y2VlZHMgdGhlIHRlbXAsIHNvIHJlcGxhY2UgdGhlIGN1cnJlbnQgXCJjaHVua1wiIGFuZCByZS1hdHRhY2ggdGhlIHNjaGVkdWxlXG4gICAgICAgICAgICAgIHZhciBlbmRpbmdTZWdtZW50ID0gXy5jbG9uZSh1bmRlbGl2ZXJlZENsb25lKTtcbiAgICAgICAgICAgICAgdW5kZWxpdmVyZWRDbG9uZS5zdGFydCA9IGUuc3RhcnQ7XG4gICAgICAgICAgICAgIHVuZGVsaXZlcmVkQ2xvbmUuZW5kID0gZS5lbmQ7XG4gICAgICAgICAgICAgIGFkZFRvVW5kZWxpdmVyZWQodW5kZWxpdmVyZWRDbG9uZSk7XG4gICAgICAgICAgICAgIGFkZFRvQWN0dWFscyhfLmNsb25lKGUpKTtcblxuICAgICAgICAgICAgICAvLyBSZS1hdHRhY2ggdGhlIGVuZCBvZiB0aGUgc2NoZWR1bGVcbiAgICAgICAgICAgICAgZW5kaW5nU2VnbWVudC5zdGFydCA9IGUuZW5kO1xuICAgICAgICAgICAgICBhZGRUb0FjdHVhbHMoZW5kaW5nU2VnbWVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGUuZGVsaXZlcnlUeXBlID09PSAnc2NoZWR1bGVkJ1xuICAgICAgICAgICAgaWYgKGxhc3RBY3R1YWwuZGVsaXZlcnlUeXBlID09PSAnc2NoZWR1bGVkJykge1xuICAgICAgICAgICAgICAvLyBTY2hlZHVsZWQgb3ZlcmxhcHBpbmcgYSBzY2hlZHVsZWQsIHRoaXMgc2hvdWxkIG5vdCBoYXBwZW4uXG4gICAgICAgICAgICAgIGxvZygnU2NoZWR1bGVkIG92ZXJsYXBwZWQgYSBzY2hlZHVsZWQuICBTaG91bGQgbmV2ZXIgaGFwcGVuLicsIGxhc3RBY3R1YWwsIGUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy8gU2NoZWR1bGVkIG92ZXJsYXBwaW5nIGEgdGVtcCwgdGhpcyBjYW4gaGFwcGVuIGFuZCB0aGUgc2NoZWR1bGUgc2hvdWxkIGJlIHNraXBwZWRcbiAgICAgICAgICAgICAgdmFyIHVuZGVsaXZlcmVkQ2xvbmUgPSBfLmNsb25lKGUpO1xuXG4gICAgICAgICAgICAgIGlmIChlLmVuZCA+IGxhc3RBY3R1YWwuZW5kKSB7XG4gICAgICAgICAgICAgICAgLy8gU2NoZWR1bGVkIGlzIGxvbmdlciB0aGFuIHRoZSB0ZW1wLCBzbyBwcmVzZXJ2ZSB0aGUgdGFpbFxuICAgICAgICAgICAgICAgIHZhciBkZWxpdmVyZWRDbG9uZSA9IF8uY2xvbmUoZSk7XG4gICAgICAgICAgICAgICAgdW5kZWxpdmVyZWRDbG9uZS5lbmQgPSBsYXN0QWN0dWFsLmVuZDtcbiAgICAgICAgICAgICAgICBkZWxpdmVyZWRDbG9uZS5zdGFydCA9IGxhc3RBY3R1YWwuZW5kO1xuICAgICAgICAgICAgICAgIGFkZFRvVW5kZWxpdmVyZWQodW5kZWxpdmVyZWRDbG9uZSk7XG4gICAgICAgICAgICAgICAgYWRkVG9BY3R1YWxzKGRlbGl2ZXJlZENsb25lKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBTY2hlZHVsZWQgaXMgc2hvcnRlciB0aGFuIHRoZSB0ZW1wLCBzbyBjb21wbGV0ZWx5IHNraXAgaXRcbiAgICAgICAgICAgICAgICBhZGRUb1VuZGVsaXZlcmVkKHVuZGVsaXZlcmVkQ2xvbmUpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIGUuc3RhcnQgPiBsYXN0QWN0dWFsLmVuZFxuICAgICAgICAgIGxvZygnZS5zdGFydFsnICsgZS5zdGFydCArICddID4gbGFzdEFjdHVhbC5lbmRbJyArIGxhc3RBY3R1YWwuZW5kICsgJ10uICAnICtcbiAgICAgICAgICAgICdCQUQhISEhIEFBQUhISEhISEguICBTb3J0IGlucHV0IGRhdGEgcGx6LCB0aHgsIGNoZWV6YnVyZ2VyJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBkYXRhLmZvckVhY2gocHJvY2Vzc0VsZW1lbnQpO1xuXG4gIHRoaXMuYWN0dWFsID0gYWN0dWFscztcbiAgdGhpcy51bmRlbGl2ZXJlZCA9IHVuZGVsaXZlcmVkcztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBCYXNhbFV0aWw7IiwiLyogXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqIENvcHlyaWdodCAoYykgMjAxNCwgVGlkZXBvb2wgUHJvamVjdFxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTsgeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeSBpdCB1bmRlclxuICogdGhlIHRlcm1zIG9mIHRoZSBhc3NvY2lhdGVkIExpY2Vuc2UsIHdoaWNoIGlzIGlkZW50aWNhbCB0byB0aGUgQlNEIDItQ2xhdXNlXG4gKiBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieSB0aGUgT3BlbiBTb3VyY2UgSW5pdGlhdGl2ZSBhdCBvcGVuc291cmNlLm9yZy5cbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsIGJ1dCBXSVRIT1VUXG4gKiBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTU1xuICogRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiBTZWUgdGhlIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqIFxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbTsgaWZcbiAqIG5vdCwgeW91IGNhbiBvYnRhaW4gb25lIGZyb20gVGlkZXBvb2wgUHJvamVjdCBhdCB0aWRlcG9vbC5vcmcuXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgcG9vbDogcmVxdWlyZSgnLi9wb29sJyksXG4gIG9uZURheTogcmVxdWlyZSgnLi9vbmUtZGF5JyksXG4gIHR3b1dlZWs6IHJlcXVpcmUoJy4vdHdvLXdlZWsnKSxcblxuICBkYXRhOiB7XG4gICAgQmFzYWxVdGlsOiByZXF1aXJlKCcuL2RhdGEvYmFzYWx1dGlsJylcbiAgfSxcblxuICBwbG90OiB7XG4gICAgYmFzYWw6IHJlcXVpcmUoJy4vcGxvdC9iYXNhbCcpLFxuICAgIGJvbHVzOiByZXF1aXJlKCcuL3Bsb3QvYm9sdXMnKSxcbiAgICBjYXJiczogcmVxdWlyZSgnLi9wbG90L2NhcmJzJyksXG4gICAgY2JnOiByZXF1aXJlKCcuL3Bsb3QvY2JnJyksXG4gICAgZmlsbDogcmVxdWlyZSgnLi9wbG90L2ZpbGwnKSxcbiAgICBtZXNzYWdlOiByZXF1aXJlKCcuL3Bsb3QvbWVzc2FnZScpLFxuICAgIHNjYWxlczogcmVxdWlyZSgnLi9wbG90L3NjYWxlcycpLFxuICAgIHNtYmdUaW1lOiByZXF1aXJlKCcuL3Bsb3Qvc21iZy10aW1lJyksXG4gICAgc21iZzogcmVxdWlyZSgnLi9wbG90L3NtYmcnKSxcbiAgICB0b29sdGlwOiByZXF1aXJlKCcuL3Bsb3QvdG9vbHRpcCcpXG4gIH1cbn07IiwiLyogXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqIENvcHlyaWdodCAoYykgMjAxNCwgVGlkZXBvb2wgUHJvamVjdFxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTsgeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeSBpdCB1bmRlclxuICogdGhlIHRlcm1zIG9mIHRoZSBhc3NvY2lhdGVkIExpY2Vuc2UsIHdoaWNoIGlzIGlkZW50aWNhbCB0byB0aGUgQlNEIDItQ2xhdXNlXG4gKiBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieSB0aGUgT3BlbiBTb3VyY2UgSW5pdGlhdGl2ZSBhdCBvcGVuc291cmNlLm9yZy5cbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsIGJ1dCBXSVRIT1VUXG4gKiBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTU1xuICogRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiBTZWUgdGhlIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqIFxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbTsgaWZcbiAqIG5vdCwgeW91IGNhbiBvYnRhaW4gb25lIGZyb20gVGlkZXBvb2wgUHJvamVjdCBhdCB0aWRlcG9vbC5vcmcuXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqL1xuXG52YXIgYm93cztcblxuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gIGJvd3MgPSB3aW5kb3cuYm93cztcbn1cblxuaWYgKCFib3dzKSB7XG4gIC8vIE9wdGlvbmFsIGRlcGVuZGVuY3lcbiAgLy8gUmV0dXJuIGEgZmFjdG9yeSBmb3IgYSBsb2cgZnVuY3Rpb24gdGhhdCBkb2VzIG5vdGhpbmdcbiAgYm93cyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHt9O1xuICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGJvd3M7IiwiLyogXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqIENvcHlyaWdodCAoYykgMjAxNCwgVGlkZXBvb2wgUHJvamVjdFxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTsgeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeSBpdCB1bmRlclxuICogdGhlIHRlcm1zIG9mIHRoZSBhc3NvY2lhdGVkIExpY2Vuc2UsIHdoaWNoIGlzIGlkZW50aWNhbCB0byB0aGUgQlNEIDItQ2xhdXNlXG4gKiBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieSB0aGUgT3BlbiBTb3VyY2UgSW5pdGlhdGl2ZSBhdCBvcGVuc291cmNlLm9yZy5cbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsIGJ1dCBXSVRIT1VUXG4gKiBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTU1xuICogRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiBTZWUgdGhlIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqIFxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbTsgaWZcbiAqIG5vdCwgeW91IGNhbiBvYnRhaW4gb25lIGZyb20gVGlkZXBvb2wgUHJvamVjdCBhdCB0aWRlcG9vbC5vcmcuXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqL1xuXG52YXIgRHVyYXRpb247XG5cbmlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuICBEdXJhdGlvbiA9IHdpbmRvdy5EdXJhdGlvbjtcbn1cblxuaWYgKCFEdXJhdGlvbikge1xuICB0aHJvdyBuZXcgRXJyb3IoJ0R1cmF0aW9uLmpzIGlzIGEgcmVxdWlyZWQgZGVwZW5kZW5jeScpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IER1cmF0aW9uOyIsIi8qIFxuICogPT0gQlNEMiBMSUNFTlNFID09XG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQsIFRpZGVwb29sIFByb2plY3RcbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU7IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnkgaXQgdW5kZXJcbiAqIHRoZSB0ZXJtcyBvZiB0aGUgYXNzb2NpYXRlZCBMaWNlbnNlLCB3aGljaCBpcyBpZGVudGljYWwgdG8gdGhlIEJTRCAyLUNsYXVzZVxuICogTGljZW5zZSBhcyBwdWJsaXNoZWQgYnkgdGhlIE9wZW4gU291cmNlIEluaXRpYXRpdmUgYXQgb3BlbnNvdXJjZS5vcmcuXG4gKiBcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLCBidXQgV0lUSE9VVFxuICogQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2YgTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1NcbiAqIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gU2VlIHRoZSBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKiBcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW07IGlmXG4gKiBub3QsIHlvdSBjYW4gb2J0YWluIG9uZSBmcm9tIFRpZGVwb29sIFByb2plY3QgYXQgdGlkZXBvb2wub3JnLlxuICogPT0gQlNEMiBMSUNFTlNFID09XG4gKi9cblxudmFyIF87XG5cbmlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuICBfID0gd2luZG93Ll87XG59XG5lbHNlIHtcbiAgLy8gUmVxdWlyZWQgZm9yIG5vZGUgdGVzdHNcbiAgLy8gV2lsbCBub3QgZ2V0IGJ1bmRsZWQgaW50byBicm93c2VyaWZ5IGJ1aWxkIGJlY2F1c2UgaW5zaWRlIGFuIFwiaWZcIiBibG9ja1xuICBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpO1xufVxuXG5pZiAoIV8pIHtcbiAgdGhyb3cgbmV3IEVycm9yKCdVbmRlcnNjb3JlIG9yIExvZGFzaCBpcyBhIHJlcXVpcmVkIGRlcGVuZGVuY3knKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBfOyIsIi8qIFxuICogPT0gQlNEMiBMSUNFTlNFID09XG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQsIFRpZGVwb29sIFByb2plY3RcbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU7IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnkgaXQgdW5kZXJcbiAqIHRoZSB0ZXJtcyBvZiB0aGUgYXNzb2NpYXRlZCBMaWNlbnNlLCB3aGljaCBpcyBpZGVudGljYWwgdG8gdGhlIEJTRCAyLUNsYXVzZVxuICogTGljZW5zZSBhcyBwdWJsaXNoZWQgYnkgdGhlIE9wZW4gU291cmNlIEluaXRpYXRpdmUgYXQgb3BlbnNvdXJjZS5vcmcuXG4gKiBcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLCBidXQgV0lUSE9VVFxuICogQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2YgTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1NcbiAqIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gU2VlIHRoZSBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKiBcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW07IGlmXG4gKiBub3QsIHlvdSBjYW4gb2J0YWluIG9uZSBmcm9tIFRpZGVwb29sIFByb2plY3QgYXQgdGlkZXBvb2wub3JnLlxuICogPT0gQlNEMiBMSUNFTlNFID09XG4gKi9cblxudmFyIGxvZyA9IHJlcXVpcmUoJy4vbGliL2Jvd3MnKSgnT25lIERheScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGVtaXR0ZXIpIHtcbiAgdmFyIHBvb2wgPSByZXF1aXJlKCcuL3Bvb2wnKTtcblxuICB2YXIgdG9vbHRpcCA9IHJlcXVpcmUoJy4vcGxvdC90b29sdGlwJyk7XG5cbiAgdmFyIE1TX0lOXzI0ID0gODY0MDAwMDA7XG5cbiAgdmFyIGJ1Y2tldCxcbiAgICBpZCxcbiAgICB3aWR0aCwgbWluV2lkdGgsXG4gICAgaGVpZ2h0LCBtaW5IZWlnaHQsXG4gICAgaW1hZ2VzQmFzZVVybCxcbiAgICBndXR0ZXIsXG4gICAgYXhpc0d1dHRlcixcbiAgICBuYXYgPSB7fSxcbiAgICBwb29scyA9IFtdLCBndXR0ZXIsXG4gICAgeFNjYWxlID0gZDMudGltZS5zY2FsZS51dGMoKSxcbiAgICB4QXhpcyA9IGQzLnN2Zy5heGlzKCkuc2NhbGUoeFNjYWxlKS5vcmllbnQoJ3RvcCcpLm91dGVyVGlja1NpemUoMCkuaW5uZXJUaWNrU2l6ZSgxNSkudGlja0Zvcm1hdChkMy50aW1lLmZvcm1hdC51dGMoXCIlLUkgJXBcIikpLFxuICAgIGJlZ2lubmluZ09mRGF0YSwgZW5kT2ZEYXRhLCBkYXRhLCBhbGxEYXRhID0gW10sIGJ1ZmZlciwgZW5kcG9pbnRzLFxuICAgIG1haW5Hcm91cCwgc2Nyb2xsSGFuZGxlVHJpZ2dlciA9IHRydWUsIHRvb2x0aXBzO1xuXG4gIGNvbnRhaW5lci5kYXRhRmlsbCA9IHt9O1xuXG4gIHZhciBkZWZhdWx0cyA9IHtcbiAgICBidWNrZXQ6ICQoJyN0aWRlbGluZUNvbnRhaW5lcicpLFxuICAgIGlkOiAndGlkZWxpbmVTVkcnLFxuICAgIG1pbldpZHRoOiA0MDAsXG4gICAgbWluSGVpZ2h0OiA0MDAsXG4gICAgaW1hZ2VzQmFzZVVybDogJ2ltZycsXG4gICAgbmF2OiB7XG4gICAgICBtaW5OYXZIZWlnaHQ6IDMwLFxuICAgICAgc2Nyb2xsTmF2OiB0cnVlLFxuICAgICAgc2Nyb2xsTmF2SGVpZ2h0OiA0MCxcbiAgICAgIHNjcm9sbFRodW1iUmFkaXVzOiA4LFxuICAgICAgbGF0ZXN0VHJhbnNsYXRpb246IDAsXG4gICAgICBjdXJyZW50VHJhbnNsYXRpb246IDBcbiAgICB9LFxuICAgIGF4aXNHdXR0ZXI6IDQwLFxuICAgIGd1dHRlcjogNDAsXG4gICAgYnVmZmVyOiA1LFxuICAgIHRvb2x0aXA6IHRydWVcbiAgfTtcblxuICBmdW5jdGlvbiBjb250YWluZXIoc2VsZWN0aW9uKSB7XG4gICAgc2VsZWN0aW9uLmVhY2goZnVuY3Rpb24oY3VycmVudERhdGEpIHtcbiAgICAgIC8vIHNlbGVjdCB0aGUgU1ZHIGlmIGl0IGFscmVhZHkgZXhpc3RzXG4gICAgICB2YXIgbWFpblNWRyA9IHNlbGVjdGlvbi5zZWxlY3RBbGwoJ3N2ZycpLmRhdGEoW2N1cnJlbnREYXRhXSk7XG4gICAgICAvLyBvdGhlcndpc2UgY3JlYXRlIGEgbmV3IFNWRyBhbmQgZW50ZXIgICBcbiAgICAgIG1haW5Hcm91cCA9IG1haW5TVkcuZW50ZXIoKS5hcHBlbmQoJ3N2ZycpLmFwcGVuZCgnZycpLmF0dHIoJ2lkJywgJ3RpZGVsaW5lTWFpbicpO1xuXG4gICAgICAvLyB1cGRhdGUgU1ZHIGRpbWVuaW9ucyBhbmQgSURcbiAgICAgIG1haW5TVkcuYXR0cih7XG4gICAgICAgICdpZCc6IGlkLFxuICAgICAgICAnd2lkdGgnOiB3aWR0aCxcbiAgICAgICAgJ2hlaWdodCc6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGhlaWdodCArPSArIG5hdi5heGlzSGVpZ2h0O1xuICAgICAgICAgIGlmIChuYXYuc2Nyb2xsTmF2KSB7XG4gICAgICAgICAgICBoZWlnaHQgKz0gbmF2LnNjcm9sbE5hdkhlaWdodDtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGhlaWdodDtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIG1haW5Hcm91cC5hcHBlbmQoJ3JlY3QnKVxuICAgICAgICAuYXR0cih7XG4gICAgICAgICAgJ2lkJzogJ3Bvb2xzSW52aXNpYmxlUmVjdCcsXG4gICAgICAgICAgJ3dpZHRoJzogd2lkdGgsXG4gICAgICAgICAgJ2hlaWdodCc6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKG5hdi5zY3JvbGxOYXYpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIChoZWlnaHQgLSBuYXYuc2Nyb2xsTmF2SGVpZ2h0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICByZXR1cm4gaGVpZ2h0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgJ29wYWNpdHknOiAwLjBcbiAgICAgICAgfSk7XG5cbiAgICAgIC8vIHNldCB0aGUgZG9tYWluIGFuZCByYW5nZSBmb3IgdGhlIG1haW4gdGlkZWxpbmUgeC1zY2FsZVxuICAgICAgeFNjYWxlLmRvbWFpbihbY29udGFpbmVyLmluaXRpYWxFbmRwb2ludHNbMF0sIGNvbnRhaW5lci5pbml0aWFsRW5kcG9pbnRzWzFdXSlcbiAgICAgICAgLnJhbmdlKFtjb250YWluZXIuYXhpc0d1dHRlcigpLCB3aWR0aF0pO1xuXG4gICAgICBtYWluR3JvdXAuYXBwZW5kKCdnJylcbiAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ2QzLXggZDMtYXhpcycpXG4gICAgICAgIC5hdHRyKCdpZCcsICd0aWRlbGluZVhBeGlzJylcbiAgICAgICAgLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoMCwnICsgKG5hdi5heGlzSGVpZ2h0IC0gMSkgKyAnKScpXG4gICAgICAgIC5jYWxsKHhBeGlzKTtcblxuICAgICAgZDMuc2VsZWN0QWxsKCcjdGlkZWxpbmVYQXhpcyBnLnRpY2sgdGV4dCcpLnN0eWxlKCd0ZXh0LWFuY2hvcicsICdzdGFydCcpLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoNSwxNSknKTtcblxuICAgICAgY29udGFpbmVyLnBvb2xHcm91cCA9IG1haW5Hcm91cC5hcHBlbmQoJ2cnKS5hdHRyKCdpZCcsICd0aWRlbGluZVBvb2xzJyk7XG5cbiAgICAgIG1haW5Hcm91cC5hcHBlbmQoJ2cnKVxuICAgICAgICAuYXR0cignaWQnLCAndGlkZWxpbmVMYWJlbHMnKTtcblxuICAgICAgbWFpbkdyb3VwLmFwcGVuZCgnZycpXG4gICAgICAgIC5hdHRyKCdpZCcsICd0aWRlbGluZVlBeGVzJylcbiAgICAgICAgLmFwcGVuZCgncmVjdCcpXG4gICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAnaWQnOiAneUF4ZXNJbnZpc2libGVSZWN0JyxcbiAgICAgICAgICAnaGVpZ2h0JzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAobmF2LnNjcm9sbE5hdikge1xuICAgICAgICAgICAgICByZXR1cm4gKGhlaWdodCAtIG5hdi5zY3JvbGxOYXZIZWlnaHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIHJldHVybiBoZWlnaHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICAnd2lkdGgnOiBjb250YWluZXIuYXhpc0d1dHRlcigpLFxuICAgICAgICAgICdmaWxsJzogJ3doaXRlJ1xuICAgICAgICB9KTtcblxuICAgICAgaWYgKG5hdi5zY3JvbGxOYXYpIHtcbiAgICAgICAgc2Nyb2xsTmF2ID0gbWFpbkdyb3VwLmFwcGVuZCgnZycpXG4gICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ3ggc2Nyb2xsJylcbiAgICAgICAgICAuYXR0cignaWQnLCAndGlkZWxpbmVTY3JvbGxOYXYnKTtcblxuICAgICAgICBuYXYuc2Nyb2xsU2NhbGUgPSBkMy50aW1lLnNjYWxlLnV0YygpXG4gICAgICAgICAgLmRvbWFpbihbZW5kcG9pbnRzWzBdLCBjb250YWluZXIuY3VycmVudEVuZHBvaW50c1swXV0pXG4gICAgICAgICAgLnJhbmdlKFtjb250YWluZXIuYXhpc0d1dHRlcigpICsgbmF2LnNjcm9sbFRodW1iUmFkaXVzLCB3aWR0aCAtIG5hdi5zY3JvbGxUaHVtYlJhZGl1c10pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLy8gbm9uLWNoYWluYWJsZSBtZXRob2RzXG4gIGNvbnRhaW5lci5nZXREYXRhID0gZnVuY3Rpb24oZW5kcG9pbnRzLCBkaXJlY3Rpb24pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIGVuZHBvaW50cyA9IGNvbnRhaW5lci5pbml0aWFsRW5kcG9pbnRzO1xuICAgICAgZGlyZWN0aW9uID0gJ2JvdGgnO1xuICAgIH1cblxuICAgIHZhciBzdGFydCA9IG5ldyBEYXRlKGVuZHBvaW50c1swXSk7XG4gICAgdmFyIGVuZCA9IG5ldyBEYXRlKGVuZHBvaW50c1sxXSk7XG5cbiAgICBjb250YWluZXIuY3VycmVudEVuZHBvaW50cyA9IFtzdGFydCwgZW5kXTtcblxuICAgIHJlYWRpbmdzID0gXy5maWx0ZXIoZGF0YSwgZnVuY3Rpb24oZGF0YXBvaW50KSB7XG4gICAgICB0ID0gRGF0ZS5wYXJzZShkYXRhcG9pbnQubm9ybWFsVGltZSk7XG4gICAgICBpZiAoZGlyZWN0aW9uID09ICdib3RoJykge1xuICAgICAgICBpZiAoKHQgPj0gc3RhcnQpICYmICh0IDw9IGVuZCkpIHtcbiAgICAgICAgICByZXR1cm4gZGF0YXBvaW50O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChkaXJlY3Rpb24gPT0gJ2xlZnQnKSB7XG4gICAgICAgIGlmICgodCA+PSBzdGFydCkgJiYgKHQgPCBlbmQpKSB7XG4gICAgICAgICAgcmV0dXJuIGRhdGFwb2ludDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZWxzZSBpZiAoZGlyZWN0aW9uID09ICdyaWdodCcpIHtcbiAgICAgICAgaWYgKCh0ID4gc3RhcnQpICYmICh0IDw9IGVuZCkpIHtcbiAgICAgICAgICByZXR1cm4gZGF0YXBvaW50O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmVhZGluZ3M7XG4gIH07XG5cbiAgY29udGFpbmVyLnBhbkZvcndhcmQgPSBmdW5jdGlvbigpIHtcbiAgICBsb2coJ0p1bXBlZCBmb3J3YXJkIGEgZGF5LicpO1xuICAgIG5hdi5jdXJyZW50VHJhbnNsYXRpb24gLT0gd2lkdGggLSBjb250YWluZXIuYXhpc0d1dHRlcigpO1xuICAgIG1haW5Hcm91cC50cmFuc2l0aW9uKCkuZHVyYXRpb24oNTAwKS50d2Vlbignem9vbScsIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGl4ID0gZDMuaW50ZXJwb2xhdGUobmF2LmN1cnJlbnRUcmFuc2xhdGlvbiArIHdpZHRoIC0gY29udGFpbmVyLmF4aXNHdXR0ZXIoKSwgbmF2LmN1cnJlbnRUcmFuc2xhdGlvbik7XG4gICAgICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgICAgICBuYXYucGFuLnRyYW5zbGF0ZShbaXgodCksIDBdKTtcbiAgICAgICAgbmF2LnBhbi5ldmVudChtYWluR3JvdXApO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfTtcblxuICBjb250YWluZXIucGFuQmFjayA9IGZ1bmN0aW9uKCkge1xuICAgIGxvZygnSnVtcGVkIGJhY2sgYSBkYXkuJyk7XG4gICAgbmF2LmN1cnJlbnRUcmFuc2xhdGlvbiArPSB3aWR0aCAtIGNvbnRhaW5lci5heGlzR3V0dGVyKCk7XG4gICAgbWFpbkdyb3VwLnRyYW5zaXRpb24oKS5kdXJhdGlvbig1MDApLnR3ZWVuKCd6b29tJywgZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgaXggPSBkMy5pbnRlcnBvbGF0ZShuYXYuY3VycmVudFRyYW5zbGF0aW9uIC0gd2lkdGggKyBjb250YWluZXIuYXhpc0d1dHRlcigpLCBuYXYuY3VycmVudFRyYW5zbGF0aW9uKTtcbiAgICAgIHJldHVybiBmdW5jdGlvbih0KSB7XG4gICAgICAgIG5hdi5wYW4udHJhbnNsYXRlKFtpeCh0KSwgMF0pO1xuICAgICAgICBuYXYucGFuLmV2ZW50KG1haW5Hcm91cCk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9O1xuXG4gIGNvbnRhaW5lci5uZXdQb29sID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHAgPSBuZXcgcG9vbChjb250YWluZXIpO1xuICAgIHBvb2xzLnB1c2gocCk7XG4gICAgcmV0dXJuIHA7XG4gIH07XG5cbiAgY29udGFpbmVyLmFycmFuZ2VQb29scyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBudW1Qb29scyA9IHBvb2xzLmxlbmd0aDtcbiAgICB2YXIgY3VtV2VpZ2h0ID0gMDtcbiAgICBwb29scy5mb3JFYWNoKGZ1bmN0aW9uKHBvb2wpIHtcbiAgICAgIGN1bVdlaWdodCArPSBwb29sLndlaWdodCgpO1xuICAgIH0pO1xuICAgIC8vIFRPRE86IGFkanVzdCBmb3Igd2hlbiBubyBzY3JvbGxOYXZcbiAgICB2YXIgdG90YWxQb29sc0hlaWdodCA9IFxuICAgICAgY29udGFpbmVyLmhlaWdodCgpIC0gY29udGFpbmVyLmF4aXNIZWlnaHQoKSAtIGNvbnRhaW5lci5zY3JvbGxOYXZIZWlnaHQoKSAtIChudW1Qb29scyAtIDEpICogY29udGFpbmVyLmd1dHRlcigpO1xuICAgIHZhciBwb29sU2NhbGVIZWlnaHQgPSB0b3RhbFBvb2xzSGVpZ2h0L2N1bVdlaWdodDtcbiAgICB2YXIgYWN0dWFsUG9vbHNIZWlnaHQgPSAwO1xuICAgIHBvb2xzLmZvckVhY2goZnVuY3Rpb24ocG9vbCkge1xuICAgICAgcG9vbC5oZWlnaHQocG9vbFNjYWxlSGVpZ2h0KTtcbiAgICAgIGFjdHVhbFBvb2xzSGVpZ2h0ICs9IHBvb2wuaGVpZ2h0KCk7XG4gICAgfSk7XG4gICAgYWN0dWFsUG9vbHNIZWlnaHQgKz0gKG51bVBvb2xzIC0gMSkgKiBjb250YWluZXIuZ3V0dGVyKCk7XG4gICAgdmFyIGN1cnJlbnRZUG9zaXRpb24gPSBjb250YWluZXIuYXhpc0hlaWdodCgpO1xuICAgIHBvb2xzLmZvckVhY2goZnVuY3Rpb24ocG9vbCkge1xuICAgICAgcG9vbC55UG9zaXRpb24oY3VycmVudFlQb3NpdGlvbik7XG4gICAgICBjdXJyZW50WVBvc2l0aW9uICs9IHBvb2wuaGVpZ2h0KCkgKyBjb250YWluZXIuZ3V0dGVyKCk7XG4gICAgfSk7XG4gIH07XG5cbiAgY29udGFpbmVyLnN0b3BMaXN0ZW5pbmcgPSBmdW5jdGlvbigpIHtcbiAgICBlbWl0dGVyLnJlbW92ZUFsbExpc3RlbmVycygnY2FyYlRvb2x0aXBPbicpO1xuICAgIGVtaXR0ZXIucmVtb3ZlQWxsTGlzdGVuZXJzKCdjYXJiVG9vbHRpcE9mZicpO1xuICAgIGVtaXR0ZXIucmVtb3ZlQWxsTGlzdGVuZXJzKCdib2x1c1Rvb2x0aXBPbicpO1xuICAgIGVtaXR0ZXIucmVtb3ZlQWxsTGlzdGVuZXJzKCdib2x1c1Rvb2x0aXBPZmYnKTtcbiAgICBlbWl0dGVyLnJlbW92ZUFsbExpc3RlbmVycygnbm9DYXJiVGltZXN0YW1wJyk7XG5cbiAgICByZXR1cm4gY29udGFpbmVyO1xuICB9O1xuXG4gIGNvbnRhaW5lci5kZXN0cm95ID0gZnVuY3Rpb24oKSB7XG4gICAgJCgnIycgKyB0aGlzLmlkKCkpLnJlbW92ZSgpO1xuICAgIGRlbGV0ZSBwb29sO1xuICB9O1xuXG4gIGNvbnRhaW5lci5kYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGQgPSBuZXcgRGF0ZSh4U2NhbGUuZG9tYWluKClbMF0pO1xuICAgIHJldHVybiBuZXcgRGF0ZShkLnNldFVUQ0hvdXJzKGQuZ2V0VVRDSG91cnMoKSArIDEyKSk7XG4gIH07XG5cbiAgLy8gY2hhaW5hYmxlIG1ldGhvZHNcbiAgY29udGFpbmVyLmRlZmF1bHRzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICBwcm9wZXJ0aWVzID0gZGVmYXVsdHM7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcHJvcGVydGllcyA9IG9iajtcbiAgICB9XG4gICAgdGhpcy5idWNrZXQocHJvcGVydGllcy5idWNrZXQpO1xuICAgIHRoaXMuaWQocHJvcGVydGllcy5pZCk7XG4gICAgdGhpcy5taW5XaWR0aChwcm9wZXJ0aWVzLm1pbldpZHRoKS53aWR0aChwcm9wZXJ0aWVzLndpZHRoKTtcbiAgICB0aGlzLnNjcm9sbE5hdihwcm9wZXJ0aWVzLm5hdi5zY3JvbGxOYXYpO1xuICAgIHRoaXMubWluTmF2SGVpZ2h0KHByb3BlcnRpZXMubmF2Lm1pbk5hdkhlaWdodClcbiAgICAgIC5heGlzSGVpZ2h0KHByb3BlcnRpZXMubmF2Lm1pbk5hdkhlaWdodClcbiAgICAgIC5zY3JvbGxUaHVtYlJhZGl1cyhwcm9wZXJ0aWVzLm5hdi5zY3JvbGxUaHVtYlJhZGl1cylcbiAgICAgIC5zY3JvbGxOYXZIZWlnaHQocHJvcGVydGllcy5uYXYuc2Nyb2xsTmF2SGVpZ2h0KTtcbiAgICB0aGlzLm1pbkhlaWdodChwcm9wZXJ0aWVzLm1pbkhlaWdodCkuaGVpZ2h0KHByb3BlcnRpZXMubWluSGVpZ2h0KTtcbiAgICB0aGlzLmxhdGVzdFRyYW5zbGF0aW9uKHByb3BlcnRpZXMubmF2LmxhdGVzdFRyYW5zbGF0aW9uKVxuICAgICAgLmN1cnJlbnRUcmFuc2xhdGlvbihwcm9wZXJ0aWVzLm5hdi5jdXJyZW50VHJhbnNsYXRpb24pO1xuICAgIHRoaXMuYXhpc0d1dHRlcihwcm9wZXJ0aWVzLmF4aXNHdXR0ZXIpO1xuICAgIHRoaXMuZ3V0dGVyKHByb3BlcnRpZXMuZ3V0dGVyKTtcbiAgICB0aGlzLmJ1ZmZlcihwcm9wZXJ0aWVzLmJ1ZmZlcik7XG4gICAgdGhpcy50b29sdGlwcyhwcm9wZXJ0aWVzLnRvb2x0aXBzKTtcbiAgICB0aGlzLmltYWdlc0Jhc2VVcmwocHJvcGVydGllcy5pbWFnZXNCYXNlVXJsKTtcblxuICAgIHJldHVybiBjb250YWluZXI7XG4gIH07XG5cbiAgY29udGFpbmVyLnNldE5hdiA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBtYXhUcmFuc2xhdGlvbiA9IC14U2NhbGUoZW5kcG9pbnRzWzBdKSArIGF4aXNHdXR0ZXI7XG4gICAgdmFyIG1pblRyYW5zbGF0aW9uID0gLXhTY2FsZShlbmRwb2ludHNbMV0pICsgd2lkdGg7XG4gICAgbmF2LnBhbiA9IGQzLmJlaGF2aW9yLnpvb20oKVxuICAgICAgLnNjYWxlRXh0ZW50KFsxLCAxXSlcbiAgICAgIC54KHhTY2FsZSlcbiAgICAgIC5vbignem9vbScsIGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoKGVuZE9mRGF0YSAtIHhTY2FsZS5kb21haW4oKVsxXSA8IE1TX0lOXzI0KSAmJiAhKGVuZE9mRGF0YS5nZXRUaW1lKCkgPT09IGVuZHBvaW50c1sxXSkpIHtcbiAgICAgICAgICBsb2coJ1JlbmRlcmluZyBuZXcgZGF0YSEgKHJpZ2h0KScpO1xuICAgICAgICAgIHZhciBwbHVzT25lID0gbmV3IERhdGUoY29udGFpbmVyLmVuZE9mRGF0YSgpKTtcbiAgICAgICAgICBwbHVzT25lLnNldERhdGUocGx1c09uZS5nZXREYXRlKCkgKyAxKTtcbiAgICAgICAgICB2YXIgbmV3RGF0YSA9IGNvbnRhaW5lci5nZXREYXRhKFtlbmRPZkRhdGEsIHBsdXNPbmVdLCAncmlnaHQnKTtcbiAgICAgICAgICAvLyB1cGRhdGUgZW5kT2ZEYXRhXG4gICAgICAgICAgaWYgKHBsdXNPbmUgPD0gZW5kcG9pbnRzWzFdKSB7XG4gICAgICAgICAgICBjb250YWluZXIuZW5kT2ZEYXRhKHBsdXNPbmUpOyBcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjb250YWluZXIuZW5kT2ZEYXRhKGVuZHBvaW50c1sxXSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnRhaW5lci5hbGxEYXRhKG5ld0RhdGEpO1xuICAgICAgICAgIGZvciAoaiA9IDA7IGogPCBwb29scy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgcG9vbHNbal0oY29udGFpbmVyLnBvb2xHcm91cCwgY29udGFpbmVyLmFsbERhdGEoKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICgoeFNjYWxlLmRvbWFpbigpWzBdIC0gYmVnaW5uaW5nT2ZEYXRhIDwgTVNfSU5fMjQpICYmICEoYmVnaW5uaW5nT2ZEYXRhLmdldFRpbWUoKSA9PT0gZW5kcG9pbnRzWzBdKSkge1xuICAgICAgICAgIGxvZygnUmVuZGVyaW5nIG5ldyBkYXRhISAobGVmdCknKTtcbiAgICAgICAgICB2YXIgcGx1c09uZSA9IG5ldyBEYXRlKGNvbnRhaW5lci5iZWdpbm5pbmdPZkRhdGEoKSk7XG4gICAgICAgICAgcGx1c09uZS5zZXREYXRlKHBsdXNPbmUuZ2V0RGF0ZSgpIC0gMSk7XG4gICAgICAgICAgdmFyIG5ld0RhdGEgPSBjb250YWluZXIuZ2V0RGF0YShbcGx1c09uZSwgYmVnaW5uaW5nT2ZEYXRhXSwgJ2xlZnQnKTtcbiAgICAgICAgICAvLyB1cGRhdGUgYmVnaW5uaW5nT2ZEYXRhXG4gICAgICAgICAgaWYgKHBsdXNPbmUgPj0gZW5kcG9pbnRzWzBdKSB7XG4gICAgICAgICAgICBjb250YWluZXIuYmVnaW5uaW5nT2ZEYXRhKHBsdXNPbmUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNvbnRhaW5lci5iZWdpbm5pbmdPZkRhdGEoZW5kcG9pbnRzWzBdKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29udGFpbmVyLmFsbERhdGEobmV3RGF0YSk7XG4gICAgICAgICAgZm9yIChqID0gMDsgaiA8IHBvb2xzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICBwb29sc1tqXShjb250YWluZXIucG9vbEdyb3VwLCBjb250YWluZXIuYWxsRGF0YSgpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGUgPSBkMy5ldmVudDtcbiAgICAgICAgaWYgKGUudHJhbnNsYXRlWzBdIDwgbWluVHJhbnNsYXRpb24pIHtcbiAgICAgICAgICBlLnRyYW5zbGF0ZVswXSA9IG1pblRyYW5zbGF0aW9uO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGUudHJhbnNsYXRlWzBdID4gbWF4VHJhbnNsYXRpb24pIHtcbiAgICAgICAgICBlLnRyYW5zbGF0ZVswXSA9IG1heFRyYW5zbGF0aW9uO1xuICAgICAgICB9XG4gICAgICAgIG5hdi5wYW4udHJhbnNsYXRlKFtlLnRyYW5zbGF0ZVswXSwgMF0pO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBvb2xzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgcG9vbHNbaV0ucGFuKGUpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRPRE86IGNoZWNrIGlmIGNvbnRhaW5lciBoYXMgdG9vbHRpcHMgYmVmb3JlIHRyYW5zZm9ybWluZyB0aGVtXG4gICAgICAgIGQzLnNlbGVjdCgnI2QzLXRvb2x0aXAtZ3JvdXAnKS5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyBlLnRyYW5zbGF0ZVswXSArICcsMCknKTtcbiAgICAgICAgZDMuc2VsZWN0KCcuZDMteC5kMy1heGlzJykuY2FsbCh4QXhpcyk7XG4gICAgICAgIGQzLnNlbGVjdEFsbCgnI3RpZGVsaW5lWEF4aXMgZy50aWNrIHRleHQnKS5zdHlsZSgndGV4dC1hbmNob3InLCAnc3RhcnQnKS5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKDUsMTUpJyk7XG4gICAgICAgIGlmIChzY3JvbGxIYW5kbGVUcmlnZ2VyKSB7XG4gICAgICAgICAgZDMuc2VsZWN0KCcjc2Nyb2xsVGh1bWInKS50cmFuc2l0aW9uKCkuZWFzZSgnbGluZWFyJykuYXR0cigneCcsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIGQueCA9IG5hdi5zY3JvbGxTY2FsZSh4U2NhbGUuZG9tYWluKClbMF0pO1xuICAgICAgICAgICAgcmV0dXJuIGQueCAtIG5hdi5zY3JvbGxUaHVtYlJhZGl1cztcbiAgICAgICAgICB9KTsgICAgICAgXG4gICAgICAgIH1cbiAgICAgICAgY29udGFpbmVyLm5hdlN0cmluZyh4U2NhbGUuZG9tYWluKCkpO1xuICAgICAgfSlcbiAgICAgIC5vbignem9vbWVuZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBjb250YWluZXIuY3VycmVudFRyYW5zbGF0aW9uKG5hdi5sYXRlc3RUcmFuc2xhdGlvbik7XG4gICAgICAgIHNjcm9sbEhhbmRsZVRyaWdnZXIgPSB0cnVlO1xuICAgICAgfSk7XG5cbiAgICBtYWluR3JvdXAuY2FsbChuYXYucGFuKTtcblxuICAgIHJldHVybiBjb250YWluZXI7XG4gIH07XG5cbiAgY29udGFpbmVyLnNldFNjcm9sbE5hdiA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0cmFuc2xhdGlvbkFkanVzdG1lbnQgPSBheGlzR3V0dGVyO1xuICAgIHNjcm9sbE5hdi5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKDAsJyAgKyAoaGVpZ2h0IC0gKG5hdi5zY3JvbGxOYXZIZWlnaHQgLyAyKSkgKyAnKScpXG4gICAgICAuYXBwZW5kKCdsaW5lJylcbiAgICAgIC5hdHRyKHtcbiAgICAgICAgJ3gxJzogbmF2LnNjcm9sbFNjYWxlKGVuZHBvaW50c1swXSkgLSBuYXYuc2Nyb2xsVGh1bWJSYWRpdXMsXG4gICAgICAgICd4Mic6IG5hdi5zY3JvbGxTY2FsZShjb250YWluZXIuaW5pdGlhbEVuZHBvaW50c1swXSkgKyBuYXYuc2Nyb2xsVGh1bWJSYWRpdXMsXG4gICAgICAgICd5MSc6IDAsXG4gICAgICAgICd5Mic6IDBcbiAgICAgIH0pO1xuXG4gICAgdmFyIGR4UmlnaHRlc3QgPSBuYXYuc2Nyb2xsU2NhbGUucmFuZ2UoKVsxXTtcbiAgICB2YXIgZHhMZWZ0ZXN0ID0gbmF2LnNjcm9sbFNjYWxlLnJhbmdlKClbMF07XG5cbiAgICB2YXIgZHJhZyA9IGQzLmJlaGF2aW9yLmRyYWcoKVxuICAgICAgLm9yaWdpbihmdW5jdGlvbihkKSB7XG4gICAgICAgIHJldHVybiBkO1xuICAgICAgfSlcbiAgICAgIC5vbignZHJhZ3N0YXJ0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGQzLmV2ZW50LnNvdXJjZUV2ZW50LnN0b3BQcm9wYWdhdGlvbigpOyAvLyBzaWxlbmNlIHRoZSBjbGljay1hbmQtZHJhZyBsaXN0ZW5lclxuICAgICAgfSlcbiAgICAgIC5vbignZHJhZycsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgZC54ICs9IGQzLmV2ZW50LmR4O1xuICAgICAgICBpZiAoZC54ID4gZHhSaWdodGVzdCkge1xuICAgICAgICAgIGQueCA9IGR4UmlnaHRlc3Q7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZC54IDwgZHhMZWZ0ZXN0KSB7XG4gICAgICAgICAgZC54ID0gZHhMZWZ0ZXN0O1xuICAgICAgICB9XG4gICAgICAgIGQzLnNlbGVjdCh0aGlzKS5hdHRyKCd4JywgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC54IC0gbmF2LnNjcm9sbFRodW1iUmFkaXVzOyB9KTtcbiAgICAgICAgdmFyIGRhdGUgPSBuYXYuc2Nyb2xsU2NhbGUuaW52ZXJ0KGQueCk7XG4gICAgICAgIG5hdi5jdXJyZW50VHJhbnNsYXRpb24gKz0gLXhTY2FsZShkYXRlKSArIHRyYW5zbGF0aW9uQWRqdXN0bWVudDtcbiAgICAgICAgc2Nyb2xsSGFuZGxlVHJpZ2dlciA9IGZhbHNlO1xuICAgICAgICBuYXYucGFuLnRyYW5zbGF0ZShbbmF2LmN1cnJlbnRUcmFuc2xhdGlvbiwgMF0pO1xuICAgICAgICBuYXYucGFuLmV2ZW50KG1haW5Hcm91cCk7XG4gICAgICB9KTtcblxuICAgIHNjcm9sbE5hdi5zZWxlY3RBbGwoJ2ltYWdlJylcbiAgICAgIC5kYXRhKFt7J3gnOiBuYXYuc2Nyb2xsU2NhbGUoY29udGFpbmVyLmN1cnJlbnRFbmRwb2ludHNbMF0pLCAneSc6IDB9XSlcbiAgICAgIC5lbnRlcigpXG4gICAgICAuYXBwZW5kKCdpbWFnZScpXG4gICAgICAuYXR0cih7XG4gICAgICAgICd4bGluazpocmVmJzogaW1hZ2VzQmFzZVVybCArICcvdXgvc2Nyb2xsX3RodW1iLnN2ZycsXG4gICAgICAgICd4JzogZnVuY3Rpb24oZCkgeyByZXR1cm4gZC54IC0gbmF2LnNjcm9sbFRodW1iUmFkaXVzOyB9LFxuICAgICAgICAneSc6IC1uYXYuc2Nyb2xsVGh1bWJSYWRpdXMsXG4gICAgICAgICd3aWR0aCc6IG5hdi5zY3JvbGxUaHVtYlJhZGl1cyAqIDIsXG4gICAgICAgICdoZWlnaHQnOiBuYXYuc2Nyb2xsVGh1bWJSYWRpdXMgKiAyLFxuICAgICAgICAnaWQnOiAnc2Nyb2xsVGh1bWInXG4gICAgICB9KVxuICAgICAgLmNhbGwoZHJhZyk7XG5cbiAgICByZXR1cm4gY29udGFpbmVyO1xuICB9O1xuXG4gIGNvbnRhaW5lci5zZXRBdERhdGUgPSBmdW5jdGlvbiAoZGF0ZSkge1xuICAgIG5hdi5jdXJyZW50VHJhbnNsYXRpb24gPSAteFNjYWxlKGRhdGUpICsgYXhpc0d1dHRlcjtcbiAgICBuYXYucGFuLnRyYW5zbGF0ZShbbmF2LmN1cnJlbnRUcmFuc2xhdGlvbiwgMF0pO1xuICAgIG5hdi5wYW4uZXZlbnQobWFpbkdyb3VwKTtcblxuICAgIGNvbnRhaW5lci5uYXZTdHJpbmcoeFNjYWxlLmRvbWFpbigpKTtcblxuICAgIHJldHVybiBjb250YWluZXI7XG4gIH07XG5cbiAgY29udGFpbmVyLm5hdlN0cmluZyA9IGZ1bmN0aW9uKGEpIHtcbiAgICB2YXIgZm9ybWF0RGF0ZSA9IGQzLnRpbWUuZm9ybWF0LnV0YyhcIiVBICUtZCAlQlwiKTtcbiAgICB2YXIgYmVnaW5uaW5nID0gZm9ybWF0RGF0ZShhWzBdKTtcbiAgICB2YXIgZW5kID0gZm9ybWF0RGF0ZShhWzFdKTtcbiAgICB2YXIgbmF2U3RyaW5nO1xuICAgIGlmIChiZWdpbm5pbmcgPT09IGVuZCkge1xuICAgICAgbmF2U3RyaW5nID0gYmVnaW5uaW5nO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIG5hdlN0cmluZyA9IGJlZ2lubmluZyArICcgLSAnICsgZW5kO1xuICAgIH1cbiAgICBlbWl0dGVyLmVtaXQoJ25hdmlnYXRlZCcsIG5hdlN0cmluZyk7XG4gIH07XG5cbiAgY29udGFpbmVyLnNldFRvb2x0aXAgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdG9vbHRpcEdyb3VwID0gbWFpbkdyb3VwLmFwcGVuZCgnZycpXG4gICAgICAuYXR0cignaWQnLCAnZDMtdG9vbHRpcC1ncm91cCcpO1xuICAgIGNvbnRhaW5lci50b29sdGlwcyA9IG5ldyB0b29sdGlwKGNvbnRhaW5lciwgdG9vbHRpcEdyb3VwKS5pZCh0b29sdGlwR3JvdXAuYXR0cignaWQnKSk7XG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICAvLyBnZXR0ZXJzIGFuZCBzZXR0ZXJzXG4gIGNvbnRhaW5lci5idWNrZXQgPSBmdW5jdGlvbih4KSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gYnVja2V0O1xuICAgIGJ1Y2tldCA9IHg7XG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICBjb250YWluZXIuaWQgPSBmdW5jdGlvbih4KSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gaWQ7XG4gICAgaWQgPSB4O1xuICAgIHJldHVybiBjb250YWluZXI7XG4gIH07XG5cbiAgY29udGFpbmVyLndpZHRoID0gZnVuY3Rpb24oeCkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHdpZHRoO1xuICAgIGlmICh4ID49IG1pbldpZHRoKSB7XG4gICAgICBpZiAoeCA+IGJ1Y2tldC53aWR0aCgpKSB7XG4gICAgICAgIHdpZHRoID0gYnVja2V0LndpZHRoKCk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgd2lkdGggPSB4O1xuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHdpZHRoID0gbWluV2lkdGg7XG4gICAgfVxuICAgIHJldHVybiBjb250YWluZXI7XG4gIH07XG5cbiAgY29udGFpbmVyLm1pbldpZHRoID0gZnVuY3Rpb24oeCkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIG1pbldpZHRoO1xuICAgIG1pbldpZHRoID0geDtcbiAgICByZXR1cm4gY29udGFpbmVyO1xuICB9O1xuXG4gIGNvbnRhaW5lci5oZWlnaHQgPSBmdW5jdGlvbih4KSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gaGVpZ2h0O1xuICAgIHZhciB0b3RhbEhlaWdodCA9IHggKyBjb250YWluZXIuYXhpc0hlaWdodCgpO1xuICAgIGlmIChuYXYuc2Nyb2xsTmF2KSB7XG4gICAgICB0b3RhbEhlaWdodCArPSBjb250YWluZXIuc2Nyb2xsTmF2SGVpZ2h0KCk7XG4gICAgfVxuICAgIGlmICh0b3RhbEhlaWdodCA+PSBtaW5IZWlnaHQpIHtcbiAgICAgIGlmICh0b3RhbEhlaWdodCA+IGJ1Y2tldC5oZWlnaHQoKSkge1xuICAgICAgICBoZWlnaHQgPSBidWNrZXQuaGVpZ2h0KCkgLSBjb250YWluZXIuYXhpc0hlaWdodCgpO1xuICAgICAgICBpZiAobmF2LnNjcm9sbE5hdikge1xuICAgICAgICAgIGhlaWdodCAtPSBjb250YWluZXIuc2Nyb2xsTmF2SGVpZ2h0KCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBoZWlnaHQgPSB4OyBcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBoZWlnaHQgPSBtaW5IZWlnaHQ7XG4gICAgfVxuICAgIHJldHVybiBjb250YWluZXI7XG4gIH07XG5cbiAgY29udGFpbmVyLm1pbkhlaWdodCA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBtaW5IZWlnaHQ7XG4gICAgbWluSGVpZ2h0ID0geDtcbiAgICByZXR1cm4gY29udGFpbmVyO1xuICB9O1xuXG4gIGNvbnRhaW5lci5pbWFnZXNCYXNlVXJsID0gZnVuY3Rpb24oeCkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGltYWdlc0Jhc2VVcmw7XG4gICAgaW1hZ2VzQmFzZVVybCA9IHg7XG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICAvLyBuYXYgZ2V0dGVycyBhbmQgc2V0dGVyc1xuICBjb250YWluZXIuYXhpc0hlaWdodCA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBuYXYuYXhpc0hlaWdodDtcbiAgICBpZiAoeCA+PSBuYXYubWluTmF2SGVpZ2h0KSB7XG4gICAgICBuYXYuYXhpc0hlaWdodCA9IHg7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgbmF2LmF4aXNIZWlnaHQgPSBuYXYubWluTmF2SGVpZ2h0O1xuICAgIH1cbiAgICByZXR1cm4gY29udGFpbmVyO1xuICB9O1xuXG4gIGNvbnRhaW5lci5taW5OYXZIZWlnaHQgPSBmdW5jdGlvbih4KSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gbmF2Lm1pbk5hdkhlaWdodDtcbiAgICBuYXYubWluTmF2SGVpZ2h0ID0geDtcbiAgICByZXR1cm4gY29udGFpbmVyO1xuICB9O1xuXG4gIC8vIG5hdi5zY3JvbGxOYXYgZ2V0dGVycyBhbmQgc2V0dGVyc1xuICBjb250YWluZXIuc2Nyb2xsTmF2ID0gZnVuY3Rpb24oYikge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIG5hdi5zY3JvbGxOYXY7XG4gICAgbmF2LnNjcm9sbE5hdiA9IGI7XG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICBjb250YWluZXIuc2Nyb2xsVGh1bWJSYWRpdXMgPSBmdW5jdGlvbih4KSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gbmF2LnNjcm9sbFRodW1iUmFkaXVzO1xuICAgIG5hdi5zY3JvbGxUaHVtYlJhZGl1cyA9IHg7XG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICBjb250YWluZXIuc2Nyb2xsTmF2SGVpZ2h0ID0gZnVuY3Rpb24oeCkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIG5hdi5zY3JvbGxOYXZIZWlnaHQ7XG4gICAgaWYgKHggPj0gbmF2Lm1pbk5hdkhlaWdodCkge1xuICAgICAgbmF2LnNjcm9sbE5hdkhlaWdodCA9IHg7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgbmF2LnNjcm9sbE5hdkhlaWdodCA9IG5hdi5taW5OYXZIZWlnaHQ7XG4gICAgfVxuICAgIHJldHVybiBjb250YWluZXI7XG4gIH07XG5cbiAgY29udGFpbmVyLnNjcm9sbFNjYWxlID0gZnVuY3Rpb24oZikge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIG5hdi5zY3JvbGxTY2FsZTtcbiAgICBuYXYuc2Nyb2xsU2NhbGUgPSBmO1xuICAgIHJldHVybiBjb250YWluZXI7XG4gIH07XG5cbiAgY29udGFpbmVyLnBhbiA9IGZ1bmN0aW9uKGYpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBuYXYucGFuO1xuICAgIG5hdi5wYW4gPSBmO1xuICAgIHJldHVybiBjb250YWluZXI7XG4gIH07XG5cbiAgY29udGFpbmVyLmxhdGVzdFRyYW5zbGF0aW9uID0gZnVuY3Rpb24oeCkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIG5hdi5sYXRlc3RUcmFuc2xhdGlvbjtcbiAgICBuYXYubGF0ZXN0VHJhbnNsYXRpb24gPSB4O1xuICAgIHJldHVybiBjb250YWluZXI7XG4gIH07XG5cbiAgY29udGFpbmVyLmN1cnJlbnRUcmFuc2xhdGlvbiA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBuYXYuY3VycmVudFRyYW5zbGF0aW9uO1xuICAgIG5hdi5jdXJyZW50VHJhbnNsYXRpb24gPSB4O1xuICAgIHJldHVybiBjb250YWluZXI7XG4gIH07XG5cbiAgLy8gcG9vbHMgZ2V0dGVyIGFuZCBzZXR0ZXJcbiAgY29udGFpbmVyLnBvb2xzID0gZnVuY3Rpb24oYSkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHBvb2xzO1xuICAgIHBvb2xzID0gYTtcbiAgICByZXR1cm4gY29udGFpbmVyO1xuICB9O1xuXG4gIGNvbnRhaW5lci5heGlzR3V0dGVyID0gZnVuY3Rpb24oeCkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGF4aXNHdXR0ZXI7XG4gICAgYXhpc0d1dHRlciA9IHg7XG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICBjb250YWluZXIuZ3V0dGVyID0gZnVuY3Rpb24oeCkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGd1dHRlcjtcbiAgICBndXR0ZXIgPSB4O1xuICAgIHJldHVybiBjb250YWluZXI7XG4gIH07XG5cbiAgLy8gc2NhbGVzIGFuZCBheGVzIGdldHRlcnMgYW5kIHNldHRlcnNcbiAgY29udGFpbmVyLnhTY2FsZSA9IGZ1bmN0aW9uKGYpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiB4U2NhbGU7XG4gICAgeFNjYWxlID0gZjtcbiAgICByZXR1cm4gY29udGFpbmVyO1xuICB9O1xuXG4gIGNvbnRhaW5lci54QXhpcyA9IGZ1bmN0aW9uKGYpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiB4QXhpcztcbiAgICB4QXhpcyA9IGY7XG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICAvLyBkYXRhIGdldHRlcnMgYW5kIHNldHRlcnNcbiAgY29udGFpbmVyLmJlZ2lubmluZ09mRGF0YSA9IGZ1bmN0aW9uKGQpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBiZWdpbm5pbmdPZkRhdGE7XG4gICAgYmVnaW5uaW5nT2ZEYXRhID0gbmV3IERhdGUoZCk7XG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICBjb250YWluZXIuZW5kT2ZEYXRhID0gZnVuY3Rpb24oZCkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGVuZE9mRGF0YTtcbiAgICBlbmRPZkRhdGEgPSBuZXcgRGF0ZShkKTtcbiAgICByZXR1cm4gY29udGFpbmVyO1xuICB9O1xuXG4gIGNvbnRhaW5lci5kYXRhID0gZnVuY3Rpb24oYSkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGRhdGE7XG5cbiAgICBkYXRhID0gYTtcblxuICAgIHZhciBmaXJzdCA9IERhdGUucGFyc2UoYVswXS5ub3JtYWxUaW1lKTtcbiAgICB2YXIgbGFzdCA9IERhdGUucGFyc2UoYVthLmxlbmd0aCAtIDFdLm5vcm1hbFRpbWUpO1xuXG4gICAgdmFyIG1pbnVzT25lID0gbmV3IERhdGUobGFzdCk7XG4gICAgbWludXNPbmUuc2V0RGF0ZShtaW51c09uZS5nZXREYXRlKCkgLSAxKTtcbiAgICBjb250YWluZXIuaW5pdGlhbEVuZHBvaW50cyA9IFttaW51c09uZSwgbGFzdF07XG4gICAgY29udGFpbmVyLmN1cnJlbnRFbmRwb2ludHMgPSBjb250YWluZXIuaW5pdGlhbEVuZHBvaW50cztcblxuICAgIGNvbnRhaW5lci5iZWdpbm5pbmdPZkRhdGEobWludXNPbmUpLmVuZE9mRGF0YShsYXN0KTtcblxuICAgIGVuZHBvaW50cyA9IFtmaXJzdCwgbGFzdF07XG4gICAgY29udGFpbmVyLmVuZHBvaW50cyA9IGVuZHBvaW50cztcblxuICAgIHJldHVybiBjb250YWluZXI7XG4gIH07XG5cbiAgY29udGFpbmVyLmFsbERhdGEgPSBmdW5jdGlvbih4LCBhKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gYWxsRGF0YTtcbiAgICBpZiAoIWEpIHtcbiAgICAgIGEgPSB4U2NhbGUuZG9tYWluKCk7XG4gICAgfVxuICAgIGFsbERhdGEgPSBhbGxEYXRhLmNvbmNhdCh4KTtcbiAgICBsb2coJ0xlbmd0aCBvZiBhbGxEYXRhIGFycmF5IGlzJywgYWxsRGF0YS5sZW5ndGgpO1xuICAgIHZhciBwbHVzID0gbmV3IERhdGUoYVsxXSk7XG4gICAgcGx1cy5zZXREYXRlKHBsdXMuZ2V0RGF0ZSgpICsgY29udGFpbmVyLmJ1ZmZlcigpKTtcbiAgICB2YXIgbWludXMgPSBuZXcgRGF0ZShhWzBdKTtcbiAgICBtaW51cy5zZXREYXRlKG1pbnVzLmdldERhdGUoKSAtIGNvbnRhaW5lci5idWZmZXIoKSk7XG4gICAgaWYgKGJlZ2lubmluZ09mRGF0YSA8IG1pbnVzKSB7XG4gICAgICBjb250YWluZXIuYmVnaW5uaW5nT2ZEYXRhKG1pbnVzKTsgXG4gICAgICBhbGxEYXRhID0gXy5maWx0ZXIoYWxsRGF0YSwgZnVuY3Rpb24oZGF0YXBvaW50KSB7XG4gICAgICAgIHZhciB0ID0gRGF0ZS5wYXJzZShkYXRhcG9pbnQubm9ybWFsVGltZSk7XG4gICAgICAgIGlmICh0ID49IG1pbnVzKSB7XG4gICAgICAgICAgcmV0dXJuIHQ7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICBpZiAoZW5kT2ZEYXRhID4gcGx1cykge1xuICAgICAgY29udGFpbmVyLmVuZE9mRGF0YShwbHVzKTtcbiAgICAgIGFsbERhdGEgPSBfLmZpbHRlcihhbGxEYXRhLCBmdW5jdGlvbihkYXRhcG9pbnQpIHtcbiAgICAgICAgdmFyIHQgPSBEYXRlLnBhcnNlKGRhdGFwb2ludC5ub3JtYWxUaW1lKTtcbiAgICAgICAgaWYgKHQgPD0gcGx1cykge1xuICAgICAgICAgIHJldHVybiB0O1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgYWxsRGF0YSA9IF8uc29ydEJ5KGFsbERhdGEsIGZ1bmN0aW9uKGQpIHtcbiAgICAgIHJldHVybiBuZXcgRGF0ZShkLm5vcm1hbFRpbWUpLnZhbHVlT2YoKTtcbiAgICB9KTtcbiAgICBhbGxEYXRhID0gXy51bmlxKGFsbERhdGEsIHRydWUpO1xuICAgIHJldHVybiBjb250YWluZXI7XG4gIH07XG5cbiAgY29udGFpbmVyLmJ1ZmZlciA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBidWZmZXI7XG4gICAgYnVmZmVyID0geDtcbiAgICByZXR1cm4gY29udGFpbmVyO1xuICB9O1xuXG4gIGNvbnRhaW5lci50b29sdGlwcyA9IGZ1bmN0aW9uKGIpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiB0b29sdGlwcztcbiAgICB0b29sdGlwcyA9IGI7XG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICByZXR1cm4gY29udGFpbmVyO1xufTsiLCIvKiBcbiAqID09IEJTRDIgTElDRU5TRSA9PVxuICogQ29weXJpZ2h0IChjKSAyMDE0LCBUaWRlcG9vbCBQcm9qZWN0XG4gKiBcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOyB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5IGl0IHVuZGVyXG4gKiB0aGUgdGVybXMgb2YgdGhlIGFzc29jaWF0ZWQgTGljZW5zZSwgd2hpY2ggaXMgaWRlbnRpY2FsIHRvIHRoZSBCU0QgMi1DbGF1c2VcbiAqIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5IHRoZSBPcGVuIFNvdXJjZSBJbml0aWF0aXZlIGF0IG9wZW5zb3VyY2Uub3JnLlxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCwgYnV0IFdJVEhPVVRcbiAqIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTXG4gKiBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuIFNlZSB0aGUgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICogXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtOyBpZlxuICogbm90LCB5b3UgY2FuIG9idGFpbiBvbmUgZnJvbSBUaWRlcG9vbCBQcm9qZWN0IGF0IHRpZGVwb29sLm9yZy5cbiAqID09IEJTRDIgTElDRU5TRSA9PVxuICovXG5cbnZhciBEdXJhdGlvbiA9IHJlcXVpcmUoJy4uL2xpYi9kdXJhdGlvbicpO1xudmFyIGxvZyA9IHJlcXVpcmUoJy4uL2xpYi9ib3dzJykoJ0Jhc2FsJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ocG9vbCwgb3B0cykge1xuXG4gIHZhciBRVUFSVEVSID0gJyDCvCcsIEhBTEYgPSAnIMK9JywgVEhSRUVfUVVBUlRFUiA9ICcgwr4nLCBUSElSRCA9ICcg4oWTJywgVFdPX1RISVJEUyA9ICcg4oWUJztcblxuICBvcHRzID0gb3B0cyB8fCB7fTtcblxuICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgY2xhc3Nlczoge1xuICAgICAgJ3JlZyc6IHsndG9vbHRpcCc6ICdiYXNhbF90b29sdGlwX3JlZy5zdmcnLCAnaGVpZ2h0JzogMjB9LFxuICAgICAgJ3RlbXAnOiB7J3Rvb2x0aXAnOiAnYmFzYWxfdG9vbHRpcF90ZW1wX2xhcmdlLnN2ZycsICdoZWlnaHQnOiA0MH1cbiAgICB9LFxuICAgIHRvb2x0aXBXaWR0aDogMTgwLFxuICAgIHhTY2FsZTogcG9vbC54U2NhbGUoKS5jb3B5KCksXG4gICAgcGF0aFN0cm9rZTogMS41LFxuICAgIG9wYWNpdHk6IDAuMyxcbiAgICBvcGFjaXR5RGVsdGE6IDAuMVxuICB9O1xuXG4gIF8uZGVmYXVsdHMob3B0cywgZGVmYXVsdHMpO1xuXG4gIGZ1bmN0aW9uIGJhc2FsKHNlbGVjdGlvbikge1xuICAgIHNlbGVjdGlvbi5lYWNoKGZ1bmN0aW9uKGN1cnJlbnREYXRhKSB7XG5cbiAgICAgIC8vIHRvIHByZXZlbnQgYmxhbmsgcmVjdGFuZ2xlIGF0IGJlZ2lubmluZyBvZiBkb21haW5cbiAgICAgIHZhciBpbmRleCA9IG9wdHMuZGF0YS5pbmRleE9mKGN1cnJlbnREYXRhWzBdKTtcbiAgICAgIC8vIHdoZW4gbmVhciBsZWZ0IGVkZ2UgY3VycmVudERhdGFbMF0gd2lsbCBoYXZlIGluZGV4IDAsIHNvIHdlIGRvbid0IHdhbnQgdG8gZGVjcmVtZW50IGl0XG4gICAgICBpZiAoaW5kZXggIT09IDApIHtcbiAgICAgICAgaW5kZXgtLTtcbiAgICAgIH1cbiAgICAgIHdoaWxlICgoaW5kZXggPj0gMCkgJiYgKG9wdHMuZGF0YVtpbmRleF0udml6VHlwZSAhPT0gJ2FjdHVhbCcpKSB7XG4gICAgICAgIGluZGV4LS07XG4gICAgICB9XG4gICAgICAvLyB3aGVuIGluZGV4ID09PSAwIG1pZ2h0IGNhdGNoIGEgbm9uLWJhc2FsXG4gICAgICBpZiAob3B0cy5kYXRhW2luZGV4XS50eXBlID09PSAnYmFzYWwtcmF0ZS1zZWdtZW50Jykge1xuICAgICAgICBjdXJyZW50RGF0YS51bnNoaWZ0KG9wdHMuZGF0YVtpbmRleF0pO1xuICAgICAgfVxuXG4gICAgICB2YXIgbGluZSA9IGQzLnN2Zy5saW5lKClcbiAgICAgICAgLngoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC54OyB9KVxuICAgICAgICAueShmdW5jdGlvbihkKSB7IHJldHVybiBkLnk7IH0pXG4gICAgICAgIC5pbnRlcnBvbGF0ZSgnc3RlcC1hZnRlcicpO1xuXG4gICAgICB2YXIgYWN0dWFsID0gXy53aGVyZShjdXJyZW50RGF0YSwgeyd2aXpUeXBlJzogJ2FjdHVhbCd9KTtcbiAgICAgIHZhciB1bmRlbGl2ZXJlZCA9IF8ud2hlcmUob3B0cy5kYXRhLCB7J3ZpelR5cGUnOiAndW5kZWxpdmVyZWQnLCAnZGVsaXZlcnlUeXBlJzogJ3NjaGVkdWxlZCd9KTtcblxuICAgICAgLy8gVE9ETzogcmVtb3ZlIHRoaXMgd2hlbiB3ZSBoYXZlIGd1YXJhbnRlZWQgdW5pcXVlIElEcyBmb3IgZWFjaCBiYXNhbCByYXRlIHNlZ21lbnQgYWdhaW5cbiAgICAgIGN1cnJlbnREYXRhLmZvckVhY2goZnVuY3Rpb24oZCkge1xuICAgICAgICBpZiAoKGQuaWQuc2VhcmNoKCdfYWN0dWFsJykgPT09IC0xKSAmJiAoZC5pZC5zZWFyY2goJ191bmRlbGl2ZXJlZCcpID09PSAtMSkpIHtcbiAgICAgICAgICBkLmlkID0gZC5pZCArICdfJyArIGQuc3RhcnQucmVwbGFjZSgvOi9nLCAnJykgKyAnXycgKyBkLnZpelR5cGU7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICB2YXIgcmVjdHMgPSBkMy5zZWxlY3QodGhpcylcbiAgICAgICAgLnNlbGVjdEFsbCgnZycpXG4gICAgICAgIC5kYXRhKGN1cnJlbnREYXRhLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgcmV0dXJuIGQuaWQ7XG4gICAgICAgIH0pO1xuICAgICAgdmFyIHJlY3RHcm91cHMgPSByZWN0cy5lbnRlcigpXG4gICAgICAgIC5hcHBlbmQoJ2cnKVxuICAgICAgICAuYXR0cignY2xhc3MnLCAnZDMtYmFzYWwtZ3JvdXAnKVxuICAgICAgICAuYXR0cignaWQnLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgcmV0dXJuICdiYXNhbF9ncm91cF8nICsgZC5pZDtcbiAgICAgICAgfSk7XG4gICAgICByZWN0R3JvdXBzLmZpbHRlcihmdW5jdGlvbihkKXtcbiAgICAgICAgaWYgKGQudml6VHlwZSA9PT0gJ2FjdHVhbCcpIHtcbiAgICAgICAgICByZXR1cm4gZDtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgICAgLmFwcGVuZCgncmVjdCcpXG4gICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAnd2lkdGgnOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICByZXR1cm4gYmFzYWwud2lkdGgoZCk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICAnaGVpZ2h0JzogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgdmFyIGhlaWdodCA9IHBvb2wuaGVpZ2h0KCkgLSBvcHRzLnlTY2FsZShkLnZhbHVlKTtcbiAgICAgICAgICAgIGlmIChoZWlnaHQgPCAwKSB7XG4gICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIHJldHVybiBoZWlnaHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICAneCc6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHJldHVybiBvcHRzLnhTY2FsZShuZXcgRGF0ZShkLm5vcm1hbFRpbWUpKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgICd5JzogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgcmV0dXJuIG9wdHMueVNjYWxlKGQudmFsdWUpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgJ29wYWNpdHknOiAnMC4zJyxcbiAgICAgICAgICAnY2xhc3MnOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICB2YXIgY2xhc3NlcztcbiAgICAgICAgICAgIGlmIChkLmRlbGl2ZXJ5VHlwZSA9PT0gJ3RlbXAnKSB7XG4gICAgICAgICAgICAgIGNsYXNzZXMgPSAnZDMtYmFzYWwgZDMtcmVjdC1iYXNhbCBkMy1iYXNhbC10ZW1wJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICBjbGFzc2VzID0gJ2QzLWJhc2FsIGQzLXJlY3QtYmFzYWwnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGQuZGVsaXZlcmVkICE9PSAwKSB7XG4gICAgICAgICAgICAgIGNsYXNzZXMgKz0gJyBkMy1yZWN0LWJhc2FsLW5vbnplcm8nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGNsYXNzZXM7XG4gICAgICAgICAgfSxcbiAgICAgICAgICAnaWQnOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2Jhc2FsXycgKyBkLmlkO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICByZWN0R3JvdXBzLmZpbHRlcihmdW5jdGlvbihkKSB7XG4gICAgICAgIGlmIChkLmRlbGl2ZXJ5VHlwZSAhPT0gJ3RlbXAnKSB7XG4gICAgICAgICAgcmV0dXJuIGQ7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAgIC5hcHBlbmQoJ3JlY3QnKVxuICAgICAgICAuYXR0cih7XG4gICAgICAgICAgJ3dpZHRoJzogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgcmV0dXJuIGJhc2FsLndpZHRoKGQpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgJ2hlaWdodCc6IHBvb2wuaGVpZ2h0KCksXG4gICAgICAgICAgJ3gnOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICByZXR1cm4gb3B0cy54U2NhbGUobmV3IERhdGUoZC5ub3JtYWxUaW1lKSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICAneSc6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHJldHVybiBvcHRzLnlTY2FsZS5yYW5nZSgpWzFdO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgJ2NsYXNzJzogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgaWYgKGQudml6VHlwZSA9PT0gJ3VuZGVsaXZlcmVkJykge1xuICAgICAgICAgICAgICByZXR1cm4gJ2QzLWJhc2FsIGQzLWJhc2FsLWludmlzaWJsZSBkMy1iYXNhbC10ZW1wJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICByZXR1cm4gJ2QzLWJhc2FsIGQzLWJhc2FsLWludmlzaWJsZSc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICAnaWQnOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2Jhc2FsX2ludmlzaWJsZV8nICsgZC5pZDtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgcmVjdEdyb3Vwcy5maWx0ZXIoZnVuY3Rpb24oZCkge1xuICAgICAgICAgIGlmIChkLmRlbGl2ZXJlZCAhPT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGQ7XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICAuc2VsZWN0QWxsKCcuZDMtYmFzYWwtaW52aXNpYmxlJylcbiAgICAgICAgLmNsYXNzZWQoJ2QzLWJhc2FsLW5vbnplcm8nLCB0cnVlKTtcbiAgICAgIHJlY3RzLmV4aXQoKS5yZW1vdmUoKTtcblxuICAgICAgdmFyIGJhc2FsR3JvdXAgPSBkMy5zZWxlY3QodGhpcyk7XG5cbiAgICAgIHZhciBhY3R1YWxQb2ludHMgPSBbXTtcblxuICAgICAgYWN0dWFsLmZvckVhY2goZnVuY3Rpb24oZCkge1xuICAgICAgICBhY3R1YWxQb2ludHMucHVzaCh7XG4gICAgICAgICAgJ3gnOiBvcHRzLnhTY2FsZShuZXcgRGF0ZShkLm5vcm1hbFRpbWUpKSxcbiAgICAgICAgICAneSc6IG9wdHMueVNjYWxlKGQudmFsdWUpIC0gb3B0cy5wYXRoU3Ryb2tlIC8gMixcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICd4Jzogb3B0cy54U2NhbGUobmV3IERhdGUoZC5ub3JtYWxFbmQpKSxcbiAgICAgICAgICAneSc6IG9wdHMueVNjYWxlKGQudmFsdWUpIC0gb3B0cy5wYXRoU3Ryb2tlIC8gMixcbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgICAgZDMuc2VsZWN0QWxsKCcuZDMtcGF0aC1iYXNhbCcpLnJlbW92ZSgpO1xuXG4gICAgICBkMy5zZWxlY3QodGhpcykuYXBwZW5kKCdwYXRoJylcbiAgICAgICAgLmF0dHIoe1xuICAgICAgICAnZCc6IGxpbmUoYWN0dWFsUG9pbnRzKSxcbiAgICAgICAgJ2NsYXNzJzogJ2QzLWJhc2FsIGQzLXBhdGgtYmFzYWwnXG4gICAgICB9KTtcblxuICAgICAgaWYgKHVuZGVsaXZlcmVkLmxlbmd0aCAhPT0gMCkge1xuICAgICAgICB2YXIgdW5kZWxpdmVyZWRTZXF1ZW5jZXMgPSBbXTtcbiAgICAgICAgdmFyIGNvbnRpZ3VvdXMgPSBbXTtcbiAgICAgICAgdW5kZWxpdmVyZWQuZm9yRWFjaChmdW5jdGlvbihzZWdtZW50LCBpLCBzZWdtZW50cykge1xuICAgICAgICAgIGlmICgoaSA8IChzZWdtZW50cy5sZW5ndGggLSAxKSkgJiYgKHNlZ21lbnQuZW5kID09PSBzZWdtZW50c1tpICsgMV0uc3RhcnQpKSB7XG4gICAgICAgICAgICBzZWdtZW50LmNvbnRpZ3VvdXNXaXRoID0gJ25leHQnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmICgoaSAhPT0gMCkgJiYgKHNlZ21lbnRzW2kgLSAxXS5lbmQgPT09IHNlZ21lbnQuc3RhcnQpKSB7XG4gICAgICAgICAgICBzZWdtZW50LmNvbnRpZ3VvdXNXaXRoID0gJ3ByZXZpb3VzJztcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzZWdtZW50LmNvbnRpZ3VvdXNXaXRoID0gJ25vbmUnO1xuICAgICAgICAgICAgdW5kZWxpdmVyZWRTZXF1ZW5jZXMucHVzaChbc2VnbWVudF0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHVuZGVsaXZlcmVkID0gdW5kZWxpdmVyZWQucmV2ZXJzZSgpO1xuXG4gICAgICAgIHZhciBhbmNob3JzID0gXy53aGVyZSh1bmRlbGl2ZXJlZCwgeydjb250aWd1b3VzV2l0aCc6ICdwcmV2aW91cyd9KTtcblxuICAgICAgICBhbmNob3JzLmZvckVhY2goZnVuY3Rpb24oYW5jaG9yKSB7XG4gICAgICAgICAgdmFyIGluZGV4ID0gdW5kZWxpdmVyZWQuaW5kZXhPZihhbmNob3IpO1xuICAgICAgICAgIGNvbnRpZ3VvdXMucHVzaCh1bmRlbGl2ZXJlZFtpbmRleF0pO1xuICAgICAgICAgIGluZGV4Kys7XG4gICAgICAgICAgd2hpbGUgKHVuZGVsaXZlcmVkW2luZGV4XS5jb250aWd1b3VzV2l0aCA9PT0gJ25leHQnKSB7XG4gICAgICAgICAgICBjb250aWd1b3VzLnB1c2godW5kZWxpdmVyZWRbaW5kZXhdKTtcbiAgICAgICAgICAgIGluZGV4Kys7XG4gICAgICAgICAgICBpZiAoaW5kZXggPiAodW5kZWxpdmVyZWQubGVuZ3RoIC0gMSkpIHtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHVuZGVsaXZlcmVkU2VxdWVuY2VzLnB1c2goY29udGlndW91cyk7XG4gICAgICAgICAgY29udGlndW91cyA9IFtdO1xuICAgICAgICB9KTtcblxuICAgICAgICB1bmRlbGl2ZXJlZFNlcXVlbmNlcy5mb3JFYWNoKGZ1bmN0aW9uKHNlcSkge1xuICAgICAgICAgIHNlcSA9IHNlcS5yZXZlcnNlKCk7XG4gICAgICAgICAgdmFyIHBhdGhQb2ludHMgPSBfLm1hcChzZXEsIGZ1bmN0aW9uKHNlZ21lbnQpIHtcbiAgICAgICAgICAgIHJldHVybiBbe1xuICAgICAgICAgICAgICAneCc6IG9wdHMueFNjYWxlKG5ldyBEYXRlKHNlZ21lbnQubm9ybWFsVGltZSkpLFxuICAgICAgICAgICAgICAneSc6IG9wdHMueVNjYWxlKHNlZ21lbnQudmFsdWUpXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAneCc6IG9wdHMueFNjYWxlKG5ldyBEYXRlKHNlZ21lbnQubm9ybWFsRW5kKSksXG4gICAgICAgICAgICAgICd5Jzogb3B0cy55U2NhbGUoc2VnbWVudC52YWx1ZSlcbiAgICAgICAgICAgIH1dO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHBhdGhQb2ludHMgPSBfLmZsYXR0ZW4ocGF0aFBvaW50cyk7XG4gICAgICAgICAgcGF0aFBvaW50cyA9IF8udW5pcShwYXRoUG9pbnRzLCBmdW5jdGlvbihwb2ludCkge1xuICAgICAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHBvaW50KTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGJhc2FsR3JvdXAuYXBwZW5kKCdwYXRoJylcbiAgICAgICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAgICAgJ2QnOiBsaW5lKHBhdGhQb2ludHMpLFxuICAgICAgICAgICAgICAnY2xhc3MnOiAnZDMtYmFzYWwgZDMtcGF0aC1iYXNhbCBkMy1wYXRoLWJhc2FsLXVuZGVsaXZlcmVkJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGJhc2FsLmxpbmtfdGVtcChfLndoZXJlKGFjdHVhbCwgeydkZWxpdmVyeVR5cGUnOiAndGVtcCd9KSwgdW5kZWxpdmVyZWQpO1xuICAgICAgfVxuXG4gICAgICAvLyB0b29sdGlwc1xuICAgICAgZDMuc2VsZWN0QWxsKCcuZDMtYmFzYWwtaW52aXNpYmxlJykub24oJ21vdXNlb3ZlcicsIGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgaW52aXNpUmVjdCA9IGQzLnNlbGVjdCh0aGlzKTtcbiAgICAgICAgdmFyIGlkID0gaW52aXNpUmVjdC5hdHRyKCdpZCcpLnJlcGxhY2UoJ2Jhc2FsX2ludmlzaWJsZV8nLCAnJyk7XG4gICAgICAgIHZhciBkID0gZDMuc2VsZWN0KCcjYmFzYWxfZ3JvdXBfJyArIGlkKS5kYXR1bSgpO1xuICAgICAgICBpZiAoaW52aXNpUmVjdC5jbGFzc2VkKCdkMy1iYXNhbC10ZW1wJykpIHtcbiAgICAgICAgICB2YXIgdGVtcEQgPSBfLmNsb25lKF8uZmluZFdoZXJlKGFjdHVhbCwgeydkZWxpdmVyeVR5cGUnOiAndGVtcCcsICdpZCc6IGQubGluay5yZXBsYWNlKCdsaW5rXycsICcnKX0pKTtcbiAgICAgICAgICB0ZW1wRC5pZCA9IGQuaWQ7XG4gICAgICAgICAgYmFzYWwuYWRkVG9vbHRpcCh0ZW1wRCwgJ3RlbXAnLCBkKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBiYXNhbC5hZGRUb29sdGlwKGQsICdyZWcnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaW52aXNpUmVjdC5jbGFzc2VkKCdkMy1iYXNhbC1ub256ZXJvJykpIHtcbiAgICAgICAgICBpZiAoaW52aXNpUmVjdC5jbGFzc2VkKCdkMy1iYXNhbC10ZW1wJykpIHtcbiAgICAgICAgICAgIGQzLnNlbGVjdCgnI2Jhc2FsXycgKyBkLmxpbmsucmVwbGFjZSgnbGlua18nLCAnJykpLmF0dHIoJ29wYWNpdHknLCBvcHRzLm9wYWNpdHkgKyBvcHRzLm9wYWNpdHlEZWx0YSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZDMuc2VsZWN0KCcjYmFzYWxfJyArIGlkKS5hdHRyKCdvcGFjaXR5Jywgb3B0cy5vcGFjaXR5ICsgb3B0cy5vcGFjaXR5RGVsdGEpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBkMy5zZWxlY3RBbGwoJy5kMy1iYXNhbC1pbnZpc2libGUnKS5vbignbW91c2VvdXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGludmlzaVJlY3QgPSBkMy5zZWxlY3QodGhpcyk7XG4gICAgICAgIHZhciBpZCA9IGludmlzaVJlY3QuYXR0cignaWQnKS5yZXBsYWNlKCdiYXNhbF9pbnZpc2libGVfJywgJycpO1xuICAgICAgICB2YXIgZCA9IGQzLnNlbGVjdCgnI2Jhc2FsX2dyb3VwXycgKyBpZCkuZGF0dW0oKTtcbiAgICAgICAgZDMuc2VsZWN0KCcjdG9vbHRpcF8nICsgaWQpLnJlbW92ZSgpO1xuICAgICAgICBpZiAoaW52aXNpUmVjdC5jbGFzc2VkKCdkMy1iYXNhbC10ZW1wJykpIHtcbiAgICAgICAgICBkMy5zZWxlY3QoJyNiYXNhbF8nICsgZC5saW5rLnJlcGxhY2UoJ2xpbmtfJywgJycpKS5hdHRyKCdvcGFjaXR5Jywgb3B0cy5vcGFjaXR5KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBkMy5zZWxlY3QoJyNiYXNhbF8nICsgaWQpLmF0dHIoJ29wYWNpdHknLCBvcHRzLm9wYWNpdHkpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGJhc2FsLmxpbmtfdGVtcCA9IGZ1bmN0aW9uKHRvTGluaywgcmVmZXJlbmNlQXJyYXkpIHtcbiAgICByZWZlcmVuY2VBcnJheSA9IHJlZmVyZW5jZUFycmF5LnNsaWNlKDApO1xuICAgIHJlZmVyZW5jZUFycmF5ID0gXy5zb3J0QnkocmVmZXJlbmNlQXJyYXksIGZ1bmN0aW9uKHNlZ21lbnQpIHtcbiAgICAgIHJldHVybiBEYXRlLnBhcnNlKHNlZ21lbnQubm9ybWFsVGltZSk7XG4gICAgfSk7XG4gICAgdG9MaW5rLmZvckVhY2goZnVuY3Rpb24oc2VnbWVudCwgaSwgc2VnbWVudHMpIHtcbiAgICAgIHZhciBzdGFydCA9IF8uZmluZFdoZXJlKHJlZmVyZW5jZUFycmF5LCB7J25vcm1hbFRpbWUnOiBzZWdtZW50Lm5vcm1hbFRpbWV9KTtcbiAgICAgIGlmIChzdGFydCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGxvZyhzZWdtZW50LCByZWZlcmVuY2VBcnJheSk7XG4gICAgICB9XG4gICAgICB2YXIgc3RhcnRJbmRleCA9IHJlZmVyZW5jZUFycmF5LmluZGV4T2Yoc3RhcnQpO1xuICAgICAgaWYgKChzdGFydEluZGV4IDwgKHJlZmVyZW5jZUFycmF5Lmxlbmd0aCAtIDEpKSAmJiAoc3RhcnQuZW5kID09PSByZWZlcmVuY2VBcnJheVtzdGFydEluZGV4ICsgMV0uc3RhcnQpKSB7XG4gICAgICAgIHZhciBlbmQgPSBfLmZpbmRXaGVyZShyZWZlcmVuY2VBcnJheSwgeydub3JtYWxFbmQnOiBzZWdtZW50Lm5vcm1hbEVuZH0pO1xuICAgICAgICB2YXIgZW5kSW5kZXggPSByZWZlcmVuY2VBcnJheS5pbmRleE9mKGVuZCk7XG4gICAgICAgIHZhciBpbmRleCA9IHN0YXJ0SW5kZXg7XG4gICAgICAgIHdoaWxlIChpbmRleCA8PSBlbmRJbmRleCkge1xuICAgICAgICAgIHJlZmVyZW5jZUFycmF5W2luZGV4XS5saW5rID0gJ2xpbmtfJyArIHNlZ21lbnQuaWQ7XG4gICAgICAgICAgaW5kZXgrKztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHJlZmVyZW5jZUFycmF5W3N0YXJ0SW5kZXhdLmxpbmsgPSAnbGlua18nICsgc2VnbWVudC5pZDtcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcblxuICBiYXNhbC50aW1lc3BhbiA9IGZ1bmN0aW9uKGQpIHtcbiAgICB2YXIgc3RhcnQgPSBEYXRlLnBhcnNlKGQubm9ybWFsVGltZSk7XG4gICAgdmFyIGVuZCA9IERhdGUucGFyc2UoZC5ub3JtYWxFbmQpO1xuICAgIHZhciBkaWZmID0gZW5kIC0gc3RhcnQ7XG4gICAgdmFyIGR1ciA9IER1cmF0aW9uLnBhcnNlKGRpZmYgKyAnbXMnKTtcbiAgICB2YXIgaG91cnMgPSBkdXIuaG91cnMoKTtcbiAgICB2YXIgbWludXRlcyA9IGR1ci5taW51dGVzKCkgLSAoaG91cnMgKiA2MCk7XG4gICAgaWYgKGhvdXJzICE9PSAwKSB7XG4gICAgICBpZiAoaG91cnMgPT09IDEpIHtcbiAgICAgICAgc3dpdGNoKG1pbnV0ZXMpIHtcbiAgICAgICAgICBjYXNlIDA6IHJldHVybiAnb3ZlciAnICsgaG91cnMgKyAnIGhyJztcbiAgICAgICAgICBjYXNlIDE1OiByZXR1cm4gJ292ZXIgJyArIGhvdXJzICsgUVVBUlRFUiArICcgaHInO1xuICAgICAgICAgIGNhc2UgMjA6IHJldHVybiAnb3ZlciAnICsgaG91cnMgKyBUSElSRCArICcgaHInO1xuICAgICAgICAgIGNhc2UgMzA6IHJldHVybiAnb3ZlciAnICsgaG91cnMgKyBIQUxGICsgJyBocic7XG4gICAgICAgICAgY2FzZSA0MDogcmV0dXJuICdvdmVyICcgKyBob3VycyArIFRXT19USElSRFMgKyAnIGhyJztcbiAgICAgICAgICBjYXNlIDQ1OiByZXR1cm4gJ292ZXIgJyArIGhvdXJzICsgVEhSRUVfUVVBUlRFUiArICcgaHInO1xuICAgICAgICAgIGRlZmF1bHQ6IHJldHVybiAnb3ZlciAnICsgaG91cnMgKyAnIGhyICcgKyBtaW51dGVzICsgJyBtaW4nO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgc3dpdGNoKG1pbnV0ZXMpIHtcbiAgICAgICAgICBjYXNlIDA6IHJldHVybiAnb3ZlciAnICsgaG91cnMgKyAnIGhycyc7XG4gICAgICAgICAgY2FzZSAxNTogcmV0dXJuICdvdmVyICcgKyBob3VycyArIFFVQVJURVIgKyAnIGhycyc7XG4gICAgICAgICAgY2FzZSAyMDogcmV0dXJuICdvdmVyICcgKyBob3VycyArIFRISVJEICsgJyBocnMnO1xuICAgICAgICAgIGNhc2UgMzA6IHJldHVybiAnb3ZlciAnICsgaG91cnMgKyBIQUxGICsgJyBocnMnO1xuICAgICAgICAgIGNhc2UgNDA6IHJldHVybiAnb3ZlciAnICsgaG91cnMgKyBUV09fVEhJUkRTICsgJyBocnMnO1xuICAgICAgICAgIGNhc2UgNDU6IHJldHVybiAnb3ZlciAnICsgaG91cnMgKyBUSFJFRV9RVUFSVEVSICsgJyBocnMnO1xuICAgICAgICAgIGRlZmF1bHQ6IHJldHVybiAnb3ZlciAnICsgaG91cnMgKyAnIGhycyAnICsgbWludXRlcyArICcgbWluJztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHJldHVybiAnb3ZlciAnICsgbWludXRlcyArICcgbWluJztcbiAgICB9XG4gIH07XG5cbiAgYmFzYWwud2lkdGggPSBmdW5jdGlvbihkKSB7XG4gICAgcmV0dXJuIG9wdHMueFNjYWxlKG5ldyBEYXRlKGQubm9ybWFsRW5kKSkgLSBvcHRzLnhTY2FsZShuZXcgRGF0ZShkLm5vcm1hbFRpbWUpKTtcbiAgfTtcblxuICBiYXNhbC5hZGRUb29sdGlwID0gZnVuY3Rpb24oZCwgY2F0ZWdvcnksIHVuRCkge1xuICAgIHZhciB0b29sdGlwSGVpZ2h0ID0gb3B0cy5jbGFzc2VzW2NhdGVnb3J5XS5oZWlnaHQ7XG4gICAgZDMuc2VsZWN0KCcjJyArICdkMy10b29sdGlwLWdyb3VwX2Jhc2FsJykuY2FsbCh0b29sdGlwcyxcbiAgICAgICAgZCxcbiAgICAgICAgLy8gdG9vbHRpcFhQb3NcbiAgICAgICAgb3B0cy54U2NhbGUoRGF0ZS5wYXJzZShkLm5vcm1hbFRpbWUpKSxcbiAgICAgICAgJ2Jhc2FsJyxcbiAgICAgICAgLy8gdGltZXN0YW1wXG4gICAgICAgIGZhbHNlLFxuICAgICAgICBvcHRzLmNsYXNzZXNbY2F0ZWdvcnldWyd0b29sdGlwJ10sXG4gICAgICAgIG9wdHMudG9vbHRpcFdpZHRoLFxuICAgICAgICB0b29sdGlwSGVpZ2h0LFxuICAgICAgICAvLyBpbWFnZVhcbiAgICAgICAgb3B0cy54U2NhbGUoRGF0ZS5wYXJzZShkLm5vcm1hbFRpbWUpKSAtIG9wdHMudG9vbHRpcFdpZHRoIC8gMiArIGJhc2FsLndpZHRoKGQpIC8gMixcbiAgICAgICAgLy8gaW1hZ2VZXG4gICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciB5ID0gb3B0cy55U2NhbGUoZC52YWx1ZSkgLSB0b29sdGlwSGVpZ2h0ICogMjtcbiAgICAgICAgICBpZiAoeSA8IDApIHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB5O1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgLy8gdGV4dFhcbiAgICAgICAgb3B0cy54U2NhbGUoRGF0ZS5wYXJzZShkLm5vcm1hbFRpbWUpKSArIGJhc2FsLndpZHRoKGQpIC8gMixcbiAgICAgICAgLy8gdGV4dFlcbiAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIHkgPSBvcHRzLnlTY2FsZShkLnZhbHVlKSAtIHRvb2x0aXBIZWlnaHQgKiAyO1xuICAgICAgICAgIGlmIChjYXRlZ29yeSA9PT0gJ3RlbXAnKSB7XG4gICAgICAgICAgICBpZiAoeSA8IDApIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHRvb2x0aXBIZWlnaHQgKiAoMyAvIDEwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICByZXR1cm4gb3B0cy55U2NhbGUoZC52YWx1ZSkgLSB0b29sdGlwSGVpZ2h0ICogMS43O1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGlmICh5IDwgMCkge1xuICAgICAgICAgICAgICByZXR1cm4gdG9vbHRpcEhlaWdodCAvIDI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG9wdHMueVNjYWxlKGQudmFsdWUpIC0gdG9vbHRpcEhlaWdodCAqIDEuNTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmIChkLnZhbHVlID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gJzAuMFUnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBkLnZhbHVlICsgJ1UnO1xuICAgICAgICAgIH1cbiAgICAgICAgfSgpLFxuICAgICAgICBiYXNhbC50aW1lc3BhbihkKSk7XG4gICAgaWYgKGNhdGVnb3J5ID09PSAndGVtcCcpIHtcbiAgICAgIGQzLnNlbGVjdCgnI3Rvb2x0aXBfJyArIGQuaWQpLnNlbGVjdCgnLmQzLXRvb2x0aXAtdGV4dC1ncm91cCcpLmFwcGVuZCgndGV4dCcpXG4gICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAnY2xhc3MnOiAnZDMtdG9vbHRpcC10ZXh0IGQzLWJhc2FsJyxcbiAgICAgICAgICAneCc6IG9wdHMueFNjYWxlKERhdGUucGFyc2UoZC5ub3JtYWxUaW1lKSkgKyBiYXNhbC53aWR0aChkKSAvIDIsXG4gICAgICAgICAgJ3knOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciB5ID0gb3B0cy55U2NhbGUoZC52YWx1ZSkgLSB0b29sdGlwSGVpZ2h0ICogMjtcbiAgICAgICAgICAgIGlmICh5IDwgMCkge1xuICAgICAgICAgICAgICByZXR1cm4gdG9vbHRpcEhlaWdodCAqICg3IC8gMTApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIHJldHVybiBvcHRzLnlTY2FsZShkLnZhbHVlKSAtIHRvb2x0aXBIZWlnaHQgKiAxLjM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICAuYXBwZW5kKCd0c3BhbicpXG4gICAgICAgIC50ZXh0KCcoJyArIHVuRC52YWx1ZSArICdVIHNjaGVkdWxlZCknKTtcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIGJhc2FsO1xufTtcbiIsIi8qIFxuICogPT0gQlNEMiBMSUNFTlNFID09XG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQsIFRpZGVwb29sIFByb2plY3RcbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU7IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnkgaXQgdW5kZXJcbiAqIHRoZSB0ZXJtcyBvZiB0aGUgYXNzb2NpYXRlZCBMaWNlbnNlLCB3aGljaCBpcyBpZGVudGljYWwgdG8gdGhlIEJTRCAyLUNsYXVzZVxuICogTGljZW5zZSBhcyBwdWJsaXNoZWQgYnkgdGhlIE9wZW4gU291cmNlIEluaXRpYXRpdmUgYXQgb3BlbnNvdXJjZS5vcmcuXG4gKiBcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLCBidXQgV0lUSE9VVFxuICogQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2YgTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1NcbiAqIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gU2VlIHRoZSBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKiBcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW07IGlmXG4gKiBub3QsIHlvdSBjYW4gb2J0YWluIG9uZSBmcm9tIFRpZGVwb29sIFByb2plY3QgYXQgdGlkZXBvb2wub3JnLlxuICogPT0gQlNEMiBMSUNFTlNFID09XG4gKi9cblxudmFyIER1cmF0aW9uID0gcmVxdWlyZSgnLi4vbGliL2R1cmF0aW9uJyk7XG52YXIgbG9nID0gcmVxdWlyZSgnLi4vbGliL2Jvd3MnKSgnQm9sdXMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihwb29sLCBvcHRzKSB7XG5cbiAgdmFyIFFVQVJURVIgPSAnIMK8JywgSEFMRiA9ICcgwr0nLCBUSFJFRV9RVUFSVEVSID0gJyDCvicsIFRISVJEID0gJyDihZMnLCBUV09fVEhJUkRTID0gJyDihZQnO1xuXG4gIHZhciBNU19JTl9PTkUgPSA2MDAwMDtcblxuICBvcHRzID0gb3B0cyB8fCB7fTtcblxuICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgY2xhc3Nlczoge1xuICAgICAgJ3Vuc3BlY2lhbCc6IHsndG9vbHRpcCc6ICd0b29sdGlwX2JvbHVzX3NtYWxsLnN2ZycsICd3aWR0aCc6IDcwLCAnaGVpZ2h0JzogMjR9LFxuICAgICAgJ3R3by1saW5lJzogeyd0b29sdGlwJzogJ3Rvb2x0aXBfYm9sdXNfbGFyZ2Uuc3ZnJywgJ3dpZHRoJzogOTgsICdoZWlnaHQnOiAzOX0sXG4gICAgICAndGhyZWUtbGluZSc6IHsndG9vbHRpcCc6ICd0b29sdGlwX2JvbHVzX2V4dHJhbGFyZ2Uuc3ZnJywgJ3dpZHRoJzogOTgsICdoZWlnaHQnOiA1OH1cbiAgICB9LFxuICAgIHhTY2FsZTogcG9vbC54U2NhbGUoKS5jb3B5KCksXG4gICAgd2lkdGg6IDEyLFxuICAgIGJvbHVzU3Ryb2tlOiAyLFxuICAgIHRyaWFuZ2xlU2l6ZTogNixcbiAgICBjYXJiVG9vbHRpcENhdGNoZXI6IDVcbiAgfTtcblxuICBfLmRlZmF1bHRzKG9wdHMsIGRlZmF1bHRzKTtcblxuICB2YXIgY2FyYlRvb2x0aXBCdWZmZXIgPSBvcHRzLmNhcmJUb29sdGlwQ2F0Y2hlciAqIE1TX0lOX09ORTtcblxuICAvLyBjYXRjaCBib2x1cyB0b29sdGlwcyBldmVudHNcbiAgb3B0cy5lbWl0dGVyLm9uKCdjYXJiVG9vbHRpcE9uJywgZnVuY3Rpb24odCkge1xuICAgIHZhciBiID0gXy5maW5kKG9wdHMuZGF0YSwgZnVuY3Rpb24oZCkge1xuICAgICAgdmFyIGJvbHVzVCA9IERhdGUucGFyc2UoZC5ub3JtYWxUaW1lKTtcbiAgICAgIGlmIChib2x1c1QgPj0gKHQgLSBjYXJiVG9vbHRpcEJ1ZmZlcikgJiYgKGJvbHVzVCA8PSAodCArIGNhcmJUb29sdGlwQnVmZmVyKSkpIHtcbiAgICAgICAgcmV0dXJuIGQ7XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKGIpIHtcbiAgICAgIGJvbHVzLmFkZFRvb2x0aXAoYiwgYm9sdXMuZ2V0VG9vbHRpcENhdGVnb3J5KGIpKTtcbiAgICAgIG9wdHMuZW1pdHRlci5lbWl0KCdub0NhcmJUaW1lc3RhbXAnLCB0cnVlKTtcbiAgICB9XG4gIH0pO1xuICBvcHRzLmVtaXR0ZXIub24oJ2NhcmJUb29sdGlwT2ZmJywgZnVuY3Rpb24odCkge1xuICAgIHZhciBiID0gXy5maW5kKG9wdHMuZGF0YSwgZnVuY3Rpb24oZCkge1xuICAgICAgdmFyIGJvbHVzVCA9IERhdGUucGFyc2UoZC5ub3JtYWxUaW1lKTtcbiAgICAgIGlmIChib2x1c1QgPj0gKHQgLSBjYXJiVG9vbHRpcEJ1ZmZlcikgJiYgKGJvbHVzVCA8PSAodCArIGNhcmJUb29sdGlwQnVmZmVyKSkpIHtcbiAgICAgICAgcmV0dXJuIGQ7XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKGIpIHtcbiAgICAgIGQzLnNlbGVjdCgnI3Rvb2x0aXBfJyArIGIuaWQpLnJlbW92ZSgpO1xuICAgICAgb3B0cy5lbWl0dGVyLmVtaXQoJ25vQ2FyYlRpbWVzdGFtcCcsIGZhbHNlKTtcbiAgICB9XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIGJvbHVzKHNlbGVjdGlvbikge1xuICAgIHNlbGVjdGlvbi5lYWNoKGZ1bmN0aW9uKGN1cnJlbnREYXRhKSB7XG4gICAgICB2YXIgYm9sdXNlcyA9IGQzLnNlbGVjdCh0aGlzKVxuICAgICAgICAuc2VsZWN0QWxsKCdnJylcbiAgICAgICAgLmRhdGEoY3VycmVudERhdGEsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICByZXR1cm4gZC5pZDtcbiAgICAgICAgfSk7XG4gICAgICB2YXIgYm9sdXNHcm91cHMgPSBib2x1c2VzLmVudGVyKClcbiAgICAgICAgLmFwcGVuZCgnZycpXG4gICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAnY2xhc3MnOiAnZDMtYm9sdXMtZ3JvdXAnXG4gICAgICAgIH0pO1xuICAgICAgdmFyIHRvcCA9IG9wdHMueVNjYWxlLnJhbmdlKClbMF07XG4gICAgICAvLyBib2x1c2VzIHdoZXJlIGRlbGl2ZXJlZCA9IHJlY29tbWVuZGVkXG4gICAgICBib2x1c0dyb3Vwcy5hcHBlbmQoJ3JlY3QnKVxuICAgICAgICAuYXR0cih7XG4gICAgICAgICAgJ3gnOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICByZXR1cm4gYm9sdXMueChkKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgICd5JzogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgcmV0dXJuIG9wdHMueVNjYWxlKGQudmFsdWUpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgJ3dpZHRoJzogb3B0cy53aWR0aCxcbiAgICAgICAgICAnaGVpZ2h0JzogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRvcCAtIG9wdHMueVNjYWxlKGQudmFsdWUpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgJ2NsYXNzJzogJ2QzLXJlY3QtYm9sdXMgZDMtYm9sdXMnLFxuICAgICAgICAgICdpZCc6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHJldHVybiAnYm9sdXNfJyArIGQuaWQ7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIC8vIGJvbHVzZXMgd2hlcmUgcmVjb21tZW5kYXRpb24gYW5kIGRlbGl2ZXJ5IGRpZmZlclxuICAgICAgdmFyIGJvdHRvbSA9IHRvcCAtIG9wdHMuYm9sdXNTdHJva2UgLyAyO1xuICAgICAgLy8gYm9sdXNlcyB3aGVyZSByZWNvbW1lbmRlZCA+IGRlbGl2ZXJlZFxuICAgICAgdmFyIHVuZGVycmlkZSA9IGJvbHVzR3JvdXBzLmZpbHRlcihmdW5jdGlvbihkKSB7XG4gICAgICAgIGlmIChkLnJlY29tbWVuZGVkID4gZC52YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBkO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHVuZGVycmlkZS5hcHBlbmQoJ3JlY3QnKVxuICAgICAgICAuYXR0cih7XG4gICAgICAgICAgJ3gnOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICByZXR1cm4gYm9sdXMueChkKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgICd5JzogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgcmV0dXJuIG9wdHMueVNjYWxlKGQucmVjb21tZW5kZWQpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgJ3dpZHRoJzogb3B0cy53aWR0aCxcbiAgICAgICAgICAnaGVpZ2h0JzogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgcmV0dXJuIG9wdHMueVNjYWxlKGQudmFsdWUpIC0gb3B0cy55U2NhbGUoZC5yZWNvbW1lbmRlZCk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICAnY2xhc3MnOiAnZDMtcmVjdC1yZWNvbW1lbmRlZCBkMy1ib2x1cycsXG4gICAgICAgICAgJ2lkJzogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgcmV0dXJuICdib2x1c18nICsgZC5pZDtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgLy8gYm9sdXNlcyB3aGVyZSBkZWxpdmVyZWQgPiByZWNvbW1lbmRlZFxuICAgICAgdmFyIG92ZXJyaWRlID0gYm9sdXNHcm91cHMuZmlsdGVyKGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgaWYgKGQudmFsdWUgPiBkLnJlY29tbWVuZGVkKSB7XG4gICAgICAgICAgcmV0dXJuIGQ7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgb3ZlcnJpZGUuYXBwZW5kKCdyZWN0JylcbiAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICd4JzogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgcmV0dXJuIGJvbHVzLngoZCk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICAneSc6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHJldHVybiBvcHRzLnlTY2FsZShkLnJlY29tbWVuZGVkKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgICd3aWR0aCc6IG9wdHMud2lkdGgsXG4gICAgICAgICAgJ2hlaWdodCc6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHJldHVybiB0b3AgLSBvcHRzLnlTY2FsZShkLnJlY29tbWVuZGVkKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgICdzdHJva2Utd2lkdGgnOiBvcHRzLmJvbHVzU3Ryb2tlLFxuICAgICAgICAgICdjbGFzcyc6ICdkMy1yZWN0LXJlY29tbWVuZGVkIGQzLWJvbHVzJyxcbiAgICAgICAgICAnaWQnOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2JvbHVzXycgKyBkLmlkO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICBvdmVycmlkZS5hcHBlbmQoJ3BhdGgnKVxuICAgICAgICAuYXR0cih7XG4gICAgICAgICAgJ2QnOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICB2YXIgbGVmdEVkZ2UgPSBib2x1cy54KGQpICsgb3B0cy5ib2x1c1N0cm9rZSAvIDI7XG4gICAgICAgICAgICB2YXIgcmlnaHRFZGdlID0gbGVmdEVkZ2UgKyBvcHRzLndpZHRoIC0gb3B0cy5ib2x1c1N0cm9rZTtcbiAgICAgICAgICAgIHZhciBib2x1c0hlaWdodCA9IG9wdHMueVNjYWxlKGQudmFsdWUpICsgb3B0cy5ib2x1c1N0cm9rZSAvIDI7XG4gICAgICAgICAgICByZXR1cm4gXCJNXCIgKyBsZWZ0RWRnZSArICcgJyArIGJvdHRvbSArIFwiTFwiICsgcmlnaHRFZGdlICsgJyAnICsgYm90dG9tICsgXCJMXCIgKyByaWdodEVkZ2UgKyAnICcgKyBib2x1c0hlaWdodCArIFwiTFwiICsgbGVmdEVkZ2UgKyAnICcgKyBib2x1c0hlaWdodCArIFwiWlwiO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgJ3N0cm9rZS13aWR0aCc6IG9wdHMuYm9sdXNTdHJva2UsXG4gICAgICAgICAgJ2NsYXNzJzogJ2QzLXBhdGgtYm9sdXMgZDMtYm9sdXMnLFxuICAgICAgICAgICdpZCc6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHJldHVybiAnYm9sdXNfJyArIGQuaWQ7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIC8vIHNxdWFyZS0gYW5kIGR1YWwtd2F2ZSBib2x1c2VzXG4gICAgICB2YXIgZXh0ZW5kZWRCb2x1c2VzID0gYm9sdXNHcm91cHMuZmlsdGVyKGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgaWYgKGQuZXh0ZW5kZWQpIHtcbiAgICAgICAgICByZXR1cm4gZDtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBleHRlbmRlZEJvbHVzZXMuYXBwZW5kKCdwYXRoJylcbiAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICdkJzogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgdmFyIHJpZ2h0RWRnZSA9IGJvbHVzLngoZCkgKyBvcHRzLndpZHRoO1xuICAgICAgICAgICAgdmFyIGRvc2VIZWlnaHQgPSBvcHRzLnlTY2FsZShkLmV4dGVuZGVkRGVsaXZlcnkpICsgb3B0cy5ib2x1c1N0cm9rZSAvIDI7XG4gICAgICAgICAgICB2YXIgZG9zZUVuZCA9IG9wdHMueFNjYWxlKERhdGUucGFyc2UoZC5ub3JtYWxUaW1lKSArIGQuZHVyYXRpb24pIC0gb3B0cy50cmlhbmdsZVNpemUgLyAyO1xuICAgICAgICAgICAgcmV0dXJuIFwiTVwiICsgcmlnaHRFZGdlICsgJyAnICsgZG9zZUhlaWdodCArIFwiTFwiICsgZG9zZUVuZCArICcgJyArIGRvc2VIZWlnaHQ7XG4gICAgICAgICAgfSxcbiAgICAgICAgICAnc3Ryb2tlLXdpZHRoJzogb3B0cy5ib2x1c1N0cm9rZSxcbiAgICAgICAgICAnY2xhc3MnOiAnZDMtcGF0aC1leHRlbmRlZCBkMy1ib2x1cycsXG4gICAgICAgICAgJ2lkJzogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgcmV0dXJuICdib2x1c18nICsgZC5pZDtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgZXh0ZW5kZWRCb2x1c2VzLmFwcGVuZCgncGF0aCcpXG4gICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAnZCc6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHZhciBkb3NlSGVpZ2h0ID0gb3B0cy55U2NhbGUoZC5leHRlbmRlZERlbGl2ZXJ5KSArIG9wdHMuYm9sdXNTdHJva2UgLyAyO1xuICAgICAgICAgICAgdmFyIGRvc2VFbmQgPSBvcHRzLnhTY2FsZShEYXRlLnBhcnNlKGQubm9ybWFsVGltZSkgKyBkLmR1cmF0aW9uKSAtIG9wdHMudHJpYW5nbGVTaXplO1xuICAgICAgICAgICAgcmV0dXJuIGJvbHVzLnRyaWFuZ2xlKGRvc2VFbmQsIGRvc2VIZWlnaHQpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgJ3N0cm9rZS13aWR0aCc6IG9wdHMuYm9sdXNTdHJva2UsXG4gICAgICAgICAgJ2NsYXNzJzogJ2QzLXBhdGgtZXh0ZW5kZWQtdHJpYW5nbGUgZDMtYm9sdXMnLFxuICAgICAgICAgICdpZCc6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHJldHVybiAnYm9sdXNfJyArIGQuaWQ7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIGJvbHVzZXMuZXhpdCgpLnJlbW92ZSgpO1xuXG4gICAgICAvLyB0b29sdGlwc1xuICAgICAgZDMuc2VsZWN0QWxsKCcuZDMtcmVjdC1ib2x1cywgLmQzLXJlY3QtcmVjb21tZW5kZWQnKS5vbignbW91c2VvdmVyJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBkID0gZDMuc2VsZWN0KHRoaXMpLmRhdHVtKCk7XG4gICAgICAgIHZhciB0ID0gRGF0ZS5wYXJzZShkLm5vcm1hbFRpbWUpO1xuICAgICAgICBib2x1cy5hZGRUb29sdGlwKGQsIGJvbHVzLmdldFRvb2x0aXBDYXRlZ29yeShkKSk7XG4gICAgICAgIG9wdHMuZW1pdHRlci5lbWl0KCdib2x1c1Rvb2x0aXBPbicsIHQpO1xuICAgICAgfSk7XG4gICAgICBkMy5zZWxlY3RBbGwoJy5kMy1yZWN0LWJvbHVzLCAuZDMtcmVjdC1yZWNvbW1lbmRlZCcpLm9uKCdtb3VzZW91dCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgZCA9IF8uY2xvbmUoZDMuc2VsZWN0KHRoaXMpLmRhdHVtKCkpO1xuICAgICAgICB2YXIgdCA9IERhdGUucGFyc2UoZC5ub3JtYWxUaW1lKTtcbiAgICAgICAgZDMuc2VsZWN0KCcjdG9vbHRpcF8nICsgZC5pZCkucmVtb3ZlKCk7XG4gICAgICAgIG9wdHMuZW1pdHRlci5lbWl0KCdib2x1c1Rvb2x0aXBPZmYnLCB0KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgYm9sdXMuZ2V0VG9vbHRpcENhdGVnb3J5ID0gZnVuY3Rpb24oZCkge1xuICAgIHZhciBjYXRlZ29yeTtcbiAgICBpZiAoKChkLnJlY29tbWVuZGVkID09PSBudWxsKSB8fCAoZC5yZWNvbW1lbmRlZCA9PT0gZC52YWx1ZSkpICYmICFkLmV4dGVuZGVkKSB7XG4gICAgICBjYXRlZ29yeSA9ICd1bnNwZWNpYWwnO1xuICAgIH1cbiAgICBlbHNlIGlmICgoZC5yZWNvbW1lbmRlZCAhPT0gZC52YWx1ZSkgJiYgZC5leHRlbmRlZCkge1xuICAgICAgY2F0ZWdvcnkgPSAndGhyZWUtbGluZSc7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgY2F0ZWdvcnkgPSAndHdvLWxpbmUnO1xuICAgIH1cbiAgICByZXR1cm4gY2F0ZWdvcnk7XG4gIH07XG5cbiAgYm9sdXMuYWRkVG9vbHRpcCA9IGZ1bmN0aW9uKGQsIGNhdGVnb3J5KSB7XG4gICAgdmFyIHRvb2x0aXBXaWR0aCA9IG9wdHMuY2xhc3Nlc1tjYXRlZ29yeV0ud2lkdGg7XG4gICAgdmFyIHRvb2x0aXBIZWlnaHQgPSBvcHRzLmNsYXNzZXNbY2F0ZWdvcnldLmhlaWdodDtcbiAgICBkMy5zZWxlY3QoJyMnICsgJ2QzLXRvb2x0aXAtZ3JvdXBfYm9sdXMnKVxuICAgICAgLmNhbGwodG9vbHRpcHMsXG4gICAgICAgIGQsXG4gICAgICAgIC8vIHRvb2x0aXBYUG9zXG4gICAgICAgIG9wdHMueFNjYWxlKERhdGUucGFyc2UoZC5ub3JtYWxUaW1lKSksXG4gICAgICAgICdib2x1cycsXG4gICAgICAgIC8vIHRpbWVzdGFtcFxuICAgICAgICB0cnVlLFxuICAgICAgICBvcHRzLmNsYXNzZXNbY2F0ZWdvcnldWyd0b29sdGlwJ10sXG4gICAgICAgIHRvb2x0aXBXaWR0aCxcbiAgICAgICAgdG9vbHRpcEhlaWdodCxcbiAgICAgICAgLy8gaW1hZ2VYXG4gICAgICAgIG9wdHMueFNjYWxlKERhdGUucGFyc2UoZC5ub3JtYWxUaW1lKSksXG4gICAgICAgIC8vIGltYWdlWVxuICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gcG9vbC5oZWlnaHQoKSAtIHRvb2x0aXBIZWlnaHQ7XG4gICAgICAgIH0sXG4gICAgICAgIC8vIHRleHRYXG4gICAgICAgIG9wdHMueFNjYWxlKERhdGUucGFyc2UoZC5ub3JtYWxUaW1lKSkgKyB0b29sdGlwV2lkdGggLyAyLFxuICAgICAgICAvLyB0ZXh0WVxuICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoY2F0ZWdvcnkgPT09ICd1bnNwZWNpYWwnKSB7XG4gICAgICAgICAgICByZXR1cm4gcG9vbC5oZWlnaHQoKSAtIHRvb2x0aXBIZWlnaHQgKiAoOS8xNik7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKGNhdGVnb3J5ID09PSAndHdvLWxpbmUnKSB7XG4gICAgICAgICAgICByZXR1cm4gcG9vbC5oZWlnaHQoKSAtIHRvb2x0aXBIZWlnaHQgKiAoMy80KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoY2F0ZWdvcnkgPT09ICd0aHJlZS1saW5lJykge1xuICAgICAgICAgICAgcmV0dXJuIHBvb2wuaGVpZ2h0KCkgLSB0b29sdGlwSGVpZ2h0ICogKDEzLzE2KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gcG9vbC5oZWlnaHQoKSAtIHRvb2x0aXBIZWlnaHQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICB9LFxuICAgICAgICAvLyBjdXN0b21UZXh0XG4gICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiBkLnZhbHVlICsgJ1UnO1xuICAgICAgICB9KCksXG4gICAgICAgIC8vIHRzcGFuXG4gICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmIChkLmV4dGVuZGVkKSB7XG4gICAgICAgICAgICByZXR1cm4gJyB0b3RhbCc7XG4gICAgICAgICAgfVxuICAgICAgICB9KClcbiAgICAgICk7XG5cbiAgICBpZiAoY2F0ZWdvcnkgPT09ICd0d28tbGluZScpIHtcbiAgICAgIGQzLnNlbGVjdCgnI3Rvb2x0aXBfJyArIGQuaWQpLnNlbGVjdCgnLmQzLXRvb2x0aXAtdGV4dC1ncm91cCcpLmFwcGVuZCgndGV4dCcpXG4gICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAnY2xhc3MnOiAnZDMtdG9vbHRpcC10ZXh0IGQzLWJvbHVzJyxcbiAgICAgICAgICAneCc6IG9wdHMueFNjYWxlKERhdGUucGFyc2UoZC5ub3JtYWxUaW1lKSkgKyB0b29sdGlwV2lkdGggLyAyLFxuICAgICAgICAgICd5JzogcG9vbC5oZWlnaHQoKSAtIHRvb2x0aXBIZWlnaHQgLyAzXG4gICAgICAgIH0pXG4gICAgICAgIC5hcHBlbmQoJ3RzcGFuJylcbiAgICAgICAgLnRleHQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKGQucmVjb21tZW5kZWQgIT09IGQudmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiBkLnJlY29tbWVuZGVkICsgXCJVIHJlY29tJ2RcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoZC5leHRlbmRlZCkge1xuICAgICAgICAgICAgcmV0dXJuIGQuZXh0ZW5kZWREZWxpdmVyeSArICdVICcgKyBib2x1cy50aW1lc3BhbihkKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIC5hdHRyKCdjbGFzcycsICdkMy1ib2x1cycpO1xuICAgIH1cbiAgICBlbHNlIGlmIChjYXRlZ29yeSA9PT0gJ3RocmVlLWxpbmUnKSB7XG4gICAgICBkMy5zZWxlY3QoJyN0b29sdGlwXycgKyBkLmlkKS5zZWxlY3QoJy5kMy10b29sdGlwLXRleHQtZ3JvdXAnKS5hcHBlbmQoJ3RleHQnKVxuICAgICAgICAuYXR0cih7XG4gICAgICAgICAgJ2NsYXNzJzogJ2QzLXRvb2x0aXAtdGV4dCBkMy1ib2x1cycsXG4gICAgICAgICAgJ3gnOiBvcHRzLnhTY2FsZShEYXRlLnBhcnNlKGQubm9ybWFsVGltZSkpICsgdG9vbHRpcFdpZHRoIC8gMixcbiAgICAgICAgICAneSc6IHBvb2wuaGVpZ2h0KCkgLSB0b29sdGlwSGVpZ2h0IC8gMlxuICAgICAgICB9KVxuICAgICAgICAuYXBwZW5kKCd0c3BhbicpXG4gICAgICAgIC50ZXh0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiBkLnJlY29tbWVuZGVkICsgXCJVIHJlY29tJ2RcIjtcbiAgICAgICAgfSlcbiAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ2QzLWJvbHVzJyk7XG5cbiAgICAgIGQzLnNlbGVjdCgnI3Rvb2x0aXBfJyArIGQuaWQpLnNlbGVjdCgnLmQzLXRvb2x0aXAtdGV4dC1ncm91cCcpLmFwcGVuZCgndGV4dCcpXG4gICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAnY2xhc3MnOiAnZDMtdG9vbHRpcC10ZXh0IGQzLWJvbHVzJyxcbiAgICAgICAgICAneCc6IG9wdHMueFNjYWxlKERhdGUucGFyc2UoZC5ub3JtYWxUaW1lKSkgKyB0b29sdGlwV2lkdGggLyAyLFxuICAgICAgICAgICd5JzogcG9vbC5oZWlnaHQoKSAtIHRvb2x0aXBIZWlnaHQgLyA0XG4gICAgICAgIH0pXG4gICAgICAgIC5hcHBlbmQoJ3RzcGFuJylcbiAgICAgICAgLnRleHQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIGQuZXh0ZW5kZWREZWxpdmVyeSArICdVICcgKyBib2x1cy50aW1lc3BhbihkKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ2QzLWJvbHVzJyk7XG4gICAgfVxuICB9O1xuXG4gIGJvbHVzLnRpbWVzcGFuID0gZnVuY3Rpb24oZCkge1xuICAgIHZhciBkdXIgPSBEdXJhdGlvbi5wYXJzZShkLmR1cmF0aW9uICsgJ21zJyk7XG4gICAgdmFyIGhvdXJzID0gZHVyLmhvdXJzKCk7XG4gICAgdmFyIG1pbnV0ZXMgPSBkdXIubWludXRlcygpIC0gKGhvdXJzICogNjApO1xuICAgIGlmIChob3VycyAhPT0gMCkge1xuICAgICAgaWYgKGhvdXJzID09PSAxKSB7XG4gICAgICAgIHN3aXRjaChtaW51dGVzKSB7XG4gICAgICAgICAgY2FzZSAwOiByZXR1cm4gJ292ZXIgJyArIGhvdXJzICsgJyBocic7XG4gICAgICAgICAgY2FzZSAxNTogcmV0dXJuICdvdmVyICcgKyBob3VycyArIFFVQVJURVIgKyAnIGhyJztcbiAgICAgICAgICBjYXNlIDIwOiByZXR1cm4gJ292ZXIgJyArIGhvdXJzICsgVEhJUkQgKyAnIGhyJztcbiAgICAgICAgICBjYXNlIDMwOiByZXR1cm4gJ292ZXIgJyArIGhvdXJzICsgSEFMRiArICcgaHInO1xuICAgICAgICAgIGNhc2UgNDA6IHJldHVybiAnb3ZlciAnICsgaG91cnMgKyBUV09fVEhJUkRTICsgJyBocic7XG4gICAgICAgICAgY2FzZSA0NTogcmV0dXJuICdvdmVyICcgKyBob3VycyArIFRIUkVFX1FVQVJURVIgKyAnIGhyJztcbiAgICAgICAgICBkZWZhdWx0OiByZXR1cm4gJ292ZXIgJyArIGhvdXJzICsgJyBociAnICsgbWludXRlcyArICcgbWluJztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHN3aXRjaChtaW51dGVzKSB7XG4gICAgICAgICAgY2FzZSAwOiByZXR1cm4gJ292ZXIgJyArIGhvdXJzICsgJyBocnMnO1xuICAgICAgICAgIGNhc2UgMTU6IHJldHVybiAnb3ZlciAnICsgaG91cnMgKyBRVUFSVEVSICsgJyBocnMnO1xuICAgICAgICAgIGNhc2UgMjA6IHJldHVybiAnb3ZlciAnICsgaG91cnMgKyBUSElSRCArICcgaHJzJztcbiAgICAgICAgICBjYXNlIDMwOiByZXR1cm4gJ292ZXIgJyArIGhvdXJzICsgSEFMRiArICcgaHJzJztcbiAgICAgICAgICBjYXNlIDQwOiByZXR1cm4gJ292ZXIgJyArIGhvdXJzICsgVFdPX1RISVJEUyArICcgaHJzJztcbiAgICAgICAgICBjYXNlIDQ1OiByZXR1cm4gJ292ZXIgJyArIGhvdXJzICsgVEhSRUVfUVVBUlRFUiArICcgaHJzJztcbiAgICAgICAgICBkZWZhdWx0OiByZXR1cm4gJ292ZXIgJyArIGhvdXJzICsgJyBocnMgJyArIG1pbnV0ZXMgKyAnIG1pbic7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICByZXR1cm4gJ292ZXIgJyArIG1pbnV0ZXMgKyAnIG1pbic7XG4gICAgfVxuICB9O1xuICBcbiAgYm9sdXMueCA9IGZ1bmN0aW9uKGQpIHtcbiAgICByZXR1cm4gb3B0cy54U2NhbGUoRGF0ZS5wYXJzZShkLm5vcm1hbFRpbWUpKSAtIG9wdHMud2lkdGgvMjtcbiAgfTtcblxuICBib2x1cy50cmlhbmdsZSA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICB2YXIgdG9wID0gKHggKyBvcHRzLnRyaWFuZ2xlU2l6ZSkgKyAnICcgKyAoeSArIG9wdHMudHJpYW5nbGVTaXplLzIpO1xuICAgIHZhciBib3R0b20gPSAoeCArIG9wdHMudHJpYW5nbGVTaXplKSArICcgJyArICh5IC0gb3B0cy50cmlhbmdsZVNpemUvMik7XG4gICAgdmFyIHBvaW50ID0geCArICcgJyArIHk7XG4gICAgcmV0dXJuIFwiTVwiICsgdG9wICsgXCJMXCIgKyBib3R0b20gKyBcIkxcIiArIHBvaW50ICsgXCJaXCI7XG4gIH07XG5cbiAgcmV0dXJuIGJvbHVzO1xufTtcbiIsIi8qIFxuICogPT0gQlNEMiBMSUNFTlNFID09XG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQsIFRpZGVwb29sIFByb2plY3RcbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU7IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnkgaXQgdW5kZXJcbiAqIHRoZSB0ZXJtcyBvZiB0aGUgYXNzb2NpYXRlZCBMaWNlbnNlLCB3aGljaCBpcyBpZGVudGljYWwgdG8gdGhlIEJTRCAyLUNsYXVzZVxuICogTGljZW5zZSBhcyBwdWJsaXNoZWQgYnkgdGhlIE9wZW4gU291cmNlIEluaXRpYXRpdmUgYXQgb3BlbnNvdXJjZS5vcmcuXG4gKiBcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLCBidXQgV0lUSE9VVFxuICogQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2YgTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1NcbiAqIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gU2VlIHRoZSBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKiBcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW07IGlmXG4gKiBub3QsIHlvdSBjYW4gb2J0YWluIG9uZSBmcm9tIFRpZGVwb29sIFByb2plY3QgYXQgdGlkZXBvb2wub3JnLlxuICogPT0gQlNEMiBMSUNFTlNFID09XG4gKi9cblxudmFyIGxvZyA9IHJlcXVpcmUoJy4uL2xpYi9ib3dzJykoJ0NhcmJzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ocG9vbCwgb3B0cykge1xuXG4gIHZhciBNU19JTl9PTkUgPSA2MDAwMDtcblxuICBvcHRzID0gb3B0cyB8fCB7fTtcblxuICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgeFNjYWxlOiBwb29sLnhTY2FsZSgpLmNvcHkoKSxcbiAgICB3aWR0aDogMTIsXG4gICAgdG9vbHRpcEhlaWdodDogMjQsXG4gICAgdG9vbHRpcFdpZHRoOiA3MCxcbiAgICBib2x1c1Rvb2x0aXBDYXRjaGVyOiA1LFxuICAgIHRvb2x0aXBUaW1lc3RhbXA6IHRydWVcbiAgfTtcblxuICBfLmRlZmF1bHRzKG9wdHMsIGRlZmF1bHRzKTtcblxuICB2YXIgYm9sdXNUb29sdGlwQnVmZmVyID0gb3B0cy5ib2x1c1Rvb2x0aXBDYXRjaGVyICogTVNfSU5fT05FO1xuXG4gIC8vIGNhdGNoIGJvbHVzIHRvb2x0aXBzIGV2ZW50c1xuICBvcHRzLmVtaXR0ZXIub24oJ2JvbHVzVG9vbHRpcE9uJywgZnVuY3Rpb24odCkge1xuICAgIHZhciBjID0gXy5maW5kKG9wdHMuZGF0YSwgZnVuY3Rpb24oZCkge1xuICAgICAgdmFyIGNhcmJUID0gRGF0ZS5wYXJzZShkLm5vcm1hbFRpbWUpO1xuICAgICAgaWYgKGNhcmJUID49ICh0IC0gYm9sdXNUb29sdGlwQnVmZmVyKSAmJiAoY2FyYlQgPD0gKHQgKyBib2x1c1Rvb2x0aXBCdWZmZXIpKSkge1xuICAgICAgICByZXR1cm4gZDtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoYykge1xuICAgICAgY2FyYnMuYWRkVG9vbHRpcChjLCBmYWxzZSk7XG4gICAgfVxuICB9KTtcbiAgb3B0cy5lbWl0dGVyLm9uKCdib2x1c1Rvb2x0aXBPZmYnLCBmdW5jdGlvbih0KSB7XG4gICAgdmFyIGMgPSBfLmZpbmQob3B0cy5kYXRhLCBmdW5jdGlvbihkKSB7XG4gICAgICB2YXIgY2FyYlQgPSBEYXRlLnBhcnNlKGQubm9ybWFsVGltZSk7XG4gICAgICBpZiAoY2FyYlQgPj0gKHQgLSBib2x1c1Rvb2x0aXBCdWZmZXIpICYmIChjYXJiVCA8PSAodCArIGJvbHVzVG9vbHRpcEJ1ZmZlcikpKSB7XG4gICAgICAgIHJldHVybiBkO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGlmIChjKSB7XG4gICAgICBkMy5zZWxlY3QoJyN0b29sdGlwXycgKyBjLmlkKS5yZW1vdmUoKTtcbiAgICB9XG4gIH0pO1xuXG4gIG9wdHMuZW1pdHRlci5vbignbm9DYXJiVGltZXN0YW1wJywgZnVuY3Rpb24oYm9vbCkge1xuICAgIGlmIChib29sKSB7XG4gICAgICBvcHRzLnRvb2x0aXBUaW1lc3RhbXAgPSBmYWxzZTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBvcHRzLnRvb2x0aXBUaW1lc3RhbXAgPSB0cnVlO1xuICAgIH1cbiAgfSk7XG5cbiAgZnVuY3Rpb24gY2FyYnMoc2VsZWN0aW9uKSB7XG4gICAgc2VsZWN0aW9uLmVhY2goZnVuY3Rpb24oY3VycmVudERhdGEpIHtcbiAgICAgIHZhciByZWN0cyA9IGQzLnNlbGVjdCh0aGlzKVxuICAgICAgICAuc2VsZWN0QWxsKCdyZWN0JylcbiAgICAgICAgLmRhdGEoY3VycmVudERhdGEsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICByZXR1cm4gZC5pZDtcbiAgICAgICAgfSk7XG4gICAgICByZWN0cy5lbnRlcigpXG4gICAgICAgIC5hcHBlbmQoJ3JlY3QnKVxuICAgICAgICAuYXR0cih7XG4gICAgICAgICAgJ3gnOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICByZXR1cm4gb3B0cy54U2NhbGUoRGF0ZS5wYXJzZShkLm5vcm1hbFRpbWUpKSAtIG9wdHMud2lkdGgvMjtcbiAgICAgICAgICB9LFxuICAgICAgICAgICd5JzogMCxcbiAgICAgICAgICAnd2lkdGgnOiBvcHRzLndpZHRoLFxuICAgICAgICAgICdoZWlnaHQnOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICByZXR1cm4gb3B0cy55U2NhbGUoZC52YWx1ZSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICAnY2xhc3MnOiAnZDMtcmVjdC1jYXJicyBkMy1jYXJicycsXG4gICAgICAgICAgJ2lkJzogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgcmV0dXJuICdjYXJic18nICsgZC5pZDtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZWN0cy5leGl0KCkucmVtb3ZlKCk7XG5cbiAgICAgIC8vIHRvb2x0aXBzXG4gICAgICBkMy5zZWxlY3RBbGwoJy5kMy1yZWN0LWNhcmJzJykub24oJ21vdXNlb3ZlcicsIGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgZCA9IGQzLnNlbGVjdCh0aGlzKS5kYXR1bSgpO1xuICAgICAgICB2YXIgdCA9IERhdGUucGFyc2UoZC5ub3JtYWxUaW1lKTtcbiAgICAgICAgb3B0cy5lbWl0dGVyLmVtaXQoJ2NhcmJUb29sdGlwT24nLCB0KTtcbiAgICAgICAgY2FyYnMuYWRkVG9vbHRpcChkLCBvcHRzLnRvb2x0aXBUaW1lc3RhbXApO1xuICAgICAgfSk7XG4gICAgICBkMy5zZWxlY3RBbGwoJy5kMy1yZWN0LWNhcmJzJykub24oJ21vdXNlb3V0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBkID0gZDMuc2VsZWN0KHRoaXMpLmRhdHVtKCk7XG4gICAgICAgIHZhciB0ID0gRGF0ZS5wYXJzZShkLm5vcm1hbFRpbWUpO1xuICAgICAgICBkMy5zZWxlY3QoJyN0b29sdGlwXycgKyBkLmlkKS5yZW1vdmUoKTtcbiAgICAgICAgb3B0cy5lbWl0dGVyLmVtaXQoJ2NhcmJUb29sdGlwT2ZmJywgdCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGNhcmJzLmFkZFRvb2x0aXAgPSBmdW5jdGlvbihkLCBjYXRlZ29yeSkge1xuICAgIGQzLnNlbGVjdCgnIycgKyAnZDMtdG9vbHRpcC1ncm91cF9jYXJicycpXG4gICAgICAuY2FsbCh0b29sdGlwcyxcbiAgICAgICAgZCxcbiAgICAgICAgLy8gdG9vbHRpcFhQb3NcbiAgICAgICAgb3B0cy54U2NhbGUoRGF0ZS5wYXJzZShkLm5vcm1hbFRpbWUpKSxcbiAgICAgICAgJ2NhcmJzJyxcbiAgICAgICAgLy8gdGltZXN0YW1wXG4gICAgICAgIGNhdGVnb3J5LFxuICAgICAgICAndG9vbHRpcF9jYXJicy5zdmcnLFxuICAgICAgICBvcHRzLnRvb2x0aXBXaWR0aCxcbiAgICAgICAgb3B0cy50b29sdGlwSGVpZ2h0LFxuICAgICAgICAvLyBpbWFnZVhcbiAgICAgICAgb3B0cy54U2NhbGUoRGF0ZS5wYXJzZShkLm5vcm1hbFRpbWUpKSxcbiAgICAgICAgLy8gaW1hZ2VZXG4gICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmIChjYXRlZ29yeSkge1xuICAgICAgICAgICAgcmV0dXJuIG9wdHMueVNjYWxlKGQudmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBvcHRzLnlTY2FsZS5yYW5nZSgpWzBdO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgLy8gdGV4dFhcbiAgICAgICAgb3B0cy54U2NhbGUoRGF0ZS5wYXJzZShkLm5vcm1hbFRpbWUpKSArIG9wdHMudG9vbHRpcFdpZHRoIC8gMixcbiAgICAgICAgLy8gdGV4dFlcbiAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKGNhdGVnb3J5KSB7XG4gICAgICAgICAgICByZXR1cm4gb3B0cy55U2NhbGUoZC52YWx1ZSkgKyBvcHRzLnRvb2x0aXBIZWlnaHQgLyAyO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBvcHRzLnRvb2x0aXBIZWlnaHQgLyAyO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgLy8gY3VzdG9tVGV4dFxuICAgICAgICBkLnZhbHVlICsgJ2cnKTtcbiAgfTtcblxuICByZXR1cm4gY2FyYnM7XG59OyIsIi8qIFxuICogPT0gQlNEMiBMSUNFTlNFID09XG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQsIFRpZGVwb29sIFByb2plY3RcbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU7IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnkgaXQgdW5kZXJcbiAqIHRoZSB0ZXJtcyBvZiB0aGUgYXNzb2NpYXRlZCBMaWNlbnNlLCB3aGljaCBpcyBpZGVudGljYWwgdG8gdGhlIEJTRCAyLUNsYXVzZVxuICogTGljZW5zZSBhcyBwdWJsaXNoZWQgYnkgdGhlIE9wZW4gU291cmNlIEluaXRpYXRpdmUgYXQgb3BlbnNvdXJjZS5vcmcuXG4gKiBcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLCBidXQgV0lUSE9VVFxuICogQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2YgTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1NcbiAqIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gU2VlIHRoZSBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKiBcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW07IGlmXG4gKiBub3QsIHlvdSBjYW4gb2J0YWluIG9uZSBmcm9tIFRpZGVwb29sIFByb2plY3QgYXQgdGlkZXBvb2wub3JnLlxuICogPT0gQlNEMiBMSUNFTlNFID09XG4gKi9cblxudmFyIGxvZyA9IHJlcXVpcmUoJy4uL2xpYi9ib3dzJykoJ0NCRycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHBvb2wsIG9wdHMpIHtcblxuICBvcHRzID0gb3B0cyB8fCB7fTtcblxuICB2YXIgY2JnQ2lyY2xlcywgdG9vbHRpcHMgPSBwb29sLnRvb2x0aXBzKCk7XG5cbiAgdmFyIGRlZmF1bHRzID0ge1xuICAgIGNsYXNzZXM6IHtcbiAgICAgICdsb3cnOiB7J2JvdW5kYXJ5JzogODAsICd0b29sdGlwJzogJ2NiZ190b29sdGlwX2xvdy5zdmcnfSxcbiAgICAgICd0YXJnZXQnOiB7J2JvdW5kYXJ5JzogMTgwLCAndG9vbHRpcCc6ICdjYmdfdG9vbHRpcF90YXJnZXQuc3ZnJ30sXG4gICAgICAnaGlnaCc6IHsnYm91bmRhcnknOiAyMDAsICd0b29sdGlwJzogJ2NiZ190b29sdGlwX2hpZ2guc3ZnJ31cbiAgICB9LFxuICAgIHhTY2FsZTogcG9vbC54U2NhbGUoKS5jb3B5KCksXG4gICAgdG9vbHRpcFNpemU6IDI0XG4gIH07XG5cbiAgXy5kZWZhdWx0cyhvcHRzLCBkZWZhdWx0cyk7XG5cbiAgZnVuY3Rpb24gY2JnKHNlbGVjdGlvbikge1xuICAgIHNlbGVjdGlvbi5lYWNoKGZ1bmN0aW9uKGN1cnJlbnREYXRhKSB7XG4gICAgICB2YXIgYWxsQ0JHID0gZDMuc2VsZWN0KHRoaXMpLnNlbGVjdEFsbCgnY2lyY2xlJylcbiAgICAgICAgLmRhdGEoY3VycmVudERhdGEsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICByZXR1cm4gZC5pZDtcbiAgICAgICAgfSk7XG4gICAgICB2YXIgY2JnR3JvdXBzID0gYWxsQ0JHLmVudGVyKClcbiAgICAgICAgLmFwcGVuZCgnY2lyY2xlJylcbiAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ2QzLWNiZycpO1xuICAgICAgdmFyIGNiZ0xvdyA9IGNiZ0dyb3Vwcy5maWx0ZXIoZnVuY3Rpb24oZCkge1xuICAgICAgICBpZiAoZC52YWx1ZSA8PSBvcHRzLmNsYXNzZXNbJ2xvdyddWydib3VuZGFyeSddKSB7XG4gICAgICAgICAgcmV0dXJuIGQ7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgdmFyIGNiZ1RhcmdldCA9IGNiZ0dyb3Vwcy5maWx0ZXIoZnVuY3Rpb24oZCkge1xuICAgICAgICBpZiAoKGQudmFsdWUgPiBvcHRzLmNsYXNzZXNbJ2xvdyddWydib3VuZGFyeSddKSAmJiAoZC52YWx1ZSA8PSBvcHRzLmNsYXNzZXNbJ3RhcmdldCddWydib3VuZGFyeSddKSkge1xuICAgICAgICAgIHJldHVybiBkO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHZhciBjYmdIaWdoID0gY2JnR3JvdXBzLmZpbHRlcihmdW5jdGlvbihkKSB7XG4gICAgICAgIGlmIChkLnZhbHVlID4gb3B0cy5jbGFzc2VzWyd0YXJnZXQnXVsnYm91bmRhcnknXSkge1xuICAgICAgICAgIHJldHVybiBkO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGNiZ0xvdy5hdHRyKHtcbiAgICAgICAgICAnY3gnOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICByZXR1cm4gb3B0cy54U2NhbGUoRGF0ZS5wYXJzZShkLm5vcm1hbFRpbWUpKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgICdjeSc6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHJldHVybiBvcHRzLnlTY2FsZShkLnZhbHVlKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgICdyJzogMi41LFxuICAgICAgICAgICdpZCc6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHJldHVybiAnY2JnXycgKyBkLmlkO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgLmRhdHVtKGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICByZXR1cm4gZDtcbiAgICAgICAgfSlcbiAgICAgICAgLmNsYXNzZWQoeydkMy1jaXJjbGUtY2JnJzogdHJ1ZSwgJ2QzLWJnLWxvdyc6IHRydWV9KTtcbiAgICAgIGNiZ1RhcmdldC5hdHRyKHtcbiAgICAgICAgICAnY3gnOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICByZXR1cm4gb3B0cy54U2NhbGUoRGF0ZS5wYXJzZShkLm5vcm1hbFRpbWUpKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgICdjeSc6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHJldHVybiBvcHRzLnlTY2FsZShkLnZhbHVlKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgICdyJzogMi41LFxuICAgICAgICAgICdpZCc6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHJldHVybiAnY2JnXycgKyBkLmlkO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgLmNsYXNzZWQoeydkMy1jaXJjbGUtY2JnJzogdHJ1ZSwgJ2QzLWJnLXRhcmdldCc6IHRydWV9KTtcbiAgICAgIGNiZ0hpZ2guYXR0cih7XG4gICAgICAgICAgJ2N4JzogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgcmV0dXJuIG9wdHMueFNjYWxlKERhdGUucGFyc2UoZC5ub3JtYWxUaW1lKSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICAnY3knOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICByZXR1cm4gb3B0cy55U2NhbGUoZC52YWx1ZSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICAncic6IDIuNSxcbiAgICAgICAgICAnaWQnOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2NiZ18nICsgZC5pZDtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIC5jbGFzc2VkKHsnZDMtY2lyY2xlLWNiZyc6IHRydWUsICdkMy1iZy1oaWdoJzogdHJ1ZX0pO1xuICAgICAgYWxsQ0JHLmV4aXQoKS5yZW1vdmUoKTtcblxuICAgICAgLy8gdG9vbHRpcHNcbiAgICAgIGQzLnNlbGVjdEFsbCgnLmQzLWNpcmNsZS1jYmcnKS5vbignbW91c2VvdmVyJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChkMy5zZWxlY3QodGhpcykuY2xhc3NlZCgnZDMtYmctbG93JykpIHtcbiAgICAgICAgICBjYmcuYWRkVG9vbHRpcChkMy5zZWxlY3QodGhpcykuZGF0dW0oKSwgJ2xvdycpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGQzLnNlbGVjdCh0aGlzKS5jbGFzc2VkKCdkMy1iZy10YXJnZXQnKSkge1xuICAgICAgICAgIGNiZy5hZGRUb29sdGlwKGQzLnNlbGVjdCh0aGlzKS5kYXR1bSgpLCAndGFyZ2V0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgY2JnLmFkZFRvb2x0aXAoZDMuc2VsZWN0KHRoaXMpLmRhdHVtKCksICdoaWdoJyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgZDMuc2VsZWN0QWxsKCcuZDMtY2lyY2xlLWNiZycpLm9uKCdtb3VzZW91dCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgaWQgPSBkMy5zZWxlY3QodGhpcykuYXR0cignaWQnKS5yZXBsYWNlKCdjYmdfJywgJ3Rvb2x0aXBfJyk7XG4gICAgICAgIGQzLnNlbGVjdCgnIycgKyBpZCkucmVtb3ZlKCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGNiZy5hZGRUb29sdGlwID0gZnVuY3Rpb24oZCwgY2F0ZWdvcnkpIHtcbiAgICBkMy5zZWxlY3QoJyMnICsgJ2QzLXRvb2x0aXAtZ3JvdXBfY2JnJylcbiAgICAgIC5jYWxsKHRvb2x0aXBzLFxuICAgICAgICBkLFxuICAgICAgICAvLyB0b29sdGlwWFBvc1xuICAgICAgICBvcHRzLnhTY2FsZShEYXRlLnBhcnNlKGQubm9ybWFsVGltZSkpLFxuICAgICAgICAnY2JnJyxcbiAgICAgICAgLy8gdGltZXN0YW1wXG4gICAgICAgIGZhbHNlLFxuICAgICAgICBvcHRzLmNsYXNzZXNbY2F0ZWdvcnldWyd0b29sdGlwJ10sXG4gICAgICAgIG9wdHMudG9vbHRpcFNpemUsXG4gICAgICAgIG9wdHMudG9vbHRpcFNpemUsXG4gICAgICAgIC8vIGltYWdlWFxuICAgICAgICBvcHRzLnhTY2FsZShEYXRlLnBhcnNlKGQubm9ybWFsVGltZSkpLFxuICAgICAgICAvLyBpbWFnZVlcbiAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKChjYXRlZ29yeSA9PT0gJ2xvdycpIHx8IChjYXRlZ29yeSA9PT0gJ3RhcmdldCcpKSB7XG4gICAgICAgICAgICByZXR1cm4gb3B0cy55U2NhbGUoZC52YWx1ZSkgLSBvcHRzLnRvb2x0aXBTaXplO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBvcHRzLnlTY2FsZShkLnZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIC8vIHRleHRYXG4gICAgICAgIG9wdHMueFNjYWxlKERhdGUucGFyc2UoZC5ub3JtYWxUaW1lKSkgKyBvcHRzLnRvb2x0aXBTaXplIC8gMixcbiAgICAgICAgLy8gdGV4dFlcbiAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKChjYXRlZ29yeSA9PT0gJ2xvdycpIHx8IChjYXRlZ29yeSA9PT0gJ3RhcmdldCcpKSB7XG4gICAgICAgICAgICByZXR1cm4gb3B0cy55U2NhbGUoZC52YWx1ZSkgLSBvcHRzLnRvb2x0aXBTaXplIC8gMjtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gb3B0cy55U2NhbGUoZC52YWx1ZSkgKyBvcHRzLnRvb2x0aXBTaXplIC8gMjtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICB9O1xuXG4gIHJldHVybiBjYmc7XG59OyIsIi8qIFxuICogPT0gQlNEMiBMSUNFTlNFID09XG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQsIFRpZGVwb29sIFByb2plY3RcbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU7IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnkgaXQgdW5kZXJcbiAqIHRoZSB0ZXJtcyBvZiB0aGUgYXNzb2NpYXRlZCBMaWNlbnNlLCB3aGljaCBpcyBpZGVudGljYWwgdG8gdGhlIEJTRCAyLUNsYXVzZVxuICogTGljZW5zZSBhcyBwdWJsaXNoZWQgYnkgdGhlIE9wZW4gU291cmNlIEluaXRpYXRpdmUgYXQgb3BlbnNvdXJjZS5vcmcuXG4gKiBcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLCBidXQgV0lUSE9VVFxuICogQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2YgTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1NcbiAqIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gU2VlIHRoZSBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKiBcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW07IGlmXG4gKiBub3QsIHlvdSBjYW4gb2J0YWluIG9uZSBmcm9tIFRpZGVwb29sIFByb2plY3QgYXQgdGlkZXBvb2wub3JnLlxuICogPT0gQlNEMiBMSUNFTlNFID09XG4gKi9cblxudmFyIGxvZyA9IHJlcXVpcmUoJy4uL2xpYi9ib3dzJykoJ0ZpbGwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihwb29sLCBvcHRzKSB7XG5cbiAgdmFyIGZpcnN0ID0gbmV3IERhdGUob3B0cy5lbmRwb2ludHNbMF0pLFxuICAgIGxhc3QgPSBuZXcgRGF0ZShvcHRzLmVuZHBvaW50c1sxXSksXG4gICAgbmVhcmVzdCwgZmlsbHMgPSBbXTtcblxuICBmaXJzdC5zZXRNaW51dGVzKGZpcnN0LmdldE1pbnV0ZXMoKSArIGZpcnN0LmdldFRpbWV6b25lT2Zmc2V0KCkpO1xuICBsYXN0LnNldE1pbnV0ZXMobGFzdC5nZXRNaW51dGVzKCkgKyBsYXN0LmdldFRpbWV6b25lT2Zmc2V0KCkpO1xuXG4gIHZhciBkZWZhdWx0cyA9IHtcbiAgICBjbGFzc2VzOiB7XG4gICAgICAwOiAnZGFya2VzdCcsXG4gICAgICAzOiAnZGFyaycsXG4gICAgICA2OiAnbGlnaHRlcicsXG4gICAgICA5OiAnbGlnaHQnLFxuICAgICAgMTI6ICdsaWdodGVzdCcsXG4gICAgICAxNTogJ2xpZ2h0ZXInLFxuICAgICAgMTg6ICdkYXJrJyxcbiAgICAgIDIxOiAnZGFya2VzdCdcbiAgICB9LFxuICAgIGR1cmF0aW9uOiAzLFxuICAgIHNjYWxlOiBwb29sLnhTY2FsZSgpLmNvcHkoKSxcbiAgICBndXR0ZXI6IDBcbiAgfTtcblxuICBfLmRlZmF1bHRzKG9wdHMgfHwge30sIGRlZmF1bHRzKTtcblxuICBmdW5jdGlvbiBmaWxsKHNlbGVjdGlvbikge1xuICAgIGZpbGwuZmluZE5lYXJlc3Qob3B0cy5lbmRwb2ludHNbMV0pO1xuICAgIHZhciBvdGhlck5lYXIgPSBuZXcgRGF0ZShuZWFyZXN0KTtcbiAgICBvdGhlck5lYXIuc2V0TWludXRlcyhvdGhlck5lYXIuZ2V0TWludXRlcygpIC0gb3RoZXJOZWFyLmdldFRpbWV6b25lT2Zmc2V0KCkpO1xuICAgIGZpbGxzLnB1c2goe1xuICAgICAgd2lkdGg6IG9wdHMuc2NhbGUobGFzdCkgLSBvcHRzLnNjYWxlKG5lYXJlc3QpLFxuICAgICAgeDogb3B0cy5zY2FsZShvdGhlck5lYXIpLFxuICAgICAgZmlsbDogb3B0cy5jbGFzc2VzW25lYXJlc3QuZ2V0SG91cnMoKV1cbiAgICB9KTtcbiAgICBjdXJyZW50ID0gbmV3IERhdGUobmVhcmVzdCk7XG4gICAgd2hpbGUgKGN1cnJlbnQgPiBmaXJzdCkge1xuICAgICAgdmFyIG5leHQgPSBuZXcgRGF0ZShjdXJyZW50KTtcbiAgICAgIG5leHQuc2V0SG91cnMoY3VycmVudC5nZXRIb3VycygpIC0gb3B0cy5kdXJhdGlvbik7XG4gICAgICB2YXIgb3RoZXJOZXh0ID0gbmV3IERhdGUobmV4dCk7XG4gICAgICBvdGhlck5leHQuc2V0TWludXRlcyhvdGhlck5leHQuZ2V0TWludXRlcygpIC0gb3RoZXJOZXh0LmdldFRpbWV6b25lT2Zmc2V0KCkpO1xuICAgICAgZmlsbHMucHVzaCh7XG4gICAgICAgIHdpZHRoOiBvcHRzLnNjYWxlKGN1cnJlbnQpIC0gb3B0cy5zY2FsZShuZXh0KSxcbiAgICAgICAgeDogb3B0cy5zY2FsZShvdGhlck5leHQpLFxuICAgICAgICBmaWxsOiBvcHRzLmNsYXNzZXNbbmV4dC5nZXRIb3VycygpXVxuICAgICAgfSk7XG4gICAgICBjdXJyZW50ID0gbmV4dDtcbiAgICB9XG5cbiAgICBzZWxlY3Rpb24uc2VsZWN0QWxsKCdyZWN0JylcbiAgICAgIC5kYXRhKGZpbGxzKVxuICAgICAgLmVudGVyKClcbiAgICAgIC5hcHBlbmQoJ3JlY3QnKVxuICAgICAgLmF0dHIoe1xuICAgICAgICAneCc6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICByZXR1cm4gZC54O1xuICAgICAgICB9LFxuICAgICAgICAneSc6IDAgKyBvcHRzLmd1dHRlcixcbiAgICAgICAgJ3dpZHRoJzogZnVuY3Rpb24oZCkge1xuICAgICAgICAgIHJldHVybiBkLndpZHRoO1xuICAgICAgICB9LFxuICAgICAgICAnaGVpZ2h0JzogcG9vbC5oZWlnaHQoKSAtIDIgKiBvcHRzLmd1dHRlcixcbiAgICAgICAgJ2NsYXNzJzogZnVuY3Rpb24oZCkge1xuICAgICAgICAgIHJldHVybiAnZDMtcmVjdC1maWxsIGQzLWZpbGwtJyArIGQuZmlsbDtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gIH1cblxuICBmaWxsLmZpbmROZWFyZXN0ID0gZnVuY3Rpb24oZCkge1xuICAgIHZhciBkYXRlID0gbmV3IERhdGUoZCk7XG4gICAgZGF0ZS5zZXRNaW51dGVzKGRhdGUuZ2V0TWludXRlcygpICsgZGF0ZS5nZXRUaW1lem9uZU9mZnNldCgpKTtcbiAgICB2YXIgaG91ckJyZWFrcyA9IFtdO1xuICAgIHZhciBpID0gMDtcbiAgICB3aGlsZSAoaSA8PSAyNCkge1xuICAgICAgaG91ckJyZWFrcy5wdXNoKGkpO1xuICAgICAgaSArPSBvcHRzLmR1cmF0aW9uO1xuICAgIH1cbiAgICBmb3IodmFyIGogPSAwOyBqIDwgaG91ckJyZWFrcy5sZW5ndGg7IGorKykge1xuICAgICAgdmFyIGJyID0gaG91ckJyZWFrc1tqXTtcbiAgICAgIHZhciBuZXh0QnIgPSBob3VyQnJlYWtzW2ogKyAxXTtcbiAgICAgIGlmICgoZGF0ZS5nZXRIb3VycygpID49IGJyKSAmJiAoZGF0ZS5nZXRIb3VycygpIDwgbmV4dEJyKSkge1xuICAgICAgICBuZWFyZXN0ID0gbmV3IERhdGUoZGF0ZS5nZXRGdWxsWWVhcigpLCBkYXRlLmdldE1vbnRoKCksIGRhdGUuZ2V0RGF0ZSgpLCBiciwgMCwgMCk7XG4gICAgICB9XG4gICAgfVxuICB9O1xuICBcbiAgcmV0dXJuIGZpbGw7XG59OyIsIi8qIFxuICogPT0gQlNEMiBMSUNFTlNFID09XG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQsIFRpZGVwb29sIFByb2plY3RcbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU7IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnkgaXQgdW5kZXJcbiAqIHRoZSB0ZXJtcyBvZiB0aGUgYXNzb2NpYXRlZCBMaWNlbnNlLCB3aGljaCBpcyBpZGVudGljYWwgdG8gdGhlIEJTRCAyLUNsYXVzZVxuICogTGljZW5zZSBhcyBwdWJsaXNoZWQgYnkgdGhlIE9wZW4gU291cmNlIEluaXRpYXRpdmUgYXQgb3BlbnNvdXJjZS5vcmcuXG4gKiBcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLCBidXQgV0lUSE9VVFxuICogQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2YgTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1NcbiAqIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gU2VlIHRoZSBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKiBcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW07IGlmXG4gKiBub3QsIHlvdSBjYW4gb2J0YWluIG9uZSBmcm9tIFRpZGVwb29sIFByb2plY3QgYXQgdGlkZXBvb2wub3JnLlxuICogPT0gQlNEMiBMSUNFTlNFID09XG4gKi9cblxudmFyIGxvZyA9IHJlcXVpcmUoJy4uL2xpYi9ib3dzJykoJ01lc3NhZ2UnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihwb29sLCBvcHRzKSB7XG5cbiAgb3B0cyA9IG9wdHMgfHwge307XG5cbiAgdmFyIGRlZmF1bHRzID0ge1xuICAgIHhTY2FsZTogcG9vbC54U2NhbGUoKS5jb3B5KCksXG4gICAgaW1hZ2VzQmFzZVVybDogcG9vbC5pbWFnZXNCYXNlVXJsKClcbiAgfTtcblxuICBfLmRlZmF1bHRzKG9wdHMsIGRlZmF1bHRzKTtcblxuICBmdW5jdGlvbiBjYmcoc2VsZWN0aW9uKSB7XG4gICAgc2VsZWN0aW9uLmVhY2goZnVuY3Rpb24oY3VycmVudERhdGEpIHtcbiAgICAgIHZhciBtZXNzYWdlcyA9IGQzLnNlbGVjdCh0aGlzKVxuICAgICAgICAuc2VsZWN0QWxsKCdpbWFnZScpXG4gICAgICAgIC5kYXRhKGN1cnJlbnREYXRhLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgaWYgKGQucGFyZW50TWVzc2FnZSA9PT0gJycpIHtcbiAgICAgICAgICAgIHJldHVybiBkLmlkO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICBtZXNzYWdlcy5lbnRlcigpXG4gICAgICAgIC5hcHBlbmQoJ2ltYWdlJylcbiAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICd4bGluazpocmVmJzogb3B0cy5pbWFnZXNCYXNlVXJsICsgJy9tZXNzYWdlL3Bvc3RfaXQuc3ZnJyxcbiAgICAgICAgICAneCc6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHJldHVybiBvcHRzLnhTY2FsZShEYXRlLnBhcnNlKGQubm9ybWFsVGltZSkpIC0gb3B0cy5zaXplIC8gMjtcbiAgICAgICAgICB9LFxuICAgICAgICAgICd5JzogcG9vbC5oZWlnaHQoKSAvIDIgLSBvcHRzLnNpemUgLyAyLFxuICAgICAgICAgICd3aWR0aCc6IG9wdHMuc2l6ZSxcbiAgICAgICAgICAnaGVpZ2h0Jzogb3B0cy5zaXplLFxuICAgICAgICAgICdpZCc6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHJldHVybiAnbWVzc2FnZV8nICsgZC5pZDtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIC5jbGFzc2VkKHsnZDMtaW1hZ2UnOiB0cnVlLCAnZDMtbWVzc2FnZSc6IHRydWV9KTtcbiAgICAgIG1lc3NhZ2VzLmV4aXQoKS5yZW1vdmUoKTtcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBjYmc7XG59OyIsIi8qIFxuICogPT0gQlNEMiBMSUNFTlNFID09XG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQsIFRpZGVwb29sIFByb2plY3RcbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU7IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnkgaXQgdW5kZXJcbiAqIHRoZSB0ZXJtcyBvZiB0aGUgYXNzb2NpYXRlZCBMaWNlbnNlLCB3aGljaCBpcyBpZGVudGljYWwgdG8gdGhlIEJTRCAyLUNsYXVzZVxuICogTGljZW5zZSBhcyBwdWJsaXNoZWQgYnkgdGhlIE9wZW4gU291cmNlIEluaXRpYXRpdmUgYXQgb3BlbnNvdXJjZS5vcmcuXG4gKiBcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLCBidXQgV0lUSE9VVFxuICogQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2YgTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1NcbiAqIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gU2VlIHRoZSBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKiBcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW07IGlmXG4gKiBub3QsIHlvdSBjYW4gb2J0YWluIG9uZSBmcm9tIFRpZGVwb29sIFByb2plY3QgYXQgdGlkZXBvb2wub3JnLlxuICogPT0gQlNEMiBMSUNFTlNFID09XG4gKi9cblxudmFyIHNjYWxlcyA9IHtcbiAgYmc6IGZ1bmN0aW9uKGRhdGEsIHBvb2wpIHtcbiAgICB2YXIgc2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgLmRvbWFpbihbMCwgZDMubWF4KGRhdGEsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudmFsdWU7IH0pXSlcbiAgICAgIC5yYW5nZShbcG9vbC5oZWlnaHQoKSwgMF0pO1xuICAgIHJldHVybiBzY2FsZTtcbiAgfSxcbiAgY2FyYnM6IGZ1bmN0aW9uKGRhdGEsIHBvb2wpIHtcbiAgICB2YXIgc2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgLmRvbWFpbihbMCwgZDMubWF4KGRhdGEsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudmFsdWU7IH0pXSlcbiAgICAgIC5yYW5nZShbMCwgMC40NzUgKiBwb29sLmhlaWdodCgpXSk7XG4gICAgcmV0dXJuIHNjYWxlO1xuICB9LFxuICBib2x1czogZnVuY3Rpb24oZGF0YSwgcG9vbCkge1xuICAgIHZhciBzY2FsZSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAuZG9tYWluKFswLCBkMy5tYXgoZGF0YSwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC52YWx1ZTsgfSldKVxuICAgICAgLnJhbmdlKFtwb29sLmhlaWdodCgpLCAwLjUyNSAqIHBvb2wuaGVpZ2h0KCldKTtcbiAgICByZXR1cm4gc2NhbGU7XG4gIH0sXG4gIGJhc2FsOiBmdW5jdGlvbihkYXRhLCBwb29sKSB7XG4gICAgdmFyIHNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgIC5kb21haW4oWzAsIGQzLm1heChkYXRhLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLnZhbHVlOyB9KSAqIDEuMV0pXG4gICAgICAucmFuZ2VSb3VuZChbcG9vbC5oZWlnaHQoKSwgMF0pO1xuICAgIHJldHVybiBzY2FsZTtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBzY2FsZXM7IiwiLyogXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqIENvcHlyaWdodCAoYykgMjAxNCwgVGlkZXBvb2wgUHJvamVjdFxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTsgeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeSBpdCB1bmRlclxuICogdGhlIHRlcm1zIG9mIHRoZSBhc3NvY2lhdGVkIExpY2Vuc2UsIHdoaWNoIGlzIGlkZW50aWNhbCB0byB0aGUgQlNEIDItQ2xhdXNlXG4gKiBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieSB0aGUgT3BlbiBTb3VyY2UgSW5pdGlhdGl2ZSBhdCBvcGVuc291cmNlLm9yZy5cbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsIGJ1dCBXSVRIT1VUXG4gKiBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTU1xuICogRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiBTZWUgdGhlIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqIFxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbTsgaWZcbiAqIG5vdCwgeW91IGNhbiBvYnRhaW4gb25lIGZyb20gVGlkZXBvb2wgUHJvamVjdCBhdCB0aWRlcG9vbC5vcmcuXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqL1xuXG52YXIgbG9nID0gcmVxdWlyZSgnLi4vbGliL2Jvd3MnKSgnVHdvLVdlZWsgU01CRycpO1xuIFxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihwb29sLCBvcHRzKSB7XG5cbiAgTVNfSU5fSE9VUiA9IDM2MDAwMDA7XG5cbiAgTVNfSU5fTUlOID0gNjAgKiAxMDAwO1xuXG4gIG9wdHMgPSBvcHRzIHx8IHt9O1xuXG4gIHZhciBkZWZhdWx0cyA9IHtcbiAgICBjbGFzc2VzOiB7XG4gICAgICAndmVyeS1sb3cnOiB7J2JvdW5kYXJ5JzogNjB9LFxuICAgICAgJ2xvdyc6IHsnYm91bmRhcnknOiA4MCwgJ3Rvb2x0aXAnOiAnc21iZ190b29sdGlwX2xvdy5zdmcnfSxcbiAgICAgICd0YXJnZXQnOiB7J2JvdW5kYXJ5JzogMTgwLCAndG9vbHRpcCc6ICdzbWJnX3Rvb2x0aXBfdGFyZ2V0LnN2Zyd9LFxuICAgICAgJ2hpZ2gnOiB7J2JvdW5kYXJ5JzogMjAwLCAndG9vbHRpcCc6ICdzbWJnX3Rvb2x0aXBfaGlnaC5zdmcnfSxcbiAgICAgICd2ZXJ5LWhpZ2gnOiB7J2JvdW5kYXJ5JzogMzAwfVxuICAgIH0sXG4gICAgc2l6ZTogMTYsXG4gICAgcmVjdFdpZHRoOiAzMixcbiAgICB4U2NhbGU6IHBvb2wueFNjYWxlKCkuY29weSgpLFxuICAgIGltYWdlc0Jhc2VVcmw6IHBvb2wuaW1hZ2VzQmFzZVVybCgpXG4gIH07XG5cbiAgXy5kZWZhdWx0cyhvcHRzLCBkZWZhdWx0cyk7XG5cbiAgZnVuY3Rpb24gc21iZyhzZWxlY3Rpb24pIHtcbiAgICBzZWxlY3Rpb24uZWFjaChmdW5jdGlvbihjdXJyZW50RGF0YSkge1xuICAgICAgdmFyIGNpcmNsZXMgPSBkMy5zZWxlY3QodGhpcylcbiAgICAgICAgLnNlbGVjdEFsbCgnZycpXG4gICAgICAgIC5kYXRhKGN1cnJlbnREYXRhLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgcmV0dXJuIGQuaWQ7XG4gICAgICAgIH0pO1xuICAgICAgdmFyIGNpcmNsZUdyb3VwcyA9IGNpcmNsZXMuZW50ZXIoKVxuICAgICAgICAuYXBwZW5kKCdnJylcbiAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ2QzLXNtYmctdGltZS1ncm91cCcpO1xuICAgICAgY2lyY2xlR3JvdXBzLmFwcGVuZCgnaW1hZ2UnKVxuICAgICAgICAuYXR0cih7XG4gICAgICAgICAgJ3hsaW5rOmhyZWYnOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICBpZiAoZC52YWx1ZSA8PSBvcHRzLmNsYXNzZXNbJ3ZlcnktbG93J11bJ2JvdW5kYXJ5J10pIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG9wdHMuaW1hZ2VzQmFzZVVybCArICcvc21iZy92ZXJ5X2xvdy5zdmcnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoKGQudmFsdWUgPiBvcHRzLmNsYXNzZXNbJ3ZlcnktbG93J11bJ2JvdW5kYXJ5J10pICYmIChkLnZhbHVlIDw9IG9wdHMuY2xhc3Nlc1snbG93J11bJ2JvdW5kYXJ5J10pKSB7XG4gICAgICAgICAgICAgIHJldHVybiBvcHRzLmltYWdlc0Jhc2VVcmwgKyAnL3NtYmcvbG93LnN2Zyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICgoZC52YWx1ZSA+IG9wdHMuY2xhc3Nlc1snbG93J11bJ2JvdW5kYXJ5J10pICYmIChkLnZhbHVlIDw9IG9wdHMuY2xhc3Nlc1sndGFyZ2V0J11bJ2JvdW5kYXJ5J10pKSB7XG4gICAgICAgICAgICAgIHJldHVybiBvcHRzLmltYWdlc0Jhc2VVcmwgKyAnL3NtYmcvdGFyZ2V0LnN2Zyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICgoZC52YWx1ZSA+IG9wdHMuY2xhc3Nlc1sndGFyZ2V0J11bJ2JvdW5kYXJ5J10pICYmIChkLnZhbHVlIDw9IG9wdHMuY2xhc3Nlc1snaGlnaCddWydib3VuZGFyeSddKSkge1xuICAgICAgICAgICAgICByZXR1cm4gb3B0cy5pbWFnZXNCYXNlVXJsICsgJy9zbWJnL2hpZ2guc3ZnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGQudmFsdWUgPiBvcHRzLmNsYXNzZXNbJ2hpZ2gnXVsnYm91bmRhcnknXSkge1xuICAgICAgICAgICAgICByZXR1cm4gb3B0cy5pbWFnZXNCYXNlVXJsICsgJy9zbWJnL3ZlcnlfaGlnaC5zdmcnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgJ3gnOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICB2YXIgbG9jYWxUaW1lID0gbmV3IERhdGUoZC5ub3JtYWxUaW1lKTtcbiAgICAgICAgICAgIHZhciBob3VyID0gbG9jYWxUaW1lLmdldFVUQ0hvdXJzKCk7XG4gICAgICAgICAgICB2YXIgbWluID0gbG9jYWxUaW1lLmdldFVUQ01pbnV0ZXMoKTtcbiAgICAgICAgICAgIHZhciBzZWMgPSBsb2NhbFRpbWUuZ2V0VVRDU2Vjb25kcygpO1xuICAgICAgICAgICAgdmFyIG1zZWMgPSBsb2NhbFRpbWUuZ2V0VVRDTWlsbGlzZWNvbmRzKCk7XG4gICAgICAgICAgICB2YXIgdCA9IGhvdXIgKiBNU19JTl9IT1VSICsgbWluICogTVNfSU5fTUlOICsgc2VjICogMTAwMCArIG1zZWM7XG4gICAgICAgICAgICByZXR1cm4gb3B0cy54U2NhbGUodCkgLSBvcHRzLnNpemUgLyAyO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgJ3knOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICByZXR1cm4gcG9vbC5oZWlnaHQoKSAvIDIgLSBvcHRzLnNpemUgLyAyO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgJ3dpZHRoJzogb3B0cy5zaXplLFxuICAgICAgICAgICdoZWlnaHQnOiBvcHRzLnNpemUsXG4gICAgICAgICAgJ2lkJzogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgcmV0dXJuICdzbWJnX3RpbWVfJyArIGQuaWQ7XG4gICAgICAgICAgfSxcbiAgICAgICAgICAnY2xhc3MnOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICBpZiAoZC52YWx1ZSA8PSBvcHRzLmNsYXNzZXNbJ2xvdyddWydib3VuZGFyeSddKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnZDMtYmctbG93JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKChkLnZhbHVlID4gb3B0cy5jbGFzc2VzWydsb3cnXVsnYm91bmRhcnknXSkgJiYgKGQudmFsdWUgPD0gb3B0cy5jbGFzc2VzWyd0YXJnZXQnXVsnYm91bmRhcnknXSkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICdkMy1iZy10YXJnZXQnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoZC52YWx1ZSA+IG9wdHMuY2xhc3Nlc1sndGFyZ2V0J11bJ2JvdW5kYXJ5J10pIHtcbiAgICAgICAgICAgICAgcmV0dXJuICdkMy1iZy1oaWdoJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIC5jbGFzc2VkKHsnZDMtaW1hZ2UnOiB0cnVlLCAnZDMtc21iZy10aW1lJzogdHJ1ZSwgJ2QzLWltYWdlLXNtYmcnOiB0cnVlfSlcbiAgICAgICAgLm9uKCdkYmxjbGljaycsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICBkMy5ldmVudC5zdG9wUHJvcGFnYXRpb24oKTsgLy8gc2lsZW5jZSB0aGUgY2xpY2stYW5kLWRyYWcgbGlzdGVuZXJcbiAgICAgICAgICBvcHRzLmVtaXR0ZXIuZW1pdCgnc2VsZWN0U01CRycsIGQubm9ybWFsVGltZSk7XG4gICAgICAgIH0pO1xuXG4gICAgICBjaXJjbGVHcm91cHMuYXBwZW5kKCdyZWN0JylcbiAgICAgICAgLnN0eWxlKCdkaXNwbGF5JywgJ25vbmUnKVxuICAgICAgICAuYXR0cih7XG4gICAgICAgICAgJ3gnOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICB2YXIgbG9jYWxUaW1lID0gbmV3IERhdGUoZC5ub3JtYWxUaW1lKTtcbiAgICAgICAgICAgIHZhciBob3VyID0gbG9jYWxUaW1lLmdldFVUQ0hvdXJzKCk7XG4gICAgICAgICAgICB2YXIgbWluID0gbG9jYWxUaW1lLmdldFVUQ01pbnV0ZXMoKTtcbiAgICAgICAgICAgIHZhciBzZWMgPSBsb2NhbFRpbWUuZ2V0VVRDU2Vjb25kcygpO1xuICAgICAgICAgICAgdmFyIG1zZWMgPSBsb2NhbFRpbWUuZ2V0VVRDTWlsbGlzZWNvbmRzKCk7XG4gICAgICAgICAgICB2YXIgdCA9IGhvdXIgKiBNU19JTl9IT1VSICsgbWluICogTVNfSU5fTUlOICsgc2VjICogMTAwMCArIG1zZWM7XG4gICAgICAgICAgICByZXR1cm4gb3B0cy54U2NhbGUodCkgLSBvcHRzLnJlY3RXaWR0aCAvIDI7XG4gICAgICAgICAgfSxcbiAgICAgICAgICAneSc6IDAsXG4gICAgICAgICAgJ3dpZHRoJzogb3B0cy5zaXplICogMixcbiAgICAgICAgICAnaGVpZ2h0JzogcG9vbC5oZWlnaHQoKSAvIDIsXG4gICAgICAgICAgJ2NsYXNzJzogJ2QzLXNtYmctbnVtYmVycyBkMy1yZWN0LXNtYmcgZDMtc21iZy10aW1lJ1xuICAgICAgICB9KTtcblxuICAgICAgLy8gTkI6IGNhbm5vdCBkbyBzYW1lIGRpc3BsYXk6IG5vbmUgc3RyYXRlZ3kgYmVjYXVzZSBkb21pbmFudC1iYXNlbGluZSBhdHRyaWJ1dGUgY2Fubm90IGJlIGFwcGxpZWRcbiAgICAgIGNpcmNsZUdyb3Vwcy5hcHBlbmQoJ3RleHQnKVxuICAgICAgICAuYXR0cih7XG4gICAgICAgICAgJ3gnOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICB2YXIgbG9jYWxUaW1lID0gbmV3IERhdGUoZC5ub3JtYWxUaW1lKTtcbiAgICAgICAgICAgIHZhciBob3VyID0gbG9jYWxUaW1lLmdldFVUQ0hvdXJzKCk7XG4gICAgICAgICAgICB2YXIgbWluID0gbG9jYWxUaW1lLmdldFVUQ01pbnV0ZXMoKTtcbiAgICAgICAgICAgIHZhciBzZWMgPSBsb2NhbFRpbWUuZ2V0VVRDU2Vjb25kcygpO1xuICAgICAgICAgICAgdmFyIG1zZWMgPSBsb2NhbFRpbWUuZ2V0VVRDTWlsbGlzZWNvbmRzKCk7XG4gICAgICAgICAgICB2YXIgdCA9IGhvdXIgKiBNU19JTl9IT1VSICsgbWluICogTVNfSU5fTUlOICsgc2VjICogMTAwMCArIG1zZWM7XG4gICAgICAgICAgICByZXR1cm4gb3B0cy54U2NhbGUodCk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICAneSc6IHBvb2wuaGVpZ2h0KCkgLyA0LFxuICAgICAgICAgICdvcGFjaXR5JzogJzAnLFxuICAgICAgICAgICdjbGFzcyc6ICdkMy1zbWJnLW51bWJlcnMgZDMtdGV4dC1zbWJnIGQzLXNtYmctdGltZSdcbiAgICAgICAgfSlcbiAgICAgICAgLnRleHQoZnVuY3Rpb24oZCkge1xuICAgICAgICAgIHJldHVybiBkLnZhbHVlO1xuICAgICAgICB9KTtcblxuICAgICAgY2lyY2xlcy5leGl0KCkucmVtb3ZlKCk7XG5cbiAgICAgIG9wdHMuZW1pdHRlci5vbignbnVtYmVycycsIGZ1bmN0aW9uKHRvZ2dsZSkge1xuICAgICAgICBpZiAodG9nZ2xlID09PSAnc2hvdycpIHtcbiAgICAgICAgICBkMy5zZWxlY3RBbGwoJy5kMy1yZWN0LXNtYmcnKVxuICAgICAgICAgICAgLnN0eWxlKCdkaXNwbGF5JywgJ2lubGluZScpO1xuICAgICAgICAgIGQzLnNlbGVjdEFsbCgnLmQzLXRleHQtc21iZycpXG4gICAgICAgICAgICAudHJhbnNpdGlvbigpXG4gICAgICAgICAgICAuZHVyYXRpb24oNTAwKVxuICAgICAgICAgICAgLmF0dHIoJ29wYWNpdHknLCAxKTtcbiAgICAgICAgICBkMy5zZWxlY3RBbGwoJy5kMy1pbWFnZS1zbWJnJylcbiAgICAgICAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgICAgICAgIC5kdXJhdGlvbig1MDApXG4gICAgICAgICAgICAuYXR0cih7XG4gICAgICAgICAgICAgICdoZWlnaHQnOiBvcHRzLnNpemUgKiAwLjc1LFxuICAgICAgICAgICAgICAneSc6IHBvb2wuaGVpZ2h0KCkgLyAyXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh0b2dnbGUgPT09ICdoaWRlJykge1xuICAgICAgICAgIGQzLnNlbGVjdEFsbCgnLmQzLXJlY3Qtc21iZycpXG4gICAgICAgICAgICAuc3R5bGUoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgICAgICAgIGQzLnNlbGVjdEFsbCgnLmQzLXRleHQtc21iZycpXG4gICAgICAgICAgICAudHJhbnNpdGlvbigpXG4gICAgICAgICAgICAuZHVyYXRpb24oNTAwKVxuICAgICAgICAgICAgLmF0dHIoJ29wYWNpdHknLCAwKTtcbiAgICAgICAgICBkMy5zZWxlY3RBbGwoJy5kMy1pbWFnZS1zbWJnJylcbiAgICAgICAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgICAgICAgIC5kdXJhdGlvbig1MDApXG4gICAgICAgICAgICAuYXR0cih7XG4gICAgICAgICAgICAgICdoZWlnaHQnOiBvcHRzLnNpemUsXG4gICAgICAgICAgICAgICd5JzogcG9vbC5oZWlnaHQoKSAvIDIgLSBvcHRzLnNpemUgLyAyXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gc21iZztcbn07IiwiLyogXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqIENvcHlyaWdodCAoYykgMjAxNCwgVGlkZXBvb2wgUHJvamVjdFxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTsgeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeSBpdCB1bmRlclxuICogdGhlIHRlcm1zIG9mIHRoZSBhc3NvY2lhdGVkIExpY2Vuc2UsIHdoaWNoIGlzIGlkZW50aWNhbCB0byB0aGUgQlNEIDItQ2xhdXNlXG4gKiBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieSB0aGUgT3BlbiBTb3VyY2UgSW5pdGlhdGl2ZSBhdCBvcGVuc291cmNlLm9yZy5cbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsIGJ1dCBXSVRIT1VUXG4gKiBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTU1xuICogRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiBTZWUgdGhlIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqIFxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbTsgaWZcbiAqIG5vdCwgeW91IGNhbiBvYnRhaW4gb25lIGZyb20gVGlkZXBvb2wgUHJvamVjdCBhdCB0aWRlcG9vbC5vcmcuXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqL1xuXG52YXIgbG9nID0gcmVxdWlyZSgnLi4vbGliL2Jvd3MnKSgnU01CRycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHBvb2wsIG9wdHMpIHtcblxuICBvcHRzID0gb3B0cyB8fCB7fTtcblxuICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgY2xhc3Nlczoge1xuICAgICAgJ3ZlcnktbG93Jzogeydib3VuZGFyeSc6IDYwfSxcbiAgICAgICdsb3cnOiB7J2JvdW5kYXJ5JzogODAsICd0b29sdGlwJzogJ3NtYmdfdG9vbHRpcF9sb3cuc3ZnJ30sXG4gICAgICAndGFyZ2V0Jzogeydib3VuZGFyeSc6IDE4MCwgJ3Rvb2x0aXAnOiAnc21iZ190b29sdGlwX3RhcmdldC5zdmcnfSxcbiAgICAgICdoaWdoJzogeydib3VuZGFyeSc6IDIwMCwgJ3Rvb2x0aXAnOiAnc21iZ190b29sdGlwX2hpZ2guc3ZnJ30sXG4gICAgICAndmVyeS1oaWdoJzogeydib3VuZGFyeSc6IDMwMH1cbiAgICB9LFxuICAgIHNpemU6IDE2LFxuICAgIHhTY2FsZTogcG9vbC54U2NhbGUoKS5jb3B5KCksXG4gICAgeVNjYWxlOiBkMy5zY2FsZS5saW5lYXIoKS5kb21haW4oWzAsIDQwMF0pLnJhbmdlKFtwb29sLmhlaWdodCgpLCAwXSksXG4gICAgaW1hZ2VzQmFzZVVybDogcG9vbC5pbWFnZXNCYXNlVXJsKCksXG4gICAgdG9vbHRpcFdpZHRoOiA3MCxcbiAgICB0b29sdGlwSGVpZ2h0OiAyNFxuICB9O1xuXG4gIF8uZGVmYXVsdHMob3B0cywgZGVmYXVsdHMpO1xuXG4gIHZhciB0b29sdGlwcyA9IHBvb2wudG9vbHRpcHMoKTtcblxuICBmdW5jdGlvbiBzbWJnKHNlbGVjdGlvbikge1xuICAgIHNlbGVjdGlvbi5lYWNoKGZ1bmN0aW9uKGN1cnJlbnREYXRhKSB7XG4gICAgICB2YXIgY2lyY2xlcyA9IGQzLnNlbGVjdCh0aGlzKVxuICAgICAgICAuc2VsZWN0QWxsKCdpbWFnZScpXG4gICAgICAgIC5kYXRhKGN1cnJlbnREYXRhLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgcmV0dXJuIGQuaWQ7XG4gICAgICAgIH0pO1xuICAgICAgY2lyY2xlcy5lbnRlcigpXG4gICAgICAgIC5hcHBlbmQoJ2ltYWdlJylcbiAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICd4bGluazpocmVmJzogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgaWYgKGQudmFsdWUgPD0gb3B0cy5jbGFzc2VzWyd2ZXJ5LWxvdyddWydib3VuZGFyeSddKSB7XG4gICAgICAgICAgICAgIHJldHVybiBvcHRzLmltYWdlc0Jhc2VVcmwgKyAnL3NtYmcvdmVyeV9sb3cuc3ZnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKChkLnZhbHVlID4gb3B0cy5jbGFzc2VzWyd2ZXJ5LWxvdyddWydib3VuZGFyeSddKSAmJiAoZC52YWx1ZSA8PSBvcHRzLmNsYXNzZXNbJ2xvdyddWydib3VuZGFyeSddKSkge1xuICAgICAgICAgICAgICByZXR1cm4gb3B0cy5pbWFnZXNCYXNlVXJsICsgJy9zbWJnL2xvdy5zdmcnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoKGQudmFsdWUgPiBvcHRzLmNsYXNzZXNbJ2xvdyddWydib3VuZGFyeSddKSAmJiAoZC52YWx1ZSA8PSBvcHRzLmNsYXNzZXNbJ3RhcmdldCddWydib3VuZGFyeSddKSkge1xuICAgICAgICAgICAgICByZXR1cm4gb3B0cy5pbWFnZXNCYXNlVXJsICsgJy9zbWJnL3RhcmdldC5zdmcnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoKGQudmFsdWUgPiBvcHRzLmNsYXNzZXNbJ3RhcmdldCddWydib3VuZGFyeSddKSAmJiAoZC52YWx1ZSA8PSBvcHRzLmNsYXNzZXNbJ2hpZ2gnXVsnYm91bmRhcnknXSkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG9wdHMuaW1hZ2VzQmFzZVVybCArICcvc21iZy9oaWdoLnN2Zyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChkLnZhbHVlID4gb3B0cy5jbGFzc2VzWydoaWdoJ11bJ2JvdW5kYXJ5J10pIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG9wdHMuaW1hZ2VzQmFzZVVybCArICcvc21iZy92ZXJ5X2hpZ2guc3ZnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgICd4JzogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgcmV0dXJuIG9wdHMueFNjYWxlKERhdGUucGFyc2UoZC5ub3JtYWxUaW1lKSkgLSBvcHRzLnNpemUgLyAyO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgJ3knOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICByZXR1cm4gb3B0cy55U2NhbGUoZC52YWx1ZSkgLSBvcHRzLnNpemUgLyAyO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgJ3dpZHRoJzogb3B0cy5zaXplLFxuICAgICAgICAgICdoZWlnaHQnOiBvcHRzLnNpemUsXG4gICAgICAgICAgJ2lkJzogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgcmV0dXJuICdzbWJnXycgKyBkLmlkO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgJ2NsYXNzJzogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgaWYgKGQudmFsdWUgPD0gb3B0cy5jbGFzc2VzWydsb3cnXVsnYm91bmRhcnknXSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ2QzLWJnLWxvdyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICgoZC52YWx1ZSA+IG9wdHMuY2xhc3Nlc1snbG93J11bJ2JvdW5kYXJ5J10pICYmIChkLnZhbHVlIDw9IG9wdHMuY2xhc3Nlc1sndGFyZ2V0J11bJ2JvdW5kYXJ5J10pKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnZDMtYmctdGFyZ2V0JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGQudmFsdWUgPiBvcHRzLmNsYXNzZXNbJ3RhcmdldCddWydib3VuZGFyeSddKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnZDMtYmctaGlnaCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICAuY2xhc3NlZCh7J2QzLWltYWdlJzogdHJ1ZSwgJ2QzLXNtYmcnOiB0cnVlLCAnZDMtaW1hZ2Utc21iZyc6IHRydWV9KTtcbiAgICAgIGNpcmNsZXMuZXhpdCgpLnJlbW92ZSgpO1xuXG4gICAgICAvLyB0b29sdGlwc1xuICAgICAgZDMuc2VsZWN0QWxsKCcuZDMtaW1hZ2Utc21iZycpLm9uKCdtb3VzZW92ZXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKGQzLnNlbGVjdCh0aGlzKS5jbGFzc2VkKCdkMy1iZy1sb3cnKSkge1xuICAgICAgICAgIHNtYmcuYWRkVG9vbHRpcChkMy5zZWxlY3QodGhpcykuZGF0dW0oKSwgJ2xvdycpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGQzLnNlbGVjdCh0aGlzKS5jbGFzc2VkKCdkMy1iZy10YXJnZXQnKSkge1xuICAgICAgICAgIHNtYmcuYWRkVG9vbHRpcChkMy5zZWxlY3QodGhpcykuZGF0dW0oKSwgJ3RhcmdldCcpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHNtYmcuYWRkVG9vbHRpcChkMy5zZWxlY3QodGhpcykuZGF0dW0oKSwgJ2hpZ2gnKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBkMy5zZWxlY3RBbGwoJy5kMy1pbWFnZS1zbWJnJykub24oJ21vdXNlb3V0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBpZCA9IGQzLnNlbGVjdCh0aGlzKS5hdHRyKCdpZCcpLnJlcGxhY2UoJ3NtYmdfJywgJ3Rvb2x0aXBfJyk7XG4gICAgICAgIGQzLnNlbGVjdCgnIycgKyBpZCkucmVtb3ZlKCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIHNtYmcuYWRkVG9vbHRpcCA9IGZ1bmN0aW9uKGQsIGNhdGVnb3J5KSB7XG4gICAgZDMuc2VsZWN0KCcjJyArICdkMy10b29sdGlwLWdyb3VwX3NtYmcnKVxuICAgICAgLmNhbGwodG9vbHRpcHMsXG4gICAgICAgIGQsXG4gICAgICAgIC8vIHRvb2x0aXBYUG9zXG4gICAgICAgIG9wdHMueFNjYWxlKERhdGUucGFyc2UoZC5ub3JtYWxUaW1lKSksXG4gICAgICAgICdzbWJnJyxcbiAgICAgICAgLy8gdGltZXN0YW1wXG4gICAgICAgIHRydWUsXG4gICAgICAgIG9wdHMuY2xhc3Nlc1tjYXRlZ29yeV1bJ3Rvb2x0aXAnXSxcbiAgICAgICAgb3B0cy50b29sdGlwV2lkdGgsXG4gICAgICAgIG9wdHMudG9vbHRpcEhlaWdodCxcbiAgICAgICAgLy8gaW1hZ2VYXG4gICAgICAgIG9wdHMueFNjYWxlKERhdGUucGFyc2UoZC5ub3JtYWxUaW1lKSksXG4gICAgICAgIC8vIGltYWdlWVxuICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoKGNhdGVnb3J5ID09PSAnbG93JykgfHwgKGNhdGVnb3J5ID09PSAndGFyZ2V0JykpIHtcbiAgICAgICAgICAgIHJldHVybiBvcHRzLnlTY2FsZShkLnZhbHVlKSAtIG9wdHMudG9vbHRpcEhlaWdodDtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gb3B0cy55U2NhbGUoZC52YWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICAvLyB0ZXh0WFxuICAgICAgICBvcHRzLnhTY2FsZShEYXRlLnBhcnNlKGQubm9ybWFsVGltZSkpICsgb3B0cy50b29sdGlwV2lkdGggLyAyLFxuICAgICAgICAvLyB0ZXh0WVxuICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoKGNhdGVnb3J5ID09PSAnbG93JykgfHwgKGNhdGVnb3J5ID09PSAndGFyZ2V0JykpIHtcbiAgICAgICAgICAgIHJldHVybiBvcHRzLnlTY2FsZShkLnZhbHVlKSAtIG9wdHMudG9vbHRpcEhlaWdodCAvIDI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG9wdHMueVNjYWxlKGQudmFsdWUpICsgb3B0cy50b29sdGlwSGVpZ2h0IC8gMjtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICB9O1xuXG4gIHJldHVybiBzbWJnO1xufTsiLCIvKiBcbiAqID09IEJTRDIgTElDRU5TRSA9PVxuICogQ29weXJpZ2h0IChjKSAyMDE0LCBUaWRlcG9vbCBQcm9qZWN0XG4gKiBcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOyB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5IGl0IHVuZGVyXG4gKiB0aGUgdGVybXMgb2YgdGhlIGFzc29jaWF0ZWQgTGljZW5zZSwgd2hpY2ggaXMgaWRlbnRpY2FsIHRvIHRoZSBCU0QgMi1DbGF1c2VcbiAqIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5IHRoZSBPcGVuIFNvdXJjZSBJbml0aWF0aXZlIGF0IG9wZW5zb3VyY2Uub3JnLlxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCwgYnV0IFdJVEhPVVRcbiAqIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTXG4gKiBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuIFNlZSB0aGUgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICogXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtOyBpZlxuICogbm90LCB5b3UgY2FuIG9idGFpbiBvbmUgZnJvbSBUaWRlcG9vbCBQcm9qZWN0IGF0IHRpZGVwb29sLm9yZy5cbiAqID09IEJTRDIgTElDRU5TRSA9PVxuICovXG5cbnZhciBsb2cgPSByZXF1aXJlKCcuLi9saWIvYm93cycpKCdUb29sdGlwJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY29udGFpbmVyLCB0b29sdGlwc0dyb3VwKSB7XG5cbiAgdmFyIGlkLCB0aW1lc3RhbXBIZWlnaHQgPSAyMDtcblxuICBmdW5jdGlvbiB0b29sdGlwKHNlbGVjdGlvbixcbiAgICBkLFxuICAgIHRvb2x0aXBYUG9zLFxuICAgIHBhdGgsXG4gICAgbWFrZVRpbWVzdGFtcCxcbiAgICBpbWFnZSxcbiAgICB0b29sdGlwV2lkdGgsXG4gICAgdG9vbHRpcEhlaWdodCxcbiAgICBpbWFnZVgsIGltYWdlWSxcbiAgICB0ZXh0WCwgdGV4dFksXG4gICAgY3VzdG9tVGV4dCwgdHNwYW4pIHtcbiAgICB2YXIgdG9vbHRpcEdyb3VwID0gc2VsZWN0aW9uLmFwcGVuZCgnZycpXG4gICAgICAuYXR0cignY2xhc3MnLCAnZDMtdG9vbHRpcCcpXG4gICAgICAuYXR0cignaWQnLCAndG9vbHRpcF8nICsgZC5pZCk7XG5cbiAgICB2YXIgaW1hZ2VzQmFzZVVybCA9IGNvbnRhaW5lci5pbWFnZXNCYXNlVXJsKCk7XG5cbiAgICB2YXIgY3VycmVudFRyYW5zbGF0aW9uID0gY29udGFpbmVyLmN1cnJlbnRUcmFuc2xhdGlvbigpO1xuXG4gICAgdmFyIGxvY2F0aW9uSW5XaW5kb3cgPSBjdXJyZW50VHJhbnNsYXRpb24gKyB0b29sdGlwWFBvcztcblxuICAgIHZhciB0cmFuc2xhdGlvbiA9IDA7XG5cbiAgICB2YXIgbmV3QmFzYWxQb3NpdGlvbjtcblxuICAgIC8vIG1vdmluZyBiYXNhbCB0b29sdGlwcyBhdCBlZGdlcyBvZiBkaXNwbGF5XG4gICAgaWYgKHBhdGggPT09ICdiYXNhbCcpIHtcbiAgICAgIGlmIChsb2NhdGlvbkluV2luZG93ID4gY29udGFpbmVyLndpZHRoKCkgLSAoKChjb250YWluZXIud2lkdGgoKSAtIGNvbnRhaW5lci5heGlzR3V0dGVyKCkpIC8gMjQpICogMykpIHtcbiAgICAgICAgbmV3QmFzYWxQb3NpdGlvbiA9IC1jdXJyZW50VHJhbnNsYXRpb24gKyBjb250YWluZXIud2lkdGgoKSAtIHRvb2x0aXBXaWR0aDtcbiAgICAgICAgaWYgKG5ld0Jhc2FsUG9zaXRpb24gPCBpbWFnZVgpIHtcbiAgICAgICAgICB0cmFuc2xhdGlvbiA9IG5ld0Jhc2FsUG9zaXRpb24gLSBpbWFnZVg7XG4gICAgICAgICAgaW1hZ2VYID0gbmV3QmFzYWxQb3NpdGlvbjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZWxzZSBpZiAobG9jYXRpb25JbldpbmRvdyA8ICgoKGNvbnRhaW5lci53aWR0aCgpIC0gY29udGFpbmVyLmF4aXNHdXR0ZXIoKSkgLyAyNCkgKiAzKSkge1xuICAgICAgICBuZXdCYXNhbFBvc2l0aW9uID0gLWN1cnJlbnRUcmFuc2xhdGlvbiArIGNvbnRhaW5lci5heGlzR3V0dGVyKCk7XG4gICAgICAgIGlmIChuZXdCYXNhbFBvc2l0aW9uID4gaW1hZ2VYKSB7XG4gICAgICAgICAgdHJhbnNsYXRpb24gPSBuZXdCYXNhbFBvc2l0aW9uIC0gaW1hZ2VYO1xuICAgICAgICAgIGltYWdlWCA9IG5ld0Jhc2FsUG9zaXRpb247XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gYW5kIGJvbHVzLCBjYXJicywgY2JnLCBzbWJnXG4gICAgaWYgKChwYXRoID09PSAnYm9sdXMnKSB8fCAocGF0aCA9PT0gJ2NhcmJzJykgfHwgKHBhdGggPT09ICdjYmcnKSB8fCAocGF0aCA9PT0gJ3NtYmcnKSkge1xuICAgICAgaWYgKGxvY2F0aW9uSW5XaW5kb3cgPiBjb250YWluZXIud2lkdGgoKSAtICgoKGNvbnRhaW5lci53aWR0aCgpIC0gY29udGFpbmVyLmF4aXNHdXR0ZXIoKSkgLyAyNCkgKiAzKSkge1xuICAgICAgICB0cmFuc2xhdGlvbiA9IC10b29sdGlwV2lkdGg7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gZm9yIG5vdyAodW5sZXNzIEkgY2FuIHBlcnN1ZGUgU2FyYSBhbmQgQWxpeCBvdGhlcndpc2UpLCBoaWdoIGNiZyB2YWx1ZXMgYXJlIGEgc3BlY2lhbCBjYXNlXG4gICAgaWYgKGltYWdlLmluZGV4T2YoJ2NiZ190b29sdGlwX2hpZ2gnKSAhPSAtMSkge1xuICAgICAgaWYgKGxvY2F0aW9uSW5XaW5kb3cgPCAoKChjb250YWluZXIud2lkdGgoKSAtIGNvbnRhaW5lci5heGlzR3V0dGVyKCkpIC8gMjQpICogMykpIHtcbiAgICAgICAgdG9vbHRpcEdyb3VwLmFwcGVuZCgnaW1hZ2UnKVxuICAgICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAgICd4bGluazpocmVmJzogaW1hZ2VzQmFzZVVybCArICcvJyArIHBhdGggKyAnLycgKyBpbWFnZSxcbiAgICAgICAgICAgICd4JzogaW1hZ2VYLFxuICAgICAgICAgICAgJ3knOiBpbWFnZVksXG4gICAgICAgICAgICAnd2lkdGgnOiB0b29sdGlwV2lkdGgsXG4gICAgICAgICAgICAnaGVpZ2h0JzogdG9vbHRpcEhlaWdodCxcbiAgICAgICAgICAgICdjbGFzcyc6ICdkMy10b29sdGlwLWltYWdlJ1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgIHRvb2x0aXBHcm91cC5hcHBlbmQoJ3RleHQnKVxuICAgICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAgICd4JzogdGV4dFgsXG4gICAgICAgICAgICAneSc6IHRleHRZLFxuICAgICAgICAgICAgJ2NsYXNzJzogJ2QzLXRvb2x0aXAtdGV4dCBkMy0nICsgcGF0aFxuICAgICAgICAgIH0pXG4gICAgICAgICAgLnRleHQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gZC52YWx1ZTtcbiAgICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB0b29sdGlwR3JvdXAuYXBwZW5kKCdpbWFnZScpXG4gICAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgJ3hsaW5rOmhyZWYnOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgdmFyIHN0ciA9ICBpbWFnZXNCYXNlVXJsICsgJy8nICsgcGF0aCArICcvJyArIGltYWdlO1xuICAgICAgICAgICAgICByZXR1cm4gc3RyLnJlcGxhY2UoJy5zdmcnLCAnX2xlZnQuc3ZnJyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ3gnOiBpbWFnZVggLSB0b29sdGlwV2lkdGgsXG4gICAgICAgICAgICAneSc6IGltYWdlWSxcbiAgICAgICAgICAgICd3aWR0aCc6IHRvb2x0aXBXaWR0aCxcbiAgICAgICAgICAgICdoZWlnaHQnOiB0b29sdGlwSGVpZ2h0LFxuICAgICAgICAgICAgJ2NsYXNzJzogJ2QzLXRvb2x0aXAtaW1hZ2UnXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgdG9vbHRpcEdyb3VwLmFwcGVuZCgndGV4dCcpXG4gICAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgJ3gnOiB0ZXh0WCAtIHRvb2x0aXBXaWR0aCxcbiAgICAgICAgICAgICd5JzogdGV4dFksXG4gICAgICAgICAgICAnY2xhc3MnOiAnZDMtdG9vbHRpcC10ZXh0IGQzLScgKyBwYXRoXG4gICAgICAgICAgfSlcbiAgICAgICAgICAudGV4dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBkLnZhbHVlO1xuICAgICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBpZiB0aGUgZGF0YSBwb2ludCBpcyB0aHJlZSBob3VycyBmcm9tIHRoZSBlbmQgb2YgdGhlIGRhdGEgaW4gdmlldyBvciBsZXNzLCB1c2UgYSBsZWZ0IHRvb2x0aXBcbiAgICBlbHNlIGlmICgobG9jYXRpb25JbldpbmRvdyA+IGNvbnRhaW5lci53aWR0aCgpIC0gKCgoY29udGFpbmVyLndpZHRoKCkgLSBjb250YWluZXIuYXhpc0d1dHRlcigpKSAvIDI0KSAqIDMpKSAmJlxuICAgICAgKHBhdGggIT09ICdiYXNhbCcpKSB7XG4gICAgICB0b29sdGlwR3JvdXAuYXBwZW5kKCdpbWFnZScpXG4gICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAneGxpbms6aHJlZic6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHN0ciA9ICBpbWFnZXNCYXNlVXJsICsgJy8nICsgcGF0aCArICcvJyArIGltYWdlO1xuICAgICAgICAgICAgcmV0dXJuIHN0ci5yZXBsYWNlKCcuc3ZnJywgJ19sZWZ0LnN2ZycpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgJ3gnOiBpbWFnZVggLSB0b29sdGlwV2lkdGgsXG4gICAgICAgICAgJ3knOiBpbWFnZVksXG4gICAgICAgICAgJ3dpZHRoJzogdG9vbHRpcFdpZHRoLFxuICAgICAgICAgICdoZWlnaHQnOiB0b29sdGlwSGVpZ2h0LFxuICAgICAgICAgICdjbGFzcyc6ICdkMy10b29sdGlwLWltYWdlJ1xuICAgICAgICB9KTtcblxuICAgICAgaWYgKHRzcGFuKSB7XG4gICAgICAgIHRvb2x0aXBHcm91cC5hcHBlbmQoJ2cnKVxuICAgICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAgICdjbGFzcyc6ICdkMy10b29sdGlwLXRleHQtZ3JvdXAnLFxuICAgICAgICAgICAgJ3RyYW5zZm9ybSc6ICd0cmFuc2xhdGUoJyArIHRyYW5zbGF0aW9uICsgJywwKSdcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5hcHBlbmQoJ3RleHQnKVxuICAgICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAgICd4JzogdGV4dFgsXG4gICAgICAgICAgICAneSc6IHRleHRZLFxuICAgICAgICAgICAgJ2NsYXNzJzogJ2QzLXRvb2x0aXAtdGV4dCBkMy0nICsgcGF0aFxuICAgICAgICAgIH0pXG4gICAgICAgICAgLnRleHQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoY3VzdG9tVGV4dCkge1xuICAgICAgICAgICAgICByZXR1cm4gY3VzdG9tVGV4dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICByZXR1cm4gZC52YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgdG9vbHRpcEdyb3VwLnNlbGVjdCgnLmQzLXRvb2x0aXAtdGV4dC1ncm91cCcpLnNlbGVjdCgndGV4dCcpXG4gICAgICAgICAgLmFwcGVuZCgndHNwYW4nKVxuICAgICAgICAgIC50ZXh0KCcgJyArIHRzcGFuKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB0b29sdGlwR3JvdXAuYXBwZW5kKCdnJylcbiAgICAgICAgICAuYXR0cih7XG4gICAgICAgICAgICAnY2xhc3MnOiAnZDMtdG9vbHRpcC10ZXh0LWdyb3VwJyxcbiAgICAgICAgICAgICd0cmFuc2Zvcm0nOiAndHJhbnNsYXRlKCcgKyB0cmFuc2xhdGlvbiArICcsMCknXG4gICAgICAgICAgfSlcbiAgICAgICAgICAuYXBwZW5kKCd0ZXh0JylcbiAgICAgICAgICAuYXR0cih7XG4gICAgICAgICAgICAneCc6IHRleHRYLFxuICAgICAgICAgICAgJ3knOiB0ZXh0WSxcbiAgICAgICAgICAgICdjbGFzcyc6ICdkMy10b29sdGlwLXRleHQgZDMtJyArIHBhdGhcbiAgICAgICAgICB9KVxuICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKGN1c3RvbVRleHQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGN1c3RvbVRleHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGQudmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIGFkanVzdCB0aGUgdmFsdWVzIG5lZWRlZCBmb3IgdGhlIHRpbWVzdGFtcFxuICAgICAgLy8gVE9ETzogcmVhbGx5IHRoaXMgc2hvdWxkIGJlIHJlZmFjdG9yZWRcbiAgICAgIGltYWdlWCA9IGltYWdlWCAtIHRvb2x0aXBXaWR0aDtcbiAgICAgIHRleHRYID0gdGV4dFggLSB0b29sdGlwV2lkdGg7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdG9vbHRpcEdyb3VwLmFwcGVuZCgnaW1hZ2UnKVxuICAgICAgICAuYXR0cih7XG4gICAgICAgICAgJ3hsaW5rOmhyZWYnOiBpbWFnZXNCYXNlVXJsICsgJy8nICsgcGF0aCArICcvJyArIGltYWdlLFxuICAgICAgICAgICd4JzogaW1hZ2VYLFxuICAgICAgICAgICd5JzogaW1hZ2VZLFxuICAgICAgICAgICd3aWR0aCc6IHRvb2x0aXBXaWR0aCxcbiAgICAgICAgICAnaGVpZ2h0JzogdG9vbHRpcEhlaWdodCxcbiAgICAgICAgICAnY2xhc3MnOiAnZDMtdG9vbHRpcC1pbWFnZSdcbiAgICAgICAgfSk7XG5cbiAgICAgIGlmICh0c3Bhbikge1xuICAgICAgICB0b29sdGlwR3JvdXAuYXBwZW5kKCdnJylcbiAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICdjbGFzcyc6ICdkMy10b29sdGlwLXRleHQtZ3JvdXAnLFxuICAgICAgICAgICd0cmFuc2Zvcm0nOiAndHJhbnNsYXRlKCcgKyB0cmFuc2xhdGlvbiArICcsMCknXG4gICAgICAgIH0pXG4gICAgICAgIC5hcHBlbmQoJ3RleHQnKVxuICAgICAgICAuYXR0cih7XG4gICAgICAgICAgJ3gnOiB0ZXh0WCxcbiAgICAgICAgICAneSc6IHRleHRZLFxuICAgICAgICAgICdjbGFzcyc6ICdkMy10b29sdGlwLXRleHQgZDMtJyArIHBhdGhcbiAgICAgICAgfSlcbiAgICAgICAgLnRleHQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKGN1c3RvbVRleHQpIHtcbiAgICAgICAgICAgIHJldHVybiBjdXN0b21UZXh0O1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBkLnZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHRvb2x0aXBHcm91cC5zZWxlY3QoJy5kMy10b29sdGlwLXRleHQtZ3JvdXAnKS5zZWxlY3QoJ3RleHQnKVxuICAgICAgICAgIC5hcHBlbmQoJ3RzcGFuJylcbiAgICAgICAgICAudGV4dCgnICcgKyB0c3Bhbik7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdG9vbHRpcEdyb3VwLmFwcGVuZCgnZycpXG4gICAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgJ2NsYXNzJzogJ2QzLXRvb2x0aXAtdGV4dC1ncm91cCcsXG4gICAgICAgICAgICAndHJhbnNmb3JtJzogJ3RyYW5zbGF0ZSgnICsgdHJhbnNsYXRpb24gKyAnLDApJ1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLmFwcGVuZCgndGV4dCcpXG4gICAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgJ3gnOiB0ZXh0WCxcbiAgICAgICAgICAgICd5JzogdGV4dFksXG4gICAgICAgICAgICAnY2xhc3MnOiAnZDMtdG9vbHRpcC10ZXh0IGQzLScgKyBwYXRoXG4gICAgICAgICAgfSlcbiAgICAgICAgICAudGV4dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmIChjdXN0b21UZXh0KSB7XG4gICAgICAgICAgICAgIHJldHVybiBjdXN0b21UZXh0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIHJldHVybiBkLnZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgfVxuXG4gICAgaWYgKG1ha2VUaW1lc3RhbXApIHtcbiAgICAgIHRvb2x0aXAudGltZXN0YW1wKGQsIHRvb2x0aXBHcm91cCwgaW1hZ2VYLCBpbWFnZVksIHRleHRYLCB0ZXh0WSwgdG9vbHRpcFdpZHRoLCB0b29sdGlwSGVpZ2h0KTtcbiAgICB9XG4gIH1cblxuICB0b29sdGlwLnRpbWVzdGFtcCA9IGZ1bmN0aW9uKGQsIHRvb2x0aXBHcm91cCwgaW1hZ2VYLCBpbWFnZVksIHRleHRYLCB0ZXh0WSwgdG9vbHRpcFdpZHRoLCB0b29sdGlwSGVpZ2h0KSB7XG4gICAgdmFyIG1hZ2ljID0gdGltZXN0YW1wSGVpZ2h0ICogMS4yO1xuICAgIHZhciB0aW1lc3RhbXBZID0gaW1hZ2VZKCkgLSB0aW1lc3RhbXBIZWlnaHQ7XG4gICAgdmFyIHRpbWVzdGFtcFRleHRZID0gdGltZXN0YW1wWSArIG1hZ2ljIC8gMjtcblxuICAgIHZhciBmb3JtYXRUaW1lID0gZDMudGltZS5mb3JtYXQudXRjKFwiJS1JOiVNICVwXCIpO1xuICAgIHZhciB0ID0gZm9ybWF0VGltZShuZXcgRGF0ZShkLm5vcm1hbFRpbWUpKTtcbiAgICB0b29sdGlwR3JvdXAuYXBwZW5kKCdyZWN0JylcbiAgICAgIC5hdHRyKHtcbiAgICAgICAgJ3gnOiBpbWFnZVgsXG4gICAgICAgICd5JzogdGltZXN0YW1wWSxcbiAgICAgICAgJ3dpZHRoJzogdG9vbHRpcFdpZHRoLFxuICAgICAgICAnaGVpZ2h0JzogdGltZXN0YW1wSGVpZ2h0LFxuICAgICAgICAnY2xhc3MnOiAnZDMtdG9vbHRpcC1yZWN0J1xuICAgICAgfSk7XG4gICAgdG9vbHRpcEdyb3VwLmFwcGVuZCgndGV4dCcpXG4gICAgICAuYXR0cih7XG4gICAgICAgICd4JzogdGV4dFgsXG4gICAgICAgICd5JzogdGltZXN0YW1wVGV4dFksXG4gICAgICAgICdiYXNlbGluZS1zaGlmdCc6IChtYWdpYyAtIHRpbWVzdGFtcEhlaWdodCkgLyAyLFxuICAgICAgICAnY2xhc3MnOiAnZDMtdG9vbHRpcC10ZXh0IGQzLXRvb2x0aXAtdGltZXN0YW1wJ1xuICAgICAgfSlcbiAgICAgIC50ZXh0KCdhdCAnICsgdCk7XG4gIH07XG5cbiAgdG9vbHRpcC5hZGRHcm91cCA9IGZ1bmN0aW9uKHBvb2wsIHR5cGUpIHtcbiAgICB0b29sdGlwc0dyb3VwLmFwcGVuZCgnZycpXG4gICAgICAuYXR0cignaWQnLCB0b29sdGlwLmlkKCkgKyAnXycgKyB0eXBlKVxuICAgICAgLmF0dHIoJ3RyYW5zZm9ybScsIHBvb2wuYXR0cigndHJhbnNmb3JtJykpO1xuICB9O1xuXG4gIC8vIGdldHRlcnMgJiBzZXR0ZXJzXG4gIHRvb2x0aXAuaWQgPSBmdW5jdGlvbih4KSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gaWQ7XG4gICAgaWQgPSB0b29sdGlwc0dyb3VwLmF0dHIoJ2lkJyk7XG4gICAgcmV0dXJuIHRvb2x0aXA7XG4gIH07XG5cbiAgcmV0dXJuIHRvb2x0aXA7XG59O1xuIiwiLyogXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqIENvcHlyaWdodCAoYykgMjAxNCwgVGlkZXBvb2wgUHJvamVjdFxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTsgeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeSBpdCB1bmRlclxuICogdGhlIHRlcm1zIG9mIHRoZSBhc3NvY2lhdGVkIExpY2Vuc2UsIHdoaWNoIGlzIGlkZW50aWNhbCB0byB0aGUgQlNEIDItQ2xhdXNlXG4gKiBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieSB0aGUgT3BlbiBTb3VyY2UgSW5pdGlhdGl2ZSBhdCBvcGVuc291cmNlLm9yZy5cbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsIGJ1dCBXSVRIT1VUXG4gKiBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTU1xuICogRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiBTZWUgdGhlIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqIFxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbTsgaWZcbiAqIG5vdCwgeW91IGNhbiBvYnRhaW4gb25lIGZyb20gVGlkZXBvb2wgUHJvamVjdCBhdCB0aWRlcG9vbC5vcmcuXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqL1xuXG52YXIgbG9nID0gcmVxdWlyZSgnLi9saWIvYm93cycpKCdQb29sJyk7XG4gXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGNvbnRhaW5lcikge1xuXG4gIHZhciBkYXRhLFxuICAgIGlkLCBsYWJlbCxcbiAgICBpbmRleCwgd2VpZ2h0LCB5UG9zaXRpb24sXG4gICAgaGVpZ2h0LCBtaW5IZWlnaHQsIG1heEhlaWdodCxcbiAgICBncm91cCxcbiAgICBtYWluU1ZHID0gZDMuc2VsZWN0KGNvbnRhaW5lci5pZCgpKSxcbiAgICB4U2NhbGUgPSBjb250YWluZXIueFNjYWxlKCkuY29weSgpLFxuICAgIGltYWdlc0Jhc2VVcmwgPSBjb250YWluZXIuaW1hZ2VzQmFzZVVybCgpLFxuICAgIHlBeGlzID0gW10sXG4gICAgcGxvdFR5cGVzID0gW107XG5cbiAgdmFyIGRlZmF1bHRzID0ge1xuICAgIG1pbkhlaWdodDogMjAsXG4gICAgbWF4SGVpZ2h0OiAzMDBcbiAgfTtcblxuICBmdW5jdGlvbiBwb29sKHNlbGVjdGlvbiwgcG9vbERhdGEpIHtcbiAgICAvLyBzZWxlY3QgdGhlIHBvb2wgZ3JvdXAgaWYgaXQgYWxyZWFkeSBleGlzdHNcbiAgICBncm91cCA9IHNlbGVjdGlvbi5zZWxlY3RBbGwoJyMnICsgaWQpLmRhdGEoW3Bvb2xEYXRhXSk7XG4gICAgLy8gb3RoZXJ3aXNlIGNyZWF0ZSBhIG5ldyBwb29sIGdyb3VwXG4gICAgZ3JvdXAuZW50ZXIoKS5hcHBlbmQoJ2cnKS5hdHRyKHtcbiAgICAgICdpZCc6IGlkLFxuICAgICAgJ3RyYW5zZm9ybSc6ICd0cmFuc2xhdGUoMCwnICsgeVBvc2l0aW9uICsgJyknXG4gICAgfSk7XG4gICAgcGxvdFR5cGVzLmZvckVhY2goZnVuY3Rpb24ocGxvdFR5cGUpIHtcbiAgICAgIGlmIChjb250YWluZXIuZGF0YUZpbGxbcGxvdFR5cGUudHlwZV0pIHtcbiAgICAgICAgcGxvdFR5cGUuZGF0YSA9IF8ud2hlcmUocG9vbERhdGEsIHsndHlwZSc6IHBsb3RUeXBlLnR5cGV9KTtcbiAgICAgICAgZGF0YUdyb3VwID0gZ3JvdXAuc2VsZWN0QWxsKCcjJyArIGlkICsgJ18nICsgcGxvdFR5cGUudHlwZSkuZGF0YShbcGxvdFR5cGUuZGF0YV0pO1xuICAgICAgICBkYXRhR3JvdXAuZW50ZXIoKS5hcHBlbmQoJ2cnKS5hdHRyKCdpZCcsIGlkICsgJ18nICsgcGxvdFR5cGUudHlwZSk7XG4gICAgICAgIGRhdGFHcm91cC5jYWxsKHBsb3RUeXBlLnBsb3QpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHBvb2wubm9EYXRhRmlsbChwbG90VHlwZSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcG9vbC5kcmF3QXhpcygpO1xuICAgIHBvb2wuZHJhd0xhYmVsKCk7XG4gIH1cblxuICAvLyBjaGFpbmFibGUgbWV0aG9kc1xuICBwb29sLmRlZmF1bHRzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICBwcm9wZXJ0aWVzID0gZGVmYXVsdHM7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcHJvcGVydGllcyA9IG9iajtcbiAgICB9XG4gICAgdGhpcy5taW5IZWlnaHQocHJvcGVydGllcy5taW5IZWlnaHQpLm1heEhlaWdodChwcm9wZXJ0aWVzLm1heEhlaWdodCk7XG4gICAgdGhpcy50b29sdGlwcyhjb250YWluZXIudG9vbHRpcHMpO1xuXG4gICAgcmV0dXJuIHBvb2w7XG4gIH07XG5cbiAgcG9vbC5wYW4gPSBmdW5jdGlvbihlKSB7XG4gICAgY29udGFpbmVyLmxhdGVzdFRyYW5zbGF0aW9uKGUudHJhbnNsYXRlWzBdKTtcbiAgICBwbG90VHlwZXMuZm9yRWFjaChmdW5jdGlvbihwbG90VHlwZSkge1xuICAgICAgZDMuc2VsZWN0KCcjJyArIGlkICsgJ18nICsgcGxvdFR5cGUudHlwZSkuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgnICsgZS50cmFuc2xhdGVbMF0gKyAnLDApJyk7XG4gICAgfSk7XG4gIH07XG5cbiAgcG9vbC5zY3JvbGwgPSBmdW5jdGlvbihlKSB7XG4gICAgY29udGFpbmVyLmxhdGVzdFRyYW5zbGF0aW9uKGUudHJhbnNsYXRlWzFdKTtcbiAgICBwbG90VHlwZXMuZm9yRWFjaChmdW5jdGlvbihwbG90VHlwZSkge1xuICAgICAgZDMuc2VsZWN0KCcjJyArIGlkICsgJ18nICsgcGxvdFR5cGUudHlwZSkuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgwLCcgKyBlLnRyYW5zbGF0ZVsxXSArICcpJyk7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gb25seSBvbmNlIG1ldGhvZHNcbiAgcG9vbC5kcmF3TGFiZWwgPSBfLm9uY2UoZnVuY3Rpb24oKSB7XG4gICAgdmFyIGxhYmVsR3JvdXAgPSBkMy5zZWxlY3QoJyN0aWRlbGluZUxhYmVscycpO1xuICAgIGxhYmVsR3JvdXAuYXBwZW5kKCd0ZXh0JylcbiAgICAgIC5hdHRyKHtcbiAgICAgICAgJ2lkJzogJ3Bvb2xfJyArIGlkICsgJ19sYWJlbCcsXG4gICAgICAgICdjbGFzcyc6ICdkMy1wb29sLWxhYmVsJyxcbiAgICAgICAgJ3RyYW5zZm9ybSc6ICd0cmFuc2xhdGUoJyArIGNvbnRhaW5lci5heGlzR3V0dGVyKCkgKyAnLCcgKyB5UG9zaXRpb24gKyAnKSdcbiAgICAgIH0pXG4gICAgICAudGV4dChsYWJlbCk7XG4gICAgcmV0dXJuIHBvb2xcbiAgfSk7XG5cbiAgcG9vbC5kcmF3QXhpcyA9IF8ub25jZShmdW5jdGlvbigpIHtcbiAgICB2YXIgYXhpc0dyb3VwID0gZDMuc2VsZWN0KCcjdGlkZWxpbmVZQXhlcycpO1xuICAgIHlBeGlzLmZvckVhY2goZnVuY3Rpb24oYXhpcywgaSkge1xuICAgICAgYXhpc0dyb3VwLmFwcGVuZCgnZycpXG4gICAgICAgIC5hdHRyKCdjbGFzcycsICdkMy15IGQzLWF4aXMnKVxuICAgICAgICAuYXR0cignaWQnLCAncG9vbF8nICsgaWQgKyAnX3lBeGlzXycgKyBpKVxuICAgICAgICAuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgnICsgKGNvbnRhaW5lci5heGlzR3V0dGVyKCkgLSAxKSArICcsJyArIHlQb3NpdGlvbiArICcpJylcbiAgICAgICAgLmNhbGwoYXhpcyk7XG4gICAgICB9KTtcbiAgICByZXR1cm4gcG9vbDtcbiAgfSk7XG5cbiAgcG9vbC5ub0RhdGFGaWxsID0gXy5vbmNlKGZ1bmN0aW9uKHBsb3RUeXBlKSB7XG4gICAgZDMuc2VsZWN0KCcjJyArIGlkKS5hcHBlbmQoJ2cnKS5hdHRyKCdpZCcsIGlkICsgJ18nICsgcGxvdFR5cGUudHlwZSkuY2FsbChwbG90VHlwZS5wbG90KTtcbiAgICByZXR1cm4gcG9vbDtcbiAgfSk7XG5cbiAgLy8gZ2V0dGVycyAmIHNldHRlcnNcbiAgcG9vbC5pZCA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBpZDtcbiAgICBpZCA9IHg7XG4gICAgcmV0dXJuIHBvb2w7XG4gIH07XG5cbiAgcG9vbC5sYWJlbCA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBsYWJlbDtcbiAgICBsYWJlbCA9IHg7XG4gICAgcmV0dXJuIHBvb2w7XG4gIH07XG5cbiAgcG9vbC5pbmRleCA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBpbmRleDtcbiAgICBpbmRleCA9IHg7XG4gICAgcmV0dXJuIHBvb2w7XG4gIH07XG5cbiAgcG9vbC53ZWlnaHQgPSBmdW5jdGlvbih4KSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gd2VpZ2h0O1xuICAgIHdlaWdodCA9IHg7XG4gICAgcmV0dXJuIHBvb2w7XG4gIH07XG5cbiAgcG9vbC55UG9zaXRpb24gPSBmdW5jdGlvbih4KSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4geVBvc2l0aW9uO1xuICAgIHlQb3NpdGlvbiA9IHg7XG4gICAgcmV0dXJuIHBvb2w7XG4gIH07XG5cbiAgcG9vbC5taW5IZWlnaHQgPSBmdW5jdGlvbih4KSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gbWluSGVpZ2h0O1xuICAgIG1pbkhlaWdodCA9IHg7XG4gICAgcmV0dXJuIHBvb2w7XG4gIH07XG5cbiAgcG9vbC5tYXhIZWlnaHQgPSBmdW5jdGlvbih4KSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gbWF4SGVpZ2h0O1xuICAgIG1heEhlaWdodCA9IHg7XG4gICAgcmV0dXJuIHBvb2w7XG4gIH07XG5cbiAgcG9vbC5oZWlnaHQgPSBmdW5jdGlvbih4KSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gaGVpZ2h0O1xuICAgIHggPSB4ICogcG9vbC53ZWlnaHQoKTtcbiAgICBpZiAoeCA8PSBtYXhIZWlnaHQpIHtcbiAgICAgIGlmICh4ID49IG1pbkhlaWdodCkge1xuICAgICAgICBoZWlnaHQgPSB4O1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGhlaWdodCA9IG1pbkhlaWdodDtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBoZWlnaHQgPSBtYXhIZWlnaHQ7XG4gICAgfVxuICAgIHJldHVybiBwb29sO1xuICB9O1xuXG4gIHBvb2wubWFpblNWRyA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBtYWluU1ZHO1xuICAgIG1haW5TVkcgPSB4O1xuICAgIHJldHVybiBwb29sO1xuICB9O1xuXG4gIHBvb2wueFNjYWxlID0gZnVuY3Rpb24oZikge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHhTY2FsZTtcbiAgICB4U2NhbGUgPSBmO1xuICAgIHJldHVybiBwb29sO1xuICB9O1xuXG4gIHBvb2wuaW1hZ2VzQmFzZVVybCA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBpbWFnZXNCYXNlVXJsO1xuICAgIGltYWdlc0Jhc2VVcmwgPSB4O1xuICAgIHJldHVybiBwb29sO1xuICB9O1xuXG4gIC8vIFRPRE86IHJlcGxhY2VcbiAgcG9vbC55QXhpcyA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiB5QXhpcztcbiAgICB5QXhpcy5wdXNoKHgpO1xuICAgIHJldHVybiBwb29sO1xuICB9O1xuXG4gIHBvb2wuYWRkUGxvdFR5cGUgPSBmdW5jdGlvbiAoZGF0YVR5cGUsIHBsb3RGdW5jdGlvbiwgZGF0YUZpbGxCb29sZWFuKSB7XG4gICAgcGxvdFR5cGVzLnB1c2goe1xuICAgICAgdHlwZTogZGF0YVR5cGUsXG4gICAgICBwbG90OiBwbG90RnVuY3Rpb25cbiAgICB9KTtcbiAgICBpZiAoZGF0YUZpbGxCb29sZWFuKSB7XG4gICAgICBjb250YWluZXIuZGF0YUZpbGxbZGF0YVR5cGVdID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHBvb2w7XG4gIH07XG5cbiAgcG9vbC50b29sdGlwcyA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiB0b29sdGlwcztcbiAgICB0b29sdGlwcyA9IHg7XG4gICAgcmV0dXJuIHRvb2x0aXBzO1xuICB9O1xuXG4gIHJldHVybiBwb29sO1xufTsiLCIvKiBcbiAqID09IEJTRDIgTElDRU5TRSA9PVxuICogQ29weXJpZ2h0IChjKSAyMDE0LCBUaWRlcG9vbCBQcm9qZWN0XG4gKiBcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOyB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5IGl0IHVuZGVyXG4gKiB0aGUgdGVybXMgb2YgdGhlIGFzc29jaWF0ZWQgTGljZW5zZSwgd2hpY2ggaXMgaWRlbnRpY2FsIHRvIHRoZSBCU0QgMi1DbGF1c2VcbiAqIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5IHRoZSBPcGVuIFNvdXJjZSBJbml0aWF0aXZlIGF0IG9wZW5zb3VyY2Uub3JnLlxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCwgYnV0IFdJVEhPVVRcbiAqIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTXG4gKiBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuIFNlZSB0aGUgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICogXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtOyBpZlxuICogbm90LCB5b3UgY2FuIG9idGFpbiBvbmUgZnJvbSBUaWRlcG9vbCBQcm9qZWN0IGF0IHRpZGVwb29sLm9yZy5cbiAqID09IEJTRDIgTElDRU5TRSA9PVxuICovXG5cbnZhciBsb2cgPSByZXF1aXJlKCcuL2xpYi9ib3dzJykoJ1R3byBXZWVrJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZW1pdHRlcikge1xuICB2YXIgcG9vbCA9IHJlcXVpcmUoJy4vcG9vbCcpO1xuXG4gIHZhciBNU19JTl8yNCA9IDg2NDAwMDAwO1xuXG4gIHZhciBidWNrZXQsXG4gICAgaWQsXG4gICAgd2lkdGgsIG1pbldpZHRoLFxuICAgIGhlaWdodCwgbWluSGVpZ2h0LFxuICAgIGltYWdlc0Jhc2VVcmwsXG4gICAgc3RhdHNIZWlnaHQsXG4gICAgYXhpc0d1dHRlcixcbiAgICBuYXYgPSB7fSxcbiAgICBwb29scyA9IFtdLFxuICAgIHhTY2FsZSA9IGQzLnNjYWxlLmxpbmVhcigpLFxuICAgIHhBeGlzID0gZDMuc3ZnLmF4aXMoKS5zY2FsZSh4U2NhbGUpLm9yaWVudCgndG9wJykub3V0ZXJUaWNrU2l6ZSgwKS5pbm5lclRpY2tTaXplKDE1KVxuICAgICAgLnRpY2tWYWx1ZXMoZnVuY3Rpb24oKSB7XG4gICAgICAgIGEgPSBbXVxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgODsgaSsrKSB7XG4gICAgICAgICAgYS5wdXNoKChNU19JTl8yNC84KSAqIGkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhO1xuICAgICAgfSlcbiAgICAgIC50aWNrRm9ybWF0KGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgaG91ciA9IGQvKE1TX0lOXzI0LzI0KTtcbiAgICAgICAgaWYgKChob3VyID4gMCkgJiYgKGhvdXIgPCAxMikpIHtcbiAgICAgICAgICByZXR1cm4gaG91ciArICcgYW0nO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGhvdXIgPiAxMikge1xuICAgICAgICAgIHJldHVybiAoaG91ciAtIDEyKSArICcgcG0nO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGhvdXIgPT09IDApIHtcbiAgICAgICAgICByZXR1cm4gJzEyIGFtJztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gJzEyIHBtJztcbiAgICAgICAgfVxuICAgICAgfSksXG4gICAgeVNjYWxlID0gZDMudGltZS5zY2FsZS51dGMoKSxcbiAgICB5QXhpcyA9IGQzLnN2Zy5heGlzKCkuc2NhbGUoeVNjYWxlKS5vcmllbnQoJ2xlZnQnKS5vdXRlclRpY2tTaXplKDApLnRpY2tGb3JtYXQoZDMudGltZS5mb3JtYXQudXRjKFwiJWEgJS1kXCIpKSxcbiAgICBkYXRhLCBhbGxEYXRhID0gW10sIGVuZHBvaW50cywgdmlld0VuZHBvaW50cywgZGF0YVN0YXJ0Tm9vbiwgdmlld0luZGV4LFxuICAgIG1haW5Hcm91cCwgc2Nyb2xsTmF2LCBzY3JvbGxIYW5kbGVUcmlnZ2VyID0gdHJ1ZTtcblxuICBjb250YWluZXIuZGF0YUZpbGwgPSB7fTtcblxuICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgYnVja2V0OiAkKCcjdGlkZWxpbmVDb250YWluZXInKSxcbiAgICBpZDogJ3RpZGVsaW5lU1ZHJyxcbiAgICBtaW5XaWR0aDogNDAwLFxuICAgIG1pbkhlaWdodDogNDAwLFxuICAgIGltYWdlc0Jhc2VVcmw6ICdpbWcnLFxuICAgIG5hdjoge1xuICAgICAgbWluTmF2SGVpZ2h0OiAzMCxcbiAgICAgIGxhdGVzdFRyYW5zbGF0aW9uOiAwLFxuICAgICAgY3VycmVudFRyYW5zbGF0aW9uOiAwLFxuICAgICAgc2Nyb2xsVGh1bWJSYWRpdXM6IDgsXG4gICAgICBuYXZHdXR0ZXI6IDIwXG4gICAgfSxcbiAgICBheGlzR3V0dGVyOiA2MCxcbiAgICBzdGF0c0hlaWdodDogNTBcbiAgfTtcblxuICBmdW5jdGlvbiBjb250YWluZXIoc2VsZWN0aW9uKSB7XG4gICAgc2VsZWN0aW9uLmVhY2goZnVuY3Rpb24oY3VycmVudERhdGEpIHtcbiAgICAgIC8vIHNlbGVjdCB0aGUgU1ZHIGlmIGl0IGFscmVhZHkgZXhpc3RzXG4gICAgICB2YXIgbWFpblNWRyA9IHNlbGVjdGlvbi5zZWxlY3RBbGwoJ3N2ZycpLmRhdGEoW2N1cnJlbnREYXRhXSk7XG4gICAgICAvLyBvdGhlcndpc2UgY3JlYXRlIGEgbmV3IFNWRyBhbmQgZW50ZXIgICBcbiAgICAgIG1haW5Hcm91cCA9IG1haW5TVkcuZW50ZXIoKS5hcHBlbmQoJ3N2ZycpLmFwcGVuZCgnZycpLmF0dHIoJ2lkJywgJ3RpZGVsaW5lTWFpbicpO1xuXG4gICAgICAvLyB1cGRhdGUgU1ZHIGRpbWVuaW9ucyBhbmQgSURcbiAgICAgIG1haW5TVkcuYXR0cih7XG4gICAgICAgICdpZCc6IGlkLFxuICAgICAgICAnd2lkdGgnOiB3aWR0aCxcbiAgICAgICAgJ2hlaWdodCc6IGhlaWdodFxuICAgICAgfSk7XG5cbiAgICAgIG1haW5Hcm91cC5hcHBlbmQoJ3JlY3QnKVxuICAgICAgICAuYXR0cih7XG4gICAgICAgICAgJ2lkJzogJ3Bvb2xzSW52aXNpYmxlUmVjdCcsXG4gICAgICAgICAgJ3dpZHRoJzogd2lkdGggLSBuYXYubmF2R3V0dGVyLFxuICAgICAgICAgICdoZWlnaHQnOiBoZWlnaHQsXG4gICAgICAgICAgJ29wYWNpdHknOiAwLjBcbiAgICAgICAgfSk7XG5cbiAgICAgIGNvbnRhaW5lci5wb29sR3JvdXAgPSBtYWluR3JvdXAuYXBwZW5kKCdnJykuYXR0cignaWQnLCAndGlkZWxpbmVQb29scycpO1xuXG4gICAgICAvLyBzZXQgdGhlIGRvbWFpbiBhbmQgcmFuZ2UgZm9yIHRoZSB0d28td2VlayB4LXNjYWxlXG4gICAgICB4U2NhbGUuZG9tYWluKFswLCBNU19JTl8yNF0pXG4gICAgICAgIC5yYW5nZShbY29udGFpbmVyLmF4aXNHdXR0ZXIoKSwgd2lkdGggLSBuYXYubmF2R3V0dGVyXSk7XG5cbiAgICAgIG1haW5Hcm91cC5hcHBlbmQoJ2cnKVxuICAgICAgICAuYXR0cignaWQnLCAndGlkZWxpbmVYQXhpc0dyb3VwJylcbiAgICAgICAgLmFwcGVuZCgncmVjdCcpXG4gICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAnaWQnOiAneEF4aXNJbnZpc2libGVSZWN0JyxcbiAgICAgICAgICAneCc6IGNvbnRhaW5lci5heGlzR3V0dGVyKCksXG4gICAgICAgICAgJ2hlaWdodCc6IG5hdi5heGlzSGVpZ2h0IC0gMixcbiAgICAgICAgICAnd2lkdGgnOiB3aWR0aCAtIGF4aXNHdXR0ZXIsXG4gICAgICAgICAgJ2ZpbGwnOiAnd2hpdGUnXG4gICAgICAgIH0pO1xuXG4gICAgICBkMy5zZWxlY3QoJyN0aWRlbGluZVhBeGlzR3JvdXAnKVxuICAgICAgICAuYXBwZW5kKCdnJylcbiAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ2QzLXggZDMtYXhpcycpXG4gICAgICAgIC5hdHRyKCdpZCcsICd0aWRlbGluZVhBeGlzJylcbiAgICAgICAgLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoMCwnICsgKG5hdi5heGlzSGVpZ2h0IC0gMSkgKyAnKScpXG4gICAgICAgIC5jYWxsKHhBeGlzKTtcblxuICAgICAgZDMuc2VsZWN0QWxsKCcjdGlkZWxpbmVYQXhpcyBnLnRpY2sgdGV4dCcpLnN0eWxlKCd0ZXh0LWFuY2hvcicsICdzdGFydCcpLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoNSwxNSknKTtcblxuICAgICAgLy8gc2V0IHRoZSBkb21haW4gYW5kIHJhbmdlIGZvciB0aGUgbWFpbiB0d28td2VlayB5LXNjYWxlXG4gICAgICB5U2NhbGUuZG9tYWluKHZpZXdFbmRwb2ludHMpXG4gICAgICAgIC5yYW5nZShbbmF2LmF4aXNIZWlnaHQsIGhlaWdodCAtIHN0YXRzSGVpZ2h0XSlcbiAgICAgICAgLnRpY2tzKGQzLnRpbWUuZGF5LnV0YywgMSk7XG5cbiAgICAgIGNvbnRhaW5lci5uYXZTdHJpbmcoeVNjYWxlLmRvbWFpbigpKTtcblxuICAgICAgbWFpbkdyb3VwLmFwcGVuZCgnZycpXG4gICAgICAgIC5hdHRyKCdpZCcsICd0aWRlbGluZVlBeGlzR3JvdXAnKVxuICAgICAgICAuYXBwZW5kKCdyZWN0JylcbiAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICdpZCc6ICd5QXhpc0ludmlzaWJsZVJlY3QnLFxuICAgICAgICAgICd4JzogMCxcbiAgICAgICAgICAnaGVpZ2h0JzogaGVpZ2h0LFxuICAgICAgICAgICd3aWR0aCc6IGF4aXNHdXR0ZXIsXG4gICAgICAgICAgJ2ZpbGwnOiAnd2hpdGUnXG4gICAgICAgIH0pO1xuXG4gICAgICBkMy5zZWxlY3QoJyN0aWRlbGluZVlBeGlzR3JvdXAnKVxuICAgICAgICAuYXBwZW5kKCdnJylcbiAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ2QzLXkgZDMtYXhpcyBkMy1kYXktYXhpcycpXG4gICAgICAgIC5hdHRyKCdpZCcsICd0aWRlbGluZVlBeGlzJylcbiAgICAgICAgLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArIChheGlzR3V0dGVyIC0gMSkgKyAnLDApJylcbiAgICAgICAgLmNhbGwoeUF4aXMpO1xuXG4gICAgICBjb250YWluZXIuZGF5c0dyb3VwID0gY29udGFpbmVyLnBvb2xHcm91cC5hcHBlbmQoJ2cnKS5hdHRyKCdpZCcsICdkYXlzR3JvdXAnKTtcblxuICAgICAgc3RhdHNHcm91cCA9IGNvbnRhaW5lci5wb29sR3JvdXAuYXBwZW5kKCdnJykuYXR0cignaWQnLCAncG9vbFN0YXRzJylcbiAgICAgICAgLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArIGNvbnRhaW5lci5heGlzR3V0dGVyKCkgKyAnLCcgKyAoaGVpZ2h0IC0gY29udGFpbmVyLnN0YXRzSGVpZ2h0KCkpICsgJyknKVxuICAgICAgICAuYXBwZW5kKCdyZWN0JylcbiAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICd4JzogMCxcbiAgICAgICAgICAneSc6IDAsXG4gICAgICAgICAgJ3dpZHRoJzogd2lkdGggLSBjb250YWluZXIuYXhpc0d1dHRlcigpIC0gY29udGFpbmVyLm5hdkd1dHRlcigpLFxuICAgICAgICAgICdoZWlnaHQnOiBjb250YWluZXIuc3RhdHNIZWlnaHQoKSxcbiAgICAgICAgICAnZmlsbCc6ICd3aGl0ZSdcbiAgICAgICAgfSk7XG5cbiAgICAgIHNjcm9sbE5hdiA9IG1haW5Hcm91cC5hcHBlbmQoJ2cnKVxuICAgICAgICAuYXR0cignY2xhc3MnLCAneSBzY3JvbGwnKVxuICAgICAgICAuYXR0cignaWQnLCAndGlkZWxpbmVTY3JvbGxOYXYnKTtcblxuICAgICAgbmF2LnNjcm9sbFNjYWxlID0gZDMudGltZS5zY2FsZS51dGMoKVxuICAgICAgICAuZG9tYWluKFtkYXRhU3RhcnROb29uLCBkYXRhRW5kTm9vbl0pXG4gICAgICAgIC5yYW5nZShbbmF2LmF4aXNIZWlnaHQgKyBuYXYuc2Nyb2xsVGh1bWJSYWRpdXMsIGhlaWdodCAtIHN0YXRzSGVpZ2h0IC0gbmF2LnNjcm9sbFRodW1iUmFkaXVzXSk7XG4gICAgfSk7XG4gIH1cblxuICAvLyBub24tY2hhaW5hYmxlIG1ldGhvZHNcbiAgY29udGFpbmVyLm5ld1Bvb2wgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcCA9IG5ldyBwb29sKGNvbnRhaW5lcik7XG4gICAgcG9vbHMucHVzaChwKTtcbiAgICByZXR1cm4gcDtcbiAgfTtcblxuICBjb250YWluZXIuYXJyYW5nZVBvb2xzID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gMTQgZGF5cyA9IDIgd2Vla3NcbiAgICAvLyBUT0RPOiBldmVudHVhbGx5IGZhY3RvciB0aGlzIG91dCBzbyB0aGF0IHRoaXMgdmlldyBjb3VsZCBiZSBnZW5lcmFsaXplZCB0byBhbm90aGVyIHRpbWUgcGVyaW9kXG4gICAgdmFyIG51bVBvb2xzID0gMTQ7XG4gICAgLy8gYWxsIHR3by13ZWVrIHBvb2xzIGhhdmUgYSB3ZWlnaHQgb2YgMS4wXG4gICAgdmFyIHdlaWdodCA9IDEuMDtcbiAgICB2YXIgY3VtV2VpZ2h0ID0gd2VpZ2h0ICogbnVtUG9vbHM7XG4gICAgdmFyIHRvdGFsUG9vbHNIZWlnaHQgPSBcbiAgICAgIGNvbnRhaW5lci5oZWlnaHQoKSAtIGNvbnRhaW5lci5heGlzSGVpZ2h0KCkgLSBjb250YWluZXIuc3RhdHNIZWlnaHQoKTtcbiAgICB2YXIgcG9vbFNjYWxlSGVpZ2h0ID0gdG90YWxQb29sc0hlaWdodC9jdW1XZWlnaHQ7XG4gICAgdmFyIGFjdHVhbFBvb2xzSGVpZ2h0ID0gMDtcbiAgICBwb29scy5mb3JFYWNoKGZ1bmN0aW9uKHBvb2wpIHtcbiAgICAgIHBvb2wuaGVpZ2h0KHBvb2xTY2FsZUhlaWdodCk7XG4gICAgICBhY3R1YWxQb29sc0hlaWdodCArPSBwb29sLmhlaWdodCgpO1xuICAgICAgcG9vbFNjYWxlSGVpZ2h0ID0gcG9vbC5oZWlnaHQoKTtcbiAgICB9KTtcbiAgICB2YXIgY3VycmVudFlQb3NpdGlvbiA9IGNvbnRhaW5lci5oZWlnaHQoKSAtIGNvbnRhaW5lci5zdGF0c0hlaWdodCgpIC0gcG9vbFNjYWxlSGVpZ2h0O1xuICAgIHZhciBuZXh0QmF0Y2hZUG9zaXRpb24gPSBjdXJyZW50WVBvc2l0aW9uICsgcG9vbFNjYWxlSGVpZ2h0O1xuICAgIGZvciAodmFyIGkgPSB2aWV3SW5kZXg7IGkgPCBwb29scy5sZW5ndGg7IGkrKykge1xuICAgICAgcG9vbCA9IHBvb2xzW2ldO1xuICAgICAgcG9vbC55UG9zaXRpb24oY3VycmVudFlQb3NpdGlvbik7XG4gICAgICBjdXJyZW50WVBvc2l0aW9uIC09IHBvb2wuaGVpZ2h0KCk7XG4gICAgfVxuICAgIGN1cnJlbnRZUG9zaXRpb24gPSBuZXh0QmF0Y2hZUG9zaXRpb247XG4gICAgZm9yICh2YXIgaSA9IHZpZXdJbmRleCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICBwb29sID0gcG9vbHNbaV07XG4gICAgICBwb29sLnlQb3NpdGlvbihjdXJyZW50WVBvc2l0aW9uKTtcbiAgICAgIGN1cnJlbnRZUG9zaXRpb24gKz0gcG9vbC5oZWlnaHQoKTtcbiAgICB9XG4gIH07XG5cbiAgY29udGFpbmVyLmRlc3Ryb3kgPSBmdW5jdGlvbigpIHtcbiAgICAkKCcjJyArIHRoaXMuaWQoKSkucmVtb3ZlKCk7XG4gICAgZW1pdHRlci5yZW1vdmVBbGxMaXN0ZW5lcnMoJ251bWJlcnMnKTtcbiAgfTtcblxuICBjb250YWluZXIubmF2U3RyaW5nID0gZnVuY3Rpb24oYSkge1xuICAgIHZhciBtb250aERheSA9IGQzLnRpbWUuZm9ybWF0LnV0YyhcIiVCICUtZFwiKTtcbiAgICB2YXIgbmF2U3RyaW5nID0gbW9udGhEYXkobmV3IERhdGUoYVswXS5zZXRVVENEYXRlKGFbMF0uZ2V0VVRDRGF0ZSgpICsgMSkpKSArICcgLSAnICsgbW9udGhEYXkoYVsxXSk7XG4gICAgZW1pdHRlci5lbWl0KCduYXZpZ2F0ZWQnLCBuYXZTdHJpbmcpO1xuICB9O1xuXG4gIC8vIGNoYWluYWJsZSBtZXRob2RzXG4gIGNvbnRhaW5lci5kZWZhdWx0cyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgcHJvcGVydGllcyA9IGRlZmF1bHRzO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHByb3BlcnRpZXMgPSBvYmo7XG4gICAgfVxuICAgIHRoaXMuYnVja2V0KHByb3BlcnRpZXMuYnVja2V0KTtcbiAgICB0aGlzLmlkKHByb3BlcnRpZXMuaWQpO1xuICAgIHRoaXMubWluV2lkdGgocHJvcGVydGllcy5taW5XaWR0aCkud2lkdGgocHJvcGVydGllcy53aWR0aCk7XG4gICAgdGhpcy5taW5OYXZIZWlnaHQocHJvcGVydGllcy5uYXYubWluTmF2SGVpZ2h0KS5heGlzSGVpZ2h0KHByb3BlcnRpZXMubmF2Lm1pbk5hdkhlaWdodClcbiAgICAgIC5zY3JvbGxUaHVtYlJhZGl1cyhwcm9wZXJ0aWVzLm5hdi5zY3JvbGxUaHVtYlJhZGl1cylcbiAgICAgIC5uYXZHdXR0ZXIocHJvcGVydGllcy5uYXYubmF2R3V0dGVyKTtcbiAgICB0aGlzLm1pbkhlaWdodChwcm9wZXJ0aWVzLm1pbkhlaWdodCkuaGVpZ2h0KHByb3BlcnRpZXMubWluSGVpZ2h0KS5zdGF0c0hlaWdodChwcm9wZXJ0aWVzLnN0YXRzSGVpZ2h0KTtcbiAgICB0aGlzLmxhdGVzdFRyYW5zbGF0aW9uKHByb3BlcnRpZXMubmF2LmxhdGVzdFRyYW5zbGF0aW9uKVxuICAgICAgLmN1cnJlbnRUcmFuc2xhdGlvbihwcm9wZXJ0aWVzLm5hdi5jdXJyZW50VHJhbnNsYXRpb24pO1xuICAgIHRoaXMuYXhpc0d1dHRlcihwcm9wZXJ0aWVzLmF4aXNHdXR0ZXIpO1xuICAgIHRoaXMuaW1hZ2VzQmFzZVVybChwcm9wZXJ0aWVzLmltYWdlc0Jhc2VVcmwpO1xuXG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICBjb250YWluZXIuc2V0TmF2ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG1heFRyYW5zbGF0aW9uID0gLXlTY2FsZShkYXRhU3RhcnROb29uKSArIHlTY2FsZS5yYW5nZSgpWzFdIC0gKGhlaWdodCAtIG5hdi5heGlzSGVpZ2h0IC0gc3RhdHNIZWlnaHQpO1xuICAgIHZhciBtaW5UcmFuc2xhdGlvbiA9IC15U2NhbGUoZGF0YUVuZE5vb24pICsgeVNjYWxlLnJhbmdlKClbMV0gLSAoaGVpZ2h0IC0gbmF2LmF4aXNIZWlnaHQgLSBzdGF0c0hlaWdodCk7XG4gICAgbmF2LnNjcm9sbCA9IGQzLmJlaGF2aW9yLnpvb20oKVxuICAgICAgLnNjYWxlRXh0ZW50KFsxLCAxXSlcbiAgICAgIC55KHlTY2FsZSlcbiAgICAgIC5vbignem9vbScsIGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgZSA9IGQzLmV2ZW50O1xuICAgICAgICBpZiAoZS50cmFuc2xhdGVbMV0gPCBtaW5UcmFuc2xhdGlvbikge1xuICAgICAgICAgIGUudHJhbnNsYXRlWzFdID0gbWluVHJhbnNsYXRpb247XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZS50cmFuc2xhdGVbMV0gPiBtYXhUcmFuc2xhdGlvbikge1xuICAgICAgICAgIGUudHJhbnNsYXRlWzFdID0gbWF4VHJhbnNsYXRpb247XG4gICAgICAgIH1cbiAgICAgICAgbmF2LnNjcm9sbC50cmFuc2xhdGUoWzAsIGUudHJhbnNsYXRlWzFdXSk7XG4gICAgICAgIGQzLnNlbGVjdCgnLmQzLXkuZDMtYXhpcycpLmNhbGwoeUF4aXMpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBvb2xzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgcG9vbHNbaV0uc2Nyb2xsKGUpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRhaW5lci5uYXZTdHJpbmcoeVNjYWxlLmRvbWFpbigpKTtcbiAgICAgICAgaWYgKHNjcm9sbEhhbmRsZVRyaWdnZXIpIHtcbiAgICAgICAgICBkMy5zZWxlY3QoJyNzY3JvbGxUaHVtYicpLnRyYW5zaXRpb24oKS5lYXNlKCdsaW5lYXInKS5hdHRyKCd5JywgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgZC55ID0gbmF2LnNjcm9sbFNjYWxlKHlTY2FsZS5kb21haW4oKVswXSk7XG4gICAgICAgICAgICByZXR1cm4gZC55IC0gbmF2LnNjcm9sbFRodW1iUmFkaXVzO1xuICAgICAgICAgIH0pOyAgICAgICBcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5vbignem9vbWVuZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBjb250YWluZXIuY3VycmVudFRyYW5zbGF0aW9uKG5hdi5sYXRlc3RUcmFuc2xhdGlvbik7XG4gICAgICAgIHNjcm9sbEhhbmRsZVRyaWdnZXIgPSB0cnVlO1xuICAgICAgfSk7XG5cbiAgICBtYWluR3JvdXAuY2FsbChuYXYuc2Nyb2xsKTtcblxuICAgIHJldHVybiBjb250YWluZXI7XG4gIH07XG5cbiAgY29udGFpbmVyLnNldFNjcm9sbE5hdiA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0cmFuc2xhdGlvbkFkanVzdG1lbnQgPSB5U2NhbGUucmFuZ2UoKVsxXSAtIChoZWlnaHQgLSBuYXYuYXhpc0hlaWdodCAtIHN0YXRzSGVpZ2h0KTtcbiAgICB2YXIgeFBvcyA9IG5hdi5uYXZHdXR0ZXIgLyAyO1xuXG4gICAgc2Nyb2xsTmF2LmFwcGVuZCgncmVjdCcpXG4gICAgLmF0dHIoe1xuICAgICAgJ3gnOiAwLFxuICAgICAgJ3knOiBuYXYuc2Nyb2xsU2NhbGUoZGF0YVN0YXJ0Tm9vbikgLSBuYXYuc2Nyb2xsVGh1bWJSYWRpdXMsXG4gICAgICAnd2lkdGgnOiBuYXYubmF2R3V0dGVyLFxuICAgICAgJ2hlaWdodCc6IGhlaWdodCAtIG5hdi5heGlzSGVpZ2h0LFxuICAgICAgJ2ZpbGwnOiAnd2hpdGUnLFxuICAgICAgJ2lkJzogJ3Njcm9sbE5hdkludmlzaWJsZVJlY3QnXG4gICAgfSk7XG5cbiAgICBzY3JvbGxOYXYuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgnICsgKHdpZHRoIC0gbmF2Lm5hdkd1dHRlcikgKyAnLDApJylcbiAgICAgIC5hcHBlbmQoJ2xpbmUnKVxuICAgICAgLmF0dHIoe1xuICAgICAgICAneDEnOiB4UG9zLFxuICAgICAgICAneDInOiB4UG9zLFxuICAgICAgICAneTEnOiBuYXYuc2Nyb2xsU2NhbGUoZGF0YVN0YXJ0Tm9vbikgLSBuYXYuc2Nyb2xsVGh1bWJSYWRpdXMsXG4gICAgICAgICd5Mic6IG5hdi5zY3JvbGxTY2FsZShkYXRhRW5kTm9vbikgKyBuYXYuc2Nyb2xsVGh1bWJSYWRpdXNcbiAgICAgIH0pO1xuXG4gICAgdmFyIGR5TG93ZXN0ID0gbmF2LnNjcm9sbFNjYWxlLnJhbmdlKClbMV07XG4gICAgdmFyIGR5SGlnaGVzdCA9IG5hdi5zY3JvbGxTY2FsZS5yYW5nZSgpWzBdO1xuXG4gICAgdmFyIGRyYWcgPSBkMy5iZWhhdmlvci5kcmFnKClcbiAgICAgIC5vcmlnaW4oZnVuY3Rpb24oZCkge1xuICAgICAgICByZXR1cm4gZDtcbiAgICAgIH0pXG4gICAgICAub24oJ2RyYWdzdGFydCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBkMy5ldmVudC5zb3VyY2VFdmVudC5zdG9wUHJvcGFnYXRpb24oKTsgLy8gc2lsZW5jZSB0aGUgY2xpY2stYW5kLWRyYWcgbGlzdGVuZXJcbiAgICAgIH0pXG4gICAgICAub24oJ2RyYWcnLCBmdW5jdGlvbihkKSB7XG4gICAgICAgIGQueSArPSBkMy5ldmVudC5keTtcbiAgICAgICAgaWYgKGQueSA+IGR5TG93ZXN0KSB7XG4gICAgICAgICAgZC55ID0gZHlMb3dlc3Q7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZC55IDwgZHlIaWdoZXN0KSB7XG4gICAgICAgICAgZC55ID0gZHlIaWdoZXN0O1xuICAgICAgICB9XG4gICAgICAgIGQzLnNlbGVjdCh0aGlzKS5hdHRyKCd5JywgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC55IC0gbmF2LnNjcm9sbFRodW1iUmFkaXVzOyB9KTtcbiAgICAgICAgdmFyIGRhdGUgPSBuYXYuc2Nyb2xsU2NhbGUuaW52ZXJ0KGQueSk7XG4gICAgICAgIG5hdi5jdXJyZW50VHJhbnNsYXRpb24gLT0geVNjYWxlKGRhdGUpIC0gdHJhbnNsYXRpb25BZGp1c3RtZW50O1xuICAgICAgICBzY3JvbGxIYW5kbGVUcmlnZ2VyID0gZmFsc2U7XG4gICAgICAgIG5hdi5zY3JvbGwudHJhbnNsYXRlKFswLCBuYXYuY3VycmVudFRyYW5zbGF0aW9uXSk7XG4gICAgICAgIG5hdi5zY3JvbGwuZXZlbnQobWFpbkdyb3VwKTtcbiAgICAgIH0pO1xuXG4gICAgc2Nyb2xsTmF2LnNlbGVjdEFsbCgnaW1hZ2UnKVxuICAgICAgLmRhdGEoW3sneCc6IDAsICd5JzogbmF2LnNjcm9sbFNjYWxlKHZpZXdFbmRwb2ludHNbMF0pfV0pXG4gICAgICAuZW50ZXIoKVxuICAgICAgLmFwcGVuZCgnaW1hZ2UnKVxuICAgICAgLmF0dHIoe1xuICAgICAgICAneGxpbms6aHJlZic6IGltYWdlc0Jhc2VVcmwgKyAnL3V4L3Njcm9sbF90aHVtYi5zdmcnLFxuICAgICAgICAneCc6IHhQb3MgLSBuYXYuc2Nyb2xsVGh1bWJSYWRpdXMsXG4gICAgICAgICd5JzogZnVuY3Rpb24oZCkgeyByZXR1cm4gZC55IC0gbmF2LnNjcm9sbFRodW1iUmFkaXVzOyB9LFxuICAgICAgICAnd2lkdGgnOiAyICogbmF2LnNjcm9sbFRodW1iUmFkaXVzLFxuICAgICAgICAnaGVpZ2h0JzogMiAqIG5hdi5zY3JvbGxUaHVtYlJhZGl1cyxcbiAgICAgICAgJ2lkJzogJ3Njcm9sbFRodW1iJ1xuICAgICAgfSlcbiAgICAgIC5jYWxsKGRyYWcpO1xuXG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICAvLyBnZXR0ZXJzIGFuZCBzZXR0ZXJzXG4gIGNvbnRhaW5lci5idWNrZXQgPSBmdW5jdGlvbih4KSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gYnVja2V0O1xuICAgIGJ1Y2tldCA9IHg7XG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICBjb250YWluZXIuaWQgPSBmdW5jdGlvbih4KSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gaWQ7XG4gICAgaWQgPSB4O1xuICAgIHJldHVybiBjb250YWluZXI7XG4gIH07XG5cbiAgY29udGFpbmVyLndpZHRoID0gZnVuY3Rpb24oeCkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHdpZHRoO1xuICAgIGlmICh4ID49IG1pbldpZHRoKSB7XG4gICAgICBpZiAoeCA+IGJ1Y2tldC53aWR0aCgpKSB7XG4gICAgICAgIHdpZHRoID0gYnVja2V0LndpZHRoKCk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgd2lkdGggPSB4O1xuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHdpZHRoID0gbWluV2lkdGg7XG4gICAgfVxuICAgIHJldHVybiBjb250YWluZXI7XG4gIH07XG5cbiAgY29udGFpbmVyLm1pbldpZHRoID0gZnVuY3Rpb24oeCkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIG1pbldpZHRoO1xuICAgIG1pbldpZHRoID0geDtcbiAgICByZXR1cm4gY29udGFpbmVyO1xuICB9O1xuXG4gIGNvbnRhaW5lci5oZWlnaHQgPSBmdW5jdGlvbih4KSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gaGVpZ2h0O1xuICAgIHZhciB0b3RhbEhlaWdodCA9IHggKyBjb250YWluZXIuYXhpc0hlaWdodCgpO1xuICAgIGlmIChuYXYuc2Nyb2xsTmF2KSB7XG4gICAgICB0b3RhbEhlaWdodCArPSBjb250YWluZXIuc2Nyb2xsTmF2SGVpZ2h0KCk7XG4gICAgfVxuICAgIGlmICh0b3RhbEhlaWdodCA+PSBtaW5IZWlnaHQpIHtcbiAgICAgIGlmICh0b3RhbEhlaWdodCA+IGJ1Y2tldC5oZWlnaHQoKSkge1xuICAgICAgICBoZWlnaHQgPSBidWNrZXQuaGVpZ2h0KCkgLSBjb250YWluZXIuYXhpc0hlaWdodCgpO1xuICAgICAgICBpZiAobmF2LnNjcm9sbE5hdikge1xuICAgICAgICAgIGhlaWdodCAtPSBjb250YWluZXIuc2Nyb2xsTmF2SGVpZ2h0KCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBoZWlnaHQgPSB4OyBcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBoZWlnaHQgPSBtaW5IZWlnaHQ7XG4gICAgfVxuICAgIHJldHVybiBjb250YWluZXI7XG4gIH07XG5cbiAgY29udGFpbmVyLm1pbkhlaWdodCA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBoZWlnaHQ7XG4gICAgbWluSGVpZ2h0ID0geDtcbiAgICByZXR1cm4gY29udGFpbmVyO1xuICB9O1xuXG4gIGNvbnRhaW5lci5pbWFnZXNCYXNlVXJsID0gZnVuY3Rpb24oeCkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGltYWdlc0Jhc2VVcmw7XG4gICAgaW1hZ2VzQmFzZVVybCA9IHg7XG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICBjb250YWluZXIuc3RhdHNIZWlnaHQgPSBmdW5jdGlvbih4KSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gc3RhdHNIZWlnaHQ7XG4gICAgc3RhdHNIZWlnaHQgPSB4O1xuICAgIHJldHVybiBjb250YWluZXI7XG4gIH07XG5cbiAgLy8gbmF2IGdldHRlcnMgYW5kIHNldHRlcnNcbiAgY29udGFpbmVyLmF4aXNIZWlnaHQgPSBmdW5jdGlvbih4KSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gbmF2LmF4aXNIZWlnaHQ7XG4gICAgaWYgKHggPj0gbmF2Lm1pbk5hdkhlaWdodCkge1xuICAgICAgbmF2LmF4aXNIZWlnaHQgPSB4O1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIG5hdi5heGlzSGVpZ2h0ID0gbmF2Lm1pbk5hdkhlaWdodDtcbiAgICB9XG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICBjb250YWluZXIubWluTmF2SGVpZ2h0ID0gZnVuY3Rpb24oeCkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIG5hdi5taW5OYXZIZWlnaHQ7XG4gICAgbmF2Lm1pbk5hdkhlaWdodCA9IHg7XG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICBjb250YWluZXIuc2Nyb2xsVGh1bWJSYWRpdXMgPSBmdW5jdGlvbih4KSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gbmF2LnNjcm9sbFRodW1iUmFkaXVzO1xuICAgIG5hdi5zY3JvbGxUaHVtYlJhZGl1cyA9IHg7XG4gICAgcmV0dXJuIGNvbnRhaW5lclxuICB9O1xuXG4gIGNvbnRhaW5lci5uYXZHdXR0ZXIgPSBmdW5jdGlvbih4KSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gbmF2Lm5hdkd1dHRlcjtcbiAgICBuYXYubmF2R3V0dGVyID0geDtcbiAgICByZXR1cm4gY29udGFpbmVyO1xuICB9O1xuXG4gIGNvbnRhaW5lci5zY3JvbGwgPSBmdW5jdGlvbihmKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gbmF2LnNjcm9sbDtcbiAgICBuYXYuc2Nyb2xsID0gZjtcbiAgICByZXR1cm4gY29udGFpbmVyO1xuICB9O1xuXG4gIGNvbnRhaW5lci5sYXRlc3RUcmFuc2xhdGlvbiA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBuYXYubGF0ZXN0VHJhbnNsYXRpb247XG4gICAgbmF2LmxhdGVzdFRyYW5zbGF0aW9uID0geDtcbiAgICByZXR1cm4gY29udGFpbmVyO1xuICB9O1xuXG4gIGNvbnRhaW5lci5jdXJyZW50VHJhbnNsYXRpb24gPSBmdW5jdGlvbih4KSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gbmF2LmN1cnJlbnRUcmFuc2xhdGlvbjtcbiAgICBuYXYuY3VycmVudFRyYW5zbGF0aW9uID0geDtcbiAgICByZXR1cm4gY29udGFpbmVyO1xuICB9O1xuXG4gIC8vIHBvb2xzIGdldHRlciBhbmQgc2V0dGVyXG4gIGNvbnRhaW5lci5wb29scyA9IGZ1bmN0aW9uKGEpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBwb29scztcbiAgICBwb29scyA9IGE7XG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICBjb250YWluZXIuYXhpc0d1dHRlciA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBheGlzR3V0dGVyO1xuICAgIGF4aXNHdXR0ZXIgPSB4O1xuICAgIHJldHVybiBjb250YWluZXI7XG4gIH07XG5cbiAgLy8gc2NhbGVzIGFuZCBheGVzIGdldHRlcnMgYW5kIHNldHRlcnNcbiAgY29udGFpbmVyLnhTY2FsZSA9IGZ1bmN0aW9uKGYpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiB4U2NhbGU7XG4gICAgeFNjYWxlID0gZjtcbiAgICByZXR1cm4gY29udGFpbmVyO1xuICB9O1xuXG4gIGNvbnRhaW5lci54QXhpcyA9IGZ1bmN0aW9uKGYpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiB4QXhpcztcbiAgICB4QXhpcyA9IGY7XG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICBjb250YWluZXIudmlld0VuZHBvaW50cyA9IGZ1bmN0aW9uKGEpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiB2aWV3RW5kcG9pbnRzO1xuICAgIHZpZXdFbmRwb2ludHMgPSBhO1xuICAgIHJldHVybiBjb250YWluZXI7XG4gIH07XG5cbiAgLy8gZGF0YSBnZXR0ZXJzIGFuZCBzZXR0ZXJzXG4gIGNvbnRhaW5lci5kYXRhID0gZnVuY3Rpb24oYSwgdmlld0VuZERhdGUpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBkYXRhO1xuICAgIGRhdGEgPSBhO1xuXG4gICAgdmFyIGZpcnN0ID0gbmV3IERhdGUoYVswXS5ub3JtYWxUaW1lKTtcbiAgICB2YXIgbGFzdCA9IG5ldyBEYXRlKGFbYS5sZW5ndGggLSAxXS5ub3JtYWxUaW1lKTtcbiAgICBcbiAgICBlbmRwb2ludHMgPSBbZmlyc3QsIGxhc3RdO1xuICAgIGNvbnRhaW5lci5lbmRwb2ludHMgPSBlbmRwb2ludHM7XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVEYXkoZCkge1xuICAgICAgcmV0dXJuIG5ldyBEYXRlKGQuZ2V0VVRDRnVsbFllYXIoKSwgZC5nZXRVVENNb250aCgpLCBkLmdldFVUQ0RhdGUoKSwgMCwgMCwgMCk7XG4gICAgfVxuICAgIHZhciBkYXlzID0gW107XG4gICAgdmFyIGZpcnN0RGF5ID0gY3JlYXRlRGF5KG5ldyBEYXRlKGNvbnRhaW5lci5lbmRwb2ludHNbMF0pKTtcbiAgICB2YXIgbGFzdERheSA9IGNyZWF0ZURheShuZXcgRGF0ZShjb250YWluZXIuZW5kcG9pbnRzWzFdKSk7XG4gICAgZGF5cy5wdXNoKGZpcnN0RGF5LnRvSVNPU3RyaW5nKCkuc2xpY2UoMCwxMCkpO1xuICAgIHZhciBjdXJyZW50RGF5ID0gZmlyc3REYXk7XG4gICAgd2hpbGUgKGN1cnJlbnREYXkgPCBsYXN0RGF5KSB7XG4gICAgICB2YXIgbmV3RGF5ID0gbmV3IERhdGUoY3VycmVudERheSk7XG4gICAgICBuZXdEYXkuc2V0VVRDRGF0ZShuZXdEYXkuZ2V0VVRDRGF0ZSgpICsgMSk7XG4gICAgICBkYXlzLnB1c2gobmV3RGF5LnRvSVNPU3RyaW5nKCkuc2xpY2UoMCwxMCkpO1xuICAgICAgY3VycmVudERheSA9IG5ld0RheTtcbiAgICB9XG5cbiAgICB0aGlzLmRheXMgPSBkYXlzLnJldmVyc2UoKTtcblxuICAgIGRhdGFTdGFydE5vb24gPSBuZXcgRGF0ZShmaXJzdCk7XG4gICAgZGF0YVN0YXJ0Tm9vbi5zZXRVVENIb3VycygxMik7XG4gICAgZGF0YVN0YXJ0Tm9vbi5zZXRVVENNaW51dGVzKDApO1xuICAgIGRhdGFTdGFydE5vb24uc2V0VVRDU2Vjb25kcygwKTtcbiAgICBkYXRhU3RhcnROb29uLnNldFVUQ0RhdGUoZGF0YVN0YXJ0Tm9vbi5nZXRVVENEYXRlKCkgLSAxKTtcblxuICAgIHZhciBub29uID0gJzEyOjAwOjAwWic7XG5cbiAgICBkYXRhRW5kTm9vbiA9IG5ldyBEYXRlKGxhc3QpO1xuICAgIGRhdGFFbmROb29uLnNldFVUQ0RhdGUoZGF0YUVuZE5vb24uZ2V0VVRDRGF0ZSgpIC0gMTQpO1xuICAgIGRhdGFFbmROb29uID0gbmV3IERhdGUoZGF0YUVuZE5vb24udG9JU09TdHJpbmcoKS5zbGljZSgwLDExKSArIG5vb24pO1xuXG4gICAgaWYgKCF2aWV3RW5kRGF0ZSkge1xuICAgICAgdmlld0VuZERhdGUgPSBuZXcgRGF0ZShkYXlzWzBdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmlld0VuZERhdGUgPSBuZXcgRGF0ZSh2aWV3RW5kRGF0ZSk7XG4gICAgfVxuXG4gICAgdmFyIHZpZXdCZWdpbm5pbmcgPSBuZXcgRGF0ZSh2aWV3RW5kRGF0ZSk7XG4gICAgdmlld0JlZ2lubmluZy5zZXRVVENEYXRlKHZpZXdCZWdpbm5pbmcuZ2V0VVRDRGF0ZSgpIC0gMTQpO1xuICAgIHZpZXdFbmRwb2ludHMgPSBbbmV3IERhdGUodmlld0JlZ2lubmluZy50b0lTT1N0cmluZygpLnNsaWNlKDAsMTEpICsgbm9vbiksIG5ldyBEYXRlKHZpZXdFbmREYXRlLnRvSVNPU3RyaW5nKCkuc2xpY2UoMCwxMSkgKyBub29uKV07XG4gICAgdmlld0luZGV4ID0gZGF5cy5pbmRleE9mKHZpZXdFbmREYXRlLnRvSVNPU3RyaW5nKCkuc2xpY2UoMCwxMCkpO1xuXG4gICAgY29udGFpbmVyLmRhdGFQZXJEYXkgPSBbXTtcblxuICAgIHRoaXMuZGF5cy5mb3JFYWNoKGZ1bmN0aW9uKGRheSkge1xuICAgICAgdmFyIHRoaXNEYXkgPSB7XG4gICAgICAgICd5ZWFyJzogZGF5LnNsaWNlKDAsNCksXG4gICAgICAgICdtb250aCc6IGRheS5zbGljZSg1LDcpLFxuICAgICAgICAnZGF5JzogZGF5LnNsaWNlKDgsMTApXG4gICAgICB9O1xuICAgICAgY29udGFpbmVyLmRhdGFQZXJEYXkucHVzaChfLmZpbHRlcihkYXRhLCBmdW5jdGlvbihkKSB7XG4gICAgICAgIHZhciBkYXRlID0gbmV3IERhdGUoZC5ub3JtYWxUaW1lKTtcbiAgICAgICAgaWYgKChkYXRlLmdldFVUQ0Z1bGxZZWFyKCkgPT09IHBhcnNlSW50KHRoaXNEYXkueWVhcikpXG4gICAgICAgICAgJiYgKGRhdGUuZ2V0VVRDTW9udGgoKSArIDEgPT09IHBhcnNlSW50KHRoaXNEYXkubW9udGgpKVxuICAgICAgICAgICYmIChkYXRlLmdldFVUQ0RhdGUoKSA9PT0gcGFyc2VJbnQodGhpc0RheS5kYXkpKSkge1xuICAgICAgICAgIHJldHVybiBkO1xuICAgICAgICB9XG4gICAgICB9KSk7XG4gICAgfSk7XG4gICAgXG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICByZXR1cm4gY29udGFpbmVyO1xufTsiLCIvLyAgICAgVW5kZXJzY29yZS5qcyAxLjYuMFxuLy8gICAgIGh0dHA6Ly91bmRlcnNjb3JlanMub3JnXG4vLyAgICAgKGMpIDIwMDktMjAxNCBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuLy8gICAgIFVuZGVyc2NvcmUgbWF5IGJlIGZyZWVseSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXG5cbihmdW5jdGlvbigpIHtcblxuICAvLyBCYXNlbGluZSBzZXR1cFxuICAvLyAtLS0tLS0tLS0tLS0tLVxuXG4gIC8vIEVzdGFibGlzaCB0aGUgcm9vdCBvYmplY3QsIGB3aW5kb3dgIGluIHRoZSBicm93c2VyLCBvciBgZXhwb3J0c2Agb24gdGhlIHNlcnZlci5cbiAgdmFyIHJvb3QgPSB0aGlzO1xuXG4gIC8vIFNhdmUgdGhlIHByZXZpb3VzIHZhbHVlIG9mIHRoZSBgX2AgdmFyaWFibGUuXG4gIHZhciBwcmV2aW91c1VuZGVyc2NvcmUgPSByb290Ll87XG5cbiAgLy8gRXN0YWJsaXNoIHRoZSBvYmplY3QgdGhhdCBnZXRzIHJldHVybmVkIHRvIGJyZWFrIG91dCBvZiBhIGxvb3AgaXRlcmF0aW9uLlxuICB2YXIgYnJlYWtlciA9IHt9O1xuXG4gIC8vIFNhdmUgYnl0ZXMgaW4gdGhlIG1pbmlmaWVkIChidXQgbm90IGd6aXBwZWQpIHZlcnNpb246XG4gIHZhciBBcnJheVByb3RvID0gQXJyYXkucHJvdG90eXBlLCBPYmpQcm90byA9IE9iamVjdC5wcm90b3R5cGUsIEZ1bmNQcm90byA9IEZ1bmN0aW9uLnByb3RvdHlwZTtcblxuICAvLyBDcmVhdGUgcXVpY2sgcmVmZXJlbmNlIHZhcmlhYmxlcyBmb3Igc3BlZWQgYWNjZXNzIHRvIGNvcmUgcHJvdG90eXBlcy5cbiAgdmFyXG4gICAgcHVzaCAgICAgICAgICAgICA9IEFycmF5UHJvdG8ucHVzaCxcbiAgICBzbGljZSAgICAgICAgICAgID0gQXJyYXlQcm90by5zbGljZSxcbiAgICBjb25jYXQgICAgICAgICAgID0gQXJyYXlQcm90by5jb25jYXQsXG4gICAgdG9TdHJpbmcgICAgICAgICA9IE9ialByb3RvLnRvU3RyaW5nLFxuICAgIGhhc093blByb3BlcnR5ICAgPSBPYmpQcm90by5oYXNPd25Qcm9wZXJ0eTtcblxuICAvLyBBbGwgKipFQ01BU2NyaXB0IDUqKiBuYXRpdmUgZnVuY3Rpb24gaW1wbGVtZW50YXRpb25zIHRoYXQgd2UgaG9wZSB0byB1c2VcbiAgLy8gYXJlIGRlY2xhcmVkIGhlcmUuXG4gIHZhclxuICAgIG5hdGl2ZUZvckVhY2ggICAgICA9IEFycmF5UHJvdG8uZm9yRWFjaCxcbiAgICBuYXRpdmVNYXAgICAgICAgICAgPSBBcnJheVByb3RvLm1hcCxcbiAgICBuYXRpdmVSZWR1Y2UgICAgICAgPSBBcnJheVByb3RvLnJlZHVjZSxcbiAgICBuYXRpdmVSZWR1Y2VSaWdodCAgPSBBcnJheVByb3RvLnJlZHVjZVJpZ2h0LFxuICAgIG5hdGl2ZUZpbHRlciAgICAgICA9IEFycmF5UHJvdG8uZmlsdGVyLFxuICAgIG5hdGl2ZUV2ZXJ5ICAgICAgICA9IEFycmF5UHJvdG8uZXZlcnksXG4gICAgbmF0aXZlU29tZSAgICAgICAgID0gQXJyYXlQcm90by5zb21lLFxuICAgIG5hdGl2ZUluZGV4T2YgICAgICA9IEFycmF5UHJvdG8uaW5kZXhPZixcbiAgICBuYXRpdmVMYXN0SW5kZXhPZiAgPSBBcnJheVByb3RvLmxhc3RJbmRleE9mLFxuICAgIG5hdGl2ZUlzQXJyYXkgICAgICA9IEFycmF5LmlzQXJyYXksXG4gICAgbmF0aXZlS2V5cyAgICAgICAgID0gT2JqZWN0LmtleXMsXG4gICAgbmF0aXZlQmluZCAgICAgICAgID0gRnVuY1Byb3RvLmJpbmQ7XG5cbiAgLy8gQ3JlYXRlIGEgc2FmZSByZWZlcmVuY2UgdG8gdGhlIFVuZGVyc2NvcmUgb2JqZWN0IGZvciB1c2UgYmVsb3cuXG4gIHZhciBfID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKG9iaiBpbnN0YW5jZW9mIF8pIHJldHVybiBvYmo7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIF8pKSByZXR1cm4gbmV3IF8ob2JqKTtcbiAgICB0aGlzLl93cmFwcGVkID0gb2JqO1xuICB9O1xuXG4gIC8vIEV4cG9ydCB0aGUgVW5kZXJzY29yZSBvYmplY3QgZm9yICoqTm9kZS5qcyoqLCB3aXRoXG4gIC8vIGJhY2t3YXJkcy1jb21wYXRpYmlsaXR5IGZvciB0aGUgb2xkIGByZXF1aXJlKClgIEFQSS4gSWYgd2UncmUgaW5cbiAgLy8gdGhlIGJyb3dzZXIsIGFkZCBgX2AgYXMgYSBnbG9iYWwgb2JqZWN0IHZpYSBhIHN0cmluZyBpZGVudGlmaWVyLFxuICAvLyBmb3IgQ2xvc3VyZSBDb21waWxlciBcImFkdmFuY2VkXCIgbW9kZS5cbiAgaWYgKHR5cGVvZiBleHBvcnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgICAgZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gXztcbiAgICB9XG4gICAgZXhwb3J0cy5fID0gXztcbiAgfSBlbHNlIHtcbiAgICByb290Ll8gPSBfO1xuICB9XG5cbiAgLy8gQ3VycmVudCB2ZXJzaW9uLlxuICBfLlZFUlNJT04gPSAnMS42LjAnO1xuXG4gIC8vIENvbGxlY3Rpb24gRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gVGhlIGNvcm5lcnN0b25lLCBhbiBgZWFjaGAgaW1wbGVtZW50YXRpb24sIGFrYSBgZm9yRWFjaGAuXG4gIC8vIEhhbmRsZXMgb2JqZWN0cyB3aXRoIHRoZSBidWlsdC1pbiBgZm9yRWFjaGAsIGFycmF5cywgYW5kIHJhdyBvYmplY3RzLlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgZm9yRWFjaGAgaWYgYXZhaWxhYmxlLlxuICB2YXIgZWFjaCA9IF8uZWFjaCA9IF8uZm9yRWFjaCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiBvYmo7XG4gICAgaWYgKG5hdGl2ZUZvckVhY2ggJiYgb2JqLmZvckVhY2ggPT09IG5hdGl2ZUZvckVhY2gpIHtcbiAgICAgIG9iai5mb3JFYWNoKGl0ZXJhdG9yLCBjb250ZXh0KTtcbiAgICB9IGVsc2UgaWYgKG9iai5sZW5ndGggPT09ICtvYmoubGVuZ3RoKSB7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gb2JqLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChpdGVyYXRvci5jYWxsKGNvbnRleHQsIG9ialtpXSwgaSwgb2JqKSA9PT0gYnJlYWtlcikgcmV0dXJuO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGtleXMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgb2JqW2tleXNbaV1dLCBrZXlzW2ldLCBvYmopID09PSBicmVha2VyKSByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSByZXN1bHRzIG9mIGFwcGx5aW5nIHRoZSBpdGVyYXRvciB0byBlYWNoIGVsZW1lbnQuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBtYXBgIGlmIGF2YWlsYWJsZS5cbiAgXy5tYXAgPSBfLmNvbGxlY3QgPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiByZXN1bHRzO1xuICAgIGlmIChuYXRpdmVNYXAgJiYgb2JqLm1hcCA9PT0gbmF0aXZlTWFwKSByZXR1cm4gb2JqLm1hcChpdGVyYXRvciwgY29udGV4dCk7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgcmVzdWx0cy5wdXNoKGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH07XG5cbiAgdmFyIHJlZHVjZUVycm9yID0gJ1JlZHVjZSBvZiBlbXB0eSBhcnJheSB3aXRoIG5vIGluaXRpYWwgdmFsdWUnO1xuXG4gIC8vICoqUmVkdWNlKiogYnVpbGRzIHVwIGEgc2luZ2xlIHJlc3VsdCBmcm9tIGEgbGlzdCBvZiB2YWx1ZXMsIGFrYSBgaW5qZWN0YCxcbiAgLy8gb3IgYGZvbGRsYC4gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYHJlZHVjZWAgaWYgYXZhaWxhYmxlLlxuICBfLnJlZHVjZSA9IF8uZm9sZGwgPSBfLmluamVjdCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIG1lbW8sIGNvbnRleHQpIHtcbiAgICB2YXIgaW5pdGlhbCA9IGFyZ3VtZW50cy5sZW5ndGggPiAyO1xuICAgIGlmIChvYmogPT0gbnVsbCkgb2JqID0gW107XG4gICAgaWYgKG5hdGl2ZVJlZHVjZSAmJiBvYmoucmVkdWNlID09PSBuYXRpdmVSZWR1Y2UpIHtcbiAgICAgIGlmIChjb250ZXh0KSBpdGVyYXRvciA9IF8uYmluZChpdGVyYXRvciwgY29udGV4dCk7XG4gICAgICByZXR1cm4gaW5pdGlhbCA/IG9iai5yZWR1Y2UoaXRlcmF0b3IsIG1lbW8pIDogb2JqLnJlZHVjZShpdGVyYXRvcik7XG4gICAgfVxuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIGlmICghaW5pdGlhbCkge1xuICAgICAgICBtZW1vID0gdmFsdWU7XG4gICAgICAgIGluaXRpYWwgPSB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbWVtbyA9IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgbWVtbywgdmFsdWUsIGluZGV4LCBsaXN0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoIWluaXRpYWwpIHRocm93IG5ldyBUeXBlRXJyb3IocmVkdWNlRXJyb3IpO1xuICAgIHJldHVybiBtZW1vO1xuICB9O1xuXG4gIC8vIFRoZSByaWdodC1hc3NvY2lhdGl2ZSB2ZXJzaW9uIG9mIHJlZHVjZSwgYWxzbyBrbm93biBhcyBgZm9sZHJgLlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgcmVkdWNlUmlnaHRgIGlmIGF2YWlsYWJsZS5cbiAgXy5yZWR1Y2VSaWdodCA9IF8uZm9sZHIgPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBtZW1vLCBjb250ZXh0KSB7XG4gICAgdmFyIGluaXRpYWwgPSBhcmd1bWVudHMubGVuZ3RoID4gMjtcbiAgICBpZiAob2JqID09IG51bGwpIG9iaiA9IFtdO1xuICAgIGlmIChuYXRpdmVSZWR1Y2VSaWdodCAmJiBvYmoucmVkdWNlUmlnaHQgPT09IG5hdGl2ZVJlZHVjZVJpZ2h0KSB7XG4gICAgICBpZiAoY29udGV4dCkgaXRlcmF0b3IgPSBfLmJpbmQoaXRlcmF0b3IsIGNvbnRleHQpO1xuICAgICAgcmV0dXJuIGluaXRpYWwgPyBvYmoucmVkdWNlUmlnaHQoaXRlcmF0b3IsIG1lbW8pIDogb2JqLnJlZHVjZVJpZ2h0KGl0ZXJhdG9yKTtcbiAgICB9XG4gICAgdmFyIGxlbmd0aCA9IG9iai5sZW5ndGg7XG4gICAgaWYgKGxlbmd0aCAhPT0gK2xlbmd0aCkge1xuICAgICAgdmFyIGtleXMgPSBfLmtleXMob2JqKTtcbiAgICAgIGxlbmd0aCA9IGtleXMubGVuZ3RoO1xuICAgIH1cbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpbmRleCA9IGtleXMgPyBrZXlzWy0tbGVuZ3RoXSA6IC0tbGVuZ3RoO1xuICAgICAgaWYgKCFpbml0aWFsKSB7XG4gICAgICAgIG1lbW8gPSBvYmpbaW5kZXhdO1xuICAgICAgICBpbml0aWFsID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1lbW8gPSBpdGVyYXRvci5jYWxsKGNvbnRleHQsIG1lbW8sIG9ialtpbmRleF0sIGluZGV4LCBsaXN0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoIWluaXRpYWwpIHRocm93IG5ldyBUeXBlRXJyb3IocmVkdWNlRXJyb3IpO1xuICAgIHJldHVybiBtZW1vO1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgZmlyc3QgdmFsdWUgd2hpY2ggcGFzc2VzIGEgdHJ1dGggdGVzdC4gQWxpYXNlZCBhcyBgZGV0ZWN0YC5cbiAgXy5maW5kID0gXy5kZXRlY3QgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHZhciByZXN1bHQ7XG4gICAgYW55KG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpZiAocHJlZGljYXRlLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSkge1xuICAgICAgICByZXN1bHQgPSB2YWx1ZTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBSZXR1cm4gYWxsIHRoZSBlbGVtZW50cyB0aGF0IHBhc3MgYSB0cnV0aCB0ZXN0LlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgZmlsdGVyYCBpZiBhdmFpbGFibGUuXG4gIC8vIEFsaWFzZWQgYXMgYHNlbGVjdGAuXG4gIF8uZmlsdGVyID0gXy5zZWxlY3QgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHZhciByZXN1bHRzID0gW107XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gcmVzdWx0cztcbiAgICBpZiAobmF0aXZlRmlsdGVyICYmIG9iai5maWx0ZXIgPT09IG5hdGl2ZUZpbHRlcikgcmV0dXJuIG9iai5maWx0ZXIocHJlZGljYXRlLCBjb250ZXh0KTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpZiAocHJlZGljYXRlLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSkgcmVzdWx0cy5wdXNoKHZhbHVlKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfTtcblxuICAvLyBSZXR1cm4gYWxsIHRoZSBlbGVtZW50cyBmb3Igd2hpY2ggYSB0cnV0aCB0ZXN0IGZhaWxzLlxuICBfLnJlamVjdCA9IGZ1bmN0aW9uKG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIF8uZmlsdGVyKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICByZXR1cm4gIXByZWRpY2F0ZS5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCk7XG4gICAgfSwgY29udGV4dCk7XG4gIH07XG5cbiAgLy8gRGV0ZXJtaW5lIHdoZXRoZXIgYWxsIG9mIHRoZSBlbGVtZW50cyBtYXRjaCBhIHRydXRoIHRlc3QuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBldmVyeWAgaWYgYXZhaWxhYmxlLlxuICAvLyBBbGlhc2VkIGFzIGBhbGxgLlxuICBfLmV2ZXJ5ID0gXy5hbGwgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHByZWRpY2F0ZSB8fCAocHJlZGljYXRlID0gXy5pZGVudGl0eSk7XG4gICAgdmFyIHJlc3VsdCA9IHRydWU7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gcmVzdWx0O1xuICAgIGlmIChuYXRpdmVFdmVyeSAmJiBvYmouZXZlcnkgPT09IG5hdGl2ZUV2ZXJ5KSByZXR1cm4gb2JqLmV2ZXJ5KHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaWYgKCEocmVzdWx0ID0gcmVzdWx0ICYmIHByZWRpY2F0ZS5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkpKSByZXR1cm4gYnJlYWtlcjtcbiAgICB9KTtcbiAgICByZXR1cm4gISFyZXN1bHQ7XG4gIH07XG5cbiAgLy8gRGV0ZXJtaW5lIGlmIGF0IGxlYXN0IG9uZSBlbGVtZW50IGluIHRoZSBvYmplY3QgbWF0Y2hlcyBhIHRydXRoIHRlc3QuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBzb21lYCBpZiBhdmFpbGFibGUuXG4gIC8vIEFsaWFzZWQgYXMgYGFueWAuXG4gIHZhciBhbnkgPSBfLnNvbWUgPSBfLmFueSA9IGZ1bmN0aW9uKG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgcHJlZGljYXRlIHx8IChwcmVkaWNhdGUgPSBfLmlkZW50aXR5KTtcbiAgICB2YXIgcmVzdWx0ID0gZmFsc2U7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gcmVzdWx0O1xuICAgIGlmIChuYXRpdmVTb21lICYmIG9iai5zb21lID09PSBuYXRpdmVTb21lKSByZXR1cm4gb2JqLnNvbWUocHJlZGljYXRlLCBjb250ZXh0KTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpZiAocmVzdWx0IHx8IChyZXN1bHQgPSBwcmVkaWNhdGUuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpKSkgcmV0dXJuIGJyZWFrZXI7XG4gICAgfSk7XG4gICAgcmV0dXJuICEhcmVzdWx0O1xuICB9O1xuXG4gIC8vIERldGVybWluZSBpZiB0aGUgYXJyYXkgb3Igb2JqZWN0IGNvbnRhaW5zIGEgZ2l2ZW4gdmFsdWUgKHVzaW5nIGA9PT1gKS5cbiAgLy8gQWxpYXNlZCBhcyBgaW5jbHVkZWAuXG4gIF8uY29udGFpbnMgPSBfLmluY2x1ZGUgPSBmdW5jdGlvbihvYmosIHRhcmdldCkge1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChuYXRpdmVJbmRleE9mICYmIG9iai5pbmRleE9mID09PSBuYXRpdmVJbmRleE9mKSByZXR1cm4gb2JqLmluZGV4T2YodGFyZ2V0KSAhPSAtMTtcbiAgICByZXR1cm4gYW55KG9iaiwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJldHVybiB2YWx1ZSA9PT0gdGFyZ2V0O1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIEludm9rZSBhIG1ldGhvZCAod2l0aCBhcmd1bWVudHMpIG9uIGV2ZXJ5IGl0ZW0gaW4gYSBjb2xsZWN0aW9uLlxuICBfLmludm9rZSA9IGZ1bmN0aW9uKG9iaiwgbWV0aG9kKSB7XG4gICAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgdmFyIGlzRnVuYyA9IF8uaXNGdW5jdGlvbihtZXRob2QpO1xuICAgIHJldHVybiBfLm1hcChvYmosIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXR1cm4gKGlzRnVuYyA/IG1ldGhvZCA6IHZhbHVlW21ldGhvZF0pLmFwcGx5KHZhbHVlLCBhcmdzKTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBDb252ZW5pZW5jZSB2ZXJzaW9uIG9mIGEgY29tbW9uIHVzZSBjYXNlIG9mIGBtYXBgOiBmZXRjaGluZyBhIHByb3BlcnR5LlxuICBfLnBsdWNrID0gZnVuY3Rpb24ob2JqLCBrZXkpIHtcbiAgICByZXR1cm4gXy5tYXAob2JqLCBfLnByb3BlcnR5KGtleSkpO1xuICB9O1xuXG4gIC8vIENvbnZlbmllbmNlIHZlcnNpb24gb2YgYSBjb21tb24gdXNlIGNhc2Ugb2YgYGZpbHRlcmA6IHNlbGVjdGluZyBvbmx5IG9iamVjdHNcbiAgLy8gY29udGFpbmluZyBzcGVjaWZpYyBga2V5OnZhbHVlYCBwYWlycy5cbiAgXy53aGVyZSA9IGZ1bmN0aW9uKG9iaiwgYXR0cnMpIHtcbiAgICByZXR1cm4gXy5maWx0ZXIob2JqLCBfLm1hdGNoZXMoYXR0cnMpKTtcbiAgfTtcblxuICAvLyBDb252ZW5pZW5jZSB2ZXJzaW9uIG9mIGEgY29tbW9uIHVzZSBjYXNlIG9mIGBmaW5kYDogZ2V0dGluZyB0aGUgZmlyc3Qgb2JqZWN0XG4gIC8vIGNvbnRhaW5pbmcgc3BlY2lmaWMgYGtleTp2YWx1ZWAgcGFpcnMuXG4gIF8uZmluZFdoZXJlID0gZnVuY3Rpb24ob2JqLCBhdHRycykge1xuICAgIHJldHVybiBfLmZpbmQob2JqLCBfLm1hdGNoZXMoYXR0cnMpKTtcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIG1heGltdW0gZWxlbWVudCBvciAoZWxlbWVudC1iYXNlZCBjb21wdXRhdGlvbikuXG4gIC8vIENhbid0IG9wdGltaXplIGFycmF5cyBvZiBpbnRlZ2VycyBsb25nZXIgdGhhbiA2NSw1MzUgZWxlbWVudHMuXG4gIC8vIFNlZSBbV2ViS2l0IEJ1ZyA4MDc5N10oaHR0cHM6Ly9idWdzLndlYmtpdC5vcmcvc2hvd19idWcuY2dpP2lkPTgwNzk3KVxuICBfLm1heCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpZiAoIWl0ZXJhdG9yICYmIF8uaXNBcnJheShvYmopICYmIG9ialswXSA9PT0gK29ialswXSAmJiBvYmoubGVuZ3RoIDwgNjU1MzUpIHtcbiAgICAgIHJldHVybiBNYXRoLm1heC5hcHBseShNYXRoLCBvYmopO1xuICAgIH1cbiAgICB2YXIgcmVzdWx0ID0gLUluZmluaXR5LCBsYXN0Q29tcHV0ZWQgPSAtSW5maW5pdHk7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgdmFyIGNvbXB1dGVkID0gaXRlcmF0b3IgPyBpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkgOiB2YWx1ZTtcbiAgICAgIGlmIChjb21wdXRlZCA+IGxhc3RDb21wdXRlZCkge1xuICAgICAgICByZXN1bHQgPSB2YWx1ZTtcbiAgICAgICAgbGFzdENvbXB1dGVkID0gY29tcHV0ZWQ7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIG1pbmltdW0gZWxlbWVudCAob3IgZWxlbWVudC1iYXNlZCBjb21wdXRhdGlvbikuXG4gIF8ubWluID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGlmICghaXRlcmF0b3IgJiYgXy5pc0FycmF5KG9iaikgJiYgb2JqWzBdID09PSArb2JqWzBdICYmIG9iai5sZW5ndGggPCA2NTUzNSkge1xuICAgICAgcmV0dXJuIE1hdGgubWluLmFwcGx5KE1hdGgsIG9iaik7XG4gICAgfVxuICAgIHZhciByZXN1bHQgPSBJbmZpbml0eSwgbGFzdENvbXB1dGVkID0gSW5maW5pdHk7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgdmFyIGNvbXB1dGVkID0gaXRlcmF0b3IgPyBpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkgOiB2YWx1ZTtcbiAgICAgIGlmIChjb21wdXRlZCA8IGxhc3RDb21wdXRlZCkge1xuICAgICAgICByZXN1bHQgPSB2YWx1ZTtcbiAgICAgICAgbGFzdENvbXB1dGVkID0gY29tcHV0ZWQ7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBTaHVmZmxlIGFuIGFycmF5LCB1c2luZyB0aGUgbW9kZXJuIHZlcnNpb24gb2YgdGhlXG4gIC8vIFtGaXNoZXItWWF0ZXMgc2h1ZmZsZV0oaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9GaXNoZXLigJNZYXRlc19zaHVmZmxlKS5cbiAgXy5zaHVmZmxlID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIHJhbmQ7XG4gICAgdmFyIGluZGV4ID0gMDtcbiAgICB2YXIgc2h1ZmZsZWQgPSBbXTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJhbmQgPSBfLnJhbmRvbShpbmRleCsrKTtcbiAgICAgIHNodWZmbGVkW2luZGV4IC0gMV0gPSBzaHVmZmxlZFtyYW5kXTtcbiAgICAgIHNodWZmbGVkW3JhbmRdID0gdmFsdWU7XG4gICAgfSk7XG4gICAgcmV0dXJuIHNodWZmbGVkO1xuICB9O1xuXG4gIC8vIFNhbXBsZSAqKm4qKiByYW5kb20gdmFsdWVzIGZyb20gYSBjb2xsZWN0aW9uLlxuICAvLyBJZiAqKm4qKiBpcyBub3Qgc3BlY2lmaWVkLCByZXR1cm5zIGEgc2luZ2xlIHJhbmRvbSBlbGVtZW50LlxuICAvLyBUaGUgaW50ZXJuYWwgYGd1YXJkYCBhcmd1bWVudCBhbGxvd3MgaXQgdG8gd29yayB3aXRoIGBtYXBgLlxuICBfLnNhbXBsZSA9IGZ1bmN0aW9uKG9iaiwgbiwgZ3VhcmQpIHtcbiAgICBpZiAobiA9PSBudWxsIHx8IGd1YXJkKSB7XG4gICAgICBpZiAob2JqLmxlbmd0aCAhPT0gK29iai5sZW5ndGgpIG9iaiA9IF8udmFsdWVzKG9iaik7XG4gICAgICByZXR1cm4gb2JqW18ucmFuZG9tKG9iai5sZW5ndGggLSAxKV07XG4gICAgfVxuICAgIHJldHVybiBfLnNodWZmbGUob2JqKS5zbGljZSgwLCBNYXRoLm1heCgwLCBuKSk7XG4gIH07XG5cbiAgLy8gQW4gaW50ZXJuYWwgZnVuY3Rpb24gdG8gZ2VuZXJhdGUgbG9va3VwIGl0ZXJhdG9ycy5cbiAgdmFyIGxvb2t1cEl0ZXJhdG9yID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAodmFsdWUgPT0gbnVsbCkgcmV0dXJuIF8uaWRlbnRpdHk7XG4gICAgaWYgKF8uaXNGdW5jdGlvbih2YWx1ZSkpIHJldHVybiB2YWx1ZTtcbiAgICByZXR1cm4gXy5wcm9wZXJ0eSh2YWx1ZSk7XG4gIH07XG5cbiAgLy8gU29ydCB0aGUgb2JqZWN0J3MgdmFsdWVzIGJ5IGEgY3JpdGVyaW9uIHByb2R1Y2VkIGJ5IGFuIGl0ZXJhdG9yLlxuICBfLnNvcnRCeSA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpdGVyYXRvciA9IGxvb2t1cEl0ZXJhdG9yKGl0ZXJhdG9yKTtcbiAgICByZXR1cm4gXy5wbHVjayhfLm1hcChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICBpbmRleDogaW5kZXgsXG4gICAgICAgIGNyaXRlcmlhOiBpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdClcbiAgICAgIH07XG4gICAgfSkuc29ydChmdW5jdGlvbihsZWZ0LCByaWdodCkge1xuICAgICAgdmFyIGEgPSBsZWZ0LmNyaXRlcmlhO1xuICAgICAgdmFyIGIgPSByaWdodC5jcml0ZXJpYTtcbiAgICAgIGlmIChhICE9PSBiKSB7XG4gICAgICAgIGlmIChhID4gYiB8fCBhID09PSB2b2lkIDApIHJldHVybiAxO1xuICAgICAgICBpZiAoYSA8IGIgfHwgYiA9PT0gdm9pZCAwKSByZXR1cm4gLTE7XG4gICAgICB9XG4gICAgICByZXR1cm4gbGVmdC5pbmRleCAtIHJpZ2h0LmluZGV4O1xuICAgIH0pLCAndmFsdWUnKTtcbiAgfTtcblxuICAvLyBBbiBpbnRlcm5hbCBmdW5jdGlvbiB1c2VkIGZvciBhZ2dyZWdhdGUgXCJncm91cCBieVwiIG9wZXJhdGlvbnMuXG4gIHZhciBncm91cCA9IGZ1bmN0aW9uKGJlaGF2aW9yKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICAgIGl0ZXJhdG9yID0gbG9va3VwSXRlcmF0b3IoaXRlcmF0b3IpO1xuICAgICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCkge1xuICAgICAgICB2YXIga2V5ID0gaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIG9iaik7XG4gICAgICAgIGJlaGF2aW9yKHJlc3VsdCwga2V5LCB2YWx1ZSk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfTtcblxuICAvLyBHcm91cHMgdGhlIG9iamVjdCdzIHZhbHVlcyBieSBhIGNyaXRlcmlvbi4gUGFzcyBlaXRoZXIgYSBzdHJpbmcgYXR0cmlidXRlXG4gIC8vIHRvIGdyb3VwIGJ5LCBvciBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aGUgY3JpdGVyaW9uLlxuICBfLmdyb3VwQnkgPSBncm91cChmdW5jdGlvbihyZXN1bHQsIGtleSwgdmFsdWUpIHtcbiAgICBfLmhhcyhyZXN1bHQsIGtleSkgPyByZXN1bHRba2V5XS5wdXNoKHZhbHVlKSA6IHJlc3VsdFtrZXldID0gW3ZhbHVlXTtcbiAgfSk7XG5cbiAgLy8gSW5kZXhlcyB0aGUgb2JqZWN0J3MgdmFsdWVzIGJ5IGEgY3JpdGVyaW9uLCBzaW1pbGFyIHRvIGBncm91cEJ5YCwgYnV0IGZvclxuICAvLyB3aGVuIHlvdSBrbm93IHRoYXQgeW91ciBpbmRleCB2YWx1ZXMgd2lsbCBiZSB1bmlxdWUuXG4gIF8uaW5kZXhCeSA9IGdyb3VwKGZ1bmN0aW9uKHJlc3VsdCwga2V5LCB2YWx1ZSkge1xuICAgIHJlc3VsdFtrZXldID0gdmFsdWU7XG4gIH0pO1xuXG4gIC8vIENvdW50cyBpbnN0YW5jZXMgb2YgYW4gb2JqZWN0IHRoYXQgZ3JvdXAgYnkgYSBjZXJ0YWluIGNyaXRlcmlvbi4gUGFzc1xuICAvLyBlaXRoZXIgYSBzdHJpbmcgYXR0cmlidXRlIHRvIGNvdW50IGJ5LCBvciBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aGVcbiAgLy8gY3JpdGVyaW9uLlxuICBfLmNvdW50QnkgPSBncm91cChmdW5jdGlvbihyZXN1bHQsIGtleSkge1xuICAgIF8uaGFzKHJlc3VsdCwga2V5KSA/IHJlc3VsdFtrZXldKysgOiByZXN1bHRba2V5XSA9IDE7XG4gIH0pO1xuXG4gIC8vIFVzZSBhIGNvbXBhcmF0b3IgZnVuY3Rpb24gdG8gZmlndXJlIG91dCB0aGUgc21hbGxlc3QgaW5kZXggYXQgd2hpY2hcbiAgLy8gYW4gb2JqZWN0IHNob3VsZCBiZSBpbnNlcnRlZCBzbyBhcyB0byBtYWludGFpbiBvcmRlci4gVXNlcyBiaW5hcnkgc2VhcmNoLlxuICBfLnNvcnRlZEluZGV4ID0gZnVuY3Rpb24oYXJyYXksIG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpdGVyYXRvciA9IGxvb2t1cEl0ZXJhdG9yKGl0ZXJhdG9yKTtcbiAgICB2YXIgdmFsdWUgPSBpdGVyYXRvci5jYWxsKGNvbnRleHQsIG9iaik7XG4gICAgdmFyIGxvdyA9IDAsIGhpZ2ggPSBhcnJheS5sZW5ndGg7XG4gICAgd2hpbGUgKGxvdyA8IGhpZ2gpIHtcbiAgICAgIHZhciBtaWQgPSAobG93ICsgaGlnaCkgPj4+IDE7XG4gICAgICBpdGVyYXRvci5jYWxsKGNvbnRleHQsIGFycmF5W21pZF0pIDwgdmFsdWUgPyBsb3cgPSBtaWQgKyAxIDogaGlnaCA9IG1pZDtcbiAgICB9XG4gICAgcmV0dXJuIGxvdztcbiAgfTtcblxuICAvLyBTYWZlbHkgY3JlYXRlIGEgcmVhbCwgbGl2ZSBhcnJheSBmcm9tIGFueXRoaW5nIGl0ZXJhYmxlLlxuICBfLnRvQXJyYXkgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIW9iaikgcmV0dXJuIFtdO1xuICAgIGlmIChfLmlzQXJyYXkob2JqKSkgcmV0dXJuIHNsaWNlLmNhbGwob2JqKTtcbiAgICBpZiAob2JqLmxlbmd0aCA9PT0gK29iai5sZW5ndGgpIHJldHVybiBfLm1hcChvYmosIF8uaWRlbnRpdHkpO1xuICAgIHJldHVybiBfLnZhbHVlcyhvYmopO1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgbnVtYmVyIG9mIGVsZW1lbnRzIGluIGFuIG9iamVjdC5cbiAgXy5zaXplID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gMDtcbiAgICByZXR1cm4gKG9iai5sZW5ndGggPT09ICtvYmoubGVuZ3RoKSA/IG9iai5sZW5ndGggOiBfLmtleXMob2JqKS5sZW5ndGg7XG4gIH07XG5cbiAgLy8gQXJyYXkgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIEdldCB0aGUgZmlyc3QgZWxlbWVudCBvZiBhbiBhcnJheS4gUGFzc2luZyAqKm4qKiB3aWxsIHJldHVybiB0aGUgZmlyc3QgTlxuICAvLyB2YWx1ZXMgaW4gdGhlIGFycmF5LiBBbGlhc2VkIGFzIGBoZWFkYCBhbmQgYHRha2VgLiBUaGUgKipndWFyZCoqIGNoZWNrXG4gIC8vIGFsbG93cyBpdCB0byB3b3JrIHdpdGggYF8ubWFwYC5cbiAgXy5maXJzdCA9IF8uaGVhZCA9IF8udGFrZSA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIGlmIChhcnJheSA9PSBudWxsKSByZXR1cm4gdm9pZCAwO1xuICAgIGlmICgobiA9PSBudWxsKSB8fCBndWFyZCkgcmV0dXJuIGFycmF5WzBdO1xuICAgIGlmIChuIDwgMCkgcmV0dXJuIFtdO1xuICAgIHJldHVybiBzbGljZS5jYWxsKGFycmF5LCAwLCBuKTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGV2ZXJ5dGhpbmcgYnV0IHRoZSBsYXN0IGVudHJ5IG9mIHRoZSBhcnJheS4gRXNwZWNpYWxseSB1c2VmdWwgb25cbiAgLy8gdGhlIGFyZ3VtZW50cyBvYmplY3QuIFBhc3NpbmcgKipuKiogd2lsbCByZXR1cm4gYWxsIHRoZSB2YWx1ZXMgaW5cbiAgLy8gdGhlIGFycmF5LCBleGNsdWRpbmcgdGhlIGxhc3QgTi4gVGhlICoqZ3VhcmQqKiBjaGVjayBhbGxvd3MgaXQgdG8gd29yayB3aXRoXG4gIC8vIGBfLm1hcGAuXG4gIF8uaW5pdGlhbCA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIHJldHVybiBzbGljZS5jYWxsKGFycmF5LCAwLCBhcnJheS5sZW5ndGggLSAoKG4gPT0gbnVsbCkgfHwgZ3VhcmQgPyAxIDogbikpO1xuICB9O1xuXG4gIC8vIEdldCB0aGUgbGFzdCBlbGVtZW50IG9mIGFuIGFycmF5LiBQYXNzaW5nICoqbioqIHdpbGwgcmV0dXJuIHRoZSBsYXN0IE5cbiAgLy8gdmFsdWVzIGluIHRoZSBhcnJheS4gVGhlICoqZ3VhcmQqKiBjaGVjayBhbGxvd3MgaXQgdG8gd29yayB3aXRoIGBfLm1hcGAuXG4gIF8ubGFzdCA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIGlmIChhcnJheSA9PSBudWxsKSByZXR1cm4gdm9pZCAwO1xuICAgIGlmICgobiA9PSBudWxsKSB8fCBndWFyZCkgcmV0dXJuIGFycmF5W2FycmF5Lmxlbmd0aCAtIDFdO1xuICAgIHJldHVybiBzbGljZS5jYWxsKGFycmF5LCBNYXRoLm1heChhcnJheS5sZW5ndGggLSBuLCAwKSk7XG4gIH07XG5cbiAgLy8gUmV0dXJucyBldmVyeXRoaW5nIGJ1dCB0aGUgZmlyc3QgZW50cnkgb2YgdGhlIGFycmF5LiBBbGlhc2VkIGFzIGB0YWlsYCBhbmQgYGRyb3BgLlxuICAvLyBFc3BlY2lhbGx5IHVzZWZ1bCBvbiB0aGUgYXJndW1lbnRzIG9iamVjdC4gUGFzc2luZyBhbiAqKm4qKiB3aWxsIHJldHVyblxuICAvLyB0aGUgcmVzdCBOIHZhbHVlcyBpbiB0aGUgYXJyYXkuIFRoZSAqKmd1YXJkKipcbiAgLy8gY2hlY2sgYWxsb3dzIGl0IHRvIHdvcmsgd2l0aCBgXy5tYXBgLlxuICBfLnJlc3QgPSBfLnRhaWwgPSBfLmRyb3AgPSBmdW5jdGlvbihhcnJheSwgbiwgZ3VhcmQpIHtcbiAgICByZXR1cm4gc2xpY2UuY2FsbChhcnJheSwgKG4gPT0gbnVsbCkgfHwgZ3VhcmQgPyAxIDogbik7XG4gIH07XG5cbiAgLy8gVHJpbSBvdXQgYWxsIGZhbHN5IHZhbHVlcyBmcm9tIGFuIGFycmF5LlxuICBfLmNvbXBhY3QgPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHJldHVybiBfLmZpbHRlcihhcnJheSwgXy5pZGVudGl0eSk7XG4gIH07XG5cbiAgLy8gSW50ZXJuYWwgaW1wbGVtZW50YXRpb24gb2YgYSByZWN1cnNpdmUgYGZsYXR0ZW5gIGZ1bmN0aW9uLlxuICB2YXIgZmxhdHRlbiA9IGZ1bmN0aW9uKGlucHV0LCBzaGFsbG93LCBvdXRwdXQpIHtcbiAgICBpZiAoc2hhbGxvdyAmJiBfLmV2ZXJ5KGlucHV0LCBfLmlzQXJyYXkpKSB7XG4gICAgICByZXR1cm4gY29uY2F0LmFwcGx5KG91dHB1dCwgaW5wdXQpO1xuICAgIH1cbiAgICBlYWNoKGlucHV0LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkgfHwgXy5pc0FyZ3VtZW50cyh2YWx1ZSkpIHtcbiAgICAgICAgc2hhbGxvdyA/IHB1c2guYXBwbHkob3V0cHV0LCB2YWx1ZSkgOiBmbGF0dGVuKHZhbHVlLCBzaGFsbG93LCBvdXRwdXQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0cHV0LnB1c2godmFsdWUpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBvdXRwdXQ7XG4gIH07XG5cbiAgLy8gRmxhdHRlbiBvdXQgYW4gYXJyYXksIGVpdGhlciByZWN1cnNpdmVseSAoYnkgZGVmYXVsdCksIG9yIGp1c3Qgb25lIGxldmVsLlxuICBfLmZsYXR0ZW4gPSBmdW5jdGlvbihhcnJheSwgc2hhbGxvdykge1xuICAgIHJldHVybiBmbGF0dGVuKGFycmF5LCBzaGFsbG93LCBbXSk7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgdmVyc2lvbiBvZiB0aGUgYXJyYXkgdGhhdCBkb2VzIG5vdCBjb250YWluIHRoZSBzcGVjaWZpZWQgdmFsdWUocykuXG4gIF8ud2l0aG91dCA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgcmV0dXJuIF8uZGlmZmVyZW5jZShhcnJheSwgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgfTtcblxuICAvLyBTcGxpdCBhbiBhcnJheSBpbnRvIHR3byBhcnJheXM6IG9uZSB3aG9zZSBlbGVtZW50cyBhbGwgc2F0aXNmeSB0aGUgZ2l2ZW5cbiAgLy8gcHJlZGljYXRlLCBhbmQgb25lIHdob3NlIGVsZW1lbnRzIGFsbCBkbyBub3Qgc2F0aXNmeSB0aGUgcHJlZGljYXRlLlxuICBfLnBhcnRpdGlvbiA9IGZ1bmN0aW9uKGFycmF5LCBwcmVkaWNhdGUpIHtcbiAgICB2YXIgcGFzcyA9IFtdLCBmYWlsID0gW107XG4gICAgZWFjaChhcnJheSwgZnVuY3Rpb24oZWxlbSkge1xuICAgICAgKHByZWRpY2F0ZShlbGVtKSA/IHBhc3MgOiBmYWlsKS5wdXNoKGVsZW0pO1xuICAgIH0pO1xuICAgIHJldHVybiBbcGFzcywgZmFpbF07XG4gIH07XG5cbiAgLy8gUHJvZHVjZSBhIGR1cGxpY2F0ZS1mcmVlIHZlcnNpb24gb2YgdGhlIGFycmF5LiBJZiB0aGUgYXJyYXkgaGFzIGFscmVhZHlcbiAgLy8gYmVlbiBzb3J0ZWQsIHlvdSBoYXZlIHRoZSBvcHRpb24gb2YgdXNpbmcgYSBmYXN0ZXIgYWxnb3JpdGhtLlxuICAvLyBBbGlhc2VkIGFzIGB1bmlxdWVgLlxuICBfLnVuaXEgPSBfLnVuaXF1ZSA9IGZ1bmN0aW9uKGFycmF5LCBpc1NvcnRlZCwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKGlzU29ydGVkKSkge1xuICAgICAgY29udGV4dCA9IGl0ZXJhdG9yO1xuICAgICAgaXRlcmF0b3IgPSBpc1NvcnRlZDtcbiAgICAgIGlzU29ydGVkID0gZmFsc2U7XG4gICAgfVxuICAgIHZhciBpbml0aWFsID0gaXRlcmF0b3IgPyBfLm1hcChhcnJheSwgaXRlcmF0b3IsIGNvbnRleHQpIDogYXJyYXk7XG4gICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICB2YXIgc2VlbiA9IFtdO1xuICAgIGVhY2goaW5pdGlhbCwgZnVuY3Rpb24odmFsdWUsIGluZGV4KSB7XG4gICAgICBpZiAoaXNTb3J0ZWQgPyAoIWluZGV4IHx8IHNlZW5bc2Vlbi5sZW5ndGggLSAxXSAhPT0gdmFsdWUpIDogIV8uY29udGFpbnMoc2VlbiwgdmFsdWUpKSB7XG4gICAgICAgIHNlZW4ucHVzaCh2YWx1ZSk7XG4gICAgICAgIHJlc3VsdHMucHVzaChhcnJheVtpbmRleF0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9O1xuXG4gIC8vIFByb2R1Y2UgYW4gYXJyYXkgdGhhdCBjb250YWlucyB0aGUgdW5pb246IGVhY2ggZGlzdGluY3QgZWxlbWVudCBmcm9tIGFsbCBvZlxuICAvLyB0aGUgcGFzc2VkLWluIGFycmF5cy5cbiAgXy51bmlvbiA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBfLnVuaXEoXy5mbGF0dGVuKGFyZ3VtZW50cywgdHJ1ZSkpO1xuICB9O1xuXG4gIC8vIFByb2R1Y2UgYW4gYXJyYXkgdGhhdCBjb250YWlucyBldmVyeSBpdGVtIHNoYXJlZCBiZXR3ZWVuIGFsbCB0aGVcbiAgLy8gcGFzc2VkLWluIGFycmF5cy5cbiAgXy5pbnRlcnNlY3Rpb24gPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHZhciByZXN0ID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgIHJldHVybiBfLmZpbHRlcihfLnVuaXEoYXJyYXkpLCBmdW5jdGlvbihpdGVtKSB7XG4gICAgICByZXR1cm4gXy5ldmVyeShyZXN0LCBmdW5jdGlvbihvdGhlcikge1xuICAgICAgICByZXR1cm4gXy5jb250YWlucyhvdGhlciwgaXRlbSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBUYWtlIHRoZSBkaWZmZXJlbmNlIGJldHdlZW4gb25lIGFycmF5IGFuZCBhIG51bWJlciBvZiBvdGhlciBhcnJheXMuXG4gIC8vIE9ubHkgdGhlIGVsZW1lbnRzIHByZXNlbnQgaW4ganVzdCB0aGUgZmlyc3QgYXJyYXkgd2lsbCByZW1haW4uXG4gIF8uZGlmZmVyZW5jZSA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgdmFyIHJlc3QgPSBjb25jYXQuYXBwbHkoQXJyYXlQcm90bywgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgICByZXR1cm4gXy5maWx0ZXIoYXJyYXksIGZ1bmN0aW9uKHZhbHVlKXsgcmV0dXJuICFfLmNvbnRhaW5zKHJlc3QsIHZhbHVlKTsgfSk7XG4gIH07XG5cbiAgLy8gWmlwIHRvZ2V0aGVyIG11bHRpcGxlIGxpc3RzIGludG8gYSBzaW5nbGUgYXJyYXkgLS0gZWxlbWVudHMgdGhhdCBzaGFyZVxuICAvLyBhbiBpbmRleCBnbyB0b2dldGhlci5cbiAgXy56aXAgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbGVuZ3RoID0gXy5tYXgoXy5wbHVjayhhcmd1bWVudHMsICdsZW5ndGgnKS5jb25jYXQoMCkpO1xuICAgIHZhciByZXN1bHRzID0gbmV3IEFycmF5KGxlbmd0aCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgcmVzdWx0c1tpXSA9IF8ucGx1Y2soYXJndW1lbnRzLCAnJyArIGkpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfTtcblxuICAvLyBDb252ZXJ0cyBsaXN0cyBpbnRvIG9iamVjdHMuIFBhc3MgZWl0aGVyIGEgc2luZ2xlIGFycmF5IG9mIGBba2V5LCB2YWx1ZV1gXG4gIC8vIHBhaXJzLCBvciB0d28gcGFyYWxsZWwgYXJyYXlzIG9mIHRoZSBzYW1lIGxlbmd0aCAtLSBvbmUgb2Yga2V5cywgYW5kIG9uZSBvZlxuICAvLyB0aGUgY29ycmVzcG9uZGluZyB2YWx1ZXMuXG4gIF8ub2JqZWN0ID0gZnVuY3Rpb24obGlzdCwgdmFsdWVzKSB7XG4gICAgaWYgKGxpc3QgPT0gbnVsbCkgcmV0dXJuIHt9O1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gbGlzdC5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHZhbHVlcykge1xuICAgICAgICByZXN1bHRbbGlzdFtpXV0gPSB2YWx1ZXNbaV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXN1bHRbbGlzdFtpXVswXV0gPSBsaXN0W2ldWzFdO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIElmIHRoZSBicm93c2VyIGRvZXNuJ3Qgc3VwcGx5IHVzIHdpdGggaW5kZXhPZiAoSSdtIGxvb2tpbmcgYXQgeW91LCAqKk1TSUUqKiksXG4gIC8vIHdlIG5lZWQgdGhpcyBmdW5jdGlvbi4gUmV0dXJuIHRoZSBwb3NpdGlvbiBvZiB0aGUgZmlyc3Qgb2NjdXJyZW5jZSBvZiBhblxuICAvLyBpdGVtIGluIGFuIGFycmF5LCBvciAtMSBpZiB0aGUgaXRlbSBpcyBub3QgaW5jbHVkZWQgaW4gdGhlIGFycmF5LlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgaW5kZXhPZmAgaWYgYXZhaWxhYmxlLlxuICAvLyBJZiB0aGUgYXJyYXkgaXMgbGFyZ2UgYW5kIGFscmVhZHkgaW4gc29ydCBvcmRlciwgcGFzcyBgdHJ1ZWBcbiAgLy8gZm9yICoqaXNTb3J0ZWQqKiB0byB1c2UgYmluYXJ5IHNlYXJjaC5cbiAgXy5pbmRleE9mID0gZnVuY3Rpb24oYXJyYXksIGl0ZW0sIGlzU29ydGVkKSB7XG4gICAgaWYgKGFycmF5ID09IG51bGwpIHJldHVybiAtMTtcbiAgICB2YXIgaSA9IDAsIGxlbmd0aCA9IGFycmF5Lmxlbmd0aDtcbiAgICBpZiAoaXNTb3J0ZWQpIHtcbiAgICAgIGlmICh0eXBlb2YgaXNTb3J0ZWQgPT0gJ251bWJlcicpIHtcbiAgICAgICAgaSA9IChpc1NvcnRlZCA8IDAgPyBNYXRoLm1heCgwLCBsZW5ndGggKyBpc1NvcnRlZCkgOiBpc1NvcnRlZCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpID0gXy5zb3J0ZWRJbmRleChhcnJheSwgaXRlbSk7XG4gICAgICAgIHJldHVybiBhcnJheVtpXSA9PT0gaXRlbSA/IGkgOiAtMTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKG5hdGl2ZUluZGV4T2YgJiYgYXJyYXkuaW5kZXhPZiA9PT0gbmF0aXZlSW5kZXhPZikgcmV0dXJuIGFycmF5LmluZGV4T2YoaXRlbSwgaXNTb3J0ZWQpO1xuICAgIGZvciAoOyBpIDwgbGVuZ3RoOyBpKyspIGlmIChhcnJheVtpXSA9PT0gaXRlbSkgcmV0dXJuIGk7XG4gICAgcmV0dXJuIC0xO1xuICB9O1xuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBsYXN0SW5kZXhPZmAgaWYgYXZhaWxhYmxlLlxuICBfLmxhc3RJbmRleE9mID0gZnVuY3Rpb24oYXJyYXksIGl0ZW0sIGZyb20pIHtcbiAgICBpZiAoYXJyYXkgPT0gbnVsbCkgcmV0dXJuIC0xO1xuICAgIHZhciBoYXNJbmRleCA9IGZyb20gIT0gbnVsbDtcbiAgICBpZiAobmF0aXZlTGFzdEluZGV4T2YgJiYgYXJyYXkubGFzdEluZGV4T2YgPT09IG5hdGl2ZUxhc3RJbmRleE9mKSB7XG4gICAgICByZXR1cm4gaGFzSW5kZXggPyBhcnJheS5sYXN0SW5kZXhPZihpdGVtLCBmcm9tKSA6IGFycmF5Lmxhc3RJbmRleE9mKGl0ZW0pO1xuICAgIH1cbiAgICB2YXIgaSA9IChoYXNJbmRleCA/IGZyb20gOiBhcnJheS5sZW5ndGgpO1xuICAgIHdoaWxlIChpLS0pIGlmIChhcnJheVtpXSA9PT0gaXRlbSkgcmV0dXJuIGk7XG4gICAgcmV0dXJuIC0xO1xuICB9O1xuXG4gIC8vIEdlbmVyYXRlIGFuIGludGVnZXIgQXJyYXkgY29udGFpbmluZyBhbiBhcml0aG1ldGljIHByb2dyZXNzaW9uLiBBIHBvcnQgb2ZcbiAgLy8gdGhlIG5hdGl2ZSBQeXRob24gYHJhbmdlKClgIGZ1bmN0aW9uLiBTZWVcbiAgLy8gW3RoZSBQeXRob24gZG9jdW1lbnRhdGlvbl0oaHR0cDovL2RvY3MucHl0aG9uLm9yZy9saWJyYXJ5L2Z1bmN0aW9ucy5odG1sI3JhbmdlKS5cbiAgXy5yYW5nZSA9IGZ1bmN0aW9uKHN0YXJ0LCBzdG9wLCBzdGVwKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPD0gMSkge1xuICAgICAgc3RvcCA9IHN0YXJ0IHx8IDA7XG4gICAgICBzdGFydCA9IDA7XG4gICAgfVxuICAgIHN0ZXAgPSBhcmd1bWVudHNbMl0gfHwgMTtcblxuICAgIHZhciBsZW5ndGggPSBNYXRoLm1heChNYXRoLmNlaWwoKHN0b3AgLSBzdGFydCkgLyBzdGVwKSwgMCk7XG4gICAgdmFyIGlkeCA9IDA7XG4gICAgdmFyIHJhbmdlID0gbmV3IEFycmF5KGxlbmd0aCk7XG5cbiAgICB3aGlsZShpZHggPCBsZW5ndGgpIHtcbiAgICAgIHJhbmdlW2lkeCsrXSA9IHN0YXJ0O1xuICAgICAgc3RhcnQgKz0gc3RlcDtcbiAgICB9XG5cbiAgICByZXR1cm4gcmFuZ2U7XG4gIH07XG5cbiAgLy8gRnVuY3Rpb24gKGFoZW0pIEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBSZXVzYWJsZSBjb25zdHJ1Y3RvciBmdW5jdGlvbiBmb3IgcHJvdG90eXBlIHNldHRpbmcuXG4gIHZhciBjdG9yID0gZnVuY3Rpb24oKXt9O1xuXG4gIC8vIENyZWF0ZSBhIGZ1bmN0aW9uIGJvdW5kIHRvIGEgZ2l2ZW4gb2JqZWN0IChhc3NpZ25pbmcgYHRoaXNgLCBhbmQgYXJndW1lbnRzLFxuICAvLyBvcHRpb25hbGx5KS4gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYEZ1bmN0aW9uLmJpbmRgIGlmXG4gIC8vIGF2YWlsYWJsZS5cbiAgXy5iaW5kID0gZnVuY3Rpb24oZnVuYywgY29udGV4dCkge1xuICAgIHZhciBhcmdzLCBib3VuZDtcbiAgICBpZiAobmF0aXZlQmluZCAmJiBmdW5jLmJpbmQgPT09IG5hdGl2ZUJpbmQpIHJldHVybiBuYXRpdmVCaW5kLmFwcGx5KGZ1bmMsIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gICAgaWYgKCFfLmlzRnVuY3Rpb24oZnVuYykpIHRocm93IG5ldyBUeXBlRXJyb3I7XG4gICAgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcbiAgICByZXR1cm4gYm91bmQgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBib3VuZCkpIHJldHVybiBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MuY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuICAgICAgY3Rvci5wcm90b3R5cGUgPSBmdW5jLnByb3RvdHlwZTtcbiAgICAgIHZhciBzZWxmID0gbmV3IGN0b3I7XG4gICAgICBjdG9yLnByb3RvdHlwZSA9IG51bGw7XG4gICAgICB2YXIgcmVzdWx0ID0gZnVuYy5hcHBseShzZWxmLCBhcmdzLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgICAgIGlmIChPYmplY3QocmVzdWx0KSA9PT0gcmVzdWx0KSByZXR1cm4gcmVzdWx0O1xuICAgICAgcmV0dXJuIHNlbGY7XG4gICAgfTtcbiAgfTtcblxuICAvLyBQYXJ0aWFsbHkgYXBwbHkgYSBmdW5jdGlvbiBieSBjcmVhdGluZyBhIHZlcnNpb24gdGhhdCBoYXMgaGFkIHNvbWUgb2YgaXRzXG4gIC8vIGFyZ3VtZW50cyBwcmUtZmlsbGVkLCB3aXRob3V0IGNoYW5naW5nIGl0cyBkeW5hbWljIGB0aGlzYCBjb250ZXh0LiBfIGFjdHNcbiAgLy8gYXMgYSBwbGFjZWhvbGRlciwgYWxsb3dpbmcgYW55IGNvbWJpbmF0aW9uIG9mIGFyZ3VtZW50cyB0byBiZSBwcmUtZmlsbGVkLlxuICBfLnBhcnRpYWwgPSBmdW5jdGlvbihmdW5jKSB7XG4gICAgdmFyIGJvdW5kQXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcG9zaXRpb24gPSAwO1xuICAgICAgdmFyIGFyZ3MgPSBib3VuZEFyZ3Muc2xpY2UoKTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBhcmdzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChhcmdzW2ldID09PSBfKSBhcmdzW2ldID0gYXJndW1lbnRzW3Bvc2l0aW9uKytdO1xuICAgICAgfVxuICAgICAgd2hpbGUgKHBvc2l0aW9uIDwgYXJndW1lbnRzLmxlbmd0aCkgYXJncy5wdXNoKGFyZ3VtZW50c1twb3NpdGlvbisrXSk7XG4gICAgICByZXR1cm4gZnVuYy5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIEJpbmQgYSBudW1iZXIgb2YgYW4gb2JqZWN0J3MgbWV0aG9kcyB0byB0aGF0IG9iamVjdC4gUmVtYWluaW5nIGFyZ3VtZW50c1xuICAvLyBhcmUgdGhlIG1ldGhvZCBuYW1lcyB0byBiZSBib3VuZC4gVXNlZnVsIGZvciBlbnN1cmluZyB0aGF0IGFsbCBjYWxsYmFja3NcbiAgLy8gZGVmaW5lZCBvbiBhbiBvYmplY3QgYmVsb25nIHRvIGl0LlxuICBfLmJpbmRBbGwgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgZnVuY3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgaWYgKGZ1bmNzLmxlbmd0aCA9PT0gMCkgdGhyb3cgbmV3IEVycm9yKCdiaW5kQWxsIG11c3QgYmUgcGFzc2VkIGZ1bmN0aW9uIG5hbWVzJyk7XG4gICAgZWFjaChmdW5jcywgZnVuY3Rpb24oZikgeyBvYmpbZl0gPSBfLmJpbmQob2JqW2ZdLCBvYmopOyB9KTtcbiAgICByZXR1cm4gb2JqO1xuICB9O1xuXG4gIC8vIE1lbW9pemUgYW4gZXhwZW5zaXZlIGZ1bmN0aW9uIGJ5IHN0b3JpbmcgaXRzIHJlc3VsdHMuXG4gIF8ubWVtb2l6ZSA9IGZ1bmN0aW9uKGZ1bmMsIGhhc2hlcikge1xuICAgIHZhciBtZW1vID0ge307XG4gICAgaGFzaGVyIHx8IChoYXNoZXIgPSBfLmlkZW50aXR5KTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIga2V5ID0gaGFzaGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICByZXR1cm4gXy5oYXMobWVtbywga2V5KSA/IG1lbW9ba2V5XSA6IChtZW1vW2tleV0gPSBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykpO1xuICAgIH07XG4gIH07XG5cbiAgLy8gRGVsYXlzIGEgZnVuY3Rpb24gZm9yIHRoZSBnaXZlbiBudW1iZXIgb2YgbWlsbGlzZWNvbmRzLCBhbmQgdGhlbiBjYWxsc1xuICAvLyBpdCB3aXRoIHRoZSBhcmd1bWVudHMgc3VwcGxpZWQuXG4gIF8uZGVsYXkgPSBmdW5jdGlvbihmdW5jLCB3YWl0KSB7XG4gICAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuY3Rpb24oKXsgcmV0dXJuIGZ1bmMuYXBwbHkobnVsbCwgYXJncyk7IH0sIHdhaXQpO1xuICB9O1xuXG4gIC8vIERlZmVycyBhIGZ1bmN0aW9uLCBzY2hlZHVsaW5nIGl0IHRvIHJ1biBhZnRlciB0aGUgY3VycmVudCBjYWxsIHN0YWNrIGhhc1xuICAvLyBjbGVhcmVkLlxuICBfLmRlZmVyID0gZnVuY3Rpb24oZnVuYykge1xuICAgIHJldHVybiBfLmRlbGF5LmFwcGx5KF8sIFtmdW5jLCAxXS5jb25jYXQoc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKSk7XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uLCB0aGF0LCB3aGVuIGludm9rZWQsIHdpbGwgb25seSBiZSB0cmlnZ2VyZWQgYXQgbW9zdCBvbmNlXG4gIC8vIGR1cmluZyBhIGdpdmVuIHdpbmRvdyBvZiB0aW1lLiBOb3JtYWxseSwgdGhlIHRocm90dGxlZCBmdW5jdGlvbiB3aWxsIHJ1blxuICAvLyBhcyBtdWNoIGFzIGl0IGNhbiwgd2l0aG91dCBldmVyIGdvaW5nIG1vcmUgdGhhbiBvbmNlIHBlciBgd2FpdGAgZHVyYXRpb247XG4gIC8vIGJ1dCBpZiB5b3UnZCBsaWtlIHRvIGRpc2FibGUgdGhlIGV4ZWN1dGlvbiBvbiB0aGUgbGVhZGluZyBlZGdlLCBwYXNzXG4gIC8vIGB7bGVhZGluZzogZmFsc2V9YC4gVG8gZGlzYWJsZSBleGVjdXRpb24gb24gdGhlIHRyYWlsaW5nIGVkZ2UsIGRpdHRvLlxuICBfLnRocm90dGxlID0gZnVuY3Rpb24oZnVuYywgd2FpdCwgb3B0aW9ucykge1xuICAgIHZhciBjb250ZXh0LCBhcmdzLCByZXN1bHQ7XG4gICAgdmFyIHRpbWVvdXQgPSBudWxsO1xuICAgIHZhciBwcmV2aW91cyA9IDA7XG4gICAgb3B0aW9ucyB8fCAob3B0aW9ucyA9IHt9KTtcbiAgICB2YXIgbGF0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgIHByZXZpb3VzID0gb3B0aW9ucy5sZWFkaW5nID09PSBmYWxzZSA/IDAgOiBfLm5vdygpO1xuICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgY29udGV4dCA9IGFyZ3MgPSBudWxsO1xuICAgIH07XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIG5vdyA9IF8ubm93KCk7XG4gICAgICBpZiAoIXByZXZpb3VzICYmIG9wdGlvbnMubGVhZGluZyA9PT0gZmFsc2UpIHByZXZpb3VzID0gbm93O1xuICAgICAgdmFyIHJlbWFpbmluZyA9IHdhaXQgLSAobm93IC0gcHJldmlvdXMpO1xuICAgICAgY29udGV4dCA9IHRoaXM7XG4gICAgICBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgaWYgKHJlbWFpbmluZyA8PSAwKSB7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICAgIHByZXZpb3VzID0gbm93O1xuICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgICBjb250ZXh0ID0gYXJncyA9IG51bGw7XG4gICAgICB9IGVsc2UgaWYgKCF0aW1lb3V0ICYmIG9wdGlvbnMudHJhaWxpbmcgIT09IGZhbHNlKSB7XG4gICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCByZW1haW5pbmcpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiwgdGhhdCwgYXMgbG9uZyBhcyBpdCBjb250aW51ZXMgdG8gYmUgaW52b2tlZCwgd2lsbCBub3RcbiAgLy8gYmUgdHJpZ2dlcmVkLiBUaGUgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgYWZ0ZXIgaXQgc3RvcHMgYmVpbmcgY2FsbGVkIGZvclxuICAvLyBOIG1pbGxpc2Vjb25kcy4gSWYgYGltbWVkaWF0ZWAgaXMgcGFzc2VkLCB0cmlnZ2VyIHRoZSBmdW5jdGlvbiBvbiB0aGVcbiAgLy8gbGVhZGluZyBlZGdlLCBpbnN0ZWFkIG9mIHRoZSB0cmFpbGluZy5cbiAgXy5kZWJvdW5jZSA9IGZ1bmN0aW9uKGZ1bmMsIHdhaXQsIGltbWVkaWF0ZSkge1xuICAgIHZhciB0aW1lb3V0LCBhcmdzLCBjb250ZXh0LCB0aW1lc3RhbXAsIHJlc3VsdDtcblxuICAgIHZhciBsYXRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGxhc3QgPSBfLm5vdygpIC0gdGltZXN0YW1wO1xuICAgICAgaWYgKGxhc3QgPCB3YWl0KSB7XG4gICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCB3YWl0IC0gbGFzdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgICAgaWYgKCFpbW1lZGlhdGUpIHtcbiAgICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgICAgIGNvbnRleHQgPSBhcmdzID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBjb250ZXh0ID0gdGhpcztcbiAgICAgIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICB0aW1lc3RhbXAgPSBfLm5vdygpO1xuICAgICAgdmFyIGNhbGxOb3cgPSBpbW1lZGlhdGUgJiYgIXRpbWVvdXQ7XG4gICAgICBpZiAoIXRpbWVvdXQpIHtcbiAgICAgICAgdGltZW91dCA9IHNldFRpbWVvdXQobGF0ZXIsIHdhaXQpO1xuICAgICAgfVxuICAgICAgaWYgKGNhbGxOb3cpIHtcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgY29udGV4dCA9IGFyZ3MgPSBudWxsO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgd2lsbCBiZSBleGVjdXRlZCBhdCBtb3N0IG9uZSB0aW1lLCBubyBtYXR0ZXIgaG93XG4gIC8vIG9mdGVuIHlvdSBjYWxsIGl0LiBVc2VmdWwgZm9yIGxhenkgaW5pdGlhbGl6YXRpb24uXG4gIF8ub25jZSA9IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICB2YXIgcmFuID0gZmFsc2UsIG1lbW87XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHJhbikgcmV0dXJuIG1lbW87XG4gICAgICByYW4gPSB0cnVlO1xuICAgICAgbWVtbyA9IGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIGZ1bmMgPSBudWxsO1xuICAgICAgcmV0dXJuIG1lbW87XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIHRoZSBmaXJzdCBmdW5jdGlvbiBwYXNzZWQgYXMgYW4gYXJndW1lbnQgdG8gdGhlIHNlY29uZCxcbiAgLy8gYWxsb3dpbmcgeW91IHRvIGFkanVzdCBhcmd1bWVudHMsIHJ1biBjb2RlIGJlZm9yZSBhbmQgYWZ0ZXIsIGFuZFxuICAvLyBjb25kaXRpb25hbGx5IGV4ZWN1dGUgdGhlIG9yaWdpbmFsIGZ1bmN0aW9uLlxuICBfLndyYXAgPSBmdW5jdGlvbihmdW5jLCB3cmFwcGVyKSB7XG4gICAgcmV0dXJuIF8ucGFydGlhbCh3cmFwcGVyLCBmdW5jKTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCBpcyB0aGUgY29tcG9zaXRpb24gb2YgYSBsaXN0IG9mIGZ1bmN0aW9ucywgZWFjaFxuICAvLyBjb25zdW1pbmcgdGhlIHJldHVybiB2YWx1ZSBvZiB0aGUgZnVuY3Rpb24gdGhhdCBmb2xsb3dzLlxuICBfLmNvbXBvc2UgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZnVuY3MgPSBhcmd1bWVudHM7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICBmb3IgKHZhciBpID0gZnVuY3MubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgYXJncyA9IFtmdW5jc1tpXS5hcHBseSh0aGlzLCBhcmdzKV07XG4gICAgICB9XG4gICAgICByZXR1cm4gYXJnc1swXTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHdpbGwgb25seSBiZSBleGVjdXRlZCBhZnRlciBiZWluZyBjYWxsZWQgTiB0aW1lcy5cbiAgXy5hZnRlciA9IGZ1bmN0aW9uKHRpbWVzLCBmdW5jKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKC0tdGltZXMgPCAxKSB7XG4gICAgICAgIHJldHVybiBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9XG4gICAgfTtcbiAgfTtcblxuICAvLyBPYmplY3QgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBSZXRyaWV2ZSB0aGUgbmFtZXMgb2YgYW4gb2JqZWN0J3MgcHJvcGVydGllcy5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYE9iamVjdC5rZXlzYFxuICBfLmtleXMgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIV8uaXNPYmplY3Qob2JqKSkgcmV0dXJuIFtdO1xuICAgIGlmIChuYXRpdmVLZXlzKSByZXR1cm4gbmF0aXZlS2V5cyhvYmopO1xuICAgIHZhciBrZXlzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikgaWYgKF8uaGFzKG9iaiwga2V5KSkga2V5cy5wdXNoKGtleSk7XG4gICAgcmV0dXJuIGtleXM7XG4gIH07XG5cbiAgLy8gUmV0cmlldmUgdGhlIHZhbHVlcyBvZiBhbiBvYmplY3QncyBwcm9wZXJ0aWVzLlxuICBfLnZhbHVlcyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgdmFyIGxlbmd0aCA9IGtleXMubGVuZ3RoO1xuICAgIHZhciB2YWx1ZXMgPSBuZXcgQXJyYXkobGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICB2YWx1ZXNbaV0gPSBvYmpba2V5c1tpXV07XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZXM7XG4gIH07XG5cbiAgLy8gQ29udmVydCBhbiBvYmplY3QgaW50byBhIGxpc3Qgb2YgYFtrZXksIHZhbHVlXWAgcGFpcnMuXG4gIF8ucGFpcnMgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgIHZhciBsZW5ndGggPSBrZXlzLmxlbmd0aDtcbiAgICB2YXIgcGFpcnMgPSBuZXcgQXJyYXkobGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBwYWlyc1tpXSA9IFtrZXlzW2ldLCBvYmpba2V5c1tpXV1dO1xuICAgIH1cbiAgICByZXR1cm4gcGFpcnM7XG4gIH07XG5cbiAgLy8gSW52ZXJ0IHRoZSBrZXlzIGFuZCB2YWx1ZXMgb2YgYW4gb2JqZWN0LiBUaGUgdmFsdWVzIG11c3QgYmUgc2VyaWFsaXphYmxlLlxuICBfLmludmVydCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBrZXlzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICByZXN1bHRbb2JqW2tleXNbaV1dXSA9IGtleXNbaV07XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgc29ydGVkIGxpc3Qgb2YgdGhlIGZ1bmN0aW9uIG5hbWVzIGF2YWlsYWJsZSBvbiB0aGUgb2JqZWN0LlxuICAvLyBBbGlhc2VkIGFzIGBtZXRob2RzYFxuICBfLmZ1bmN0aW9ucyA9IF8ubWV0aG9kcyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBuYW1lcyA9IFtdO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgIGlmIChfLmlzRnVuY3Rpb24ob2JqW2tleV0pKSBuYW1lcy5wdXNoKGtleSk7XG4gICAgfVxuICAgIHJldHVybiBuYW1lcy5zb3J0KCk7XG4gIH07XG5cbiAgLy8gRXh0ZW5kIGEgZ2l2ZW4gb2JqZWN0IHdpdGggYWxsIHRoZSBwcm9wZXJ0aWVzIGluIHBhc3NlZC1pbiBvYmplY3QocykuXG4gIF8uZXh0ZW5kID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgZWFjaChzbGljZS5jYWxsKGFyZ3VtZW50cywgMSksIGZ1bmN0aW9uKHNvdXJjZSkge1xuICAgICAgaWYgKHNvdXJjZSkge1xuICAgICAgICBmb3IgKHZhciBwcm9wIGluIHNvdXJjZSkge1xuICAgICAgICAgIG9ialtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgY29weSBvZiB0aGUgb2JqZWN0IG9ubHkgY29udGFpbmluZyB0aGUgd2hpdGVsaXN0ZWQgcHJvcGVydGllcy5cbiAgXy5waWNrID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIGNvcHkgPSB7fTtcbiAgICB2YXIga2V5cyA9IGNvbmNhdC5hcHBseShBcnJheVByb3RvLCBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICAgIGVhY2goa2V5cywgZnVuY3Rpb24oa2V5KSB7XG4gICAgICBpZiAoa2V5IGluIG9iaikgY29weVtrZXldID0gb2JqW2tleV07XG4gICAgfSk7XG4gICAgcmV0dXJuIGNvcHk7XG4gIH07XG5cbiAgIC8vIFJldHVybiBhIGNvcHkgb2YgdGhlIG9iamVjdCB3aXRob3V0IHRoZSBibGFja2xpc3RlZCBwcm9wZXJ0aWVzLlxuICBfLm9taXQgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgY29weSA9IHt9O1xuICAgIHZhciBrZXlzID0gY29uY2F0LmFwcGx5KEFycmF5UHJvdG8sIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgaWYgKCFfLmNvbnRhaW5zKGtleXMsIGtleSkpIGNvcHlba2V5XSA9IG9ialtrZXldO1xuICAgIH1cbiAgICByZXR1cm4gY29weTtcbiAgfTtcblxuICAvLyBGaWxsIGluIGEgZ2l2ZW4gb2JqZWN0IHdpdGggZGVmYXVsdCBwcm9wZXJ0aWVzLlxuICBfLmRlZmF1bHRzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgZWFjaChzbGljZS5jYWxsKGFyZ3VtZW50cywgMSksIGZ1bmN0aW9uKHNvdXJjZSkge1xuICAgICAgaWYgKHNvdXJjZSkge1xuICAgICAgICBmb3IgKHZhciBwcm9wIGluIHNvdXJjZSkge1xuICAgICAgICAgIGlmIChvYmpbcHJvcF0gPT09IHZvaWQgMCkgb2JqW3Byb3BdID0gc291cmNlW3Byb3BdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBDcmVhdGUgYSAoc2hhbGxvdy1jbG9uZWQpIGR1cGxpY2F0ZSBvZiBhbiBvYmplY3QuXG4gIF8uY2xvbmUgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIV8uaXNPYmplY3Qob2JqKSkgcmV0dXJuIG9iajtcbiAgICByZXR1cm4gXy5pc0FycmF5KG9iaikgPyBvYmouc2xpY2UoKSA6IF8uZXh0ZW5kKHt9LCBvYmopO1xuICB9O1xuXG4gIC8vIEludm9rZXMgaW50ZXJjZXB0b3Igd2l0aCB0aGUgb2JqLCBhbmQgdGhlbiByZXR1cm5zIG9iai5cbiAgLy8gVGhlIHByaW1hcnkgcHVycG9zZSBvZiB0aGlzIG1ldGhvZCBpcyB0byBcInRhcCBpbnRvXCIgYSBtZXRob2QgY2hhaW4sIGluXG4gIC8vIG9yZGVyIHRvIHBlcmZvcm0gb3BlcmF0aW9ucyBvbiBpbnRlcm1lZGlhdGUgcmVzdWx0cyB3aXRoaW4gdGhlIGNoYWluLlxuICBfLnRhcCA9IGZ1bmN0aW9uKG9iaiwgaW50ZXJjZXB0b3IpIHtcbiAgICBpbnRlcmNlcHRvcihvYmopO1xuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gSW50ZXJuYWwgcmVjdXJzaXZlIGNvbXBhcmlzb24gZnVuY3Rpb24gZm9yIGBpc0VxdWFsYC5cbiAgdmFyIGVxID0gZnVuY3Rpb24oYSwgYiwgYVN0YWNrLCBiU3RhY2spIHtcbiAgICAvLyBJZGVudGljYWwgb2JqZWN0cyBhcmUgZXF1YWwuIGAwID09PSAtMGAsIGJ1dCB0aGV5IGFyZW4ndCBpZGVudGljYWwuXG4gICAgLy8gU2VlIHRoZSBbSGFybW9ueSBgZWdhbGAgcHJvcG9zYWxdKGh0dHA6Ly93aWtpLmVjbWFzY3JpcHQub3JnL2Rva3UucGhwP2lkPWhhcm1vbnk6ZWdhbCkuXG4gICAgaWYgKGEgPT09IGIpIHJldHVybiBhICE9PSAwIHx8IDEgLyBhID09IDEgLyBiO1xuICAgIC8vIEEgc3RyaWN0IGNvbXBhcmlzb24gaXMgbmVjZXNzYXJ5IGJlY2F1c2UgYG51bGwgPT0gdW5kZWZpbmVkYC5cbiAgICBpZiAoYSA9PSBudWxsIHx8IGIgPT0gbnVsbCkgcmV0dXJuIGEgPT09IGI7XG4gICAgLy8gVW53cmFwIGFueSB3cmFwcGVkIG9iamVjdHMuXG4gICAgaWYgKGEgaW5zdGFuY2VvZiBfKSBhID0gYS5fd3JhcHBlZDtcbiAgICBpZiAoYiBpbnN0YW5jZW9mIF8pIGIgPSBiLl93cmFwcGVkO1xuICAgIC8vIENvbXBhcmUgYFtbQ2xhc3NdXWAgbmFtZXMuXG4gICAgdmFyIGNsYXNzTmFtZSA9IHRvU3RyaW5nLmNhbGwoYSk7XG4gICAgaWYgKGNsYXNzTmFtZSAhPSB0b1N0cmluZy5jYWxsKGIpKSByZXR1cm4gZmFsc2U7XG4gICAgc3dpdGNoIChjbGFzc05hbWUpIHtcbiAgICAgIC8vIFN0cmluZ3MsIG51bWJlcnMsIGRhdGVzLCBhbmQgYm9vbGVhbnMgYXJlIGNvbXBhcmVkIGJ5IHZhbHVlLlxuICAgICAgY2FzZSAnW29iamVjdCBTdHJpbmddJzpcbiAgICAgICAgLy8gUHJpbWl0aXZlcyBhbmQgdGhlaXIgY29ycmVzcG9uZGluZyBvYmplY3Qgd3JhcHBlcnMgYXJlIGVxdWl2YWxlbnQ7IHRodXMsIGBcIjVcImAgaXNcbiAgICAgICAgLy8gZXF1aXZhbGVudCB0byBgbmV3IFN0cmluZyhcIjVcIilgLlxuICAgICAgICByZXR1cm4gYSA9PSBTdHJpbmcoYik7XG4gICAgICBjYXNlICdbb2JqZWN0IE51bWJlcl0nOlxuICAgICAgICAvLyBgTmFOYHMgYXJlIGVxdWl2YWxlbnQsIGJ1dCBub24tcmVmbGV4aXZlLiBBbiBgZWdhbGAgY29tcGFyaXNvbiBpcyBwZXJmb3JtZWQgZm9yXG4gICAgICAgIC8vIG90aGVyIG51bWVyaWMgdmFsdWVzLlxuICAgICAgICByZXR1cm4gYSAhPSArYSA/IGIgIT0gK2IgOiAoYSA9PSAwID8gMSAvIGEgPT0gMSAvIGIgOiBhID09ICtiKTtcbiAgICAgIGNhc2UgJ1tvYmplY3QgRGF0ZV0nOlxuICAgICAgY2FzZSAnW29iamVjdCBCb29sZWFuXSc6XG4gICAgICAgIC8vIENvZXJjZSBkYXRlcyBhbmQgYm9vbGVhbnMgdG8gbnVtZXJpYyBwcmltaXRpdmUgdmFsdWVzLiBEYXRlcyBhcmUgY29tcGFyZWQgYnkgdGhlaXJcbiAgICAgICAgLy8gbWlsbGlzZWNvbmQgcmVwcmVzZW50YXRpb25zLiBOb3RlIHRoYXQgaW52YWxpZCBkYXRlcyB3aXRoIG1pbGxpc2Vjb25kIHJlcHJlc2VudGF0aW9uc1xuICAgICAgICAvLyBvZiBgTmFOYCBhcmUgbm90IGVxdWl2YWxlbnQuXG4gICAgICAgIHJldHVybiArYSA9PSArYjtcbiAgICAgIC8vIFJlZ0V4cHMgYXJlIGNvbXBhcmVkIGJ5IHRoZWlyIHNvdXJjZSBwYXR0ZXJucyBhbmQgZmxhZ3MuXG4gICAgICBjYXNlICdbb2JqZWN0IFJlZ0V4cF0nOlxuICAgICAgICByZXR1cm4gYS5zb3VyY2UgPT0gYi5zb3VyY2UgJiZcbiAgICAgICAgICAgICAgIGEuZ2xvYmFsID09IGIuZ2xvYmFsICYmXG4gICAgICAgICAgICAgICBhLm11bHRpbGluZSA9PSBiLm11bHRpbGluZSAmJlxuICAgICAgICAgICAgICAgYS5pZ25vcmVDYXNlID09IGIuaWdub3JlQ2FzZTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBhICE9ICdvYmplY3QnIHx8IHR5cGVvZiBiICE9ICdvYmplY3QnKSByZXR1cm4gZmFsc2U7XG4gICAgLy8gQXNzdW1lIGVxdWFsaXR5IGZvciBjeWNsaWMgc3RydWN0dXJlcy4gVGhlIGFsZ29yaXRobSBmb3IgZGV0ZWN0aW5nIGN5Y2xpY1xuICAgIC8vIHN0cnVjdHVyZXMgaXMgYWRhcHRlZCBmcm9tIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjMsIGFic3RyYWN0IG9wZXJhdGlvbiBgSk9gLlxuICAgIHZhciBsZW5ndGggPSBhU3RhY2subGVuZ3RoO1xuICAgIHdoaWxlIChsZW5ndGgtLSkge1xuICAgICAgLy8gTGluZWFyIHNlYXJjaC4gUGVyZm9ybWFuY2UgaXMgaW52ZXJzZWx5IHByb3BvcnRpb25hbCB0byB0aGUgbnVtYmVyIG9mXG4gICAgICAvLyB1bmlxdWUgbmVzdGVkIHN0cnVjdHVyZXMuXG4gICAgICBpZiAoYVN0YWNrW2xlbmd0aF0gPT0gYSkgcmV0dXJuIGJTdGFja1tsZW5ndGhdID09IGI7XG4gICAgfVxuICAgIC8vIE9iamVjdHMgd2l0aCBkaWZmZXJlbnQgY29uc3RydWN0b3JzIGFyZSBub3QgZXF1aXZhbGVudCwgYnV0IGBPYmplY3Rgc1xuICAgIC8vIGZyb20gZGlmZmVyZW50IGZyYW1lcyBhcmUuXG4gICAgdmFyIGFDdG9yID0gYS5jb25zdHJ1Y3RvciwgYkN0b3IgPSBiLmNvbnN0cnVjdG9yO1xuICAgIGlmIChhQ3RvciAhPT0gYkN0b3IgJiYgIShfLmlzRnVuY3Rpb24oYUN0b3IpICYmIChhQ3RvciBpbnN0YW5jZW9mIGFDdG9yKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLmlzRnVuY3Rpb24oYkN0b3IpICYmIChiQ3RvciBpbnN0YW5jZW9mIGJDdG9yKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICYmICgnY29uc3RydWN0b3InIGluIGEgJiYgJ2NvbnN0cnVjdG9yJyBpbiBiKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvLyBBZGQgdGhlIGZpcnN0IG9iamVjdCB0byB0aGUgc3RhY2sgb2YgdHJhdmVyc2VkIG9iamVjdHMuXG4gICAgYVN0YWNrLnB1c2goYSk7XG4gICAgYlN0YWNrLnB1c2goYik7XG4gICAgdmFyIHNpemUgPSAwLCByZXN1bHQgPSB0cnVlO1xuICAgIC8vIFJlY3Vyc2l2ZWx5IGNvbXBhcmUgb2JqZWN0cyBhbmQgYXJyYXlzLlxuICAgIGlmIChjbGFzc05hbWUgPT0gJ1tvYmplY3QgQXJyYXldJykge1xuICAgICAgLy8gQ29tcGFyZSBhcnJheSBsZW5ndGhzIHRvIGRldGVybWluZSBpZiBhIGRlZXAgY29tcGFyaXNvbiBpcyBuZWNlc3NhcnkuXG4gICAgICBzaXplID0gYS5sZW5ndGg7XG4gICAgICByZXN1bHQgPSBzaXplID09IGIubGVuZ3RoO1xuICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAvLyBEZWVwIGNvbXBhcmUgdGhlIGNvbnRlbnRzLCBpZ25vcmluZyBub24tbnVtZXJpYyBwcm9wZXJ0aWVzLlxuICAgICAgICB3aGlsZSAoc2l6ZS0tKSB7XG4gICAgICAgICAgaWYgKCEocmVzdWx0ID0gZXEoYVtzaXplXSwgYltzaXplXSwgYVN0YWNrLCBiU3RhY2spKSkgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRGVlcCBjb21wYXJlIG9iamVjdHMuXG4gICAgICBmb3IgKHZhciBrZXkgaW4gYSkge1xuICAgICAgICBpZiAoXy5oYXMoYSwga2V5KSkge1xuICAgICAgICAgIC8vIENvdW50IHRoZSBleHBlY3RlZCBudW1iZXIgb2YgcHJvcGVydGllcy5cbiAgICAgICAgICBzaXplKys7XG4gICAgICAgICAgLy8gRGVlcCBjb21wYXJlIGVhY2ggbWVtYmVyLlxuICAgICAgICAgIGlmICghKHJlc3VsdCA9IF8uaGFzKGIsIGtleSkgJiYgZXEoYVtrZXldLCBiW2tleV0sIGFTdGFjaywgYlN0YWNrKSkpIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBFbnN1cmUgdGhhdCBib3RoIG9iamVjdHMgY29udGFpbiB0aGUgc2FtZSBudW1iZXIgb2YgcHJvcGVydGllcy5cbiAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgZm9yIChrZXkgaW4gYikge1xuICAgICAgICAgIGlmIChfLmhhcyhiLCBrZXkpICYmICEoc2l6ZS0tKSkgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0ID0gIXNpemU7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIFJlbW92ZSB0aGUgZmlyc3Qgb2JqZWN0IGZyb20gdGhlIHN0YWNrIG9mIHRyYXZlcnNlZCBvYmplY3RzLlxuICAgIGFTdGFjay5wb3AoKTtcbiAgICBiU3RhY2sucG9wKCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBQZXJmb3JtIGEgZGVlcCBjb21wYXJpc29uIHRvIGNoZWNrIGlmIHR3byBvYmplY3RzIGFyZSBlcXVhbC5cbiAgXy5pc0VxdWFsID0gZnVuY3Rpb24oYSwgYikge1xuICAgIHJldHVybiBlcShhLCBiLCBbXSwgW10pO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gYXJyYXksIHN0cmluZywgb3Igb2JqZWN0IGVtcHR5P1xuICAvLyBBbiBcImVtcHR5XCIgb2JqZWN0IGhhcyBubyBlbnVtZXJhYmxlIG93bi1wcm9wZXJ0aWVzLlxuICBfLmlzRW1wdHkgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiB0cnVlO1xuICAgIGlmIChfLmlzQXJyYXkob2JqKSB8fCBfLmlzU3RyaW5nKG9iaikpIHJldHVybiBvYmoubGVuZ3RoID09PSAwO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIGlmIChfLmhhcyhvYmosIGtleSkpIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhbHVlIGEgRE9NIGVsZW1lbnQ/XG4gIF8uaXNFbGVtZW50ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuICEhKG9iaiAmJiBvYmoubm9kZVR5cGUgPT09IDEpO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFsdWUgYW4gYXJyYXk/XG4gIC8vIERlbGVnYXRlcyB0byBFQ01BNSdzIG5hdGl2ZSBBcnJheS5pc0FycmF5XG4gIF8uaXNBcnJheSA9IG5hdGl2ZUlzQXJyYXkgfHwgZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PSAnW29iamVjdCBBcnJheV0nO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFyaWFibGUgYW4gb2JqZWN0P1xuICBfLmlzT2JqZWN0ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIG9iaiA9PT0gT2JqZWN0KG9iaik7XG4gIH07XG5cbiAgLy8gQWRkIHNvbWUgaXNUeXBlIG1ldGhvZHM6IGlzQXJndW1lbnRzLCBpc0Z1bmN0aW9uLCBpc1N0cmluZywgaXNOdW1iZXIsIGlzRGF0ZSwgaXNSZWdFeHAuXG4gIGVhY2goWydBcmd1bWVudHMnLCAnRnVuY3Rpb24nLCAnU3RyaW5nJywgJ051bWJlcicsICdEYXRlJywgJ1JlZ0V4cCddLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgX1snaXMnICsgbmFtZV0gPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiB0b1N0cmluZy5jYWxsKG9iaikgPT0gJ1tvYmplY3QgJyArIG5hbWUgKyAnXSc7XG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gRGVmaW5lIGEgZmFsbGJhY2sgdmVyc2lvbiBvZiB0aGUgbWV0aG9kIGluIGJyb3dzZXJzIChhaGVtLCBJRSksIHdoZXJlXG4gIC8vIHRoZXJlIGlzbid0IGFueSBpbnNwZWN0YWJsZSBcIkFyZ3VtZW50c1wiIHR5cGUuXG4gIGlmICghXy5pc0FyZ3VtZW50cyhhcmd1bWVudHMpKSB7XG4gICAgXy5pc0FyZ3VtZW50cyA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuICEhKG9iaiAmJiBfLmhhcyhvYmosICdjYWxsZWUnKSk7XG4gICAgfTtcbiAgfVxuXG4gIC8vIE9wdGltaXplIGBpc0Z1bmN0aW9uYCBpZiBhcHByb3ByaWF0ZS5cbiAgaWYgKHR5cGVvZiAoLy4vKSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIF8uaXNGdW5jdGlvbiA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIHR5cGVvZiBvYmogPT09ICdmdW5jdGlvbic7XG4gICAgfTtcbiAgfVxuXG4gIC8vIElzIGEgZ2l2ZW4gb2JqZWN0IGEgZmluaXRlIG51bWJlcj9cbiAgXy5pc0Zpbml0ZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBpc0Zpbml0ZShvYmopICYmICFpc05hTihwYXJzZUZsb2F0KG9iaikpO1xuICB9O1xuXG4gIC8vIElzIHRoZSBnaXZlbiB2YWx1ZSBgTmFOYD8gKE5hTiBpcyB0aGUgb25seSBudW1iZXIgd2hpY2ggZG9lcyBub3QgZXF1YWwgaXRzZWxmKS5cbiAgXy5pc05hTiA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBfLmlzTnVtYmVyKG9iaikgJiYgb2JqICE9ICtvYmo7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YWx1ZSBhIGJvb2xlYW4/XG4gIF8uaXNCb29sZWFuID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIG9iaiA9PT0gdHJ1ZSB8fCBvYmogPT09IGZhbHNlIHx8IHRvU3RyaW5nLmNhbGwob2JqKSA9PSAnW29iamVjdCBCb29sZWFuXSc7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YWx1ZSBlcXVhbCB0byBudWxsP1xuICBfLmlzTnVsbCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBvYmogPT09IG51bGw7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YXJpYWJsZSB1bmRlZmluZWQ/XG4gIF8uaXNVbmRlZmluZWQgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSB2b2lkIDA7XG4gIH07XG5cbiAgLy8gU2hvcnRjdXQgZnVuY3Rpb24gZm9yIGNoZWNraW5nIGlmIGFuIG9iamVjdCBoYXMgYSBnaXZlbiBwcm9wZXJ0eSBkaXJlY3RseVxuICAvLyBvbiBpdHNlbGYgKGluIG90aGVyIHdvcmRzLCBub3Qgb24gYSBwcm90b3R5cGUpLlxuICBfLmhhcyA9IGZ1bmN0aW9uKG9iaiwga2V5KSB7XG4gICAgcmV0dXJuIGhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpO1xuICB9O1xuXG4gIC8vIFV0aWxpdHkgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gUnVuIFVuZGVyc2NvcmUuanMgaW4gKm5vQ29uZmxpY3QqIG1vZGUsIHJldHVybmluZyB0aGUgYF9gIHZhcmlhYmxlIHRvIGl0c1xuICAvLyBwcmV2aW91cyBvd25lci4gUmV0dXJucyBhIHJlZmVyZW5jZSB0byB0aGUgVW5kZXJzY29yZSBvYmplY3QuXG4gIF8ubm9Db25mbGljdCA9IGZ1bmN0aW9uKCkge1xuICAgIHJvb3QuXyA9IHByZXZpb3VzVW5kZXJzY29yZTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvLyBLZWVwIHRoZSBpZGVudGl0eSBmdW5jdGlvbiBhcm91bmQgZm9yIGRlZmF1bHQgaXRlcmF0b3JzLlxuICBfLmlkZW50aXR5ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH07XG5cbiAgXy5jb25zdGFudCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9O1xuICB9O1xuXG4gIF8ucHJvcGVydHkgPSBmdW5jdGlvbihrZXkpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gb2JqW2tleV07XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgcHJlZGljYXRlIGZvciBjaGVja2luZyB3aGV0aGVyIGFuIG9iamVjdCBoYXMgYSBnaXZlbiBzZXQgb2YgYGtleTp2YWx1ZWAgcGFpcnMuXG4gIF8ubWF0Y2hlcyA9IGZ1bmN0aW9uKGF0dHJzKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKG9iaikge1xuICAgICAgaWYgKG9iaiA9PT0gYXR0cnMpIHJldHVybiB0cnVlOyAvL2F2b2lkIGNvbXBhcmluZyBhbiBvYmplY3QgdG8gaXRzZWxmLlxuICAgICAgZm9yICh2YXIga2V5IGluIGF0dHJzKSB7XG4gICAgICAgIGlmIChhdHRyc1trZXldICE9PSBvYmpba2V5XSlcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH07XG5cbiAgLy8gUnVuIGEgZnVuY3Rpb24gKipuKiogdGltZXMuXG4gIF8udGltZXMgPSBmdW5jdGlvbihuLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIHZhciBhY2N1bSA9IEFycmF5KE1hdGgubWF4KDAsIG4pKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG47IGkrKykgYWNjdW1baV0gPSBpdGVyYXRvci5jYWxsKGNvbnRleHQsIGkpO1xuICAgIHJldHVybiBhY2N1bTtcbiAgfTtcblxuICAvLyBSZXR1cm4gYSByYW5kb20gaW50ZWdlciBiZXR3ZWVuIG1pbiBhbmQgbWF4IChpbmNsdXNpdmUpLlxuICBfLnJhbmRvbSA9IGZ1bmN0aW9uKG1pbiwgbWF4KSB7XG4gICAgaWYgKG1heCA9PSBudWxsKSB7XG4gICAgICBtYXggPSBtaW47XG4gICAgICBtaW4gPSAwO1xuICAgIH1cbiAgICByZXR1cm4gbWluICsgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKTtcbiAgfTtcblxuICAvLyBBIChwb3NzaWJseSBmYXN0ZXIpIHdheSB0byBnZXQgdGhlIGN1cnJlbnQgdGltZXN0YW1wIGFzIGFuIGludGVnZXIuXG4gIF8ubm93ID0gRGF0ZS5ub3cgfHwgZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTsgfTtcblxuICAvLyBMaXN0IG9mIEhUTUwgZW50aXRpZXMgZm9yIGVzY2FwaW5nLlxuICB2YXIgZW50aXR5TWFwID0ge1xuICAgIGVzY2FwZToge1xuICAgICAgJyYnOiAnJmFtcDsnLFxuICAgICAgJzwnOiAnJmx0OycsXG4gICAgICAnPic6ICcmZ3Q7JyxcbiAgICAgICdcIic6ICcmcXVvdDsnLFxuICAgICAgXCInXCI6ICcmI3gyNzsnXG4gICAgfVxuICB9O1xuICBlbnRpdHlNYXAudW5lc2NhcGUgPSBfLmludmVydChlbnRpdHlNYXAuZXNjYXBlKTtcblxuICAvLyBSZWdleGVzIGNvbnRhaW5pbmcgdGhlIGtleXMgYW5kIHZhbHVlcyBsaXN0ZWQgaW1tZWRpYXRlbHkgYWJvdmUuXG4gIHZhciBlbnRpdHlSZWdleGVzID0ge1xuICAgIGVzY2FwZTogICBuZXcgUmVnRXhwKCdbJyArIF8ua2V5cyhlbnRpdHlNYXAuZXNjYXBlKS5qb2luKCcnKSArICddJywgJ2cnKSxcbiAgICB1bmVzY2FwZTogbmV3IFJlZ0V4cCgnKCcgKyBfLmtleXMoZW50aXR5TWFwLnVuZXNjYXBlKS5qb2luKCd8JykgKyAnKScsICdnJylcbiAgfTtcblxuICAvLyBGdW5jdGlvbnMgZm9yIGVzY2FwaW5nIGFuZCB1bmVzY2FwaW5nIHN0cmluZ3MgdG8vZnJvbSBIVE1MIGludGVycG9sYXRpb24uXG4gIF8uZWFjaChbJ2VzY2FwZScsICd1bmVzY2FwZSddLCBmdW5jdGlvbihtZXRob2QpIHtcbiAgICBfW21ldGhvZF0gPSBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICAgIGlmIChzdHJpbmcgPT0gbnVsbCkgcmV0dXJuICcnO1xuICAgICAgcmV0dXJuICgnJyArIHN0cmluZykucmVwbGFjZShlbnRpdHlSZWdleGVzW21ldGhvZF0sIGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgICAgIHJldHVybiBlbnRpdHlNYXBbbWV0aG9kXVttYXRjaF07XG4gICAgICB9KTtcbiAgICB9O1xuICB9KTtcblxuICAvLyBJZiB0aGUgdmFsdWUgb2YgdGhlIG5hbWVkIGBwcm9wZXJ0eWAgaXMgYSBmdW5jdGlvbiB0aGVuIGludm9rZSBpdCB3aXRoIHRoZVxuICAvLyBgb2JqZWN0YCBhcyBjb250ZXh0OyBvdGhlcndpc2UsIHJldHVybiBpdC5cbiAgXy5yZXN1bHQgPSBmdW5jdGlvbihvYmplY3QsIHByb3BlcnR5KSB7XG4gICAgaWYgKG9iamVjdCA9PSBudWxsKSByZXR1cm4gdm9pZCAwO1xuICAgIHZhciB2YWx1ZSA9IG9iamVjdFtwcm9wZXJ0eV07XG4gICAgcmV0dXJuIF8uaXNGdW5jdGlvbih2YWx1ZSkgPyB2YWx1ZS5jYWxsKG9iamVjdCkgOiB2YWx1ZTtcbiAgfTtcblxuICAvLyBBZGQgeW91ciBvd24gY3VzdG9tIGZ1bmN0aW9ucyB0byB0aGUgVW5kZXJzY29yZSBvYmplY3QuXG4gIF8ubWl4aW4gPSBmdW5jdGlvbihvYmopIHtcbiAgICBlYWNoKF8uZnVuY3Rpb25zKG9iaiksIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHZhciBmdW5jID0gX1tuYW1lXSA9IG9ialtuYW1lXTtcbiAgICAgIF8ucHJvdG90eXBlW25hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBhcmdzID0gW3RoaXMuX3dyYXBwZWRdO1xuICAgICAgICBwdXNoLmFwcGx5KGFyZ3MsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiByZXN1bHQuY2FsbCh0aGlzLCBmdW5jLmFwcGx5KF8sIGFyZ3MpKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gR2VuZXJhdGUgYSB1bmlxdWUgaW50ZWdlciBpZCAodW5pcXVlIHdpdGhpbiB0aGUgZW50aXJlIGNsaWVudCBzZXNzaW9uKS5cbiAgLy8gVXNlZnVsIGZvciB0ZW1wb3JhcnkgRE9NIGlkcy5cbiAgdmFyIGlkQ291bnRlciA9IDA7XG4gIF8udW5pcXVlSWQgPSBmdW5jdGlvbihwcmVmaXgpIHtcbiAgICB2YXIgaWQgPSArK2lkQ291bnRlciArICcnO1xuICAgIHJldHVybiBwcmVmaXggPyBwcmVmaXggKyBpZCA6IGlkO1xuICB9O1xuXG4gIC8vIEJ5IGRlZmF1bHQsIFVuZGVyc2NvcmUgdXNlcyBFUkItc3R5bGUgdGVtcGxhdGUgZGVsaW1pdGVycywgY2hhbmdlIHRoZVxuICAvLyBmb2xsb3dpbmcgdGVtcGxhdGUgc2V0dGluZ3MgdG8gdXNlIGFsdGVybmF0aXZlIGRlbGltaXRlcnMuXG4gIF8udGVtcGxhdGVTZXR0aW5ncyA9IHtcbiAgICBldmFsdWF0ZSAgICA6IC88JShbXFxzXFxTXSs/KSU+L2csXG4gICAgaW50ZXJwb2xhdGUgOiAvPCU9KFtcXHNcXFNdKz8pJT4vZyxcbiAgICBlc2NhcGUgICAgICA6IC88JS0oW1xcc1xcU10rPyklPi9nXG4gIH07XG5cbiAgLy8gV2hlbiBjdXN0b21pemluZyBgdGVtcGxhdGVTZXR0aW5nc2AsIGlmIHlvdSBkb24ndCB3YW50IHRvIGRlZmluZSBhblxuICAvLyBpbnRlcnBvbGF0aW9uLCBldmFsdWF0aW9uIG9yIGVzY2FwaW5nIHJlZ2V4LCB3ZSBuZWVkIG9uZSB0aGF0IGlzXG4gIC8vIGd1YXJhbnRlZWQgbm90IHRvIG1hdGNoLlxuICB2YXIgbm9NYXRjaCA9IC8oLileLztcblxuICAvLyBDZXJ0YWluIGNoYXJhY3RlcnMgbmVlZCB0byBiZSBlc2NhcGVkIHNvIHRoYXQgdGhleSBjYW4gYmUgcHV0IGludG8gYVxuICAvLyBzdHJpbmcgbGl0ZXJhbC5cbiAgdmFyIGVzY2FwZXMgPSB7XG4gICAgXCInXCI6ICAgICAgXCInXCIsXG4gICAgJ1xcXFwnOiAgICAgJ1xcXFwnLFxuICAgICdcXHInOiAgICAgJ3InLFxuICAgICdcXG4nOiAgICAgJ24nLFxuICAgICdcXHQnOiAgICAgJ3QnLFxuICAgICdcXHUyMDI4JzogJ3UyMDI4JyxcbiAgICAnXFx1MjAyOSc6ICd1MjAyOSdcbiAgfTtcblxuICB2YXIgZXNjYXBlciA9IC9cXFxcfCd8XFxyfFxcbnxcXHR8XFx1MjAyOHxcXHUyMDI5L2c7XG5cbiAgLy8gSmF2YVNjcmlwdCBtaWNyby10ZW1wbGF0aW5nLCBzaW1pbGFyIHRvIEpvaG4gUmVzaWcncyBpbXBsZW1lbnRhdGlvbi5cbiAgLy8gVW5kZXJzY29yZSB0ZW1wbGF0aW5nIGhhbmRsZXMgYXJiaXRyYXJ5IGRlbGltaXRlcnMsIHByZXNlcnZlcyB3aGl0ZXNwYWNlLFxuICAvLyBhbmQgY29ycmVjdGx5IGVzY2FwZXMgcXVvdGVzIHdpdGhpbiBpbnRlcnBvbGF0ZWQgY29kZS5cbiAgXy50ZW1wbGF0ZSA9IGZ1bmN0aW9uKHRleHQsIGRhdGEsIHNldHRpbmdzKSB7XG4gICAgdmFyIHJlbmRlcjtcbiAgICBzZXR0aW5ncyA9IF8uZGVmYXVsdHMoe30sIHNldHRpbmdzLCBfLnRlbXBsYXRlU2V0dGluZ3MpO1xuXG4gICAgLy8gQ29tYmluZSBkZWxpbWl0ZXJzIGludG8gb25lIHJlZ3VsYXIgZXhwcmVzc2lvbiB2aWEgYWx0ZXJuYXRpb24uXG4gICAgdmFyIG1hdGNoZXIgPSBuZXcgUmVnRXhwKFtcbiAgICAgIChzZXR0aW5ncy5lc2NhcGUgfHwgbm9NYXRjaCkuc291cmNlLFxuICAgICAgKHNldHRpbmdzLmludGVycG9sYXRlIHx8IG5vTWF0Y2gpLnNvdXJjZSxcbiAgICAgIChzZXR0aW5ncy5ldmFsdWF0ZSB8fCBub01hdGNoKS5zb3VyY2VcbiAgICBdLmpvaW4oJ3wnKSArICd8JCcsICdnJyk7XG5cbiAgICAvLyBDb21waWxlIHRoZSB0ZW1wbGF0ZSBzb3VyY2UsIGVzY2FwaW5nIHN0cmluZyBsaXRlcmFscyBhcHByb3ByaWF0ZWx5LlxuICAgIHZhciBpbmRleCA9IDA7XG4gICAgdmFyIHNvdXJjZSA9IFwiX19wKz0nXCI7XG4gICAgdGV4dC5yZXBsYWNlKG1hdGNoZXIsIGZ1bmN0aW9uKG1hdGNoLCBlc2NhcGUsIGludGVycG9sYXRlLCBldmFsdWF0ZSwgb2Zmc2V0KSB7XG4gICAgICBzb3VyY2UgKz0gdGV4dC5zbGljZShpbmRleCwgb2Zmc2V0KVxuICAgICAgICAucmVwbGFjZShlc2NhcGVyLCBmdW5jdGlvbihtYXRjaCkgeyByZXR1cm4gJ1xcXFwnICsgZXNjYXBlc1ttYXRjaF07IH0pO1xuXG4gICAgICBpZiAoZXNjYXBlKSB7XG4gICAgICAgIHNvdXJjZSArPSBcIicrXFxuKChfX3Q9KFwiICsgZXNjYXBlICsgXCIpKT09bnVsbD8nJzpfLmVzY2FwZShfX3QpKStcXG4nXCI7XG4gICAgICB9XG4gICAgICBpZiAoaW50ZXJwb2xhdGUpIHtcbiAgICAgICAgc291cmNlICs9IFwiJytcXG4oKF9fdD0oXCIgKyBpbnRlcnBvbGF0ZSArIFwiKSk9PW51bGw/Jyc6X190KStcXG4nXCI7XG4gICAgICB9XG4gICAgICBpZiAoZXZhbHVhdGUpIHtcbiAgICAgICAgc291cmNlICs9IFwiJztcXG5cIiArIGV2YWx1YXRlICsgXCJcXG5fX3ArPSdcIjtcbiAgICAgIH1cbiAgICAgIGluZGV4ID0gb2Zmc2V0ICsgbWF0Y2gubGVuZ3RoO1xuICAgICAgcmV0dXJuIG1hdGNoO1xuICAgIH0pO1xuICAgIHNvdXJjZSArPSBcIic7XFxuXCI7XG5cbiAgICAvLyBJZiBhIHZhcmlhYmxlIGlzIG5vdCBzcGVjaWZpZWQsIHBsYWNlIGRhdGEgdmFsdWVzIGluIGxvY2FsIHNjb3BlLlxuICAgIGlmICghc2V0dGluZ3MudmFyaWFibGUpIHNvdXJjZSA9ICd3aXRoKG9ianx8e30pe1xcbicgKyBzb3VyY2UgKyAnfVxcbic7XG5cbiAgICBzb3VyY2UgPSBcInZhciBfX3QsX19wPScnLF9faj1BcnJheS5wcm90b3R5cGUuam9pbixcIiArXG4gICAgICBcInByaW50PWZ1bmN0aW9uKCl7X19wKz1fX2ouY2FsbChhcmd1bWVudHMsJycpO307XFxuXCIgK1xuICAgICAgc291cmNlICsgXCJyZXR1cm4gX19wO1xcblwiO1xuXG4gICAgdHJ5IHtcbiAgICAgIHJlbmRlciA9IG5ldyBGdW5jdGlvbihzZXR0aW5ncy52YXJpYWJsZSB8fCAnb2JqJywgJ18nLCBzb3VyY2UpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGUuc291cmNlID0gc291cmNlO1xuICAgICAgdGhyb3cgZTtcbiAgICB9XG5cbiAgICBpZiAoZGF0YSkgcmV0dXJuIHJlbmRlcihkYXRhLCBfKTtcbiAgICB2YXIgdGVtcGxhdGUgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgICByZXR1cm4gcmVuZGVyLmNhbGwodGhpcywgZGF0YSwgXyk7XG4gICAgfTtcblxuICAgIC8vIFByb3ZpZGUgdGhlIGNvbXBpbGVkIGZ1bmN0aW9uIHNvdXJjZSBhcyBhIGNvbnZlbmllbmNlIGZvciBwcmVjb21waWxhdGlvbi5cbiAgICB0ZW1wbGF0ZS5zb3VyY2UgPSAnZnVuY3Rpb24oJyArIChzZXR0aW5ncy52YXJpYWJsZSB8fCAnb2JqJykgKyAnKXtcXG4nICsgc291cmNlICsgJ30nO1xuXG4gICAgcmV0dXJuIHRlbXBsYXRlO1xuICB9O1xuXG4gIC8vIEFkZCBhIFwiY2hhaW5cIiBmdW5jdGlvbiwgd2hpY2ggd2lsbCBkZWxlZ2F0ZSB0byB0aGUgd3JhcHBlci5cbiAgXy5jaGFpbiA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBfKG9iaikuY2hhaW4oKTtcbiAgfTtcblxuICAvLyBPT1BcbiAgLy8gLS0tLS0tLS0tLS0tLS0tXG4gIC8vIElmIFVuZGVyc2NvcmUgaXMgY2FsbGVkIGFzIGEgZnVuY3Rpb24sIGl0IHJldHVybnMgYSB3cmFwcGVkIG9iamVjdCB0aGF0XG4gIC8vIGNhbiBiZSB1c2VkIE9PLXN0eWxlLiBUaGlzIHdyYXBwZXIgaG9sZHMgYWx0ZXJlZCB2ZXJzaW9ucyBvZiBhbGwgdGhlXG4gIC8vIHVuZGVyc2NvcmUgZnVuY3Rpb25zLiBXcmFwcGVkIG9iamVjdHMgbWF5IGJlIGNoYWluZWQuXG5cbiAgLy8gSGVscGVyIGZ1bmN0aW9uIHRvIGNvbnRpbnVlIGNoYWluaW5nIGludGVybWVkaWF0ZSByZXN1bHRzLlxuICB2YXIgcmVzdWx0ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NoYWluID8gXyhvYmopLmNoYWluKCkgOiBvYmo7XG4gIH07XG5cbiAgLy8gQWRkIGFsbCBvZiB0aGUgVW5kZXJzY29yZSBmdW5jdGlvbnMgdG8gdGhlIHdyYXBwZXIgb2JqZWN0LlxuICBfLm1peGluKF8pO1xuXG4gIC8vIEFkZCBhbGwgbXV0YXRvciBBcnJheSBmdW5jdGlvbnMgdG8gdGhlIHdyYXBwZXIuXG4gIGVhY2goWydwb3AnLCAncHVzaCcsICdyZXZlcnNlJywgJ3NoaWZ0JywgJ3NvcnQnLCAnc3BsaWNlJywgJ3Vuc2hpZnQnXSwgZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciBtZXRob2QgPSBBcnJheVByb3RvW25hbWVdO1xuICAgIF8ucHJvdG90eXBlW25hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgb2JqID0gdGhpcy5fd3JhcHBlZDtcbiAgICAgIG1ldGhvZC5hcHBseShvYmosIGFyZ3VtZW50cyk7XG4gICAgICBpZiAoKG5hbWUgPT0gJ3NoaWZ0JyB8fCBuYW1lID09ICdzcGxpY2UnKSAmJiBvYmoubGVuZ3RoID09PSAwKSBkZWxldGUgb2JqWzBdO1xuICAgICAgcmV0dXJuIHJlc3VsdC5jYWxsKHRoaXMsIG9iaik7XG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gQWRkIGFsbCBhY2Nlc3NvciBBcnJheSBmdW5jdGlvbnMgdG8gdGhlIHdyYXBwZXIuXG4gIGVhY2goWydjb25jYXQnLCAnam9pbicsICdzbGljZSddLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIG1ldGhvZCA9IEFycmF5UHJvdG9bbmFtZV07XG4gICAgXy5wcm90b3R5cGVbbmFtZV0gPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiByZXN1bHQuY2FsbCh0aGlzLCBtZXRob2QuYXBwbHkodGhpcy5fd3JhcHBlZCwgYXJndW1lbnRzKSk7XG4gICAgfTtcbiAgfSk7XG5cbiAgXy5leHRlbmQoXy5wcm90b3R5cGUsIHtcblxuICAgIC8vIFN0YXJ0IGNoYWluaW5nIGEgd3JhcHBlZCBVbmRlcnNjb3JlIG9iamVjdC5cbiAgICBjaGFpbjogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLl9jaGFpbiA9IHRydWU7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgLy8gRXh0cmFjdHMgdGhlIHJlc3VsdCBmcm9tIGEgd3JhcHBlZCBhbmQgY2hhaW5lZCBvYmplY3QuXG4gICAgdmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3dyYXBwZWQ7XG4gICAgfVxuXG4gIH0pO1xuXG4gIC8vIEFNRCByZWdpc3RyYXRpb24gaGFwcGVucyBhdCB0aGUgZW5kIGZvciBjb21wYXRpYmlsaXR5IHdpdGggQU1EIGxvYWRlcnNcbiAgLy8gdGhhdCBtYXkgbm90IGVuZm9yY2UgbmV4dC10dXJuIHNlbWFudGljcyBvbiBtb2R1bGVzLiBFdmVuIHRob3VnaCBnZW5lcmFsXG4gIC8vIHByYWN0aWNlIGZvciBBTUQgcmVnaXN0cmF0aW9uIGlzIHRvIGJlIGFub255bW91cywgdW5kZXJzY29yZSByZWdpc3RlcnNcbiAgLy8gYXMgYSBuYW1lZCBtb2R1bGUgYmVjYXVzZSwgbGlrZSBqUXVlcnksIGl0IGlzIGEgYmFzZSBsaWJyYXJ5IHRoYXQgaXNcbiAgLy8gcG9wdWxhciBlbm91Z2ggdG8gYmUgYnVuZGxlZCBpbiBhIHRoaXJkIHBhcnR5IGxpYiwgYnV0IG5vdCBiZSBwYXJ0IG9mXG4gIC8vIGFuIEFNRCBsb2FkIHJlcXVlc3QuIFRob3NlIGNhc2VzIGNvdWxkIGdlbmVyYXRlIGFuIGVycm9yIHdoZW4gYW5cbiAgLy8gYW5vbnltb3VzIGRlZmluZSgpIGlzIGNhbGxlZCBvdXRzaWRlIG9mIGEgbG9hZGVyIHJlcXVlc3QuXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICBkZWZpbmUoJ3VuZGVyc2NvcmUnLCBbXSwgZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gXztcbiAgICB9KTtcbiAgfVxufSkuY2FsbCh0aGlzKTtcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiJdfQ==
