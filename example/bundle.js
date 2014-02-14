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

var log = require('bows')('Example');
// things common to one-day and two-week views
// common event emitter
var EventEmitter = require('events').EventEmitter;
var emitter = new EventEmitter;
emitter.setMaxListeners(100);
emitter.on('navigated', function(navString) {
  $('#tidelineNavString').html(navString);
});

// common pool modules
var fill = require('../js/plot/fill');
var scales = require('../js/plot/scales');
var BasalUtil = require('../js/data/basalutil');

var el = '#tidelineContainer';

// dear old Watson
var watson = require('./watson')();
d3.select(el).call(watson);

// set up one-day view
var oneDay = new oneDayChart(el), twoWeek = twoWeekChart(el);


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
    oneDay.destroy();
    $(this).parent().addClass('active');
    $('#oneDayView').parent().removeClass('active');
    $('.one-day').css('visibility', 'hidden');
    $('.two-week').css('visibility', 'visible');
    // TODO: this shouldn't be necessary, but I've screwed something up with the global two-week.js variables
    // such that its necessary to create a new twoWeek object every time you want to rerender
    twoWeek = new twoWeekChart(el);
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
    oneDay = new oneDayChart(el);
    // takes user to one-day view of most recent data
    oneDay.initialize(data).locate();
    // attach click handlers to set up programmatic pan
    $('#tidelineNavForward').on('click', oneDay.panForward);
    $('#tidelineNavBack').on('click', oneDay.panBack);
  });

  $('#oneDayMostRecent').on('click', function() {
    log('Navigated to most recent one-day view.');
    twoWeek.destroy();
    $(this).parent().addClass('active');
    $('#twoWeekView').parent().removeClass('active');
    $('#oneDayMostRecent').parent().addClass('active');
    $('.one-day').css('visibility', 'visible');
    $('.two-week').css('visibility', 'hidden');
    // TODO: this shouldn't be necessary, but I've screwed something up with the global one-day.js variables
    // such that its necessary to create a new oneDay object every time you want to rerender
    oneDay = new oneDayChart(el);
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
    oneDay = new oneDayChart(el);
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
function oneDayChart(el) {

  var chart = require('../js/one-day')(emitter);

  var poolMessages, poolBG, poolBolus, poolBasal, poolStats;

  var create = function(el) {

    if (!el) {
      throw new Error('Sorry, you must provide a DOM element! :(');
    }

    // basic chart set up
    chart.defaults().width($(el).width()).height($(el).height());

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
    poolBG.addPlotType('cbg', require('../js/plot/cbg')(poolBG, {yScale: scaleBG}), true);

    // add SMBG data to BG pool
    poolBG.addPlotType('smbg', require('../js/plot/smbg')(poolBG, {yScale: scaleBG}), true);

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
    poolBolus.addPlotType('carbs', require('../js/plot/carbs')(poolBolus, {yScale: scaleCarbs}), true);

    // add bolus data to bolus pool
    poolBolus.addPlotType('bolus', require('../js/plot/bolus')(poolBolus, {yScale: scaleBolus}), true);

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
    poolBasal.addPlotType('basal-rate-segment', require('../js/plot/basal')(poolBasal, {yScale: scaleBasal, data: _.where(data, {'type': 'basal-rate-segment'}) }), true);

    // messages pool
    // add background fill rectangles to messages pool
    poolMessages.addPlotType('fill', fill(poolMessages, {endpoints: chart.endpoints}), false);

    // add message images to messages pool
    poolMessages.addPlotType('message', require('../js/plot/message')(poolMessages, {size: 30}), true);

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

  return create(el);
}

// // two-week visualization
// // =====================
// // create a 'twoWeek' object that is a wrapper around tideline components
// // for blip's (two-week) data visualization
function twoWeekChart(el) {

  var chart = require('../js/two-week')(emitter);

  var pools = [];

  var create = function(el) {
    if (!el) {
      throw new Error('Sorry, you must provide a DOM element! :(');
    }

    // basic chart set up
    chart.defaults().width($(el).width()).height($(el).height());

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
      pool.addPlotType('smbg', require('../js/plot/smbg-time')(pool, {emitter: emitter}), true);
      pool(chart.daysGroup, chart.dataPerDay[i]);
    });

    return chart;
  };

  return create(el);
}
},{"../js/data/basalutil":3,"../js/one-day":4,"../js/plot/basal":5,"../js/plot/bolus":6,"../js/plot/carbs":7,"../js/plot/cbg":8,"../js/plot/fill":9,"../js/plot/message":10,"../js/plot/scales":11,"../js/plot/smbg":13,"../js/plot/smbg-time":12,"../js/two-week":16,"./watson":2,"bows":17,"events":20}],2:[function(require,module,exports){
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

module.exports = function() {

  var log = require('bows')('Watson');

  function watson() {
    log("Start her up, Watson, for it's time that we were on our way.");
  }

  watson.normalize = function(a) {
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
  };

  watson.print = function(arg, d) {
    console.log(arg, d.toUTCString().replace(' GMT', ''));
    return;
  };

  watson.strip = function(d) {
    return d.toUTCString().replace(' GMT', '');
  };

  return watson;
};
},{"bows":17}],3:[function(require,module,exports){
var _ = require('underscore');

try {
  var log = require('bows')('BasalUtil');
}
catch(ReferenceError) {
  console.log('Not using bows.');
}

function BasalUtil(data) {
  this.actual = [];
  this.undelivered = [];

  var sliceCurrent = function(current, next, pushLocation) {
    var earliest = _.min([current.end, next], function(d) {
      return new Date(d).valueOf();
    });
    if (earliest === current.end) {
      pushLocation.push(current);
    }
    else {
      current.end = next;
      pushLocation.push(current);
    }
  };

  var temp = _.where(data, {'deliveryType': 'temp'});
  var scheduled = _.where(data, {'deliveryType': 'scheduled'});

  // ensure both collections are properly sorted
  temp = _.sortBy(temp, function(t) {
    return new Date(t.start).valueOf();
  });
  scheduled = _.sortBy(scheduled, function(s) {
    return new Date(s.start).valueOf();
  });

  // create an ordered list of the unique start datetimes in all basal segments
  var datetimes = [];

  temp.forEach(function(i) {
    datetimes.push(i.start);
    datetimes.push(i.end);
  });
  scheduled.forEach(function(i) {
    datetimes.push(i.start);
    datetimes.push(i.end);
  });

  datetimes = _.sortBy(_.uniq(datetimes), function(i) {
    return new Date(i).valueOf();
  });

  var actualSegments = [];

  datetimes.forEach(function(dt, i) {
    if (i < datetimes.length - 1) {
      actualSegments.push({
        'start': dt,
        'end': datetimes[i + 1]
      });
    }
  });

  actualSegments.forEach(function(actSegment) {
    var matching;
    try {
      matching = _.filter(data, function(segment){
        var start = new Date(segment.start).valueOf();
        var end = new Date(segment.end).valueOf();
        var actStart = new Date(actSegment.start).valueOf();
        var actEnd = new Date(actSegment.end).valueOf();
        return ((start === actStart) && (end === actEnd) ||
          (start === actStart) ||
          (end === actEnd) ||
          (start < actStart) && (end > actEnd));
      });
      if (matching.length > 2) {
        throw "OverlappingTempBasals";
      }
    }
    catch(OverlappingTempBasals) {
      if(!log) {
        console.log('Possible overlapping temp basals!');
      }
      else {
        log('Possible overlapping temp basals!');
      }
    }

    var temp = _.find(matching, function(m) {
      return m.deliveryType === 'temp';
    });
    if (temp) {
      var tempMatch = _.clone(temp);
      tempMatch.start = actSegment.start;
      tempMatch.end = actSegment.end;
      this.actual.push(tempMatch);
    }
    else {
      var match = _.clone(matching[0]);
      match.start = actSegment.start;
      match.end = actSegment.end;
      this.actual.push(match);
    }
  }, this);

  var temps = _.where(this.actual, {'deliveryType': 'temp'});

  temps.forEach(function(temp, i, temps) {
    var matching = _.filter(scheduled, function(d) {
      var start = new Date(d.start).valueOf();
      var end = new Date(d.end).valueOf();
      var tempStart = new Date(temp.start).valueOf();
      var tempEnd = new Date(temp.end).valueOf();
      return ((start === tempStart) && (end === tempEnd) ||
        (start === tempStart) ||
        (end === tempEnd) ||
        (start < tempStart) && (end > tempEnd));
    });
    matching.forEach(function(m) {
      var match = _.clone(m);
      match.start = temp.start;
      match.end = temp.end;
      this.undelivered.push(match);
    }, this);
  }, this);

  // re-sort the results!
  this.actual = _.sortBy(this.actual, function(segment) {
    return new Date(segment.start).valueOf();
  });

  this.undelivered = _.sortBy(this.undelivered, function(segment) {
    return new Date(segment.start).valueOf();
  });

  // add vizType = 'actual' or 'undelivered'
  this.actual.forEach(function(segment) {
    segment.vizType = 'actual';
  });
  this.undelivered.forEach(function(segment) {
    segment.vizType = 'undelivered';
  });

  this.getCurrentSegments = function(s, e) {

  };

  this.getTotalDose = function(s, e) {

  };
}

module.exports = BasalUtil;
},{"bows":17,"underscore":19}],4:[function(require,module,exports){
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

var log = require('bows')('One Day');

module.exports = function(emitter) {
  var pool = require('./pool');

  var tooltip = require('./plot/tooltip');

  var MS_IN_24 = 86400000;

  var bucket,
    id,
    width, minWidth,
    height, minHeight,
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
        'xlink:href': '../img/ux/scroll_thumb.svg',
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
},{"./plot/tooltip":14,"./pool":15,"bows":17}],5:[function(require,module,exports){
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

var log = require('bows')('Basal');

module.exports = function(pool, opts) {

  opts = opts || {};

  var defaults = {
    xScale: pool.xScale().copy()
  };

  _.defaults(opts, defaults);

  var drawnPaths = [];

  function basal(selection) {
    selection.each(function(currentData) {

      // to prevent blank rectangle at beginning of domain
      var index = opts.data.indexOf(currentData[0]);
      currentData.unshift(opts.data[index - 1]);

      var line = d3.svg.line()
        .x(function(d) { return d.x; })
        .y(function(d) { return d.y; })
        .interpolate('step-after');

      var actual = _.where(currentData, {'vizType': 'actual'});
      var undelivered = _.where(currentData, {'vizType': 'undelivered'});

      var rects = d3.select(this)
        .selectAll('rect')
        .data(actual, function(d) {
          // leveraging the timestamp of each datapoint as the ID for D3's binding
          return d.normalTime;
        });
      rects.enter()
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
          'class': 'd3-basal d3-rect-basal'
        });
      rects.exit().remove();

      var basalGroup = d3.select(this);

      var actualPoints = [];

      actual.forEach(function(d) {
        actualPoints.push({
          'x': opts.xScale(new Date(d.normalTime)),
          'y': opts.yScale(d.value),
        },
        {
          'x': opts.xScale(new Date(d.normalEnd)),
          'y': opts.yScale(d.value),
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
      }
    });
  }

  basal.width = function(d) {
    return opts.xScale(new Date(d.normalEnd)) - opts.xScale(new Date(d.normalTime));
  };

  return basal;
};
},{"bows":17}],6:[function(require,module,exports){
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

module.exports = function(pool, opts) {

  var opts = opts || {};

  var defaults = {
    xScale: pool.xScale().copy(),
    width: 12,
    bolusStroke: 2,
    triangleSize: 6
  };

  _.defaults(opts, defaults);

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
    });
  }
  
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

module.exports = function(pool, opts) {

  var opts = opts || {};

  var defaults = {
    xScale: pool.xScale().copy(),
    width: 12
  };

  _.defaults(opts, defaults);

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
    });
  }

  return carbs; 
};
},{}],8:[function(require,module,exports){
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

module.exports = function(pool, opts) {

  var opts = opts || {};

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
},{}],9:[function(require,module,exports){
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
    for(var i = 0; i < hourBreaks.length; i++) {
      var br = hourBreaks[i];
      var nextBr = hourBreaks[i + 1];
      if ((date.getHours() >= br) && (date.getHours() < nextBr)) {
        nearest = new Date(date.getFullYear(), date.getMonth(), date.getDate(), br, 0, 0);
      }
    }
  };
  
  return fill;  
};
},{}],10:[function(require,module,exports){
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

module.exports = function(pool, opts) {

  var opts = opts || {};

  var defaults = {
    xScale: pool.xScale().copy()
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
          'xlink:href': '../img/message/post_it.svg',
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
},{}],11:[function(require,module,exports){
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
},{}],12:[function(require,module,exports){
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
 
module.exports = function(pool, opts) {

  MS_IN_HOUR = 3600000;

  MS_IN_MIN = 60 * 1000;

  var opts = opts || {};

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
    xScale: pool.xScale().copy()
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
              return '../img/smbg/very_low.svg';
            }
            else if ((d.value > opts.classes['very-low']['boundary']) && (d.value <= opts.classes['low']['boundary'])) {
              return '../img/smbg/low.svg';
            }
            else if ((d.value > opts.classes['low']['boundary']) && (d.value <= opts.classes['target']['boundary'])) {
              return '../img/smbg/target.svg';
            }
            else if ((d.value > opts.classes['target']['boundary']) && (d.value <= opts.classes['high']['boundary'])) {
              return '../img/smbg/high.svg';
            }
            else if (d.value > opts.classes['high']['boundary']) {
              return '../img/smbg/very_high.svg';
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
},{}],13:[function(require,module,exports){
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

module.exports = function(pool, opts) {

  var opts = opts || {};

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
              return '../img/smbg/very_low.svg';
            }
            else if ((d.value > opts.classes['very-low']['boundary']) && (d.value <= opts.classes['low']['boundary'])) {
              return '../img/smbg/low.svg';
            }
            else if ((d.value > opts.classes['low']['boundary']) && (d.value <= opts.classes['target']['boundary'])) {
              return '../img/smbg/target.svg';
            }
            else if ((d.value > opts.classes['target']['boundary']) && (d.value <= opts.classes['high']['boundary'])) {
              return '../img/smbg/high.svg';
            }
            else if (d.value > opts.classes['high']['boundary']) {
              return '../img/smbg/very_high.svg';
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
},{}],14:[function(require,module,exports){
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
    textX, textY) {
    var tooltipGroup = selection.append('g')
      .attr('class', 'd3-tooltip')
      .attr('id', 'tooltip_' + d.id);

    var currentTranslation = container.currentTranslation();

    var locationInWindow = currentTranslation + tooltipXPos;

    // for now (unless I can persude Sara and Alix otherwise), high cbg values are a special case
    if (image.indexOf('cbg_tooltip_high') != -1) {
      if (locationInWindow < (((container.width() - container.axisGutter()) / 24) * 3)) {
        tooltipGroup.append('image')
          .attr({
            'xlink:href': '../img/' + path + '/' + image,
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
              var str =  '../img/' + path + '/' + image;
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
    else if (locationInWindow > container.width() - (((container.width() - container.axisGutter()) / 24) * 3)) {
      tooltipGroup.append('image')
        .attr({
          'xlink:href': function() {
            var str =  '../img/' + path + '/' + image;
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

      // adjust the values needed for the timestamp
      // TODO: really this should be refactored
      imageX = imageX - tooltipWidth;
      textX = textX - tooltipWidth;
    }
    else {
      tooltipGroup.append('image')
        .attr({
          'xlink:href': '../img/' + path + '/' + image,
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

    if (makeTimestamp) {
      tooltip.timestamp(d, tooltipGroup, imageX, imageY, textX, textY, tooltipWidth, tooltipHeight);
    }
  }

  tooltip.timestamp = function(d, tooltipGroup, imageX, imageY, textX, textY, tooltipWidth, tooltipHeight) {
    var timestampY = imageY() - timestampHeight;
    var timestampTextY = textY() - timestampHeight;

    var formatTime = d3.time.format.utc("%-I:%M %p")
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
        'baseline-shift': (tooltipHeight - timestampHeight) / 2,
        'class': 'd3-tooltip-text'
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
},{}],15:[function(require,module,exports){
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

var log = require('bows')('Pool');
 
module.exports = function(container) {

  var data,
    id, label,
    index, weight, yPosition,
    height, minHeight, maxHeight,
    group,
    mainSVG = d3.select(container.id()),
    xScale = container.xScale().copy(),
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
},{"bows":17}],16:[function(require,module,exports){
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

var log = require('bows')('Two Week');

module.exports = function(emitter) {
  var pool = require('./pool');

  var MS_IN_24 = 86400000;

  var bucket,
    id,
    width, minWidth,
    height, minHeight,
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
        'xlink:href': '../img/ux/scroll_thumb.svg',
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
},{"./pool":15,"bows":17}],17:[function(require,module,exports){
(function() {
  function checkColorSupport() {
    var chrome = !!window.chrome,
        firefox = /firefox/i.test(navigator.userAgent),
        firebug = firefox && !!window.console.exception;

    return chrome || firebug;
  }

  var inNode = typeof window === 'undefined',
      ls = !inNode && window.localStorage,
      debug = ls.debug,
      logger = require('andlog'),
      hue = 0,
      padLength = 15,
      noop = function() {},
      colorsSupported = ls.debugColors || checkColorSupport(),
      yieldColor,
      bows,
      debugRegex;

  yieldColor = function() {
    var goldenRatio = 0.618033988749895;
    hue += goldenRatio;
    hue = hue % 1;
    return hue * 360;
  };

  debugRegex = debug && debug[0]==='/' && new RegExp(debug.substring(1,debug.length-1));

  bows = function(str) {
    var msg, colorString, logfn;
    msg = (str.slice(0, padLength));
    msg += Array(padLength + 3 - msg.length).join(' ') + '|';

    if (debugRegex && !str.match(debugRegex)) return noop;

    if (colorsSupported) {
      var color = yieldColor();
      msg = "%c" + msg;
      colorString = "color: hsl(" + (color) + ",99%,40%); font-weight: bold";

      logfn = logger.log.bind(logger, msg, colorString);
      ['log', 'debug', 'warn', 'error', 'info'].forEach(function (f) {
        logfn[f] = logger[f].bind(logger, msg, colorString);
      });
    } else {
      logfn = logger.log.bind(logger, msg);
      ['log', 'debug', 'warn', 'error', 'info'].forEach(function (f) {
        logfn[f] = logger[f].bind(logger, msg);
      });
    }

    return logfn;
  };

  bows.config = function(config) {
    if (config.padLength) {
      this.padLength = config.padLength;
    }
  };

  if (typeof module !== 'undefined') {
    module.exports = bows;
  } else {
    window.bows = bows;
  }
}).call();

},{"andlog":18}],18:[function(require,module,exports){
// follow @HenrikJoreteg and @andyet if you like this ;)
(function () {
    var inNode = typeof window === 'undefined',
        ls = !inNode && window.localStorage,
        out = {};

    if (inNode) {
        module.exports = console;
        return;
    }

    if (ls && ls.debug && window.console) {
        out = window.console;
    } else {
        var methods = "assert,count,debug,dir,dirxml,error,exception,group,groupCollapsed,groupEnd,info,log,markTimeline,profile,profileEnd,time,timeEnd,trace,warn".split(","),
            l = methods.length,
            fn = function () {};

        while (l--) {
            out[methods[l]] = fn;
        }
    }
    if (typeof exports !== 'undefined') {
        module.exports = out;
    } else {
        window.console = out;
    }
})();

},{}],19:[function(require,module,exports){
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

},{}],20:[function(require,module,exports){
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