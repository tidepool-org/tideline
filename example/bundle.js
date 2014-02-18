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
    if (!arguments.length) return height;
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
      viewEndDate = last;
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
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1ZvbHVtZXMvVGlkZXBvb2wvdGlkZWxpbmUvZXhhbXBsZS9leGFtcGxlLmpzIiwiL1ZvbHVtZXMvVGlkZXBvb2wvdGlkZWxpbmUvZXhhbXBsZS93YXRzb24uanMiLCIvVm9sdW1lcy9UaWRlcG9vbC90aWRlbGluZS9qcy9kYXRhL2Jhc2FsdXRpbC5qcyIsIi9Wb2x1bWVzL1RpZGVwb29sL3RpZGVsaW5lL2pzL2luZGV4LmpzIiwiL1ZvbHVtZXMvVGlkZXBvb2wvdGlkZWxpbmUvanMvbGliL2Jvd3MuanMiLCIvVm9sdW1lcy9UaWRlcG9vbC90aWRlbGluZS9qcy9saWIvZHVyYXRpb24uanMiLCIvVm9sdW1lcy9UaWRlcG9vbC90aWRlbGluZS9qcy9saWIvdW5kZXJzY29yZS5qcyIsIi9Wb2x1bWVzL1RpZGVwb29sL3RpZGVsaW5lL2pzL29uZS1kYXkuanMiLCIvVm9sdW1lcy9UaWRlcG9vbC90aWRlbGluZS9qcy9wbG90L2Jhc2FsLmpzIiwiL1ZvbHVtZXMvVGlkZXBvb2wvdGlkZWxpbmUvanMvcGxvdC9ib2x1cy5qcyIsIi9Wb2x1bWVzL1RpZGVwb29sL3RpZGVsaW5lL2pzL3Bsb3QvY2FyYnMuanMiLCIvVm9sdW1lcy9UaWRlcG9vbC90aWRlbGluZS9qcy9wbG90L2NiZy5qcyIsIi9Wb2x1bWVzL1RpZGVwb29sL3RpZGVsaW5lL2pzL3Bsb3QvZmlsbC5qcyIsIi9Wb2x1bWVzL1RpZGVwb29sL3RpZGVsaW5lL2pzL3Bsb3QvbWVzc2FnZS5qcyIsIi9Wb2x1bWVzL1RpZGVwb29sL3RpZGVsaW5lL2pzL3Bsb3Qvc2NhbGVzLmpzIiwiL1ZvbHVtZXMvVGlkZXBvb2wvdGlkZWxpbmUvanMvcGxvdC9zbWJnLXRpbWUuanMiLCIvVm9sdW1lcy9UaWRlcG9vbC90aWRlbGluZS9qcy9wbG90L3NtYmcuanMiLCIvVm9sdW1lcy9UaWRlcG9vbC90aWRlbGluZS9qcy9wbG90L3Rvb2x0aXAuanMiLCIvVm9sdW1lcy9UaWRlcG9vbC90aWRlbGluZS9qcy9wb29sLmpzIiwiL1ZvbHVtZXMvVGlkZXBvb2wvdGlkZWxpbmUvanMvdHdvLXdlZWsuanMiLCIvVm9sdW1lcy9UaWRlcG9vbC90aWRlbGluZS9ub2RlX21vZHVsZXMvdW5kZXJzY29yZS91bmRlcnNjb3JlLmpzIiwiL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2V2ZW50cy9ldmVudHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDemFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVhQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDblhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDblNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbmtCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyogXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqIENvcHlyaWdodCAoYykgMjAxNCwgVGlkZXBvb2wgUHJvamVjdFxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTsgeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeSBpdCB1bmRlclxuICogdGhlIHRlcm1zIG9mIHRoZSBhc3NvY2lhdGVkIExpY2Vuc2UsIHdoaWNoIGlzIGlkZW50aWNhbCB0byB0aGUgQlNEIDItQ2xhdXNlXG4gKiBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieSB0aGUgT3BlbiBTb3VyY2UgSW5pdGlhdGl2ZSBhdCBvcGVuc291cmNlLm9yZy5cbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsIGJ1dCBXSVRIT1VUXG4gKiBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTU1xuICogRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiBTZWUgdGhlIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqIFxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbTsgaWZcbiAqIG5vdCwgeW91IGNhbiBvYnRhaW4gb25lIGZyb20gVGlkZXBvb2wgUHJvamVjdCBhdCB0aWRlcG9vbC5vcmcuXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqL1xuXG52YXIgdGlkZWxpbmUgPSByZXF1aXJlKCcuLi9qcycpO1xudmFyIGxvZyA9IHdpbmRvdy5ib3dzKCdFeGFtcGxlJyk7XG5cbi8vIHRoaW5ncyBjb21tb24gdG8gb25lLWRheSBhbmQgdHdvLXdlZWsgdmlld3Ncbi8vIGNvbW1vbiBldmVudCBlbWl0dGVyXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xudmFyIGVtaXR0ZXIgPSBuZXcgRXZlbnRFbWl0dGVyO1xuZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoMTAwKTtcbmVtaXR0ZXIub24oJ25hdmlnYXRlZCcsIGZ1bmN0aW9uKG5hdlN0cmluZykge1xuICAkKCcjdGlkZWxpbmVOYXZTdHJpbmcnKS5odG1sKG5hdlN0cmluZyk7XG59KTtcblxuLy8gY29tbW9uIHBvb2wgbW9kdWxlc1xudmFyIGZpbGwgPSB0aWRlbGluZS5wbG90LmZpbGw7XG52YXIgc2NhbGVzID0gdGlkZWxpbmUucGxvdC5zY2FsZXM7XG52YXIgQmFzYWxVdGlsID0gdGlkZWxpbmUuZGF0YS5CYXNhbFV0aWw7XG5cbnZhciBlbCA9ICcjdGlkZWxpbmVDb250YWluZXInO1xudmFyIGltYWdlc0Jhc2VVcmwgPSAnLi4vaW1nJztcblxuLy8gZGVhciBvbGQgV2F0c29uXG52YXIgd2F0c29uID0gcmVxdWlyZSgnLi93YXRzb24nKTtcblxuLy8gc2V0IHVwIG9uZS1kYXkgYW5kIHR3by13ZWVrIHZpZXdcbnZhciBjcmVhdGVOZXdPbmVEYXlDaGFydCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gbmV3IG9uZURheUNoYXJ0KGVsLCB7aW1hZ2VzQmFzZVVybDogaW1hZ2VzQmFzZVVybH0pO1xufTtcbnZhciBjcmVhdGVOZXdUd29XZWVrQ2hhcnQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIG5ldyB0d29XZWVrQ2hhcnQoZWwsIHtpbWFnZXNCYXNlVXJsOiBpbWFnZXNCYXNlVXJsfSk7XG59O1xudmFyIG9uZURheSA9IGNyZWF0ZU5ld09uZURheUNoYXJ0KCk7XG52YXIgdHdvV2VlayA9IGNyZWF0ZU5ld1R3b1dlZWtDaGFydCgpO1xuXG5cbi8vIE5vdGUgdG8gTmljbzogdGhpcyAoYWxsIHRoZSBjb2RlIHdpdGhpbiBkMy5qc29uKCkgYmVsb3cpIGlzIGFsbCByb3VnaC1hbmQtcmVhZHkuLi5cbi8vIG9idmlvdXNseSBhIGxvdCBvZiBpdCBjb3VsZCBiZSByZWZhY3RvcmVkXG4vLyBidXQgaXQgc2hvdWxkIGJlIGEgZGVjZW50IGRlbW8gb2YgaG93IHRoZSBpbnRlcmFjdGlvbiBiZXR3ZWVuIG9uZS1kYXkgYW5kIHR3by13ZWVrIHZpZXdzIGNvdWxkIHdvcmtcbi8vIHRoZSBUT0RPIGlzc3VlIG5vdGVkIGFwcGVhcnMgdG8gYmUgYSB0aG9ybnkgb25lLCBzbyBJJ2QgbGlrZSB0byBhdm9pZCBpdCBmb3Igbm93IHNpbmNlIHRoZXJlJ3Mgc28gbXVjaCBlbHNlIHRvIGRvXG5cbi8vIGxvYWQgZGF0YSBhbmQgZHJhdyBjaGFydHNcbmQzLmpzb24oJ2RldmljZS1kYXRhLmpzb24nLCBmdW5jdGlvbihkYXRhKSB7XG4gIGxvZygnRGF0YSBsb2FkZWQuJyk7XG4gIC8vIG11bmdlIGJhc2FsIHNlZ21lbnRzXG4gIHZhciB2aXpSZWFkeUJhc2FscyA9IG5ldyBCYXNhbFV0aWwoZGF0YSk7XG4gIGRhdGEgPSBfLnJlamVjdChkYXRhLCBmdW5jdGlvbihkKSB7XG4gICAgcmV0dXJuIGQudHlwZSA9PT0gJ2Jhc2FsLXJhdGUtc2VnbWVudCc7XG4gIH0pO1xuICBkYXRhID0gZGF0YS5jb25jYXQodml6UmVhZHlCYXNhbHMuYWN0dWFsLmNvbmNhdCh2aXpSZWFkeUJhc2Fscy51bmRlbGl2ZXJlZCkpO1xuICAvLyBXYXRzb24gdGhlIGRhdGFcbiAgZGF0YSA9IHdhdHNvbi5ub3JtYWxpemUoZGF0YSk7XG4gIC8vIGVuc3VyZSB0aGUgZGF0YSBpcyBwcm9wZXJseSBzb3J0ZWRcbiAgZGF0YSA9IF8uc29ydEJ5KGRhdGEsIGZ1bmN0aW9uKGQpIHtcbiAgICByZXR1cm4gbmV3IERhdGUoZC5ub3JtYWxUaW1lKS52YWx1ZU9mKCk7XG4gIH0pO1xuXG4gIGxvZygnSW5pdGlhbCBvbmUtZGF5IHZpZXcuJyk7XG4gIG9uZURheS5pbml0aWFsaXplKGRhdGEpLmxvY2F0ZSgnMjAxNC0wMy0wNlQxMjowMDowMFonKTtcbiAgLy8gYXR0YWNoIGNsaWNrIGhhbmRsZXJzIHRvIHNldCB1cCBwcm9ncmFtbWF0aWMgcGFuXG4gICQoJyN0aWRlbGluZU5hdkZvcndhcmQnKS5vbignY2xpY2snLCBvbmVEYXkucGFuRm9yd2FyZCk7XG4gICQoJyN0aWRlbGluZU5hdkJhY2snKS5vbignY2xpY2snLCBvbmVEYXkucGFuQmFjayk7XG5cbiAgJCgnI3R3b1dlZWtWaWV3Jykub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgbG9nKCdOYXZpZ2F0ZWQgdG8gdHdvLXdlZWsgdmlldyBmcm9tIG5hdiBiYXIuJyk7XG4gICAgdmFyIGRhdGUgPSBvbmVEYXkuZ2V0Q3VycmVudERheSgpO1xuICAgIC8vIHJlbW92ZSBjbGljayBoYW5kbGVycyBmb3IgcHJvZ3JhbW1hdGljIHBhblxuICAgICQoJyN0aWRlbGluZU5hdkZvcndhcmQnKS5vZmYoJ2NsaWNrJyk7XG4gICAgJCgnI3RpZGVsaW5lTmF2QmFjaycpLm9mZignY2xpY2snKTtcbiAgICBvbmVEYXkuc3RvcExpc3RlbmluZygpLmRlc3Ryb3koKTtcbiAgICAkKHRoaXMpLnBhcmVudCgpLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAkKCcjb25lRGF5VmlldycpLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAkKCcub25lLWRheScpLmNzcygndmlzaWJpbGl0eScsICdoaWRkZW4nKTtcbiAgICAkKCcudHdvLXdlZWsnKS5jc3MoJ3Zpc2liaWxpdHknLCAndmlzaWJsZScpO1xuICAgIC8vIFRPRE86IHRoaXMgc2hvdWxkbid0IGJlIG5lY2Vzc2FyeSwgYnV0IEkndmUgc2NyZXdlZCBzb21ldGhpbmcgdXAgd2l0aCB0aGUgZ2xvYmFsIHR3by13ZWVrLmpzIHZhcmlhYmxlc1xuICAgIC8vIHN1Y2ggdGhhdCBpdHMgbmVjZXNzYXJ5IHRvIGNyZWF0ZSBhIG5ldyB0d29XZWVrIG9iamVjdCBldmVyeSB0aW1lIHlvdSB3YW50IHRvIHJlcmVuZGVyXG4gICAgdHdvV2VlayA9IGNyZWF0ZU5ld1R3b1dlZWtDaGFydCgpO1xuICAgIC8vIHRha2VzIHVzZXIgdG8gdHdvLXdlZWsgdmlldyB3aXRoIGRheSB1c2VyIHdhcyB2aWV3aW5nIGluIG9uZS1kYXkgdmlldyBhdCB0aGUgZW5kIG9mIHRoZSB0d28td2VlayB2aWV3IHdpbmRvd1xuICAgIHR3b1dlZWsuaW5pdGlhbGl6ZShkYXRhLCBkYXRlKTtcbiAgfSk7XG5cbiAgJCgnI29uZURheVZpZXcnKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICBsb2coJ05hdmlnYXRlZCB0byBvbmUtZGF5IHZpZXcgZnJvbSBuYXYgYmFyLicpO1xuICAgIHR3b1dlZWsuZGVzdHJveSgpO1xuICAgICQodGhpcykucGFyZW50KCkuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICQoJyN0d29XZWVrVmlldycpLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAkKCcjb25lRGF5TW9zdFJlY2VudCcpLnBhcmVudCgpLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAkKCcub25lLWRheScpLmNzcygndmlzaWJpbGl0eScsICd2aXNpYmxlJyk7XG4gICAgJCgnLnR3by13ZWVrJykuY3NzKCd2aXNpYmlsaXR5JywgJ2hpZGRlbicpO1xuICAgIC8vIFRPRE86IHRoaXMgc2hvdWxkbid0IGJlIG5lY2Vzc2FyeSwgYnV0IEkndmUgc2NyZXdlZCBzb21ldGhpbmcgdXAgd2l0aCB0aGUgZ2xvYmFsIG9uZS1kYXkuanMgdmFyaWFibGVzXG4gICAgLy8gc3VjaCB0aGF0IGl0cyBuZWNlc3NhcnkgdG8gY3JlYXRlIGEgbmV3IG9uZURheSBvYmplY3QgZXZlcnkgdGltZSB5b3Ugd2FudCB0byByZXJlbmRlclxuICAgIG9uZURheSA9IGNyZWF0ZU5ld09uZURheUNoYXJ0KCk7XG4gICAgLy8gdGFrZXMgdXNlciB0byBvbmUtZGF5IHZpZXcgb2YgbW9zdCByZWNlbnQgZGF0YVxuICAgIG9uZURheS5pbml0aWFsaXplKGRhdGEpLmxvY2F0ZSgpO1xuICAgIC8vIGF0dGFjaCBjbGljayBoYW5kbGVycyB0byBzZXQgdXAgcHJvZ3JhbW1hdGljIHBhblxuICAgICQoJyN0aWRlbGluZU5hdkZvcndhcmQnKS5vbignY2xpY2snLCBvbmVEYXkucGFuRm9yd2FyZCk7XG4gICAgJCgnI3RpZGVsaW5lTmF2QmFjaycpLm9uKCdjbGljaycsIG9uZURheS5wYW5CYWNrKTtcbiAgfSk7XG5cbiAgJCgnI29uZURheU1vc3RSZWNlbnQnKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICBsb2coJ05hdmlnYXRlZCB0byBtb3N0IHJlY2VudCBvbmUtZGF5IHZpZXcuJyk7XG4gICAgdHdvV2Vlay5kZXN0cm95KCk7XG4gICAgb25lRGF5LnN0b3BMaXN0ZW5pbmcoKTtcbiAgICAkKHRoaXMpLnBhcmVudCgpLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAkKCcjdHdvV2Vla1ZpZXcnKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgJCgnI29uZURheU1vc3RSZWNlbnQnKS5wYXJlbnQoKS5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgJCgnLm9uZS1kYXknKS5jc3MoJ3Zpc2liaWxpdHknLCAndmlzaWJsZScpO1xuICAgICQoJy50d28td2VlaycpLmNzcygndmlzaWJpbGl0eScsICdoaWRkZW4nKTtcbiAgICAvLyBUT0RPOiB0aGlzIHNob3VsZG4ndCBiZSBuZWNlc3NhcnksIGJ1dCBJJ3ZlIHNjcmV3ZWQgc29tZXRoaW5nIHVwIHdpdGggdGhlIGdsb2JhbCBvbmUtZGF5LmpzIHZhcmlhYmxlc1xuICAgIC8vIHN1Y2ggdGhhdCBpdHMgbmVjZXNzYXJ5IHRvIGNyZWF0ZSBhIG5ldyBvbmVEYXkgb2JqZWN0IGV2ZXJ5IHRpbWUgeW91IHdhbnQgdG8gcmVyZW5kZXJcbiAgICBvbmVEYXkgPSBjcmVhdGVOZXdPbmVEYXlDaGFydCgpO1xuICAgIC8vIHRha2VzIHVzZXIgdG8gb25lLWRheSB2aWV3IG9mIG1vc3QgcmVjZW50IGRhdGFcbiAgICBvbmVEYXkuaW5pdGlhbGl6ZShkYXRhKS5sb2NhdGUoKTtcbiAgICAvLyBhdHRhY2ggY2xpY2sgaGFuZGxlcnMgdG8gc2V0IHVwIHByb2dyYW1tYXRpYyBwYW5cbiAgICAkKCcjdGlkZWxpbmVOYXZGb3J3YXJkJykub24oJ2NsaWNrJywgb25lRGF5LnBhbkZvcndhcmQpO1xuICAgICQoJyN0aWRlbGluZU5hdkJhY2snKS5vbignY2xpY2snLCBvbmVEYXkucGFuQmFjayk7XG4gIH0pO1xuXG4gIGVtaXR0ZXIub24oJ3NlbGVjdFNNQkcnLCBmdW5jdGlvbihkYXRlKSB7XG4gICAgbG9nKCdOYXZpZ2F0ZWQgdG8gb25lLWRheSB2aWV3IGZyb20gZG91YmxlIGNsaWNraW5nIGEgdHdvLXdlZWsgdmlldyBTTUJHLicpO1xuICAgIHR3b1dlZWsuZGVzdHJveSgpO1xuICAgICQoJyNvbmVEYXlWaWV3JykucGFyZW50KCkuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICQoJyN0d29XZWVrVmlldycpLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAkKCcjb25lRGF5TW9zdFJlY2VudCcpLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAkKCcub25lLWRheScpLmNzcygndmlzaWJpbGl0eScsICd2aXNpYmxlJyk7XG4gICAgJCgnLnR3by13ZWVrJykuY3NzKCd2aXNpYmlsaXR5JywgJ2hpZGRlbicpO1xuICAgIC8vIFRPRE86IHRoaXMgc2hvdWxkbid0IGJlIG5lY2Vzc2FyeSwgYnV0IEkndmUgc2NyZXdlZCBzb21ldGhpbmcgdXAgd2l0aCB0aGUgZ2xvYmFsIG9uZS1kYXkuanMgdmFyaWFibGVzXG4gICAgLy8gc3VjaCB0aGF0IGl0cyBuZWNlc3NhcnkgdG8gY3JlYXRlIGEgbmV3IG9uZURheSBvYmplY3QgZXZlcnkgdGltZSB5b3Ugd2FudCB0byByZXJlbmRlclxuICAgIG9uZURheSA9IGNyZWF0ZU5ld09uZURheUNoYXJ0KCk7XG4gICAgLy8gdGFrZXMgdXNlciB0byBvbmUtZGF5IHZpZXcgb2YgZGF0ZSBnaXZlbiBieSB0aGUgLmQzLXNtYmctdGltZSBlbWl0dGVyXG4gICAgb25lRGF5LmluaXRpYWxpemUoZGF0YSkubG9jYXRlKGRhdGUpO1xuICAgIC8vIGF0dGFjaCBjbGljayBoYW5kbGVycyB0byBzZXQgdXAgcHJvZ3JhbW1hdGljIHBhblxuICAgICQoJyN0aWRlbGluZU5hdkZvcndhcmQnKS5vbignY2xpY2snLCBvbmVEYXkucGFuRm9yd2FyZCk7XG4gICAgJCgnI3RpZGVsaW5lTmF2QmFjaycpLm9uKCdjbGljaycsIG9uZURheS5wYW5CYWNrKTtcbiAgfSk7XG5cbiAgJCgnI3Nob3dIaWRlTnVtYmVycycpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgIGlmICgkKHRoaXMpLnBhcmVudCgpLmhhc0NsYXNzKCdhY3RpdmUnKSkge1xuICAgICAgZW1pdHRlci5lbWl0KCdudW1iZXJzJywgJ2hpZGUnKTtcbiAgICAgICQodGhpcykucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgJCh0aGlzKS5odG1sKCdTaG93IFZhbHVlcycpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGVtaXR0ZXIuZW1pdCgnbnVtYmVycycsICdzaG93Jyk7XG4gICAgICAkKHRoaXMpLnBhcmVudCgpLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAgICQodGhpcykuaHRtbCgnSGlkZSBWYWx1ZXMnKTtcbiAgICB9XG4gIH0pO1xufSk7XG5cbi8vIC8vIG9uZS1kYXkgdmlzdWFsaXphdGlvblxuLy8gLy8gPT09PT09PT09PT09PT09PT09PT09XG4vLyAvLyBjcmVhdGUgYSAnb25lRGF5JyBvYmplY3QgdGhhdCBpcyBhIHdyYXBwZXIgYXJvdW5kIHRpZGVsaW5lIGNvbXBvbmVudHNcbi8vIC8vIGZvciBibGlwJ3MgKG9uZS1kYXkpIGRhdGEgdmlzdWFsaXphdGlvblxuZnVuY3Rpb24gb25lRGF5Q2hhcnQoZWwsIG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgdmFyIGNoYXJ0ID0gdGlkZWxpbmUub25lRGF5KGVtaXR0ZXIpO1xuXG4gIHZhciBwb29sTWVzc2FnZXMsIHBvb2xCRywgcG9vbEJvbHVzLCBwb29sQmFzYWwsIHBvb2xTdGF0cztcblxuICB2YXIgY3JlYXRlID0gZnVuY3Rpb24oZWwsIG9wdGlvbnMpIHtcblxuICAgIGlmICghZWwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignU29ycnksIHlvdSBtdXN0IHByb3ZpZGUgYSBET00gZWxlbWVudCEgOignKTtcbiAgICB9XG5cbiAgICAvLyBiYXNpYyBjaGFydCBzZXQgdXBcbiAgICBjaGFydC5kZWZhdWx0cygpLndpZHRoKCQoZWwpLndpZHRoKCkpLmhlaWdodCgkKGVsKS5oZWlnaHQoKSk7XG5cbiAgICBpZiAob3B0aW9ucy5pbWFnZXNCYXNlVXJsKSB7XG4gICAgICBjaGFydC5pbWFnZXNCYXNlVXJsKG9wdGlvbnMuaW1hZ2VzQmFzZVVybCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNoYXJ0O1xuICB9O1xuXG4gIGNoYXJ0LmluaXRpYWxpemUgPSBmdW5jdGlvbihkYXRhKSB7XG5cbiAgICAvLyBpbml0aWFsaXplIGNoYXJ0IHdpdGggZGF0YVxuICAgIGNoYXJ0LmRhdGEoZGF0YSk7XG4gICAgZDMuc2VsZWN0KGVsKS5kYXR1bShbbnVsbF0pLmNhbGwoY2hhcnQpO1xuICAgIGNoYXJ0LnNldFRvb2x0aXAoKTtcblxuICAgIC8vIG1lc3NhZ2VzIHBvb2xcbiAgICBwb29sTWVzc2FnZXMgPSBjaGFydC5uZXdQb29sKCkuZGVmYXVsdHMoKVxuICAgICAgLmlkKCdwb29sTWVzc2FnZXMnKVxuICAgICAgLmxhYmVsKCcnKVxuICAgICAgLmluZGV4KGNoYXJ0LnBvb2xzKCkuaW5kZXhPZihwb29sTWVzc2FnZXMpKVxuICAgICAgLndlaWdodCgwLjUpO1xuXG4gICAgLy8gYmxvb2QgZ2x1Y29zZSBkYXRhIHBvb2xcbiAgICBwb29sQkcgPSBjaGFydC5uZXdQb29sKCkuZGVmYXVsdHMoKVxuICAgICAgLmlkKCdwb29sQkcnKVxuICAgICAgLmxhYmVsKCdCbG9vZCBHbHVjb3NlJylcbiAgICAgIC5pbmRleChjaGFydC5wb29scygpLmluZGV4T2YocG9vbEJHKSlcbiAgICAgIC53ZWlnaHQoMS41KTtcblxuICAgIC8vIGNhcmJzIGFuZCBib2x1c2VzIGRhdGEgcG9vbFxuICAgIHBvb2xCb2x1cyA9IGNoYXJ0Lm5ld1Bvb2woKS5kZWZhdWx0cygpXG4gICAgICAuaWQoJ3Bvb2xCb2x1cycpXG4gICAgICAubGFiZWwoJ0JvbHVzICYgQ2FyYm9oeWRyYXRlcycpXG4gICAgICAuaW5kZXgoY2hhcnQucG9vbHMoKS5pbmRleE9mKHBvb2xCb2x1cykpXG4gICAgICAud2VpZ2h0KDEuNSk7XG4gICAgXG4gICAgLy8gYmFzYWwgZGF0YSBwb29sXG4gICAgcG9vbEJhc2FsID0gY2hhcnQubmV3UG9vbCgpLmRlZmF1bHRzKClcbiAgICAgIC5pZCgncG9vbEJhc2FsJylcbiAgICAgIC5sYWJlbCgnQmFzYWwgUmF0ZXMnKVxuICAgICAgLmluZGV4KGNoYXJ0LnBvb2xzKCkuaW5kZXhPZihwb29sQmFzYWwpKVxuICAgICAgLndlaWdodCgxLjApO1xuXG4gICAgLy8gc3RhdHMgd2lkZ2V0XG4gICAgLy8gcG9vbFN0YXRzID0gY2hhcnQubmV3UG9vbCgpLmRlZmF1bHRzKClcbiAgICAvLyAgIC5pZCgncG9vbFN0YXRzJylcbiAgICAvLyAgIC5pbmRleChjaGFydC5wb29scygpLmluZGV4T2YocG9vbFN0YXRzKSlcbiAgICAvLyAgIC53ZWlnaHQoMS4wKTtcblxuICAgIGNoYXJ0LmFycmFuZ2VQb29scygpO1xuXG4gICAgLy8gQkcgcG9vbFxuICAgIHZhciBzY2FsZUJHID0gc2NhbGVzLmJnKF8ud2hlcmUoZGF0YSwgeyd0eXBlJzogJ2NiZyd9KSwgcG9vbEJHKTtcbiAgICAvLyBzZXQgdXAgeS1heGlzXG4gICAgcG9vbEJHLnlBeGlzKGQzLnN2Zy5heGlzKClcbiAgICAgIC5zY2FsZShzY2FsZUJHKVxuICAgICAgLm9yaWVudCgnbGVmdCcpXG4gICAgICAub3V0ZXJUaWNrU2l6ZSgwKVxuICAgICAgLnRpY2tWYWx1ZXMoWzQwLCA4MCwgMTIwLCAxODAsIDMwMF0pKTtcbiAgICAvLyBhZGQgYmFja2dyb3VuZCBmaWxsIHJlY3RhbmdsZXMgdG8gQkcgcG9vbFxuICAgIHBvb2xCRy5hZGRQbG90VHlwZSgnZmlsbCcsIGZpbGwocG9vbEJHLCB7ZW5kcG9pbnRzOiBjaGFydC5lbmRwb2ludHN9KSwgZmFsc2UpO1xuXG4gICAgLy8gYWRkIENCRyBkYXRhIHRvIEJHIHBvb2xcbiAgICBwb29sQkcuYWRkUGxvdFR5cGUoJ2NiZycsIHRpZGVsaW5lLnBsb3QuY2JnKHBvb2xCRywge3lTY2FsZTogc2NhbGVCR30pLCB0cnVlKTtcblxuICAgIC8vIGFkZCBTTUJHIGRhdGEgdG8gQkcgcG9vbFxuICAgIHBvb2xCRy5hZGRQbG90VHlwZSgnc21iZycsIHRpZGVsaW5lLnBsb3Quc21iZyhwb29sQkcsIHt5U2NhbGU6IHNjYWxlQkd9KSwgdHJ1ZSk7XG5cbiAgICAvLyBib2x1cyAmIGNhcmJzIHBvb2xcbiAgICB2YXIgc2NhbGVCb2x1cyA9IHNjYWxlcy5ib2x1cyhfLndoZXJlKGRhdGEsIHsndHlwZSc6ICdib2x1cyd9KSwgcG9vbEJvbHVzKTtcbiAgICB2YXIgc2NhbGVDYXJicyA9IHNjYWxlcy5jYXJicyhfLndoZXJlKGRhdGEsIHsndHlwZSc6ICdjYXJicyd9KSwgcG9vbEJvbHVzKTtcbiAgICAvLyBzZXQgdXAgeS1heGlzIGZvciBib2x1c1xuICAgIHBvb2xCb2x1cy55QXhpcyhkMy5zdmcuYXhpcygpXG4gICAgICAuc2NhbGUoc2NhbGVCb2x1cylcbiAgICAgIC5vcmllbnQoJ2xlZnQnKVxuICAgICAgLm91dGVyVGlja1NpemUoMClcbiAgICAgIC50aWNrcygzKSk7XG4gICAgLy8gc2V0IHVwIHktYXhpcyBmb3IgY2FyYnNcbiAgICBwb29sQm9sdXMueUF4aXMoZDMuc3ZnLmF4aXMoKVxuICAgICAgLnNjYWxlKHNjYWxlQ2FyYnMpXG4gICAgICAub3JpZW50KCdsZWZ0JylcbiAgICAgIC5vdXRlclRpY2tTaXplKDApXG4gICAgICAudGlja3MoMykpO1xuICAgIC8vIGFkZCBiYWNrZ3JvdW5kIGZpbGwgcmVjdGFuZ2xlcyB0byBib2x1cyBwb29sXG4gICAgcG9vbEJvbHVzLmFkZFBsb3RUeXBlKCdmaWxsJywgZmlsbChwb29sQm9sdXMsIHtlbmRwb2ludHM6IGNoYXJ0LmVuZHBvaW50c30pLCBmYWxzZSk7XG5cbiAgICAvLyBhZGQgY2FyYnMgZGF0YSB0byBib2x1cyBwb29sXG4gICAgcG9vbEJvbHVzLmFkZFBsb3RUeXBlKCdjYXJicycsIHRpZGVsaW5lLnBsb3QuY2FyYnMocG9vbEJvbHVzLCB7XG4gICAgICB5U2NhbGU6IHNjYWxlQ2FyYnMsXG4gICAgICBlbWl0dGVyOiBlbWl0dGVyLFxuICAgICAgZGF0YTogXy53aGVyZShkYXRhLCB7J3R5cGUnOiAnY2FyYnMnfSlcbiAgICB9KSwgdHJ1ZSk7XG5cbiAgICAvLyBhZGQgYm9sdXMgZGF0YSB0byBib2x1cyBwb29sXG4gICAgcG9vbEJvbHVzLmFkZFBsb3RUeXBlKCdib2x1cycsIHRpZGVsaW5lLnBsb3QuYm9sdXMocG9vbEJvbHVzLCB7XG4gICAgICB5U2NhbGU6IHNjYWxlQm9sdXMsXG4gICAgICBlbWl0dGVyOiBlbWl0dGVyLFxuICAgICAgZGF0YTogXy53aGVyZShkYXRhLCB7J3R5cGUnOiAnYm9sdXMnfSlcbiAgICB9KSwgdHJ1ZSk7XG5cbiAgICAvLyBiYXNhbCBwb29sXG4gICAgdmFyIHNjYWxlQmFzYWwgPSBzY2FsZXMuYmFzYWwoXy53aGVyZShkYXRhLCB7J3R5cGUnOiAnYmFzYWwtcmF0ZS1zZWdtZW50J30pLCBwb29sQmFzYWwpO1xuICAgIC8vIHNldCB1cCB5LWF4aXNcbiAgICBwb29sQmFzYWwueUF4aXMoZDMuc3ZnLmF4aXMoKVxuICAgICAgLnNjYWxlKHNjYWxlQmFzYWwpXG4gICAgICAub3JpZW50KCdsZWZ0JylcbiAgICAgIC5vdXRlclRpY2tTaXplKDApXG4gICAgICAudGlja3MoNCkpO1xuICAgIC8vIGFkZCBiYWNrZ3JvdW5kIGZpbGwgcmVjdGFuZ2xlcyB0byBiYXNhbCBwb29sXG4gICAgcG9vbEJhc2FsLmFkZFBsb3RUeXBlKCdmaWxsJywgZmlsbChwb29sQmFzYWwsIHtlbmRwb2ludHM6IGNoYXJ0LmVuZHBvaW50c30pLCBmYWxzZSk7XG5cbiAgICAvLyBhZGQgYmFzYWwgZGF0YSB0byBiYXNhbCBwb29sXG4gICAgcG9vbEJhc2FsLmFkZFBsb3RUeXBlKCdiYXNhbC1yYXRlLXNlZ21lbnQnLCB0aWRlbGluZS5wbG90LmJhc2FsKHBvb2xCYXNhbCwge3lTY2FsZTogc2NhbGVCYXNhbCwgZGF0YTogXy53aGVyZShkYXRhLCB7J3R5cGUnOiAnYmFzYWwtcmF0ZS1zZWdtZW50J30pIH0pLCB0cnVlKTtcblxuICAgIC8vIG1lc3NhZ2VzIHBvb2xcbiAgICAvLyBhZGQgYmFja2dyb3VuZCBmaWxsIHJlY3RhbmdsZXMgdG8gbWVzc2FnZXMgcG9vbFxuICAgIHBvb2xNZXNzYWdlcy5hZGRQbG90VHlwZSgnZmlsbCcsIGZpbGwocG9vbE1lc3NhZ2VzLCB7ZW5kcG9pbnRzOiBjaGFydC5lbmRwb2ludHN9KSwgZmFsc2UpO1xuXG4gICAgLy8gYWRkIG1lc3NhZ2UgaW1hZ2VzIHRvIG1lc3NhZ2VzIHBvb2xcbiAgICBwb29sTWVzc2FnZXMuYWRkUGxvdFR5cGUoJ21lc3NhZ2UnLCB0aWRlbGluZS5wbG90Lm1lc3NhZ2UocG9vbE1lc3NhZ2VzLCB7c2l6ZTogMzB9KSwgdHJ1ZSk7XG5cbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgLy8gbG9jYXRlIHRoZSBjaGFydCBhcm91bmQgYSBjZXJ0YWluIGRhdGV0aW1lXG4gIC8vIGlmIGNhbGxlZCB3aXRob3V0IGFuIGFyZ3VtZW50LCBsb2NhdGVzIHRoZSBjaGFydCBhdCB0aGUgbW9zdCByZWNlbnQgMjQgaG91cnMgb2YgZGF0YVxuICBjaGFydC5sb2NhdGUgPSBmdW5jdGlvbihkYXRldGltZSkge1xuXG4gICAgdmFyIHN0YXJ0LCBlbmQsIGxvY2FsRGF0YTtcblxuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgc3RhcnQgPSBjaGFydC5pbml0aWFsRW5kcG9pbnRzWzBdO1xuICAgICAgZW5kID0gY2hhcnQuaW5pdGlhbEVuZHBvaW50c1sxXTtcbiAgICAgIGxvY2FsRGF0YSA9IGNoYXJ0LmdldERhdGEoY2hhcnQuaW5pdGlhbEVuZHBvaW50cywgJ2JvdGgnKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBzdGFydCA9IG5ldyBEYXRlKGRhdGV0aW1lKTtcbiAgICAgIGVuZCA9IG5ldyBEYXRlKHN0YXJ0KTtcbiAgICAgIHN0YXJ0LnNldFVUQ0hvdXJzKHN0YXJ0LmdldFVUQ0hvdXJzKCkgLSAxMik7XG4gICAgICBlbmQuc2V0VVRDSG91cnMoZW5kLmdldFVUQ0hvdXJzKCkgKyAxMik7XG5cbiAgICAgIGxvY2FsRGF0YSA9IGNoYXJ0LmdldERhdGEoW3N0YXJ0LCBlbmRdLCAnYm90aCcpO1xuICAgICAgY2hhcnQuYmVnaW5uaW5nT2ZEYXRhKHN0YXJ0KS5lbmRPZkRhdGEoZW5kKTtcbiAgICB9XG5cbiAgICBjaGFydC5hbGxEYXRhKGxvY2FsRGF0YSwgW3N0YXJ0LCBlbmRdKTtcblxuICAgIC8vIHNldCB1cCBjbGljay1hbmQtZHJhZyBhbmQgc2Nyb2xsIG5hdmlnYXRpb25cbiAgICBjaGFydC5zZXROYXYoKS5zZXRTY3JvbGxOYXYoKS5zZXRBdERhdGUoc3RhcnQpO1xuXG4gICAgLy8gcmVuZGVyIHBvb2xzXG4gICAgY2hhcnQucG9vbHMoKS5mb3JFYWNoKGZ1bmN0aW9uKHBvb2wpIHtcbiAgICAgIHBvb2woY2hhcnQucG9vbEdyb3VwLCBsb2NhbERhdGEpO1xuICAgIH0pO1xuXG4gICAgLy8gYWRkIHRvb2x0aXBzXG4gICAgY2hhcnQudG9vbHRpcHMuYWRkR3JvdXAoZDMuc2VsZWN0KCcjJyArIHBvb2xCRy5pZCgpKSwgJ2NiZycpO1xuICAgIGNoYXJ0LnRvb2x0aXBzLmFkZEdyb3VwKGQzLnNlbGVjdCgnIycgKyBwb29sQkcuaWQoKSksICdzbWJnJyk7XG4gICAgY2hhcnQudG9vbHRpcHMuYWRkR3JvdXAoZDMuc2VsZWN0KCcjJyArIHBvb2xCb2x1cy5pZCgpKSwgJ2NhcmJzJyk7XG4gICAgY2hhcnQudG9vbHRpcHMuYWRkR3JvdXAoZDMuc2VsZWN0KCcjJyArIHBvb2xCb2x1cy5pZCgpKSwgJ2JvbHVzJyk7XG4gICAgY2hhcnQudG9vbHRpcHMuYWRkR3JvdXAoZDMuc2VsZWN0KCcjJyArIHBvb2xCYXNhbC5pZCgpKSwgJ2Jhc2FsJyk7XG5cbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQuZ2V0Q3VycmVudERheSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBjaGFydC5kYXRlKCk7XG4gIH07XG5cbiAgcmV0dXJuIGNyZWF0ZShlbCwgb3B0aW9ucyk7XG59XG5cbi8vIC8vIHR3by13ZWVrIHZpc3VhbGl6YXRpb25cbi8vIC8vID09PT09PT09PT09PT09PT09PT09PVxuLy8gLy8gY3JlYXRlIGEgJ3R3b1dlZWsnIG9iamVjdCB0aGF0IGlzIGEgd3JhcHBlciBhcm91bmQgdGlkZWxpbmUgY29tcG9uZW50c1xuLy8gLy8gZm9yIGJsaXAncyAodHdvLXdlZWspIGRhdGEgdmlzdWFsaXphdGlvblxuZnVuY3Rpb24gdHdvV2Vla0NoYXJ0KGVsLCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIHZhciBjaGFydCA9IHRpZGVsaW5lLnR3b1dlZWsoZW1pdHRlcik7XG5cbiAgdmFyIHBvb2xzID0gW107XG5cbiAgdmFyIGNyZWF0ZSA9IGZ1bmN0aW9uKGVsLCBvcHRpb25zKSB7XG4gICAgaWYgKCFlbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdTb3JyeSwgeW91IG11c3QgcHJvdmlkZSBhIERPTSBlbGVtZW50ISA6KCcpO1xuICAgIH1cblxuICAgIC8vIGJhc2ljIGNoYXJ0IHNldCB1cFxuICAgIGNoYXJ0LmRlZmF1bHRzKCkud2lkdGgoJChlbCkud2lkdGgoKSkuaGVpZ2h0KCQoZWwpLmhlaWdodCgpKTtcblxuICAgIGlmIChvcHRpb25zLmltYWdlc0Jhc2VVcmwpIHtcbiAgICAgIGNoYXJ0LmltYWdlc0Jhc2VVcmwob3B0aW9ucy5pbWFnZXNCYXNlVXJsKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKGRhdGEsIGRhdGV0aW1lKSB7XG5cbiAgICBpZiAoIWRhdGV0aW1lKSB7XG4gICAgICBjaGFydC5kYXRhKF8ud2hlcmUoZGF0YSwgeyd0eXBlJzogJ3NtYmcnfSkpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGNoYXJ0LmRhdGEoXy53aGVyZShkYXRhLCB7J3R5cGUnOiAnc21iZyd9KSwgZGF0ZXRpbWUpO1xuICAgIH1cblxuICAgIC8vIGluaXRpYWxpemUgY2hhcnRcbiAgICBkMy5zZWxlY3QoZWwpLmRhdHVtKFtudWxsXSkuY2FsbChjaGFydCk7XG4gICAgY2hhcnQuc2V0TmF2KCkuc2V0U2Nyb2xsTmF2KCk7XG5cbiAgICBkYXlzID0gY2hhcnQuZGF5cztcbiAgICAvLyBtYWtlIHBvb2xzIGZvciBlYWNoIGRheVxuICAgIGRheXMuZm9yRWFjaChmdW5jdGlvbihkYXksIGkpIHtcbiAgICAgIHZhciBuZXdQb29sID0gY2hhcnQubmV3UG9vbCgpLmRlZmF1bHRzKClcbiAgICAgICAgLmlkKCdwb29sQkdfJyArIGRheSlcbiAgICAgICAgLmluZGV4KGNoYXJ0LnBvb2xzKCkuaW5kZXhPZihuZXdQb29sKSlcbiAgICAgICAgLndlaWdodCgxLjApO1xuICAgIH0pO1xuICAgIGNoYXJ0LmFycmFuZ2VQb29scygpO1xuXG4gICAgdmFyIGZpbGxFbmRwb2ludHMgPSBbbmV3IERhdGUoJzIwMTQtMDEtMDFUMDA6MDA6MDBaJyksIG5ldyBEYXRlKCcyMDE0LTAxLTAyVDAwOjAwOjAwWicpXTtcbiAgICB2YXIgZmlsbFNjYWxlID0gZDMudGltZS5zY2FsZS51dGMoKVxuICAgICAgLmRvbWFpbihmaWxsRW5kcG9pbnRzKVxuICAgICAgLnJhbmdlKFtjaGFydC5heGlzR3V0dGVyKCksIGNoYXJ0LndpZHRoKCkgLSBjaGFydC5uYXZHdXR0ZXIoKV0pO1xuXG4gICAgY2hhcnQucG9vbHMoKS5mb3JFYWNoKGZ1bmN0aW9uKHBvb2wsIGkpIHtcbiAgICAgIHBvb2wuYWRkUGxvdFR5cGUoJ2ZpbGwnLCBmaWxsKHBvb2wsIHtcbiAgICAgICAgZW5kcG9pbnRzOiBmaWxsRW5kcG9pbnRzLFxuICAgICAgICBzY2FsZTogZmlsbFNjYWxlLFxuICAgICAgICBndXR0ZXI6IDAuNVxuICAgICAgfSksIGZhbHNlKTtcbiAgICAgIHBvb2wuYWRkUGxvdFR5cGUoJ3NtYmcnLCB0aWRlbGluZS5wbG90LnNtYmdUaW1lKHBvb2wsIHtlbWl0dGVyOiBlbWl0dGVyfSksIHRydWUpO1xuICAgICAgcG9vbChjaGFydC5kYXlzR3JvdXAsIGNoYXJ0LmRhdGFQZXJEYXlbaV0pO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGNoYXJ0O1xuICB9O1xuXG4gIHJldHVybiBjcmVhdGUoZWwsIG9wdGlvbnMpO1xufVxuIiwiLyogXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqIENvcHlyaWdodCAoYykgMjAxNCwgVGlkZXBvb2wgUHJvamVjdFxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTsgeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeSBpdCB1bmRlclxuICogdGhlIHRlcm1zIG9mIHRoZSBhc3NvY2lhdGVkIExpY2Vuc2UsIHdoaWNoIGlzIGlkZW50aWNhbCB0byB0aGUgQlNEIDItQ2xhdXNlXG4gKiBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieSB0aGUgT3BlbiBTb3VyY2UgSW5pdGlhdGl2ZSBhdCBvcGVuc291cmNlLm9yZy5cbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsIGJ1dCBXSVRIT1VUXG4gKiBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTU1xuICogRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiBTZWUgdGhlIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqIFxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbTsgaWZcbiAqIG5vdCwgeW91IGNhbiBvYnRhaW4gb25lIGZyb20gVGlkZXBvb2wgUHJvamVjdCBhdCB0aWRlcG9vbC5vcmcuXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqL1xuXG4vL1xuLy8gJ0dvb2Qgb2xkIFdhdHNvbiEgWW91IGFyZSB0aGUgb25lIGZpeGVkIHBvaW50IGluIGEgY2hhbmdpbmcgYWdlLicgLSBTaGVybG9jayBIb2xtZXMsIFwiSGlzIExhc3QgQm93XCJcbi8vXG4vLyBUaGlzIG1pbmkgbW9kdWxlIGlzIGZvciBjb250YWluaW5nIGFueXRoaW5nIGRvbmUgdG8gVGlkZXBvb2wgZGF0YSB0byBtYWtlIGl0IHBvc3NpYmxlIHRvIHBsb3QgdGltZXpvbmUtbmFpdmVcbi8vIGRhdGEgcmVsaWFibHkgYW5kIGNvbnNpc3RlbnRseSBhY3Jvc3MgZGlmZmVyZW50IGJyb3dzZXJzIGFuZCBpbiBkaWZmZXJlbnQgdGltZXpvbmVzLiBJdCBpcyBuYW1lZCBhZnRlciB0aGVcbi8vIHF1b3RhdGlvbiBsaXN0ZWQgYWJvdmUgYXMgd2VsbCBhcyB0aGUgZmFjdCB0aGF0IFdhdHNvbiBpcyBvbmUgb2YgbGl0ZXJhdHVyZSdzIHVyLWV4YW1wbGVzIG9mIHRoZSBsb3lhbFxuLy8gYXNzaXN0YW50LlxuLy9cbi8vIFRyeSBhcyBoYXJkIGFzIHlvdSBjYW4gdG8ga2VlcCBXYXRzb24gb3V0IG9mIGxpYnJhcnkgY29kZSAtIGkuZS4sIGluIHRoaXMgcmVwb3NpdG9yeSwgV2F0c29uIHNob3VsZCBvbmx5IGJlIGFcbi8vIHJlcXVpcmVtZW50IGluIGZpbGVzIGluIHRoZSBleGFtcGxlLyBmb2xkZXIgKGFzIHRoZXNlIGFyZSBibGlwLXNwZWNpZmljKSwgbm90IGluIHRoZSBtYWluIHRpZGVsaW5lIGZpbGVzOlxuLy8gb25lLWRheS5qcywgdHdvLXdlZWsuanMsIGFuZCBwb29sLmpzLlxuLy9cblxudmFyIGxvZyA9IHdpbmRvdy5ib3dzKCdXYXRzb24nKTtcblxudmFyIHdhdHNvbiA9IHtcbiAgbm9ybWFsaXplOiBmdW5jdGlvbihhKSB7XG4gICAgbG9nKCdXYXRzb24gbm9ybWFsaXplZCB0aGUgZGF0YS4nKTtcbiAgICByZXR1cm4gXy5tYXAoYSwgZnVuY3Rpb24oaSkge1xuICAgICAgaS5ub3JtYWxUaW1lID0gaS5kZXZpY2VUaW1lICsgJ1onO1xuICAgICAgaWYgKGkudXRjVGltZSkge1xuICAgICAgICB2YXIgZCA9IG5ldyBEYXRlKGkudXRjVGltZSk7XG4gICAgICAgIHZhciBvZmZzZXRNaW51dGVzID0gZC5nZXRUaW1lem9uZU9mZnNldCgpO1xuICAgICAgICBkLnNldE1pbnV0ZXMoZC5nZXRNaW51dGVzKCkgLSBvZmZzZXRNaW51dGVzKTtcbiAgICAgICAgaS5ub3JtYWxUaW1lID0gZC50b0lTT1N0cmluZygpO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAoaS50eXBlID09PSAnYmFzYWwtcmF0ZS1zZWdtZW50Jykge1xuICAgICAgICBpLm5vcm1hbFRpbWUgPSBpLnN0YXJ0ICsgJ1onO1xuICAgICAgICBpLm5vcm1hbEVuZCA9IGkuZW5kICsgJ1onO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGk7XG4gICAgfSk7XG4gIH0sXG4gIHByaW50OiBmdW5jdGlvbihhcmcsIGQpIHtcbiAgICBjb25zb2xlLmxvZyhhcmcsIGQudG9VVENTdHJpbmcoKS5yZXBsYWNlKCcgR01UJywgJycpKTtcbiAgICByZXR1cm47XG4gIH0sXG4gIHN0cmlwOiBmdW5jdGlvbihkKSB7XG4gICAgcmV0dXJuIGQudG9VVENTdHJpbmcoKS5yZXBsYWNlKCcgR01UJywgJycpO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHdhdHNvbjsiLCJ2YXIgXyA9IHJlcXVpcmUoJy4uL2xpYi91bmRlcnNjb3JlJyk7XG52YXIgbG9nID0gcmVxdWlyZSgnLi4vbGliL2Jvd3MnKSgnQmFzYWxVdGlsJyk7XG5cbnZhciBrZXlzVG9PbWl0ID0gWydpZCcsICdzdGFydCcsICdlbmQnLCAndml6VHlwZSddO1xuXG5mdW5jdGlvbiBCYXNhbFV0aWwoZGF0YSkge1xuICB2YXIgYWN0dWFscyA9IFtdO1xuICB2YXIgdW5kZWxpdmVyZWRzID0gW107XG5cbiAgZnVuY3Rpb24gYWRkVG9BY3R1YWxzKGUpIHtcbiAgICBhY3R1YWxzLnB1c2goXy5leHRlbmQoe30sIGUsIHt2aXpUeXBlOiAnYWN0dWFsJ30pKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFkZFRvVW5kZWxpdmVyZWQoZSkge1xuICAgIHVuZGVsaXZlcmVkcy5wdXNoKF8uZXh0ZW5kKHt9LCBlLCB7dml6VHlwZTogJ3VuZGVsaXZlcmVkJ30pKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb2Nlc3NFbGVtZW50KGUpIHtcbiAgICBpZiAoZS5kZWxpdmVyeVR5cGUgPT09ICd0ZW1wJyB8fCBlLmRlbGl2ZXJ5VHlwZSA9PT0gJ3NjaGVkdWxlZCcpIHtcbiAgICAgIGlmIChhY3R1YWxzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBhZGRUb0FjdHVhbHMoZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgbGFzdEFjdHVhbCA9IGFjdHVhbHNbYWN0dWFscy5sZW5ndGggLSAxXTtcbiAgICAgICAgaWYgKGUuc3RhcnQgPT09IGxhc3RBY3R1YWwuZW5kKSB7XG4gICAgICAgICAgaWYgKF8uaXNFcXVhbChfLm9taXQoZSwga2V5c1RvT21pdCksIF8ub21pdChsYXN0QWN0dWFsLCBrZXlzVG9PbWl0KSkpIHtcbiAgICAgICAgICAgIGxhc3RBY3R1YWwuZW5kID0gZS5lbmQ7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFkZFRvQWN0dWFscyhlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoZS5zdGFydCA8IGxhc3RBY3R1YWwuZW5kKSB7XG4gICAgICAgICAgLy8gSXQgaXMgb3ZlcmxhcHBpbmcsIHNvIGxldCdzIHNlZSBob3cgd2Ugc2hvdWxkIGRlYWwgd2l0aCBpdC5cblxuICAgICAgICAgIGlmIChlLnN0YXJ0IDwgbGFzdEFjdHVhbC5zdGFydCkge1xuICAgICAgICAgICAgLy8gVGhlIGN1cnJlbnQgZWxlbWVudCBpcyBjb21wbGV0ZWx5IG5ld2VyIHRoYW4gdGhlIGxhc3QgYWN0dWFsLCBzbyB3ZSBoYXZlIHRvIHJld2luZCBhIGJpdC5cbiAgICAgICAgICAgIHZhciByZW1vdmVkQWN0dWFsID0gYWN0dWFscy5wb3AoKTtcbiAgICAgICAgICAgIHByb2Nlc3NFbGVtZW50KGUpO1xuICAgICAgICAgICAgcHJvY2Vzc0VsZW1lbnQocmVtb3ZlZEFjdHVhbCk7XG4gICAgICAgICAgfSBlbHNlIGlmIChlLmRlbGl2ZXJ5VHlwZSA9PT0gJ3RlbXAnKSB7XG4gICAgICAgICAgICAvLyBJdCdzIGEgdGVtcCwgd2hpY2ggd2lucyBubyBtYXR0ZXIgd2hhdCBpdCB3YXMgYmVmb3JlLlxuICAgICAgICAgICAgLy8gU3RhcnQgYnkgc2V0dGluZyB1cCBzaGFyZWQgYWRqdXN0bWVudHMgdG8gdGhlIHNlZ21lbnRzIChjbG9uZSBsYXN0QWN0dWFsIGFuZCByZXNoYXBlIGl0KVxuICAgICAgICAgICAgdmFyIHVuZGVsaXZlcmVkQ2xvbmUgPSBfLmNsb25lKGxhc3RBY3R1YWwpO1xuICAgICAgICAgICAgbGFzdEFjdHVhbC5lbmQgPSBlLnN0YXJ0O1xuXG4gICAgICAgICAgICBpZiAoZS5lbmQgPj0gdW5kZWxpdmVyZWRDbG9uZS5lbmQpIHtcbiAgICAgICAgICAgICAgLy8gVGhlIHRlbXAgc2VnbWVudCBpcyBsb25nZXIgdGhhbiB0aGUgY3VycmVudCwgdGhyb3cgYXdheSB0aGUgcmVzdCBvZiB0aGUgY3VycmVudFxuICAgICAgICAgICAgICB1bmRlbGl2ZXJlZENsb25lLnN0YXJ0ID0gZS5zdGFydDtcbiAgICAgICAgICAgICAgYWRkVG9VbmRlbGl2ZXJlZCh1bmRlbGl2ZXJlZENsb25lKTtcbiAgICAgICAgICAgICAgYWRkVG9BY3R1YWxzKGUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy8gVGhlIGN1cnJlbnQgZXhjZWVkcyB0aGUgdGVtcCwgc28gcmVwbGFjZSB0aGUgY3VycmVudCBcImNodW5rXCIgYW5kIHJlLWF0dGFjaCB0aGUgc2NoZWR1bGVcbiAgICAgICAgICAgICAgdmFyIGVuZGluZ1NlZ21lbnQgPSBfLmNsb25lKHVuZGVsaXZlcmVkQ2xvbmUpO1xuICAgICAgICAgICAgICB1bmRlbGl2ZXJlZENsb25lLnN0YXJ0ID0gZS5zdGFydDtcbiAgICAgICAgICAgICAgdW5kZWxpdmVyZWRDbG9uZS5lbmQgPSBlLmVuZDtcbiAgICAgICAgICAgICAgYWRkVG9VbmRlbGl2ZXJlZCh1bmRlbGl2ZXJlZENsb25lKTtcbiAgICAgICAgICAgICAgYWRkVG9BY3R1YWxzKF8uY2xvbmUoZSkpO1xuXG4gICAgICAgICAgICAgIC8vIFJlLWF0dGFjaCB0aGUgZW5kIG9mIHRoZSBzY2hlZHVsZVxuICAgICAgICAgICAgICBlbmRpbmdTZWdtZW50LnN0YXJ0ID0gZS5lbmQ7XG4gICAgICAgICAgICAgIGFkZFRvQWN0dWFscyhlbmRpbmdTZWdtZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gZS5kZWxpdmVyeVR5cGUgPT09ICdzY2hlZHVsZWQnXG4gICAgICAgICAgICBpZiAobGFzdEFjdHVhbC5kZWxpdmVyeVR5cGUgPT09ICdzY2hlZHVsZWQnKSB7XG4gICAgICAgICAgICAgIC8vIFNjaGVkdWxlZCBvdmVybGFwcGluZyBhIHNjaGVkdWxlZCwgdGhpcyBzaG91bGQgbm90IGhhcHBlbi5cbiAgICAgICAgICAgICAgbG9nKCdTY2hlZHVsZWQgb3ZlcmxhcHBlZCBhIHNjaGVkdWxlZC4gIFNob3VsZCBuZXZlciBoYXBwZW4uJywgbGFzdEFjdHVhbCwgZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvLyBTY2hlZHVsZWQgb3ZlcmxhcHBpbmcgYSB0ZW1wLCB0aGlzIGNhbiBoYXBwZW4gYW5kIHRoZSBzY2hlZHVsZSBzaG91bGQgYmUgc2tpcHBlZFxuICAgICAgICAgICAgICB2YXIgdW5kZWxpdmVyZWRDbG9uZSA9IF8uY2xvbmUoZSk7XG5cbiAgICAgICAgICAgICAgaWYgKGUuZW5kID4gbGFzdEFjdHVhbC5lbmQpIHtcbiAgICAgICAgICAgICAgICAvLyBTY2hlZHVsZWQgaXMgbG9uZ2VyIHRoYW4gdGhlIHRlbXAsIHNvIHByZXNlcnZlIHRoZSB0YWlsXG4gICAgICAgICAgICAgICAgdmFyIGRlbGl2ZXJlZENsb25lID0gXy5jbG9uZShlKTtcbiAgICAgICAgICAgICAgICB1bmRlbGl2ZXJlZENsb25lLmVuZCA9IGxhc3RBY3R1YWwuZW5kO1xuICAgICAgICAgICAgICAgIGRlbGl2ZXJlZENsb25lLnN0YXJ0ID0gbGFzdEFjdHVhbC5lbmQ7XG4gICAgICAgICAgICAgICAgYWRkVG9VbmRlbGl2ZXJlZCh1bmRlbGl2ZXJlZENsb25lKTtcbiAgICAgICAgICAgICAgICBhZGRUb0FjdHVhbHMoZGVsaXZlcmVkQ2xvbmUpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFNjaGVkdWxlZCBpcyBzaG9ydGVyIHRoYW4gdGhlIHRlbXAsIHNvIGNvbXBsZXRlbHkgc2tpcCBpdFxuICAgICAgICAgICAgICAgIGFkZFRvVW5kZWxpdmVyZWQodW5kZWxpdmVyZWRDbG9uZSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gZS5zdGFydCA+IGxhc3RBY3R1YWwuZW5kXG4gICAgICAgICAgbG9nKCdlLnN0YXJ0WycgKyBlLnN0YXJ0ICsgJ10gPiBsYXN0QWN0dWFsLmVuZFsnICsgbGFzdEFjdHVhbC5lbmQgKyAnXS4gICcgK1xuICAgICAgICAgICAgJ0JBRCEhISEgQUFBSEhISEhISC4gIFNvcnQgaW5wdXQgZGF0YSBwbHosIHRoeCwgY2hlZXpidXJnZXInKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGRhdGEuZm9yRWFjaChwcm9jZXNzRWxlbWVudCk7XG5cbiAgdGhpcy5hY3R1YWwgPSBhY3R1YWxzO1xuICB0aGlzLnVuZGVsaXZlcmVkID0gdW5kZWxpdmVyZWRzO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEJhc2FsVXRpbDsiLCIvKiBcbiAqID09IEJTRDIgTElDRU5TRSA9PVxuICogQ29weXJpZ2h0IChjKSAyMDE0LCBUaWRlcG9vbCBQcm9qZWN0XG4gKiBcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOyB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5IGl0IHVuZGVyXG4gKiB0aGUgdGVybXMgb2YgdGhlIGFzc29jaWF0ZWQgTGljZW5zZSwgd2hpY2ggaXMgaWRlbnRpY2FsIHRvIHRoZSBCU0QgMi1DbGF1c2VcbiAqIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5IHRoZSBPcGVuIFNvdXJjZSBJbml0aWF0aXZlIGF0IG9wZW5zb3VyY2Uub3JnLlxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCwgYnV0IFdJVEhPVVRcbiAqIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTXG4gKiBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuIFNlZSB0aGUgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICogXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtOyBpZlxuICogbm90LCB5b3UgY2FuIG9idGFpbiBvbmUgZnJvbSBUaWRlcG9vbCBQcm9qZWN0IGF0IHRpZGVwb29sLm9yZy5cbiAqID09IEJTRDIgTElDRU5TRSA9PVxuICovXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBwb29sOiByZXF1aXJlKCcuL3Bvb2wnKSxcbiAgb25lRGF5OiByZXF1aXJlKCcuL29uZS1kYXknKSxcbiAgdHdvV2VlazogcmVxdWlyZSgnLi90d28td2VlaycpLFxuXG4gIGRhdGE6IHtcbiAgICBCYXNhbFV0aWw6IHJlcXVpcmUoJy4vZGF0YS9iYXNhbHV0aWwnKVxuICB9LFxuXG4gIHBsb3Q6IHtcbiAgICBiYXNhbDogcmVxdWlyZSgnLi9wbG90L2Jhc2FsJyksXG4gICAgYm9sdXM6IHJlcXVpcmUoJy4vcGxvdC9ib2x1cycpLFxuICAgIGNhcmJzOiByZXF1aXJlKCcuL3Bsb3QvY2FyYnMnKSxcbiAgICBjYmc6IHJlcXVpcmUoJy4vcGxvdC9jYmcnKSxcbiAgICBmaWxsOiByZXF1aXJlKCcuL3Bsb3QvZmlsbCcpLFxuICAgIG1lc3NhZ2U6IHJlcXVpcmUoJy4vcGxvdC9tZXNzYWdlJyksXG4gICAgc2NhbGVzOiByZXF1aXJlKCcuL3Bsb3Qvc2NhbGVzJyksXG4gICAgc21iZ1RpbWU6IHJlcXVpcmUoJy4vcGxvdC9zbWJnLXRpbWUnKSxcbiAgICBzbWJnOiByZXF1aXJlKCcuL3Bsb3Qvc21iZycpLFxuICAgIHRvb2x0aXA6IHJlcXVpcmUoJy4vcGxvdC90b29sdGlwJylcbiAgfVxufTsiLCIvKiBcbiAqID09IEJTRDIgTElDRU5TRSA9PVxuICogQ29weXJpZ2h0IChjKSAyMDE0LCBUaWRlcG9vbCBQcm9qZWN0XG4gKiBcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOyB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5IGl0IHVuZGVyXG4gKiB0aGUgdGVybXMgb2YgdGhlIGFzc29jaWF0ZWQgTGljZW5zZSwgd2hpY2ggaXMgaWRlbnRpY2FsIHRvIHRoZSBCU0QgMi1DbGF1c2VcbiAqIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5IHRoZSBPcGVuIFNvdXJjZSBJbml0aWF0aXZlIGF0IG9wZW5zb3VyY2Uub3JnLlxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCwgYnV0IFdJVEhPVVRcbiAqIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTXG4gKiBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuIFNlZSB0aGUgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICogXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtOyBpZlxuICogbm90LCB5b3UgY2FuIG9idGFpbiBvbmUgZnJvbSBUaWRlcG9vbCBQcm9qZWN0IGF0IHRpZGVwb29sLm9yZy5cbiAqID09IEJTRDIgTElDRU5TRSA9PVxuICovXG5cbnZhciBib3dzO1xuXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgYm93cyA9IHdpbmRvdy5ib3dzO1xufVxuXG5pZiAoIWJvd3MpIHtcbiAgLy8gT3B0aW9uYWwgZGVwZW5kZW5jeVxuICAvLyBSZXR1cm4gYSBmYWN0b3J5IGZvciBhIGxvZyBmdW5jdGlvbiB0aGF0IGRvZXMgbm90aGluZ1xuICBib3dzID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge307XG4gIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gYm93czsiLCIvKiBcbiAqID09IEJTRDIgTElDRU5TRSA9PVxuICogQ29weXJpZ2h0IChjKSAyMDE0LCBUaWRlcG9vbCBQcm9qZWN0XG4gKiBcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOyB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5IGl0IHVuZGVyXG4gKiB0aGUgdGVybXMgb2YgdGhlIGFzc29jaWF0ZWQgTGljZW5zZSwgd2hpY2ggaXMgaWRlbnRpY2FsIHRvIHRoZSBCU0QgMi1DbGF1c2VcbiAqIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5IHRoZSBPcGVuIFNvdXJjZSBJbml0aWF0aXZlIGF0IG9wZW5zb3VyY2Uub3JnLlxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCwgYnV0IFdJVEhPVVRcbiAqIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTXG4gKiBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuIFNlZSB0aGUgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICogXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtOyBpZlxuICogbm90LCB5b3UgY2FuIG9idGFpbiBvbmUgZnJvbSBUaWRlcG9vbCBQcm9qZWN0IGF0IHRpZGVwb29sLm9yZy5cbiAqID09IEJTRDIgTElDRU5TRSA9PVxuICovXG5cbnZhciBEdXJhdGlvbjtcblxuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gIER1cmF0aW9uID0gd2luZG93LkR1cmF0aW9uO1xufVxuXG5pZiAoIUR1cmF0aW9uKSB7XG4gIHRocm93IG5ldyBFcnJvcignRHVyYXRpb24uanMgaXMgYSByZXF1aXJlZCBkZXBlbmRlbmN5Jyk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRHVyYXRpb247IiwiLyogXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqIENvcHlyaWdodCAoYykgMjAxNCwgVGlkZXBvb2wgUHJvamVjdFxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTsgeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeSBpdCB1bmRlclxuICogdGhlIHRlcm1zIG9mIHRoZSBhc3NvY2lhdGVkIExpY2Vuc2UsIHdoaWNoIGlzIGlkZW50aWNhbCB0byB0aGUgQlNEIDItQ2xhdXNlXG4gKiBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieSB0aGUgT3BlbiBTb3VyY2UgSW5pdGlhdGl2ZSBhdCBvcGVuc291cmNlLm9yZy5cbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsIGJ1dCBXSVRIT1VUXG4gKiBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTU1xuICogRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiBTZWUgdGhlIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqIFxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbTsgaWZcbiAqIG5vdCwgeW91IGNhbiBvYnRhaW4gb25lIGZyb20gVGlkZXBvb2wgUHJvamVjdCBhdCB0aWRlcG9vbC5vcmcuXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqL1xuXG52YXIgXztcblxuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gIF8gPSB3aW5kb3cuXztcbn1cbmVsc2Uge1xuICAvLyBSZXF1aXJlZCBmb3Igbm9kZSB0ZXN0c1xuICAvLyBXaWxsIG5vdCBnZXQgYnVuZGxlZCBpbnRvIGJyb3dzZXJpZnkgYnVpbGQgYmVjYXVzZSBpbnNpZGUgYW4gXCJpZlwiIGJsb2NrXG4gIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyk7XG59XG5cbmlmICghXykge1xuICB0aHJvdyBuZXcgRXJyb3IoJ1VuZGVyc2NvcmUgb3IgTG9kYXNoIGlzIGEgcmVxdWlyZWQgZGVwZW5kZW5jeScpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IF87IiwiLyogXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqIENvcHlyaWdodCAoYykgMjAxNCwgVGlkZXBvb2wgUHJvamVjdFxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTsgeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeSBpdCB1bmRlclxuICogdGhlIHRlcm1zIG9mIHRoZSBhc3NvY2lhdGVkIExpY2Vuc2UsIHdoaWNoIGlzIGlkZW50aWNhbCB0byB0aGUgQlNEIDItQ2xhdXNlXG4gKiBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieSB0aGUgT3BlbiBTb3VyY2UgSW5pdGlhdGl2ZSBhdCBvcGVuc291cmNlLm9yZy5cbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsIGJ1dCBXSVRIT1VUXG4gKiBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTU1xuICogRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiBTZWUgdGhlIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqIFxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbTsgaWZcbiAqIG5vdCwgeW91IGNhbiBvYnRhaW4gb25lIGZyb20gVGlkZXBvb2wgUHJvamVjdCBhdCB0aWRlcG9vbC5vcmcuXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqL1xuXG52YXIgbG9nID0gcmVxdWlyZSgnLi9saWIvYm93cycpKCdPbmUgRGF5Jyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZW1pdHRlcikge1xuICB2YXIgcG9vbCA9IHJlcXVpcmUoJy4vcG9vbCcpO1xuXG4gIHZhciB0b29sdGlwID0gcmVxdWlyZSgnLi9wbG90L3Rvb2x0aXAnKTtcblxuICB2YXIgTVNfSU5fMjQgPSA4NjQwMDAwMDtcblxuICB2YXIgYnVja2V0LFxuICAgIGlkLFxuICAgIHdpZHRoLCBtaW5XaWR0aCxcbiAgICBoZWlnaHQsIG1pbkhlaWdodCxcbiAgICBpbWFnZXNCYXNlVXJsLFxuICAgIGd1dHRlcixcbiAgICBheGlzR3V0dGVyLFxuICAgIG5hdiA9IHt9LFxuICAgIHBvb2xzID0gW10sIGd1dHRlcixcbiAgICB4U2NhbGUgPSBkMy50aW1lLnNjYWxlLnV0YygpLFxuICAgIHhBeGlzID0gZDMuc3ZnLmF4aXMoKS5zY2FsZSh4U2NhbGUpLm9yaWVudCgndG9wJykub3V0ZXJUaWNrU2l6ZSgwKS5pbm5lclRpY2tTaXplKDE1KS50aWNrRm9ybWF0KGQzLnRpbWUuZm9ybWF0LnV0YyhcIiUtSSAlcFwiKSksXG4gICAgYmVnaW5uaW5nT2ZEYXRhLCBlbmRPZkRhdGEsIGRhdGEsIGFsbERhdGEgPSBbXSwgYnVmZmVyLCBlbmRwb2ludHMsXG4gICAgbWFpbkdyb3VwLCBzY3JvbGxIYW5kbGVUcmlnZ2VyID0gdHJ1ZSwgdG9vbHRpcHM7XG5cbiAgY29udGFpbmVyLmRhdGFGaWxsID0ge307XG5cbiAgdmFyIGRlZmF1bHRzID0ge1xuICAgIGJ1Y2tldDogJCgnI3RpZGVsaW5lQ29udGFpbmVyJyksXG4gICAgaWQ6ICd0aWRlbGluZVNWRycsXG4gICAgbWluV2lkdGg6IDQwMCxcbiAgICBtaW5IZWlnaHQ6IDQwMCxcbiAgICBpbWFnZXNCYXNlVXJsOiAnaW1nJyxcbiAgICBuYXY6IHtcbiAgICAgIG1pbk5hdkhlaWdodDogMzAsXG4gICAgICBzY3JvbGxOYXY6IHRydWUsXG4gICAgICBzY3JvbGxOYXZIZWlnaHQ6IDQwLFxuICAgICAgc2Nyb2xsVGh1bWJSYWRpdXM6IDgsXG4gICAgICBsYXRlc3RUcmFuc2xhdGlvbjogMCxcbiAgICAgIGN1cnJlbnRUcmFuc2xhdGlvbjogMFxuICAgIH0sXG4gICAgYXhpc0d1dHRlcjogNDAsXG4gICAgZ3V0dGVyOiA0MCxcbiAgICBidWZmZXI6IDUsXG4gICAgdG9vbHRpcDogdHJ1ZVxuICB9O1xuXG4gIGZ1bmN0aW9uIGNvbnRhaW5lcihzZWxlY3Rpb24pIHtcbiAgICBzZWxlY3Rpb24uZWFjaChmdW5jdGlvbihjdXJyZW50RGF0YSkge1xuICAgICAgLy8gc2VsZWN0IHRoZSBTVkcgaWYgaXQgYWxyZWFkeSBleGlzdHNcbiAgICAgIHZhciBtYWluU1ZHID0gc2VsZWN0aW9uLnNlbGVjdEFsbCgnc3ZnJykuZGF0YShbY3VycmVudERhdGFdKTtcbiAgICAgIC8vIG90aGVyd2lzZSBjcmVhdGUgYSBuZXcgU1ZHIGFuZCBlbnRlciAgIFxuICAgICAgbWFpbkdyb3VwID0gbWFpblNWRy5lbnRlcigpLmFwcGVuZCgnc3ZnJykuYXBwZW5kKCdnJykuYXR0cignaWQnLCAndGlkZWxpbmVNYWluJyk7XG5cbiAgICAgIC8vIHVwZGF0ZSBTVkcgZGltZW5pb25zIGFuZCBJRFxuICAgICAgbWFpblNWRy5hdHRyKHtcbiAgICAgICAgJ2lkJzogaWQsXG4gICAgICAgICd3aWR0aCc6IHdpZHRoLFxuICAgICAgICAnaGVpZ2h0JzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaGVpZ2h0ICs9ICsgbmF2LmF4aXNIZWlnaHQ7XG4gICAgICAgICAgaWYgKG5hdi5zY3JvbGxOYXYpIHtcbiAgICAgICAgICAgIGhlaWdodCArPSBuYXYuc2Nyb2xsTmF2SGVpZ2h0O1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gaGVpZ2h0O1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgbWFpbkdyb3VwLmFwcGVuZCgncmVjdCcpXG4gICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAnaWQnOiAncG9vbHNJbnZpc2libGVSZWN0JyxcbiAgICAgICAgICAnd2lkdGgnOiB3aWR0aCxcbiAgICAgICAgICAnaGVpZ2h0JzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAobmF2LnNjcm9sbE5hdikge1xuICAgICAgICAgICAgICByZXR1cm4gKGhlaWdodCAtIG5hdi5zY3JvbGxOYXZIZWlnaHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIHJldHVybiBoZWlnaHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICAnb3BhY2l0eSc6IDAuMFxuICAgICAgICB9KTtcblxuICAgICAgLy8gc2V0IHRoZSBkb21haW4gYW5kIHJhbmdlIGZvciB0aGUgbWFpbiB0aWRlbGluZSB4LXNjYWxlXG4gICAgICB4U2NhbGUuZG9tYWluKFtjb250YWluZXIuaW5pdGlhbEVuZHBvaW50c1swXSwgY29udGFpbmVyLmluaXRpYWxFbmRwb2ludHNbMV1dKVxuICAgICAgICAucmFuZ2UoW2NvbnRhaW5lci5heGlzR3V0dGVyKCksIHdpZHRoXSk7XG5cbiAgICAgIG1haW5Hcm91cC5hcHBlbmQoJ2cnKVxuICAgICAgICAuYXR0cignY2xhc3MnLCAnZDMteCBkMy1heGlzJylcbiAgICAgICAgLmF0dHIoJ2lkJywgJ3RpZGVsaW5lWEF4aXMnKVxuICAgICAgICAuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgwLCcgKyAobmF2LmF4aXNIZWlnaHQgLSAxKSArICcpJylcbiAgICAgICAgLmNhbGwoeEF4aXMpO1xuXG4gICAgICBkMy5zZWxlY3RBbGwoJyN0aWRlbGluZVhBeGlzIGcudGljayB0ZXh0Jykuc3R5bGUoJ3RleHQtYW5jaG9yJywgJ3N0YXJ0JykuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSg1LDE1KScpO1xuXG4gICAgICBjb250YWluZXIucG9vbEdyb3VwID0gbWFpbkdyb3VwLmFwcGVuZCgnZycpLmF0dHIoJ2lkJywgJ3RpZGVsaW5lUG9vbHMnKTtcblxuICAgICAgbWFpbkdyb3VwLmFwcGVuZCgnZycpXG4gICAgICAgIC5hdHRyKCdpZCcsICd0aWRlbGluZUxhYmVscycpO1xuXG4gICAgICBtYWluR3JvdXAuYXBwZW5kKCdnJylcbiAgICAgICAgLmF0dHIoJ2lkJywgJ3RpZGVsaW5lWUF4ZXMnKVxuICAgICAgICAuYXBwZW5kKCdyZWN0JylcbiAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICdpZCc6ICd5QXhlc0ludmlzaWJsZVJlY3QnLFxuICAgICAgICAgICdoZWlnaHQnOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmIChuYXYuc2Nyb2xsTmF2KSB7XG4gICAgICAgICAgICAgIHJldHVybiAoaGVpZ2h0IC0gbmF2LnNjcm9sbE5hdkhlaWdodCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGhlaWdodDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgICd3aWR0aCc6IGNvbnRhaW5lci5heGlzR3V0dGVyKCksXG4gICAgICAgICAgJ2ZpbGwnOiAnd2hpdGUnXG4gICAgICAgIH0pO1xuXG4gICAgICBpZiAobmF2LnNjcm9sbE5hdikge1xuICAgICAgICBzY3JvbGxOYXYgPSBtYWluR3JvdXAuYXBwZW5kKCdnJylcbiAgICAgICAgICAuYXR0cignY2xhc3MnLCAneCBzY3JvbGwnKVxuICAgICAgICAgIC5hdHRyKCdpZCcsICd0aWRlbGluZVNjcm9sbE5hdicpO1xuXG4gICAgICAgIG5hdi5zY3JvbGxTY2FsZSA9IGQzLnRpbWUuc2NhbGUudXRjKClcbiAgICAgICAgICAuZG9tYWluKFtlbmRwb2ludHNbMF0sIGNvbnRhaW5lci5jdXJyZW50RW5kcG9pbnRzWzBdXSlcbiAgICAgICAgICAucmFuZ2UoW2NvbnRhaW5lci5heGlzR3V0dGVyKCkgKyBuYXYuc2Nyb2xsVGh1bWJSYWRpdXMsIHdpZHRoIC0gbmF2LnNjcm9sbFRodW1iUmFkaXVzXSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvLyBub24tY2hhaW5hYmxlIG1ldGhvZHNcbiAgY29udGFpbmVyLmdldERhdGEgPSBmdW5jdGlvbihlbmRwb2ludHMsIGRpcmVjdGlvbikge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgZW5kcG9pbnRzID0gY29udGFpbmVyLmluaXRpYWxFbmRwb2ludHM7XG4gICAgICBkaXJlY3Rpb24gPSAnYm90aCc7XG4gICAgfVxuXG4gICAgdmFyIHN0YXJ0ID0gbmV3IERhdGUoZW5kcG9pbnRzWzBdKTtcbiAgICB2YXIgZW5kID0gbmV3IERhdGUoZW5kcG9pbnRzWzFdKTtcblxuICAgIGNvbnRhaW5lci5jdXJyZW50RW5kcG9pbnRzID0gW3N0YXJ0LCBlbmRdO1xuXG4gICAgcmVhZGluZ3MgPSBfLmZpbHRlcihkYXRhLCBmdW5jdGlvbihkYXRhcG9pbnQpIHtcbiAgICAgIHQgPSBEYXRlLnBhcnNlKGRhdGFwb2ludC5ub3JtYWxUaW1lKTtcbiAgICAgIGlmIChkaXJlY3Rpb24gPT0gJ2JvdGgnKSB7XG4gICAgICAgIGlmICgodCA+PSBzdGFydCkgJiYgKHQgPD0gZW5kKSkge1xuICAgICAgICAgIHJldHVybiBkYXRhcG9pbnQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKGRpcmVjdGlvbiA9PSAnbGVmdCcpIHtcbiAgICAgICAgaWYgKCh0ID49IHN0YXJ0KSAmJiAodCA8IGVuZCkpIHtcbiAgICAgICAgICByZXR1cm4gZGF0YXBvaW50O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChkaXJlY3Rpb24gPT0gJ3JpZ2h0Jykge1xuICAgICAgICBpZiAoKHQgPiBzdGFydCkgJiYgKHQgPD0gZW5kKSkge1xuICAgICAgICAgIHJldHVybiBkYXRhcG9pbnQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiByZWFkaW5ncztcbiAgfTtcblxuICBjb250YWluZXIucGFuRm9yd2FyZCA9IGZ1bmN0aW9uKCkge1xuICAgIGxvZygnSnVtcGVkIGZvcndhcmQgYSBkYXkuJyk7XG4gICAgbmF2LmN1cnJlbnRUcmFuc2xhdGlvbiAtPSB3aWR0aCAtIGNvbnRhaW5lci5heGlzR3V0dGVyKCk7XG4gICAgbWFpbkdyb3VwLnRyYW5zaXRpb24oKS5kdXJhdGlvbig1MDApLnR3ZWVuKCd6b29tJywgZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgaXggPSBkMy5pbnRlcnBvbGF0ZShuYXYuY3VycmVudFRyYW5zbGF0aW9uICsgd2lkdGggLSBjb250YWluZXIuYXhpc0d1dHRlcigpLCBuYXYuY3VycmVudFRyYW5zbGF0aW9uKTtcbiAgICAgIHJldHVybiBmdW5jdGlvbih0KSB7XG4gICAgICAgIG5hdi5wYW4udHJhbnNsYXRlKFtpeCh0KSwgMF0pO1xuICAgICAgICBuYXYucGFuLmV2ZW50KG1haW5Hcm91cCk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9O1xuXG4gIGNvbnRhaW5lci5wYW5CYWNrID0gZnVuY3Rpb24oKSB7XG4gICAgbG9nKCdKdW1wZWQgYmFjayBhIGRheS4nKTtcbiAgICBuYXYuY3VycmVudFRyYW5zbGF0aW9uICs9IHdpZHRoIC0gY29udGFpbmVyLmF4aXNHdXR0ZXIoKTtcbiAgICBtYWluR3JvdXAudHJhbnNpdGlvbigpLmR1cmF0aW9uKDUwMCkudHdlZW4oJ3pvb20nLCBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBpeCA9IGQzLmludGVycG9sYXRlKG5hdi5jdXJyZW50VHJhbnNsYXRpb24gLSB3aWR0aCArIGNvbnRhaW5lci5heGlzR3V0dGVyKCksIG5hdi5jdXJyZW50VHJhbnNsYXRpb24pO1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICAgICAgbmF2LnBhbi50cmFuc2xhdGUoW2l4KHQpLCAwXSk7XG4gICAgICAgIG5hdi5wYW4uZXZlbnQobWFpbkdyb3VwKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH07XG5cbiAgY29udGFpbmVyLm5ld1Bvb2wgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcCA9IG5ldyBwb29sKGNvbnRhaW5lcik7XG4gICAgcG9vbHMucHVzaChwKTtcbiAgICByZXR1cm4gcDtcbiAgfTtcblxuICBjb250YWluZXIuYXJyYW5nZVBvb2xzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG51bVBvb2xzID0gcG9vbHMubGVuZ3RoO1xuICAgIHZhciBjdW1XZWlnaHQgPSAwO1xuICAgIHBvb2xzLmZvckVhY2goZnVuY3Rpb24ocG9vbCkge1xuICAgICAgY3VtV2VpZ2h0ICs9IHBvb2wud2VpZ2h0KCk7XG4gICAgfSk7XG4gICAgLy8gVE9ETzogYWRqdXN0IGZvciB3aGVuIG5vIHNjcm9sbE5hdlxuICAgIHZhciB0b3RhbFBvb2xzSGVpZ2h0ID0gXG4gICAgICBjb250YWluZXIuaGVpZ2h0KCkgLSBjb250YWluZXIuYXhpc0hlaWdodCgpIC0gY29udGFpbmVyLnNjcm9sbE5hdkhlaWdodCgpIC0gKG51bVBvb2xzIC0gMSkgKiBjb250YWluZXIuZ3V0dGVyKCk7XG4gICAgdmFyIHBvb2xTY2FsZUhlaWdodCA9IHRvdGFsUG9vbHNIZWlnaHQvY3VtV2VpZ2h0O1xuICAgIHZhciBhY3R1YWxQb29sc0hlaWdodCA9IDA7XG4gICAgcG9vbHMuZm9yRWFjaChmdW5jdGlvbihwb29sKSB7XG4gICAgICBwb29sLmhlaWdodChwb29sU2NhbGVIZWlnaHQpO1xuICAgICAgYWN0dWFsUG9vbHNIZWlnaHQgKz0gcG9vbC5oZWlnaHQoKTtcbiAgICB9KTtcbiAgICBhY3R1YWxQb29sc0hlaWdodCArPSAobnVtUG9vbHMgLSAxKSAqIGNvbnRhaW5lci5ndXR0ZXIoKTtcbiAgICB2YXIgY3VycmVudFlQb3NpdGlvbiA9IGNvbnRhaW5lci5heGlzSGVpZ2h0KCk7XG4gICAgcG9vbHMuZm9yRWFjaChmdW5jdGlvbihwb29sKSB7XG4gICAgICBwb29sLnlQb3NpdGlvbihjdXJyZW50WVBvc2l0aW9uKTtcbiAgICAgIGN1cnJlbnRZUG9zaXRpb24gKz0gcG9vbC5oZWlnaHQoKSArIGNvbnRhaW5lci5ndXR0ZXIoKTtcbiAgICB9KTtcbiAgfTtcblxuICBjb250YWluZXIuc3RvcExpc3RlbmluZyA9IGZ1bmN0aW9uKCkge1xuICAgIGVtaXR0ZXIucmVtb3ZlQWxsTGlzdGVuZXJzKCdjYXJiVG9vbHRpcE9uJyk7XG4gICAgZW1pdHRlci5yZW1vdmVBbGxMaXN0ZW5lcnMoJ2NhcmJUb29sdGlwT2ZmJyk7XG4gICAgZW1pdHRlci5yZW1vdmVBbGxMaXN0ZW5lcnMoJ2JvbHVzVG9vbHRpcE9uJyk7XG4gICAgZW1pdHRlci5yZW1vdmVBbGxMaXN0ZW5lcnMoJ2JvbHVzVG9vbHRpcE9mZicpO1xuICAgIGVtaXR0ZXIucmVtb3ZlQWxsTGlzdGVuZXJzKCdub0NhcmJUaW1lc3RhbXAnKTtcblxuICAgIHJldHVybiBjb250YWluZXI7XG4gIH07XG5cbiAgY29udGFpbmVyLmRlc3Ryb3kgPSBmdW5jdGlvbigpIHtcbiAgICAkKCcjJyArIHRoaXMuaWQoKSkucmVtb3ZlKCk7XG4gICAgZGVsZXRlIHBvb2w7XG4gIH07XG5cbiAgY29udGFpbmVyLmRhdGUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZCA9IG5ldyBEYXRlKHhTY2FsZS5kb21haW4oKVswXSk7XG4gICAgcmV0dXJuIG5ldyBEYXRlKGQuc2V0VVRDSG91cnMoZC5nZXRVVENIb3VycygpICsgMTIpKTtcbiAgfTtcblxuICAvLyBjaGFpbmFibGUgbWV0aG9kc1xuICBjb250YWluZXIuZGVmYXVsdHMgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHByb3BlcnRpZXMgPSBkZWZhdWx0cztcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBwcm9wZXJ0aWVzID0gb2JqO1xuICAgIH1cbiAgICB0aGlzLmJ1Y2tldChwcm9wZXJ0aWVzLmJ1Y2tldCk7XG4gICAgdGhpcy5pZChwcm9wZXJ0aWVzLmlkKTtcbiAgICB0aGlzLm1pbldpZHRoKHByb3BlcnRpZXMubWluV2lkdGgpLndpZHRoKHByb3BlcnRpZXMud2lkdGgpO1xuICAgIHRoaXMuc2Nyb2xsTmF2KHByb3BlcnRpZXMubmF2LnNjcm9sbE5hdik7XG4gICAgdGhpcy5taW5OYXZIZWlnaHQocHJvcGVydGllcy5uYXYubWluTmF2SGVpZ2h0KVxuICAgICAgLmF4aXNIZWlnaHQocHJvcGVydGllcy5uYXYubWluTmF2SGVpZ2h0KVxuICAgICAgLnNjcm9sbFRodW1iUmFkaXVzKHByb3BlcnRpZXMubmF2LnNjcm9sbFRodW1iUmFkaXVzKVxuICAgICAgLnNjcm9sbE5hdkhlaWdodChwcm9wZXJ0aWVzLm5hdi5zY3JvbGxOYXZIZWlnaHQpO1xuICAgIHRoaXMubWluSGVpZ2h0KHByb3BlcnRpZXMubWluSGVpZ2h0KS5oZWlnaHQocHJvcGVydGllcy5taW5IZWlnaHQpO1xuICAgIHRoaXMubGF0ZXN0VHJhbnNsYXRpb24ocHJvcGVydGllcy5uYXYubGF0ZXN0VHJhbnNsYXRpb24pXG4gICAgICAuY3VycmVudFRyYW5zbGF0aW9uKHByb3BlcnRpZXMubmF2LmN1cnJlbnRUcmFuc2xhdGlvbik7XG4gICAgdGhpcy5heGlzR3V0dGVyKHByb3BlcnRpZXMuYXhpc0d1dHRlcik7XG4gICAgdGhpcy5ndXR0ZXIocHJvcGVydGllcy5ndXR0ZXIpO1xuICAgIHRoaXMuYnVmZmVyKHByb3BlcnRpZXMuYnVmZmVyKTtcbiAgICB0aGlzLnRvb2x0aXBzKHByb3BlcnRpZXMudG9vbHRpcHMpO1xuICAgIHRoaXMuaW1hZ2VzQmFzZVVybChwcm9wZXJ0aWVzLmltYWdlc0Jhc2VVcmwpO1xuXG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICBjb250YWluZXIuc2V0TmF2ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG1heFRyYW5zbGF0aW9uID0gLXhTY2FsZShlbmRwb2ludHNbMF0pICsgYXhpc0d1dHRlcjtcbiAgICB2YXIgbWluVHJhbnNsYXRpb24gPSAteFNjYWxlKGVuZHBvaW50c1sxXSkgKyB3aWR0aDtcbiAgICBuYXYucGFuID0gZDMuYmVoYXZpb3Iuem9vbSgpXG4gICAgICAuc2NhbGVFeHRlbnQoWzEsIDFdKVxuICAgICAgLngoeFNjYWxlKVxuICAgICAgLm9uKCd6b29tJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICgoZW5kT2ZEYXRhIC0geFNjYWxlLmRvbWFpbigpWzFdIDwgTVNfSU5fMjQpICYmICEoZW5kT2ZEYXRhLmdldFRpbWUoKSA9PT0gZW5kcG9pbnRzWzFdKSkge1xuICAgICAgICAgIGxvZygnUmVuZGVyaW5nIG5ldyBkYXRhISAocmlnaHQpJyk7XG4gICAgICAgICAgdmFyIHBsdXNPbmUgPSBuZXcgRGF0ZShjb250YWluZXIuZW5kT2ZEYXRhKCkpO1xuICAgICAgICAgIHBsdXNPbmUuc2V0RGF0ZShwbHVzT25lLmdldERhdGUoKSArIDEpO1xuICAgICAgICAgIHZhciBuZXdEYXRhID0gY29udGFpbmVyLmdldERhdGEoW2VuZE9mRGF0YSwgcGx1c09uZV0sICdyaWdodCcpO1xuICAgICAgICAgIC8vIHVwZGF0ZSBlbmRPZkRhdGFcbiAgICAgICAgICBpZiAocGx1c09uZSA8PSBlbmRwb2ludHNbMV0pIHtcbiAgICAgICAgICAgIGNvbnRhaW5lci5lbmRPZkRhdGEocGx1c09uZSk7IFxuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNvbnRhaW5lci5lbmRPZkRhdGEoZW5kcG9pbnRzWzFdKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29udGFpbmVyLmFsbERhdGEobmV3RGF0YSk7XG4gICAgICAgICAgZm9yIChqID0gMDsgaiA8IHBvb2xzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICBwb29sc1tqXShjb250YWluZXIucG9vbEdyb3VwLCBjb250YWluZXIuYWxsRGF0YSgpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCh4U2NhbGUuZG9tYWluKClbMF0gLSBiZWdpbm5pbmdPZkRhdGEgPCBNU19JTl8yNCkgJiYgIShiZWdpbm5pbmdPZkRhdGEuZ2V0VGltZSgpID09PSBlbmRwb2ludHNbMF0pKSB7XG4gICAgICAgICAgbG9nKCdSZW5kZXJpbmcgbmV3IGRhdGEhIChsZWZ0KScpO1xuICAgICAgICAgIHZhciBwbHVzT25lID0gbmV3IERhdGUoY29udGFpbmVyLmJlZ2lubmluZ09mRGF0YSgpKTtcbiAgICAgICAgICBwbHVzT25lLnNldERhdGUocGx1c09uZS5nZXREYXRlKCkgLSAxKTtcbiAgICAgICAgICB2YXIgbmV3RGF0YSA9IGNvbnRhaW5lci5nZXREYXRhKFtwbHVzT25lLCBiZWdpbm5pbmdPZkRhdGFdLCAnbGVmdCcpO1xuICAgICAgICAgIC8vIHVwZGF0ZSBiZWdpbm5pbmdPZkRhdGFcbiAgICAgICAgICBpZiAocGx1c09uZSA+PSBlbmRwb2ludHNbMF0pIHtcbiAgICAgICAgICAgIGNvbnRhaW5lci5iZWdpbm5pbmdPZkRhdGEocGx1c09uZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY29udGFpbmVyLmJlZ2lubmluZ09mRGF0YShlbmRwb2ludHNbMF0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb250YWluZXIuYWxsRGF0YShuZXdEYXRhKTtcbiAgICAgICAgICBmb3IgKGogPSAwOyBqIDwgcG9vbHMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgIHBvb2xzW2pdKGNvbnRhaW5lci5wb29sR3JvdXAsIGNvbnRhaW5lci5hbGxEYXRhKCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgZSA9IGQzLmV2ZW50O1xuICAgICAgICBpZiAoZS50cmFuc2xhdGVbMF0gPCBtaW5UcmFuc2xhdGlvbikge1xuICAgICAgICAgIGUudHJhbnNsYXRlWzBdID0gbWluVHJhbnNsYXRpb247XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZS50cmFuc2xhdGVbMF0gPiBtYXhUcmFuc2xhdGlvbikge1xuICAgICAgICAgIGUudHJhbnNsYXRlWzBdID0gbWF4VHJhbnNsYXRpb247XG4gICAgICAgIH1cbiAgICAgICAgbmF2LnBhbi50cmFuc2xhdGUoW2UudHJhbnNsYXRlWzBdLCAwXSk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcG9vbHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBwb29sc1tpXS5wYW4oZSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVE9ETzogY2hlY2sgaWYgY29udGFpbmVyIGhhcyB0b29sdGlwcyBiZWZvcmUgdHJhbnNmb3JtaW5nIHRoZW1cbiAgICAgICAgZDMuc2VsZWN0KCcjZDMtdG9vbHRpcC1ncm91cCcpLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArIGUudHJhbnNsYXRlWzBdICsgJywwKScpO1xuICAgICAgICBkMy5zZWxlY3QoJy5kMy14LmQzLWF4aXMnKS5jYWxsKHhBeGlzKTtcbiAgICAgICAgZDMuc2VsZWN0QWxsKCcjdGlkZWxpbmVYQXhpcyBnLnRpY2sgdGV4dCcpLnN0eWxlKCd0ZXh0LWFuY2hvcicsICdzdGFydCcpLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoNSwxNSknKTtcbiAgICAgICAgaWYgKHNjcm9sbEhhbmRsZVRyaWdnZXIpIHtcbiAgICAgICAgICBkMy5zZWxlY3QoJyNzY3JvbGxUaHVtYicpLnRyYW5zaXRpb24oKS5lYXNlKCdsaW5lYXInKS5hdHRyKCd4JywgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgZC54ID0gbmF2LnNjcm9sbFNjYWxlKHhTY2FsZS5kb21haW4oKVswXSk7XG4gICAgICAgICAgICByZXR1cm4gZC54IC0gbmF2LnNjcm9sbFRodW1iUmFkaXVzO1xuICAgICAgICAgIH0pOyAgICAgICBcbiAgICAgICAgfVxuICAgICAgICBjb250YWluZXIubmF2U3RyaW5nKHhTY2FsZS5kb21haW4oKSk7XG4gICAgICB9KVxuICAgICAgLm9uKCd6b29tZW5kJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnRhaW5lci5jdXJyZW50VHJhbnNsYXRpb24obmF2LmxhdGVzdFRyYW5zbGF0aW9uKTtcbiAgICAgICAgc2Nyb2xsSGFuZGxlVHJpZ2dlciA9IHRydWU7XG4gICAgICB9KTtcblxuICAgIG1haW5Hcm91cC5jYWxsKG5hdi5wYW4pO1xuXG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICBjb250YWluZXIuc2V0U2Nyb2xsTmF2ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRyYW5zbGF0aW9uQWRqdXN0bWVudCA9IGF4aXNHdXR0ZXI7XG4gICAgc2Nyb2xsTmF2LmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoMCwnICArIChoZWlnaHQgLSAobmF2LnNjcm9sbE5hdkhlaWdodCAvIDIpKSArICcpJylcbiAgICAgIC5hcHBlbmQoJ2xpbmUnKVxuICAgICAgLmF0dHIoe1xuICAgICAgICAneDEnOiBuYXYuc2Nyb2xsU2NhbGUoZW5kcG9pbnRzWzBdKSAtIG5hdi5zY3JvbGxUaHVtYlJhZGl1cyxcbiAgICAgICAgJ3gyJzogbmF2LnNjcm9sbFNjYWxlKGNvbnRhaW5lci5pbml0aWFsRW5kcG9pbnRzWzBdKSArIG5hdi5zY3JvbGxUaHVtYlJhZGl1cyxcbiAgICAgICAgJ3kxJzogMCxcbiAgICAgICAgJ3kyJzogMFxuICAgICAgfSk7XG5cbiAgICB2YXIgZHhSaWdodGVzdCA9IG5hdi5zY3JvbGxTY2FsZS5yYW5nZSgpWzFdO1xuICAgIHZhciBkeExlZnRlc3QgPSBuYXYuc2Nyb2xsU2NhbGUucmFuZ2UoKVswXTtcblxuICAgIHZhciBkcmFnID0gZDMuYmVoYXZpb3IuZHJhZygpXG4gICAgICAub3JpZ2luKGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgcmV0dXJuIGQ7XG4gICAgICB9KVxuICAgICAgLm9uKCdkcmFnc3RhcnQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgZDMuZXZlbnQuc291cmNlRXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7IC8vIHNpbGVuY2UgdGhlIGNsaWNrLWFuZC1kcmFnIGxpc3RlbmVyXG4gICAgICB9KVxuICAgICAgLm9uKCdkcmFnJywgZnVuY3Rpb24oZCkge1xuICAgICAgICBkLnggKz0gZDMuZXZlbnQuZHg7XG4gICAgICAgIGlmIChkLnggPiBkeFJpZ2h0ZXN0KSB7XG4gICAgICAgICAgZC54ID0gZHhSaWdodGVzdDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkLnggPCBkeExlZnRlc3QpIHtcbiAgICAgICAgICBkLnggPSBkeExlZnRlc3Q7XG4gICAgICAgIH1cbiAgICAgICAgZDMuc2VsZWN0KHRoaXMpLmF0dHIoJ3gnLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLnggLSBuYXYuc2Nyb2xsVGh1bWJSYWRpdXM7IH0pO1xuICAgICAgICB2YXIgZGF0ZSA9IG5hdi5zY3JvbGxTY2FsZS5pbnZlcnQoZC54KTtcbiAgICAgICAgbmF2LmN1cnJlbnRUcmFuc2xhdGlvbiArPSAteFNjYWxlKGRhdGUpICsgdHJhbnNsYXRpb25BZGp1c3RtZW50O1xuICAgICAgICBzY3JvbGxIYW5kbGVUcmlnZ2VyID0gZmFsc2U7XG4gICAgICAgIG5hdi5wYW4udHJhbnNsYXRlKFtuYXYuY3VycmVudFRyYW5zbGF0aW9uLCAwXSk7XG4gICAgICAgIG5hdi5wYW4uZXZlbnQobWFpbkdyb3VwKTtcbiAgICAgIH0pO1xuXG4gICAgc2Nyb2xsTmF2LnNlbGVjdEFsbCgnaW1hZ2UnKVxuICAgICAgLmRhdGEoW3sneCc6IG5hdi5zY3JvbGxTY2FsZShjb250YWluZXIuY3VycmVudEVuZHBvaW50c1swXSksICd5JzogMH1dKVxuICAgICAgLmVudGVyKClcbiAgICAgIC5hcHBlbmQoJ2ltYWdlJylcbiAgICAgIC5hdHRyKHtcbiAgICAgICAgJ3hsaW5rOmhyZWYnOiBpbWFnZXNCYXNlVXJsICsgJy91eC9zY3JvbGxfdGh1bWIuc3ZnJyxcbiAgICAgICAgJ3gnOiBmdW5jdGlvbihkKSB7IHJldHVybiBkLnggLSBuYXYuc2Nyb2xsVGh1bWJSYWRpdXM7IH0sXG4gICAgICAgICd5JzogLW5hdi5zY3JvbGxUaHVtYlJhZGl1cyxcbiAgICAgICAgJ3dpZHRoJzogbmF2LnNjcm9sbFRodW1iUmFkaXVzICogMixcbiAgICAgICAgJ2hlaWdodCc6IG5hdi5zY3JvbGxUaHVtYlJhZGl1cyAqIDIsXG4gICAgICAgICdpZCc6ICdzY3JvbGxUaHVtYidcbiAgICAgIH0pXG4gICAgICAuY2FsbChkcmFnKTtcblxuICAgIHJldHVybiBjb250YWluZXI7XG4gIH07XG5cbiAgY29udGFpbmVyLnNldEF0RGF0ZSA9IGZ1bmN0aW9uIChkYXRlKSB7XG4gICAgbmF2LmN1cnJlbnRUcmFuc2xhdGlvbiA9IC14U2NhbGUoZGF0ZSkgKyBheGlzR3V0dGVyO1xuICAgIG5hdi5wYW4udHJhbnNsYXRlKFtuYXYuY3VycmVudFRyYW5zbGF0aW9uLCAwXSk7XG4gICAgbmF2LnBhbi5ldmVudChtYWluR3JvdXApO1xuXG4gICAgY29udGFpbmVyLm5hdlN0cmluZyh4U2NhbGUuZG9tYWluKCkpO1xuXG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICBjb250YWluZXIubmF2U3RyaW5nID0gZnVuY3Rpb24oYSkge1xuICAgIHZhciBmb3JtYXREYXRlID0gZDMudGltZS5mb3JtYXQudXRjKFwiJUEgJS1kICVCXCIpO1xuICAgIHZhciBiZWdpbm5pbmcgPSBmb3JtYXREYXRlKGFbMF0pO1xuICAgIHZhciBlbmQgPSBmb3JtYXREYXRlKGFbMV0pO1xuICAgIHZhciBuYXZTdHJpbmc7XG4gICAgaWYgKGJlZ2lubmluZyA9PT0gZW5kKSB7XG4gICAgICBuYXZTdHJpbmcgPSBiZWdpbm5pbmc7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgbmF2U3RyaW5nID0gYmVnaW5uaW5nICsgJyAtICcgKyBlbmQ7XG4gICAgfVxuICAgIGVtaXR0ZXIuZW1pdCgnbmF2aWdhdGVkJywgbmF2U3RyaW5nKTtcbiAgfTtcblxuICBjb250YWluZXIuc2V0VG9vbHRpcCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0b29sdGlwR3JvdXAgPSBtYWluR3JvdXAuYXBwZW5kKCdnJylcbiAgICAgIC5hdHRyKCdpZCcsICdkMy10b29sdGlwLWdyb3VwJyk7XG4gICAgY29udGFpbmVyLnRvb2x0aXBzID0gbmV3IHRvb2x0aXAoY29udGFpbmVyLCB0b29sdGlwR3JvdXApLmlkKHRvb2x0aXBHcm91cC5hdHRyKCdpZCcpKTtcbiAgICByZXR1cm4gY29udGFpbmVyO1xuICB9O1xuXG4gIC8vIGdldHRlcnMgYW5kIHNldHRlcnNcbiAgY29udGFpbmVyLmJ1Y2tldCA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBidWNrZXQ7XG4gICAgYnVja2V0ID0geDtcbiAgICByZXR1cm4gY29udGFpbmVyO1xuICB9O1xuXG4gIGNvbnRhaW5lci5pZCA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBpZDtcbiAgICBpZCA9IHg7XG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICBjb250YWluZXIud2lkdGggPSBmdW5jdGlvbih4KSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gd2lkdGg7XG4gICAgaWYgKHggPj0gbWluV2lkdGgpIHtcbiAgICAgIGlmICh4ID4gYnVja2V0LndpZHRoKCkpIHtcbiAgICAgICAgd2lkdGggPSBidWNrZXQud2lkdGgoKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB3aWR0aCA9IHg7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgd2lkdGggPSBtaW5XaWR0aDtcbiAgICB9XG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICBjb250YWluZXIubWluV2lkdGggPSBmdW5jdGlvbih4KSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gbWluV2lkdGg7XG4gICAgbWluV2lkdGggPSB4O1xuICAgIHJldHVybiBjb250YWluZXI7XG4gIH07XG5cbiAgY29udGFpbmVyLmhlaWdodCA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBoZWlnaHQ7XG4gICAgdmFyIHRvdGFsSGVpZ2h0ID0geCArIGNvbnRhaW5lci5heGlzSGVpZ2h0KCk7XG4gICAgaWYgKG5hdi5zY3JvbGxOYXYpIHtcbiAgICAgIHRvdGFsSGVpZ2h0ICs9IGNvbnRhaW5lci5zY3JvbGxOYXZIZWlnaHQoKTtcbiAgICB9XG4gICAgaWYgKHRvdGFsSGVpZ2h0ID49IG1pbkhlaWdodCkge1xuICAgICAgaWYgKHRvdGFsSGVpZ2h0ID4gYnVja2V0LmhlaWdodCgpKSB7XG4gICAgICAgIGhlaWdodCA9IGJ1Y2tldC5oZWlnaHQoKSAtIGNvbnRhaW5lci5heGlzSGVpZ2h0KCk7XG4gICAgICAgIGlmIChuYXYuc2Nyb2xsTmF2KSB7XG4gICAgICAgICAgaGVpZ2h0IC09IGNvbnRhaW5lci5zY3JvbGxOYXZIZWlnaHQoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGhlaWdodCA9IHg7IFxuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGhlaWdodCA9IG1pbkhlaWdodDtcbiAgICB9XG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICBjb250YWluZXIubWluSGVpZ2h0ID0gZnVuY3Rpb24oeCkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGhlaWdodDtcbiAgICBtaW5IZWlnaHQgPSB4O1xuICAgIHJldHVybiBjb250YWluZXI7XG4gIH07XG5cbiAgY29udGFpbmVyLmltYWdlc0Jhc2VVcmwgPSBmdW5jdGlvbih4KSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gaW1hZ2VzQmFzZVVybDtcbiAgICBpbWFnZXNCYXNlVXJsID0geDtcbiAgICByZXR1cm4gY29udGFpbmVyO1xuICB9O1xuXG4gIC8vIG5hdiBnZXR0ZXJzIGFuZCBzZXR0ZXJzXG4gIGNvbnRhaW5lci5heGlzSGVpZ2h0ID0gZnVuY3Rpb24oeCkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIG5hdi5heGlzSGVpZ2h0O1xuICAgIGlmICh4ID49IG5hdi5taW5OYXZIZWlnaHQpIHtcbiAgICAgIG5hdi5heGlzSGVpZ2h0ID0geDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBuYXYuYXhpc0hlaWdodCA9IG5hdi5taW5OYXZIZWlnaHQ7XG4gICAgfVxuICAgIHJldHVybiBjb250YWluZXI7XG4gIH07XG5cbiAgY29udGFpbmVyLm1pbk5hdkhlaWdodCA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBuYXYubWluTmF2SGVpZ2h0O1xuICAgIG5hdi5taW5OYXZIZWlnaHQgPSB4O1xuICAgIHJldHVybiBjb250YWluZXI7XG4gIH07XG5cbiAgLy8gbmF2LnNjcm9sbE5hdiBnZXR0ZXJzIGFuZCBzZXR0ZXJzXG4gIGNvbnRhaW5lci5zY3JvbGxOYXYgPSBmdW5jdGlvbihiKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gbmF2LnNjcm9sbE5hdjtcbiAgICBuYXYuc2Nyb2xsTmF2ID0gYjtcbiAgICByZXR1cm4gY29udGFpbmVyO1xuICB9O1xuXG4gIGNvbnRhaW5lci5zY3JvbGxUaHVtYlJhZGl1cyA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBuYXYuc2Nyb2xsVGh1bWJSYWRpdXM7XG4gICAgbmF2LnNjcm9sbFRodW1iUmFkaXVzID0geDtcbiAgICByZXR1cm4gY29udGFpbmVyO1xuICB9O1xuXG4gIGNvbnRhaW5lci5zY3JvbGxOYXZIZWlnaHQgPSBmdW5jdGlvbih4KSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gbmF2LnNjcm9sbE5hdkhlaWdodDtcbiAgICBpZiAoeCA+PSBuYXYubWluTmF2SGVpZ2h0KSB7XG4gICAgICBuYXYuc2Nyb2xsTmF2SGVpZ2h0ID0geDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBuYXYuc2Nyb2xsTmF2SGVpZ2h0ID0gbmF2Lm1pbk5hdkhlaWdodDtcbiAgICB9XG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICBjb250YWluZXIuc2Nyb2xsU2NhbGUgPSBmdW5jdGlvbihmKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gbmF2LnNjcm9sbFNjYWxlO1xuICAgIG5hdi5zY3JvbGxTY2FsZSA9IGY7XG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICBjb250YWluZXIucGFuID0gZnVuY3Rpb24oZikge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIG5hdi5wYW47XG4gICAgbmF2LnBhbiA9IGY7XG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICBjb250YWluZXIubGF0ZXN0VHJhbnNsYXRpb24gPSBmdW5jdGlvbih4KSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gbmF2LmxhdGVzdFRyYW5zbGF0aW9uO1xuICAgIG5hdi5sYXRlc3RUcmFuc2xhdGlvbiA9IHg7XG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICBjb250YWluZXIuY3VycmVudFRyYW5zbGF0aW9uID0gZnVuY3Rpb24oeCkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIG5hdi5jdXJyZW50VHJhbnNsYXRpb247XG4gICAgbmF2LmN1cnJlbnRUcmFuc2xhdGlvbiA9IHg7XG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICAvLyBwb29scyBnZXR0ZXIgYW5kIHNldHRlclxuICBjb250YWluZXIucG9vbHMgPSBmdW5jdGlvbihhKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gcG9vbHM7XG4gICAgcG9vbHMgPSBhO1xuICAgIHJldHVybiBjb250YWluZXI7XG4gIH07XG5cbiAgY29udGFpbmVyLmF4aXNHdXR0ZXIgPSBmdW5jdGlvbih4KSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gYXhpc0d1dHRlcjtcbiAgICBheGlzR3V0dGVyID0geDtcbiAgICByZXR1cm4gY29udGFpbmVyO1xuICB9O1xuXG4gIGNvbnRhaW5lci5ndXR0ZXIgPSBmdW5jdGlvbih4KSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gZ3V0dGVyO1xuICAgIGd1dHRlciA9IHg7XG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICAvLyBzY2FsZXMgYW5kIGF4ZXMgZ2V0dGVycyBhbmQgc2V0dGVyc1xuICBjb250YWluZXIueFNjYWxlID0gZnVuY3Rpb24oZikge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHhTY2FsZTtcbiAgICB4U2NhbGUgPSBmO1xuICAgIHJldHVybiBjb250YWluZXI7XG4gIH07XG5cbiAgY29udGFpbmVyLnhBeGlzID0gZnVuY3Rpb24oZikge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHhBeGlzO1xuICAgIHhBeGlzID0gZjtcbiAgICByZXR1cm4gY29udGFpbmVyO1xuICB9O1xuXG4gIC8vIGRhdGEgZ2V0dGVycyBhbmQgc2V0dGVyc1xuICBjb250YWluZXIuYmVnaW5uaW5nT2ZEYXRhID0gZnVuY3Rpb24oZCkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGJlZ2lubmluZ09mRGF0YTtcbiAgICBiZWdpbm5pbmdPZkRhdGEgPSBuZXcgRGF0ZShkKTtcbiAgICByZXR1cm4gY29udGFpbmVyO1xuICB9O1xuXG4gIGNvbnRhaW5lci5lbmRPZkRhdGEgPSBmdW5jdGlvbihkKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gZW5kT2ZEYXRhO1xuICAgIGVuZE9mRGF0YSA9IG5ldyBEYXRlKGQpO1xuICAgIHJldHVybiBjb250YWluZXI7XG4gIH07XG5cbiAgY29udGFpbmVyLmRhdGEgPSBmdW5jdGlvbihhKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gZGF0YTtcblxuICAgIGRhdGEgPSBhO1xuXG4gICAgdmFyIGZpcnN0ID0gRGF0ZS5wYXJzZShhWzBdLm5vcm1hbFRpbWUpO1xuICAgIHZhciBsYXN0ID0gRGF0ZS5wYXJzZShhW2EubGVuZ3RoIC0gMV0ubm9ybWFsVGltZSk7XG5cbiAgICB2YXIgbWludXNPbmUgPSBuZXcgRGF0ZShsYXN0KTtcbiAgICBtaW51c09uZS5zZXREYXRlKG1pbnVzT25lLmdldERhdGUoKSAtIDEpO1xuICAgIGNvbnRhaW5lci5pbml0aWFsRW5kcG9pbnRzID0gW21pbnVzT25lLCBsYXN0XTtcbiAgICBjb250YWluZXIuY3VycmVudEVuZHBvaW50cyA9IGNvbnRhaW5lci5pbml0aWFsRW5kcG9pbnRzO1xuXG4gICAgY29udGFpbmVyLmJlZ2lubmluZ09mRGF0YShtaW51c09uZSkuZW5kT2ZEYXRhKGxhc3QpO1xuXG4gICAgZW5kcG9pbnRzID0gW2ZpcnN0LCBsYXN0XTtcbiAgICBjb250YWluZXIuZW5kcG9pbnRzID0gZW5kcG9pbnRzO1xuXG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICBjb250YWluZXIuYWxsRGF0YSA9IGZ1bmN0aW9uKHgsIGEpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBhbGxEYXRhO1xuICAgIGlmICghYSkge1xuICAgICAgYSA9IHhTY2FsZS5kb21haW4oKTtcbiAgICB9XG4gICAgYWxsRGF0YSA9IGFsbERhdGEuY29uY2F0KHgpO1xuICAgIGxvZygnTGVuZ3RoIG9mIGFsbERhdGEgYXJyYXkgaXMnLCBhbGxEYXRhLmxlbmd0aCk7XG4gICAgdmFyIHBsdXMgPSBuZXcgRGF0ZShhWzFdKTtcbiAgICBwbHVzLnNldERhdGUocGx1cy5nZXREYXRlKCkgKyBjb250YWluZXIuYnVmZmVyKCkpO1xuICAgIHZhciBtaW51cyA9IG5ldyBEYXRlKGFbMF0pO1xuICAgIG1pbnVzLnNldERhdGUobWludXMuZ2V0RGF0ZSgpIC0gY29udGFpbmVyLmJ1ZmZlcigpKTtcbiAgICBpZiAoYmVnaW5uaW5nT2ZEYXRhIDwgbWludXMpIHtcbiAgICAgIGNvbnRhaW5lci5iZWdpbm5pbmdPZkRhdGEobWludXMpOyBcbiAgICAgIGFsbERhdGEgPSBfLmZpbHRlcihhbGxEYXRhLCBmdW5jdGlvbihkYXRhcG9pbnQpIHtcbiAgICAgICAgdmFyIHQgPSBEYXRlLnBhcnNlKGRhdGFwb2ludC5ub3JtYWxUaW1lKTtcbiAgICAgICAgaWYgKHQgPj0gbWludXMpIHtcbiAgICAgICAgICByZXR1cm4gdDtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIGlmIChlbmRPZkRhdGEgPiBwbHVzKSB7XG4gICAgICBjb250YWluZXIuZW5kT2ZEYXRhKHBsdXMpO1xuICAgICAgYWxsRGF0YSA9IF8uZmlsdGVyKGFsbERhdGEsIGZ1bmN0aW9uKGRhdGFwb2ludCkge1xuICAgICAgICB2YXIgdCA9IERhdGUucGFyc2UoZGF0YXBvaW50Lm5vcm1hbFRpbWUpO1xuICAgICAgICBpZiAodCA8PSBwbHVzKSB7XG4gICAgICAgICAgcmV0dXJuIHQ7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICBhbGxEYXRhID0gXy5zb3J0QnkoYWxsRGF0YSwgZnVuY3Rpb24oZCkge1xuICAgICAgcmV0dXJuIG5ldyBEYXRlKGQubm9ybWFsVGltZSkudmFsdWVPZigpO1xuICAgIH0pO1xuICAgIGFsbERhdGEgPSBfLnVuaXEoYWxsRGF0YSwgdHJ1ZSk7XG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICBjb250YWluZXIuYnVmZmVyID0gZnVuY3Rpb24oeCkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGJ1ZmZlcjtcbiAgICBidWZmZXIgPSB4O1xuICAgIHJldHVybiBjb250YWluZXI7XG4gIH07XG5cbiAgY29udGFpbmVyLnRvb2x0aXBzID0gZnVuY3Rpb24oYikge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHRvb2x0aXBzO1xuICAgIHRvb2x0aXBzID0gYjtcbiAgICByZXR1cm4gY29udGFpbmVyO1xuICB9O1xuXG4gIHJldHVybiBjb250YWluZXI7XG59OyIsIi8qIFxuICogPT0gQlNEMiBMSUNFTlNFID09XG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQsIFRpZGVwb29sIFByb2plY3RcbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU7IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnkgaXQgdW5kZXJcbiAqIHRoZSB0ZXJtcyBvZiB0aGUgYXNzb2NpYXRlZCBMaWNlbnNlLCB3aGljaCBpcyBpZGVudGljYWwgdG8gdGhlIEJTRCAyLUNsYXVzZVxuICogTGljZW5zZSBhcyBwdWJsaXNoZWQgYnkgdGhlIE9wZW4gU291cmNlIEluaXRpYXRpdmUgYXQgb3BlbnNvdXJjZS5vcmcuXG4gKiBcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLCBidXQgV0lUSE9VVFxuICogQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2YgTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1NcbiAqIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gU2VlIHRoZSBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKiBcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW07IGlmXG4gKiBub3QsIHlvdSBjYW4gb2J0YWluIG9uZSBmcm9tIFRpZGVwb29sIFByb2plY3QgYXQgdGlkZXBvb2wub3JnLlxuICogPT0gQlNEMiBMSUNFTlNFID09XG4gKi9cblxudmFyIER1cmF0aW9uID0gcmVxdWlyZSgnLi4vbGliL2R1cmF0aW9uJyk7XG52YXIgbG9nID0gcmVxdWlyZSgnLi4vbGliL2Jvd3MnKSgnQmFzYWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihwb29sLCBvcHRzKSB7XG5cbiAgdmFyIFFVQVJURVIgPSAnIMK8JywgSEFMRiA9ICcgwr0nLCBUSFJFRV9RVUFSVEVSID0gJyDCvicsIFRISVJEID0gJyDihZMnLCBUV09fVEhJUkRTID0gJyDihZQnO1xuXG4gIG9wdHMgPSBvcHRzIHx8IHt9O1xuXG4gIHZhciBkZWZhdWx0cyA9IHtcbiAgICBjbGFzc2VzOiB7XG4gICAgICAncmVnJzogeyd0b29sdGlwJzogJ2Jhc2FsX3Rvb2x0aXBfcmVnLnN2ZycsICdoZWlnaHQnOiAyMH0sXG4gICAgICAndGVtcCc6IHsndG9vbHRpcCc6ICdiYXNhbF90b29sdGlwX3RlbXBfbGFyZ2Uuc3ZnJywgJ2hlaWdodCc6IDQwfVxuICAgIH0sXG4gICAgdG9vbHRpcFdpZHRoOiAxODAsXG4gICAgeFNjYWxlOiBwb29sLnhTY2FsZSgpLmNvcHkoKSxcbiAgICBwYXRoU3Ryb2tlOiAxLjUsXG4gICAgb3BhY2l0eTogMC4zLFxuICAgIG9wYWNpdHlEZWx0YTogMC4xXG4gIH07XG5cbiAgXy5kZWZhdWx0cyhvcHRzLCBkZWZhdWx0cyk7XG5cbiAgZnVuY3Rpb24gYmFzYWwoc2VsZWN0aW9uKSB7XG4gICAgc2VsZWN0aW9uLmVhY2goZnVuY3Rpb24oY3VycmVudERhdGEpIHtcblxuICAgICAgLy8gdG8gcHJldmVudCBibGFuayByZWN0YW5nbGUgYXQgYmVnaW5uaW5nIG9mIGRvbWFpblxuICAgICAgdmFyIGluZGV4ID0gb3B0cy5kYXRhLmluZGV4T2YoY3VycmVudERhdGFbMF0pO1xuICAgICAgLy8gd2hlbiBuZWFyIGxlZnQgZWRnZSBjdXJyZW50RGF0YVswXSB3aWxsIGhhdmUgaW5kZXggMCwgc28gd2UgZG9uJ3Qgd2FudCB0byBkZWNyZW1lbnQgaXRcbiAgICAgIGlmIChpbmRleCAhPT0gMCkge1xuICAgICAgICBpbmRleC0tO1xuICAgICAgfVxuICAgICAgd2hpbGUgKChpbmRleCA+PSAwKSAmJiAob3B0cy5kYXRhW2luZGV4XS52aXpUeXBlICE9PSAnYWN0dWFsJykpIHtcbiAgICAgICAgaW5kZXgtLTtcbiAgICAgIH1cbiAgICAgIC8vIHdoZW4gaW5kZXggPT09IDAgbWlnaHQgY2F0Y2ggYSBub24tYmFzYWxcbiAgICAgIGlmIChvcHRzLmRhdGFbaW5kZXhdLnR5cGUgPT09ICdiYXNhbC1yYXRlLXNlZ21lbnQnKSB7XG4gICAgICAgIGN1cnJlbnREYXRhLnVuc2hpZnQob3B0cy5kYXRhW2luZGV4XSk7XG4gICAgICB9XG5cbiAgICAgIHZhciBsaW5lID0gZDMuc3ZnLmxpbmUoKVxuICAgICAgICAueChmdW5jdGlvbihkKSB7IHJldHVybiBkLng7IH0pXG4gICAgICAgIC55KGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQueTsgfSlcbiAgICAgICAgLmludGVycG9sYXRlKCdzdGVwLWFmdGVyJyk7XG5cbiAgICAgIHZhciBhY3R1YWwgPSBfLndoZXJlKGN1cnJlbnREYXRhLCB7J3ZpelR5cGUnOiAnYWN0dWFsJ30pO1xuICAgICAgdmFyIHVuZGVsaXZlcmVkID0gXy53aGVyZShvcHRzLmRhdGEsIHsndml6VHlwZSc6ICd1bmRlbGl2ZXJlZCcsICdkZWxpdmVyeVR5cGUnOiAnc2NoZWR1bGVkJ30pO1xuXG4gICAgICAvLyBUT0RPOiByZW1vdmUgdGhpcyB3aGVuIHdlIGhhdmUgZ3VhcmFudGVlZCB1bmlxdWUgSURzIGZvciBlYWNoIGJhc2FsIHJhdGUgc2VnbWVudCBhZ2FpblxuICAgICAgY3VycmVudERhdGEuZm9yRWFjaChmdW5jdGlvbihkKSB7XG4gICAgICAgIGlmICgoZC5pZC5zZWFyY2goJ19hY3R1YWwnKSA9PT0gLTEpICYmIChkLmlkLnNlYXJjaCgnX3VuZGVsaXZlcmVkJykgPT09IC0xKSkge1xuICAgICAgICAgIGQuaWQgPSBkLmlkICsgJ18nICsgZC5zdGFydC5yZXBsYWNlKC86L2csICcnKSArICdfJyArIGQudml6VHlwZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIHZhciByZWN0cyA9IGQzLnNlbGVjdCh0aGlzKVxuICAgICAgICAuc2VsZWN0QWxsKCdnJylcbiAgICAgICAgLmRhdGEoY3VycmVudERhdGEsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICByZXR1cm4gZC5pZDtcbiAgICAgICAgfSk7XG4gICAgICB2YXIgcmVjdEdyb3VwcyA9IHJlY3RzLmVudGVyKClcbiAgICAgICAgLmFwcGVuZCgnZycpXG4gICAgICAgIC5hdHRyKCdjbGFzcycsICdkMy1iYXNhbC1ncm91cCcpXG4gICAgICAgIC5hdHRyKCdpZCcsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICByZXR1cm4gJ2Jhc2FsX2dyb3VwXycgKyBkLmlkO1xuICAgICAgICB9KTtcbiAgICAgIHJlY3RHcm91cHMuZmlsdGVyKGZ1bmN0aW9uKGQpe1xuICAgICAgICBpZiAoZC52aXpUeXBlID09PSAnYWN0dWFsJykge1xuICAgICAgICAgIHJldHVybiBkO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgICAuYXBwZW5kKCdyZWN0JylcbiAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICd3aWR0aCc6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHJldHVybiBiYXNhbC53aWR0aChkKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgICdoZWlnaHQnOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICB2YXIgaGVpZ2h0ID0gcG9vbC5oZWlnaHQoKSAtIG9wdHMueVNjYWxlKGQudmFsdWUpO1xuICAgICAgICAgICAgaWYgKGhlaWdodCA8IDApIHtcbiAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGhlaWdodDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgICd4JzogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgcmV0dXJuIG9wdHMueFNjYWxlKG5ldyBEYXRlKGQubm9ybWFsVGltZSkpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgJ3knOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICByZXR1cm4gb3B0cy55U2NhbGUoZC52YWx1ZSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICAnb3BhY2l0eSc6ICcwLjMnLFxuICAgICAgICAgICdjbGFzcyc6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHZhciBjbGFzc2VzO1xuICAgICAgICAgICAgaWYgKGQuZGVsaXZlcnlUeXBlID09PSAndGVtcCcpIHtcbiAgICAgICAgICAgICAgY2xhc3NlcyA9ICdkMy1iYXNhbCBkMy1yZWN0LWJhc2FsIGQzLWJhc2FsLXRlbXAnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIGNsYXNzZXMgPSAnZDMtYmFzYWwgZDMtcmVjdC1iYXNhbCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZC5kZWxpdmVyZWQgIT09IDApIHtcbiAgICAgICAgICAgICAgY2xhc3NlcyArPSAnIGQzLXJlY3QtYmFzYWwtbm9uemVybyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gY2xhc3NlcztcbiAgICAgICAgICB9LFxuICAgICAgICAgICdpZCc6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHJldHVybiAnYmFzYWxfJyArIGQuaWQ7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIHJlY3RHcm91cHMuZmlsdGVyKGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgaWYgKGQuZGVsaXZlcnlUeXBlICE9PSAndGVtcCcpIHtcbiAgICAgICAgICByZXR1cm4gZDtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgICAgLmFwcGVuZCgncmVjdCcpXG4gICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAnd2lkdGgnOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICByZXR1cm4gYmFzYWwud2lkdGgoZCk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICAnaGVpZ2h0JzogcG9vbC5oZWlnaHQoKSxcbiAgICAgICAgICAneCc6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHJldHVybiBvcHRzLnhTY2FsZShuZXcgRGF0ZShkLm5vcm1hbFRpbWUpKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgICd5JzogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgcmV0dXJuIG9wdHMueVNjYWxlLnJhbmdlKClbMV07XG4gICAgICAgICAgfSxcbiAgICAgICAgICAnY2xhc3MnOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICBpZiAoZC52aXpUeXBlID09PSAndW5kZWxpdmVyZWQnKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnZDMtYmFzYWwgZDMtYmFzYWwtaW52aXNpYmxlIGQzLWJhc2FsLXRlbXAnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIHJldHVybiAnZDMtYmFzYWwgZDMtYmFzYWwtaW52aXNpYmxlJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgICdpZCc6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHJldHVybiAnYmFzYWxfaW52aXNpYmxlXycgKyBkLmlkO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICByZWN0R3JvdXBzLmZpbHRlcihmdW5jdGlvbihkKSB7XG4gICAgICAgICAgaWYgKGQuZGVsaXZlcmVkICE9PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gZDtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIC5zZWxlY3RBbGwoJy5kMy1iYXNhbC1pbnZpc2libGUnKVxuICAgICAgICAuY2xhc3NlZCgnZDMtYmFzYWwtbm9uemVybycsIHRydWUpO1xuICAgICAgcmVjdHMuZXhpdCgpLnJlbW92ZSgpO1xuXG4gICAgICB2YXIgYmFzYWxHcm91cCA9IGQzLnNlbGVjdCh0aGlzKTtcblxuICAgICAgdmFyIGFjdHVhbFBvaW50cyA9IFtdO1xuXG4gICAgICBhY3R1YWwuZm9yRWFjaChmdW5jdGlvbihkKSB7XG4gICAgICAgIGFjdHVhbFBvaW50cy5wdXNoKHtcbiAgICAgICAgICAneCc6IG9wdHMueFNjYWxlKG5ldyBEYXRlKGQubm9ybWFsVGltZSkpLFxuICAgICAgICAgICd5Jzogb3B0cy55U2NhbGUoZC52YWx1ZSkgLSBvcHRzLnBhdGhTdHJva2UgLyAyLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgJ3gnOiBvcHRzLnhTY2FsZShuZXcgRGF0ZShkLm5vcm1hbEVuZCkpLFxuICAgICAgICAgICd5Jzogb3B0cy55U2NhbGUoZC52YWx1ZSkgLSBvcHRzLnBhdGhTdHJva2UgLyAyLFxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICBkMy5zZWxlY3RBbGwoJy5kMy1wYXRoLWJhc2FsJykucmVtb3ZlKCk7XG5cbiAgICAgIGQzLnNlbGVjdCh0aGlzKS5hcHBlbmQoJ3BhdGgnKVxuICAgICAgICAuYXR0cih7XG4gICAgICAgICdkJzogbGluZShhY3R1YWxQb2ludHMpLFxuICAgICAgICAnY2xhc3MnOiAnZDMtYmFzYWwgZDMtcGF0aC1iYXNhbCdcbiAgICAgIH0pO1xuXG4gICAgICBpZiAodW5kZWxpdmVyZWQubGVuZ3RoICE9PSAwKSB7XG4gICAgICAgIHZhciB1bmRlbGl2ZXJlZFNlcXVlbmNlcyA9IFtdO1xuICAgICAgICB2YXIgY29udGlndW91cyA9IFtdO1xuICAgICAgICB1bmRlbGl2ZXJlZC5mb3JFYWNoKGZ1bmN0aW9uKHNlZ21lbnQsIGksIHNlZ21lbnRzKSB7XG4gICAgICAgICAgaWYgKChpIDwgKHNlZ21lbnRzLmxlbmd0aCAtIDEpKSAmJiAoc2VnbWVudC5lbmQgPT09IHNlZ21lbnRzW2kgKyAxXS5zdGFydCkpIHtcbiAgICAgICAgICAgIHNlZ21lbnQuY29udGlndW91c1dpdGggPSAnbmV4dCc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKChpICE9PSAwKSAmJiAoc2VnbWVudHNbaSAtIDFdLmVuZCA9PT0gc2VnbWVudC5zdGFydCkpIHtcbiAgICAgICAgICAgIHNlZ21lbnQuY29udGlndW91c1dpdGggPSAncHJldmlvdXMnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHNlZ21lbnQuY29udGlndW91c1dpdGggPSAnbm9uZSc7XG4gICAgICAgICAgICB1bmRlbGl2ZXJlZFNlcXVlbmNlcy5wdXNoKFtzZWdtZW50XSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdW5kZWxpdmVyZWQgPSB1bmRlbGl2ZXJlZC5yZXZlcnNlKCk7XG5cbiAgICAgICAgdmFyIGFuY2hvcnMgPSBfLndoZXJlKHVuZGVsaXZlcmVkLCB7J2NvbnRpZ3VvdXNXaXRoJzogJ3ByZXZpb3VzJ30pO1xuXG4gICAgICAgIGFuY2hvcnMuZm9yRWFjaChmdW5jdGlvbihhbmNob3IpIHtcbiAgICAgICAgICB2YXIgaW5kZXggPSB1bmRlbGl2ZXJlZC5pbmRleE9mKGFuY2hvcik7XG4gICAgICAgICAgY29udGlndW91cy5wdXNoKHVuZGVsaXZlcmVkW2luZGV4XSk7XG4gICAgICAgICAgaW5kZXgrKztcbiAgICAgICAgICB3aGlsZSAodW5kZWxpdmVyZWRbaW5kZXhdLmNvbnRpZ3VvdXNXaXRoID09PSAnbmV4dCcpIHtcbiAgICAgICAgICAgIGNvbnRpZ3VvdXMucHVzaCh1bmRlbGl2ZXJlZFtpbmRleF0pO1xuICAgICAgICAgICAgaW5kZXgrKztcbiAgICAgICAgICAgIGlmIChpbmRleCA+ICh1bmRlbGl2ZXJlZC5sZW5ndGggLSAxKSkge1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgdW5kZWxpdmVyZWRTZXF1ZW5jZXMucHVzaChjb250aWd1b3VzKTtcbiAgICAgICAgICBjb250aWd1b3VzID0gW107XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHVuZGVsaXZlcmVkU2VxdWVuY2VzLmZvckVhY2goZnVuY3Rpb24oc2VxKSB7XG4gICAgICAgICAgc2VxID0gc2VxLnJldmVyc2UoKTtcbiAgICAgICAgICB2YXIgcGF0aFBvaW50cyA9IF8ubWFwKHNlcSwgZnVuY3Rpb24oc2VnbWVudCkge1xuICAgICAgICAgICAgcmV0dXJuIFt7XG4gICAgICAgICAgICAgICd4Jzogb3B0cy54U2NhbGUobmV3IERhdGUoc2VnbWVudC5ub3JtYWxUaW1lKSksXG4gICAgICAgICAgICAgICd5Jzogb3B0cy55U2NhbGUoc2VnbWVudC52YWx1ZSlcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICd4Jzogb3B0cy54U2NhbGUobmV3IERhdGUoc2VnbWVudC5ub3JtYWxFbmQpKSxcbiAgICAgICAgICAgICAgJ3knOiBvcHRzLnlTY2FsZShzZWdtZW50LnZhbHVlKVxuICAgICAgICAgICAgfV07XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcGF0aFBvaW50cyA9IF8uZmxhdHRlbihwYXRoUG9pbnRzKTtcbiAgICAgICAgICBwYXRoUG9pbnRzID0gXy51bmlxKHBhdGhQb2ludHMsIGZ1bmN0aW9uKHBvaW50KSB7XG4gICAgICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkocG9pbnQpO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgYmFzYWxHcm91cC5hcHBlbmQoJ3BhdGgnKVxuICAgICAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgICAnZCc6IGxpbmUocGF0aFBvaW50cyksXG4gICAgICAgICAgICAgICdjbGFzcyc6ICdkMy1iYXNhbCBkMy1wYXRoLWJhc2FsIGQzLXBhdGgtYmFzYWwtdW5kZWxpdmVyZWQnXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgYmFzYWwubGlua190ZW1wKF8ud2hlcmUoYWN0dWFsLCB7J2RlbGl2ZXJ5VHlwZSc6ICd0ZW1wJ30pLCB1bmRlbGl2ZXJlZCk7XG4gICAgICB9XG5cbiAgICAgIC8vIHRvb2x0aXBzXG4gICAgICBkMy5zZWxlY3RBbGwoJy5kMy1iYXNhbC1pbnZpc2libGUnKS5vbignbW91c2VvdmVyJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBpbnZpc2lSZWN0ID0gZDMuc2VsZWN0KHRoaXMpO1xuICAgICAgICB2YXIgaWQgPSBpbnZpc2lSZWN0LmF0dHIoJ2lkJykucmVwbGFjZSgnYmFzYWxfaW52aXNpYmxlXycsICcnKTtcbiAgICAgICAgdmFyIGQgPSBkMy5zZWxlY3QoJyNiYXNhbF9ncm91cF8nICsgaWQpLmRhdHVtKCk7XG4gICAgICAgIGlmIChpbnZpc2lSZWN0LmNsYXNzZWQoJ2QzLWJhc2FsLXRlbXAnKSkge1xuICAgICAgICAgIHZhciB0ZW1wRCA9IF8uY2xvbmUoXy5maW5kV2hlcmUoYWN0dWFsLCB7J2RlbGl2ZXJ5VHlwZSc6ICd0ZW1wJywgJ2lkJzogZC5saW5rLnJlcGxhY2UoJ2xpbmtfJywgJycpfSkpO1xuICAgICAgICAgIHRlbXBELmlkID0gZC5pZDtcbiAgICAgICAgICBiYXNhbC5hZGRUb29sdGlwKHRlbXBELCAndGVtcCcsIGQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGJhc2FsLmFkZFRvb2x0aXAoZCwgJ3JlZycpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpbnZpc2lSZWN0LmNsYXNzZWQoJ2QzLWJhc2FsLW5vbnplcm8nKSkge1xuICAgICAgICAgIGlmIChpbnZpc2lSZWN0LmNsYXNzZWQoJ2QzLWJhc2FsLXRlbXAnKSkge1xuICAgICAgICAgICAgZDMuc2VsZWN0KCcjYmFzYWxfJyArIGQubGluay5yZXBsYWNlKCdsaW5rXycsICcnKSkuYXR0cignb3BhY2l0eScsIG9wdHMub3BhY2l0eSArIG9wdHMub3BhY2l0eURlbHRhKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBkMy5zZWxlY3QoJyNiYXNhbF8nICsgaWQpLmF0dHIoJ29wYWNpdHknLCBvcHRzLm9wYWNpdHkgKyBvcHRzLm9wYWNpdHlEZWx0YSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGQzLnNlbGVjdEFsbCgnLmQzLWJhc2FsLWludmlzaWJsZScpLm9uKCdtb3VzZW91dCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgaW52aXNpUmVjdCA9IGQzLnNlbGVjdCh0aGlzKTtcbiAgICAgICAgdmFyIGlkID0gaW52aXNpUmVjdC5hdHRyKCdpZCcpLnJlcGxhY2UoJ2Jhc2FsX2ludmlzaWJsZV8nLCAnJyk7XG4gICAgICAgIHZhciBkID0gZDMuc2VsZWN0KCcjYmFzYWxfZ3JvdXBfJyArIGlkKS5kYXR1bSgpO1xuICAgICAgICBkMy5zZWxlY3QoJyN0b29sdGlwXycgKyBpZCkucmVtb3ZlKCk7XG4gICAgICAgIGlmIChpbnZpc2lSZWN0LmNsYXNzZWQoJ2QzLWJhc2FsLXRlbXAnKSkge1xuICAgICAgICAgIGQzLnNlbGVjdCgnI2Jhc2FsXycgKyBkLmxpbmsucmVwbGFjZSgnbGlua18nLCAnJykpLmF0dHIoJ29wYWNpdHknLCBvcHRzLm9wYWNpdHkpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGQzLnNlbGVjdCgnI2Jhc2FsXycgKyBpZCkuYXR0cignb3BhY2l0eScsIG9wdHMub3BhY2l0eSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgYmFzYWwubGlua190ZW1wID0gZnVuY3Rpb24odG9MaW5rLCByZWZlcmVuY2VBcnJheSkge1xuICAgIHJlZmVyZW5jZUFycmF5ID0gcmVmZXJlbmNlQXJyYXkuc2xpY2UoMCk7XG4gICAgcmVmZXJlbmNlQXJyYXkgPSBfLnNvcnRCeShyZWZlcmVuY2VBcnJheSwgZnVuY3Rpb24oc2VnbWVudCkge1xuICAgICAgcmV0dXJuIERhdGUucGFyc2Uoc2VnbWVudC5ub3JtYWxUaW1lKTtcbiAgICB9KTtcbiAgICB0b0xpbmsuZm9yRWFjaChmdW5jdGlvbihzZWdtZW50LCBpLCBzZWdtZW50cykge1xuICAgICAgdmFyIHN0YXJ0ID0gXy5maW5kV2hlcmUocmVmZXJlbmNlQXJyYXksIHsnbm9ybWFsVGltZSc6IHNlZ21lbnQubm9ybWFsVGltZX0pO1xuICAgICAgaWYgKHN0YXJ0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgbG9nKHNlZ21lbnQsIHJlZmVyZW5jZUFycmF5KTtcbiAgICAgIH1cbiAgICAgIHZhciBzdGFydEluZGV4ID0gcmVmZXJlbmNlQXJyYXkuaW5kZXhPZihzdGFydCk7XG4gICAgICBpZiAoKHN0YXJ0SW5kZXggPCAocmVmZXJlbmNlQXJyYXkubGVuZ3RoIC0gMSkpICYmIChzdGFydC5lbmQgPT09IHJlZmVyZW5jZUFycmF5W3N0YXJ0SW5kZXggKyAxXS5zdGFydCkpIHtcbiAgICAgICAgdmFyIGVuZCA9IF8uZmluZFdoZXJlKHJlZmVyZW5jZUFycmF5LCB7J25vcm1hbEVuZCc6IHNlZ21lbnQubm9ybWFsRW5kfSk7XG4gICAgICAgIHZhciBlbmRJbmRleCA9IHJlZmVyZW5jZUFycmF5LmluZGV4T2YoZW5kKTtcbiAgICAgICAgdmFyIGluZGV4ID0gc3RhcnRJbmRleDtcbiAgICAgICAgd2hpbGUgKGluZGV4IDw9IGVuZEluZGV4KSB7XG4gICAgICAgICAgcmVmZXJlbmNlQXJyYXlbaW5kZXhdLmxpbmsgPSAnbGlua18nICsgc2VnbWVudC5pZDtcbiAgICAgICAgICBpbmRleCsrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgcmVmZXJlbmNlQXJyYXlbc3RhcnRJbmRleF0ubGluayA9ICdsaW5rXycgKyBzZWdtZW50LmlkO1xuICAgICAgfVxuICAgIH0pO1xuICB9O1xuXG4gIGJhc2FsLnRpbWVzcGFuID0gZnVuY3Rpb24oZCkge1xuICAgIHZhciBzdGFydCA9IERhdGUucGFyc2UoZC5ub3JtYWxUaW1lKTtcbiAgICB2YXIgZW5kID0gRGF0ZS5wYXJzZShkLm5vcm1hbEVuZCk7XG4gICAgdmFyIGRpZmYgPSBlbmQgLSBzdGFydDtcbiAgICB2YXIgZHVyID0gRHVyYXRpb24ucGFyc2UoZGlmZiArICdtcycpO1xuICAgIHZhciBob3VycyA9IGR1ci5ob3VycygpO1xuICAgIHZhciBtaW51dGVzID0gZHVyLm1pbnV0ZXMoKSAtIChob3VycyAqIDYwKTtcbiAgICBpZiAoaG91cnMgIT09IDApIHtcbiAgICAgIGlmIChob3VycyA9PT0gMSkge1xuICAgICAgICBzd2l0Y2gobWludXRlcykge1xuICAgICAgICAgIGNhc2UgMDogcmV0dXJuICdvdmVyICcgKyBob3VycyArICcgaHInO1xuICAgICAgICAgIGNhc2UgMTU6IHJldHVybiAnb3ZlciAnICsgaG91cnMgKyBRVUFSVEVSICsgJyBocic7XG4gICAgICAgICAgY2FzZSAyMDogcmV0dXJuICdvdmVyICcgKyBob3VycyArIFRISVJEICsgJyBocic7XG4gICAgICAgICAgY2FzZSAzMDogcmV0dXJuICdvdmVyICcgKyBob3VycyArIEhBTEYgKyAnIGhyJztcbiAgICAgICAgICBjYXNlIDQwOiByZXR1cm4gJ292ZXIgJyArIGhvdXJzICsgVFdPX1RISVJEUyArICcgaHInO1xuICAgICAgICAgIGNhc2UgNDU6IHJldHVybiAnb3ZlciAnICsgaG91cnMgKyBUSFJFRV9RVUFSVEVSICsgJyBocic7XG4gICAgICAgICAgZGVmYXVsdDogcmV0dXJuICdvdmVyICcgKyBob3VycyArICcgaHIgJyArIG1pbnV0ZXMgKyAnIG1pbic7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBzd2l0Y2gobWludXRlcykge1xuICAgICAgICAgIGNhc2UgMDogcmV0dXJuICdvdmVyICcgKyBob3VycyArICcgaHJzJztcbiAgICAgICAgICBjYXNlIDE1OiByZXR1cm4gJ292ZXIgJyArIGhvdXJzICsgUVVBUlRFUiArICcgaHJzJztcbiAgICAgICAgICBjYXNlIDIwOiByZXR1cm4gJ292ZXIgJyArIGhvdXJzICsgVEhJUkQgKyAnIGhycyc7XG4gICAgICAgICAgY2FzZSAzMDogcmV0dXJuICdvdmVyICcgKyBob3VycyArIEhBTEYgKyAnIGhycyc7XG4gICAgICAgICAgY2FzZSA0MDogcmV0dXJuICdvdmVyICcgKyBob3VycyArIFRXT19USElSRFMgKyAnIGhycyc7XG4gICAgICAgICAgY2FzZSA0NTogcmV0dXJuICdvdmVyICcgKyBob3VycyArIFRIUkVFX1FVQVJURVIgKyAnIGhycyc7XG4gICAgICAgICAgZGVmYXVsdDogcmV0dXJuICdvdmVyICcgKyBob3VycyArICcgaHJzICcgKyBtaW51dGVzICsgJyBtaW4nO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcmV0dXJuICdvdmVyICcgKyBtaW51dGVzICsgJyBtaW4nO1xuICAgIH1cbiAgfTtcblxuICBiYXNhbC53aWR0aCA9IGZ1bmN0aW9uKGQpIHtcbiAgICByZXR1cm4gb3B0cy54U2NhbGUobmV3IERhdGUoZC5ub3JtYWxFbmQpKSAtIG9wdHMueFNjYWxlKG5ldyBEYXRlKGQubm9ybWFsVGltZSkpO1xuICB9O1xuXG4gIGJhc2FsLmFkZFRvb2x0aXAgPSBmdW5jdGlvbihkLCBjYXRlZ29yeSwgdW5EKSB7XG4gICAgdmFyIHRvb2x0aXBIZWlnaHQgPSBvcHRzLmNsYXNzZXNbY2F0ZWdvcnldLmhlaWdodDtcbiAgICBkMy5zZWxlY3QoJyMnICsgJ2QzLXRvb2x0aXAtZ3JvdXBfYmFzYWwnKS5jYWxsKHRvb2x0aXBzLFxuICAgICAgICBkLFxuICAgICAgICAvLyB0b29sdGlwWFBvc1xuICAgICAgICBvcHRzLnhTY2FsZShEYXRlLnBhcnNlKGQubm9ybWFsVGltZSkpLFxuICAgICAgICAnYmFzYWwnLFxuICAgICAgICAvLyB0aW1lc3RhbXBcbiAgICAgICAgZmFsc2UsXG4gICAgICAgIG9wdHMuY2xhc3Nlc1tjYXRlZ29yeV1bJ3Rvb2x0aXAnXSxcbiAgICAgICAgb3B0cy50b29sdGlwV2lkdGgsXG4gICAgICAgIHRvb2x0aXBIZWlnaHQsXG4gICAgICAgIC8vIGltYWdlWFxuICAgICAgICBvcHRzLnhTY2FsZShEYXRlLnBhcnNlKGQubm9ybWFsVGltZSkpIC0gb3B0cy50b29sdGlwV2lkdGggLyAyICsgYmFzYWwud2lkdGgoZCkgLyAyLFxuICAgICAgICAvLyBpbWFnZVlcbiAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIHkgPSBvcHRzLnlTY2FsZShkLnZhbHVlKSAtIHRvb2x0aXBIZWlnaHQgKiAyO1xuICAgICAgICAgIGlmICh5IDwgMCkge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICAvLyB0ZXh0WFxuICAgICAgICBvcHRzLnhTY2FsZShEYXRlLnBhcnNlKGQubm9ybWFsVGltZSkpICsgYmFzYWwud2lkdGgoZCkgLyAyLFxuICAgICAgICAvLyB0ZXh0WVxuICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgeSA9IG9wdHMueVNjYWxlKGQudmFsdWUpIC0gdG9vbHRpcEhlaWdodCAqIDI7XG4gICAgICAgICAgaWYgKGNhdGVnb3J5ID09PSAndGVtcCcpIHtcbiAgICAgICAgICAgIGlmICh5IDwgMCkge1xuICAgICAgICAgICAgICByZXR1cm4gdG9vbHRpcEhlaWdodCAqICgzIC8gMTApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIHJldHVybiBvcHRzLnlTY2FsZShkLnZhbHVlKSAtIHRvb2x0aXBIZWlnaHQgKiAxLjc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaWYgKHkgPCAwKSB7XG4gICAgICAgICAgICAgIHJldHVybiB0b29sdGlwSGVpZ2h0IC8gMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICByZXR1cm4gb3B0cy55U2NhbGUoZC52YWx1ZSkgLSB0b29sdGlwSGVpZ2h0ICogMS41O1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKGQudmFsdWUgPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiAnMC4wVSc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGQudmFsdWUgKyAnVSc7XG4gICAgICAgICAgfVxuICAgICAgICB9KCksXG4gICAgICAgIGJhc2FsLnRpbWVzcGFuKGQpKTtcbiAgICBpZiAoY2F0ZWdvcnkgPT09ICd0ZW1wJykge1xuICAgICAgZDMuc2VsZWN0KCcjdG9vbHRpcF8nICsgZC5pZCkuc2VsZWN0KCcuZDMtdG9vbHRpcC10ZXh0LWdyb3VwJykuYXBwZW5kKCd0ZXh0JylcbiAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICdjbGFzcyc6ICdkMy10b29sdGlwLXRleHQgZDMtYmFzYWwnLFxuICAgICAgICAgICd4Jzogb3B0cy54U2NhbGUoRGF0ZS5wYXJzZShkLm5vcm1hbFRpbWUpKSArIGJhc2FsLndpZHRoKGQpIC8gMixcbiAgICAgICAgICAneSc6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHkgPSBvcHRzLnlTY2FsZShkLnZhbHVlKSAtIHRvb2x0aXBIZWlnaHQgKiAyO1xuICAgICAgICAgICAgaWYgKHkgPCAwKSB7XG4gICAgICAgICAgICAgIHJldHVybiB0b29sdGlwSGVpZ2h0ICogKDcgLyAxMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG9wdHMueVNjYWxlKGQudmFsdWUpIC0gdG9vbHRpcEhlaWdodCAqIDEuMztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIC5hcHBlbmQoJ3RzcGFuJylcbiAgICAgICAgLnRleHQoJygnICsgdW5ELnZhbHVlICsgJ1Ugc2NoZWR1bGVkKScpO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4gYmFzYWw7XG59O1xuIiwiLyogXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqIENvcHlyaWdodCAoYykgMjAxNCwgVGlkZXBvb2wgUHJvamVjdFxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTsgeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeSBpdCB1bmRlclxuICogdGhlIHRlcm1zIG9mIHRoZSBhc3NvY2lhdGVkIExpY2Vuc2UsIHdoaWNoIGlzIGlkZW50aWNhbCB0byB0aGUgQlNEIDItQ2xhdXNlXG4gKiBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieSB0aGUgT3BlbiBTb3VyY2UgSW5pdGlhdGl2ZSBhdCBvcGVuc291cmNlLm9yZy5cbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsIGJ1dCBXSVRIT1VUXG4gKiBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTU1xuICogRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiBTZWUgdGhlIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqIFxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbTsgaWZcbiAqIG5vdCwgeW91IGNhbiBvYnRhaW4gb25lIGZyb20gVGlkZXBvb2wgUHJvamVjdCBhdCB0aWRlcG9vbC5vcmcuXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqL1xuXG52YXIgRHVyYXRpb24gPSByZXF1aXJlKCcuLi9saWIvZHVyYXRpb24nKTtcbnZhciBsb2cgPSByZXF1aXJlKCcuLi9saWIvYm93cycpKCdCb2x1cycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHBvb2wsIG9wdHMpIHtcblxuICB2YXIgUVVBUlRFUiA9ICcgwrwnLCBIQUxGID0gJyDCvScsIFRIUkVFX1FVQVJURVIgPSAnIMK+JywgVEhJUkQgPSAnIOKFkycsIFRXT19USElSRFMgPSAnIOKFlCc7XG5cbiAgdmFyIE1TX0lOX09ORSA9IDYwMDAwO1xuXG4gIG9wdHMgPSBvcHRzIHx8IHt9O1xuXG4gIHZhciBkZWZhdWx0cyA9IHtcbiAgICBjbGFzc2VzOiB7XG4gICAgICAndW5zcGVjaWFsJzogeyd0b29sdGlwJzogJ3Rvb2x0aXBfYm9sdXNfc21hbGwuc3ZnJywgJ3dpZHRoJzogNzAsICdoZWlnaHQnOiAyNH0sXG4gICAgICAndHdvLWxpbmUnOiB7J3Rvb2x0aXAnOiAndG9vbHRpcF9ib2x1c19sYXJnZS5zdmcnLCAnd2lkdGgnOiA5OCwgJ2hlaWdodCc6IDM5fSxcbiAgICAgICd0aHJlZS1saW5lJzogeyd0b29sdGlwJzogJ3Rvb2x0aXBfYm9sdXNfZXh0cmFsYXJnZS5zdmcnLCAnd2lkdGgnOiA5OCwgJ2hlaWdodCc6IDU4fVxuICAgIH0sXG4gICAgeFNjYWxlOiBwb29sLnhTY2FsZSgpLmNvcHkoKSxcbiAgICB3aWR0aDogMTIsXG4gICAgYm9sdXNTdHJva2U6IDIsXG4gICAgdHJpYW5nbGVTaXplOiA2LFxuICAgIGNhcmJUb29sdGlwQ2F0Y2hlcjogNVxuICB9O1xuXG4gIF8uZGVmYXVsdHMob3B0cywgZGVmYXVsdHMpO1xuXG4gIHZhciBjYXJiVG9vbHRpcEJ1ZmZlciA9IG9wdHMuY2FyYlRvb2x0aXBDYXRjaGVyICogTVNfSU5fT05FO1xuXG4gIC8vIGNhdGNoIGJvbHVzIHRvb2x0aXBzIGV2ZW50c1xuICBvcHRzLmVtaXR0ZXIub24oJ2NhcmJUb29sdGlwT24nLCBmdW5jdGlvbih0KSB7XG4gICAgdmFyIGIgPSBfLmZpbmQob3B0cy5kYXRhLCBmdW5jdGlvbihkKSB7XG4gICAgICB2YXIgYm9sdXNUID0gRGF0ZS5wYXJzZShkLm5vcm1hbFRpbWUpO1xuICAgICAgaWYgKGJvbHVzVCA+PSAodCAtIGNhcmJUb29sdGlwQnVmZmVyKSAmJiAoYm9sdXNUIDw9ICh0ICsgY2FyYlRvb2x0aXBCdWZmZXIpKSkge1xuICAgICAgICByZXR1cm4gZDtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoYikge1xuICAgICAgYm9sdXMuYWRkVG9vbHRpcChiLCBib2x1cy5nZXRUb29sdGlwQ2F0ZWdvcnkoYikpO1xuICAgICAgb3B0cy5lbWl0dGVyLmVtaXQoJ25vQ2FyYlRpbWVzdGFtcCcsIHRydWUpO1xuICAgIH1cbiAgfSk7XG4gIG9wdHMuZW1pdHRlci5vbignY2FyYlRvb2x0aXBPZmYnLCBmdW5jdGlvbih0KSB7XG4gICAgdmFyIGIgPSBfLmZpbmQob3B0cy5kYXRhLCBmdW5jdGlvbihkKSB7XG4gICAgICB2YXIgYm9sdXNUID0gRGF0ZS5wYXJzZShkLm5vcm1hbFRpbWUpO1xuICAgICAgaWYgKGJvbHVzVCA+PSAodCAtIGNhcmJUb29sdGlwQnVmZmVyKSAmJiAoYm9sdXNUIDw9ICh0ICsgY2FyYlRvb2x0aXBCdWZmZXIpKSkge1xuICAgICAgICByZXR1cm4gZDtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoYikge1xuICAgICAgZDMuc2VsZWN0KCcjdG9vbHRpcF8nICsgYi5pZCkucmVtb3ZlKCk7XG4gICAgICBvcHRzLmVtaXR0ZXIuZW1pdCgnbm9DYXJiVGltZXN0YW1wJywgZmFsc2UpO1xuICAgIH1cbiAgfSk7XG5cbiAgZnVuY3Rpb24gYm9sdXMoc2VsZWN0aW9uKSB7XG4gICAgc2VsZWN0aW9uLmVhY2goZnVuY3Rpb24oY3VycmVudERhdGEpIHtcbiAgICAgIHZhciBib2x1c2VzID0gZDMuc2VsZWN0KHRoaXMpXG4gICAgICAgIC5zZWxlY3RBbGwoJ2cnKVxuICAgICAgICAuZGF0YShjdXJyZW50RGF0YSwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgIHJldHVybiBkLmlkO1xuICAgICAgICB9KTtcbiAgICAgIHZhciBib2x1c0dyb3VwcyA9IGJvbHVzZXMuZW50ZXIoKVxuICAgICAgICAuYXBwZW5kKCdnJylcbiAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICdjbGFzcyc6ICdkMy1ib2x1cy1ncm91cCdcbiAgICAgICAgfSk7XG4gICAgICB2YXIgdG9wID0gb3B0cy55U2NhbGUucmFuZ2UoKVswXTtcbiAgICAgIC8vIGJvbHVzZXMgd2hlcmUgZGVsaXZlcmVkID0gcmVjb21tZW5kZWRcbiAgICAgIGJvbHVzR3JvdXBzLmFwcGVuZCgncmVjdCcpXG4gICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAneCc6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHJldHVybiBib2x1cy54KGQpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgJ3knOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICByZXR1cm4gb3B0cy55U2NhbGUoZC52YWx1ZSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICAnd2lkdGgnOiBvcHRzLndpZHRoLFxuICAgICAgICAgICdoZWlnaHQnOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICByZXR1cm4gdG9wIC0gb3B0cy55U2NhbGUoZC52YWx1ZSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICAnY2xhc3MnOiAnZDMtcmVjdC1ib2x1cyBkMy1ib2x1cycsXG4gICAgICAgICAgJ2lkJzogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgcmV0dXJuICdib2x1c18nICsgZC5pZDtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgLy8gYm9sdXNlcyB3aGVyZSByZWNvbW1lbmRhdGlvbiBhbmQgZGVsaXZlcnkgZGlmZmVyXG4gICAgICB2YXIgYm90dG9tID0gdG9wIC0gb3B0cy5ib2x1c1N0cm9rZSAvIDI7XG4gICAgICAvLyBib2x1c2VzIHdoZXJlIHJlY29tbWVuZGVkID4gZGVsaXZlcmVkXG4gICAgICB2YXIgdW5kZXJyaWRlID0gYm9sdXNHcm91cHMuZmlsdGVyKGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgaWYgKGQucmVjb21tZW5kZWQgPiBkLnZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGQ7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgdW5kZXJyaWRlLmFwcGVuZCgncmVjdCcpXG4gICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAneCc6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHJldHVybiBib2x1cy54KGQpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgJ3knOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICByZXR1cm4gb3B0cy55U2NhbGUoZC5yZWNvbW1lbmRlZCk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICAnd2lkdGgnOiBvcHRzLndpZHRoLFxuICAgICAgICAgICdoZWlnaHQnOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICByZXR1cm4gb3B0cy55U2NhbGUoZC52YWx1ZSkgLSBvcHRzLnlTY2FsZShkLnJlY29tbWVuZGVkKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgICdjbGFzcyc6ICdkMy1yZWN0LXJlY29tbWVuZGVkIGQzLWJvbHVzJyxcbiAgICAgICAgICAnaWQnOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2JvbHVzXycgKyBkLmlkO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAvLyBib2x1c2VzIHdoZXJlIGRlbGl2ZXJlZCA+IHJlY29tbWVuZGVkXG4gICAgICB2YXIgb3ZlcnJpZGUgPSBib2x1c0dyb3Vwcy5maWx0ZXIoZnVuY3Rpb24oZCkge1xuICAgICAgICBpZiAoZC52YWx1ZSA+IGQucmVjb21tZW5kZWQpIHtcbiAgICAgICAgICByZXR1cm4gZDtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBvdmVycmlkZS5hcHBlbmQoJ3JlY3QnKVxuICAgICAgICAuYXR0cih7XG4gICAgICAgICAgJ3gnOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICByZXR1cm4gYm9sdXMueChkKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgICd5JzogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgcmV0dXJuIG9wdHMueVNjYWxlKGQucmVjb21tZW5kZWQpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgJ3dpZHRoJzogb3B0cy53aWR0aCxcbiAgICAgICAgICAnaGVpZ2h0JzogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRvcCAtIG9wdHMueVNjYWxlKGQucmVjb21tZW5kZWQpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgJ3N0cm9rZS13aWR0aCc6IG9wdHMuYm9sdXNTdHJva2UsXG4gICAgICAgICAgJ2NsYXNzJzogJ2QzLXJlY3QtcmVjb21tZW5kZWQgZDMtYm9sdXMnLFxuICAgICAgICAgICdpZCc6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHJldHVybiAnYm9sdXNfJyArIGQuaWQ7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIG92ZXJyaWRlLmFwcGVuZCgncGF0aCcpXG4gICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAnZCc6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHZhciBsZWZ0RWRnZSA9IGJvbHVzLngoZCkgKyBvcHRzLmJvbHVzU3Ryb2tlIC8gMjtcbiAgICAgICAgICAgIHZhciByaWdodEVkZ2UgPSBsZWZ0RWRnZSArIG9wdHMud2lkdGggLSBvcHRzLmJvbHVzU3Ryb2tlO1xuICAgICAgICAgICAgdmFyIGJvbHVzSGVpZ2h0ID0gb3B0cy55U2NhbGUoZC52YWx1ZSkgKyBvcHRzLmJvbHVzU3Ryb2tlIC8gMjtcbiAgICAgICAgICAgIHJldHVybiBcIk1cIiArIGxlZnRFZGdlICsgJyAnICsgYm90dG9tICsgXCJMXCIgKyByaWdodEVkZ2UgKyAnICcgKyBib3R0b20gKyBcIkxcIiArIHJpZ2h0RWRnZSArICcgJyArIGJvbHVzSGVpZ2h0ICsgXCJMXCIgKyBsZWZ0RWRnZSArICcgJyArIGJvbHVzSGVpZ2h0ICsgXCJaXCI7XG4gICAgICAgICAgfSxcbiAgICAgICAgICAnc3Ryb2tlLXdpZHRoJzogb3B0cy5ib2x1c1N0cm9rZSxcbiAgICAgICAgICAnY2xhc3MnOiAnZDMtcGF0aC1ib2x1cyBkMy1ib2x1cycsXG4gICAgICAgICAgJ2lkJzogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgcmV0dXJuICdib2x1c18nICsgZC5pZDtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgLy8gc3F1YXJlLSBhbmQgZHVhbC13YXZlIGJvbHVzZXNcbiAgICAgIHZhciBleHRlbmRlZEJvbHVzZXMgPSBib2x1c0dyb3Vwcy5maWx0ZXIoZnVuY3Rpb24oZCkge1xuICAgICAgICBpZiAoZC5leHRlbmRlZCkge1xuICAgICAgICAgIHJldHVybiBkO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGV4dGVuZGVkQm9sdXNlcy5hcHBlbmQoJ3BhdGgnKVxuICAgICAgICAuYXR0cih7XG4gICAgICAgICAgJ2QnOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICB2YXIgcmlnaHRFZGdlID0gYm9sdXMueChkKSArIG9wdHMud2lkdGg7XG4gICAgICAgICAgICB2YXIgZG9zZUhlaWdodCA9IG9wdHMueVNjYWxlKGQuZXh0ZW5kZWREZWxpdmVyeSkgKyBvcHRzLmJvbHVzU3Ryb2tlIC8gMjtcbiAgICAgICAgICAgIHZhciBkb3NlRW5kID0gb3B0cy54U2NhbGUoRGF0ZS5wYXJzZShkLm5vcm1hbFRpbWUpICsgZC5kdXJhdGlvbikgLSBvcHRzLnRyaWFuZ2xlU2l6ZSAvIDI7XG4gICAgICAgICAgICByZXR1cm4gXCJNXCIgKyByaWdodEVkZ2UgKyAnICcgKyBkb3NlSGVpZ2h0ICsgXCJMXCIgKyBkb3NlRW5kICsgJyAnICsgZG9zZUhlaWdodDtcbiAgICAgICAgICB9LFxuICAgICAgICAgICdzdHJva2Utd2lkdGgnOiBvcHRzLmJvbHVzU3Ryb2tlLFxuICAgICAgICAgICdjbGFzcyc6ICdkMy1wYXRoLWV4dGVuZGVkIGQzLWJvbHVzJyxcbiAgICAgICAgICAnaWQnOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2JvbHVzXycgKyBkLmlkO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICBleHRlbmRlZEJvbHVzZXMuYXBwZW5kKCdwYXRoJylcbiAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICdkJzogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgdmFyIGRvc2VIZWlnaHQgPSBvcHRzLnlTY2FsZShkLmV4dGVuZGVkRGVsaXZlcnkpICsgb3B0cy5ib2x1c1N0cm9rZSAvIDI7XG4gICAgICAgICAgICB2YXIgZG9zZUVuZCA9IG9wdHMueFNjYWxlKERhdGUucGFyc2UoZC5ub3JtYWxUaW1lKSArIGQuZHVyYXRpb24pIC0gb3B0cy50cmlhbmdsZVNpemU7XG4gICAgICAgICAgICByZXR1cm4gYm9sdXMudHJpYW5nbGUoZG9zZUVuZCwgZG9zZUhlaWdodCk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICAnc3Ryb2tlLXdpZHRoJzogb3B0cy5ib2x1c1N0cm9rZSxcbiAgICAgICAgICAnY2xhc3MnOiAnZDMtcGF0aC1leHRlbmRlZC10cmlhbmdsZSBkMy1ib2x1cycsXG4gICAgICAgICAgJ2lkJzogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgcmV0dXJuICdib2x1c18nICsgZC5pZDtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgYm9sdXNlcy5leGl0KCkucmVtb3ZlKCk7XG5cbiAgICAgIC8vIHRvb2x0aXBzXG4gICAgICBkMy5zZWxlY3RBbGwoJy5kMy1yZWN0LWJvbHVzLCAuZDMtcmVjdC1yZWNvbW1lbmRlZCcpLm9uKCdtb3VzZW92ZXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGQgPSBkMy5zZWxlY3QodGhpcykuZGF0dW0oKTtcbiAgICAgICAgdmFyIHQgPSBEYXRlLnBhcnNlKGQubm9ybWFsVGltZSk7XG4gICAgICAgIGJvbHVzLmFkZFRvb2x0aXAoZCwgYm9sdXMuZ2V0VG9vbHRpcENhdGVnb3J5KGQpKTtcbiAgICAgICAgb3B0cy5lbWl0dGVyLmVtaXQoJ2JvbHVzVG9vbHRpcE9uJywgdCk7XG4gICAgICB9KTtcbiAgICAgIGQzLnNlbGVjdEFsbCgnLmQzLXJlY3QtYm9sdXMsIC5kMy1yZWN0LXJlY29tbWVuZGVkJykub24oJ21vdXNlb3V0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBkID0gXy5jbG9uZShkMy5zZWxlY3QodGhpcykuZGF0dW0oKSk7XG4gICAgICAgIHZhciB0ID0gRGF0ZS5wYXJzZShkLm5vcm1hbFRpbWUpO1xuICAgICAgICBkMy5zZWxlY3QoJyN0b29sdGlwXycgKyBkLmlkKS5yZW1vdmUoKTtcbiAgICAgICAgb3B0cy5lbWl0dGVyLmVtaXQoJ2JvbHVzVG9vbHRpcE9mZicsIHQpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBib2x1cy5nZXRUb29sdGlwQ2F0ZWdvcnkgPSBmdW5jdGlvbihkKSB7XG4gICAgdmFyIGNhdGVnb3J5O1xuICAgIGlmICgoKGQucmVjb21tZW5kZWQgPT09IG51bGwpIHx8IChkLnJlY29tbWVuZGVkID09PSBkLnZhbHVlKSkgJiYgIWQuZXh0ZW5kZWQpIHtcbiAgICAgIGNhdGVnb3J5ID0gJ3Vuc3BlY2lhbCc7XG4gICAgfVxuICAgIGVsc2UgaWYgKChkLnJlY29tbWVuZGVkICE9PSBkLnZhbHVlKSAmJiBkLmV4dGVuZGVkKSB7XG4gICAgICBjYXRlZ29yeSA9ICd0aHJlZS1saW5lJztcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBjYXRlZ29yeSA9ICd0d28tbGluZSc7XG4gICAgfVxuICAgIHJldHVybiBjYXRlZ29yeTtcbiAgfTtcblxuICBib2x1cy5hZGRUb29sdGlwID0gZnVuY3Rpb24oZCwgY2F0ZWdvcnkpIHtcbiAgICB2YXIgdG9vbHRpcFdpZHRoID0gb3B0cy5jbGFzc2VzW2NhdGVnb3J5XS53aWR0aDtcbiAgICB2YXIgdG9vbHRpcEhlaWdodCA9IG9wdHMuY2xhc3Nlc1tjYXRlZ29yeV0uaGVpZ2h0O1xuICAgIGQzLnNlbGVjdCgnIycgKyAnZDMtdG9vbHRpcC1ncm91cF9ib2x1cycpXG4gICAgICAuY2FsbCh0b29sdGlwcyxcbiAgICAgICAgZCxcbiAgICAgICAgLy8gdG9vbHRpcFhQb3NcbiAgICAgICAgb3B0cy54U2NhbGUoRGF0ZS5wYXJzZShkLm5vcm1hbFRpbWUpKSxcbiAgICAgICAgJ2JvbHVzJyxcbiAgICAgICAgLy8gdGltZXN0YW1wXG4gICAgICAgIHRydWUsXG4gICAgICAgIG9wdHMuY2xhc3Nlc1tjYXRlZ29yeV1bJ3Rvb2x0aXAnXSxcbiAgICAgICAgdG9vbHRpcFdpZHRoLFxuICAgICAgICB0b29sdGlwSGVpZ2h0LFxuICAgICAgICAvLyBpbWFnZVhcbiAgICAgICAgb3B0cy54U2NhbGUoRGF0ZS5wYXJzZShkLm5vcm1hbFRpbWUpKSxcbiAgICAgICAgLy8gaW1hZ2VZXG4gICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiBwb29sLmhlaWdodCgpIC0gdG9vbHRpcEhlaWdodDtcbiAgICAgICAgfSxcbiAgICAgICAgLy8gdGV4dFhcbiAgICAgICAgb3B0cy54U2NhbGUoRGF0ZS5wYXJzZShkLm5vcm1hbFRpbWUpKSArIHRvb2x0aXBXaWR0aCAvIDIsXG4gICAgICAgIC8vIHRleHRZXG4gICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmIChjYXRlZ29yeSA9PT0gJ3Vuc3BlY2lhbCcpIHtcbiAgICAgICAgICAgIHJldHVybiBwb29sLmhlaWdodCgpIC0gdG9vbHRpcEhlaWdodCAqICg5LzE2KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoY2F0ZWdvcnkgPT09ICd0d28tbGluZScpIHtcbiAgICAgICAgICAgIHJldHVybiBwb29sLmhlaWdodCgpIC0gdG9vbHRpcEhlaWdodCAqICgzLzQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmIChjYXRlZ29yeSA9PT0gJ3RocmVlLWxpbmUnKSB7XG4gICAgICAgICAgICByZXR1cm4gcG9vbC5oZWlnaHQoKSAtIHRvb2x0aXBIZWlnaHQgKiAoMTMvMTYpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBwb29sLmhlaWdodCgpIC0gdG9vbHRpcEhlaWdodDtcbiAgICAgICAgICB9XG4gICAgICAgICAgXG4gICAgICAgIH0sXG4gICAgICAgIC8vIGN1c3RvbVRleHRcbiAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIGQudmFsdWUgKyAnVSc7XG4gICAgICAgIH0oKSxcbiAgICAgICAgLy8gdHNwYW5cbiAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKGQuZXh0ZW5kZWQpIHtcbiAgICAgICAgICAgIHJldHVybiAnIHRvdGFsJztcbiAgICAgICAgICB9XG4gICAgICAgIH0oKVxuICAgICAgKTtcblxuICAgIGlmIChjYXRlZ29yeSA9PT0gJ3R3by1saW5lJykge1xuICAgICAgZDMuc2VsZWN0KCcjdG9vbHRpcF8nICsgZC5pZCkuc2VsZWN0KCcuZDMtdG9vbHRpcC10ZXh0LWdyb3VwJykuYXBwZW5kKCd0ZXh0JylcbiAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICdjbGFzcyc6ICdkMy10b29sdGlwLXRleHQgZDMtYm9sdXMnLFxuICAgICAgICAgICd4Jzogb3B0cy54U2NhbGUoRGF0ZS5wYXJzZShkLm5vcm1hbFRpbWUpKSArIHRvb2x0aXBXaWR0aCAvIDIsXG4gICAgICAgICAgJ3knOiBwb29sLmhlaWdodCgpIC0gdG9vbHRpcEhlaWdodCAvIDNcbiAgICAgICAgfSlcbiAgICAgICAgLmFwcGVuZCgndHNwYW4nKVxuICAgICAgICAudGV4dChmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoZC5yZWNvbW1lbmRlZCAhPT0gZC52YWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuIGQucmVjb21tZW5kZWQgKyBcIlUgcmVjb20nZFwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmIChkLmV4dGVuZGVkKSB7XG4gICAgICAgICAgICByZXR1cm4gZC5leHRlbmRlZERlbGl2ZXJ5ICsgJ1UgJyArIGJvbHVzLnRpbWVzcGFuKGQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ2QzLWJvbHVzJyk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGNhdGVnb3J5ID09PSAndGhyZWUtbGluZScpIHtcbiAgICAgIGQzLnNlbGVjdCgnI3Rvb2x0aXBfJyArIGQuaWQpLnNlbGVjdCgnLmQzLXRvb2x0aXAtdGV4dC1ncm91cCcpLmFwcGVuZCgndGV4dCcpXG4gICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAnY2xhc3MnOiAnZDMtdG9vbHRpcC10ZXh0IGQzLWJvbHVzJyxcbiAgICAgICAgICAneCc6IG9wdHMueFNjYWxlKERhdGUucGFyc2UoZC5ub3JtYWxUaW1lKSkgKyB0b29sdGlwV2lkdGggLyAyLFxuICAgICAgICAgICd5JzogcG9vbC5oZWlnaHQoKSAtIHRvb2x0aXBIZWlnaHQgLyAyXG4gICAgICAgIH0pXG4gICAgICAgIC5hcHBlbmQoJ3RzcGFuJylcbiAgICAgICAgLnRleHQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIGQucmVjb21tZW5kZWQgKyBcIlUgcmVjb20nZFwiO1xuICAgICAgICB9KVxuICAgICAgICAuYXR0cignY2xhc3MnLCAnZDMtYm9sdXMnKTtcblxuICAgICAgZDMuc2VsZWN0KCcjdG9vbHRpcF8nICsgZC5pZCkuc2VsZWN0KCcuZDMtdG9vbHRpcC10ZXh0LWdyb3VwJykuYXBwZW5kKCd0ZXh0JylcbiAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICdjbGFzcyc6ICdkMy10b29sdGlwLXRleHQgZDMtYm9sdXMnLFxuICAgICAgICAgICd4Jzogb3B0cy54U2NhbGUoRGF0ZS5wYXJzZShkLm5vcm1hbFRpbWUpKSArIHRvb2x0aXBXaWR0aCAvIDIsXG4gICAgICAgICAgJ3knOiBwb29sLmhlaWdodCgpIC0gdG9vbHRpcEhlaWdodCAvIDRcbiAgICAgICAgfSlcbiAgICAgICAgLmFwcGVuZCgndHNwYW4nKVxuICAgICAgICAudGV4dChmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gZC5leHRlbmRlZERlbGl2ZXJ5ICsgJ1UgJyArIGJvbHVzLnRpbWVzcGFuKGQpO1xuICAgICAgICB9KVxuICAgICAgICAuYXR0cignY2xhc3MnLCAnZDMtYm9sdXMnKTtcbiAgICB9XG4gIH07XG5cbiAgYm9sdXMudGltZXNwYW4gPSBmdW5jdGlvbihkKSB7XG4gICAgdmFyIGR1ciA9IER1cmF0aW9uLnBhcnNlKGQuZHVyYXRpb24gKyAnbXMnKTtcbiAgICB2YXIgaG91cnMgPSBkdXIuaG91cnMoKTtcbiAgICB2YXIgbWludXRlcyA9IGR1ci5taW51dGVzKCkgLSAoaG91cnMgKiA2MCk7XG4gICAgaWYgKGhvdXJzICE9PSAwKSB7XG4gICAgICBpZiAoaG91cnMgPT09IDEpIHtcbiAgICAgICAgc3dpdGNoKG1pbnV0ZXMpIHtcbiAgICAgICAgICBjYXNlIDA6IHJldHVybiAnb3ZlciAnICsgaG91cnMgKyAnIGhyJztcbiAgICAgICAgICBjYXNlIDE1OiByZXR1cm4gJ292ZXIgJyArIGhvdXJzICsgUVVBUlRFUiArICcgaHInO1xuICAgICAgICAgIGNhc2UgMjA6IHJldHVybiAnb3ZlciAnICsgaG91cnMgKyBUSElSRCArICcgaHInO1xuICAgICAgICAgIGNhc2UgMzA6IHJldHVybiAnb3ZlciAnICsgaG91cnMgKyBIQUxGICsgJyBocic7XG4gICAgICAgICAgY2FzZSA0MDogcmV0dXJuICdvdmVyICcgKyBob3VycyArIFRXT19USElSRFMgKyAnIGhyJztcbiAgICAgICAgICBjYXNlIDQ1OiByZXR1cm4gJ292ZXIgJyArIGhvdXJzICsgVEhSRUVfUVVBUlRFUiArICcgaHInO1xuICAgICAgICAgIGRlZmF1bHQ6IHJldHVybiAnb3ZlciAnICsgaG91cnMgKyAnIGhyICcgKyBtaW51dGVzICsgJyBtaW4nO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgc3dpdGNoKG1pbnV0ZXMpIHtcbiAgICAgICAgICBjYXNlIDA6IHJldHVybiAnb3ZlciAnICsgaG91cnMgKyAnIGhycyc7XG4gICAgICAgICAgY2FzZSAxNTogcmV0dXJuICdvdmVyICcgKyBob3VycyArIFFVQVJURVIgKyAnIGhycyc7XG4gICAgICAgICAgY2FzZSAyMDogcmV0dXJuICdvdmVyICcgKyBob3VycyArIFRISVJEICsgJyBocnMnO1xuICAgICAgICAgIGNhc2UgMzA6IHJldHVybiAnb3ZlciAnICsgaG91cnMgKyBIQUxGICsgJyBocnMnO1xuICAgICAgICAgIGNhc2UgNDA6IHJldHVybiAnb3ZlciAnICsgaG91cnMgKyBUV09fVEhJUkRTICsgJyBocnMnO1xuICAgICAgICAgIGNhc2UgNDU6IHJldHVybiAnb3ZlciAnICsgaG91cnMgKyBUSFJFRV9RVUFSVEVSICsgJyBocnMnO1xuICAgICAgICAgIGRlZmF1bHQ6IHJldHVybiAnb3ZlciAnICsgaG91cnMgKyAnIGhycyAnICsgbWludXRlcyArICcgbWluJztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHJldHVybiAnb3ZlciAnICsgbWludXRlcyArICcgbWluJztcbiAgICB9XG4gIH07XG4gIFxuICBib2x1cy54ID0gZnVuY3Rpb24oZCkge1xuICAgIHJldHVybiBvcHRzLnhTY2FsZShEYXRlLnBhcnNlKGQubm9ybWFsVGltZSkpIC0gb3B0cy53aWR0aC8yO1xuICB9O1xuXG4gIGJvbHVzLnRyaWFuZ2xlID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIHZhciB0b3AgPSAoeCArIG9wdHMudHJpYW5nbGVTaXplKSArICcgJyArICh5ICsgb3B0cy50cmlhbmdsZVNpemUvMik7XG4gICAgdmFyIGJvdHRvbSA9ICh4ICsgb3B0cy50cmlhbmdsZVNpemUpICsgJyAnICsgKHkgLSBvcHRzLnRyaWFuZ2xlU2l6ZS8yKTtcbiAgICB2YXIgcG9pbnQgPSB4ICsgJyAnICsgeTtcbiAgICByZXR1cm4gXCJNXCIgKyB0b3AgKyBcIkxcIiArIGJvdHRvbSArIFwiTFwiICsgcG9pbnQgKyBcIlpcIjtcbiAgfTtcblxuICByZXR1cm4gYm9sdXM7XG59O1xuIiwiLyogXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqIENvcHlyaWdodCAoYykgMjAxNCwgVGlkZXBvb2wgUHJvamVjdFxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTsgeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeSBpdCB1bmRlclxuICogdGhlIHRlcm1zIG9mIHRoZSBhc3NvY2lhdGVkIExpY2Vuc2UsIHdoaWNoIGlzIGlkZW50aWNhbCB0byB0aGUgQlNEIDItQ2xhdXNlXG4gKiBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieSB0aGUgT3BlbiBTb3VyY2UgSW5pdGlhdGl2ZSBhdCBvcGVuc291cmNlLm9yZy5cbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsIGJ1dCBXSVRIT1VUXG4gKiBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTU1xuICogRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiBTZWUgdGhlIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqIFxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbTsgaWZcbiAqIG5vdCwgeW91IGNhbiBvYnRhaW4gb25lIGZyb20gVGlkZXBvb2wgUHJvamVjdCBhdCB0aWRlcG9vbC5vcmcuXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqL1xuXG52YXIgbG9nID0gcmVxdWlyZSgnLi4vbGliL2Jvd3MnKSgnQ2FyYnMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihwb29sLCBvcHRzKSB7XG5cbiAgdmFyIE1TX0lOX09ORSA9IDYwMDAwO1xuXG4gIG9wdHMgPSBvcHRzIHx8IHt9O1xuXG4gIHZhciBkZWZhdWx0cyA9IHtcbiAgICB4U2NhbGU6IHBvb2wueFNjYWxlKCkuY29weSgpLFxuICAgIHdpZHRoOiAxMixcbiAgICB0b29sdGlwSGVpZ2h0OiAyNCxcbiAgICB0b29sdGlwV2lkdGg6IDcwLFxuICAgIGJvbHVzVG9vbHRpcENhdGNoZXI6IDUsXG4gICAgdG9vbHRpcFRpbWVzdGFtcDogdHJ1ZVxuICB9O1xuXG4gIF8uZGVmYXVsdHMob3B0cywgZGVmYXVsdHMpO1xuXG4gIHZhciBib2x1c1Rvb2x0aXBCdWZmZXIgPSBvcHRzLmJvbHVzVG9vbHRpcENhdGNoZXIgKiBNU19JTl9PTkU7XG5cbiAgLy8gY2F0Y2ggYm9sdXMgdG9vbHRpcHMgZXZlbnRzXG4gIG9wdHMuZW1pdHRlci5vbignYm9sdXNUb29sdGlwT24nLCBmdW5jdGlvbih0KSB7XG4gICAgdmFyIGMgPSBfLmZpbmQob3B0cy5kYXRhLCBmdW5jdGlvbihkKSB7XG4gICAgICB2YXIgY2FyYlQgPSBEYXRlLnBhcnNlKGQubm9ybWFsVGltZSk7XG4gICAgICBpZiAoY2FyYlQgPj0gKHQgLSBib2x1c1Rvb2x0aXBCdWZmZXIpICYmIChjYXJiVCA8PSAodCArIGJvbHVzVG9vbHRpcEJ1ZmZlcikpKSB7XG4gICAgICAgIHJldHVybiBkO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGlmIChjKSB7XG4gICAgICBjYXJicy5hZGRUb29sdGlwKGMsIGZhbHNlKTtcbiAgICB9XG4gIH0pO1xuICBvcHRzLmVtaXR0ZXIub24oJ2JvbHVzVG9vbHRpcE9mZicsIGZ1bmN0aW9uKHQpIHtcbiAgICB2YXIgYyA9IF8uZmluZChvcHRzLmRhdGEsIGZ1bmN0aW9uKGQpIHtcbiAgICAgIHZhciBjYXJiVCA9IERhdGUucGFyc2UoZC5ub3JtYWxUaW1lKTtcbiAgICAgIGlmIChjYXJiVCA+PSAodCAtIGJvbHVzVG9vbHRpcEJ1ZmZlcikgJiYgKGNhcmJUIDw9ICh0ICsgYm9sdXNUb29sdGlwQnVmZmVyKSkpIHtcbiAgICAgICAgcmV0dXJuIGQ7XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKGMpIHtcbiAgICAgIGQzLnNlbGVjdCgnI3Rvb2x0aXBfJyArIGMuaWQpLnJlbW92ZSgpO1xuICAgIH1cbiAgfSk7XG5cbiAgb3B0cy5lbWl0dGVyLm9uKCdub0NhcmJUaW1lc3RhbXAnLCBmdW5jdGlvbihib29sKSB7XG4gICAgaWYgKGJvb2wpIHtcbiAgICAgIG9wdHMudG9vbHRpcFRpbWVzdGFtcCA9IGZhbHNlO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIG9wdHMudG9vbHRpcFRpbWVzdGFtcCA9IHRydWU7XG4gICAgfVxuICB9KTtcblxuICBmdW5jdGlvbiBjYXJicyhzZWxlY3Rpb24pIHtcbiAgICBzZWxlY3Rpb24uZWFjaChmdW5jdGlvbihjdXJyZW50RGF0YSkge1xuICAgICAgdmFyIHJlY3RzID0gZDMuc2VsZWN0KHRoaXMpXG4gICAgICAgIC5zZWxlY3RBbGwoJ3JlY3QnKVxuICAgICAgICAuZGF0YShjdXJyZW50RGF0YSwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgIHJldHVybiBkLmlkO1xuICAgICAgICB9KTtcbiAgICAgIHJlY3RzLmVudGVyKClcbiAgICAgICAgLmFwcGVuZCgncmVjdCcpXG4gICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAneCc6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHJldHVybiBvcHRzLnhTY2FsZShEYXRlLnBhcnNlKGQubm9ybWFsVGltZSkpIC0gb3B0cy53aWR0aC8yO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgJ3knOiAwLFxuICAgICAgICAgICd3aWR0aCc6IG9wdHMud2lkdGgsXG4gICAgICAgICAgJ2hlaWdodCc6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHJldHVybiBvcHRzLnlTY2FsZShkLnZhbHVlKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgICdjbGFzcyc6ICdkMy1yZWN0LWNhcmJzIGQzLWNhcmJzJyxcbiAgICAgICAgICAnaWQnOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2NhcmJzXycgKyBkLmlkO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJlY3RzLmV4aXQoKS5yZW1vdmUoKTtcblxuICAgICAgLy8gdG9vbHRpcHNcbiAgICAgIGQzLnNlbGVjdEFsbCgnLmQzLXJlY3QtY2FyYnMnKS5vbignbW91c2VvdmVyJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBkID0gZDMuc2VsZWN0KHRoaXMpLmRhdHVtKCk7XG4gICAgICAgIHZhciB0ID0gRGF0ZS5wYXJzZShkLm5vcm1hbFRpbWUpO1xuICAgICAgICBvcHRzLmVtaXR0ZXIuZW1pdCgnY2FyYlRvb2x0aXBPbicsIHQpO1xuICAgICAgICBjYXJicy5hZGRUb29sdGlwKGQsIG9wdHMudG9vbHRpcFRpbWVzdGFtcCk7XG4gICAgICB9KTtcbiAgICAgIGQzLnNlbGVjdEFsbCgnLmQzLXJlY3QtY2FyYnMnKS5vbignbW91c2VvdXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGQgPSBkMy5zZWxlY3QodGhpcykuZGF0dW0oKTtcbiAgICAgICAgdmFyIHQgPSBEYXRlLnBhcnNlKGQubm9ybWFsVGltZSk7XG4gICAgICAgIGQzLnNlbGVjdCgnI3Rvb2x0aXBfJyArIGQuaWQpLnJlbW92ZSgpO1xuICAgICAgICBvcHRzLmVtaXR0ZXIuZW1pdCgnY2FyYlRvb2x0aXBPZmYnLCB0KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgY2FyYnMuYWRkVG9vbHRpcCA9IGZ1bmN0aW9uKGQsIGNhdGVnb3J5KSB7XG4gICAgZDMuc2VsZWN0KCcjJyArICdkMy10b29sdGlwLWdyb3VwX2NhcmJzJylcbiAgICAgIC5jYWxsKHRvb2x0aXBzLFxuICAgICAgICBkLFxuICAgICAgICAvLyB0b29sdGlwWFBvc1xuICAgICAgICBvcHRzLnhTY2FsZShEYXRlLnBhcnNlKGQubm9ybWFsVGltZSkpLFxuICAgICAgICAnY2FyYnMnLFxuICAgICAgICAvLyB0aW1lc3RhbXBcbiAgICAgICAgY2F0ZWdvcnksXG4gICAgICAgICd0b29sdGlwX2NhcmJzLnN2ZycsXG4gICAgICAgIG9wdHMudG9vbHRpcFdpZHRoLFxuICAgICAgICBvcHRzLnRvb2x0aXBIZWlnaHQsXG4gICAgICAgIC8vIGltYWdlWFxuICAgICAgICBvcHRzLnhTY2FsZShEYXRlLnBhcnNlKGQubm9ybWFsVGltZSkpLFxuICAgICAgICAvLyBpbWFnZVlcbiAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKGNhdGVnb3J5KSB7XG4gICAgICAgICAgICByZXR1cm4gb3B0cy55U2NhbGUoZC52YWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG9wdHMueVNjYWxlLnJhbmdlKClbMF07XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICAvLyB0ZXh0WFxuICAgICAgICBvcHRzLnhTY2FsZShEYXRlLnBhcnNlKGQubm9ybWFsVGltZSkpICsgb3B0cy50b29sdGlwV2lkdGggLyAyLFxuICAgICAgICAvLyB0ZXh0WVxuICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoY2F0ZWdvcnkpIHtcbiAgICAgICAgICAgIHJldHVybiBvcHRzLnlTY2FsZShkLnZhbHVlKSArIG9wdHMudG9vbHRpcEhlaWdodCAvIDI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG9wdHMudG9vbHRpcEhlaWdodCAvIDI7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICAvLyBjdXN0b21UZXh0XG4gICAgICAgIGQudmFsdWUgKyAnZycpO1xuICB9O1xuXG4gIHJldHVybiBjYXJicztcbn07IiwiLyogXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqIENvcHlyaWdodCAoYykgMjAxNCwgVGlkZXBvb2wgUHJvamVjdFxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTsgeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeSBpdCB1bmRlclxuICogdGhlIHRlcm1zIG9mIHRoZSBhc3NvY2lhdGVkIExpY2Vuc2UsIHdoaWNoIGlzIGlkZW50aWNhbCB0byB0aGUgQlNEIDItQ2xhdXNlXG4gKiBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieSB0aGUgT3BlbiBTb3VyY2UgSW5pdGlhdGl2ZSBhdCBvcGVuc291cmNlLm9yZy5cbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsIGJ1dCBXSVRIT1VUXG4gKiBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTU1xuICogRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiBTZWUgdGhlIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqIFxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbTsgaWZcbiAqIG5vdCwgeW91IGNhbiBvYnRhaW4gb25lIGZyb20gVGlkZXBvb2wgUHJvamVjdCBhdCB0aWRlcG9vbC5vcmcuXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqL1xuXG52YXIgbG9nID0gcmVxdWlyZSgnLi4vbGliL2Jvd3MnKSgnQ0JHJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ocG9vbCwgb3B0cykge1xuXG4gIG9wdHMgPSBvcHRzIHx8IHt9O1xuXG4gIHZhciBjYmdDaXJjbGVzLCB0b29sdGlwcyA9IHBvb2wudG9vbHRpcHMoKTtcblxuICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgY2xhc3Nlczoge1xuICAgICAgJ2xvdyc6IHsnYm91bmRhcnknOiA4MCwgJ3Rvb2x0aXAnOiAnY2JnX3Rvb2x0aXBfbG93LnN2Zyd9LFxuICAgICAgJ3RhcmdldCc6IHsnYm91bmRhcnknOiAxODAsICd0b29sdGlwJzogJ2NiZ190b29sdGlwX3RhcmdldC5zdmcnfSxcbiAgICAgICdoaWdoJzogeydib3VuZGFyeSc6IDIwMCwgJ3Rvb2x0aXAnOiAnY2JnX3Rvb2x0aXBfaGlnaC5zdmcnfVxuICAgIH0sXG4gICAgeFNjYWxlOiBwb29sLnhTY2FsZSgpLmNvcHkoKSxcbiAgICB0b29sdGlwU2l6ZTogMjRcbiAgfTtcblxuICBfLmRlZmF1bHRzKG9wdHMsIGRlZmF1bHRzKTtcblxuICBmdW5jdGlvbiBjYmcoc2VsZWN0aW9uKSB7XG4gICAgc2VsZWN0aW9uLmVhY2goZnVuY3Rpb24oY3VycmVudERhdGEpIHtcbiAgICAgIHZhciBhbGxDQkcgPSBkMy5zZWxlY3QodGhpcykuc2VsZWN0QWxsKCdjaXJjbGUnKVxuICAgICAgICAuZGF0YShjdXJyZW50RGF0YSwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgIHJldHVybiBkLmlkO1xuICAgICAgICB9KTtcbiAgICAgIHZhciBjYmdHcm91cHMgPSBhbGxDQkcuZW50ZXIoKVxuICAgICAgICAuYXBwZW5kKCdjaXJjbGUnKVxuICAgICAgICAuYXR0cignY2xhc3MnLCAnZDMtY2JnJyk7XG4gICAgICB2YXIgY2JnTG93ID0gY2JnR3JvdXBzLmZpbHRlcihmdW5jdGlvbihkKSB7XG4gICAgICAgIGlmIChkLnZhbHVlIDw9IG9wdHMuY2xhc3Nlc1snbG93J11bJ2JvdW5kYXJ5J10pIHtcbiAgICAgICAgICByZXR1cm4gZDtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICB2YXIgY2JnVGFyZ2V0ID0gY2JnR3JvdXBzLmZpbHRlcihmdW5jdGlvbihkKSB7XG4gICAgICAgIGlmICgoZC52YWx1ZSA+IG9wdHMuY2xhc3Nlc1snbG93J11bJ2JvdW5kYXJ5J10pICYmIChkLnZhbHVlIDw9IG9wdHMuY2xhc3Nlc1sndGFyZ2V0J11bJ2JvdW5kYXJ5J10pKSB7XG4gICAgICAgICAgcmV0dXJuIGQ7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgdmFyIGNiZ0hpZ2ggPSBjYmdHcm91cHMuZmlsdGVyKGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgaWYgKGQudmFsdWUgPiBvcHRzLmNsYXNzZXNbJ3RhcmdldCddWydib3VuZGFyeSddKSB7XG4gICAgICAgICAgcmV0dXJuIGQ7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgY2JnTG93LmF0dHIoe1xuICAgICAgICAgICdjeCc6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHJldHVybiBvcHRzLnhTY2FsZShEYXRlLnBhcnNlKGQubm9ybWFsVGltZSkpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgJ2N5JzogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgcmV0dXJuIG9wdHMueVNjYWxlKGQudmFsdWUpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgJ3InOiAyLjUsXG4gICAgICAgICAgJ2lkJzogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgcmV0dXJuICdjYmdfJyArIGQuaWQ7XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICAuZGF0dW0oZnVuY3Rpb24oZCkge1xuICAgICAgICAgIHJldHVybiBkO1xuICAgICAgICB9KVxuICAgICAgICAuY2xhc3NlZCh7J2QzLWNpcmNsZS1jYmcnOiB0cnVlLCAnZDMtYmctbG93JzogdHJ1ZX0pO1xuICAgICAgY2JnVGFyZ2V0LmF0dHIoe1xuICAgICAgICAgICdjeCc6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHJldHVybiBvcHRzLnhTY2FsZShEYXRlLnBhcnNlKGQubm9ybWFsVGltZSkpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgJ2N5JzogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgcmV0dXJuIG9wdHMueVNjYWxlKGQudmFsdWUpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgJ3InOiAyLjUsXG4gICAgICAgICAgJ2lkJzogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgcmV0dXJuICdjYmdfJyArIGQuaWQ7XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICAuY2xhc3NlZCh7J2QzLWNpcmNsZS1jYmcnOiB0cnVlLCAnZDMtYmctdGFyZ2V0JzogdHJ1ZX0pO1xuICAgICAgY2JnSGlnaC5hdHRyKHtcbiAgICAgICAgICAnY3gnOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICByZXR1cm4gb3B0cy54U2NhbGUoRGF0ZS5wYXJzZShkLm5vcm1hbFRpbWUpKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgICdjeSc6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHJldHVybiBvcHRzLnlTY2FsZShkLnZhbHVlKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgICdyJzogMi41LFxuICAgICAgICAgICdpZCc6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHJldHVybiAnY2JnXycgKyBkLmlkO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgLmNsYXNzZWQoeydkMy1jaXJjbGUtY2JnJzogdHJ1ZSwgJ2QzLWJnLWhpZ2gnOiB0cnVlfSk7XG4gICAgICBhbGxDQkcuZXhpdCgpLnJlbW92ZSgpO1xuXG4gICAgICAvLyB0b29sdGlwc1xuICAgICAgZDMuc2VsZWN0QWxsKCcuZDMtY2lyY2xlLWNiZycpLm9uKCdtb3VzZW92ZXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKGQzLnNlbGVjdCh0aGlzKS5jbGFzc2VkKCdkMy1iZy1sb3cnKSkge1xuICAgICAgICAgIGNiZy5hZGRUb29sdGlwKGQzLnNlbGVjdCh0aGlzKS5kYXR1bSgpLCAnbG93Jyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZDMuc2VsZWN0KHRoaXMpLmNsYXNzZWQoJ2QzLWJnLXRhcmdldCcpKSB7XG4gICAgICAgICAgY2JnLmFkZFRvb2x0aXAoZDMuc2VsZWN0KHRoaXMpLmRhdHVtKCksICd0YXJnZXQnKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBjYmcuYWRkVG9vbHRpcChkMy5zZWxlY3QodGhpcykuZGF0dW0oKSwgJ2hpZ2gnKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBkMy5zZWxlY3RBbGwoJy5kMy1jaXJjbGUtY2JnJykub24oJ21vdXNlb3V0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBpZCA9IGQzLnNlbGVjdCh0aGlzKS5hdHRyKCdpZCcpLnJlcGxhY2UoJ2NiZ18nLCAndG9vbHRpcF8nKTtcbiAgICAgICAgZDMuc2VsZWN0KCcjJyArIGlkKS5yZW1vdmUoKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgY2JnLmFkZFRvb2x0aXAgPSBmdW5jdGlvbihkLCBjYXRlZ29yeSkge1xuICAgIGQzLnNlbGVjdCgnIycgKyAnZDMtdG9vbHRpcC1ncm91cF9jYmcnKVxuICAgICAgLmNhbGwodG9vbHRpcHMsXG4gICAgICAgIGQsXG4gICAgICAgIC8vIHRvb2x0aXBYUG9zXG4gICAgICAgIG9wdHMueFNjYWxlKERhdGUucGFyc2UoZC5ub3JtYWxUaW1lKSksXG4gICAgICAgICdjYmcnLFxuICAgICAgICAvLyB0aW1lc3RhbXBcbiAgICAgICAgZmFsc2UsXG4gICAgICAgIG9wdHMuY2xhc3Nlc1tjYXRlZ29yeV1bJ3Rvb2x0aXAnXSxcbiAgICAgICAgb3B0cy50b29sdGlwU2l6ZSxcbiAgICAgICAgb3B0cy50b29sdGlwU2l6ZSxcbiAgICAgICAgLy8gaW1hZ2VYXG4gICAgICAgIG9wdHMueFNjYWxlKERhdGUucGFyc2UoZC5ub3JtYWxUaW1lKSksXG4gICAgICAgIC8vIGltYWdlWVxuICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoKGNhdGVnb3J5ID09PSAnbG93JykgfHwgKGNhdGVnb3J5ID09PSAndGFyZ2V0JykpIHtcbiAgICAgICAgICAgIHJldHVybiBvcHRzLnlTY2FsZShkLnZhbHVlKSAtIG9wdHMudG9vbHRpcFNpemU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG9wdHMueVNjYWxlKGQudmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgLy8gdGV4dFhcbiAgICAgICAgb3B0cy54U2NhbGUoRGF0ZS5wYXJzZShkLm5vcm1hbFRpbWUpKSArIG9wdHMudG9vbHRpcFNpemUgLyAyLFxuICAgICAgICAvLyB0ZXh0WVxuICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoKGNhdGVnb3J5ID09PSAnbG93JykgfHwgKGNhdGVnb3J5ID09PSAndGFyZ2V0JykpIHtcbiAgICAgICAgICAgIHJldHVybiBvcHRzLnlTY2FsZShkLnZhbHVlKSAtIG9wdHMudG9vbHRpcFNpemUgLyAyO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBvcHRzLnlTY2FsZShkLnZhbHVlKSArIG9wdHMudG9vbHRpcFNpemUgLyAyO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gIH07XG5cbiAgcmV0dXJuIGNiZztcbn07IiwiLyogXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqIENvcHlyaWdodCAoYykgMjAxNCwgVGlkZXBvb2wgUHJvamVjdFxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTsgeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeSBpdCB1bmRlclxuICogdGhlIHRlcm1zIG9mIHRoZSBhc3NvY2lhdGVkIExpY2Vuc2UsIHdoaWNoIGlzIGlkZW50aWNhbCB0byB0aGUgQlNEIDItQ2xhdXNlXG4gKiBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieSB0aGUgT3BlbiBTb3VyY2UgSW5pdGlhdGl2ZSBhdCBvcGVuc291cmNlLm9yZy5cbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsIGJ1dCBXSVRIT1VUXG4gKiBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTU1xuICogRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiBTZWUgdGhlIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqIFxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbTsgaWZcbiAqIG5vdCwgeW91IGNhbiBvYnRhaW4gb25lIGZyb20gVGlkZXBvb2wgUHJvamVjdCBhdCB0aWRlcG9vbC5vcmcuXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqL1xuXG52YXIgbG9nID0gcmVxdWlyZSgnLi4vbGliL2Jvd3MnKSgnRmlsbCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHBvb2wsIG9wdHMpIHtcblxuICB2YXIgZmlyc3QgPSBuZXcgRGF0ZShvcHRzLmVuZHBvaW50c1swXSksXG4gICAgbGFzdCA9IG5ldyBEYXRlKG9wdHMuZW5kcG9pbnRzWzFdKSxcbiAgICBuZWFyZXN0LCBmaWxscyA9IFtdO1xuXG4gIGZpcnN0LnNldE1pbnV0ZXMoZmlyc3QuZ2V0TWludXRlcygpICsgZmlyc3QuZ2V0VGltZXpvbmVPZmZzZXQoKSk7XG4gIGxhc3Quc2V0TWludXRlcyhsYXN0LmdldE1pbnV0ZXMoKSArIGxhc3QuZ2V0VGltZXpvbmVPZmZzZXQoKSk7XG5cbiAgdmFyIGRlZmF1bHRzID0ge1xuICAgIGNsYXNzZXM6IHtcbiAgICAgIDA6ICdkYXJrZXN0JyxcbiAgICAgIDM6ICdkYXJrJyxcbiAgICAgIDY6ICdsaWdodGVyJyxcbiAgICAgIDk6ICdsaWdodCcsXG4gICAgICAxMjogJ2xpZ2h0ZXN0JyxcbiAgICAgIDE1OiAnbGlnaHRlcicsXG4gICAgICAxODogJ2RhcmsnLFxuICAgICAgMjE6ICdkYXJrZXN0J1xuICAgIH0sXG4gICAgZHVyYXRpb246IDMsXG4gICAgc2NhbGU6IHBvb2wueFNjYWxlKCkuY29weSgpLFxuICAgIGd1dHRlcjogMFxuICB9O1xuXG4gIF8uZGVmYXVsdHMob3B0cyB8fCB7fSwgZGVmYXVsdHMpO1xuXG4gIGZ1bmN0aW9uIGZpbGwoc2VsZWN0aW9uKSB7XG4gICAgZmlsbC5maW5kTmVhcmVzdChvcHRzLmVuZHBvaW50c1sxXSk7XG4gICAgdmFyIG90aGVyTmVhciA9IG5ldyBEYXRlKG5lYXJlc3QpO1xuICAgIG90aGVyTmVhci5zZXRNaW51dGVzKG90aGVyTmVhci5nZXRNaW51dGVzKCkgLSBvdGhlck5lYXIuZ2V0VGltZXpvbmVPZmZzZXQoKSk7XG4gICAgZmlsbHMucHVzaCh7XG4gICAgICB3aWR0aDogb3B0cy5zY2FsZShsYXN0KSAtIG9wdHMuc2NhbGUobmVhcmVzdCksXG4gICAgICB4OiBvcHRzLnNjYWxlKG90aGVyTmVhciksXG4gICAgICBmaWxsOiBvcHRzLmNsYXNzZXNbbmVhcmVzdC5nZXRIb3VycygpXVxuICAgIH0pO1xuICAgIGN1cnJlbnQgPSBuZXcgRGF0ZShuZWFyZXN0KTtcbiAgICB3aGlsZSAoY3VycmVudCA+IGZpcnN0KSB7XG4gICAgICB2YXIgbmV4dCA9IG5ldyBEYXRlKGN1cnJlbnQpO1xuICAgICAgbmV4dC5zZXRIb3VycyhjdXJyZW50LmdldEhvdXJzKCkgLSBvcHRzLmR1cmF0aW9uKTtcbiAgICAgIHZhciBvdGhlck5leHQgPSBuZXcgRGF0ZShuZXh0KTtcbiAgICAgIG90aGVyTmV4dC5zZXRNaW51dGVzKG90aGVyTmV4dC5nZXRNaW51dGVzKCkgLSBvdGhlck5leHQuZ2V0VGltZXpvbmVPZmZzZXQoKSk7XG4gICAgICBmaWxscy5wdXNoKHtcbiAgICAgICAgd2lkdGg6IG9wdHMuc2NhbGUoY3VycmVudCkgLSBvcHRzLnNjYWxlKG5leHQpLFxuICAgICAgICB4OiBvcHRzLnNjYWxlKG90aGVyTmV4dCksXG4gICAgICAgIGZpbGw6IG9wdHMuY2xhc3Nlc1tuZXh0LmdldEhvdXJzKCldXG4gICAgICB9KTtcbiAgICAgIGN1cnJlbnQgPSBuZXh0O1xuICAgIH1cblxuICAgIHNlbGVjdGlvbi5zZWxlY3RBbGwoJ3JlY3QnKVxuICAgICAgLmRhdGEoZmlsbHMpXG4gICAgICAuZW50ZXIoKVxuICAgICAgLmFwcGVuZCgncmVjdCcpXG4gICAgICAuYXR0cih7XG4gICAgICAgICd4JzogZnVuY3Rpb24oZCkge1xuICAgICAgICAgIHJldHVybiBkLng7XG4gICAgICAgIH0sXG4gICAgICAgICd5JzogMCArIG9wdHMuZ3V0dGVyLFxuICAgICAgICAnd2lkdGgnOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgcmV0dXJuIGQud2lkdGg7XG4gICAgICAgIH0sXG4gICAgICAgICdoZWlnaHQnOiBwb29sLmhlaWdodCgpIC0gMiAqIG9wdHMuZ3V0dGVyLFxuICAgICAgICAnY2xhc3MnOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgcmV0dXJuICdkMy1yZWN0LWZpbGwgZDMtZmlsbC0nICsgZC5maWxsO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgfVxuXG4gIGZpbGwuZmluZE5lYXJlc3QgPSBmdW5jdGlvbihkKSB7XG4gICAgdmFyIGRhdGUgPSBuZXcgRGF0ZShkKTtcbiAgICBkYXRlLnNldE1pbnV0ZXMoZGF0ZS5nZXRNaW51dGVzKCkgKyBkYXRlLmdldFRpbWV6b25lT2Zmc2V0KCkpO1xuICAgIHZhciBob3VyQnJlYWtzID0gW107XG4gICAgdmFyIGkgPSAwO1xuICAgIHdoaWxlIChpIDw9IDI0KSB7XG4gICAgICBob3VyQnJlYWtzLnB1c2goaSk7XG4gICAgICBpICs9IG9wdHMuZHVyYXRpb247XG4gICAgfVxuICAgIGZvcih2YXIgaiA9IDA7IGogPCBob3VyQnJlYWtzLmxlbmd0aDsgaisrKSB7XG4gICAgICB2YXIgYnIgPSBob3VyQnJlYWtzW2pdO1xuICAgICAgdmFyIG5leHRCciA9IGhvdXJCcmVha3NbaiArIDFdO1xuICAgICAgaWYgKChkYXRlLmdldEhvdXJzKCkgPj0gYnIpICYmIChkYXRlLmdldEhvdXJzKCkgPCBuZXh0QnIpKSB7XG4gICAgICAgIG5lYXJlc3QgPSBuZXcgRGF0ZShkYXRlLmdldEZ1bGxZZWFyKCksIGRhdGUuZ2V0TW9udGgoKSwgZGF0ZS5nZXREYXRlKCksIGJyLCAwLCAwKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG4gIFxuICByZXR1cm4gZmlsbDtcbn07IiwiLyogXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqIENvcHlyaWdodCAoYykgMjAxNCwgVGlkZXBvb2wgUHJvamVjdFxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTsgeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeSBpdCB1bmRlclxuICogdGhlIHRlcm1zIG9mIHRoZSBhc3NvY2lhdGVkIExpY2Vuc2UsIHdoaWNoIGlzIGlkZW50aWNhbCB0byB0aGUgQlNEIDItQ2xhdXNlXG4gKiBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieSB0aGUgT3BlbiBTb3VyY2UgSW5pdGlhdGl2ZSBhdCBvcGVuc291cmNlLm9yZy5cbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsIGJ1dCBXSVRIT1VUXG4gKiBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTU1xuICogRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiBTZWUgdGhlIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqIFxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbTsgaWZcbiAqIG5vdCwgeW91IGNhbiBvYnRhaW4gb25lIGZyb20gVGlkZXBvb2wgUHJvamVjdCBhdCB0aWRlcG9vbC5vcmcuXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqL1xuXG52YXIgbG9nID0gcmVxdWlyZSgnLi4vbGliL2Jvd3MnKSgnTWVzc2FnZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHBvb2wsIG9wdHMpIHtcblxuICBvcHRzID0gb3B0cyB8fCB7fTtcblxuICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgeFNjYWxlOiBwb29sLnhTY2FsZSgpLmNvcHkoKSxcbiAgICBpbWFnZXNCYXNlVXJsOiBwb29sLmltYWdlc0Jhc2VVcmwoKVxuICB9O1xuXG4gIF8uZGVmYXVsdHMob3B0cywgZGVmYXVsdHMpO1xuXG4gIGZ1bmN0aW9uIGNiZyhzZWxlY3Rpb24pIHtcbiAgICBzZWxlY3Rpb24uZWFjaChmdW5jdGlvbihjdXJyZW50RGF0YSkge1xuICAgICAgdmFyIG1lc3NhZ2VzID0gZDMuc2VsZWN0KHRoaXMpXG4gICAgICAgIC5zZWxlY3RBbGwoJ2ltYWdlJylcbiAgICAgICAgLmRhdGEoY3VycmVudERhdGEsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICBpZiAoZC5wYXJlbnRNZXNzYWdlID09PSAnJykge1xuICAgICAgICAgICAgcmV0dXJuIGQuaWQ7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIG1lc3NhZ2VzLmVudGVyKClcbiAgICAgICAgLmFwcGVuZCgnaW1hZ2UnKVxuICAgICAgICAuYXR0cih7XG4gICAgICAgICAgJ3hsaW5rOmhyZWYnOiBvcHRzLmltYWdlc0Jhc2VVcmwgKyAnL21lc3NhZ2UvcG9zdF9pdC5zdmcnLFxuICAgICAgICAgICd4JzogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgcmV0dXJuIG9wdHMueFNjYWxlKERhdGUucGFyc2UoZC5ub3JtYWxUaW1lKSkgLSBvcHRzLnNpemUgLyAyO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgJ3knOiBwb29sLmhlaWdodCgpIC8gMiAtIG9wdHMuc2l6ZSAvIDIsXG4gICAgICAgICAgJ3dpZHRoJzogb3B0cy5zaXplLFxuICAgICAgICAgICdoZWlnaHQnOiBvcHRzLnNpemUsXG4gICAgICAgICAgJ2lkJzogZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgcmV0dXJuICdtZXNzYWdlXycgKyBkLmlkO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgLmNsYXNzZWQoeydkMy1pbWFnZSc6IHRydWUsICdkMy1tZXNzYWdlJzogdHJ1ZX0pO1xuICAgICAgbWVzc2FnZXMuZXhpdCgpLnJlbW92ZSgpO1xuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIGNiZztcbn07IiwiLyogXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqIENvcHlyaWdodCAoYykgMjAxNCwgVGlkZXBvb2wgUHJvamVjdFxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTsgeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeSBpdCB1bmRlclxuICogdGhlIHRlcm1zIG9mIHRoZSBhc3NvY2lhdGVkIExpY2Vuc2UsIHdoaWNoIGlzIGlkZW50aWNhbCB0byB0aGUgQlNEIDItQ2xhdXNlXG4gKiBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieSB0aGUgT3BlbiBTb3VyY2UgSW5pdGlhdGl2ZSBhdCBvcGVuc291cmNlLm9yZy5cbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsIGJ1dCBXSVRIT1VUXG4gKiBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTU1xuICogRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiBTZWUgdGhlIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqIFxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbTsgaWZcbiAqIG5vdCwgeW91IGNhbiBvYnRhaW4gb25lIGZyb20gVGlkZXBvb2wgUHJvamVjdCBhdCB0aWRlcG9vbC5vcmcuXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqL1xuXG52YXIgc2NhbGVzID0ge1xuICBiZzogZnVuY3Rpb24oZGF0YSwgcG9vbCkge1xuICAgIHZhciBzY2FsZSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAuZG9tYWluKFswLCBkMy5tYXgoZGF0YSwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC52YWx1ZTsgfSldKVxuICAgICAgLnJhbmdlKFtwb29sLmhlaWdodCgpLCAwXSk7XG4gICAgcmV0dXJuIHNjYWxlO1xuICB9LFxuICBjYXJiczogZnVuY3Rpb24oZGF0YSwgcG9vbCkge1xuICAgIHZhciBzY2FsZSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAuZG9tYWluKFswLCBkMy5tYXgoZGF0YSwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC52YWx1ZTsgfSldKVxuICAgICAgLnJhbmdlKFswLCAwLjQ3NSAqIHBvb2wuaGVpZ2h0KCldKTtcbiAgICByZXR1cm4gc2NhbGU7XG4gIH0sXG4gIGJvbHVzOiBmdW5jdGlvbihkYXRhLCBwb29sKSB7XG4gICAgdmFyIHNjYWxlID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgIC5kb21haW4oWzAsIGQzLm1heChkYXRhLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLnZhbHVlOyB9KV0pXG4gICAgICAucmFuZ2UoW3Bvb2wuaGVpZ2h0KCksIDAuNTI1ICogcG9vbC5oZWlnaHQoKV0pO1xuICAgIHJldHVybiBzY2FsZTtcbiAgfSxcbiAgYmFzYWw6IGZ1bmN0aW9uKGRhdGEsIHBvb2wpIHtcbiAgICB2YXIgc2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgLmRvbWFpbihbMCwgZDMubWF4KGRhdGEsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudmFsdWU7IH0pICogMS4xXSlcbiAgICAgIC5yYW5nZVJvdW5kKFtwb29sLmhlaWdodCgpLCAwXSk7XG4gICAgcmV0dXJuIHNjYWxlO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHNjYWxlczsiLCIvKiBcbiAqID09IEJTRDIgTElDRU5TRSA9PVxuICogQ29weXJpZ2h0IChjKSAyMDE0LCBUaWRlcG9vbCBQcm9qZWN0XG4gKiBcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOyB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5IGl0IHVuZGVyXG4gKiB0aGUgdGVybXMgb2YgdGhlIGFzc29jaWF0ZWQgTGljZW5zZSwgd2hpY2ggaXMgaWRlbnRpY2FsIHRvIHRoZSBCU0QgMi1DbGF1c2VcbiAqIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5IHRoZSBPcGVuIFNvdXJjZSBJbml0aWF0aXZlIGF0IG9wZW5zb3VyY2Uub3JnLlxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCwgYnV0IFdJVEhPVVRcbiAqIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTXG4gKiBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuIFNlZSB0aGUgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICogXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtOyBpZlxuICogbm90LCB5b3UgY2FuIG9idGFpbiBvbmUgZnJvbSBUaWRlcG9vbCBQcm9qZWN0IGF0IHRpZGVwb29sLm9yZy5cbiAqID09IEJTRDIgTElDRU5TRSA9PVxuICovXG5cbnZhciBsb2cgPSByZXF1aXJlKCcuLi9saWIvYm93cycpKCdUd28tV2VlayBTTUJHJyk7XG4gXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHBvb2wsIG9wdHMpIHtcblxuICBNU19JTl9IT1VSID0gMzYwMDAwMDtcblxuICBNU19JTl9NSU4gPSA2MCAqIDEwMDA7XG5cbiAgb3B0cyA9IG9wdHMgfHwge307XG5cbiAgdmFyIGRlZmF1bHRzID0ge1xuICAgIGNsYXNzZXM6IHtcbiAgICAgICd2ZXJ5LWxvdyc6IHsnYm91bmRhcnknOiA2MH0sXG4gICAgICAnbG93Jzogeydib3VuZGFyeSc6IDgwLCAndG9vbHRpcCc6ICdzbWJnX3Rvb2x0aXBfbG93LnN2Zyd9LFxuICAgICAgJ3RhcmdldCc6IHsnYm91bmRhcnknOiAxODAsICd0b29sdGlwJzogJ3NtYmdfdG9vbHRpcF90YXJnZXQuc3ZnJ30sXG4gICAgICAnaGlnaCc6IHsnYm91bmRhcnknOiAyMDAsICd0b29sdGlwJzogJ3NtYmdfdG9vbHRpcF9oaWdoLnN2Zyd9LFxuICAgICAgJ3ZlcnktaGlnaCc6IHsnYm91bmRhcnknOiAzMDB9XG4gICAgfSxcbiAgICBzaXplOiAxNixcbiAgICByZWN0V2lkdGg6IDMyLFxuICAgIHhTY2FsZTogcG9vbC54U2NhbGUoKS5jb3B5KCksXG4gICAgaW1hZ2VzQmFzZVVybDogcG9vbC5pbWFnZXNCYXNlVXJsKClcbiAgfTtcblxuICBfLmRlZmF1bHRzKG9wdHMsIGRlZmF1bHRzKTtcblxuICBmdW5jdGlvbiBzbWJnKHNlbGVjdGlvbikge1xuICAgIHNlbGVjdGlvbi5lYWNoKGZ1bmN0aW9uKGN1cnJlbnREYXRhKSB7XG4gICAgICB2YXIgY2lyY2xlcyA9IGQzLnNlbGVjdCh0aGlzKVxuICAgICAgICAuc2VsZWN0QWxsKCdnJylcbiAgICAgICAgLmRhdGEoY3VycmVudERhdGEsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICByZXR1cm4gZC5pZDtcbiAgICAgICAgfSk7XG4gICAgICB2YXIgY2lyY2xlR3JvdXBzID0gY2lyY2xlcy5lbnRlcigpXG4gICAgICAgIC5hcHBlbmQoJ2cnKVxuICAgICAgICAuYXR0cignY2xhc3MnLCAnZDMtc21iZy10aW1lLWdyb3VwJyk7XG4gICAgICBjaXJjbGVHcm91cHMuYXBwZW5kKCdpbWFnZScpXG4gICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAneGxpbms6aHJlZic6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIGlmIChkLnZhbHVlIDw9IG9wdHMuY2xhc3Nlc1sndmVyeS1sb3cnXVsnYm91bmRhcnknXSkge1xuICAgICAgICAgICAgICByZXR1cm4gb3B0cy5pbWFnZXNCYXNlVXJsICsgJy9zbWJnL3ZlcnlfbG93LnN2Zyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICgoZC52YWx1ZSA+IG9wdHMuY2xhc3Nlc1sndmVyeS1sb3cnXVsnYm91bmRhcnknXSkgJiYgKGQudmFsdWUgPD0gb3B0cy5jbGFzc2VzWydsb3cnXVsnYm91bmRhcnknXSkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG9wdHMuaW1hZ2VzQmFzZVVybCArICcvc21iZy9sb3cuc3ZnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKChkLnZhbHVlID4gb3B0cy5jbGFzc2VzWydsb3cnXVsnYm91bmRhcnknXSkgJiYgKGQudmFsdWUgPD0gb3B0cy5jbGFzc2VzWyd0YXJnZXQnXVsnYm91bmRhcnknXSkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG9wdHMuaW1hZ2VzQmFzZVVybCArICcvc21iZy90YXJnZXQuc3ZnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKChkLnZhbHVlID4gb3B0cy5jbGFzc2VzWyd0YXJnZXQnXVsnYm91bmRhcnknXSkgJiYgKGQudmFsdWUgPD0gb3B0cy5jbGFzc2VzWydoaWdoJ11bJ2JvdW5kYXJ5J10pKSB7XG4gICAgICAgICAgICAgIHJldHVybiBvcHRzLmltYWdlc0Jhc2VVcmwgKyAnL3NtYmcvaGlnaC5zdmcnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoZC52YWx1ZSA+IG9wdHMuY2xhc3Nlc1snaGlnaCddWydib3VuZGFyeSddKSB7XG4gICAgICAgICAgICAgIHJldHVybiBvcHRzLmltYWdlc0Jhc2VVcmwgKyAnL3NtYmcvdmVyeV9oaWdoLnN2Zyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICAneCc6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHZhciBsb2NhbFRpbWUgPSBuZXcgRGF0ZShkLm5vcm1hbFRpbWUpO1xuICAgICAgICAgICAgdmFyIGhvdXIgPSBsb2NhbFRpbWUuZ2V0VVRDSG91cnMoKTtcbiAgICAgICAgICAgIHZhciBtaW4gPSBsb2NhbFRpbWUuZ2V0VVRDTWludXRlcygpO1xuICAgICAgICAgICAgdmFyIHNlYyA9IGxvY2FsVGltZS5nZXRVVENTZWNvbmRzKCk7XG4gICAgICAgICAgICB2YXIgbXNlYyA9IGxvY2FsVGltZS5nZXRVVENNaWxsaXNlY29uZHMoKTtcbiAgICAgICAgICAgIHZhciB0ID0gaG91ciAqIE1TX0lOX0hPVVIgKyBtaW4gKiBNU19JTl9NSU4gKyBzZWMgKiAxMDAwICsgbXNlYztcbiAgICAgICAgICAgIHJldHVybiBvcHRzLnhTY2FsZSh0KSAtIG9wdHMuc2l6ZSAvIDI7XG4gICAgICAgICAgfSxcbiAgICAgICAgICAneSc6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHJldHVybiBwb29sLmhlaWdodCgpIC8gMiAtIG9wdHMuc2l6ZSAvIDI7XG4gICAgICAgICAgfSxcbiAgICAgICAgICAnd2lkdGgnOiBvcHRzLnNpemUsXG4gICAgICAgICAgJ2hlaWdodCc6IG9wdHMuc2l6ZSxcbiAgICAgICAgICAnaWQnOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICByZXR1cm4gJ3NtYmdfdGltZV8nICsgZC5pZDtcbiAgICAgICAgICB9LFxuICAgICAgICAgICdjbGFzcyc6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIGlmIChkLnZhbHVlIDw9IG9wdHMuY2xhc3Nlc1snbG93J11bJ2JvdW5kYXJ5J10pIHtcbiAgICAgICAgICAgICAgcmV0dXJuICdkMy1iZy1sb3cnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoKGQudmFsdWUgPiBvcHRzLmNsYXNzZXNbJ2xvdyddWydib3VuZGFyeSddKSAmJiAoZC52YWx1ZSA8PSBvcHRzLmNsYXNzZXNbJ3RhcmdldCddWydib3VuZGFyeSddKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ2QzLWJnLXRhcmdldCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChkLnZhbHVlID4gb3B0cy5jbGFzc2VzWyd0YXJnZXQnXVsnYm91bmRhcnknXSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ2QzLWJnLWhpZ2gnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgLmNsYXNzZWQoeydkMy1pbWFnZSc6IHRydWUsICdkMy1zbWJnLXRpbWUnOiB0cnVlLCAnZDMtaW1hZ2Utc21iZyc6IHRydWV9KVxuICAgICAgICAub24oJ2RibGNsaWNrJywgZnVuY3Rpb24oZCkge1xuICAgICAgICAgIGQzLmV2ZW50LnN0b3BQcm9wYWdhdGlvbigpOyAvLyBzaWxlbmNlIHRoZSBjbGljay1hbmQtZHJhZyBsaXN0ZW5lclxuICAgICAgICAgIG9wdHMuZW1pdHRlci5lbWl0KCdzZWxlY3RTTUJHJywgZC5ub3JtYWxUaW1lKTtcbiAgICAgICAgfSk7XG5cbiAgICAgIGNpcmNsZUdyb3Vwcy5hcHBlbmQoJ3JlY3QnKVxuICAgICAgICAuc3R5bGUoJ2Rpc3BsYXknLCAnbm9uZScpXG4gICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAneCc6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHZhciBsb2NhbFRpbWUgPSBuZXcgRGF0ZShkLm5vcm1hbFRpbWUpO1xuICAgICAgICAgICAgdmFyIGhvdXIgPSBsb2NhbFRpbWUuZ2V0VVRDSG91cnMoKTtcbiAgICAgICAgICAgIHZhciBtaW4gPSBsb2NhbFRpbWUuZ2V0VVRDTWludXRlcygpO1xuICAgICAgICAgICAgdmFyIHNlYyA9IGxvY2FsVGltZS5nZXRVVENTZWNvbmRzKCk7XG4gICAgICAgICAgICB2YXIgbXNlYyA9IGxvY2FsVGltZS5nZXRVVENNaWxsaXNlY29uZHMoKTtcbiAgICAgICAgICAgIHZhciB0ID0gaG91ciAqIE1TX0lOX0hPVVIgKyBtaW4gKiBNU19JTl9NSU4gKyBzZWMgKiAxMDAwICsgbXNlYztcbiAgICAgICAgICAgIHJldHVybiBvcHRzLnhTY2FsZSh0KSAtIG9wdHMucmVjdFdpZHRoIC8gMjtcbiAgICAgICAgICB9LFxuICAgICAgICAgICd5JzogMCxcbiAgICAgICAgICAnd2lkdGgnOiBvcHRzLnNpemUgKiAyLFxuICAgICAgICAgICdoZWlnaHQnOiBwb29sLmhlaWdodCgpIC8gMixcbiAgICAgICAgICAnY2xhc3MnOiAnZDMtc21iZy1udW1iZXJzIGQzLXJlY3Qtc21iZyBkMy1zbWJnLXRpbWUnXG4gICAgICAgIH0pO1xuXG4gICAgICAvLyBOQjogY2Fubm90IGRvIHNhbWUgZGlzcGxheTogbm9uZSBzdHJhdGVneSBiZWNhdXNlIGRvbWluYW50LWJhc2VsaW5lIGF0dHJpYnV0ZSBjYW5ub3QgYmUgYXBwbGllZFxuICAgICAgY2lyY2xlR3JvdXBzLmFwcGVuZCgndGV4dCcpXG4gICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAneCc6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHZhciBsb2NhbFRpbWUgPSBuZXcgRGF0ZShkLm5vcm1hbFRpbWUpO1xuICAgICAgICAgICAgdmFyIGhvdXIgPSBsb2NhbFRpbWUuZ2V0VVRDSG91cnMoKTtcbiAgICAgICAgICAgIHZhciBtaW4gPSBsb2NhbFRpbWUuZ2V0VVRDTWludXRlcygpO1xuICAgICAgICAgICAgdmFyIHNlYyA9IGxvY2FsVGltZS5nZXRVVENTZWNvbmRzKCk7XG4gICAgICAgICAgICB2YXIgbXNlYyA9IGxvY2FsVGltZS5nZXRVVENNaWxsaXNlY29uZHMoKTtcbiAgICAgICAgICAgIHZhciB0ID0gaG91ciAqIE1TX0lOX0hPVVIgKyBtaW4gKiBNU19JTl9NSU4gKyBzZWMgKiAxMDAwICsgbXNlYztcbiAgICAgICAgICAgIHJldHVybiBvcHRzLnhTY2FsZSh0KTtcbiAgICAgICAgICB9LFxuICAgICAgICAgICd5JzogcG9vbC5oZWlnaHQoKSAvIDQsXG4gICAgICAgICAgJ29wYWNpdHknOiAnMCcsXG4gICAgICAgICAgJ2NsYXNzJzogJ2QzLXNtYmctbnVtYmVycyBkMy10ZXh0LXNtYmcgZDMtc21iZy10aW1lJ1xuICAgICAgICB9KVxuICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7XG4gICAgICAgICAgcmV0dXJuIGQudmFsdWU7XG4gICAgICAgIH0pO1xuXG4gICAgICBjaXJjbGVzLmV4aXQoKS5yZW1vdmUoKTtcblxuICAgICAgb3B0cy5lbWl0dGVyLm9uKCdudW1iZXJzJywgZnVuY3Rpb24odG9nZ2xlKSB7XG4gICAgICAgIGlmICh0b2dnbGUgPT09ICdzaG93Jykge1xuICAgICAgICAgIGQzLnNlbGVjdEFsbCgnLmQzLXJlY3Qtc21iZycpXG4gICAgICAgICAgICAuc3R5bGUoJ2Rpc3BsYXknLCAnaW5saW5lJyk7XG4gICAgICAgICAgZDMuc2VsZWN0QWxsKCcuZDMtdGV4dC1zbWJnJylcbiAgICAgICAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgICAgICAgIC5kdXJhdGlvbig1MDApXG4gICAgICAgICAgICAuYXR0cignb3BhY2l0eScsIDEpO1xuICAgICAgICAgIGQzLnNlbGVjdEFsbCgnLmQzLWltYWdlLXNtYmcnKVxuICAgICAgICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgICAgICAgLmR1cmF0aW9uKDUwMClcbiAgICAgICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAgICAgJ2hlaWdodCc6IG9wdHMuc2l6ZSAqIDAuNzUsXG4gICAgICAgICAgICAgICd5JzogcG9vbC5oZWlnaHQoKSAvIDJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHRvZ2dsZSA9PT0gJ2hpZGUnKSB7XG4gICAgICAgICAgZDMuc2VsZWN0QWxsKCcuZDMtcmVjdC1zbWJnJylcbiAgICAgICAgICAgIC5zdHlsZSgnZGlzcGxheScsICdub25lJyk7XG4gICAgICAgICAgZDMuc2VsZWN0QWxsKCcuZDMtdGV4dC1zbWJnJylcbiAgICAgICAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgICAgICAgIC5kdXJhdGlvbig1MDApXG4gICAgICAgICAgICAuYXR0cignb3BhY2l0eScsIDApO1xuICAgICAgICAgIGQzLnNlbGVjdEFsbCgnLmQzLWltYWdlLXNtYmcnKVxuICAgICAgICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgICAgICAgLmR1cmF0aW9uKDUwMClcbiAgICAgICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAgICAgJ2hlaWdodCc6IG9wdHMuc2l6ZSxcbiAgICAgICAgICAgICAgJ3knOiBwb29sLmhlaWdodCgpIC8gMiAtIG9wdHMuc2l6ZSAvIDJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBzbWJnO1xufTsiLCIvKiBcbiAqID09IEJTRDIgTElDRU5TRSA9PVxuICogQ29weXJpZ2h0IChjKSAyMDE0LCBUaWRlcG9vbCBQcm9qZWN0XG4gKiBcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOyB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5IGl0IHVuZGVyXG4gKiB0aGUgdGVybXMgb2YgdGhlIGFzc29jaWF0ZWQgTGljZW5zZSwgd2hpY2ggaXMgaWRlbnRpY2FsIHRvIHRoZSBCU0QgMi1DbGF1c2VcbiAqIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5IHRoZSBPcGVuIFNvdXJjZSBJbml0aWF0aXZlIGF0IG9wZW5zb3VyY2Uub3JnLlxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCwgYnV0IFdJVEhPVVRcbiAqIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTXG4gKiBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuIFNlZSB0aGUgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICogXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtOyBpZlxuICogbm90LCB5b3UgY2FuIG9idGFpbiBvbmUgZnJvbSBUaWRlcG9vbCBQcm9qZWN0IGF0IHRpZGVwb29sLm9yZy5cbiAqID09IEJTRDIgTElDRU5TRSA9PVxuICovXG5cbnZhciBsb2cgPSByZXF1aXJlKCcuLi9saWIvYm93cycpKCdTTUJHJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ocG9vbCwgb3B0cykge1xuXG4gIG9wdHMgPSBvcHRzIHx8IHt9O1xuXG4gIHZhciBkZWZhdWx0cyA9IHtcbiAgICBjbGFzc2VzOiB7XG4gICAgICAndmVyeS1sb3cnOiB7J2JvdW5kYXJ5JzogNjB9LFxuICAgICAgJ2xvdyc6IHsnYm91bmRhcnknOiA4MCwgJ3Rvb2x0aXAnOiAnc21iZ190b29sdGlwX2xvdy5zdmcnfSxcbiAgICAgICd0YXJnZXQnOiB7J2JvdW5kYXJ5JzogMTgwLCAndG9vbHRpcCc6ICdzbWJnX3Rvb2x0aXBfdGFyZ2V0LnN2Zyd9LFxuICAgICAgJ2hpZ2gnOiB7J2JvdW5kYXJ5JzogMjAwLCAndG9vbHRpcCc6ICdzbWJnX3Rvb2x0aXBfaGlnaC5zdmcnfSxcbiAgICAgICd2ZXJ5LWhpZ2gnOiB7J2JvdW5kYXJ5JzogMzAwfVxuICAgIH0sXG4gICAgc2l6ZTogMTYsXG4gICAgeFNjYWxlOiBwb29sLnhTY2FsZSgpLmNvcHkoKSxcbiAgICB5U2NhbGU6IGQzLnNjYWxlLmxpbmVhcigpLmRvbWFpbihbMCwgNDAwXSkucmFuZ2UoW3Bvb2wuaGVpZ2h0KCksIDBdKSxcbiAgICBpbWFnZXNCYXNlVXJsOiBwb29sLmltYWdlc0Jhc2VVcmwoKSxcbiAgICB0b29sdGlwV2lkdGg6IDcwLFxuICAgIHRvb2x0aXBIZWlnaHQ6IDI0XG4gIH07XG5cbiAgXy5kZWZhdWx0cyhvcHRzLCBkZWZhdWx0cyk7XG5cbiAgdmFyIHRvb2x0aXBzID0gcG9vbC50b29sdGlwcygpO1xuXG4gIGZ1bmN0aW9uIHNtYmcoc2VsZWN0aW9uKSB7XG4gICAgc2VsZWN0aW9uLmVhY2goZnVuY3Rpb24oY3VycmVudERhdGEpIHtcbiAgICAgIHZhciBjaXJjbGVzID0gZDMuc2VsZWN0KHRoaXMpXG4gICAgICAgIC5zZWxlY3RBbGwoJ2ltYWdlJylcbiAgICAgICAgLmRhdGEoY3VycmVudERhdGEsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICByZXR1cm4gZC5pZDtcbiAgICAgICAgfSk7XG4gICAgICBjaXJjbGVzLmVudGVyKClcbiAgICAgICAgLmFwcGVuZCgnaW1hZ2UnKVxuICAgICAgICAuYXR0cih7XG4gICAgICAgICAgJ3hsaW5rOmhyZWYnOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICBpZiAoZC52YWx1ZSA8PSBvcHRzLmNsYXNzZXNbJ3ZlcnktbG93J11bJ2JvdW5kYXJ5J10pIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG9wdHMuaW1hZ2VzQmFzZVVybCArICcvc21iZy92ZXJ5X2xvdy5zdmcnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoKGQudmFsdWUgPiBvcHRzLmNsYXNzZXNbJ3ZlcnktbG93J11bJ2JvdW5kYXJ5J10pICYmIChkLnZhbHVlIDw9IG9wdHMuY2xhc3Nlc1snbG93J11bJ2JvdW5kYXJ5J10pKSB7XG4gICAgICAgICAgICAgIHJldHVybiBvcHRzLmltYWdlc0Jhc2VVcmwgKyAnL3NtYmcvbG93LnN2Zyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICgoZC52YWx1ZSA+IG9wdHMuY2xhc3Nlc1snbG93J11bJ2JvdW5kYXJ5J10pICYmIChkLnZhbHVlIDw9IG9wdHMuY2xhc3Nlc1sndGFyZ2V0J11bJ2JvdW5kYXJ5J10pKSB7XG4gICAgICAgICAgICAgIHJldHVybiBvcHRzLmltYWdlc0Jhc2VVcmwgKyAnL3NtYmcvdGFyZ2V0LnN2Zyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICgoZC52YWx1ZSA+IG9wdHMuY2xhc3Nlc1sndGFyZ2V0J11bJ2JvdW5kYXJ5J10pICYmIChkLnZhbHVlIDw9IG9wdHMuY2xhc3Nlc1snaGlnaCddWydib3VuZGFyeSddKSkge1xuICAgICAgICAgICAgICByZXR1cm4gb3B0cy5pbWFnZXNCYXNlVXJsICsgJy9zbWJnL2hpZ2guc3ZnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGQudmFsdWUgPiBvcHRzLmNsYXNzZXNbJ2hpZ2gnXVsnYm91bmRhcnknXSkge1xuICAgICAgICAgICAgICByZXR1cm4gb3B0cy5pbWFnZXNCYXNlVXJsICsgJy9zbWJnL3ZlcnlfaGlnaC5zdmcnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgJ3gnOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICByZXR1cm4gb3B0cy54U2NhbGUoRGF0ZS5wYXJzZShkLm5vcm1hbFRpbWUpKSAtIG9wdHMuc2l6ZSAvIDI7XG4gICAgICAgICAgfSxcbiAgICAgICAgICAneSc6IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHJldHVybiBvcHRzLnlTY2FsZShkLnZhbHVlKSAtIG9wdHMuc2l6ZSAvIDI7XG4gICAgICAgICAgfSxcbiAgICAgICAgICAnd2lkdGgnOiBvcHRzLnNpemUsXG4gICAgICAgICAgJ2hlaWdodCc6IG9wdHMuc2l6ZSxcbiAgICAgICAgICAnaWQnOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICByZXR1cm4gJ3NtYmdfJyArIGQuaWQ7XG4gICAgICAgICAgfSxcbiAgICAgICAgICAnY2xhc3MnOiBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICBpZiAoZC52YWx1ZSA8PSBvcHRzLmNsYXNzZXNbJ2xvdyddWydib3VuZGFyeSddKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnZDMtYmctbG93JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKChkLnZhbHVlID4gb3B0cy5jbGFzc2VzWydsb3cnXVsnYm91bmRhcnknXSkgJiYgKGQudmFsdWUgPD0gb3B0cy5jbGFzc2VzWyd0YXJnZXQnXVsnYm91bmRhcnknXSkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICdkMy1iZy10YXJnZXQnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoZC52YWx1ZSA+IG9wdHMuY2xhc3Nlc1sndGFyZ2V0J11bJ2JvdW5kYXJ5J10pIHtcbiAgICAgICAgICAgICAgcmV0dXJuICdkMy1iZy1oaWdoJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIC5jbGFzc2VkKHsnZDMtaW1hZ2UnOiB0cnVlLCAnZDMtc21iZyc6IHRydWUsICdkMy1pbWFnZS1zbWJnJzogdHJ1ZX0pO1xuICAgICAgY2lyY2xlcy5leGl0KCkucmVtb3ZlKCk7XG5cbiAgICAgIC8vIHRvb2x0aXBzXG4gICAgICBkMy5zZWxlY3RBbGwoJy5kMy1pbWFnZS1zbWJnJykub24oJ21vdXNlb3ZlcicsIGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoZDMuc2VsZWN0KHRoaXMpLmNsYXNzZWQoJ2QzLWJnLWxvdycpKSB7XG4gICAgICAgICAgc21iZy5hZGRUb29sdGlwKGQzLnNlbGVjdCh0aGlzKS5kYXR1bSgpLCAnbG93Jyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZDMuc2VsZWN0KHRoaXMpLmNsYXNzZWQoJ2QzLWJnLXRhcmdldCcpKSB7XG4gICAgICAgICAgc21iZy5hZGRUb29sdGlwKGQzLnNlbGVjdCh0aGlzKS5kYXR1bSgpLCAndGFyZ2V0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgc21iZy5hZGRUb29sdGlwKGQzLnNlbGVjdCh0aGlzKS5kYXR1bSgpLCAnaGlnaCcpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGQzLnNlbGVjdEFsbCgnLmQzLWltYWdlLXNtYmcnKS5vbignbW91c2VvdXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGlkID0gZDMuc2VsZWN0KHRoaXMpLmF0dHIoJ2lkJykucmVwbGFjZSgnc21iZ18nLCAndG9vbHRpcF8nKTtcbiAgICAgICAgZDMuc2VsZWN0KCcjJyArIGlkKS5yZW1vdmUoKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgc21iZy5hZGRUb29sdGlwID0gZnVuY3Rpb24oZCwgY2F0ZWdvcnkpIHtcbiAgICBkMy5zZWxlY3QoJyMnICsgJ2QzLXRvb2x0aXAtZ3JvdXBfc21iZycpXG4gICAgICAuY2FsbCh0b29sdGlwcyxcbiAgICAgICAgZCxcbiAgICAgICAgLy8gdG9vbHRpcFhQb3NcbiAgICAgICAgb3B0cy54U2NhbGUoRGF0ZS5wYXJzZShkLm5vcm1hbFRpbWUpKSxcbiAgICAgICAgJ3NtYmcnLFxuICAgICAgICAvLyB0aW1lc3RhbXBcbiAgICAgICAgdHJ1ZSxcbiAgICAgICAgb3B0cy5jbGFzc2VzW2NhdGVnb3J5XVsndG9vbHRpcCddLFxuICAgICAgICBvcHRzLnRvb2x0aXBXaWR0aCxcbiAgICAgICAgb3B0cy50b29sdGlwSGVpZ2h0LFxuICAgICAgICAvLyBpbWFnZVhcbiAgICAgICAgb3B0cy54U2NhbGUoRGF0ZS5wYXJzZShkLm5vcm1hbFRpbWUpKSxcbiAgICAgICAgLy8gaW1hZ2VZXG4gICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICgoY2F0ZWdvcnkgPT09ICdsb3cnKSB8fCAoY2F0ZWdvcnkgPT09ICd0YXJnZXQnKSkge1xuICAgICAgICAgICAgcmV0dXJuIG9wdHMueVNjYWxlKGQudmFsdWUpIC0gb3B0cy50b29sdGlwSGVpZ2h0O1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBvcHRzLnlTY2FsZShkLnZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIC8vIHRleHRYXG4gICAgICAgIG9wdHMueFNjYWxlKERhdGUucGFyc2UoZC5ub3JtYWxUaW1lKSkgKyBvcHRzLnRvb2x0aXBXaWR0aCAvIDIsXG4gICAgICAgIC8vIHRleHRZXG4gICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICgoY2F0ZWdvcnkgPT09ICdsb3cnKSB8fCAoY2F0ZWdvcnkgPT09ICd0YXJnZXQnKSkge1xuICAgICAgICAgICAgcmV0dXJuIG9wdHMueVNjYWxlKGQudmFsdWUpIC0gb3B0cy50b29sdGlwSGVpZ2h0IC8gMjtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gb3B0cy55U2NhbGUoZC52YWx1ZSkgKyBvcHRzLnRvb2x0aXBIZWlnaHQgLyAyO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gIH07XG5cbiAgcmV0dXJuIHNtYmc7XG59OyIsIi8qIFxuICogPT0gQlNEMiBMSUNFTlNFID09XG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQsIFRpZGVwb29sIFByb2plY3RcbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU7IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnkgaXQgdW5kZXJcbiAqIHRoZSB0ZXJtcyBvZiB0aGUgYXNzb2NpYXRlZCBMaWNlbnNlLCB3aGljaCBpcyBpZGVudGljYWwgdG8gdGhlIEJTRCAyLUNsYXVzZVxuICogTGljZW5zZSBhcyBwdWJsaXNoZWQgYnkgdGhlIE9wZW4gU291cmNlIEluaXRpYXRpdmUgYXQgb3BlbnNvdXJjZS5vcmcuXG4gKiBcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLCBidXQgV0lUSE9VVFxuICogQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2YgTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1NcbiAqIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gU2VlIHRoZSBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKiBcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW07IGlmXG4gKiBub3QsIHlvdSBjYW4gb2J0YWluIG9uZSBmcm9tIFRpZGVwb29sIFByb2plY3QgYXQgdGlkZXBvb2wub3JnLlxuICogPT0gQlNEMiBMSUNFTlNFID09XG4gKi9cblxudmFyIGxvZyA9IHJlcXVpcmUoJy4uL2xpYi9ib3dzJykoJ1Rvb2x0aXAnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjb250YWluZXIsIHRvb2x0aXBzR3JvdXApIHtcblxuICB2YXIgaWQsIHRpbWVzdGFtcEhlaWdodCA9IDIwO1xuXG4gIGZ1bmN0aW9uIHRvb2x0aXAoc2VsZWN0aW9uLFxuICAgIGQsXG4gICAgdG9vbHRpcFhQb3MsXG4gICAgcGF0aCxcbiAgICBtYWtlVGltZXN0YW1wLFxuICAgIGltYWdlLFxuICAgIHRvb2x0aXBXaWR0aCxcbiAgICB0b29sdGlwSGVpZ2h0LFxuICAgIGltYWdlWCwgaW1hZ2VZLFxuICAgIHRleHRYLCB0ZXh0WSxcbiAgICBjdXN0b21UZXh0LCB0c3Bhbikge1xuICAgIHZhciB0b29sdGlwR3JvdXAgPSBzZWxlY3Rpb24uYXBwZW5kKCdnJylcbiAgICAgIC5hdHRyKCdjbGFzcycsICdkMy10b29sdGlwJylcbiAgICAgIC5hdHRyKCdpZCcsICd0b29sdGlwXycgKyBkLmlkKTtcblxuICAgIHZhciBpbWFnZXNCYXNlVXJsID0gY29udGFpbmVyLmltYWdlc0Jhc2VVcmwoKTtcblxuICAgIHZhciBjdXJyZW50VHJhbnNsYXRpb24gPSBjb250YWluZXIuY3VycmVudFRyYW5zbGF0aW9uKCk7XG5cbiAgICB2YXIgbG9jYXRpb25JbldpbmRvdyA9IGN1cnJlbnRUcmFuc2xhdGlvbiArIHRvb2x0aXBYUG9zO1xuXG4gICAgdmFyIHRyYW5zbGF0aW9uID0gMDtcblxuICAgIHZhciBuZXdCYXNhbFBvc2l0aW9uO1xuXG4gICAgLy8gbW92aW5nIGJhc2FsIHRvb2x0aXBzIGF0IGVkZ2VzIG9mIGRpc3BsYXlcbiAgICBpZiAocGF0aCA9PT0gJ2Jhc2FsJykge1xuICAgICAgaWYgKGxvY2F0aW9uSW5XaW5kb3cgPiBjb250YWluZXIud2lkdGgoKSAtICgoKGNvbnRhaW5lci53aWR0aCgpIC0gY29udGFpbmVyLmF4aXNHdXR0ZXIoKSkgLyAyNCkgKiAzKSkge1xuICAgICAgICBuZXdCYXNhbFBvc2l0aW9uID0gLWN1cnJlbnRUcmFuc2xhdGlvbiArIGNvbnRhaW5lci53aWR0aCgpIC0gdG9vbHRpcFdpZHRoO1xuICAgICAgICBpZiAobmV3QmFzYWxQb3NpdGlvbiA8IGltYWdlWCkge1xuICAgICAgICAgIHRyYW5zbGF0aW9uID0gbmV3QmFzYWxQb3NpdGlvbiAtIGltYWdlWDtcbiAgICAgICAgICBpbWFnZVggPSBuZXdCYXNhbFBvc2l0aW9uO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChsb2NhdGlvbkluV2luZG93IDwgKCgoY29udGFpbmVyLndpZHRoKCkgLSBjb250YWluZXIuYXhpc0d1dHRlcigpKSAvIDI0KSAqIDMpKSB7XG4gICAgICAgIG5ld0Jhc2FsUG9zaXRpb24gPSAtY3VycmVudFRyYW5zbGF0aW9uICsgY29udGFpbmVyLmF4aXNHdXR0ZXIoKTtcbiAgICAgICAgaWYgKG5ld0Jhc2FsUG9zaXRpb24gPiBpbWFnZVgpIHtcbiAgICAgICAgICB0cmFuc2xhdGlvbiA9IG5ld0Jhc2FsUG9zaXRpb24gLSBpbWFnZVg7XG4gICAgICAgICAgaW1hZ2VYID0gbmV3QmFzYWxQb3NpdGlvbjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICAvLyBhbmQgYm9sdXMsIGNhcmJzLCBjYmcsIHNtYmdcbiAgICBpZiAoKHBhdGggPT09ICdib2x1cycpIHx8IChwYXRoID09PSAnY2FyYnMnKSB8fCAocGF0aCA9PT0gJ2NiZycpIHx8IChwYXRoID09PSAnc21iZycpKSB7XG4gICAgICBpZiAobG9jYXRpb25JbldpbmRvdyA+IGNvbnRhaW5lci53aWR0aCgpIC0gKCgoY29udGFpbmVyLndpZHRoKCkgLSBjb250YWluZXIuYXhpc0d1dHRlcigpKSAvIDI0KSAqIDMpKSB7XG4gICAgICAgIHRyYW5zbGF0aW9uID0gLXRvb2x0aXBXaWR0aDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBmb3Igbm93ICh1bmxlc3MgSSBjYW4gcGVyc3VkZSBTYXJhIGFuZCBBbGl4IG90aGVyd2lzZSksIGhpZ2ggY2JnIHZhbHVlcyBhcmUgYSBzcGVjaWFsIGNhc2VcbiAgICBpZiAoaW1hZ2UuaW5kZXhPZignY2JnX3Rvb2x0aXBfaGlnaCcpICE9IC0xKSB7XG4gICAgICBpZiAobG9jYXRpb25JbldpbmRvdyA8ICgoKGNvbnRhaW5lci53aWR0aCgpIC0gY29udGFpbmVyLmF4aXNHdXR0ZXIoKSkgLyAyNCkgKiAzKSkge1xuICAgICAgICB0b29sdGlwR3JvdXAuYXBwZW5kKCdpbWFnZScpXG4gICAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgJ3hsaW5rOmhyZWYnOiBpbWFnZXNCYXNlVXJsICsgJy8nICsgcGF0aCArICcvJyArIGltYWdlLFxuICAgICAgICAgICAgJ3gnOiBpbWFnZVgsXG4gICAgICAgICAgICAneSc6IGltYWdlWSxcbiAgICAgICAgICAgICd3aWR0aCc6IHRvb2x0aXBXaWR0aCxcbiAgICAgICAgICAgICdoZWlnaHQnOiB0b29sdGlwSGVpZ2h0LFxuICAgICAgICAgICAgJ2NsYXNzJzogJ2QzLXRvb2x0aXAtaW1hZ2UnXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgdG9vbHRpcEdyb3VwLmFwcGVuZCgndGV4dCcpXG4gICAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgJ3gnOiB0ZXh0WCxcbiAgICAgICAgICAgICd5JzogdGV4dFksXG4gICAgICAgICAgICAnY2xhc3MnOiAnZDMtdG9vbHRpcC10ZXh0IGQzLScgKyBwYXRoXG4gICAgICAgICAgfSlcbiAgICAgICAgICAudGV4dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBkLnZhbHVlO1xuICAgICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHRvb2x0aXBHcm91cC5hcHBlbmQoJ2ltYWdlJylcbiAgICAgICAgICAuYXR0cih7XG4gICAgICAgICAgICAneGxpbms6aHJlZic6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICB2YXIgc3RyID0gIGltYWdlc0Jhc2VVcmwgKyAnLycgKyBwYXRoICsgJy8nICsgaW1hZ2U7XG4gICAgICAgICAgICAgIHJldHVybiBzdHIucmVwbGFjZSgnLnN2ZycsICdfbGVmdC5zdmcnKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAneCc6IGltYWdlWCAtIHRvb2x0aXBXaWR0aCxcbiAgICAgICAgICAgICd5JzogaW1hZ2VZLFxuICAgICAgICAgICAgJ3dpZHRoJzogdG9vbHRpcFdpZHRoLFxuICAgICAgICAgICAgJ2hlaWdodCc6IHRvb2x0aXBIZWlnaHQsXG4gICAgICAgICAgICAnY2xhc3MnOiAnZDMtdG9vbHRpcC1pbWFnZSdcbiAgICAgICAgICB9KTtcblxuICAgICAgICB0b29sdGlwR3JvdXAuYXBwZW5kKCd0ZXh0JylcbiAgICAgICAgICAuYXR0cih7XG4gICAgICAgICAgICAneCc6IHRleHRYIC0gdG9vbHRpcFdpZHRoLFxuICAgICAgICAgICAgJ3knOiB0ZXh0WSxcbiAgICAgICAgICAgICdjbGFzcyc6ICdkMy10b29sdGlwLXRleHQgZDMtJyArIHBhdGhcbiAgICAgICAgICB9KVxuICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIGQudmFsdWU7XG4gICAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGlmIHRoZSBkYXRhIHBvaW50IGlzIHRocmVlIGhvdXJzIGZyb20gdGhlIGVuZCBvZiB0aGUgZGF0YSBpbiB2aWV3IG9yIGxlc3MsIHVzZSBhIGxlZnQgdG9vbHRpcFxuICAgIGVsc2UgaWYgKChsb2NhdGlvbkluV2luZG93ID4gY29udGFpbmVyLndpZHRoKCkgLSAoKChjb250YWluZXIud2lkdGgoKSAtIGNvbnRhaW5lci5heGlzR3V0dGVyKCkpIC8gMjQpICogMykpICYmXG4gICAgICAocGF0aCAhPT0gJ2Jhc2FsJykpIHtcbiAgICAgIHRvb2x0aXBHcm91cC5hcHBlbmQoJ2ltYWdlJylcbiAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICd4bGluazpocmVmJzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgc3RyID0gIGltYWdlc0Jhc2VVcmwgKyAnLycgKyBwYXRoICsgJy8nICsgaW1hZ2U7XG4gICAgICAgICAgICByZXR1cm4gc3RyLnJlcGxhY2UoJy5zdmcnLCAnX2xlZnQuc3ZnJyk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICAneCc6IGltYWdlWCAtIHRvb2x0aXBXaWR0aCxcbiAgICAgICAgICAneSc6IGltYWdlWSxcbiAgICAgICAgICAnd2lkdGgnOiB0b29sdGlwV2lkdGgsXG4gICAgICAgICAgJ2hlaWdodCc6IHRvb2x0aXBIZWlnaHQsXG4gICAgICAgICAgJ2NsYXNzJzogJ2QzLXRvb2x0aXAtaW1hZ2UnXG4gICAgICAgIH0pO1xuXG4gICAgICBpZiAodHNwYW4pIHtcbiAgICAgICAgdG9vbHRpcEdyb3VwLmFwcGVuZCgnZycpXG4gICAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgJ2NsYXNzJzogJ2QzLXRvb2x0aXAtdGV4dC1ncm91cCcsXG4gICAgICAgICAgICAndHJhbnNmb3JtJzogJ3RyYW5zbGF0ZSgnICsgdHJhbnNsYXRpb24gKyAnLDApJ1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLmFwcGVuZCgndGV4dCcpXG4gICAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgJ3gnOiB0ZXh0WCxcbiAgICAgICAgICAgICd5JzogdGV4dFksXG4gICAgICAgICAgICAnY2xhc3MnOiAnZDMtdG9vbHRpcC10ZXh0IGQzLScgKyBwYXRoXG4gICAgICAgICAgfSlcbiAgICAgICAgICAudGV4dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmIChjdXN0b21UZXh0KSB7XG4gICAgICAgICAgICAgIHJldHVybiBjdXN0b21UZXh0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIHJldHVybiBkLnZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB0b29sdGlwR3JvdXAuc2VsZWN0KCcuZDMtdG9vbHRpcC10ZXh0LWdyb3VwJykuc2VsZWN0KCd0ZXh0JylcbiAgICAgICAgICAuYXBwZW5kKCd0c3BhbicpXG4gICAgICAgICAgLnRleHQoJyAnICsgdHNwYW4pO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHRvb2x0aXBHcm91cC5hcHBlbmQoJ2cnKVxuICAgICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAgICdjbGFzcyc6ICdkMy10b29sdGlwLXRleHQtZ3JvdXAnLFxuICAgICAgICAgICAgJ3RyYW5zZm9ybSc6ICd0cmFuc2xhdGUoJyArIHRyYW5zbGF0aW9uICsgJywwKSdcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5hcHBlbmQoJ3RleHQnKVxuICAgICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAgICd4JzogdGV4dFgsXG4gICAgICAgICAgICAneSc6IHRleHRZLFxuICAgICAgICAgICAgJ2NsYXNzJzogJ2QzLXRvb2x0aXAtdGV4dCBkMy0nICsgcGF0aFxuICAgICAgICAgIH0pXG4gICAgICAgICAgLnRleHQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoY3VzdG9tVGV4dCkge1xuICAgICAgICAgICAgICByZXR1cm4gY3VzdG9tVGV4dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICByZXR1cm4gZC52YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gYWRqdXN0IHRoZSB2YWx1ZXMgbmVlZGVkIGZvciB0aGUgdGltZXN0YW1wXG4gICAgICAvLyBUT0RPOiByZWFsbHkgdGhpcyBzaG91bGQgYmUgcmVmYWN0b3JlZFxuICAgICAgaW1hZ2VYID0gaW1hZ2VYIC0gdG9vbHRpcFdpZHRoO1xuICAgICAgdGV4dFggPSB0ZXh0WCAtIHRvb2x0aXBXaWR0aDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0b29sdGlwR3JvdXAuYXBwZW5kKCdpbWFnZScpXG4gICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAneGxpbms6aHJlZic6IGltYWdlc0Jhc2VVcmwgKyAnLycgKyBwYXRoICsgJy8nICsgaW1hZ2UsXG4gICAgICAgICAgJ3gnOiBpbWFnZVgsXG4gICAgICAgICAgJ3knOiBpbWFnZVksXG4gICAgICAgICAgJ3dpZHRoJzogdG9vbHRpcFdpZHRoLFxuICAgICAgICAgICdoZWlnaHQnOiB0b29sdGlwSGVpZ2h0LFxuICAgICAgICAgICdjbGFzcyc6ICdkMy10b29sdGlwLWltYWdlJ1xuICAgICAgICB9KTtcblxuICAgICAgaWYgKHRzcGFuKSB7XG4gICAgICAgIHRvb2x0aXBHcm91cC5hcHBlbmQoJ2cnKVxuICAgICAgICAuYXR0cih7XG4gICAgICAgICAgJ2NsYXNzJzogJ2QzLXRvb2x0aXAtdGV4dC1ncm91cCcsXG4gICAgICAgICAgJ3RyYW5zZm9ybSc6ICd0cmFuc2xhdGUoJyArIHRyYW5zbGF0aW9uICsgJywwKSdcbiAgICAgICAgfSlcbiAgICAgICAgLmFwcGVuZCgndGV4dCcpXG4gICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAneCc6IHRleHRYLFxuICAgICAgICAgICd5JzogdGV4dFksXG4gICAgICAgICAgJ2NsYXNzJzogJ2QzLXRvb2x0aXAtdGV4dCBkMy0nICsgcGF0aFxuICAgICAgICB9KVxuICAgICAgICAudGV4dChmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoY3VzdG9tVGV4dCkge1xuICAgICAgICAgICAgcmV0dXJuIGN1c3RvbVRleHQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGQudmFsdWU7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdG9vbHRpcEdyb3VwLnNlbGVjdCgnLmQzLXRvb2x0aXAtdGV4dC1ncm91cCcpLnNlbGVjdCgndGV4dCcpXG4gICAgICAgICAgLmFwcGVuZCgndHNwYW4nKVxuICAgICAgICAgIC50ZXh0KCcgJyArIHRzcGFuKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB0b29sdGlwR3JvdXAuYXBwZW5kKCdnJylcbiAgICAgICAgICAuYXR0cih7XG4gICAgICAgICAgICAnY2xhc3MnOiAnZDMtdG9vbHRpcC10ZXh0LWdyb3VwJyxcbiAgICAgICAgICAgICd0cmFuc2Zvcm0nOiAndHJhbnNsYXRlKCcgKyB0cmFuc2xhdGlvbiArICcsMCknXG4gICAgICAgICAgfSlcbiAgICAgICAgICAuYXBwZW5kKCd0ZXh0JylcbiAgICAgICAgICAuYXR0cih7XG4gICAgICAgICAgICAneCc6IHRleHRYLFxuICAgICAgICAgICAgJ3knOiB0ZXh0WSxcbiAgICAgICAgICAgICdjbGFzcyc6ICdkMy10b29sdGlwLXRleHQgZDMtJyArIHBhdGhcbiAgICAgICAgICB9KVxuICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKGN1c3RvbVRleHQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGN1c3RvbVRleHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGQudmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICB9XG5cbiAgICBpZiAobWFrZVRpbWVzdGFtcCkge1xuICAgICAgdG9vbHRpcC50aW1lc3RhbXAoZCwgdG9vbHRpcEdyb3VwLCBpbWFnZVgsIGltYWdlWSwgdGV4dFgsIHRleHRZLCB0b29sdGlwV2lkdGgsIHRvb2x0aXBIZWlnaHQpO1xuICAgIH1cbiAgfVxuXG4gIHRvb2x0aXAudGltZXN0YW1wID0gZnVuY3Rpb24oZCwgdG9vbHRpcEdyb3VwLCBpbWFnZVgsIGltYWdlWSwgdGV4dFgsIHRleHRZLCB0b29sdGlwV2lkdGgsIHRvb2x0aXBIZWlnaHQpIHtcbiAgICB2YXIgbWFnaWMgPSB0aW1lc3RhbXBIZWlnaHQgKiAxLjI7XG4gICAgdmFyIHRpbWVzdGFtcFkgPSBpbWFnZVkoKSAtIHRpbWVzdGFtcEhlaWdodDtcbiAgICB2YXIgdGltZXN0YW1wVGV4dFkgPSB0aW1lc3RhbXBZICsgbWFnaWMgLyAyO1xuXG4gICAgdmFyIGZvcm1hdFRpbWUgPSBkMy50aW1lLmZvcm1hdC51dGMoXCIlLUk6JU0gJXBcIik7XG4gICAgdmFyIHQgPSBmb3JtYXRUaW1lKG5ldyBEYXRlKGQubm9ybWFsVGltZSkpO1xuICAgIHRvb2x0aXBHcm91cC5hcHBlbmQoJ3JlY3QnKVxuICAgICAgLmF0dHIoe1xuICAgICAgICAneCc6IGltYWdlWCxcbiAgICAgICAgJ3knOiB0aW1lc3RhbXBZLFxuICAgICAgICAnd2lkdGgnOiB0b29sdGlwV2lkdGgsXG4gICAgICAgICdoZWlnaHQnOiB0aW1lc3RhbXBIZWlnaHQsXG4gICAgICAgICdjbGFzcyc6ICdkMy10b29sdGlwLXJlY3QnXG4gICAgICB9KTtcbiAgICB0b29sdGlwR3JvdXAuYXBwZW5kKCd0ZXh0JylcbiAgICAgIC5hdHRyKHtcbiAgICAgICAgJ3gnOiB0ZXh0WCxcbiAgICAgICAgJ3knOiB0aW1lc3RhbXBUZXh0WSxcbiAgICAgICAgJ2Jhc2VsaW5lLXNoaWZ0JzogKG1hZ2ljIC0gdGltZXN0YW1wSGVpZ2h0KSAvIDIsXG4gICAgICAgICdjbGFzcyc6ICdkMy10b29sdGlwLXRleHQgZDMtdG9vbHRpcC10aW1lc3RhbXAnXG4gICAgICB9KVxuICAgICAgLnRleHQoJ2F0ICcgKyB0KTtcbiAgfTtcblxuICB0b29sdGlwLmFkZEdyb3VwID0gZnVuY3Rpb24ocG9vbCwgdHlwZSkge1xuICAgIHRvb2x0aXBzR3JvdXAuYXBwZW5kKCdnJylcbiAgICAgIC5hdHRyKCdpZCcsIHRvb2x0aXAuaWQoKSArICdfJyArIHR5cGUpXG4gICAgICAuYXR0cigndHJhbnNmb3JtJywgcG9vbC5hdHRyKCd0cmFuc2Zvcm0nKSk7XG4gIH07XG5cbiAgLy8gZ2V0dGVycyAmIHNldHRlcnNcbiAgdG9vbHRpcC5pZCA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBpZDtcbiAgICBpZCA9IHRvb2x0aXBzR3JvdXAuYXR0cignaWQnKTtcbiAgICByZXR1cm4gdG9vbHRpcDtcbiAgfTtcblxuICByZXR1cm4gdG9vbHRpcDtcbn07XG4iLCIvKiBcbiAqID09IEJTRDIgTElDRU5TRSA9PVxuICogQ29weXJpZ2h0IChjKSAyMDE0LCBUaWRlcG9vbCBQcm9qZWN0XG4gKiBcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOyB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5IGl0IHVuZGVyXG4gKiB0aGUgdGVybXMgb2YgdGhlIGFzc29jaWF0ZWQgTGljZW5zZSwgd2hpY2ggaXMgaWRlbnRpY2FsIHRvIHRoZSBCU0QgMi1DbGF1c2VcbiAqIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5IHRoZSBPcGVuIFNvdXJjZSBJbml0aWF0aXZlIGF0IG9wZW5zb3VyY2Uub3JnLlxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCwgYnV0IFdJVEhPVVRcbiAqIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTXG4gKiBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuIFNlZSB0aGUgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICogXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtOyBpZlxuICogbm90LCB5b3UgY2FuIG9idGFpbiBvbmUgZnJvbSBUaWRlcG9vbCBQcm9qZWN0IGF0IHRpZGVwb29sLm9yZy5cbiAqID09IEJTRDIgTElDRU5TRSA9PVxuICovXG5cbnZhciBsb2cgPSByZXF1aXJlKCcuL2xpYi9ib3dzJykoJ1Bvb2wnKTtcbiBcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY29udGFpbmVyKSB7XG5cbiAgdmFyIGRhdGEsXG4gICAgaWQsIGxhYmVsLFxuICAgIGluZGV4LCB3ZWlnaHQsIHlQb3NpdGlvbixcbiAgICBoZWlnaHQsIG1pbkhlaWdodCwgbWF4SGVpZ2h0LFxuICAgIGdyb3VwLFxuICAgIG1haW5TVkcgPSBkMy5zZWxlY3QoY29udGFpbmVyLmlkKCkpLFxuICAgIHhTY2FsZSA9IGNvbnRhaW5lci54U2NhbGUoKS5jb3B5KCksXG4gICAgaW1hZ2VzQmFzZVVybCA9IGNvbnRhaW5lci5pbWFnZXNCYXNlVXJsKCksXG4gICAgeUF4aXMgPSBbXSxcbiAgICBwbG90VHlwZXMgPSBbXTtcblxuICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgbWluSGVpZ2h0OiAyMCxcbiAgICBtYXhIZWlnaHQ6IDMwMFxuICB9O1xuXG4gIGZ1bmN0aW9uIHBvb2woc2VsZWN0aW9uLCBwb29sRGF0YSkge1xuICAgIC8vIHNlbGVjdCB0aGUgcG9vbCBncm91cCBpZiBpdCBhbHJlYWR5IGV4aXN0c1xuICAgIGdyb3VwID0gc2VsZWN0aW9uLnNlbGVjdEFsbCgnIycgKyBpZCkuZGF0YShbcG9vbERhdGFdKTtcbiAgICAvLyBvdGhlcndpc2UgY3JlYXRlIGEgbmV3IHBvb2wgZ3JvdXBcbiAgICBncm91cC5lbnRlcigpLmFwcGVuZCgnZycpLmF0dHIoe1xuICAgICAgJ2lkJzogaWQsXG4gICAgICAndHJhbnNmb3JtJzogJ3RyYW5zbGF0ZSgwLCcgKyB5UG9zaXRpb24gKyAnKSdcbiAgICB9KTtcbiAgICBwbG90VHlwZXMuZm9yRWFjaChmdW5jdGlvbihwbG90VHlwZSkge1xuICAgICAgaWYgKGNvbnRhaW5lci5kYXRhRmlsbFtwbG90VHlwZS50eXBlXSkge1xuICAgICAgICBwbG90VHlwZS5kYXRhID0gXy53aGVyZShwb29sRGF0YSwgeyd0eXBlJzogcGxvdFR5cGUudHlwZX0pO1xuICAgICAgICBkYXRhR3JvdXAgPSBncm91cC5zZWxlY3RBbGwoJyMnICsgaWQgKyAnXycgKyBwbG90VHlwZS50eXBlKS5kYXRhKFtwbG90VHlwZS5kYXRhXSk7XG4gICAgICAgIGRhdGFHcm91cC5lbnRlcigpLmFwcGVuZCgnZycpLmF0dHIoJ2lkJywgaWQgKyAnXycgKyBwbG90VHlwZS50eXBlKTtcbiAgICAgICAgZGF0YUdyb3VwLmNhbGwocGxvdFR5cGUucGxvdCk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgcG9vbC5ub0RhdGFGaWxsKHBsb3RUeXBlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBwb29sLmRyYXdBeGlzKCk7XG4gICAgcG9vbC5kcmF3TGFiZWwoKTtcbiAgfVxuXG4gIC8vIGNoYWluYWJsZSBtZXRob2RzXG4gIHBvb2wuZGVmYXVsdHMgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHByb3BlcnRpZXMgPSBkZWZhdWx0cztcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBwcm9wZXJ0aWVzID0gb2JqO1xuICAgIH1cbiAgICB0aGlzLm1pbkhlaWdodChwcm9wZXJ0aWVzLm1pbkhlaWdodCkubWF4SGVpZ2h0KHByb3BlcnRpZXMubWF4SGVpZ2h0KTtcbiAgICB0aGlzLnRvb2x0aXBzKGNvbnRhaW5lci50b29sdGlwcyk7XG5cbiAgICByZXR1cm4gcG9vbDtcbiAgfTtcblxuICBwb29sLnBhbiA9IGZ1bmN0aW9uKGUpIHtcbiAgICBjb250YWluZXIubGF0ZXN0VHJhbnNsYXRpb24oZS50cmFuc2xhdGVbMF0pO1xuICAgIHBsb3RUeXBlcy5mb3JFYWNoKGZ1bmN0aW9uKHBsb3RUeXBlKSB7XG4gICAgICBkMy5zZWxlY3QoJyMnICsgaWQgKyAnXycgKyBwbG90VHlwZS50eXBlKS5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyBlLnRyYW5zbGF0ZVswXSArICcsMCknKTtcbiAgICB9KTtcbiAgfTtcblxuICBwb29sLnNjcm9sbCA9IGZ1bmN0aW9uKGUpIHtcbiAgICBjb250YWluZXIubGF0ZXN0VHJhbnNsYXRpb24oZS50cmFuc2xhdGVbMV0pO1xuICAgIHBsb3RUeXBlcy5mb3JFYWNoKGZ1bmN0aW9uKHBsb3RUeXBlKSB7XG4gICAgICBkMy5zZWxlY3QoJyMnICsgaWQgKyAnXycgKyBwbG90VHlwZS50eXBlKS5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKDAsJyArIGUudHJhbnNsYXRlWzFdICsgJyknKTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBvbmx5IG9uY2UgbWV0aG9kc1xuICBwb29sLmRyYXdMYWJlbCA9IF8ub25jZShmdW5jdGlvbigpIHtcbiAgICB2YXIgbGFiZWxHcm91cCA9IGQzLnNlbGVjdCgnI3RpZGVsaW5lTGFiZWxzJyk7XG4gICAgbGFiZWxHcm91cC5hcHBlbmQoJ3RleHQnKVxuICAgICAgLmF0dHIoe1xuICAgICAgICAnaWQnOiAncG9vbF8nICsgaWQgKyAnX2xhYmVsJyxcbiAgICAgICAgJ2NsYXNzJzogJ2QzLXBvb2wtbGFiZWwnLFxuICAgICAgICAndHJhbnNmb3JtJzogJ3RyYW5zbGF0ZSgnICsgY29udGFpbmVyLmF4aXNHdXR0ZXIoKSArICcsJyArIHlQb3NpdGlvbiArICcpJ1xuICAgICAgfSlcbiAgICAgIC50ZXh0KGxhYmVsKTtcbiAgICByZXR1cm4gcG9vbFxuICB9KTtcblxuICBwb29sLmRyYXdBeGlzID0gXy5vbmNlKGZ1bmN0aW9uKCkge1xuICAgIHZhciBheGlzR3JvdXAgPSBkMy5zZWxlY3QoJyN0aWRlbGluZVlBeGVzJyk7XG4gICAgeUF4aXMuZm9yRWFjaChmdW5jdGlvbihheGlzLCBpKSB7XG4gICAgICBheGlzR3JvdXAuYXBwZW5kKCdnJylcbiAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ2QzLXkgZDMtYXhpcycpXG4gICAgICAgIC5hdHRyKCdpZCcsICdwb29sXycgKyBpZCArICdfeUF4aXNfJyArIGkpXG4gICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyAoY29udGFpbmVyLmF4aXNHdXR0ZXIoKSAtIDEpICsgJywnICsgeVBvc2l0aW9uICsgJyknKVxuICAgICAgICAuY2FsbChheGlzKTtcbiAgICAgIH0pO1xuICAgIHJldHVybiBwb29sO1xuICB9KTtcblxuICBwb29sLm5vRGF0YUZpbGwgPSBfLm9uY2UoZnVuY3Rpb24ocGxvdFR5cGUpIHtcbiAgICBkMy5zZWxlY3QoJyMnICsgaWQpLmFwcGVuZCgnZycpLmF0dHIoJ2lkJywgaWQgKyAnXycgKyBwbG90VHlwZS50eXBlKS5jYWxsKHBsb3RUeXBlLnBsb3QpO1xuICAgIHJldHVybiBwb29sO1xuICB9KTtcblxuICAvLyBnZXR0ZXJzICYgc2V0dGVyc1xuICBwb29sLmlkID0gZnVuY3Rpb24oeCkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGlkO1xuICAgIGlkID0geDtcbiAgICByZXR1cm4gcG9vbDtcbiAgfTtcblxuICBwb29sLmxhYmVsID0gZnVuY3Rpb24oeCkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGxhYmVsO1xuICAgIGxhYmVsID0geDtcbiAgICByZXR1cm4gcG9vbDtcbiAgfTtcblxuICBwb29sLmluZGV4ID0gZnVuY3Rpb24oeCkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGluZGV4O1xuICAgIGluZGV4ID0geDtcbiAgICByZXR1cm4gcG9vbDtcbiAgfTtcblxuICBwb29sLndlaWdodCA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiB3ZWlnaHQ7XG4gICAgd2VpZ2h0ID0geDtcbiAgICByZXR1cm4gcG9vbDtcbiAgfTtcblxuICBwb29sLnlQb3NpdGlvbiA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiB5UG9zaXRpb247XG4gICAgeVBvc2l0aW9uID0geDtcbiAgICByZXR1cm4gcG9vbDtcbiAgfTtcblxuICBwb29sLm1pbkhlaWdodCA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBtaW5IZWlnaHQ7XG4gICAgbWluSGVpZ2h0ID0geDtcbiAgICByZXR1cm4gcG9vbDtcbiAgfTtcblxuICBwb29sLm1heEhlaWdodCA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBtYXhIZWlnaHQ7XG4gICAgbWF4SGVpZ2h0ID0geDtcbiAgICByZXR1cm4gcG9vbDtcbiAgfTtcblxuICBwb29sLmhlaWdodCA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBoZWlnaHQ7XG4gICAgeCA9IHggKiBwb29sLndlaWdodCgpO1xuICAgIGlmICh4IDw9IG1heEhlaWdodCkge1xuICAgICAgaWYgKHggPj0gbWluSGVpZ2h0KSB7XG4gICAgICAgIGhlaWdodCA9IHg7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgaGVpZ2h0ID0gbWluSGVpZ2h0O1xuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGhlaWdodCA9IG1heEhlaWdodDtcbiAgICB9XG4gICAgcmV0dXJuIHBvb2w7XG4gIH07XG5cbiAgcG9vbC5tYWluU1ZHID0gZnVuY3Rpb24oeCkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIG1haW5TVkc7XG4gICAgbWFpblNWRyA9IHg7XG4gICAgcmV0dXJuIHBvb2w7XG4gIH07XG5cbiAgcG9vbC54U2NhbGUgPSBmdW5jdGlvbihmKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4geFNjYWxlO1xuICAgIHhTY2FsZSA9IGY7XG4gICAgcmV0dXJuIHBvb2w7XG4gIH07XG5cbiAgcG9vbC5pbWFnZXNCYXNlVXJsID0gZnVuY3Rpb24oeCkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGltYWdlc0Jhc2VVcmw7XG4gICAgaW1hZ2VzQmFzZVVybCA9IHg7XG4gICAgcmV0dXJuIHBvb2w7XG4gIH07XG5cbiAgLy8gVE9ETzogcmVwbGFjZVxuICBwb29sLnlBeGlzID0gZnVuY3Rpb24oeCkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHlBeGlzO1xuICAgIHlBeGlzLnB1c2goeCk7XG4gICAgcmV0dXJuIHBvb2w7XG4gIH07XG5cbiAgcG9vbC5hZGRQbG90VHlwZSA9IGZ1bmN0aW9uIChkYXRhVHlwZSwgcGxvdEZ1bmN0aW9uLCBkYXRhRmlsbEJvb2xlYW4pIHtcbiAgICBwbG90VHlwZXMucHVzaCh7XG4gICAgICB0eXBlOiBkYXRhVHlwZSxcbiAgICAgIHBsb3Q6IHBsb3RGdW5jdGlvblxuICAgIH0pO1xuICAgIGlmIChkYXRhRmlsbEJvb2xlYW4pIHtcbiAgICAgIGNvbnRhaW5lci5kYXRhRmlsbFtkYXRhVHlwZV0gPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gcG9vbDtcbiAgfTtcblxuICBwb29sLnRvb2x0aXBzID0gZnVuY3Rpb24oeCkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHRvb2x0aXBzO1xuICAgIHRvb2x0aXBzID0geDtcbiAgICByZXR1cm4gdG9vbHRpcHM7XG4gIH07XG5cbiAgcmV0dXJuIHBvb2w7XG59OyIsIi8qIFxuICogPT0gQlNEMiBMSUNFTlNFID09XG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQsIFRpZGVwb29sIFByb2plY3RcbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU7IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnkgaXQgdW5kZXJcbiAqIHRoZSB0ZXJtcyBvZiB0aGUgYXNzb2NpYXRlZCBMaWNlbnNlLCB3aGljaCBpcyBpZGVudGljYWwgdG8gdGhlIEJTRCAyLUNsYXVzZVxuICogTGljZW5zZSBhcyBwdWJsaXNoZWQgYnkgdGhlIE9wZW4gU291cmNlIEluaXRpYXRpdmUgYXQgb3BlbnNvdXJjZS5vcmcuXG4gKiBcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLCBidXQgV0lUSE9VVFxuICogQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2YgTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1NcbiAqIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gU2VlIHRoZSBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKiBcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW07IGlmXG4gKiBub3QsIHlvdSBjYW4gb2J0YWluIG9uZSBmcm9tIFRpZGVwb29sIFByb2plY3QgYXQgdGlkZXBvb2wub3JnLlxuICogPT0gQlNEMiBMSUNFTlNFID09XG4gKi9cblxudmFyIGxvZyA9IHJlcXVpcmUoJy4vbGliL2Jvd3MnKSgnVHdvIFdlZWsnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihlbWl0dGVyKSB7XG4gIHZhciBwb29sID0gcmVxdWlyZSgnLi9wb29sJyk7XG5cbiAgdmFyIE1TX0lOXzI0ID0gODY0MDAwMDA7XG5cbiAgdmFyIGJ1Y2tldCxcbiAgICBpZCxcbiAgICB3aWR0aCwgbWluV2lkdGgsXG4gICAgaGVpZ2h0LCBtaW5IZWlnaHQsXG4gICAgaW1hZ2VzQmFzZVVybCxcbiAgICBzdGF0c0hlaWdodCxcbiAgICBheGlzR3V0dGVyLFxuICAgIG5hdiA9IHt9LFxuICAgIHBvb2xzID0gW10sXG4gICAgeFNjYWxlID0gZDMuc2NhbGUubGluZWFyKCksXG4gICAgeEF4aXMgPSBkMy5zdmcuYXhpcygpLnNjYWxlKHhTY2FsZSkub3JpZW50KCd0b3AnKS5vdXRlclRpY2tTaXplKDApLmlubmVyVGlja1NpemUoMTUpXG4gICAgICAudGlja1ZhbHVlcyhmdW5jdGlvbigpIHtcbiAgICAgICAgYSA9IFtdXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCA4OyBpKyspIHtcbiAgICAgICAgICBhLnB1c2goKE1TX0lOXzI0LzgpICogaSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGE7XG4gICAgICB9KVxuICAgICAgLnRpY2tGb3JtYXQoZnVuY3Rpb24oZCkge1xuICAgICAgICBob3VyID0gZC8oTVNfSU5fMjQvMjQpO1xuICAgICAgICBpZiAoKGhvdXIgPiAwKSAmJiAoaG91ciA8IDEyKSkge1xuICAgICAgICAgIHJldHVybiBob3VyICsgJyBhbSc7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoaG91ciA+IDEyKSB7XG4gICAgICAgICAgcmV0dXJuIChob3VyIC0gMTIpICsgJyBwbSc7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoaG91ciA9PT0gMCkge1xuICAgICAgICAgIHJldHVybiAnMTIgYW0nO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHJldHVybiAnMTIgcG0nO1xuICAgICAgICB9XG4gICAgICB9KSxcbiAgICB5U2NhbGUgPSBkMy50aW1lLnNjYWxlLnV0YygpLFxuICAgIHlBeGlzID0gZDMuc3ZnLmF4aXMoKS5zY2FsZSh5U2NhbGUpLm9yaWVudCgnbGVmdCcpLm91dGVyVGlja1NpemUoMCkudGlja0Zvcm1hdChkMy50aW1lLmZvcm1hdC51dGMoXCIlYSAlLWRcIikpLFxuICAgIGRhdGEsIGFsbERhdGEgPSBbXSwgZW5kcG9pbnRzLCB2aWV3RW5kcG9pbnRzLCBkYXRhU3RhcnROb29uLCB2aWV3SW5kZXgsXG4gICAgbWFpbkdyb3VwLCBzY3JvbGxOYXYsIHNjcm9sbEhhbmRsZVRyaWdnZXIgPSB0cnVlO1xuXG4gIGNvbnRhaW5lci5kYXRhRmlsbCA9IHt9O1xuXG4gIHZhciBkZWZhdWx0cyA9IHtcbiAgICBidWNrZXQ6ICQoJyN0aWRlbGluZUNvbnRhaW5lcicpLFxuICAgIGlkOiAndGlkZWxpbmVTVkcnLFxuICAgIG1pbldpZHRoOiA0MDAsXG4gICAgbWluSGVpZ2h0OiA0MDAsXG4gICAgaW1hZ2VzQmFzZVVybDogJ2ltZycsXG4gICAgbmF2OiB7XG4gICAgICBtaW5OYXZIZWlnaHQ6IDMwLFxuICAgICAgbGF0ZXN0VHJhbnNsYXRpb246IDAsXG4gICAgICBjdXJyZW50VHJhbnNsYXRpb246IDAsXG4gICAgICBzY3JvbGxUaHVtYlJhZGl1czogOCxcbiAgICAgIG5hdkd1dHRlcjogMjBcbiAgICB9LFxuICAgIGF4aXNHdXR0ZXI6IDYwLFxuICAgIHN0YXRzSGVpZ2h0OiA1MFxuICB9O1xuXG4gIGZ1bmN0aW9uIGNvbnRhaW5lcihzZWxlY3Rpb24pIHtcbiAgICBzZWxlY3Rpb24uZWFjaChmdW5jdGlvbihjdXJyZW50RGF0YSkge1xuICAgICAgLy8gc2VsZWN0IHRoZSBTVkcgaWYgaXQgYWxyZWFkeSBleGlzdHNcbiAgICAgIHZhciBtYWluU1ZHID0gc2VsZWN0aW9uLnNlbGVjdEFsbCgnc3ZnJykuZGF0YShbY3VycmVudERhdGFdKTtcbiAgICAgIC8vIG90aGVyd2lzZSBjcmVhdGUgYSBuZXcgU1ZHIGFuZCBlbnRlciAgIFxuICAgICAgbWFpbkdyb3VwID0gbWFpblNWRy5lbnRlcigpLmFwcGVuZCgnc3ZnJykuYXBwZW5kKCdnJykuYXR0cignaWQnLCAndGlkZWxpbmVNYWluJyk7XG5cbiAgICAgIC8vIHVwZGF0ZSBTVkcgZGltZW5pb25zIGFuZCBJRFxuICAgICAgbWFpblNWRy5hdHRyKHtcbiAgICAgICAgJ2lkJzogaWQsXG4gICAgICAgICd3aWR0aCc6IHdpZHRoLFxuICAgICAgICAnaGVpZ2h0JzogaGVpZ2h0XG4gICAgICB9KTtcblxuICAgICAgbWFpbkdyb3VwLmFwcGVuZCgncmVjdCcpXG4gICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAnaWQnOiAncG9vbHNJbnZpc2libGVSZWN0JyxcbiAgICAgICAgICAnd2lkdGgnOiB3aWR0aCAtIG5hdi5uYXZHdXR0ZXIsXG4gICAgICAgICAgJ2hlaWdodCc6IGhlaWdodCxcbiAgICAgICAgICAnb3BhY2l0eSc6IDAuMFxuICAgICAgICB9KTtcblxuICAgICAgY29udGFpbmVyLnBvb2xHcm91cCA9IG1haW5Hcm91cC5hcHBlbmQoJ2cnKS5hdHRyKCdpZCcsICd0aWRlbGluZVBvb2xzJyk7XG5cbiAgICAgIC8vIHNldCB0aGUgZG9tYWluIGFuZCByYW5nZSBmb3IgdGhlIHR3by13ZWVrIHgtc2NhbGVcbiAgICAgIHhTY2FsZS5kb21haW4oWzAsIE1TX0lOXzI0XSlcbiAgICAgICAgLnJhbmdlKFtjb250YWluZXIuYXhpc0d1dHRlcigpLCB3aWR0aCAtIG5hdi5uYXZHdXR0ZXJdKTtcblxuICAgICAgbWFpbkdyb3VwLmFwcGVuZCgnZycpXG4gICAgICAgIC5hdHRyKCdpZCcsICd0aWRlbGluZVhBeGlzR3JvdXAnKVxuICAgICAgICAuYXBwZW5kKCdyZWN0JylcbiAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICdpZCc6ICd4QXhpc0ludmlzaWJsZVJlY3QnLFxuICAgICAgICAgICd4JzogY29udGFpbmVyLmF4aXNHdXR0ZXIoKSxcbiAgICAgICAgICAnaGVpZ2h0JzogbmF2LmF4aXNIZWlnaHQgLSAyLFxuICAgICAgICAgICd3aWR0aCc6IHdpZHRoIC0gYXhpc0d1dHRlcixcbiAgICAgICAgICAnZmlsbCc6ICd3aGl0ZSdcbiAgICAgICAgfSk7XG5cbiAgICAgIGQzLnNlbGVjdCgnI3RpZGVsaW5lWEF4aXNHcm91cCcpXG4gICAgICAgIC5hcHBlbmQoJ2cnKVxuICAgICAgICAuYXR0cignY2xhc3MnLCAnZDMteCBkMy1heGlzJylcbiAgICAgICAgLmF0dHIoJ2lkJywgJ3RpZGVsaW5lWEF4aXMnKVxuICAgICAgICAuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgwLCcgKyAobmF2LmF4aXNIZWlnaHQgLSAxKSArICcpJylcbiAgICAgICAgLmNhbGwoeEF4aXMpO1xuXG4gICAgICBkMy5zZWxlY3RBbGwoJyN0aWRlbGluZVhBeGlzIGcudGljayB0ZXh0Jykuc3R5bGUoJ3RleHQtYW5jaG9yJywgJ3N0YXJ0JykuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSg1LDE1KScpO1xuXG4gICAgICAvLyBzZXQgdGhlIGRvbWFpbiBhbmQgcmFuZ2UgZm9yIHRoZSBtYWluIHR3by13ZWVrIHktc2NhbGVcbiAgICAgIHlTY2FsZS5kb21haW4odmlld0VuZHBvaW50cylcbiAgICAgICAgLnJhbmdlKFtuYXYuYXhpc0hlaWdodCwgaGVpZ2h0IC0gc3RhdHNIZWlnaHRdKVxuICAgICAgICAudGlja3MoZDMudGltZS5kYXkudXRjLCAxKTtcblxuICAgICAgY29udGFpbmVyLm5hdlN0cmluZyh5U2NhbGUuZG9tYWluKCkpO1xuXG4gICAgICBtYWluR3JvdXAuYXBwZW5kKCdnJylcbiAgICAgICAgLmF0dHIoJ2lkJywgJ3RpZGVsaW5lWUF4aXNHcm91cCcpXG4gICAgICAgIC5hcHBlbmQoJ3JlY3QnKVxuICAgICAgICAuYXR0cih7XG4gICAgICAgICAgJ2lkJzogJ3lBeGlzSW52aXNpYmxlUmVjdCcsXG4gICAgICAgICAgJ3gnOiAwLFxuICAgICAgICAgICdoZWlnaHQnOiBoZWlnaHQsXG4gICAgICAgICAgJ3dpZHRoJzogYXhpc0d1dHRlcixcbiAgICAgICAgICAnZmlsbCc6ICd3aGl0ZSdcbiAgICAgICAgfSk7XG5cbiAgICAgIGQzLnNlbGVjdCgnI3RpZGVsaW5lWUF4aXNHcm91cCcpXG4gICAgICAgIC5hcHBlbmQoJ2cnKVxuICAgICAgICAuYXR0cignY2xhc3MnLCAnZDMteSBkMy1heGlzIGQzLWRheS1heGlzJylcbiAgICAgICAgLmF0dHIoJ2lkJywgJ3RpZGVsaW5lWUF4aXMnKVxuICAgICAgICAuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgnICsgKGF4aXNHdXR0ZXIgLSAxKSArICcsMCknKVxuICAgICAgICAuY2FsbCh5QXhpcyk7XG5cbiAgICAgIGNvbnRhaW5lci5kYXlzR3JvdXAgPSBjb250YWluZXIucG9vbEdyb3VwLmFwcGVuZCgnZycpLmF0dHIoJ2lkJywgJ2RheXNHcm91cCcpO1xuXG4gICAgICBzdGF0c0dyb3VwID0gY29udGFpbmVyLnBvb2xHcm91cC5hcHBlbmQoJ2cnKS5hdHRyKCdpZCcsICdwb29sU3RhdHMnKVxuICAgICAgICAuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgnICsgY29udGFpbmVyLmF4aXNHdXR0ZXIoKSArICcsJyArIChoZWlnaHQgLSBjb250YWluZXIuc3RhdHNIZWlnaHQoKSkgKyAnKScpXG4gICAgICAgIC5hcHBlbmQoJ3JlY3QnKVxuICAgICAgICAuYXR0cih7XG4gICAgICAgICAgJ3gnOiAwLFxuICAgICAgICAgICd5JzogMCxcbiAgICAgICAgICAnd2lkdGgnOiB3aWR0aCAtIGNvbnRhaW5lci5heGlzR3V0dGVyKCkgLSBjb250YWluZXIubmF2R3V0dGVyKCksXG4gICAgICAgICAgJ2hlaWdodCc6IGNvbnRhaW5lci5zdGF0c0hlaWdodCgpLFxuICAgICAgICAgICdmaWxsJzogJ3doaXRlJ1xuICAgICAgICB9KTtcblxuICAgICAgc2Nyb2xsTmF2ID0gbWFpbkdyb3VwLmFwcGVuZCgnZycpXG4gICAgICAgIC5hdHRyKCdjbGFzcycsICd5IHNjcm9sbCcpXG4gICAgICAgIC5hdHRyKCdpZCcsICd0aWRlbGluZVNjcm9sbE5hdicpO1xuXG4gICAgICBuYXYuc2Nyb2xsU2NhbGUgPSBkMy50aW1lLnNjYWxlLnV0YygpXG4gICAgICAgIC5kb21haW4oW2RhdGFTdGFydE5vb24sIGRhdGFFbmROb29uXSlcbiAgICAgICAgLnJhbmdlKFtuYXYuYXhpc0hlaWdodCArIG5hdi5zY3JvbGxUaHVtYlJhZGl1cywgaGVpZ2h0IC0gc3RhdHNIZWlnaHQgLSBuYXYuc2Nyb2xsVGh1bWJSYWRpdXNdKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIG5vbi1jaGFpbmFibGUgbWV0aG9kc1xuICBjb250YWluZXIubmV3UG9vbCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBwID0gbmV3IHBvb2woY29udGFpbmVyKTtcbiAgICBwb29scy5wdXNoKHApO1xuICAgIHJldHVybiBwO1xuICB9O1xuXG4gIGNvbnRhaW5lci5hcnJhbmdlUG9vbHMgPSBmdW5jdGlvbigpIHtcbiAgICAvLyAxNCBkYXlzID0gMiB3ZWVrc1xuICAgIC8vIFRPRE86IGV2ZW50dWFsbHkgZmFjdG9yIHRoaXMgb3V0IHNvIHRoYXQgdGhpcyB2aWV3IGNvdWxkIGJlIGdlbmVyYWxpemVkIHRvIGFub3RoZXIgdGltZSBwZXJpb2RcbiAgICB2YXIgbnVtUG9vbHMgPSAxNDtcbiAgICAvLyBhbGwgdHdvLXdlZWsgcG9vbHMgaGF2ZSBhIHdlaWdodCBvZiAxLjBcbiAgICB2YXIgd2VpZ2h0ID0gMS4wO1xuICAgIHZhciBjdW1XZWlnaHQgPSB3ZWlnaHQgKiBudW1Qb29scztcbiAgICB2YXIgdG90YWxQb29sc0hlaWdodCA9IFxuICAgICAgY29udGFpbmVyLmhlaWdodCgpIC0gY29udGFpbmVyLmF4aXNIZWlnaHQoKSAtIGNvbnRhaW5lci5zdGF0c0hlaWdodCgpO1xuICAgIHZhciBwb29sU2NhbGVIZWlnaHQgPSB0b3RhbFBvb2xzSGVpZ2h0L2N1bVdlaWdodDtcbiAgICB2YXIgYWN0dWFsUG9vbHNIZWlnaHQgPSAwO1xuICAgIHBvb2xzLmZvckVhY2goZnVuY3Rpb24ocG9vbCkge1xuICAgICAgcG9vbC5oZWlnaHQocG9vbFNjYWxlSGVpZ2h0KTtcbiAgICAgIGFjdHVhbFBvb2xzSGVpZ2h0ICs9IHBvb2wuaGVpZ2h0KCk7XG4gICAgICBwb29sU2NhbGVIZWlnaHQgPSBwb29sLmhlaWdodCgpO1xuICAgIH0pO1xuICAgIHZhciBjdXJyZW50WVBvc2l0aW9uID0gY29udGFpbmVyLmhlaWdodCgpIC0gY29udGFpbmVyLnN0YXRzSGVpZ2h0KCkgLSBwb29sU2NhbGVIZWlnaHQ7XG4gICAgdmFyIG5leHRCYXRjaFlQb3NpdGlvbiA9IGN1cnJlbnRZUG9zaXRpb24gKyBwb29sU2NhbGVIZWlnaHQ7XG4gICAgZm9yICh2YXIgaSA9IHZpZXdJbmRleDsgaSA8IHBvb2xzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBwb29sID0gcG9vbHNbaV07XG4gICAgICBwb29sLnlQb3NpdGlvbihjdXJyZW50WVBvc2l0aW9uKTtcbiAgICAgIGN1cnJlbnRZUG9zaXRpb24gLT0gcG9vbC5oZWlnaHQoKTtcbiAgICB9XG4gICAgY3VycmVudFlQb3NpdGlvbiA9IG5leHRCYXRjaFlQb3NpdGlvbjtcbiAgICBmb3IgKHZhciBpID0gdmlld0luZGV4IC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgIHBvb2wgPSBwb29sc1tpXTtcbiAgICAgIHBvb2wueVBvc2l0aW9uKGN1cnJlbnRZUG9zaXRpb24pO1xuICAgICAgY3VycmVudFlQb3NpdGlvbiArPSBwb29sLmhlaWdodCgpO1xuICAgIH1cbiAgfTtcblxuICBjb250YWluZXIuZGVzdHJveSA9IGZ1bmN0aW9uKCkge1xuICAgICQoJyMnICsgdGhpcy5pZCgpKS5yZW1vdmUoKTtcbiAgICBlbWl0dGVyLnJlbW92ZUFsbExpc3RlbmVycygnbnVtYmVycycpO1xuICB9O1xuXG4gIGNvbnRhaW5lci5uYXZTdHJpbmcgPSBmdW5jdGlvbihhKSB7XG4gICAgdmFyIG1vbnRoRGF5ID0gZDMudGltZS5mb3JtYXQudXRjKFwiJUIgJS1kXCIpO1xuICAgIHZhciBuYXZTdHJpbmcgPSBtb250aERheShuZXcgRGF0ZShhWzBdLnNldFVUQ0RhdGUoYVswXS5nZXRVVENEYXRlKCkgKyAxKSkpICsgJyAtICcgKyBtb250aERheShhWzFdKTtcbiAgICBlbWl0dGVyLmVtaXQoJ25hdmlnYXRlZCcsIG5hdlN0cmluZyk7XG4gIH07XG5cbiAgLy8gY2hhaW5hYmxlIG1ldGhvZHNcbiAgY29udGFpbmVyLmRlZmF1bHRzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICBwcm9wZXJ0aWVzID0gZGVmYXVsdHM7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcHJvcGVydGllcyA9IG9iajtcbiAgICB9XG4gICAgdGhpcy5idWNrZXQocHJvcGVydGllcy5idWNrZXQpO1xuICAgIHRoaXMuaWQocHJvcGVydGllcy5pZCk7XG4gICAgdGhpcy5taW5XaWR0aChwcm9wZXJ0aWVzLm1pbldpZHRoKS53aWR0aChwcm9wZXJ0aWVzLndpZHRoKTtcbiAgICB0aGlzLm1pbk5hdkhlaWdodChwcm9wZXJ0aWVzLm5hdi5taW5OYXZIZWlnaHQpLmF4aXNIZWlnaHQocHJvcGVydGllcy5uYXYubWluTmF2SGVpZ2h0KVxuICAgICAgLnNjcm9sbFRodW1iUmFkaXVzKHByb3BlcnRpZXMubmF2LnNjcm9sbFRodW1iUmFkaXVzKVxuICAgICAgLm5hdkd1dHRlcihwcm9wZXJ0aWVzLm5hdi5uYXZHdXR0ZXIpO1xuICAgIHRoaXMubWluSGVpZ2h0KHByb3BlcnRpZXMubWluSGVpZ2h0KS5oZWlnaHQocHJvcGVydGllcy5taW5IZWlnaHQpLnN0YXRzSGVpZ2h0KHByb3BlcnRpZXMuc3RhdHNIZWlnaHQpO1xuICAgIHRoaXMubGF0ZXN0VHJhbnNsYXRpb24ocHJvcGVydGllcy5uYXYubGF0ZXN0VHJhbnNsYXRpb24pXG4gICAgICAuY3VycmVudFRyYW5zbGF0aW9uKHByb3BlcnRpZXMubmF2LmN1cnJlbnRUcmFuc2xhdGlvbik7XG4gICAgdGhpcy5heGlzR3V0dGVyKHByb3BlcnRpZXMuYXhpc0d1dHRlcik7XG4gICAgdGhpcy5pbWFnZXNCYXNlVXJsKHByb3BlcnRpZXMuaW1hZ2VzQmFzZVVybCk7XG5cbiAgICByZXR1cm4gY29udGFpbmVyO1xuICB9O1xuXG4gIGNvbnRhaW5lci5zZXROYXYgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbWF4VHJhbnNsYXRpb24gPSAteVNjYWxlKGRhdGFTdGFydE5vb24pICsgeVNjYWxlLnJhbmdlKClbMV0gLSAoaGVpZ2h0IC0gbmF2LmF4aXNIZWlnaHQgLSBzdGF0c0hlaWdodCk7XG4gICAgdmFyIG1pblRyYW5zbGF0aW9uID0gLXlTY2FsZShkYXRhRW5kTm9vbikgKyB5U2NhbGUucmFuZ2UoKVsxXSAtIChoZWlnaHQgLSBuYXYuYXhpc0hlaWdodCAtIHN0YXRzSGVpZ2h0KTtcbiAgICBuYXYuc2Nyb2xsID0gZDMuYmVoYXZpb3Iuem9vbSgpXG4gICAgICAuc2NhbGVFeHRlbnQoWzEsIDFdKVxuICAgICAgLnkoeVNjYWxlKVxuICAgICAgLm9uKCd6b29tJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBlID0gZDMuZXZlbnQ7XG4gICAgICAgIGlmIChlLnRyYW5zbGF0ZVsxXSA8IG1pblRyYW5zbGF0aW9uKSB7XG4gICAgICAgICAgZS50cmFuc2xhdGVbMV0gPSBtaW5UcmFuc2xhdGlvbjtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChlLnRyYW5zbGF0ZVsxXSA+IG1heFRyYW5zbGF0aW9uKSB7XG4gICAgICAgICAgZS50cmFuc2xhdGVbMV0gPSBtYXhUcmFuc2xhdGlvbjtcbiAgICAgICAgfVxuICAgICAgICBuYXYuc2Nyb2xsLnRyYW5zbGF0ZShbMCwgZS50cmFuc2xhdGVbMV1dKTtcbiAgICAgICAgZDMuc2VsZWN0KCcuZDMteS5kMy1heGlzJykuY2FsbCh5QXhpcyk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcG9vbHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBwb29sc1tpXS5zY3JvbGwoZSk7XG4gICAgICAgIH1cbiAgICAgICAgY29udGFpbmVyLm5hdlN0cmluZyh5U2NhbGUuZG9tYWluKCkpO1xuICAgICAgICBpZiAoc2Nyb2xsSGFuZGxlVHJpZ2dlcikge1xuICAgICAgICAgIGQzLnNlbGVjdCgnI3Njcm9sbFRodW1iJykudHJhbnNpdGlvbigpLmVhc2UoJ2xpbmVhcicpLmF0dHIoJ3knLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICBkLnkgPSBuYXYuc2Nyb2xsU2NhbGUoeVNjYWxlLmRvbWFpbigpWzBdKTtcbiAgICAgICAgICAgIHJldHVybiBkLnkgLSBuYXYuc2Nyb2xsVGh1bWJSYWRpdXM7XG4gICAgICAgICAgfSk7ICAgICAgIFxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLm9uKCd6b29tZW5kJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnRhaW5lci5jdXJyZW50VHJhbnNsYXRpb24obmF2LmxhdGVzdFRyYW5zbGF0aW9uKTtcbiAgICAgICAgc2Nyb2xsSGFuZGxlVHJpZ2dlciA9IHRydWU7XG4gICAgICB9KTtcblxuICAgIG1haW5Hcm91cC5jYWxsKG5hdi5zY3JvbGwpO1xuXG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICBjb250YWluZXIuc2V0U2Nyb2xsTmF2ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRyYW5zbGF0aW9uQWRqdXN0bWVudCA9IHlTY2FsZS5yYW5nZSgpWzFdIC0gKGhlaWdodCAtIG5hdi5heGlzSGVpZ2h0IC0gc3RhdHNIZWlnaHQpO1xuICAgIHZhciB4UG9zID0gbmF2Lm5hdkd1dHRlciAvIDI7XG5cbiAgICBzY3JvbGxOYXYuYXBwZW5kKCdyZWN0JylcbiAgICAuYXR0cih7XG4gICAgICAneCc6IDAsXG4gICAgICAneSc6IG5hdi5zY3JvbGxTY2FsZShkYXRhU3RhcnROb29uKSAtIG5hdi5zY3JvbGxUaHVtYlJhZGl1cyxcbiAgICAgICd3aWR0aCc6IG5hdi5uYXZHdXR0ZXIsXG4gICAgICAnaGVpZ2h0JzogaGVpZ2h0IC0gbmF2LmF4aXNIZWlnaHQsXG4gICAgICAnZmlsbCc6ICd3aGl0ZScsXG4gICAgICAnaWQnOiAnc2Nyb2xsTmF2SW52aXNpYmxlUmVjdCdcbiAgICB9KTtcblxuICAgIHNjcm9sbE5hdi5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyAod2lkdGggLSBuYXYubmF2R3V0dGVyKSArICcsMCknKVxuICAgICAgLmFwcGVuZCgnbGluZScpXG4gICAgICAuYXR0cih7XG4gICAgICAgICd4MSc6IHhQb3MsXG4gICAgICAgICd4Mic6IHhQb3MsXG4gICAgICAgICd5MSc6IG5hdi5zY3JvbGxTY2FsZShkYXRhU3RhcnROb29uKSAtIG5hdi5zY3JvbGxUaHVtYlJhZGl1cyxcbiAgICAgICAgJ3kyJzogbmF2LnNjcm9sbFNjYWxlKGRhdGFFbmROb29uKSArIG5hdi5zY3JvbGxUaHVtYlJhZGl1c1xuICAgICAgfSk7XG5cbiAgICB2YXIgZHlMb3dlc3QgPSBuYXYuc2Nyb2xsU2NhbGUucmFuZ2UoKVsxXTtcbiAgICB2YXIgZHlIaWdoZXN0ID0gbmF2LnNjcm9sbFNjYWxlLnJhbmdlKClbMF07XG5cbiAgICB2YXIgZHJhZyA9IGQzLmJlaGF2aW9yLmRyYWcoKVxuICAgICAgLm9yaWdpbihmdW5jdGlvbihkKSB7XG4gICAgICAgIHJldHVybiBkO1xuICAgICAgfSlcbiAgICAgIC5vbignZHJhZ3N0YXJ0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGQzLmV2ZW50LnNvdXJjZUV2ZW50LnN0b3BQcm9wYWdhdGlvbigpOyAvLyBzaWxlbmNlIHRoZSBjbGljay1hbmQtZHJhZyBsaXN0ZW5lclxuICAgICAgfSlcbiAgICAgIC5vbignZHJhZycsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgZC55ICs9IGQzLmV2ZW50LmR5O1xuICAgICAgICBpZiAoZC55ID4gZHlMb3dlc3QpIHtcbiAgICAgICAgICBkLnkgPSBkeUxvd2VzdDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkLnkgPCBkeUhpZ2hlc3QpIHtcbiAgICAgICAgICBkLnkgPSBkeUhpZ2hlc3Q7XG4gICAgICAgIH1cbiAgICAgICAgZDMuc2VsZWN0KHRoaXMpLmF0dHIoJ3knLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLnkgLSBuYXYuc2Nyb2xsVGh1bWJSYWRpdXM7IH0pO1xuICAgICAgICB2YXIgZGF0ZSA9IG5hdi5zY3JvbGxTY2FsZS5pbnZlcnQoZC55KTtcbiAgICAgICAgbmF2LmN1cnJlbnRUcmFuc2xhdGlvbiAtPSB5U2NhbGUoZGF0ZSkgLSB0cmFuc2xhdGlvbkFkanVzdG1lbnQ7XG4gICAgICAgIHNjcm9sbEhhbmRsZVRyaWdnZXIgPSBmYWxzZTtcbiAgICAgICAgbmF2LnNjcm9sbC50cmFuc2xhdGUoWzAsIG5hdi5jdXJyZW50VHJhbnNsYXRpb25dKTtcbiAgICAgICAgbmF2LnNjcm9sbC5ldmVudChtYWluR3JvdXApO1xuICAgICAgfSk7XG5cbiAgICBzY3JvbGxOYXYuc2VsZWN0QWxsKCdpbWFnZScpXG4gICAgICAuZGF0YShbeyd4JzogMCwgJ3knOiBuYXYuc2Nyb2xsU2NhbGUodmlld0VuZHBvaW50c1swXSl9XSlcbiAgICAgIC5lbnRlcigpXG4gICAgICAuYXBwZW5kKCdpbWFnZScpXG4gICAgICAuYXR0cih7XG4gICAgICAgICd4bGluazpocmVmJzogaW1hZ2VzQmFzZVVybCArICcvdXgvc2Nyb2xsX3RodW1iLnN2ZycsXG4gICAgICAgICd4JzogeFBvcyAtIG5hdi5zY3JvbGxUaHVtYlJhZGl1cyxcbiAgICAgICAgJ3knOiBmdW5jdGlvbihkKSB7IHJldHVybiBkLnkgLSBuYXYuc2Nyb2xsVGh1bWJSYWRpdXM7IH0sXG4gICAgICAgICd3aWR0aCc6IDIgKiBuYXYuc2Nyb2xsVGh1bWJSYWRpdXMsXG4gICAgICAgICdoZWlnaHQnOiAyICogbmF2LnNjcm9sbFRodW1iUmFkaXVzLFxuICAgICAgICAnaWQnOiAnc2Nyb2xsVGh1bWInXG4gICAgICB9KVxuICAgICAgLmNhbGwoZHJhZyk7XG5cbiAgICByZXR1cm4gY29udGFpbmVyO1xuICB9O1xuXG4gIC8vIGdldHRlcnMgYW5kIHNldHRlcnNcbiAgY29udGFpbmVyLmJ1Y2tldCA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBidWNrZXQ7XG4gICAgYnVja2V0ID0geDtcbiAgICByZXR1cm4gY29udGFpbmVyO1xuICB9O1xuXG4gIGNvbnRhaW5lci5pZCA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBpZDtcbiAgICBpZCA9IHg7XG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICBjb250YWluZXIud2lkdGggPSBmdW5jdGlvbih4KSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gd2lkdGg7XG4gICAgaWYgKHggPj0gbWluV2lkdGgpIHtcbiAgICAgIGlmICh4ID4gYnVja2V0LndpZHRoKCkpIHtcbiAgICAgICAgd2lkdGggPSBidWNrZXQud2lkdGgoKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB3aWR0aCA9IHg7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgd2lkdGggPSBtaW5XaWR0aDtcbiAgICB9XG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICBjb250YWluZXIubWluV2lkdGggPSBmdW5jdGlvbih4KSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gbWluV2lkdGg7XG4gICAgbWluV2lkdGggPSB4O1xuICAgIHJldHVybiBjb250YWluZXI7XG4gIH07XG5cbiAgY29udGFpbmVyLmhlaWdodCA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBoZWlnaHQ7XG4gICAgdmFyIHRvdGFsSGVpZ2h0ID0geCArIGNvbnRhaW5lci5heGlzSGVpZ2h0KCk7XG4gICAgaWYgKG5hdi5zY3JvbGxOYXYpIHtcbiAgICAgIHRvdGFsSGVpZ2h0ICs9IGNvbnRhaW5lci5zY3JvbGxOYXZIZWlnaHQoKTtcbiAgICB9XG4gICAgaWYgKHRvdGFsSGVpZ2h0ID49IG1pbkhlaWdodCkge1xuICAgICAgaWYgKHRvdGFsSGVpZ2h0ID4gYnVja2V0LmhlaWdodCgpKSB7XG4gICAgICAgIGhlaWdodCA9IGJ1Y2tldC5oZWlnaHQoKSAtIGNvbnRhaW5lci5heGlzSGVpZ2h0KCk7XG4gICAgICAgIGlmIChuYXYuc2Nyb2xsTmF2KSB7XG4gICAgICAgICAgaGVpZ2h0IC09IGNvbnRhaW5lci5zY3JvbGxOYXZIZWlnaHQoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGhlaWdodCA9IHg7IFxuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGhlaWdodCA9IG1pbkhlaWdodDtcbiAgICB9XG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICBjb250YWluZXIubWluSGVpZ2h0ID0gZnVuY3Rpb24oeCkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGhlaWdodDtcbiAgICBtaW5IZWlnaHQgPSB4O1xuICAgIHJldHVybiBjb250YWluZXI7XG4gIH07XG5cbiAgY29udGFpbmVyLmltYWdlc0Jhc2VVcmwgPSBmdW5jdGlvbih4KSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gaW1hZ2VzQmFzZVVybDtcbiAgICBpbWFnZXNCYXNlVXJsID0geDtcbiAgICByZXR1cm4gY29udGFpbmVyO1xuICB9O1xuXG4gIGNvbnRhaW5lci5zdGF0c0hlaWdodCA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBzdGF0c0hlaWdodDtcbiAgICBzdGF0c0hlaWdodCA9IHg7XG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICAvLyBuYXYgZ2V0dGVycyBhbmQgc2V0dGVyc1xuICBjb250YWluZXIuYXhpc0hlaWdodCA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBuYXYuYXhpc0hlaWdodDtcbiAgICBpZiAoeCA+PSBuYXYubWluTmF2SGVpZ2h0KSB7XG4gICAgICBuYXYuYXhpc0hlaWdodCA9IHg7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgbmF2LmF4aXNIZWlnaHQgPSBuYXYubWluTmF2SGVpZ2h0O1xuICAgIH1cbiAgICByZXR1cm4gY29udGFpbmVyO1xuICB9O1xuXG4gIGNvbnRhaW5lci5taW5OYXZIZWlnaHQgPSBmdW5jdGlvbih4KSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gbmF2Lm1pbk5hdkhlaWdodDtcbiAgICBuYXYubWluTmF2SGVpZ2h0ID0geDtcbiAgICByZXR1cm4gY29udGFpbmVyO1xuICB9O1xuXG4gIGNvbnRhaW5lci5zY3JvbGxUaHVtYlJhZGl1cyA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBuYXYuc2Nyb2xsVGh1bWJSYWRpdXM7XG4gICAgbmF2LnNjcm9sbFRodW1iUmFkaXVzID0geDtcbiAgICByZXR1cm4gY29udGFpbmVyXG4gIH07XG5cbiAgY29udGFpbmVyLm5hdkd1dHRlciA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBuYXYubmF2R3V0dGVyO1xuICAgIG5hdi5uYXZHdXR0ZXIgPSB4O1xuICAgIHJldHVybiBjb250YWluZXI7XG4gIH07XG5cbiAgY29udGFpbmVyLnNjcm9sbCA9IGZ1bmN0aW9uKGYpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBuYXYuc2Nyb2xsO1xuICAgIG5hdi5zY3JvbGwgPSBmO1xuICAgIHJldHVybiBjb250YWluZXI7XG4gIH07XG5cbiAgY29udGFpbmVyLmxhdGVzdFRyYW5zbGF0aW9uID0gZnVuY3Rpb24oeCkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIG5hdi5sYXRlc3RUcmFuc2xhdGlvbjtcbiAgICBuYXYubGF0ZXN0VHJhbnNsYXRpb24gPSB4O1xuICAgIHJldHVybiBjb250YWluZXI7XG4gIH07XG5cbiAgY29udGFpbmVyLmN1cnJlbnRUcmFuc2xhdGlvbiA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBuYXYuY3VycmVudFRyYW5zbGF0aW9uO1xuICAgIG5hdi5jdXJyZW50VHJhbnNsYXRpb24gPSB4O1xuICAgIHJldHVybiBjb250YWluZXI7XG4gIH07XG5cbiAgLy8gcG9vbHMgZ2V0dGVyIGFuZCBzZXR0ZXJcbiAgY29udGFpbmVyLnBvb2xzID0gZnVuY3Rpb24oYSkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHBvb2xzO1xuICAgIHBvb2xzID0gYTtcbiAgICByZXR1cm4gY29udGFpbmVyO1xuICB9O1xuXG4gIGNvbnRhaW5lci5heGlzR3V0dGVyID0gZnVuY3Rpb24oeCkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGF4aXNHdXR0ZXI7XG4gICAgYXhpc0d1dHRlciA9IHg7XG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICAvLyBzY2FsZXMgYW5kIGF4ZXMgZ2V0dGVycyBhbmQgc2V0dGVyc1xuICBjb250YWluZXIueFNjYWxlID0gZnVuY3Rpb24oZikge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHhTY2FsZTtcbiAgICB4U2NhbGUgPSBmO1xuICAgIHJldHVybiBjb250YWluZXI7XG4gIH07XG5cbiAgY29udGFpbmVyLnhBeGlzID0gZnVuY3Rpb24oZikge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHhBeGlzO1xuICAgIHhBeGlzID0gZjtcbiAgICByZXR1cm4gY29udGFpbmVyO1xuICB9O1xuXG4gIGNvbnRhaW5lci52aWV3RW5kcG9pbnRzID0gZnVuY3Rpb24oYSkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHZpZXdFbmRwb2ludHM7XG4gICAgdmlld0VuZHBvaW50cyA9IGE7XG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICAvLyBkYXRhIGdldHRlcnMgYW5kIHNldHRlcnNcbiAgY29udGFpbmVyLmRhdGEgPSBmdW5jdGlvbihhLCB2aWV3RW5kRGF0ZSkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGRhdGE7XG4gICAgZGF0YSA9IGE7XG5cbiAgICB2YXIgZmlyc3QgPSBuZXcgRGF0ZShhWzBdLm5vcm1hbFRpbWUpO1xuICAgIHZhciBsYXN0ID0gbmV3IERhdGUoYVthLmxlbmd0aCAtIDFdLm5vcm1hbFRpbWUpO1xuICAgIFxuICAgIGVuZHBvaW50cyA9IFtmaXJzdCwgbGFzdF07XG4gICAgY29udGFpbmVyLmVuZHBvaW50cyA9IGVuZHBvaW50cztcblxuICAgIGZ1bmN0aW9uIGNyZWF0ZURheShkKSB7XG4gICAgICByZXR1cm4gbmV3IERhdGUoZC5nZXRVVENGdWxsWWVhcigpLCBkLmdldFVUQ01vbnRoKCksIGQuZ2V0VVRDRGF0ZSgpLCAwLCAwLCAwKTtcbiAgICB9XG4gICAgdmFyIGRheXMgPSBbXTtcbiAgICB2YXIgZmlyc3REYXkgPSBjcmVhdGVEYXkobmV3IERhdGUoY29udGFpbmVyLmVuZHBvaW50c1swXSkpO1xuICAgIHZhciBsYXN0RGF5ID0gY3JlYXRlRGF5KG5ldyBEYXRlKGNvbnRhaW5lci5lbmRwb2ludHNbMV0pKTtcbiAgICBkYXlzLnB1c2goZmlyc3REYXkudG9JU09TdHJpbmcoKS5zbGljZSgwLDEwKSk7XG4gICAgdmFyIGN1cnJlbnREYXkgPSBmaXJzdERheTtcbiAgICB3aGlsZSAoY3VycmVudERheSA8IGxhc3REYXkpIHtcbiAgICAgIHZhciBuZXdEYXkgPSBuZXcgRGF0ZShjdXJyZW50RGF5KTtcbiAgICAgIG5ld0RheS5zZXRVVENEYXRlKG5ld0RheS5nZXRVVENEYXRlKCkgKyAxKTtcbiAgICAgIGRheXMucHVzaChuZXdEYXkudG9JU09TdHJpbmcoKS5zbGljZSgwLDEwKSk7XG4gICAgICBjdXJyZW50RGF5ID0gbmV3RGF5O1xuICAgIH1cblxuICAgIHRoaXMuZGF5cyA9IGRheXMucmV2ZXJzZSgpO1xuXG4gICAgZGF0YVN0YXJ0Tm9vbiA9IG5ldyBEYXRlKGZpcnN0KTtcbiAgICBkYXRhU3RhcnROb29uLnNldFVUQ0hvdXJzKDEyKTtcbiAgICBkYXRhU3RhcnROb29uLnNldFVUQ01pbnV0ZXMoMCk7XG4gICAgZGF0YVN0YXJ0Tm9vbi5zZXRVVENTZWNvbmRzKDApO1xuICAgIGRhdGFTdGFydE5vb24uc2V0VVRDRGF0ZShkYXRhU3RhcnROb29uLmdldFVUQ0RhdGUoKSAtIDEpO1xuXG4gICAgdmFyIG5vb24gPSAnMTI6MDA6MDBaJztcblxuICAgIGRhdGFFbmROb29uID0gbmV3IERhdGUobGFzdCk7XG4gICAgZGF0YUVuZE5vb24uc2V0VVRDRGF0ZShkYXRhRW5kTm9vbi5nZXRVVENEYXRlKCkgLSAxNCk7XG4gICAgZGF0YUVuZE5vb24gPSBuZXcgRGF0ZShkYXRhRW5kTm9vbi50b0lTT1N0cmluZygpLnNsaWNlKDAsMTEpICsgbm9vbik7XG5cbiAgICBpZiAoIXZpZXdFbmREYXRlKSB7XG4gICAgICB2aWV3RW5kRGF0ZSA9IGxhc3Q7XG4gICAgfVxuICAgIHZhciB2aWV3QmVnaW5uaW5nID0gbmV3IERhdGUodmlld0VuZERhdGUpO1xuICAgIHZpZXdCZWdpbm5pbmcuc2V0VVRDRGF0ZSh2aWV3QmVnaW5uaW5nLmdldFVUQ0RhdGUoKSAtIDE0KTtcbiAgICB2aWV3RW5kcG9pbnRzID0gW25ldyBEYXRlKHZpZXdCZWdpbm5pbmcudG9JU09TdHJpbmcoKS5zbGljZSgwLDExKSArIG5vb24pLCBuZXcgRGF0ZSh2aWV3RW5kRGF0ZS50b0lTT1N0cmluZygpLnNsaWNlKDAsMTEpICsgbm9vbildO1xuXG4gICAgdmlld0luZGV4ID0gZGF5cy5pbmRleE9mKHZpZXdFbmREYXRlLnRvSVNPU3RyaW5nKCkuc2xpY2UoMCwxMCkpO1xuXG4gICAgY29udGFpbmVyLmRhdGFQZXJEYXkgPSBbXTtcblxuICAgIHRoaXMuZGF5cy5mb3JFYWNoKGZ1bmN0aW9uKGRheSkge1xuICAgICAgdmFyIHRoaXNEYXkgPSB7XG4gICAgICAgICd5ZWFyJzogZGF5LnNsaWNlKDAsNCksXG4gICAgICAgICdtb250aCc6IGRheS5zbGljZSg1LDcpLFxuICAgICAgICAnZGF5JzogZGF5LnNsaWNlKDgsMTApXG4gICAgICB9O1xuICAgICAgY29udGFpbmVyLmRhdGFQZXJEYXkucHVzaChfLmZpbHRlcihkYXRhLCBmdW5jdGlvbihkKSB7XG4gICAgICAgIHZhciBkYXRlID0gbmV3IERhdGUoZC5ub3JtYWxUaW1lKTtcbiAgICAgICAgaWYgKChkYXRlLmdldFVUQ0Z1bGxZZWFyKCkgPT09IHBhcnNlSW50KHRoaXNEYXkueWVhcikpXG4gICAgICAgICAgJiYgKGRhdGUuZ2V0VVRDTW9udGgoKSArIDEgPT09IHBhcnNlSW50KHRoaXNEYXkubW9udGgpKVxuICAgICAgICAgICYmIChkYXRlLmdldFVUQ0RhdGUoKSA9PT0gcGFyc2VJbnQodGhpc0RheS5kYXkpKSkge1xuICAgICAgICAgIHJldHVybiBkO1xuICAgICAgICB9XG4gICAgICB9KSk7XG4gICAgfSk7XG4gICAgXG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgfTtcblxuICByZXR1cm4gY29udGFpbmVyO1xufTsiLCIvLyAgICAgVW5kZXJzY29yZS5qcyAxLjYuMFxuLy8gICAgIGh0dHA6Ly91bmRlcnNjb3JlanMub3JnXG4vLyAgICAgKGMpIDIwMDktMjAxNCBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuLy8gICAgIFVuZGVyc2NvcmUgbWF5IGJlIGZyZWVseSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXG5cbihmdW5jdGlvbigpIHtcblxuICAvLyBCYXNlbGluZSBzZXR1cFxuICAvLyAtLS0tLS0tLS0tLS0tLVxuXG4gIC8vIEVzdGFibGlzaCB0aGUgcm9vdCBvYmplY3QsIGB3aW5kb3dgIGluIHRoZSBicm93c2VyLCBvciBgZXhwb3J0c2Agb24gdGhlIHNlcnZlci5cbiAgdmFyIHJvb3QgPSB0aGlzO1xuXG4gIC8vIFNhdmUgdGhlIHByZXZpb3VzIHZhbHVlIG9mIHRoZSBgX2AgdmFyaWFibGUuXG4gIHZhciBwcmV2aW91c1VuZGVyc2NvcmUgPSByb290Ll87XG5cbiAgLy8gRXN0YWJsaXNoIHRoZSBvYmplY3QgdGhhdCBnZXRzIHJldHVybmVkIHRvIGJyZWFrIG91dCBvZiBhIGxvb3AgaXRlcmF0aW9uLlxuICB2YXIgYnJlYWtlciA9IHt9O1xuXG4gIC8vIFNhdmUgYnl0ZXMgaW4gdGhlIG1pbmlmaWVkIChidXQgbm90IGd6aXBwZWQpIHZlcnNpb246XG4gIHZhciBBcnJheVByb3RvID0gQXJyYXkucHJvdG90eXBlLCBPYmpQcm90byA9IE9iamVjdC5wcm90b3R5cGUsIEZ1bmNQcm90byA9IEZ1bmN0aW9uLnByb3RvdHlwZTtcblxuICAvLyBDcmVhdGUgcXVpY2sgcmVmZXJlbmNlIHZhcmlhYmxlcyBmb3Igc3BlZWQgYWNjZXNzIHRvIGNvcmUgcHJvdG90eXBlcy5cbiAgdmFyXG4gICAgcHVzaCAgICAgICAgICAgICA9IEFycmF5UHJvdG8ucHVzaCxcbiAgICBzbGljZSAgICAgICAgICAgID0gQXJyYXlQcm90by5zbGljZSxcbiAgICBjb25jYXQgICAgICAgICAgID0gQXJyYXlQcm90by5jb25jYXQsXG4gICAgdG9TdHJpbmcgICAgICAgICA9IE9ialByb3RvLnRvU3RyaW5nLFxuICAgIGhhc093blByb3BlcnR5ICAgPSBPYmpQcm90by5oYXNPd25Qcm9wZXJ0eTtcblxuICAvLyBBbGwgKipFQ01BU2NyaXB0IDUqKiBuYXRpdmUgZnVuY3Rpb24gaW1wbGVtZW50YXRpb25zIHRoYXQgd2UgaG9wZSB0byB1c2VcbiAgLy8gYXJlIGRlY2xhcmVkIGhlcmUuXG4gIHZhclxuICAgIG5hdGl2ZUZvckVhY2ggICAgICA9IEFycmF5UHJvdG8uZm9yRWFjaCxcbiAgICBuYXRpdmVNYXAgICAgICAgICAgPSBBcnJheVByb3RvLm1hcCxcbiAgICBuYXRpdmVSZWR1Y2UgICAgICAgPSBBcnJheVByb3RvLnJlZHVjZSxcbiAgICBuYXRpdmVSZWR1Y2VSaWdodCAgPSBBcnJheVByb3RvLnJlZHVjZVJpZ2h0LFxuICAgIG5hdGl2ZUZpbHRlciAgICAgICA9IEFycmF5UHJvdG8uZmlsdGVyLFxuICAgIG5hdGl2ZUV2ZXJ5ICAgICAgICA9IEFycmF5UHJvdG8uZXZlcnksXG4gICAgbmF0aXZlU29tZSAgICAgICAgID0gQXJyYXlQcm90by5zb21lLFxuICAgIG5hdGl2ZUluZGV4T2YgICAgICA9IEFycmF5UHJvdG8uaW5kZXhPZixcbiAgICBuYXRpdmVMYXN0SW5kZXhPZiAgPSBBcnJheVByb3RvLmxhc3RJbmRleE9mLFxuICAgIG5hdGl2ZUlzQXJyYXkgICAgICA9IEFycmF5LmlzQXJyYXksXG4gICAgbmF0aXZlS2V5cyAgICAgICAgID0gT2JqZWN0LmtleXMsXG4gICAgbmF0aXZlQmluZCAgICAgICAgID0gRnVuY1Byb3RvLmJpbmQ7XG5cbiAgLy8gQ3JlYXRlIGEgc2FmZSByZWZlcmVuY2UgdG8gdGhlIFVuZGVyc2NvcmUgb2JqZWN0IGZvciB1c2UgYmVsb3cuXG4gIHZhciBfID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKG9iaiBpbnN0YW5jZW9mIF8pIHJldHVybiBvYmo7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIF8pKSByZXR1cm4gbmV3IF8ob2JqKTtcbiAgICB0aGlzLl93cmFwcGVkID0gb2JqO1xuICB9O1xuXG4gIC8vIEV4cG9ydCB0aGUgVW5kZXJzY29yZSBvYmplY3QgZm9yICoqTm9kZS5qcyoqLCB3aXRoXG4gIC8vIGJhY2t3YXJkcy1jb21wYXRpYmlsaXR5IGZvciB0aGUgb2xkIGByZXF1aXJlKClgIEFQSS4gSWYgd2UncmUgaW5cbiAgLy8gdGhlIGJyb3dzZXIsIGFkZCBgX2AgYXMgYSBnbG9iYWwgb2JqZWN0IHZpYSBhIHN0cmluZyBpZGVudGlmaWVyLFxuICAvLyBmb3IgQ2xvc3VyZSBDb21waWxlciBcImFkdmFuY2VkXCIgbW9kZS5cbiAgaWYgKHR5cGVvZiBleHBvcnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgICAgZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gXztcbiAgICB9XG4gICAgZXhwb3J0cy5fID0gXztcbiAgfSBlbHNlIHtcbiAgICByb290Ll8gPSBfO1xuICB9XG5cbiAgLy8gQ3VycmVudCB2ZXJzaW9uLlxuICBfLlZFUlNJT04gPSAnMS42LjAnO1xuXG4gIC8vIENvbGxlY3Rpb24gRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gVGhlIGNvcm5lcnN0b25lLCBhbiBgZWFjaGAgaW1wbGVtZW50YXRpb24sIGFrYSBgZm9yRWFjaGAuXG4gIC8vIEhhbmRsZXMgb2JqZWN0cyB3aXRoIHRoZSBidWlsdC1pbiBgZm9yRWFjaGAsIGFycmF5cywgYW5kIHJhdyBvYmplY3RzLlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgZm9yRWFjaGAgaWYgYXZhaWxhYmxlLlxuICB2YXIgZWFjaCA9IF8uZWFjaCA9IF8uZm9yRWFjaCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiBvYmo7XG4gICAgaWYgKG5hdGl2ZUZvckVhY2ggJiYgb2JqLmZvckVhY2ggPT09IG5hdGl2ZUZvckVhY2gpIHtcbiAgICAgIG9iai5mb3JFYWNoKGl0ZXJhdG9yLCBjb250ZXh0KTtcbiAgICB9IGVsc2UgaWYgKG9iai5sZW5ndGggPT09ICtvYmoubGVuZ3RoKSB7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gb2JqLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChpdGVyYXRvci5jYWxsKGNvbnRleHQsIG9ialtpXSwgaSwgb2JqKSA9PT0gYnJlYWtlcikgcmV0dXJuO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGtleXMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgb2JqW2tleXNbaV1dLCBrZXlzW2ldLCBvYmopID09PSBicmVha2VyKSByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSByZXN1bHRzIG9mIGFwcGx5aW5nIHRoZSBpdGVyYXRvciB0byBlYWNoIGVsZW1lbnQuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBtYXBgIGlmIGF2YWlsYWJsZS5cbiAgXy5tYXAgPSBfLmNvbGxlY3QgPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiByZXN1bHRzO1xuICAgIGlmIChuYXRpdmVNYXAgJiYgb2JqLm1hcCA9PT0gbmF0aXZlTWFwKSByZXR1cm4gb2JqLm1hcChpdGVyYXRvciwgY29udGV4dCk7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgcmVzdWx0cy5wdXNoKGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH07XG5cbiAgdmFyIHJlZHVjZUVycm9yID0gJ1JlZHVjZSBvZiBlbXB0eSBhcnJheSB3aXRoIG5vIGluaXRpYWwgdmFsdWUnO1xuXG4gIC8vICoqUmVkdWNlKiogYnVpbGRzIHVwIGEgc2luZ2xlIHJlc3VsdCBmcm9tIGEgbGlzdCBvZiB2YWx1ZXMsIGFrYSBgaW5qZWN0YCxcbiAgLy8gb3IgYGZvbGRsYC4gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYHJlZHVjZWAgaWYgYXZhaWxhYmxlLlxuICBfLnJlZHVjZSA9IF8uZm9sZGwgPSBfLmluamVjdCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIG1lbW8sIGNvbnRleHQpIHtcbiAgICB2YXIgaW5pdGlhbCA9IGFyZ3VtZW50cy5sZW5ndGggPiAyO1xuICAgIGlmIChvYmogPT0gbnVsbCkgb2JqID0gW107XG4gICAgaWYgKG5hdGl2ZVJlZHVjZSAmJiBvYmoucmVkdWNlID09PSBuYXRpdmVSZWR1Y2UpIHtcbiAgICAgIGlmIChjb250ZXh0KSBpdGVyYXRvciA9IF8uYmluZChpdGVyYXRvciwgY29udGV4dCk7XG4gICAgICByZXR1cm4gaW5pdGlhbCA/IG9iai5yZWR1Y2UoaXRlcmF0b3IsIG1lbW8pIDogb2JqLnJlZHVjZShpdGVyYXRvcik7XG4gICAgfVxuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIGlmICghaW5pdGlhbCkge1xuICAgICAgICBtZW1vID0gdmFsdWU7XG4gICAgICAgIGluaXRpYWwgPSB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbWVtbyA9IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgbWVtbywgdmFsdWUsIGluZGV4LCBsaXN0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoIWluaXRpYWwpIHRocm93IG5ldyBUeXBlRXJyb3IocmVkdWNlRXJyb3IpO1xuICAgIHJldHVybiBtZW1vO1xuICB9O1xuXG4gIC8vIFRoZSByaWdodC1hc3NvY2lhdGl2ZSB2ZXJzaW9uIG9mIHJlZHVjZSwgYWxzbyBrbm93biBhcyBgZm9sZHJgLlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgcmVkdWNlUmlnaHRgIGlmIGF2YWlsYWJsZS5cbiAgXy5yZWR1Y2VSaWdodCA9IF8uZm9sZHIgPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBtZW1vLCBjb250ZXh0KSB7XG4gICAgdmFyIGluaXRpYWwgPSBhcmd1bWVudHMubGVuZ3RoID4gMjtcbiAgICBpZiAob2JqID09IG51bGwpIG9iaiA9IFtdO1xuICAgIGlmIChuYXRpdmVSZWR1Y2VSaWdodCAmJiBvYmoucmVkdWNlUmlnaHQgPT09IG5hdGl2ZVJlZHVjZVJpZ2h0KSB7XG4gICAgICBpZiAoY29udGV4dCkgaXRlcmF0b3IgPSBfLmJpbmQoaXRlcmF0b3IsIGNvbnRleHQpO1xuICAgICAgcmV0dXJuIGluaXRpYWwgPyBvYmoucmVkdWNlUmlnaHQoaXRlcmF0b3IsIG1lbW8pIDogb2JqLnJlZHVjZVJpZ2h0KGl0ZXJhdG9yKTtcbiAgICB9XG4gICAgdmFyIGxlbmd0aCA9IG9iai5sZW5ndGg7XG4gICAgaWYgKGxlbmd0aCAhPT0gK2xlbmd0aCkge1xuICAgICAgdmFyIGtleXMgPSBfLmtleXMob2JqKTtcbiAgICAgIGxlbmd0aCA9IGtleXMubGVuZ3RoO1xuICAgIH1cbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpbmRleCA9IGtleXMgPyBrZXlzWy0tbGVuZ3RoXSA6IC0tbGVuZ3RoO1xuICAgICAgaWYgKCFpbml0aWFsKSB7XG4gICAgICAgIG1lbW8gPSBvYmpbaW5kZXhdO1xuICAgICAgICBpbml0aWFsID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1lbW8gPSBpdGVyYXRvci5jYWxsKGNvbnRleHQsIG1lbW8sIG9ialtpbmRleF0sIGluZGV4LCBsaXN0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoIWluaXRpYWwpIHRocm93IG5ldyBUeXBlRXJyb3IocmVkdWNlRXJyb3IpO1xuICAgIHJldHVybiBtZW1vO1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgZmlyc3QgdmFsdWUgd2hpY2ggcGFzc2VzIGEgdHJ1dGggdGVzdC4gQWxpYXNlZCBhcyBgZGV0ZWN0YC5cbiAgXy5maW5kID0gXy5kZXRlY3QgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHZhciByZXN1bHQ7XG4gICAgYW55KG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpZiAocHJlZGljYXRlLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSkge1xuICAgICAgICByZXN1bHQgPSB2YWx1ZTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBSZXR1cm4gYWxsIHRoZSBlbGVtZW50cyB0aGF0IHBhc3MgYSB0cnV0aCB0ZXN0LlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgZmlsdGVyYCBpZiBhdmFpbGFibGUuXG4gIC8vIEFsaWFzZWQgYXMgYHNlbGVjdGAuXG4gIF8uZmlsdGVyID0gXy5zZWxlY3QgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHZhciByZXN1bHRzID0gW107XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gcmVzdWx0cztcbiAgICBpZiAobmF0aXZlRmlsdGVyICYmIG9iai5maWx0ZXIgPT09IG5hdGl2ZUZpbHRlcikgcmV0dXJuIG9iai5maWx0ZXIocHJlZGljYXRlLCBjb250ZXh0KTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpZiAocHJlZGljYXRlLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSkgcmVzdWx0cy5wdXNoKHZhbHVlKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfTtcblxuICAvLyBSZXR1cm4gYWxsIHRoZSBlbGVtZW50cyBmb3Igd2hpY2ggYSB0cnV0aCB0ZXN0IGZhaWxzLlxuICBfLnJlamVjdCA9IGZ1bmN0aW9uKG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIF8uZmlsdGVyKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICByZXR1cm4gIXByZWRpY2F0ZS5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCk7XG4gICAgfSwgY29udGV4dCk7XG4gIH07XG5cbiAgLy8gRGV0ZXJtaW5lIHdoZXRoZXIgYWxsIG9mIHRoZSBlbGVtZW50cyBtYXRjaCBhIHRydXRoIHRlc3QuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBldmVyeWAgaWYgYXZhaWxhYmxlLlxuICAvLyBBbGlhc2VkIGFzIGBhbGxgLlxuICBfLmV2ZXJ5ID0gXy5hbGwgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHByZWRpY2F0ZSB8fCAocHJlZGljYXRlID0gXy5pZGVudGl0eSk7XG4gICAgdmFyIHJlc3VsdCA9IHRydWU7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gcmVzdWx0O1xuICAgIGlmIChuYXRpdmVFdmVyeSAmJiBvYmouZXZlcnkgPT09IG5hdGl2ZUV2ZXJ5KSByZXR1cm4gb2JqLmV2ZXJ5KHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaWYgKCEocmVzdWx0ID0gcmVzdWx0ICYmIHByZWRpY2F0ZS5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkpKSByZXR1cm4gYnJlYWtlcjtcbiAgICB9KTtcbiAgICByZXR1cm4gISFyZXN1bHQ7XG4gIH07XG5cbiAgLy8gRGV0ZXJtaW5lIGlmIGF0IGxlYXN0IG9uZSBlbGVtZW50IGluIHRoZSBvYmplY3QgbWF0Y2hlcyBhIHRydXRoIHRlc3QuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBzb21lYCBpZiBhdmFpbGFibGUuXG4gIC8vIEFsaWFzZWQgYXMgYGFueWAuXG4gIHZhciBhbnkgPSBfLnNvbWUgPSBfLmFueSA9IGZ1bmN0aW9uKG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgcHJlZGljYXRlIHx8IChwcmVkaWNhdGUgPSBfLmlkZW50aXR5KTtcbiAgICB2YXIgcmVzdWx0ID0gZmFsc2U7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gcmVzdWx0O1xuICAgIGlmIChuYXRpdmVTb21lICYmIG9iai5zb21lID09PSBuYXRpdmVTb21lKSByZXR1cm4gb2JqLnNvbWUocHJlZGljYXRlLCBjb250ZXh0KTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpZiAocmVzdWx0IHx8IChyZXN1bHQgPSBwcmVkaWNhdGUuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpKSkgcmV0dXJuIGJyZWFrZXI7XG4gICAgfSk7XG4gICAgcmV0dXJuICEhcmVzdWx0O1xuICB9O1xuXG4gIC8vIERldGVybWluZSBpZiB0aGUgYXJyYXkgb3Igb2JqZWN0IGNvbnRhaW5zIGEgZ2l2ZW4gdmFsdWUgKHVzaW5nIGA9PT1gKS5cbiAgLy8gQWxpYXNlZCBhcyBgaW5jbHVkZWAuXG4gIF8uY29udGFpbnMgPSBfLmluY2x1ZGUgPSBmdW5jdGlvbihvYmosIHRhcmdldCkge1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChuYXRpdmVJbmRleE9mICYmIG9iai5pbmRleE9mID09PSBuYXRpdmVJbmRleE9mKSByZXR1cm4gb2JqLmluZGV4T2YodGFyZ2V0KSAhPSAtMTtcbiAgICByZXR1cm4gYW55KG9iaiwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJldHVybiB2YWx1ZSA9PT0gdGFyZ2V0O1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIEludm9rZSBhIG1ldGhvZCAod2l0aCBhcmd1bWVudHMpIG9uIGV2ZXJ5IGl0ZW0gaW4gYSBjb2xsZWN0aW9uLlxuICBfLmludm9rZSA9IGZ1bmN0aW9uKG9iaiwgbWV0aG9kKSB7XG4gICAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgdmFyIGlzRnVuYyA9IF8uaXNGdW5jdGlvbihtZXRob2QpO1xuICAgIHJldHVybiBfLm1hcChvYmosIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXR1cm4gKGlzRnVuYyA/IG1ldGhvZCA6IHZhbHVlW21ldGhvZF0pLmFwcGx5KHZhbHVlLCBhcmdzKTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBDb252ZW5pZW5jZSB2ZXJzaW9uIG9mIGEgY29tbW9uIHVzZSBjYXNlIG9mIGBtYXBgOiBmZXRjaGluZyBhIHByb3BlcnR5LlxuICBfLnBsdWNrID0gZnVuY3Rpb24ob2JqLCBrZXkpIHtcbiAgICByZXR1cm4gXy5tYXAob2JqLCBfLnByb3BlcnR5KGtleSkpO1xuICB9O1xuXG4gIC8vIENvbnZlbmllbmNlIHZlcnNpb24gb2YgYSBjb21tb24gdXNlIGNhc2Ugb2YgYGZpbHRlcmA6IHNlbGVjdGluZyBvbmx5IG9iamVjdHNcbiAgLy8gY29udGFpbmluZyBzcGVjaWZpYyBga2V5OnZhbHVlYCBwYWlycy5cbiAgXy53aGVyZSA9IGZ1bmN0aW9uKG9iaiwgYXR0cnMpIHtcbiAgICByZXR1cm4gXy5maWx0ZXIob2JqLCBfLm1hdGNoZXMoYXR0cnMpKTtcbiAgfTtcblxuICAvLyBDb252ZW5pZW5jZSB2ZXJzaW9uIG9mIGEgY29tbW9uIHVzZSBjYXNlIG9mIGBmaW5kYDogZ2V0dGluZyB0aGUgZmlyc3Qgb2JqZWN0XG4gIC8vIGNvbnRhaW5pbmcgc3BlY2lmaWMgYGtleTp2YWx1ZWAgcGFpcnMuXG4gIF8uZmluZFdoZXJlID0gZnVuY3Rpb24ob2JqLCBhdHRycykge1xuICAgIHJldHVybiBfLmZpbmQob2JqLCBfLm1hdGNoZXMoYXR0cnMpKTtcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIG1heGltdW0gZWxlbWVudCBvciAoZWxlbWVudC1iYXNlZCBjb21wdXRhdGlvbikuXG4gIC8vIENhbid0IG9wdGltaXplIGFycmF5cyBvZiBpbnRlZ2VycyBsb25nZXIgdGhhbiA2NSw1MzUgZWxlbWVudHMuXG4gIC8vIFNlZSBbV2ViS2l0IEJ1ZyA4MDc5N10oaHR0cHM6Ly9idWdzLndlYmtpdC5vcmcvc2hvd19idWcuY2dpP2lkPTgwNzk3KVxuICBfLm1heCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpZiAoIWl0ZXJhdG9yICYmIF8uaXNBcnJheShvYmopICYmIG9ialswXSA9PT0gK29ialswXSAmJiBvYmoubGVuZ3RoIDwgNjU1MzUpIHtcbiAgICAgIHJldHVybiBNYXRoLm1heC5hcHBseShNYXRoLCBvYmopO1xuICAgIH1cbiAgICB2YXIgcmVzdWx0ID0gLUluZmluaXR5LCBsYXN0Q29tcHV0ZWQgPSAtSW5maW5pdHk7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgdmFyIGNvbXB1dGVkID0gaXRlcmF0b3IgPyBpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkgOiB2YWx1ZTtcbiAgICAgIGlmIChjb21wdXRlZCA+IGxhc3RDb21wdXRlZCkge1xuICAgICAgICByZXN1bHQgPSB2YWx1ZTtcbiAgICAgICAgbGFzdENvbXB1dGVkID0gY29tcHV0ZWQ7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIG1pbmltdW0gZWxlbWVudCAob3IgZWxlbWVudC1iYXNlZCBjb21wdXRhdGlvbikuXG4gIF8ubWluID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGlmICghaXRlcmF0b3IgJiYgXy5pc0FycmF5KG9iaikgJiYgb2JqWzBdID09PSArb2JqWzBdICYmIG9iai5sZW5ndGggPCA2NTUzNSkge1xuICAgICAgcmV0dXJuIE1hdGgubWluLmFwcGx5KE1hdGgsIG9iaik7XG4gICAgfVxuICAgIHZhciByZXN1bHQgPSBJbmZpbml0eSwgbGFzdENvbXB1dGVkID0gSW5maW5pdHk7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgdmFyIGNvbXB1dGVkID0gaXRlcmF0b3IgPyBpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkgOiB2YWx1ZTtcbiAgICAgIGlmIChjb21wdXRlZCA8IGxhc3RDb21wdXRlZCkge1xuICAgICAgICByZXN1bHQgPSB2YWx1ZTtcbiAgICAgICAgbGFzdENvbXB1dGVkID0gY29tcHV0ZWQ7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBTaHVmZmxlIGFuIGFycmF5LCB1c2luZyB0aGUgbW9kZXJuIHZlcnNpb24gb2YgdGhlXG4gIC8vIFtGaXNoZXItWWF0ZXMgc2h1ZmZsZV0oaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9GaXNoZXLigJNZYXRlc19zaHVmZmxlKS5cbiAgXy5zaHVmZmxlID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIHJhbmQ7XG4gICAgdmFyIGluZGV4ID0gMDtcbiAgICB2YXIgc2h1ZmZsZWQgPSBbXTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJhbmQgPSBfLnJhbmRvbShpbmRleCsrKTtcbiAgICAgIHNodWZmbGVkW2luZGV4IC0gMV0gPSBzaHVmZmxlZFtyYW5kXTtcbiAgICAgIHNodWZmbGVkW3JhbmRdID0gdmFsdWU7XG4gICAgfSk7XG4gICAgcmV0dXJuIHNodWZmbGVkO1xuICB9O1xuXG4gIC8vIFNhbXBsZSAqKm4qKiByYW5kb20gdmFsdWVzIGZyb20gYSBjb2xsZWN0aW9uLlxuICAvLyBJZiAqKm4qKiBpcyBub3Qgc3BlY2lmaWVkLCByZXR1cm5zIGEgc2luZ2xlIHJhbmRvbSBlbGVtZW50LlxuICAvLyBUaGUgaW50ZXJuYWwgYGd1YXJkYCBhcmd1bWVudCBhbGxvd3MgaXQgdG8gd29yayB3aXRoIGBtYXBgLlxuICBfLnNhbXBsZSA9IGZ1bmN0aW9uKG9iaiwgbiwgZ3VhcmQpIHtcbiAgICBpZiAobiA9PSBudWxsIHx8IGd1YXJkKSB7XG4gICAgICBpZiAob2JqLmxlbmd0aCAhPT0gK29iai5sZW5ndGgpIG9iaiA9IF8udmFsdWVzKG9iaik7XG4gICAgICByZXR1cm4gb2JqW18ucmFuZG9tKG9iai5sZW5ndGggLSAxKV07XG4gICAgfVxuICAgIHJldHVybiBfLnNodWZmbGUob2JqKS5zbGljZSgwLCBNYXRoLm1heCgwLCBuKSk7XG4gIH07XG5cbiAgLy8gQW4gaW50ZXJuYWwgZnVuY3Rpb24gdG8gZ2VuZXJhdGUgbG9va3VwIGl0ZXJhdG9ycy5cbiAgdmFyIGxvb2t1cEl0ZXJhdG9yID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAodmFsdWUgPT0gbnVsbCkgcmV0dXJuIF8uaWRlbnRpdHk7XG4gICAgaWYgKF8uaXNGdW5jdGlvbih2YWx1ZSkpIHJldHVybiB2YWx1ZTtcbiAgICByZXR1cm4gXy5wcm9wZXJ0eSh2YWx1ZSk7XG4gIH07XG5cbiAgLy8gU29ydCB0aGUgb2JqZWN0J3MgdmFsdWVzIGJ5IGEgY3JpdGVyaW9uIHByb2R1Y2VkIGJ5IGFuIGl0ZXJhdG9yLlxuICBfLnNvcnRCeSA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpdGVyYXRvciA9IGxvb2t1cEl0ZXJhdG9yKGl0ZXJhdG9yKTtcbiAgICByZXR1cm4gXy5wbHVjayhfLm1hcChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICBpbmRleDogaW5kZXgsXG4gICAgICAgIGNyaXRlcmlhOiBpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdClcbiAgICAgIH07XG4gICAgfSkuc29ydChmdW5jdGlvbihsZWZ0LCByaWdodCkge1xuICAgICAgdmFyIGEgPSBsZWZ0LmNyaXRlcmlhO1xuICAgICAgdmFyIGIgPSByaWdodC5jcml0ZXJpYTtcbiAgICAgIGlmIChhICE9PSBiKSB7XG4gICAgICAgIGlmIChhID4gYiB8fCBhID09PSB2b2lkIDApIHJldHVybiAxO1xuICAgICAgICBpZiAoYSA8IGIgfHwgYiA9PT0gdm9pZCAwKSByZXR1cm4gLTE7XG4gICAgICB9XG4gICAgICByZXR1cm4gbGVmdC5pbmRleCAtIHJpZ2h0LmluZGV4O1xuICAgIH0pLCAndmFsdWUnKTtcbiAgfTtcblxuICAvLyBBbiBpbnRlcm5hbCBmdW5jdGlvbiB1c2VkIGZvciBhZ2dyZWdhdGUgXCJncm91cCBieVwiIG9wZXJhdGlvbnMuXG4gIHZhciBncm91cCA9IGZ1bmN0aW9uKGJlaGF2aW9yKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICAgIGl0ZXJhdG9yID0gbG9va3VwSXRlcmF0b3IoaXRlcmF0b3IpO1xuICAgICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCkge1xuICAgICAgICB2YXIga2V5ID0gaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIG9iaik7XG4gICAgICAgIGJlaGF2aW9yKHJlc3VsdCwga2V5LCB2YWx1ZSk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfTtcblxuICAvLyBHcm91cHMgdGhlIG9iamVjdCdzIHZhbHVlcyBieSBhIGNyaXRlcmlvbi4gUGFzcyBlaXRoZXIgYSBzdHJpbmcgYXR0cmlidXRlXG4gIC8vIHRvIGdyb3VwIGJ5LCBvciBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aGUgY3JpdGVyaW9uLlxuICBfLmdyb3VwQnkgPSBncm91cChmdW5jdGlvbihyZXN1bHQsIGtleSwgdmFsdWUpIHtcbiAgICBfLmhhcyhyZXN1bHQsIGtleSkgPyByZXN1bHRba2V5XS5wdXNoKHZhbHVlKSA6IHJlc3VsdFtrZXldID0gW3ZhbHVlXTtcbiAgfSk7XG5cbiAgLy8gSW5kZXhlcyB0aGUgb2JqZWN0J3MgdmFsdWVzIGJ5IGEgY3JpdGVyaW9uLCBzaW1pbGFyIHRvIGBncm91cEJ5YCwgYnV0IGZvclxuICAvLyB3aGVuIHlvdSBrbm93IHRoYXQgeW91ciBpbmRleCB2YWx1ZXMgd2lsbCBiZSB1bmlxdWUuXG4gIF8uaW5kZXhCeSA9IGdyb3VwKGZ1bmN0aW9uKHJlc3VsdCwga2V5LCB2YWx1ZSkge1xuICAgIHJlc3VsdFtrZXldID0gdmFsdWU7XG4gIH0pO1xuXG4gIC8vIENvdW50cyBpbnN0YW5jZXMgb2YgYW4gb2JqZWN0IHRoYXQgZ3JvdXAgYnkgYSBjZXJ0YWluIGNyaXRlcmlvbi4gUGFzc1xuICAvLyBlaXRoZXIgYSBzdHJpbmcgYXR0cmlidXRlIHRvIGNvdW50IGJ5LCBvciBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aGVcbiAgLy8gY3JpdGVyaW9uLlxuICBfLmNvdW50QnkgPSBncm91cChmdW5jdGlvbihyZXN1bHQsIGtleSkge1xuICAgIF8uaGFzKHJlc3VsdCwga2V5KSA/IHJlc3VsdFtrZXldKysgOiByZXN1bHRba2V5XSA9IDE7XG4gIH0pO1xuXG4gIC8vIFVzZSBhIGNvbXBhcmF0b3IgZnVuY3Rpb24gdG8gZmlndXJlIG91dCB0aGUgc21hbGxlc3QgaW5kZXggYXQgd2hpY2hcbiAgLy8gYW4gb2JqZWN0IHNob3VsZCBiZSBpbnNlcnRlZCBzbyBhcyB0byBtYWludGFpbiBvcmRlci4gVXNlcyBiaW5hcnkgc2VhcmNoLlxuICBfLnNvcnRlZEluZGV4ID0gZnVuY3Rpb24oYXJyYXksIG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpdGVyYXRvciA9IGxvb2t1cEl0ZXJhdG9yKGl0ZXJhdG9yKTtcbiAgICB2YXIgdmFsdWUgPSBpdGVyYXRvci5jYWxsKGNvbnRleHQsIG9iaik7XG4gICAgdmFyIGxvdyA9IDAsIGhpZ2ggPSBhcnJheS5sZW5ndGg7XG4gICAgd2hpbGUgKGxvdyA8IGhpZ2gpIHtcbiAgICAgIHZhciBtaWQgPSAobG93ICsgaGlnaCkgPj4+IDE7XG4gICAgICBpdGVyYXRvci5jYWxsKGNvbnRleHQsIGFycmF5W21pZF0pIDwgdmFsdWUgPyBsb3cgPSBtaWQgKyAxIDogaGlnaCA9IG1pZDtcbiAgICB9XG4gICAgcmV0dXJuIGxvdztcbiAgfTtcblxuICAvLyBTYWZlbHkgY3JlYXRlIGEgcmVhbCwgbGl2ZSBhcnJheSBmcm9tIGFueXRoaW5nIGl0ZXJhYmxlLlxuICBfLnRvQXJyYXkgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIW9iaikgcmV0dXJuIFtdO1xuICAgIGlmIChfLmlzQXJyYXkob2JqKSkgcmV0dXJuIHNsaWNlLmNhbGwob2JqKTtcbiAgICBpZiAob2JqLmxlbmd0aCA9PT0gK29iai5sZW5ndGgpIHJldHVybiBfLm1hcChvYmosIF8uaWRlbnRpdHkpO1xuICAgIHJldHVybiBfLnZhbHVlcyhvYmopO1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgbnVtYmVyIG9mIGVsZW1lbnRzIGluIGFuIG9iamVjdC5cbiAgXy5zaXplID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gMDtcbiAgICByZXR1cm4gKG9iai5sZW5ndGggPT09ICtvYmoubGVuZ3RoKSA/IG9iai5sZW5ndGggOiBfLmtleXMob2JqKS5sZW5ndGg7XG4gIH07XG5cbiAgLy8gQXJyYXkgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIEdldCB0aGUgZmlyc3QgZWxlbWVudCBvZiBhbiBhcnJheS4gUGFzc2luZyAqKm4qKiB3aWxsIHJldHVybiB0aGUgZmlyc3QgTlxuICAvLyB2YWx1ZXMgaW4gdGhlIGFycmF5LiBBbGlhc2VkIGFzIGBoZWFkYCBhbmQgYHRha2VgLiBUaGUgKipndWFyZCoqIGNoZWNrXG4gIC8vIGFsbG93cyBpdCB0byB3b3JrIHdpdGggYF8ubWFwYC5cbiAgXy5maXJzdCA9IF8uaGVhZCA9IF8udGFrZSA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIGlmIChhcnJheSA9PSBudWxsKSByZXR1cm4gdm9pZCAwO1xuICAgIGlmICgobiA9PSBudWxsKSB8fCBndWFyZCkgcmV0dXJuIGFycmF5WzBdO1xuICAgIGlmIChuIDwgMCkgcmV0dXJuIFtdO1xuICAgIHJldHVybiBzbGljZS5jYWxsKGFycmF5LCAwLCBuKTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGV2ZXJ5dGhpbmcgYnV0IHRoZSBsYXN0IGVudHJ5IG9mIHRoZSBhcnJheS4gRXNwZWNpYWxseSB1c2VmdWwgb25cbiAgLy8gdGhlIGFyZ3VtZW50cyBvYmplY3QuIFBhc3NpbmcgKipuKiogd2lsbCByZXR1cm4gYWxsIHRoZSB2YWx1ZXMgaW5cbiAgLy8gdGhlIGFycmF5LCBleGNsdWRpbmcgdGhlIGxhc3QgTi4gVGhlICoqZ3VhcmQqKiBjaGVjayBhbGxvd3MgaXQgdG8gd29yayB3aXRoXG4gIC8vIGBfLm1hcGAuXG4gIF8uaW5pdGlhbCA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIHJldHVybiBzbGljZS5jYWxsKGFycmF5LCAwLCBhcnJheS5sZW5ndGggLSAoKG4gPT0gbnVsbCkgfHwgZ3VhcmQgPyAxIDogbikpO1xuICB9O1xuXG4gIC8vIEdldCB0aGUgbGFzdCBlbGVtZW50IG9mIGFuIGFycmF5LiBQYXNzaW5nICoqbioqIHdpbGwgcmV0dXJuIHRoZSBsYXN0IE5cbiAgLy8gdmFsdWVzIGluIHRoZSBhcnJheS4gVGhlICoqZ3VhcmQqKiBjaGVjayBhbGxvd3MgaXQgdG8gd29yayB3aXRoIGBfLm1hcGAuXG4gIF8ubGFzdCA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIGlmIChhcnJheSA9PSBudWxsKSByZXR1cm4gdm9pZCAwO1xuICAgIGlmICgobiA9PSBudWxsKSB8fCBndWFyZCkgcmV0dXJuIGFycmF5W2FycmF5Lmxlbmd0aCAtIDFdO1xuICAgIHJldHVybiBzbGljZS5jYWxsKGFycmF5LCBNYXRoLm1heChhcnJheS5sZW5ndGggLSBuLCAwKSk7XG4gIH07XG5cbiAgLy8gUmV0dXJucyBldmVyeXRoaW5nIGJ1dCB0aGUgZmlyc3QgZW50cnkgb2YgdGhlIGFycmF5LiBBbGlhc2VkIGFzIGB0YWlsYCBhbmQgYGRyb3BgLlxuICAvLyBFc3BlY2lhbGx5IHVzZWZ1bCBvbiB0aGUgYXJndW1lbnRzIG9iamVjdC4gUGFzc2luZyBhbiAqKm4qKiB3aWxsIHJldHVyblxuICAvLyB0aGUgcmVzdCBOIHZhbHVlcyBpbiB0aGUgYXJyYXkuIFRoZSAqKmd1YXJkKipcbiAgLy8gY2hlY2sgYWxsb3dzIGl0IHRvIHdvcmsgd2l0aCBgXy5tYXBgLlxuICBfLnJlc3QgPSBfLnRhaWwgPSBfLmRyb3AgPSBmdW5jdGlvbihhcnJheSwgbiwgZ3VhcmQpIHtcbiAgICByZXR1cm4gc2xpY2UuY2FsbChhcnJheSwgKG4gPT0gbnVsbCkgfHwgZ3VhcmQgPyAxIDogbik7XG4gIH07XG5cbiAgLy8gVHJpbSBvdXQgYWxsIGZhbHN5IHZhbHVlcyBmcm9tIGFuIGFycmF5LlxuICBfLmNvbXBhY3QgPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHJldHVybiBfLmZpbHRlcihhcnJheSwgXy5pZGVudGl0eSk7XG4gIH07XG5cbiAgLy8gSW50ZXJuYWwgaW1wbGVtZW50YXRpb24gb2YgYSByZWN1cnNpdmUgYGZsYXR0ZW5gIGZ1bmN0aW9uLlxuICB2YXIgZmxhdHRlbiA9IGZ1bmN0aW9uKGlucHV0LCBzaGFsbG93LCBvdXRwdXQpIHtcbiAgICBpZiAoc2hhbGxvdyAmJiBfLmV2ZXJ5KGlucHV0LCBfLmlzQXJyYXkpKSB7XG4gICAgICByZXR1cm4gY29uY2F0LmFwcGx5KG91dHB1dCwgaW5wdXQpO1xuICAgIH1cbiAgICBlYWNoKGlucHV0LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkgfHwgXy5pc0FyZ3VtZW50cyh2YWx1ZSkpIHtcbiAgICAgICAgc2hhbGxvdyA/IHB1c2guYXBwbHkob3V0cHV0LCB2YWx1ZSkgOiBmbGF0dGVuKHZhbHVlLCBzaGFsbG93LCBvdXRwdXQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0cHV0LnB1c2godmFsdWUpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBvdXRwdXQ7XG4gIH07XG5cbiAgLy8gRmxhdHRlbiBvdXQgYW4gYXJyYXksIGVpdGhlciByZWN1cnNpdmVseSAoYnkgZGVmYXVsdCksIG9yIGp1c3Qgb25lIGxldmVsLlxuICBfLmZsYXR0ZW4gPSBmdW5jdGlvbihhcnJheSwgc2hhbGxvdykge1xuICAgIHJldHVybiBmbGF0dGVuKGFycmF5LCBzaGFsbG93LCBbXSk7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgdmVyc2lvbiBvZiB0aGUgYXJyYXkgdGhhdCBkb2VzIG5vdCBjb250YWluIHRoZSBzcGVjaWZpZWQgdmFsdWUocykuXG4gIF8ud2l0aG91dCA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgcmV0dXJuIF8uZGlmZmVyZW5jZShhcnJheSwgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgfTtcblxuICAvLyBTcGxpdCBhbiBhcnJheSBpbnRvIHR3byBhcnJheXM6IG9uZSB3aG9zZSBlbGVtZW50cyBhbGwgc2F0aXNmeSB0aGUgZ2l2ZW5cbiAgLy8gcHJlZGljYXRlLCBhbmQgb25lIHdob3NlIGVsZW1lbnRzIGFsbCBkbyBub3Qgc2F0aXNmeSB0aGUgcHJlZGljYXRlLlxuICBfLnBhcnRpdGlvbiA9IGZ1bmN0aW9uKGFycmF5LCBwcmVkaWNhdGUpIHtcbiAgICB2YXIgcGFzcyA9IFtdLCBmYWlsID0gW107XG4gICAgZWFjaChhcnJheSwgZnVuY3Rpb24oZWxlbSkge1xuICAgICAgKHByZWRpY2F0ZShlbGVtKSA/IHBhc3MgOiBmYWlsKS5wdXNoKGVsZW0pO1xuICAgIH0pO1xuICAgIHJldHVybiBbcGFzcywgZmFpbF07XG4gIH07XG5cbiAgLy8gUHJvZHVjZSBhIGR1cGxpY2F0ZS1mcmVlIHZlcnNpb24gb2YgdGhlIGFycmF5LiBJZiB0aGUgYXJyYXkgaGFzIGFscmVhZHlcbiAgLy8gYmVlbiBzb3J0ZWQsIHlvdSBoYXZlIHRoZSBvcHRpb24gb2YgdXNpbmcgYSBmYXN0ZXIgYWxnb3JpdGhtLlxuICAvLyBBbGlhc2VkIGFzIGB1bmlxdWVgLlxuICBfLnVuaXEgPSBfLnVuaXF1ZSA9IGZ1bmN0aW9uKGFycmF5LCBpc1NvcnRlZCwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKGlzU29ydGVkKSkge1xuICAgICAgY29udGV4dCA9IGl0ZXJhdG9yO1xuICAgICAgaXRlcmF0b3IgPSBpc1NvcnRlZDtcbiAgICAgIGlzU29ydGVkID0gZmFsc2U7XG4gICAgfVxuICAgIHZhciBpbml0aWFsID0gaXRlcmF0b3IgPyBfLm1hcChhcnJheSwgaXRlcmF0b3IsIGNvbnRleHQpIDogYXJyYXk7XG4gICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICB2YXIgc2VlbiA9IFtdO1xuICAgIGVhY2goaW5pdGlhbCwgZnVuY3Rpb24odmFsdWUsIGluZGV4KSB7XG4gICAgICBpZiAoaXNTb3J0ZWQgPyAoIWluZGV4IHx8IHNlZW5bc2Vlbi5sZW5ndGggLSAxXSAhPT0gdmFsdWUpIDogIV8uY29udGFpbnMoc2VlbiwgdmFsdWUpKSB7XG4gICAgICAgIHNlZW4ucHVzaCh2YWx1ZSk7XG4gICAgICAgIHJlc3VsdHMucHVzaChhcnJheVtpbmRleF0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9O1xuXG4gIC8vIFByb2R1Y2UgYW4gYXJyYXkgdGhhdCBjb250YWlucyB0aGUgdW5pb246IGVhY2ggZGlzdGluY3QgZWxlbWVudCBmcm9tIGFsbCBvZlxuICAvLyB0aGUgcGFzc2VkLWluIGFycmF5cy5cbiAgXy51bmlvbiA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBfLnVuaXEoXy5mbGF0dGVuKGFyZ3VtZW50cywgdHJ1ZSkpO1xuICB9O1xuXG4gIC8vIFByb2R1Y2UgYW4gYXJyYXkgdGhhdCBjb250YWlucyBldmVyeSBpdGVtIHNoYXJlZCBiZXR3ZWVuIGFsbCB0aGVcbiAgLy8gcGFzc2VkLWluIGFycmF5cy5cbiAgXy5pbnRlcnNlY3Rpb24gPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHZhciByZXN0ID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgIHJldHVybiBfLmZpbHRlcihfLnVuaXEoYXJyYXkpLCBmdW5jdGlvbihpdGVtKSB7XG4gICAgICByZXR1cm4gXy5ldmVyeShyZXN0LCBmdW5jdGlvbihvdGhlcikge1xuICAgICAgICByZXR1cm4gXy5jb250YWlucyhvdGhlciwgaXRlbSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBUYWtlIHRoZSBkaWZmZXJlbmNlIGJldHdlZW4gb25lIGFycmF5IGFuZCBhIG51bWJlciBvZiBvdGhlciBhcnJheXMuXG4gIC8vIE9ubHkgdGhlIGVsZW1lbnRzIHByZXNlbnQgaW4ganVzdCB0aGUgZmlyc3QgYXJyYXkgd2lsbCByZW1haW4uXG4gIF8uZGlmZmVyZW5jZSA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgdmFyIHJlc3QgPSBjb25jYXQuYXBwbHkoQXJyYXlQcm90bywgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgICByZXR1cm4gXy5maWx0ZXIoYXJyYXksIGZ1bmN0aW9uKHZhbHVlKXsgcmV0dXJuICFfLmNvbnRhaW5zKHJlc3QsIHZhbHVlKTsgfSk7XG4gIH07XG5cbiAgLy8gWmlwIHRvZ2V0aGVyIG11bHRpcGxlIGxpc3RzIGludG8gYSBzaW5nbGUgYXJyYXkgLS0gZWxlbWVudHMgdGhhdCBzaGFyZVxuICAvLyBhbiBpbmRleCBnbyB0b2dldGhlci5cbiAgXy56aXAgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbGVuZ3RoID0gXy5tYXgoXy5wbHVjayhhcmd1bWVudHMsICdsZW5ndGgnKS5jb25jYXQoMCkpO1xuICAgIHZhciByZXN1bHRzID0gbmV3IEFycmF5KGxlbmd0aCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgcmVzdWx0c1tpXSA9IF8ucGx1Y2soYXJndW1lbnRzLCAnJyArIGkpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfTtcblxuICAvLyBDb252ZXJ0cyBsaXN0cyBpbnRvIG9iamVjdHMuIFBhc3MgZWl0aGVyIGEgc2luZ2xlIGFycmF5IG9mIGBba2V5LCB2YWx1ZV1gXG4gIC8vIHBhaXJzLCBvciB0d28gcGFyYWxsZWwgYXJyYXlzIG9mIHRoZSBzYW1lIGxlbmd0aCAtLSBvbmUgb2Yga2V5cywgYW5kIG9uZSBvZlxuICAvLyB0aGUgY29ycmVzcG9uZGluZyB2YWx1ZXMuXG4gIF8ub2JqZWN0ID0gZnVuY3Rpb24obGlzdCwgdmFsdWVzKSB7XG4gICAgaWYgKGxpc3QgPT0gbnVsbCkgcmV0dXJuIHt9O1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gbGlzdC5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHZhbHVlcykge1xuICAgICAgICByZXN1bHRbbGlzdFtpXV0gPSB2YWx1ZXNbaV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXN1bHRbbGlzdFtpXVswXV0gPSBsaXN0W2ldWzFdO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIElmIHRoZSBicm93c2VyIGRvZXNuJ3Qgc3VwcGx5IHVzIHdpdGggaW5kZXhPZiAoSSdtIGxvb2tpbmcgYXQgeW91LCAqKk1TSUUqKiksXG4gIC8vIHdlIG5lZWQgdGhpcyBmdW5jdGlvbi4gUmV0dXJuIHRoZSBwb3NpdGlvbiBvZiB0aGUgZmlyc3Qgb2NjdXJyZW5jZSBvZiBhblxuICAvLyBpdGVtIGluIGFuIGFycmF5LCBvciAtMSBpZiB0aGUgaXRlbSBpcyBub3QgaW5jbHVkZWQgaW4gdGhlIGFycmF5LlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgaW5kZXhPZmAgaWYgYXZhaWxhYmxlLlxuICAvLyBJZiB0aGUgYXJyYXkgaXMgbGFyZ2UgYW5kIGFscmVhZHkgaW4gc29ydCBvcmRlciwgcGFzcyBgdHJ1ZWBcbiAgLy8gZm9yICoqaXNTb3J0ZWQqKiB0byB1c2UgYmluYXJ5IHNlYXJjaC5cbiAgXy5pbmRleE9mID0gZnVuY3Rpb24oYXJyYXksIGl0ZW0sIGlzU29ydGVkKSB7XG4gICAgaWYgKGFycmF5ID09IG51bGwpIHJldHVybiAtMTtcbiAgICB2YXIgaSA9IDAsIGxlbmd0aCA9IGFycmF5Lmxlbmd0aDtcbiAgICBpZiAoaXNTb3J0ZWQpIHtcbiAgICAgIGlmICh0eXBlb2YgaXNTb3J0ZWQgPT0gJ251bWJlcicpIHtcbiAgICAgICAgaSA9IChpc1NvcnRlZCA8IDAgPyBNYXRoLm1heCgwLCBsZW5ndGggKyBpc1NvcnRlZCkgOiBpc1NvcnRlZCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpID0gXy5zb3J0ZWRJbmRleChhcnJheSwgaXRlbSk7XG4gICAgICAgIHJldHVybiBhcnJheVtpXSA9PT0gaXRlbSA/IGkgOiAtMTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKG5hdGl2ZUluZGV4T2YgJiYgYXJyYXkuaW5kZXhPZiA9PT0gbmF0aXZlSW5kZXhPZikgcmV0dXJuIGFycmF5LmluZGV4T2YoaXRlbSwgaXNTb3J0ZWQpO1xuICAgIGZvciAoOyBpIDwgbGVuZ3RoOyBpKyspIGlmIChhcnJheVtpXSA9PT0gaXRlbSkgcmV0dXJuIGk7XG4gICAgcmV0dXJuIC0xO1xuICB9O1xuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBsYXN0SW5kZXhPZmAgaWYgYXZhaWxhYmxlLlxuICBfLmxhc3RJbmRleE9mID0gZnVuY3Rpb24oYXJyYXksIGl0ZW0sIGZyb20pIHtcbiAgICBpZiAoYXJyYXkgPT0gbnVsbCkgcmV0dXJuIC0xO1xuICAgIHZhciBoYXNJbmRleCA9IGZyb20gIT0gbnVsbDtcbiAgICBpZiAobmF0aXZlTGFzdEluZGV4T2YgJiYgYXJyYXkubGFzdEluZGV4T2YgPT09IG5hdGl2ZUxhc3RJbmRleE9mKSB7XG4gICAgICByZXR1cm4gaGFzSW5kZXggPyBhcnJheS5sYXN0SW5kZXhPZihpdGVtLCBmcm9tKSA6IGFycmF5Lmxhc3RJbmRleE9mKGl0ZW0pO1xuICAgIH1cbiAgICB2YXIgaSA9IChoYXNJbmRleCA/IGZyb20gOiBhcnJheS5sZW5ndGgpO1xuICAgIHdoaWxlIChpLS0pIGlmIChhcnJheVtpXSA9PT0gaXRlbSkgcmV0dXJuIGk7XG4gICAgcmV0dXJuIC0xO1xuICB9O1xuXG4gIC8vIEdlbmVyYXRlIGFuIGludGVnZXIgQXJyYXkgY29udGFpbmluZyBhbiBhcml0aG1ldGljIHByb2dyZXNzaW9uLiBBIHBvcnQgb2ZcbiAgLy8gdGhlIG5hdGl2ZSBQeXRob24gYHJhbmdlKClgIGZ1bmN0aW9uLiBTZWVcbiAgLy8gW3RoZSBQeXRob24gZG9jdW1lbnRhdGlvbl0oaHR0cDovL2RvY3MucHl0aG9uLm9yZy9saWJyYXJ5L2Z1bmN0aW9ucy5odG1sI3JhbmdlKS5cbiAgXy5yYW5nZSA9IGZ1bmN0aW9uKHN0YXJ0LCBzdG9wLCBzdGVwKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPD0gMSkge1xuICAgICAgc3RvcCA9IHN0YXJ0IHx8IDA7XG4gICAgICBzdGFydCA9IDA7XG4gICAgfVxuICAgIHN0ZXAgPSBhcmd1bWVudHNbMl0gfHwgMTtcblxuICAgIHZhciBsZW5ndGggPSBNYXRoLm1heChNYXRoLmNlaWwoKHN0b3AgLSBzdGFydCkgLyBzdGVwKSwgMCk7XG4gICAgdmFyIGlkeCA9IDA7XG4gICAgdmFyIHJhbmdlID0gbmV3IEFycmF5KGxlbmd0aCk7XG5cbiAgICB3aGlsZShpZHggPCBsZW5ndGgpIHtcbiAgICAgIHJhbmdlW2lkeCsrXSA9IHN0YXJ0O1xuICAgICAgc3RhcnQgKz0gc3RlcDtcbiAgICB9XG5cbiAgICByZXR1cm4gcmFuZ2U7XG4gIH07XG5cbiAgLy8gRnVuY3Rpb24gKGFoZW0pIEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBSZXVzYWJsZSBjb25zdHJ1Y3RvciBmdW5jdGlvbiBmb3IgcHJvdG90eXBlIHNldHRpbmcuXG4gIHZhciBjdG9yID0gZnVuY3Rpb24oKXt9O1xuXG4gIC8vIENyZWF0ZSBhIGZ1bmN0aW9uIGJvdW5kIHRvIGEgZ2l2ZW4gb2JqZWN0IChhc3NpZ25pbmcgYHRoaXNgLCBhbmQgYXJndW1lbnRzLFxuICAvLyBvcHRpb25hbGx5KS4gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYEZ1bmN0aW9uLmJpbmRgIGlmXG4gIC8vIGF2YWlsYWJsZS5cbiAgXy5iaW5kID0gZnVuY3Rpb24oZnVuYywgY29udGV4dCkge1xuICAgIHZhciBhcmdzLCBib3VuZDtcbiAgICBpZiAobmF0aXZlQmluZCAmJiBmdW5jLmJpbmQgPT09IG5hdGl2ZUJpbmQpIHJldHVybiBuYXRpdmVCaW5kLmFwcGx5KGZ1bmMsIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gICAgaWYgKCFfLmlzRnVuY3Rpb24oZnVuYykpIHRocm93IG5ldyBUeXBlRXJyb3I7XG4gICAgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcbiAgICByZXR1cm4gYm91bmQgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBib3VuZCkpIHJldHVybiBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MuY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuICAgICAgY3Rvci5wcm90b3R5cGUgPSBmdW5jLnByb3RvdHlwZTtcbiAgICAgIHZhciBzZWxmID0gbmV3IGN0b3I7XG4gICAgICBjdG9yLnByb3RvdHlwZSA9IG51bGw7XG4gICAgICB2YXIgcmVzdWx0ID0gZnVuYy5hcHBseShzZWxmLCBhcmdzLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgICAgIGlmIChPYmplY3QocmVzdWx0KSA9PT0gcmVzdWx0KSByZXR1cm4gcmVzdWx0O1xuICAgICAgcmV0dXJuIHNlbGY7XG4gICAgfTtcbiAgfTtcblxuICAvLyBQYXJ0aWFsbHkgYXBwbHkgYSBmdW5jdGlvbiBieSBjcmVhdGluZyBhIHZlcnNpb24gdGhhdCBoYXMgaGFkIHNvbWUgb2YgaXRzXG4gIC8vIGFyZ3VtZW50cyBwcmUtZmlsbGVkLCB3aXRob3V0IGNoYW5naW5nIGl0cyBkeW5hbWljIGB0aGlzYCBjb250ZXh0LiBfIGFjdHNcbiAgLy8gYXMgYSBwbGFjZWhvbGRlciwgYWxsb3dpbmcgYW55IGNvbWJpbmF0aW9uIG9mIGFyZ3VtZW50cyB0byBiZSBwcmUtZmlsbGVkLlxuICBfLnBhcnRpYWwgPSBmdW5jdGlvbihmdW5jKSB7XG4gICAgdmFyIGJvdW5kQXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcG9zaXRpb24gPSAwO1xuICAgICAgdmFyIGFyZ3MgPSBib3VuZEFyZ3Muc2xpY2UoKTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBhcmdzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChhcmdzW2ldID09PSBfKSBhcmdzW2ldID0gYXJndW1lbnRzW3Bvc2l0aW9uKytdO1xuICAgICAgfVxuICAgICAgd2hpbGUgKHBvc2l0aW9uIDwgYXJndW1lbnRzLmxlbmd0aCkgYXJncy5wdXNoKGFyZ3VtZW50c1twb3NpdGlvbisrXSk7XG4gICAgICByZXR1cm4gZnVuYy5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIEJpbmQgYSBudW1iZXIgb2YgYW4gb2JqZWN0J3MgbWV0aG9kcyB0byB0aGF0IG9iamVjdC4gUmVtYWluaW5nIGFyZ3VtZW50c1xuICAvLyBhcmUgdGhlIG1ldGhvZCBuYW1lcyB0byBiZSBib3VuZC4gVXNlZnVsIGZvciBlbnN1cmluZyB0aGF0IGFsbCBjYWxsYmFja3NcbiAgLy8gZGVmaW5lZCBvbiBhbiBvYmplY3QgYmVsb25nIHRvIGl0LlxuICBfLmJpbmRBbGwgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgZnVuY3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgaWYgKGZ1bmNzLmxlbmd0aCA9PT0gMCkgdGhyb3cgbmV3IEVycm9yKCdiaW5kQWxsIG11c3QgYmUgcGFzc2VkIGZ1bmN0aW9uIG5hbWVzJyk7XG4gICAgZWFjaChmdW5jcywgZnVuY3Rpb24oZikgeyBvYmpbZl0gPSBfLmJpbmQob2JqW2ZdLCBvYmopOyB9KTtcbiAgICByZXR1cm4gb2JqO1xuICB9O1xuXG4gIC8vIE1lbW9pemUgYW4gZXhwZW5zaXZlIGZ1bmN0aW9uIGJ5IHN0b3JpbmcgaXRzIHJlc3VsdHMuXG4gIF8ubWVtb2l6ZSA9IGZ1bmN0aW9uKGZ1bmMsIGhhc2hlcikge1xuICAgIHZhciBtZW1vID0ge307XG4gICAgaGFzaGVyIHx8IChoYXNoZXIgPSBfLmlkZW50aXR5KTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIga2V5ID0gaGFzaGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICByZXR1cm4gXy5oYXMobWVtbywga2V5KSA/IG1lbW9ba2V5XSA6IChtZW1vW2tleV0gPSBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykpO1xuICAgIH07XG4gIH07XG5cbiAgLy8gRGVsYXlzIGEgZnVuY3Rpb24gZm9yIHRoZSBnaXZlbiBudW1iZXIgb2YgbWlsbGlzZWNvbmRzLCBhbmQgdGhlbiBjYWxsc1xuICAvLyBpdCB3aXRoIHRoZSBhcmd1bWVudHMgc3VwcGxpZWQuXG4gIF8uZGVsYXkgPSBmdW5jdGlvbihmdW5jLCB3YWl0KSB7XG4gICAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuY3Rpb24oKXsgcmV0dXJuIGZ1bmMuYXBwbHkobnVsbCwgYXJncyk7IH0sIHdhaXQpO1xuICB9O1xuXG4gIC8vIERlZmVycyBhIGZ1bmN0aW9uLCBzY2hlZHVsaW5nIGl0IHRvIHJ1biBhZnRlciB0aGUgY3VycmVudCBjYWxsIHN0YWNrIGhhc1xuICAvLyBjbGVhcmVkLlxuICBfLmRlZmVyID0gZnVuY3Rpb24oZnVuYykge1xuICAgIHJldHVybiBfLmRlbGF5LmFwcGx5KF8sIFtmdW5jLCAxXS5jb25jYXQoc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKSk7XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uLCB0aGF0LCB3aGVuIGludm9rZWQsIHdpbGwgb25seSBiZSB0cmlnZ2VyZWQgYXQgbW9zdCBvbmNlXG4gIC8vIGR1cmluZyBhIGdpdmVuIHdpbmRvdyBvZiB0aW1lLiBOb3JtYWxseSwgdGhlIHRocm90dGxlZCBmdW5jdGlvbiB3aWxsIHJ1blxuICAvLyBhcyBtdWNoIGFzIGl0IGNhbiwgd2l0aG91dCBldmVyIGdvaW5nIG1vcmUgdGhhbiBvbmNlIHBlciBgd2FpdGAgZHVyYXRpb247XG4gIC8vIGJ1dCBpZiB5b3UnZCBsaWtlIHRvIGRpc2FibGUgdGhlIGV4ZWN1dGlvbiBvbiB0aGUgbGVhZGluZyBlZGdlLCBwYXNzXG4gIC8vIGB7bGVhZGluZzogZmFsc2V9YC4gVG8gZGlzYWJsZSBleGVjdXRpb24gb24gdGhlIHRyYWlsaW5nIGVkZ2UsIGRpdHRvLlxuICBfLnRocm90dGxlID0gZnVuY3Rpb24oZnVuYywgd2FpdCwgb3B0aW9ucykge1xuICAgIHZhciBjb250ZXh0LCBhcmdzLCByZXN1bHQ7XG4gICAgdmFyIHRpbWVvdXQgPSBudWxsO1xuICAgIHZhciBwcmV2aW91cyA9IDA7XG4gICAgb3B0aW9ucyB8fCAob3B0aW9ucyA9IHt9KTtcbiAgICB2YXIgbGF0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgIHByZXZpb3VzID0gb3B0aW9ucy5sZWFkaW5nID09PSBmYWxzZSA/IDAgOiBfLm5vdygpO1xuICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgY29udGV4dCA9IGFyZ3MgPSBudWxsO1xuICAgIH07XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIG5vdyA9IF8ubm93KCk7XG4gICAgICBpZiAoIXByZXZpb3VzICYmIG9wdGlvbnMubGVhZGluZyA9PT0gZmFsc2UpIHByZXZpb3VzID0gbm93O1xuICAgICAgdmFyIHJlbWFpbmluZyA9IHdhaXQgLSAobm93IC0gcHJldmlvdXMpO1xuICAgICAgY29udGV4dCA9IHRoaXM7XG4gICAgICBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgaWYgKHJlbWFpbmluZyA8PSAwKSB7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICAgIHByZXZpb3VzID0gbm93O1xuICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgICBjb250ZXh0ID0gYXJncyA9IG51bGw7XG4gICAgICB9IGVsc2UgaWYgKCF0aW1lb3V0ICYmIG9wdGlvbnMudHJhaWxpbmcgIT09IGZhbHNlKSB7XG4gICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCByZW1haW5pbmcpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiwgdGhhdCwgYXMgbG9uZyBhcyBpdCBjb250aW51ZXMgdG8gYmUgaW52b2tlZCwgd2lsbCBub3RcbiAgLy8gYmUgdHJpZ2dlcmVkLiBUaGUgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgYWZ0ZXIgaXQgc3RvcHMgYmVpbmcgY2FsbGVkIGZvclxuICAvLyBOIG1pbGxpc2Vjb25kcy4gSWYgYGltbWVkaWF0ZWAgaXMgcGFzc2VkLCB0cmlnZ2VyIHRoZSBmdW5jdGlvbiBvbiB0aGVcbiAgLy8gbGVhZGluZyBlZGdlLCBpbnN0ZWFkIG9mIHRoZSB0cmFpbGluZy5cbiAgXy5kZWJvdW5jZSA9IGZ1bmN0aW9uKGZ1bmMsIHdhaXQsIGltbWVkaWF0ZSkge1xuICAgIHZhciB0aW1lb3V0LCBhcmdzLCBjb250ZXh0LCB0aW1lc3RhbXAsIHJlc3VsdDtcblxuICAgIHZhciBsYXRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGxhc3QgPSBfLm5vdygpIC0gdGltZXN0YW1wO1xuICAgICAgaWYgKGxhc3QgPCB3YWl0KSB7XG4gICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCB3YWl0IC0gbGFzdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgICAgaWYgKCFpbW1lZGlhdGUpIHtcbiAgICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgICAgIGNvbnRleHQgPSBhcmdzID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBjb250ZXh0ID0gdGhpcztcbiAgICAgIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICB0aW1lc3RhbXAgPSBfLm5vdygpO1xuICAgICAgdmFyIGNhbGxOb3cgPSBpbW1lZGlhdGUgJiYgIXRpbWVvdXQ7XG4gICAgICBpZiAoIXRpbWVvdXQpIHtcbiAgICAgICAgdGltZW91dCA9IHNldFRpbWVvdXQobGF0ZXIsIHdhaXQpO1xuICAgICAgfVxuICAgICAgaWYgKGNhbGxOb3cpIHtcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgY29udGV4dCA9IGFyZ3MgPSBudWxsO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgd2lsbCBiZSBleGVjdXRlZCBhdCBtb3N0IG9uZSB0aW1lLCBubyBtYXR0ZXIgaG93XG4gIC8vIG9mdGVuIHlvdSBjYWxsIGl0LiBVc2VmdWwgZm9yIGxhenkgaW5pdGlhbGl6YXRpb24uXG4gIF8ub25jZSA9IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICB2YXIgcmFuID0gZmFsc2UsIG1lbW87XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHJhbikgcmV0dXJuIG1lbW87XG4gICAgICByYW4gPSB0cnVlO1xuICAgICAgbWVtbyA9IGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIGZ1bmMgPSBudWxsO1xuICAgICAgcmV0dXJuIG1lbW87XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIHRoZSBmaXJzdCBmdW5jdGlvbiBwYXNzZWQgYXMgYW4gYXJndW1lbnQgdG8gdGhlIHNlY29uZCxcbiAgLy8gYWxsb3dpbmcgeW91IHRvIGFkanVzdCBhcmd1bWVudHMsIHJ1biBjb2RlIGJlZm9yZSBhbmQgYWZ0ZXIsIGFuZFxuICAvLyBjb25kaXRpb25hbGx5IGV4ZWN1dGUgdGhlIG9yaWdpbmFsIGZ1bmN0aW9uLlxuICBfLndyYXAgPSBmdW5jdGlvbihmdW5jLCB3cmFwcGVyKSB7XG4gICAgcmV0dXJuIF8ucGFydGlhbCh3cmFwcGVyLCBmdW5jKTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCBpcyB0aGUgY29tcG9zaXRpb24gb2YgYSBsaXN0IG9mIGZ1bmN0aW9ucywgZWFjaFxuICAvLyBjb25zdW1pbmcgdGhlIHJldHVybiB2YWx1ZSBvZiB0aGUgZnVuY3Rpb24gdGhhdCBmb2xsb3dzLlxuICBfLmNvbXBvc2UgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZnVuY3MgPSBhcmd1bWVudHM7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICBmb3IgKHZhciBpID0gZnVuY3MubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgYXJncyA9IFtmdW5jc1tpXS5hcHBseSh0aGlzLCBhcmdzKV07XG4gICAgICB9XG4gICAgICByZXR1cm4gYXJnc1swXTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHdpbGwgb25seSBiZSBleGVjdXRlZCBhZnRlciBiZWluZyBjYWxsZWQgTiB0aW1lcy5cbiAgXy5hZnRlciA9IGZ1bmN0aW9uKHRpbWVzLCBmdW5jKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKC0tdGltZXMgPCAxKSB7XG4gICAgICAgIHJldHVybiBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9XG4gICAgfTtcbiAgfTtcblxuICAvLyBPYmplY3QgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBSZXRyaWV2ZSB0aGUgbmFtZXMgb2YgYW4gb2JqZWN0J3MgcHJvcGVydGllcy5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYE9iamVjdC5rZXlzYFxuICBfLmtleXMgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIV8uaXNPYmplY3Qob2JqKSkgcmV0dXJuIFtdO1xuICAgIGlmIChuYXRpdmVLZXlzKSByZXR1cm4gbmF0aXZlS2V5cyhvYmopO1xuICAgIHZhciBrZXlzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikgaWYgKF8uaGFzKG9iaiwga2V5KSkga2V5cy5wdXNoKGtleSk7XG4gICAgcmV0dXJuIGtleXM7XG4gIH07XG5cbiAgLy8gUmV0cmlldmUgdGhlIHZhbHVlcyBvZiBhbiBvYmplY3QncyBwcm9wZXJ0aWVzLlxuICBfLnZhbHVlcyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgdmFyIGxlbmd0aCA9IGtleXMubGVuZ3RoO1xuICAgIHZhciB2YWx1ZXMgPSBuZXcgQXJyYXkobGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICB2YWx1ZXNbaV0gPSBvYmpba2V5c1tpXV07XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZXM7XG4gIH07XG5cbiAgLy8gQ29udmVydCBhbiBvYmplY3QgaW50byBhIGxpc3Qgb2YgYFtrZXksIHZhbHVlXWAgcGFpcnMuXG4gIF8ucGFpcnMgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgIHZhciBsZW5ndGggPSBrZXlzLmxlbmd0aDtcbiAgICB2YXIgcGFpcnMgPSBuZXcgQXJyYXkobGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBwYWlyc1tpXSA9IFtrZXlzW2ldLCBvYmpba2V5c1tpXV1dO1xuICAgIH1cbiAgICByZXR1cm4gcGFpcnM7XG4gIH07XG5cbiAgLy8gSW52ZXJ0IHRoZSBrZXlzIGFuZCB2YWx1ZXMgb2YgYW4gb2JqZWN0LiBUaGUgdmFsdWVzIG11c3QgYmUgc2VyaWFsaXphYmxlLlxuICBfLmludmVydCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBrZXlzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICByZXN1bHRbb2JqW2tleXNbaV1dXSA9IGtleXNbaV07XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgc29ydGVkIGxpc3Qgb2YgdGhlIGZ1bmN0aW9uIG5hbWVzIGF2YWlsYWJsZSBvbiB0aGUgb2JqZWN0LlxuICAvLyBBbGlhc2VkIGFzIGBtZXRob2RzYFxuICBfLmZ1bmN0aW9ucyA9IF8ubWV0aG9kcyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBuYW1lcyA9IFtdO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgIGlmIChfLmlzRnVuY3Rpb24ob2JqW2tleV0pKSBuYW1lcy5wdXNoKGtleSk7XG4gICAgfVxuICAgIHJldHVybiBuYW1lcy5zb3J0KCk7XG4gIH07XG5cbiAgLy8gRXh0ZW5kIGEgZ2l2ZW4gb2JqZWN0IHdpdGggYWxsIHRoZSBwcm9wZXJ0aWVzIGluIHBhc3NlZC1pbiBvYmplY3QocykuXG4gIF8uZXh0ZW5kID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgZWFjaChzbGljZS5jYWxsKGFyZ3VtZW50cywgMSksIGZ1bmN0aW9uKHNvdXJjZSkge1xuICAgICAgaWYgKHNvdXJjZSkge1xuICAgICAgICBmb3IgKHZhciBwcm9wIGluIHNvdXJjZSkge1xuICAgICAgICAgIG9ialtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgY29weSBvZiB0aGUgb2JqZWN0IG9ubHkgY29udGFpbmluZyB0aGUgd2hpdGVsaXN0ZWQgcHJvcGVydGllcy5cbiAgXy5waWNrID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIGNvcHkgPSB7fTtcbiAgICB2YXIga2V5cyA9IGNvbmNhdC5hcHBseShBcnJheVByb3RvLCBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICAgIGVhY2goa2V5cywgZnVuY3Rpb24oa2V5KSB7XG4gICAgICBpZiAoa2V5IGluIG9iaikgY29weVtrZXldID0gb2JqW2tleV07XG4gICAgfSk7XG4gICAgcmV0dXJuIGNvcHk7XG4gIH07XG5cbiAgIC8vIFJldHVybiBhIGNvcHkgb2YgdGhlIG9iamVjdCB3aXRob3V0IHRoZSBibGFja2xpc3RlZCBwcm9wZXJ0aWVzLlxuICBfLm9taXQgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgY29weSA9IHt9O1xuICAgIHZhciBrZXlzID0gY29uY2F0LmFwcGx5KEFycmF5UHJvdG8sIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgaWYgKCFfLmNvbnRhaW5zKGtleXMsIGtleSkpIGNvcHlba2V5XSA9IG9ialtrZXldO1xuICAgIH1cbiAgICByZXR1cm4gY29weTtcbiAgfTtcblxuICAvLyBGaWxsIGluIGEgZ2l2ZW4gb2JqZWN0IHdpdGggZGVmYXVsdCBwcm9wZXJ0aWVzLlxuICBfLmRlZmF1bHRzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgZWFjaChzbGljZS5jYWxsKGFyZ3VtZW50cywgMSksIGZ1bmN0aW9uKHNvdXJjZSkge1xuICAgICAgaWYgKHNvdXJjZSkge1xuICAgICAgICBmb3IgKHZhciBwcm9wIGluIHNvdXJjZSkge1xuICAgICAgICAgIGlmIChvYmpbcHJvcF0gPT09IHZvaWQgMCkgb2JqW3Byb3BdID0gc291cmNlW3Byb3BdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBDcmVhdGUgYSAoc2hhbGxvdy1jbG9uZWQpIGR1cGxpY2F0ZSBvZiBhbiBvYmplY3QuXG4gIF8uY2xvbmUgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIV8uaXNPYmplY3Qob2JqKSkgcmV0dXJuIG9iajtcbiAgICByZXR1cm4gXy5pc0FycmF5KG9iaikgPyBvYmouc2xpY2UoKSA6IF8uZXh0ZW5kKHt9LCBvYmopO1xuICB9O1xuXG4gIC8vIEludm9rZXMgaW50ZXJjZXB0b3Igd2l0aCB0aGUgb2JqLCBhbmQgdGhlbiByZXR1cm5zIG9iai5cbiAgLy8gVGhlIHByaW1hcnkgcHVycG9zZSBvZiB0aGlzIG1ldGhvZCBpcyB0byBcInRhcCBpbnRvXCIgYSBtZXRob2QgY2hhaW4sIGluXG4gIC8vIG9yZGVyIHRvIHBlcmZvcm0gb3BlcmF0aW9ucyBvbiBpbnRlcm1lZGlhdGUgcmVzdWx0cyB3aXRoaW4gdGhlIGNoYWluLlxuICBfLnRhcCA9IGZ1bmN0aW9uKG9iaiwgaW50ZXJjZXB0b3IpIHtcbiAgICBpbnRlcmNlcHRvcihvYmopO1xuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gSW50ZXJuYWwgcmVjdXJzaXZlIGNvbXBhcmlzb24gZnVuY3Rpb24gZm9yIGBpc0VxdWFsYC5cbiAgdmFyIGVxID0gZnVuY3Rpb24oYSwgYiwgYVN0YWNrLCBiU3RhY2spIHtcbiAgICAvLyBJZGVudGljYWwgb2JqZWN0cyBhcmUgZXF1YWwuIGAwID09PSAtMGAsIGJ1dCB0aGV5IGFyZW4ndCBpZGVudGljYWwuXG4gICAgLy8gU2VlIHRoZSBbSGFybW9ueSBgZWdhbGAgcHJvcG9zYWxdKGh0dHA6Ly93aWtpLmVjbWFzY3JpcHQub3JnL2Rva3UucGhwP2lkPWhhcm1vbnk6ZWdhbCkuXG4gICAgaWYgKGEgPT09IGIpIHJldHVybiBhICE9PSAwIHx8IDEgLyBhID09IDEgLyBiO1xuICAgIC8vIEEgc3RyaWN0IGNvbXBhcmlzb24gaXMgbmVjZXNzYXJ5IGJlY2F1c2UgYG51bGwgPT0gdW5kZWZpbmVkYC5cbiAgICBpZiAoYSA9PSBudWxsIHx8IGIgPT0gbnVsbCkgcmV0dXJuIGEgPT09IGI7XG4gICAgLy8gVW53cmFwIGFueSB3cmFwcGVkIG9iamVjdHMuXG4gICAgaWYgKGEgaW5zdGFuY2VvZiBfKSBhID0gYS5fd3JhcHBlZDtcbiAgICBpZiAoYiBpbnN0YW5jZW9mIF8pIGIgPSBiLl93cmFwcGVkO1xuICAgIC8vIENvbXBhcmUgYFtbQ2xhc3NdXWAgbmFtZXMuXG4gICAgdmFyIGNsYXNzTmFtZSA9IHRvU3RyaW5nLmNhbGwoYSk7XG4gICAgaWYgKGNsYXNzTmFtZSAhPSB0b1N0cmluZy5jYWxsKGIpKSByZXR1cm4gZmFsc2U7XG4gICAgc3dpdGNoIChjbGFzc05hbWUpIHtcbiAgICAgIC8vIFN0cmluZ3MsIG51bWJlcnMsIGRhdGVzLCBhbmQgYm9vbGVhbnMgYXJlIGNvbXBhcmVkIGJ5IHZhbHVlLlxuICAgICAgY2FzZSAnW29iamVjdCBTdHJpbmddJzpcbiAgICAgICAgLy8gUHJpbWl0aXZlcyBhbmQgdGhlaXIgY29ycmVzcG9uZGluZyBvYmplY3Qgd3JhcHBlcnMgYXJlIGVxdWl2YWxlbnQ7IHRodXMsIGBcIjVcImAgaXNcbiAgICAgICAgLy8gZXF1aXZhbGVudCB0byBgbmV3IFN0cmluZyhcIjVcIilgLlxuICAgICAgICByZXR1cm4gYSA9PSBTdHJpbmcoYik7XG4gICAgICBjYXNlICdbb2JqZWN0IE51bWJlcl0nOlxuICAgICAgICAvLyBgTmFOYHMgYXJlIGVxdWl2YWxlbnQsIGJ1dCBub24tcmVmbGV4aXZlLiBBbiBgZWdhbGAgY29tcGFyaXNvbiBpcyBwZXJmb3JtZWQgZm9yXG4gICAgICAgIC8vIG90aGVyIG51bWVyaWMgdmFsdWVzLlxuICAgICAgICByZXR1cm4gYSAhPSArYSA/IGIgIT0gK2IgOiAoYSA9PSAwID8gMSAvIGEgPT0gMSAvIGIgOiBhID09ICtiKTtcbiAgICAgIGNhc2UgJ1tvYmplY3QgRGF0ZV0nOlxuICAgICAgY2FzZSAnW29iamVjdCBCb29sZWFuXSc6XG4gICAgICAgIC8vIENvZXJjZSBkYXRlcyBhbmQgYm9vbGVhbnMgdG8gbnVtZXJpYyBwcmltaXRpdmUgdmFsdWVzLiBEYXRlcyBhcmUgY29tcGFyZWQgYnkgdGhlaXJcbiAgICAgICAgLy8gbWlsbGlzZWNvbmQgcmVwcmVzZW50YXRpb25zLiBOb3RlIHRoYXQgaW52YWxpZCBkYXRlcyB3aXRoIG1pbGxpc2Vjb25kIHJlcHJlc2VudGF0aW9uc1xuICAgICAgICAvLyBvZiBgTmFOYCBhcmUgbm90IGVxdWl2YWxlbnQuXG4gICAgICAgIHJldHVybiArYSA9PSArYjtcbiAgICAgIC8vIFJlZ0V4cHMgYXJlIGNvbXBhcmVkIGJ5IHRoZWlyIHNvdXJjZSBwYXR0ZXJucyBhbmQgZmxhZ3MuXG4gICAgICBjYXNlICdbb2JqZWN0IFJlZ0V4cF0nOlxuICAgICAgICByZXR1cm4gYS5zb3VyY2UgPT0gYi5zb3VyY2UgJiZcbiAgICAgICAgICAgICAgIGEuZ2xvYmFsID09IGIuZ2xvYmFsICYmXG4gICAgICAgICAgICAgICBhLm11bHRpbGluZSA9PSBiLm11bHRpbGluZSAmJlxuICAgICAgICAgICAgICAgYS5pZ25vcmVDYXNlID09IGIuaWdub3JlQ2FzZTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBhICE9ICdvYmplY3QnIHx8IHR5cGVvZiBiICE9ICdvYmplY3QnKSByZXR1cm4gZmFsc2U7XG4gICAgLy8gQXNzdW1lIGVxdWFsaXR5IGZvciBjeWNsaWMgc3RydWN0dXJlcy4gVGhlIGFsZ29yaXRobSBmb3IgZGV0ZWN0aW5nIGN5Y2xpY1xuICAgIC8vIHN0cnVjdHVyZXMgaXMgYWRhcHRlZCBmcm9tIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjMsIGFic3RyYWN0IG9wZXJhdGlvbiBgSk9gLlxuICAgIHZhciBsZW5ndGggPSBhU3RhY2subGVuZ3RoO1xuICAgIHdoaWxlIChsZW5ndGgtLSkge1xuICAgICAgLy8gTGluZWFyIHNlYXJjaC4gUGVyZm9ybWFuY2UgaXMgaW52ZXJzZWx5IHByb3BvcnRpb25hbCB0byB0aGUgbnVtYmVyIG9mXG4gICAgICAvLyB1bmlxdWUgbmVzdGVkIHN0cnVjdHVyZXMuXG4gICAgICBpZiAoYVN0YWNrW2xlbmd0aF0gPT0gYSkgcmV0dXJuIGJTdGFja1tsZW5ndGhdID09IGI7XG4gICAgfVxuICAgIC8vIE9iamVjdHMgd2l0aCBkaWZmZXJlbnQgY29uc3RydWN0b3JzIGFyZSBub3QgZXF1aXZhbGVudCwgYnV0IGBPYmplY3Rgc1xuICAgIC8vIGZyb20gZGlmZmVyZW50IGZyYW1lcyBhcmUuXG4gICAgdmFyIGFDdG9yID0gYS5jb25zdHJ1Y3RvciwgYkN0b3IgPSBiLmNvbnN0cnVjdG9yO1xuICAgIGlmIChhQ3RvciAhPT0gYkN0b3IgJiYgIShfLmlzRnVuY3Rpb24oYUN0b3IpICYmIChhQ3RvciBpbnN0YW5jZW9mIGFDdG9yKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLmlzRnVuY3Rpb24oYkN0b3IpICYmIChiQ3RvciBpbnN0YW5jZW9mIGJDdG9yKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICYmICgnY29uc3RydWN0b3InIGluIGEgJiYgJ2NvbnN0cnVjdG9yJyBpbiBiKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvLyBBZGQgdGhlIGZpcnN0IG9iamVjdCB0byB0aGUgc3RhY2sgb2YgdHJhdmVyc2VkIG9iamVjdHMuXG4gICAgYVN0YWNrLnB1c2goYSk7XG4gICAgYlN0YWNrLnB1c2goYik7XG4gICAgdmFyIHNpemUgPSAwLCByZXN1bHQgPSB0cnVlO1xuICAgIC8vIFJlY3Vyc2l2ZWx5IGNvbXBhcmUgb2JqZWN0cyBhbmQgYXJyYXlzLlxuICAgIGlmIChjbGFzc05hbWUgPT0gJ1tvYmplY3QgQXJyYXldJykge1xuICAgICAgLy8gQ29tcGFyZSBhcnJheSBsZW5ndGhzIHRvIGRldGVybWluZSBpZiBhIGRlZXAgY29tcGFyaXNvbiBpcyBuZWNlc3NhcnkuXG4gICAgICBzaXplID0gYS5sZW5ndGg7XG4gICAgICByZXN1bHQgPSBzaXplID09IGIubGVuZ3RoO1xuICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAvLyBEZWVwIGNvbXBhcmUgdGhlIGNvbnRlbnRzLCBpZ25vcmluZyBub24tbnVtZXJpYyBwcm9wZXJ0aWVzLlxuICAgICAgICB3aGlsZSAoc2l6ZS0tKSB7XG4gICAgICAgICAgaWYgKCEocmVzdWx0ID0gZXEoYVtzaXplXSwgYltzaXplXSwgYVN0YWNrLCBiU3RhY2spKSkgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRGVlcCBjb21wYXJlIG9iamVjdHMuXG4gICAgICBmb3IgKHZhciBrZXkgaW4gYSkge1xuICAgICAgICBpZiAoXy5oYXMoYSwga2V5KSkge1xuICAgICAgICAgIC8vIENvdW50IHRoZSBleHBlY3RlZCBudW1iZXIgb2YgcHJvcGVydGllcy5cbiAgICAgICAgICBzaXplKys7XG4gICAgICAgICAgLy8gRGVlcCBjb21wYXJlIGVhY2ggbWVtYmVyLlxuICAgICAgICAgIGlmICghKHJlc3VsdCA9IF8uaGFzKGIsIGtleSkgJiYgZXEoYVtrZXldLCBiW2tleV0sIGFTdGFjaywgYlN0YWNrKSkpIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBFbnN1cmUgdGhhdCBib3RoIG9iamVjdHMgY29udGFpbiB0aGUgc2FtZSBudW1iZXIgb2YgcHJvcGVydGllcy5cbiAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgZm9yIChrZXkgaW4gYikge1xuICAgICAgICAgIGlmIChfLmhhcyhiLCBrZXkpICYmICEoc2l6ZS0tKSkgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0ID0gIXNpemU7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIFJlbW92ZSB0aGUgZmlyc3Qgb2JqZWN0IGZyb20gdGhlIHN0YWNrIG9mIHRyYXZlcnNlZCBvYmplY3RzLlxuICAgIGFTdGFjay5wb3AoKTtcbiAgICBiU3RhY2sucG9wKCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBQZXJmb3JtIGEgZGVlcCBjb21wYXJpc29uIHRvIGNoZWNrIGlmIHR3byBvYmplY3RzIGFyZSBlcXVhbC5cbiAgXy5pc0VxdWFsID0gZnVuY3Rpb24oYSwgYikge1xuICAgIHJldHVybiBlcShhLCBiLCBbXSwgW10pO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gYXJyYXksIHN0cmluZywgb3Igb2JqZWN0IGVtcHR5P1xuICAvLyBBbiBcImVtcHR5XCIgb2JqZWN0IGhhcyBubyBlbnVtZXJhYmxlIG93bi1wcm9wZXJ0aWVzLlxuICBfLmlzRW1wdHkgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiB0cnVlO1xuICAgIGlmIChfLmlzQXJyYXkob2JqKSB8fCBfLmlzU3RyaW5nKG9iaikpIHJldHVybiBvYmoubGVuZ3RoID09PSAwO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIGlmIChfLmhhcyhvYmosIGtleSkpIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhbHVlIGEgRE9NIGVsZW1lbnQ/XG4gIF8uaXNFbGVtZW50ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuICEhKG9iaiAmJiBvYmoubm9kZVR5cGUgPT09IDEpO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFsdWUgYW4gYXJyYXk/XG4gIC8vIERlbGVnYXRlcyB0byBFQ01BNSdzIG5hdGl2ZSBBcnJheS5pc0FycmF5XG4gIF8uaXNBcnJheSA9IG5hdGl2ZUlzQXJyYXkgfHwgZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PSAnW29iamVjdCBBcnJheV0nO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFyaWFibGUgYW4gb2JqZWN0P1xuICBfLmlzT2JqZWN0ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIG9iaiA9PT0gT2JqZWN0KG9iaik7XG4gIH07XG5cbiAgLy8gQWRkIHNvbWUgaXNUeXBlIG1ldGhvZHM6IGlzQXJndW1lbnRzLCBpc0Z1bmN0aW9uLCBpc1N0cmluZywgaXNOdW1iZXIsIGlzRGF0ZSwgaXNSZWdFeHAuXG4gIGVhY2goWydBcmd1bWVudHMnLCAnRnVuY3Rpb24nLCAnU3RyaW5nJywgJ051bWJlcicsICdEYXRlJywgJ1JlZ0V4cCddLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgX1snaXMnICsgbmFtZV0gPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiB0b1N0cmluZy5jYWxsKG9iaikgPT0gJ1tvYmplY3QgJyArIG5hbWUgKyAnXSc7XG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gRGVmaW5lIGEgZmFsbGJhY2sgdmVyc2lvbiBvZiB0aGUgbWV0aG9kIGluIGJyb3dzZXJzIChhaGVtLCBJRSksIHdoZXJlXG4gIC8vIHRoZXJlIGlzbid0IGFueSBpbnNwZWN0YWJsZSBcIkFyZ3VtZW50c1wiIHR5cGUuXG4gIGlmICghXy5pc0FyZ3VtZW50cyhhcmd1bWVudHMpKSB7XG4gICAgXy5pc0FyZ3VtZW50cyA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuICEhKG9iaiAmJiBfLmhhcyhvYmosICdjYWxsZWUnKSk7XG4gICAgfTtcbiAgfVxuXG4gIC8vIE9wdGltaXplIGBpc0Z1bmN0aW9uYCBpZiBhcHByb3ByaWF0ZS5cbiAgaWYgKHR5cGVvZiAoLy4vKSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIF8uaXNGdW5jdGlvbiA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIHR5cGVvZiBvYmogPT09ICdmdW5jdGlvbic7XG4gICAgfTtcbiAgfVxuXG4gIC8vIElzIGEgZ2l2ZW4gb2JqZWN0IGEgZmluaXRlIG51bWJlcj9cbiAgXy5pc0Zpbml0ZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBpc0Zpbml0ZShvYmopICYmICFpc05hTihwYXJzZUZsb2F0KG9iaikpO1xuICB9O1xuXG4gIC8vIElzIHRoZSBnaXZlbiB2YWx1ZSBgTmFOYD8gKE5hTiBpcyB0aGUgb25seSBudW1iZXIgd2hpY2ggZG9lcyBub3QgZXF1YWwgaXRzZWxmKS5cbiAgXy5pc05hTiA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBfLmlzTnVtYmVyKG9iaikgJiYgb2JqICE9ICtvYmo7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YWx1ZSBhIGJvb2xlYW4/XG4gIF8uaXNCb29sZWFuID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIG9iaiA9PT0gdHJ1ZSB8fCBvYmogPT09IGZhbHNlIHx8IHRvU3RyaW5nLmNhbGwob2JqKSA9PSAnW29iamVjdCBCb29sZWFuXSc7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YWx1ZSBlcXVhbCB0byBudWxsP1xuICBfLmlzTnVsbCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBvYmogPT09IG51bGw7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YXJpYWJsZSB1bmRlZmluZWQ/XG4gIF8uaXNVbmRlZmluZWQgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSB2b2lkIDA7XG4gIH07XG5cbiAgLy8gU2hvcnRjdXQgZnVuY3Rpb24gZm9yIGNoZWNraW5nIGlmIGFuIG9iamVjdCBoYXMgYSBnaXZlbiBwcm9wZXJ0eSBkaXJlY3RseVxuICAvLyBvbiBpdHNlbGYgKGluIG90aGVyIHdvcmRzLCBub3Qgb24gYSBwcm90b3R5cGUpLlxuICBfLmhhcyA9IGZ1bmN0aW9uKG9iaiwga2V5KSB7XG4gICAgcmV0dXJuIGhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpO1xuICB9O1xuXG4gIC8vIFV0aWxpdHkgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gUnVuIFVuZGVyc2NvcmUuanMgaW4gKm5vQ29uZmxpY3QqIG1vZGUsIHJldHVybmluZyB0aGUgYF9gIHZhcmlhYmxlIHRvIGl0c1xuICAvLyBwcmV2aW91cyBvd25lci4gUmV0dXJucyBhIHJlZmVyZW5jZSB0byB0aGUgVW5kZXJzY29yZSBvYmplY3QuXG4gIF8ubm9Db25mbGljdCA9IGZ1bmN0aW9uKCkge1xuICAgIHJvb3QuXyA9IHByZXZpb3VzVW5kZXJzY29yZTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvLyBLZWVwIHRoZSBpZGVudGl0eSBmdW5jdGlvbiBhcm91bmQgZm9yIGRlZmF1bHQgaXRlcmF0b3JzLlxuICBfLmlkZW50aXR5ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH07XG5cbiAgXy5jb25zdGFudCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9O1xuICB9O1xuXG4gIF8ucHJvcGVydHkgPSBmdW5jdGlvbihrZXkpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gb2JqW2tleV07XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgcHJlZGljYXRlIGZvciBjaGVja2luZyB3aGV0aGVyIGFuIG9iamVjdCBoYXMgYSBnaXZlbiBzZXQgb2YgYGtleTp2YWx1ZWAgcGFpcnMuXG4gIF8ubWF0Y2hlcyA9IGZ1bmN0aW9uKGF0dHJzKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKG9iaikge1xuICAgICAgaWYgKG9iaiA9PT0gYXR0cnMpIHJldHVybiB0cnVlOyAvL2F2b2lkIGNvbXBhcmluZyBhbiBvYmplY3QgdG8gaXRzZWxmLlxuICAgICAgZm9yICh2YXIga2V5IGluIGF0dHJzKSB7XG4gICAgICAgIGlmIChhdHRyc1trZXldICE9PSBvYmpba2V5XSlcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH07XG5cbiAgLy8gUnVuIGEgZnVuY3Rpb24gKipuKiogdGltZXMuXG4gIF8udGltZXMgPSBmdW5jdGlvbihuLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIHZhciBhY2N1bSA9IEFycmF5KE1hdGgubWF4KDAsIG4pKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG47IGkrKykgYWNjdW1baV0gPSBpdGVyYXRvci5jYWxsKGNvbnRleHQsIGkpO1xuICAgIHJldHVybiBhY2N1bTtcbiAgfTtcblxuICAvLyBSZXR1cm4gYSByYW5kb20gaW50ZWdlciBiZXR3ZWVuIG1pbiBhbmQgbWF4IChpbmNsdXNpdmUpLlxuICBfLnJhbmRvbSA9IGZ1bmN0aW9uKG1pbiwgbWF4KSB7XG4gICAgaWYgKG1heCA9PSBudWxsKSB7XG4gICAgICBtYXggPSBtaW47XG4gICAgICBtaW4gPSAwO1xuICAgIH1cbiAgICByZXR1cm4gbWluICsgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKTtcbiAgfTtcblxuICAvLyBBIChwb3NzaWJseSBmYXN0ZXIpIHdheSB0byBnZXQgdGhlIGN1cnJlbnQgdGltZXN0YW1wIGFzIGFuIGludGVnZXIuXG4gIF8ubm93ID0gRGF0ZS5ub3cgfHwgZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTsgfTtcblxuICAvLyBMaXN0IG9mIEhUTUwgZW50aXRpZXMgZm9yIGVzY2FwaW5nLlxuICB2YXIgZW50aXR5TWFwID0ge1xuICAgIGVzY2FwZToge1xuICAgICAgJyYnOiAnJmFtcDsnLFxuICAgICAgJzwnOiAnJmx0OycsXG4gICAgICAnPic6ICcmZ3Q7JyxcbiAgICAgICdcIic6ICcmcXVvdDsnLFxuICAgICAgXCInXCI6ICcmI3gyNzsnXG4gICAgfVxuICB9O1xuICBlbnRpdHlNYXAudW5lc2NhcGUgPSBfLmludmVydChlbnRpdHlNYXAuZXNjYXBlKTtcblxuICAvLyBSZWdleGVzIGNvbnRhaW5pbmcgdGhlIGtleXMgYW5kIHZhbHVlcyBsaXN0ZWQgaW1tZWRpYXRlbHkgYWJvdmUuXG4gIHZhciBlbnRpdHlSZWdleGVzID0ge1xuICAgIGVzY2FwZTogICBuZXcgUmVnRXhwKCdbJyArIF8ua2V5cyhlbnRpdHlNYXAuZXNjYXBlKS5qb2luKCcnKSArICddJywgJ2cnKSxcbiAgICB1bmVzY2FwZTogbmV3IFJlZ0V4cCgnKCcgKyBfLmtleXMoZW50aXR5TWFwLnVuZXNjYXBlKS5qb2luKCd8JykgKyAnKScsICdnJylcbiAgfTtcblxuICAvLyBGdW5jdGlvbnMgZm9yIGVzY2FwaW5nIGFuZCB1bmVzY2FwaW5nIHN0cmluZ3MgdG8vZnJvbSBIVE1MIGludGVycG9sYXRpb24uXG4gIF8uZWFjaChbJ2VzY2FwZScsICd1bmVzY2FwZSddLCBmdW5jdGlvbihtZXRob2QpIHtcbiAgICBfW21ldGhvZF0gPSBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICAgIGlmIChzdHJpbmcgPT0gbnVsbCkgcmV0dXJuICcnO1xuICAgICAgcmV0dXJuICgnJyArIHN0cmluZykucmVwbGFjZShlbnRpdHlSZWdleGVzW21ldGhvZF0sIGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgICAgIHJldHVybiBlbnRpdHlNYXBbbWV0aG9kXVttYXRjaF07XG4gICAgICB9KTtcbiAgICB9O1xuICB9KTtcblxuICAvLyBJZiB0aGUgdmFsdWUgb2YgdGhlIG5hbWVkIGBwcm9wZXJ0eWAgaXMgYSBmdW5jdGlvbiB0aGVuIGludm9rZSBpdCB3aXRoIHRoZVxuICAvLyBgb2JqZWN0YCBhcyBjb250ZXh0OyBvdGhlcndpc2UsIHJldHVybiBpdC5cbiAgXy5yZXN1bHQgPSBmdW5jdGlvbihvYmplY3QsIHByb3BlcnR5KSB7XG4gICAgaWYgKG9iamVjdCA9PSBudWxsKSByZXR1cm4gdm9pZCAwO1xuICAgIHZhciB2YWx1ZSA9IG9iamVjdFtwcm9wZXJ0eV07XG4gICAgcmV0dXJuIF8uaXNGdW5jdGlvbih2YWx1ZSkgPyB2YWx1ZS5jYWxsKG9iamVjdCkgOiB2YWx1ZTtcbiAgfTtcblxuICAvLyBBZGQgeW91ciBvd24gY3VzdG9tIGZ1bmN0aW9ucyB0byB0aGUgVW5kZXJzY29yZSBvYmplY3QuXG4gIF8ubWl4aW4gPSBmdW5jdGlvbihvYmopIHtcbiAgICBlYWNoKF8uZnVuY3Rpb25zKG9iaiksIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHZhciBmdW5jID0gX1tuYW1lXSA9IG9ialtuYW1lXTtcbiAgICAgIF8ucHJvdG90eXBlW25hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBhcmdzID0gW3RoaXMuX3dyYXBwZWRdO1xuICAgICAgICBwdXNoLmFwcGx5KGFyZ3MsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiByZXN1bHQuY2FsbCh0aGlzLCBmdW5jLmFwcGx5KF8sIGFyZ3MpKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gR2VuZXJhdGUgYSB1bmlxdWUgaW50ZWdlciBpZCAodW5pcXVlIHdpdGhpbiB0aGUgZW50aXJlIGNsaWVudCBzZXNzaW9uKS5cbiAgLy8gVXNlZnVsIGZvciB0ZW1wb3JhcnkgRE9NIGlkcy5cbiAgdmFyIGlkQ291bnRlciA9IDA7XG4gIF8udW5pcXVlSWQgPSBmdW5jdGlvbihwcmVmaXgpIHtcbiAgICB2YXIgaWQgPSArK2lkQ291bnRlciArICcnO1xuICAgIHJldHVybiBwcmVmaXggPyBwcmVmaXggKyBpZCA6IGlkO1xuICB9O1xuXG4gIC8vIEJ5IGRlZmF1bHQsIFVuZGVyc2NvcmUgdXNlcyBFUkItc3R5bGUgdGVtcGxhdGUgZGVsaW1pdGVycywgY2hhbmdlIHRoZVxuICAvLyBmb2xsb3dpbmcgdGVtcGxhdGUgc2V0dGluZ3MgdG8gdXNlIGFsdGVybmF0aXZlIGRlbGltaXRlcnMuXG4gIF8udGVtcGxhdGVTZXR0aW5ncyA9IHtcbiAgICBldmFsdWF0ZSAgICA6IC88JShbXFxzXFxTXSs/KSU+L2csXG4gICAgaW50ZXJwb2xhdGUgOiAvPCU9KFtcXHNcXFNdKz8pJT4vZyxcbiAgICBlc2NhcGUgICAgICA6IC88JS0oW1xcc1xcU10rPyklPi9nXG4gIH07XG5cbiAgLy8gV2hlbiBjdXN0b21pemluZyBgdGVtcGxhdGVTZXR0aW5nc2AsIGlmIHlvdSBkb24ndCB3YW50IHRvIGRlZmluZSBhblxuICAvLyBpbnRlcnBvbGF0aW9uLCBldmFsdWF0aW9uIG9yIGVzY2FwaW5nIHJlZ2V4LCB3ZSBuZWVkIG9uZSB0aGF0IGlzXG4gIC8vIGd1YXJhbnRlZWQgbm90IHRvIG1hdGNoLlxuICB2YXIgbm9NYXRjaCA9IC8oLileLztcblxuICAvLyBDZXJ0YWluIGNoYXJhY3RlcnMgbmVlZCB0byBiZSBlc2NhcGVkIHNvIHRoYXQgdGhleSBjYW4gYmUgcHV0IGludG8gYVxuICAvLyBzdHJpbmcgbGl0ZXJhbC5cbiAgdmFyIGVzY2FwZXMgPSB7XG4gICAgXCInXCI6ICAgICAgXCInXCIsXG4gICAgJ1xcXFwnOiAgICAgJ1xcXFwnLFxuICAgICdcXHInOiAgICAgJ3InLFxuICAgICdcXG4nOiAgICAgJ24nLFxuICAgICdcXHQnOiAgICAgJ3QnLFxuICAgICdcXHUyMDI4JzogJ3UyMDI4JyxcbiAgICAnXFx1MjAyOSc6ICd1MjAyOSdcbiAgfTtcblxuICB2YXIgZXNjYXBlciA9IC9cXFxcfCd8XFxyfFxcbnxcXHR8XFx1MjAyOHxcXHUyMDI5L2c7XG5cbiAgLy8gSmF2YVNjcmlwdCBtaWNyby10ZW1wbGF0aW5nLCBzaW1pbGFyIHRvIEpvaG4gUmVzaWcncyBpbXBsZW1lbnRhdGlvbi5cbiAgLy8gVW5kZXJzY29yZSB0ZW1wbGF0aW5nIGhhbmRsZXMgYXJiaXRyYXJ5IGRlbGltaXRlcnMsIHByZXNlcnZlcyB3aGl0ZXNwYWNlLFxuICAvLyBhbmQgY29ycmVjdGx5IGVzY2FwZXMgcXVvdGVzIHdpdGhpbiBpbnRlcnBvbGF0ZWQgY29kZS5cbiAgXy50ZW1wbGF0ZSA9IGZ1bmN0aW9uKHRleHQsIGRhdGEsIHNldHRpbmdzKSB7XG4gICAgdmFyIHJlbmRlcjtcbiAgICBzZXR0aW5ncyA9IF8uZGVmYXVsdHMoe30sIHNldHRpbmdzLCBfLnRlbXBsYXRlU2V0dGluZ3MpO1xuXG4gICAgLy8gQ29tYmluZSBkZWxpbWl0ZXJzIGludG8gb25lIHJlZ3VsYXIgZXhwcmVzc2lvbiB2aWEgYWx0ZXJuYXRpb24uXG4gICAgdmFyIG1hdGNoZXIgPSBuZXcgUmVnRXhwKFtcbiAgICAgIChzZXR0aW5ncy5lc2NhcGUgfHwgbm9NYXRjaCkuc291cmNlLFxuICAgICAgKHNldHRpbmdzLmludGVycG9sYXRlIHx8IG5vTWF0Y2gpLnNvdXJjZSxcbiAgICAgIChzZXR0aW5ncy5ldmFsdWF0ZSB8fCBub01hdGNoKS5zb3VyY2VcbiAgICBdLmpvaW4oJ3wnKSArICd8JCcsICdnJyk7XG5cbiAgICAvLyBDb21waWxlIHRoZSB0ZW1wbGF0ZSBzb3VyY2UsIGVzY2FwaW5nIHN0cmluZyBsaXRlcmFscyBhcHByb3ByaWF0ZWx5LlxuICAgIHZhciBpbmRleCA9IDA7XG4gICAgdmFyIHNvdXJjZSA9IFwiX19wKz0nXCI7XG4gICAgdGV4dC5yZXBsYWNlKG1hdGNoZXIsIGZ1bmN0aW9uKG1hdGNoLCBlc2NhcGUsIGludGVycG9sYXRlLCBldmFsdWF0ZSwgb2Zmc2V0KSB7XG4gICAgICBzb3VyY2UgKz0gdGV4dC5zbGljZShpbmRleCwgb2Zmc2V0KVxuICAgICAgICAucmVwbGFjZShlc2NhcGVyLCBmdW5jdGlvbihtYXRjaCkgeyByZXR1cm4gJ1xcXFwnICsgZXNjYXBlc1ttYXRjaF07IH0pO1xuXG4gICAgICBpZiAoZXNjYXBlKSB7XG4gICAgICAgIHNvdXJjZSArPSBcIicrXFxuKChfX3Q9KFwiICsgZXNjYXBlICsgXCIpKT09bnVsbD8nJzpfLmVzY2FwZShfX3QpKStcXG4nXCI7XG4gICAgICB9XG4gICAgICBpZiAoaW50ZXJwb2xhdGUpIHtcbiAgICAgICAgc291cmNlICs9IFwiJytcXG4oKF9fdD0oXCIgKyBpbnRlcnBvbGF0ZSArIFwiKSk9PW51bGw/Jyc6X190KStcXG4nXCI7XG4gICAgICB9XG4gICAgICBpZiAoZXZhbHVhdGUpIHtcbiAgICAgICAgc291cmNlICs9IFwiJztcXG5cIiArIGV2YWx1YXRlICsgXCJcXG5fX3ArPSdcIjtcbiAgICAgIH1cbiAgICAgIGluZGV4ID0gb2Zmc2V0ICsgbWF0Y2gubGVuZ3RoO1xuICAgICAgcmV0dXJuIG1hdGNoO1xuICAgIH0pO1xuICAgIHNvdXJjZSArPSBcIic7XFxuXCI7XG5cbiAgICAvLyBJZiBhIHZhcmlhYmxlIGlzIG5vdCBzcGVjaWZpZWQsIHBsYWNlIGRhdGEgdmFsdWVzIGluIGxvY2FsIHNjb3BlLlxuICAgIGlmICghc2V0dGluZ3MudmFyaWFibGUpIHNvdXJjZSA9ICd3aXRoKG9ianx8e30pe1xcbicgKyBzb3VyY2UgKyAnfVxcbic7XG5cbiAgICBzb3VyY2UgPSBcInZhciBfX3QsX19wPScnLF9faj1BcnJheS5wcm90b3R5cGUuam9pbixcIiArXG4gICAgICBcInByaW50PWZ1bmN0aW9uKCl7X19wKz1fX2ouY2FsbChhcmd1bWVudHMsJycpO307XFxuXCIgK1xuICAgICAgc291cmNlICsgXCJyZXR1cm4gX19wO1xcblwiO1xuXG4gICAgdHJ5IHtcbiAgICAgIHJlbmRlciA9IG5ldyBGdW5jdGlvbihzZXR0aW5ncy52YXJpYWJsZSB8fCAnb2JqJywgJ18nLCBzb3VyY2UpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGUuc291cmNlID0gc291cmNlO1xuICAgICAgdGhyb3cgZTtcbiAgICB9XG5cbiAgICBpZiAoZGF0YSkgcmV0dXJuIHJlbmRlcihkYXRhLCBfKTtcbiAgICB2YXIgdGVtcGxhdGUgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgICByZXR1cm4gcmVuZGVyLmNhbGwodGhpcywgZGF0YSwgXyk7XG4gICAgfTtcblxuICAgIC8vIFByb3ZpZGUgdGhlIGNvbXBpbGVkIGZ1bmN0aW9uIHNvdXJjZSBhcyBhIGNvbnZlbmllbmNlIGZvciBwcmVjb21waWxhdGlvbi5cbiAgICB0ZW1wbGF0ZS5zb3VyY2UgPSAnZnVuY3Rpb24oJyArIChzZXR0aW5ncy52YXJpYWJsZSB8fCAnb2JqJykgKyAnKXtcXG4nICsgc291cmNlICsgJ30nO1xuXG4gICAgcmV0dXJuIHRlbXBsYXRlO1xuICB9O1xuXG4gIC8vIEFkZCBhIFwiY2hhaW5cIiBmdW5jdGlvbiwgd2hpY2ggd2lsbCBkZWxlZ2F0ZSB0byB0aGUgd3JhcHBlci5cbiAgXy5jaGFpbiA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBfKG9iaikuY2hhaW4oKTtcbiAgfTtcblxuICAvLyBPT1BcbiAgLy8gLS0tLS0tLS0tLS0tLS0tXG4gIC8vIElmIFVuZGVyc2NvcmUgaXMgY2FsbGVkIGFzIGEgZnVuY3Rpb24sIGl0IHJldHVybnMgYSB3cmFwcGVkIG9iamVjdCB0aGF0XG4gIC8vIGNhbiBiZSB1c2VkIE9PLXN0eWxlLiBUaGlzIHdyYXBwZXIgaG9sZHMgYWx0ZXJlZCB2ZXJzaW9ucyBvZiBhbGwgdGhlXG4gIC8vIHVuZGVyc2NvcmUgZnVuY3Rpb25zLiBXcmFwcGVkIG9iamVjdHMgbWF5IGJlIGNoYWluZWQuXG5cbiAgLy8gSGVscGVyIGZ1bmN0aW9uIHRvIGNvbnRpbnVlIGNoYWluaW5nIGludGVybWVkaWF0ZSByZXN1bHRzLlxuICB2YXIgcmVzdWx0ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NoYWluID8gXyhvYmopLmNoYWluKCkgOiBvYmo7XG4gIH07XG5cbiAgLy8gQWRkIGFsbCBvZiB0aGUgVW5kZXJzY29yZSBmdW5jdGlvbnMgdG8gdGhlIHdyYXBwZXIgb2JqZWN0LlxuICBfLm1peGluKF8pO1xuXG4gIC8vIEFkZCBhbGwgbXV0YXRvciBBcnJheSBmdW5jdGlvbnMgdG8gdGhlIHdyYXBwZXIuXG4gIGVhY2goWydwb3AnLCAncHVzaCcsICdyZXZlcnNlJywgJ3NoaWZ0JywgJ3NvcnQnLCAnc3BsaWNlJywgJ3Vuc2hpZnQnXSwgZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciBtZXRob2QgPSBBcnJheVByb3RvW25hbWVdO1xuICAgIF8ucHJvdG90eXBlW25hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgb2JqID0gdGhpcy5fd3JhcHBlZDtcbiAgICAgIG1ldGhvZC5hcHBseShvYmosIGFyZ3VtZW50cyk7XG4gICAgICBpZiAoKG5hbWUgPT0gJ3NoaWZ0JyB8fCBuYW1lID09ICdzcGxpY2UnKSAmJiBvYmoubGVuZ3RoID09PSAwKSBkZWxldGUgb2JqWzBdO1xuICAgICAgcmV0dXJuIHJlc3VsdC5jYWxsKHRoaXMsIG9iaik7XG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gQWRkIGFsbCBhY2Nlc3NvciBBcnJheSBmdW5jdGlvbnMgdG8gdGhlIHdyYXBwZXIuXG4gIGVhY2goWydjb25jYXQnLCAnam9pbicsICdzbGljZSddLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIG1ldGhvZCA9IEFycmF5UHJvdG9bbmFtZV07XG4gICAgXy5wcm90b3R5cGVbbmFtZV0gPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiByZXN1bHQuY2FsbCh0aGlzLCBtZXRob2QuYXBwbHkodGhpcy5fd3JhcHBlZCwgYXJndW1lbnRzKSk7XG4gICAgfTtcbiAgfSk7XG5cbiAgXy5leHRlbmQoXy5wcm90b3R5cGUsIHtcblxuICAgIC8vIFN0YXJ0IGNoYWluaW5nIGEgd3JhcHBlZCBVbmRlcnNjb3JlIG9iamVjdC5cbiAgICBjaGFpbjogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLl9jaGFpbiA9IHRydWU7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgLy8gRXh0cmFjdHMgdGhlIHJlc3VsdCBmcm9tIGEgd3JhcHBlZCBhbmQgY2hhaW5lZCBvYmplY3QuXG4gICAgdmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3dyYXBwZWQ7XG4gICAgfVxuXG4gIH0pO1xuXG4gIC8vIEFNRCByZWdpc3RyYXRpb24gaGFwcGVucyBhdCB0aGUgZW5kIGZvciBjb21wYXRpYmlsaXR5IHdpdGggQU1EIGxvYWRlcnNcbiAgLy8gdGhhdCBtYXkgbm90IGVuZm9yY2UgbmV4dC10dXJuIHNlbWFudGljcyBvbiBtb2R1bGVzLiBFdmVuIHRob3VnaCBnZW5lcmFsXG4gIC8vIHByYWN0aWNlIGZvciBBTUQgcmVnaXN0cmF0aW9uIGlzIHRvIGJlIGFub255bW91cywgdW5kZXJzY29yZSByZWdpc3RlcnNcbiAgLy8gYXMgYSBuYW1lZCBtb2R1bGUgYmVjYXVzZSwgbGlrZSBqUXVlcnksIGl0IGlzIGEgYmFzZSBsaWJyYXJ5IHRoYXQgaXNcbiAgLy8gcG9wdWxhciBlbm91Z2ggdG8gYmUgYnVuZGxlZCBpbiBhIHRoaXJkIHBhcnR5IGxpYiwgYnV0IG5vdCBiZSBwYXJ0IG9mXG4gIC8vIGFuIEFNRCBsb2FkIHJlcXVlc3QuIFRob3NlIGNhc2VzIGNvdWxkIGdlbmVyYXRlIGFuIGVycm9yIHdoZW4gYW5cbiAgLy8gYW5vbnltb3VzIGRlZmluZSgpIGlzIGNhbGxlZCBvdXRzaWRlIG9mIGEgbG9hZGVyIHJlcXVlc3QuXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICBkZWZpbmUoJ3VuZGVyc2NvcmUnLCBbXSwgZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gXztcbiAgICB9KTtcbiAgfVxufSkuY2FsbCh0aGlzKTtcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiJdfQ==
