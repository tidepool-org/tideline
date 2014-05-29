!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var n;"undefined"!=typeof window?n=window:"undefined"!=typeof global?n=global:"undefined"!=typeof self&&(n=self),(n.tideline||(n.tideline={})).blip=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

var _ = window._;
var bows = window.bows;
var d3 = window.d3;

var EventEmitter = require('events').EventEmitter;

var tideline = window.tideline;
var fill = tideline.plot.util.fill;
var scales = tideline.plot.util.scales;

// Create a 'One Day' chart object that is a wrapper around Tideline components
function chartDailyFactory(el, options) {
  var log = bows('Daily Factory');
  options = options || {};
  var defaults = {
    'bgUnits': 'mg/dL'
  };
  _.defaults(options, defaults);

  var emitter = new EventEmitter();
  var chart = tideline.oneDay(emitter);
  chart.emitter = emitter;
  chart.options = options;

  var poolMessages, poolBG, poolBolus, poolBasal, poolStats;

  var SMBG_SIZE = 16;

  var create = function(el, options) {

    if (!el) {
      throw new Error('Sorry, you must provide a DOM element! :(');
    }

    var width = el.offsetWidth;
    var height = el.offsetHeight;
    if (!(width && height)) {
      throw new Error('Chart element must have a set width and height ' +
                      '(got: ' + width + ', ' + height + ')');
    }

    // basic chart set up
    chart.width(width).height(height);

    if (options.imagesBaseUrl) {
      chart.imagesBaseUrl(options.imagesBaseUrl);
    }

    d3.select(el).call(chart);

    return chart;
  };

  chart.setupPools = function() {
    // messages pool
    poolMessages = chart.newPool()
      .id('poolMessages', chart.poolGroup())
      .label('')
      .index(chart.pools().indexOf(poolMessages))
      .weight(0.5);

    // blood glucose data pool
    poolBG = chart.newPool()
      .id('poolBG', chart.poolGroup())
      .label([{
        'main': 'Blood Glucose',
        'light': ' (' + chart.options.bgUnits + ')'
      }])
      .legend(['bg'])
      .index(chart.pools().indexOf(poolBG))
      .weight(1.5);

    // carbs and boluses data pool
    poolBolus = chart.newPool()
      .id('poolBolus', chart.poolGroup())
      .label([{
        'main': 'Bolus',
        'light': ' (U)'
      },
      {
        'main': ' & Carbohydrates',
        'light': ' (g)'
      }])
      .legend(['bolus', 'carbs'])
      .index(chart.pools().indexOf(poolBolus))
      .weight(1.5);

    // basal data pool
    poolBasal = chart.newPool()
      .id('poolBasal', chart.poolGroup())
      .label([{
        'main': 'Basal Rates',
        'light': ' (U/hr)'
      }])
      .legend(['basal'])
      .index(chart.pools().indexOf(poolBasal))
      .weight(1.0);

    // stats data pool
    poolStats = chart.newPool()
      .id('poolStats', chart.poolGroup())
      .index(chart.pools().indexOf(poolStats))
      .weight(1.0);

    chart.arrangePools();

    chart.setAnnotation().setTooltip();

    // add annotations
    chart.annotations().addGroup(d3.select('#' + chart.id()).select('#' + poolBolus.id()), 'bolus');
    chart.annotations().addGroup(d3.select('#' + chart.id()).select('#' + poolBasal.id()), 'basal-rate-segment');
    chart.annotations().addGroup(d3.select('#' + chart.id()).select('#' + poolStats.id()), 'stats');

    // add tooltips
    chart.tooltips().addGroup(d3.select('#' + chart.id()).select('#' + poolBG.id()), 'cbg');
    chart.tooltips().addGroup(d3.select('#' + chart.id()).select('#' + poolBG.id()), 'smbg');
    chart.tooltips().addGroup(d3.select('#' + chart.id()).select('#' + poolBolus.id()), 'carbs');
    chart.tooltips().addGroup(d3.select('#' + chart.id()).select('#' + poolBolus.id()), 'bolus');
    chart.tooltips().addGroup(d3.select('#' + chart.id()).select('#' + poolBasal.id()), 'basal');

    return chart;
  };

  chart.load = function(tidelineData, datetime) {
    var data = tidelineData.data;
    chart.tidelineData = tidelineData;

    var basalUtil = tidelineData.basalUtil;
    var bolusUtil = tidelineData.bolusUtil;
    var cbgUtil = tidelineData.cbgUtil;
    var smbgUtil = tidelineData.smbgUtil;

    chart.stopListening();
    // initialize chart with data
    chart.data(tidelineData).setAxes().setNav().setScrollNav();

    // BG pool
    var allBG = _.filter(data, function(d) {
      if ((d.type === 'cbg') || (d.type === 'smbg')) {
        return d;
      }
    });
    var scaleBG = scales.bgLog(allBG, poolBG, SMBG_SIZE/2);
    // set up y-axis
    poolBG.yAxis(d3.svg.axis()
      .scale(scaleBG)
      .orient('left')
      .outerTickSize(0)
      .tickValues(scales.bgTicks(allBG))
      .tickFormat(d3.format('g')));
    // add background fill rectangles to BG pool
    poolBG.addPlotType('fill', fill(poolBG, {
      endpoints: chart.endpoints,
      guidelines: [
        {
          'class': 'd3-line-bg-threshold',
          'height': 80
        },
        {
          'class': 'd3-line-bg-threshold',
          'height': 180
        }
      ],
      yScale: scaleBG
    }), false, true);

    // add CBG data to BG pool
    poolBG.addPlotType('cbg', tideline.plot.cbg(poolBG, {yScale: scaleBG}), true, true);

    // add SMBG data to BG pool
    poolBG.addPlotType('smbg', tideline.plot.smbg(poolBG, {yScale: scaleBG}), true, true);

    // TODO: when we bring responsiveness in
    // decide number of ticks for these scales based on container height?
    // bolus & carbs pool
    var scaleBolus = scales.bolus(tidelineData.grouped.bolus, poolBolus);
    var scaleCarbs = scales.carbs(tidelineData.grouped.carbs, poolBolus);
    // set up y-axis for bolus
    poolBolus.yAxis(d3.svg.axis()
      .scale(scaleBolus)
      .orient('left')
      .outerTickSize(0)
      .ticks(2));
    // set up y-axis for carbs
    poolBolus.yAxis(d3.svg.axis()
      .scale(scaleCarbs)
      .orient('left')
      .outerTickSize(0)
      .ticks(2));
    // add background fill rectangles to bolus pool
    var scaleDivider = d3.scale.linear()
      .domain([0, poolBolus.height()])
      .range([0, poolBolus.height()]);
    poolBolus.addPlotType('fill', fill(poolBolus, {
      endpoints: chart.endpoints,
      guidelines: [
        {
          'class': 'd3-line-divider',
          'height': poolBolus.height()/2
        }
      ],
      yScale: scaleDivider
    }), false, true);

    // add carbs data to bolus pool
    poolBolus.addPlotType('carbs', tideline.plot.carbs(poolBolus, {
      yScale: scaleCarbs,
      emitter: emitter,
      data: tidelineData.grouped.carbs
    }), true, true);

    // add bolus data to bolus pool
    poolBolus.addPlotType('bolus', tideline.plot.bolus(poolBolus, {
      yScale: scaleBolus,
      emitter: emitter,
      data: tidelineData.grouped.bolus
    }), true, true);

    // basal pool
    var scaleBasal = scales.basal(tidelineData.grouped['basal-rate-segment'], poolBasal);
    // set up y-axis
    poolBasal.yAxis(d3.svg.axis()
      .scale(scaleBasal)
      .orient('left')
      .outerTickSize(0)
      .ticks(4));
    // add background fill rectangles to basal pool
    poolBasal.addPlotType('fill', fill(poolBasal, {endpoints: chart.endpoints}), false, true);

    // add basal data to basal pool
    poolBasal.addPlotType('basal-rate-segment', tideline.plot.basal(poolBasal, {
      yScale: scaleBasal,
      data: tidelineData.grouped['basal-rate-segment']
    }), true, true);

    // messages pool
    // add background fill rectangles to messages pool
    poolMessages.addPlotType('fill', fill(poolMessages, {endpoints: chart.endpoints}), false, true);

    // add message images to messages pool
    poolMessages.addPlotType('message', tideline.plot.message(poolMessages, {
      size: 30,
      emitter: emitter
    }), true, true);

    // stats pool
    poolStats.addPlotType('stats', tideline.plot.stats.widget(poolStats, {
      cbg: cbgUtil,
      smbg: smbgUtil,
      bolus: bolusUtil,
      basal: basalUtil,
      xPosition: chart.axisGutter(),
      yPosition: 0,
      emitter: emitter,
      averageLabel: 'These 24 hours',
      puddleWeights: {
        ratio: 1.0,
        range: 1.2,
        average: 0.9
      }
    }), false, false);

    return chart;
  };

  // locate the chart around a certain datetime
  // if called without an argument, locates the chart at the most recent 24 hours of data
  chart.locate = function(datetime) {

    var start, end, atMostRecent = false;

    var mostRecent = function() {
      start = chart.initialEndpoints[0];
      end = chart.initialEndpoints[1];
    };

    if (!arguments.length) {
      atMostRecent = true;
      mostRecent();
    }
    else {
      // translate the desired center-of-view datetime into an edgepoint for tideline
      start = new Date(datetime);
      chart.currentCenter(start);
      var plusHalf = new Date(start);
      plusHalf.setUTCHours(plusHalf.getUTCHours() + 12);
      var minusHalf = new Date(start);
      minusHalf.setUTCHours(minusHalf.getUTCHours() - 12);
      if ((start.valueOf() < chart.endpoints[0]) || (start.valueOf() > chart.endpoints[1])) {
        log('Please don\'t ask tideline to locate at a date that\'s outside of your data!');
        log('Rendering most recent data instead.');
        mostRecent();
      }
      else if (plusHalf.valueOf() > chart.endpoints[1]) {
        mostRecent();
      }
      else if (minusHalf.valueOf() < chart.endpoints[0]) {
        start = chart.endpoints[0];
        var firstEnd = new Date(start);
        firstEnd.setUTCDate(firstEnd.getUTCDate() + 1);
        end = firstEnd;
      }
      else {
        end = new Date(start);
        start.setUTCHours(start.getUTCHours() - 12);
        end.setUTCHours(end.getUTCHours() + 12);
      }
    }

    chart.renderedData([start, end]);

    // render pools
    _.each(chart.pools(), function(pool) {
      pool.render(chart.poolGroup(), chart.renderedData());
    });

    chart.setAtDate(start, atMostRecent);

    chart.navString([start, end]);

    return chart;
  };

  chart.getCurrentDay = function() {
    return chart.getCurrentDomain().center;
  };

  chart.createMessage = function(message) {
    log('New message created:', message);
    chart.tidelineData = chart.tidelineData.addDatum(message);
    chart.data(chart.tidelineData);
    chart.emitter.emit('messageCreated', message);
  };

  chart.closeMessage = function() {
    d3.selectAll('.d3-rect-message').classed('hidden', true);
  };

  chart.type = 'daily';

  return create(el, options);
}

module.exports = chartDailyFactory;

},{"events":5}],2:[function(require,module,exports){
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

var _ = window._;
var bows = window.bows;
var d3 = window.d3;

var EventEmitter = require('events').EventEmitter;

var tideline = window.tideline;
var fill = tideline.plot.util.fill;

// Create a 'Two Weeks' chart object that is a wrapper around Tideline components
function chartWeeklyFactory(el, options) {
  var log = bows('Weekly Factory');
  options = options || {};

  var emitter = new EventEmitter();
  var chart = tideline.twoWeek(emitter);
  chart.emitter = emitter;

  var pools = [];

  var smbgTime;

  var create = function(el, options) {
    if (!el) {
      throw new Error('Sorry, you must provide a DOM element! :(');
    }

    var width = el.offsetWidth;
    var height = el.offsetHeight;
    if (!(width && height)) {
      throw new Error('Chart element must have a set width and height ' +
                      '(got: ' + width + ', ' + height + ')');
    }

    // basic chart set up
    chart.width(width).height(height);

    if (options.imagesBaseUrl) {
      chart.imagesBaseUrl(options.imagesBaseUrl);
      chart.dataGutter(8);
    }

    d3.select(el).call(chart);

    return chart;
  };

  chart.load = function(tidelineData, datetime) {
    var basalUtil = tidelineData.basalUtil;
    var bolusUtil = tidelineData.bolusUtil;
    var cbgUtil = tidelineData.cbgUtil;
    var smbgUtil = tidelineData.smbgUtil;

    var smbgData = tidelineData.grouped.smbg || [];

    if (!datetime) {
      chart.data(smbgData);
    }
    else {
      if (smbgData.length &&
          datetime.valueOf() > Date.parse(smbgData[smbgData.length - 1].normalTime)) {
        datetime = smbgData[smbgData.length - 1].normalTime;
      }
      chart.data(smbgData, datetime);
    }

    chart.setup();

    var days = chart.days;

    // make pools for each day
    days.forEach(function(day, i) {
      var newPool = chart.newPool()
        .id('poolBG_' + day, chart.daysGroup())
        .index(chart.pools().indexOf(newPool))
        .weight(1.0);
    });

    chart.arrangePools();
    chart.setTooltip().setAnnotation();

    chart.setAxes().setNav().setScrollNav();

    var fillEndpoints = [new Date('2014-01-01T00:00:00Z'), new Date('2014-01-02T00:00:00Z')];
    var fillScale = d3.time.scale.utc()
      .domain(fillEndpoints)
      .range([chart.axisGutter() + chart.dataGutter(), chart.width() - chart.navGutter() - chart.dataGutter()]);

    smbgTime = new tideline.plot.SMBGTime({emitter: emitter});

    chart.pools().forEach(function(pool, i) {
      var gutter;
      var d = new Date(pool.id().replace('poolBG_', ''));
      var dayOfTheWeek = d.getUTCDay();
      if ((dayOfTheWeek === 0) || (dayOfTheWeek === 6)) {
        gutter = {'top': 1.5, 'bottom': 1.5};
      }
      // on Mondays the bottom gutter should be a weekend gutter
      else if (dayOfTheWeek === 1) {
        gutter = {'top': 0.5, 'bottom': 1.5};
      }
      // on Fridays the top gutter should be a weekend gutter
      else if (dayOfTheWeek === 5) {
        gutter = {'top': 1.5, 'bottom': 0.5};
      }
      else {
        gutter = {'top': 0.5, 'bottom': 0.5};
      }
      pool.addPlotType('fill', fill(pool, {
        endpoints: fillEndpoints,
        xScale: fillScale,
        gutter: gutter,
        dataGutter: chart.dataGutter()
      }), false);
      pool.addPlotType('smbg', smbgTime.draw(pool), true, true);
      chart.tooltips().addGroup(d3.select('#' + chart.id()).select('#' + pool.id()), pool.id());
      pool.render(chart.daysGroup(), chart.dataPerDay[i]);
    });

    chart.poolStats.addPlotType('stats', tideline.plot.stats.widget(chart.poolStats, {
      cbg: cbgUtil,
      smbg: smbgUtil,
      bolus: bolusUtil,
      basal: basalUtil,
      xPosition: 0,
      yPosition: chart.poolStats.height() / 10,
      emitter: emitter,
      averageLabel: 'These two weeks',
      puddleWeights : {
        ratio: 1.1,
        range: 1.2,
        average: 1.0
      }
    }), false, false);

    chart.poolStats.render(chart.poolGroup());

    chart.annotations().addGroup(d3.select('#' + chart.id()).select('#' + chart.poolStats.id()), 'stats');

    chart.navString();

    return chart;
  };

  chart.showValues = function() {
    smbgTime.showValues();
  };

  chart.hideValues = function() {
    smbgTime.hideValues();
  };

  chart.type = 'weekly';

  return create(el, options);
}

module.exports = chartWeeklyFactory;

},{"events":5}],3:[function(require,module,exports){
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
  oneday: require('./chartdailyfactory'),
  twoweek: require('./chartweeklyfactory'),
  settings: require('./settingsfactory')
};
},{"./chartdailyfactory":1,"./chartweeklyfactory":2,"./settingsfactory":4}],4:[function(require,module,exports){
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

var _ = window._;
var bows = window.bows;
var d3 = window.d3;

var EventEmitter = require('events').EventEmitter;

var tideline = window.tideline;

function settingsFactory(el, options) {
  var log = bows('Settings Factory');
  options = options || {};

  var emitter = new EventEmitter();
  var page = tideline.settings(emitter);
  page.emitter = emitter;

  var create = function(el, options) {
    if (!el) {
      throw new Error('Sorry, you must provide a DOM element! :(');
    }

    d3.select(el).call(page);

    return page;
  };

  page.load = function(data) {
    page.data(data).render();

    return page;
  };

  page.type = 'settings';

  return create(el, options);
}

module.exports = settingsFactory;
},{"events":5}],5:[function(require,module,exports){
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

},{}]},{},[3])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1ZvbHVtZXMvVGlkZXBvb2wvdGlkZWxpbmUvcGx1Z2lucy9ibGlwL2NoYXJ0ZGFpbHlmYWN0b3J5LmpzIiwiL1ZvbHVtZXMvVGlkZXBvb2wvdGlkZWxpbmUvcGx1Z2lucy9ibGlwL2NoYXJ0d2Vla2x5ZmFjdG9yeS5qcyIsIi9Wb2x1bWVzL1RpZGVwb29sL3RpZGVsaW5lL3BsdWdpbnMvYmxpcC9pbmRleC5qcyIsIi9Wb2x1bWVzL1RpZGVwb29sL3RpZGVsaW5lL3BsdWdpbnMvYmxpcC9zZXR0aW5nc2ZhY3RvcnkuanMiLCIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeldBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqIENvcHlyaWdodCAoYykgMjAxNCwgVGlkZXBvb2wgUHJvamVjdFxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTsgeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeSBpdCB1bmRlclxuICogdGhlIHRlcm1zIG9mIHRoZSBhc3NvY2lhdGVkIExpY2Vuc2UsIHdoaWNoIGlzIGlkZW50aWNhbCB0byB0aGUgQlNEIDItQ2xhdXNlXG4gKiBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieSB0aGUgT3BlbiBTb3VyY2UgSW5pdGlhdGl2ZSBhdCBvcGVuc291cmNlLm9yZy5cbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsIGJ1dCBXSVRIT1VUXG4gKiBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTU1xuICogRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiBTZWUgdGhlIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqIFxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbTsgaWZcbiAqIG5vdCwgeW91IGNhbiBvYnRhaW4gb25lIGZyb20gVGlkZXBvb2wgUHJvamVjdCBhdCB0aWRlcG9vbC5vcmcuXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqL1xuXG52YXIgXyA9IHdpbmRvdy5fO1xudmFyIGJvd3MgPSB3aW5kb3cuYm93cztcbnZhciBkMyA9IHdpbmRvdy5kMztcblxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcjtcblxudmFyIHRpZGVsaW5lID0gd2luZG93LnRpZGVsaW5lO1xudmFyIGZpbGwgPSB0aWRlbGluZS5wbG90LnV0aWwuZmlsbDtcbnZhciBzY2FsZXMgPSB0aWRlbGluZS5wbG90LnV0aWwuc2NhbGVzO1xuXG4vLyBDcmVhdGUgYSAnT25lIERheScgY2hhcnQgb2JqZWN0IHRoYXQgaXMgYSB3cmFwcGVyIGFyb3VuZCBUaWRlbGluZSBjb21wb25lbnRzXG5mdW5jdGlvbiBjaGFydERhaWx5RmFjdG9yeShlbCwgb3B0aW9ucykge1xuICB2YXIgbG9nID0gYm93cygnRGFpbHkgRmFjdG9yeScpO1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgdmFyIGRlZmF1bHRzID0ge1xuICAgICdiZ1VuaXRzJzogJ21nL2RMJ1xuICB9O1xuICBfLmRlZmF1bHRzKG9wdGlvbnMsIGRlZmF1bHRzKTtcblxuICB2YXIgZW1pdHRlciA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgdmFyIGNoYXJ0ID0gdGlkZWxpbmUub25lRGF5KGVtaXR0ZXIpO1xuICBjaGFydC5lbWl0dGVyID0gZW1pdHRlcjtcbiAgY2hhcnQub3B0aW9ucyA9IG9wdGlvbnM7XG5cbiAgdmFyIHBvb2xNZXNzYWdlcywgcG9vbEJHLCBwb29sQm9sdXMsIHBvb2xCYXNhbCwgcG9vbFN0YXRzO1xuXG4gIHZhciBTTUJHX1NJWkUgPSAxNjtcblxuICB2YXIgY3JlYXRlID0gZnVuY3Rpb24oZWwsIG9wdGlvbnMpIHtcblxuICAgIGlmICghZWwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignU29ycnksIHlvdSBtdXN0IHByb3ZpZGUgYSBET00gZWxlbWVudCEgOignKTtcbiAgICB9XG5cbiAgICB2YXIgd2lkdGggPSBlbC5vZmZzZXRXaWR0aDtcbiAgICB2YXIgaGVpZ2h0ID0gZWwub2Zmc2V0SGVpZ2h0O1xuICAgIGlmICghKHdpZHRoICYmIGhlaWdodCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2hhcnQgZWxlbWVudCBtdXN0IGhhdmUgYSBzZXQgd2lkdGggYW5kIGhlaWdodCAnICtcbiAgICAgICAgICAgICAgICAgICAgICAnKGdvdDogJyArIHdpZHRoICsgJywgJyArIGhlaWdodCArICcpJyk7XG4gICAgfVxuXG4gICAgLy8gYmFzaWMgY2hhcnQgc2V0IHVwXG4gICAgY2hhcnQud2lkdGgod2lkdGgpLmhlaWdodChoZWlnaHQpO1xuXG4gICAgaWYgKG9wdGlvbnMuaW1hZ2VzQmFzZVVybCkge1xuICAgICAgY2hhcnQuaW1hZ2VzQmFzZVVybChvcHRpb25zLmltYWdlc0Jhc2VVcmwpO1xuICAgIH1cblxuICAgIGQzLnNlbGVjdChlbCkuY2FsbChjaGFydCk7XG5cbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQuc2V0dXBQb29scyA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIG1lc3NhZ2VzIHBvb2xcbiAgICBwb29sTWVzc2FnZXMgPSBjaGFydC5uZXdQb29sKClcbiAgICAgIC5pZCgncG9vbE1lc3NhZ2VzJywgY2hhcnQucG9vbEdyb3VwKCkpXG4gICAgICAubGFiZWwoJycpXG4gICAgICAuaW5kZXgoY2hhcnQucG9vbHMoKS5pbmRleE9mKHBvb2xNZXNzYWdlcykpXG4gICAgICAud2VpZ2h0KDAuNSk7XG5cbiAgICAvLyBibG9vZCBnbHVjb3NlIGRhdGEgcG9vbFxuICAgIHBvb2xCRyA9IGNoYXJ0Lm5ld1Bvb2woKVxuICAgICAgLmlkKCdwb29sQkcnLCBjaGFydC5wb29sR3JvdXAoKSlcbiAgICAgIC5sYWJlbChbe1xuICAgICAgICAnbWFpbic6ICdCbG9vZCBHbHVjb3NlJyxcbiAgICAgICAgJ2xpZ2h0JzogJyAoJyArIGNoYXJ0Lm9wdGlvbnMuYmdVbml0cyArICcpJ1xuICAgICAgfV0pXG4gICAgICAubGVnZW5kKFsnYmcnXSlcbiAgICAgIC5pbmRleChjaGFydC5wb29scygpLmluZGV4T2YocG9vbEJHKSlcbiAgICAgIC53ZWlnaHQoMS41KTtcblxuICAgIC8vIGNhcmJzIGFuZCBib2x1c2VzIGRhdGEgcG9vbFxuICAgIHBvb2xCb2x1cyA9IGNoYXJ0Lm5ld1Bvb2woKVxuICAgICAgLmlkKCdwb29sQm9sdXMnLCBjaGFydC5wb29sR3JvdXAoKSlcbiAgICAgIC5sYWJlbChbe1xuICAgICAgICAnbWFpbic6ICdCb2x1cycsXG4gICAgICAgICdsaWdodCc6ICcgKFUpJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgJ21haW4nOiAnICYgQ2FyYm9oeWRyYXRlcycsXG4gICAgICAgICdsaWdodCc6ICcgKGcpJ1xuICAgICAgfV0pXG4gICAgICAubGVnZW5kKFsnYm9sdXMnLCAnY2FyYnMnXSlcbiAgICAgIC5pbmRleChjaGFydC5wb29scygpLmluZGV4T2YocG9vbEJvbHVzKSlcbiAgICAgIC53ZWlnaHQoMS41KTtcblxuICAgIC8vIGJhc2FsIGRhdGEgcG9vbFxuICAgIHBvb2xCYXNhbCA9IGNoYXJ0Lm5ld1Bvb2woKVxuICAgICAgLmlkKCdwb29sQmFzYWwnLCBjaGFydC5wb29sR3JvdXAoKSlcbiAgICAgIC5sYWJlbChbe1xuICAgICAgICAnbWFpbic6ICdCYXNhbCBSYXRlcycsXG4gICAgICAgICdsaWdodCc6ICcgKFUvaHIpJ1xuICAgICAgfV0pXG4gICAgICAubGVnZW5kKFsnYmFzYWwnXSlcbiAgICAgIC5pbmRleChjaGFydC5wb29scygpLmluZGV4T2YocG9vbEJhc2FsKSlcbiAgICAgIC53ZWlnaHQoMS4wKTtcblxuICAgIC8vIHN0YXRzIGRhdGEgcG9vbFxuICAgIHBvb2xTdGF0cyA9IGNoYXJ0Lm5ld1Bvb2woKVxuICAgICAgLmlkKCdwb29sU3RhdHMnLCBjaGFydC5wb29sR3JvdXAoKSlcbiAgICAgIC5pbmRleChjaGFydC5wb29scygpLmluZGV4T2YocG9vbFN0YXRzKSlcbiAgICAgIC53ZWlnaHQoMS4wKTtcblxuICAgIGNoYXJ0LmFycmFuZ2VQb29scygpO1xuXG4gICAgY2hhcnQuc2V0QW5ub3RhdGlvbigpLnNldFRvb2x0aXAoKTtcblxuICAgIC8vIGFkZCBhbm5vdGF0aW9uc1xuICAgIGNoYXJ0LmFubm90YXRpb25zKCkuYWRkR3JvdXAoZDMuc2VsZWN0KCcjJyArIGNoYXJ0LmlkKCkpLnNlbGVjdCgnIycgKyBwb29sQm9sdXMuaWQoKSksICdib2x1cycpO1xuICAgIGNoYXJ0LmFubm90YXRpb25zKCkuYWRkR3JvdXAoZDMuc2VsZWN0KCcjJyArIGNoYXJ0LmlkKCkpLnNlbGVjdCgnIycgKyBwb29sQmFzYWwuaWQoKSksICdiYXNhbC1yYXRlLXNlZ21lbnQnKTtcbiAgICBjaGFydC5hbm5vdGF0aW9ucygpLmFkZEdyb3VwKGQzLnNlbGVjdCgnIycgKyBjaGFydC5pZCgpKS5zZWxlY3QoJyMnICsgcG9vbFN0YXRzLmlkKCkpLCAnc3RhdHMnKTtcblxuICAgIC8vIGFkZCB0b29sdGlwc1xuICAgIGNoYXJ0LnRvb2x0aXBzKCkuYWRkR3JvdXAoZDMuc2VsZWN0KCcjJyArIGNoYXJ0LmlkKCkpLnNlbGVjdCgnIycgKyBwb29sQkcuaWQoKSksICdjYmcnKTtcbiAgICBjaGFydC50b29sdGlwcygpLmFkZEdyb3VwKGQzLnNlbGVjdCgnIycgKyBjaGFydC5pZCgpKS5zZWxlY3QoJyMnICsgcG9vbEJHLmlkKCkpLCAnc21iZycpO1xuICAgIGNoYXJ0LnRvb2x0aXBzKCkuYWRkR3JvdXAoZDMuc2VsZWN0KCcjJyArIGNoYXJ0LmlkKCkpLnNlbGVjdCgnIycgKyBwb29sQm9sdXMuaWQoKSksICdjYXJicycpO1xuICAgIGNoYXJ0LnRvb2x0aXBzKCkuYWRkR3JvdXAoZDMuc2VsZWN0KCcjJyArIGNoYXJ0LmlkKCkpLnNlbGVjdCgnIycgKyBwb29sQm9sdXMuaWQoKSksICdib2x1cycpO1xuICAgIGNoYXJ0LnRvb2x0aXBzKCkuYWRkR3JvdXAoZDMuc2VsZWN0KCcjJyArIGNoYXJ0LmlkKCkpLnNlbGVjdCgnIycgKyBwb29sQmFzYWwuaWQoKSksICdiYXNhbCcpO1xuXG4gICAgcmV0dXJuIGNoYXJ0O1xuICB9O1xuXG4gIGNoYXJ0LmxvYWQgPSBmdW5jdGlvbih0aWRlbGluZURhdGEsIGRhdGV0aW1lKSB7XG4gICAgdmFyIGRhdGEgPSB0aWRlbGluZURhdGEuZGF0YTtcbiAgICBjaGFydC50aWRlbGluZURhdGEgPSB0aWRlbGluZURhdGE7XG5cbiAgICB2YXIgYmFzYWxVdGlsID0gdGlkZWxpbmVEYXRhLmJhc2FsVXRpbDtcbiAgICB2YXIgYm9sdXNVdGlsID0gdGlkZWxpbmVEYXRhLmJvbHVzVXRpbDtcbiAgICB2YXIgY2JnVXRpbCA9IHRpZGVsaW5lRGF0YS5jYmdVdGlsO1xuICAgIHZhciBzbWJnVXRpbCA9IHRpZGVsaW5lRGF0YS5zbWJnVXRpbDtcblxuICAgIGNoYXJ0LnN0b3BMaXN0ZW5pbmcoKTtcbiAgICAvLyBpbml0aWFsaXplIGNoYXJ0IHdpdGggZGF0YVxuICAgIGNoYXJ0LmRhdGEodGlkZWxpbmVEYXRhKS5zZXRBeGVzKCkuc2V0TmF2KCkuc2V0U2Nyb2xsTmF2KCk7XG5cbiAgICAvLyBCRyBwb29sXG4gICAgdmFyIGFsbEJHID0gXy5maWx0ZXIoZGF0YSwgZnVuY3Rpb24oZCkge1xuICAgICAgaWYgKChkLnR5cGUgPT09ICdjYmcnKSB8fCAoZC50eXBlID09PSAnc21iZycpKSB7XG4gICAgICAgIHJldHVybiBkO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHZhciBzY2FsZUJHID0gc2NhbGVzLmJnTG9nKGFsbEJHLCBwb29sQkcsIFNNQkdfU0laRS8yKTtcbiAgICAvLyBzZXQgdXAgeS1heGlzXG4gICAgcG9vbEJHLnlBeGlzKGQzLnN2Zy5heGlzKClcbiAgICAgIC5zY2FsZShzY2FsZUJHKVxuICAgICAgLm9yaWVudCgnbGVmdCcpXG4gICAgICAub3V0ZXJUaWNrU2l6ZSgwKVxuICAgICAgLnRpY2tWYWx1ZXMoc2NhbGVzLmJnVGlja3MoYWxsQkcpKVxuICAgICAgLnRpY2tGb3JtYXQoZDMuZm9ybWF0KCdnJykpKTtcbiAgICAvLyBhZGQgYmFja2dyb3VuZCBmaWxsIHJlY3RhbmdsZXMgdG8gQkcgcG9vbFxuICAgIHBvb2xCRy5hZGRQbG90VHlwZSgnZmlsbCcsIGZpbGwocG9vbEJHLCB7XG4gICAgICBlbmRwb2ludHM6IGNoYXJ0LmVuZHBvaW50cyxcbiAgICAgIGd1aWRlbGluZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgICdjbGFzcyc6ICdkMy1saW5lLWJnLXRocmVzaG9sZCcsXG4gICAgICAgICAgJ2hlaWdodCc6IDgwXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAnY2xhc3MnOiAnZDMtbGluZS1iZy10aHJlc2hvbGQnLFxuICAgICAgICAgICdoZWlnaHQnOiAxODBcbiAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIHlTY2FsZTogc2NhbGVCR1xuICAgIH0pLCBmYWxzZSwgdHJ1ZSk7XG5cbiAgICAvLyBhZGQgQ0JHIGRhdGEgdG8gQkcgcG9vbFxuICAgIHBvb2xCRy5hZGRQbG90VHlwZSgnY2JnJywgdGlkZWxpbmUucGxvdC5jYmcocG9vbEJHLCB7eVNjYWxlOiBzY2FsZUJHfSksIHRydWUsIHRydWUpO1xuXG4gICAgLy8gYWRkIFNNQkcgZGF0YSB0byBCRyBwb29sXG4gICAgcG9vbEJHLmFkZFBsb3RUeXBlKCdzbWJnJywgdGlkZWxpbmUucGxvdC5zbWJnKHBvb2xCRywge3lTY2FsZTogc2NhbGVCR30pLCB0cnVlLCB0cnVlKTtcblxuICAgIC8vIFRPRE86IHdoZW4gd2UgYnJpbmcgcmVzcG9uc2l2ZW5lc3MgaW5cbiAgICAvLyBkZWNpZGUgbnVtYmVyIG9mIHRpY2tzIGZvciB0aGVzZSBzY2FsZXMgYmFzZWQgb24gY29udGFpbmVyIGhlaWdodD9cbiAgICAvLyBib2x1cyAmIGNhcmJzIHBvb2xcbiAgICB2YXIgc2NhbGVCb2x1cyA9IHNjYWxlcy5ib2x1cyh0aWRlbGluZURhdGEuZ3JvdXBlZC5ib2x1cywgcG9vbEJvbHVzKTtcbiAgICB2YXIgc2NhbGVDYXJicyA9IHNjYWxlcy5jYXJicyh0aWRlbGluZURhdGEuZ3JvdXBlZC5jYXJicywgcG9vbEJvbHVzKTtcbiAgICAvLyBzZXQgdXAgeS1heGlzIGZvciBib2x1c1xuICAgIHBvb2xCb2x1cy55QXhpcyhkMy5zdmcuYXhpcygpXG4gICAgICAuc2NhbGUoc2NhbGVCb2x1cylcbiAgICAgIC5vcmllbnQoJ2xlZnQnKVxuICAgICAgLm91dGVyVGlja1NpemUoMClcbiAgICAgIC50aWNrcygyKSk7XG4gICAgLy8gc2V0IHVwIHktYXhpcyBmb3IgY2FyYnNcbiAgICBwb29sQm9sdXMueUF4aXMoZDMuc3ZnLmF4aXMoKVxuICAgICAgLnNjYWxlKHNjYWxlQ2FyYnMpXG4gICAgICAub3JpZW50KCdsZWZ0JylcbiAgICAgIC5vdXRlclRpY2tTaXplKDApXG4gICAgICAudGlja3MoMikpO1xuICAgIC8vIGFkZCBiYWNrZ3JvdW5kIGZpbGwgcmVjdGFuZ2xlcyB0byBib2x1cyBwb29sXG4gICAgdmFyIHNjYWxlRGl2aWRlciA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAuZG9tYWluKFswLCBwb29sQm9sdXMuaGVpZ2h0KCldKVxuICAgICAgLnJhbmdlKFswLCBwb29sQm9sdXMuaGVpZ2h0KCldKTtcbiAgICBwb29sQm9sdXMuYWRkUGxvdFR5cGUoJ2ZpbGwnLCBmaWxsKHBvb2xCb2x1cywge1xuICAgICAgZW5kcG9pbnRzOiBjaGFydC5lbmRwb2ludHMsXG4gICAgICBndWlkZWxpbmVzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAnY2xhc3MnOiAnZDMtbGluZS1kaXZpZGVyJyxcbiAgICAgICAgICAnaGVpZ2h0JzogcG9vbEJvbHVzLmhlaWdodCgpLzJcbiAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIHlTY2FsZTogc2NhbGVEaXZpZGVyXG4gICAgfSksIGZhbHNlLCB0cnVlKTtcblxuICAgIC8vIGFkZCBjYXJicyBkYXRhIHRvIGJvbHVzIHBvb2xcbiAgICBwb29sQm9sdXMuYWRkUGxvdFR5cGUoJ2NhcmJzJywgdGlkZWxpbmUucGxvdC5jYXJicyhwb29sQm9sdXMsIHtcbiAgICAgIHlTY2FsZTogc2NhbGVDYXJicyxcbiAgICAgIGVtaXR0ZXI6IGVtaXR0ZXIsXG4gICAgICBkYXRhOiB0aWRlbGluZURhdGEuZ3JvdXBlZC5jYXJic1xuICAgIH0pLCB0cnVlLCB0cnVlKTtcblxuICAgIC8vIGFkZCBib2x1cyBkYXRhIHRvIGJvbHVzIHBvb2xcbiAgICBwb29sQm9sdXMuYWRkUGxvdFR5cGUoJ2JvbHVzJywgdGlkZWxpbmUucGxvdC5ib2x1cyhwb29sQm9sdXMsIHtcbiAgICAgIHlTY2FsZTogc2NhbGVCb2x1cyxcbiAgICAgIGVtaXR0ZXI6IGVtaXR0ZXIsXG4gICAgICBkYXRhOiB0aWRlbGluZURhdGEuZ3JvdXBlZC5ib2x1c1xuICAgIH0pLCB0cnVlLCB0cnVlKTtcblxuICAgIC8vIGJhc2FsIHBvb2xcbiAgICB2YXIgc2NhbGVCYXNhbCA9IHNjYWxlcy5iYXNhbCh0aWRlbGluZURhdGEuZ3JvdXBlZFsnYmFzYWwtcmF0ZS1zZWdtZW50J10sIHBvb2xCYXNhbCk7XG4gICAgLy8gc2V0IHVwIHktYXhpc1xuICAgIHBvb2xCYXNhbC55QXhpcyhkMy5zdmcuYXhpcygpXG4gICAgICAuc2NhbGUoc2NhbGVCYXNhbClcbiAgICAgIC5vcmllbnQoJ2xlZnQnKVxuICAgICAgLm91dGVyVGlja1NpemUoMClcbiAgICAgIC50aWNrcyg0KSk7XG4gICAgLy8gYWRkIGJhY2tncm91bmQgZmlsbCByZWN0YW5nbGVzIHRvIGJhc2FsIHBvb2xcbiAgICBwb29sQmFzYWwuYWRkUGxvdFR5cGUoJ2ZpbGwnLCBmaWxsKHBvb2xCYXNhbCwge2VuZHBvaW50czogY2hhcnQuZW5kcG9pbnRzfSksIGZhbHNlLCB0cnVlKTtcblxuICAgIC8vIGFkZCBiYXNhbCBkYXRhIHRvIGJhc2FsIHBvb2xcbiAgICBwb29sQmFzYWwuYWRkUGxvdFR5cGUoJ2Jhc2FsLXJhdGUtc2VnbWVudCcsIHRpZGVsaW5lLnBsb3QuYmFzYWwocG9vbEJhc2FsLCB7XG4gICAgICB5U2NhbGU6IHNjYWxlQmFzYWwsXG4gICAgICBkYXRhOiB0aWRlbGluZURhdGEuZ3JvdXBlZFsnYmFzYWwtcmF0ZS1zZWdtZW50J11cbiAgICB9KSwgdHJ1ZSwgdHJ1ZSk7XG5cbiAgICAvLyBtZXNzYWdlcyBwb29sXG4gICAgLy8gYWRkIGJhY2tncm91bmQgZmlsbCByZWN0YW5nbGVzIHRvIG1lc3NhZ2VzIHBvb2xcbiAgICBwb29sTWVzc2FnZXMuYWRkUGxvdFR5cGUoJ2ZpbGwnLCBmaWxsKHBvb2xNZXNzYWdlcywge2VuZHBvaW50czogY2hhcnQuZW5kcG9pbnRzfSksIGZhbHNlLCB0cnVlKTtcblxuICAgIC8vIGFkZCBtZXNzYWdlIGltYWdlcyB0byBtZXNzYWdlcyBwb29sXG4gICAgcG9vbE1lc3NhZ2VzLmFkZFBsb3RUeXBlKCdtZXNzYWdlJywgdGlkZWxpbmUucGxvdC5tZXNzYWdlKHBvb2xNZXNzYWdlcywge1xuICAgICAgc2l6ZTogMzAsXG4gICAgICBlbWl0dGVyOiBlbWl0dGVyXG4gICAgfSksIHRydWUsIHRydWUpO1xuXG4gICAgLy8gc3RhdHMgcG9vbFxuICAgIHBvb2xTdGF0cy5hZGRQbG90VHlwZSgnc3RhdHMnLCB0aWRlbGluZS5wbG90LnN0YXRzLndpZGdldChwb29sU3RhdHMsIHtcbiAgICAgIGNiZzogY2JnVXRpbCxcbiAgICAgIHNtYmc6IHNtYmdVdGlsLFxuICAgICAgYm9sdXM6IGJvbHVzVXRpbCxcbiAgICAgIGJhc2FsOiBiYXNhbFV0aWwsXG4gICAgICB4UG9zaXRpb246IGNoYXJ0LmF4aXNHdXR0ZXIoKSxcbiAgICAgIHlQb3NpdGlvbjogMCxcbiAgICAgIGVtaXR0ZXI6IGVtaXR0ZXIsXG4gICAgICBhdmVyYWdlTGFiZWw6ICdUaGVzZSAyNCBob3VycycsXG4gICAgICBwdWRkbGVXZWlnaHRzOiB7XG4gICAgICAgIHJhdGlvOiAxLjAsXG4gICAgICAgIHJhbmdlOiAxLjIsXG4gICAgICAgIGF2ZXJhZ2U6IDAuOVxuICAgICAgfVxuICAgIH0pLCBmYWxzZSwgZmFsc2UpO1xuXG4gICAgcmV0dXJuIGNoYXJ0O1xuICB9O1xuXG4gIC8vIGxvY2F0ZSB0aGUgY2hhcnQgYXJvdW5kIGEgY2VydGFpbiBkYXRldGltZVxuICAvLyBpZiBjYWxsZWQgd2l0aG91dCBhbiBhcmd1bWVudCwgbG9jYXRlcyB0aGUgY2hhcnQgYXQgdGhlIG1vc3QgcmVjZW50IDI0IGhvdXJzIG9mIGRhdGFcbiAgY2hhcnQubG9jYXRlID0gZnVuY3Rpb24oZGF0ZXRpbWUpIHtcblxuICAgIHZhciBzdGFydCwgZW5kLCBhdE1vc3RSZWNlbnQgPSBmYWxzZTtcblxuICAgIHZhciBtb3N0UmVjZW50ID0gZnVuY3Rpb24oKSB7XG4gICAgICBzdGFydCA9IGNoYXJ0LmluaXRpYWxFbmRwb2ludHNbMF07XG4gICAgICBlbmQgPSBjaGFydC5pbml0aWFsRW5kcG9pbnRzWzFdO1xuICAgIH07XG5cbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIGF0TW9zdFJlY2VudCA9IHRydWU7XG4gICAgICBtb3N0UmVjZW50KCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgLy8gdHJhbnNsYXRlIHRoZSBkZXNpcmVkIGNlbnRlci1vZi12aWV3IGRhdGV0aW1lIGludG8gYW4gZWRnZXBvaW50IGZvciB0aWRlbGluZVxuICAgICAgc3RhcnQgPSBuZXcgRGF0ZShkYXRldGltZSk7XG4gICAgICBjaGFydC5jdXJyZW50Q2VudGVyKHN0YXJ0KTtcbiAgICAgIHZhciBwbHVzSGFsZiA9IG5ldyBEYXRlKHN0YXJ0KTtcbiAgICAgIHBsdXNIYWxmLnNldFVUQ0hvdXJzKHBsdXNIYWxmLmdldFVUQ0hvdXJzKCkgKyAxMik7XG4gICAgICB2YXIgbWludXNIYWxmID0gbmV3IERhdGUoc3RhcnQpO1xuICAgICAgbWludXNIYWxmLnNldFVUQ0hvdXJzKG1pbnVzSGFsZi5nZXRVVENIb3VycygpIC0gMTIpO1xuICAgICAgaWYgKChzdGFydC52YWx1ZU9mKCkgPCBjaGFydC5lbmRwb2ludHNbMF0pIHx8IChzdGFydC52YWx1ZU9mKCkgPiBjaGFydC5lbmRwb2ludHNbMV0pKSB7XG4gICAgICAgIGxvZygnUGxlYXNlIGRvblxcJ3QgYXNrIHRpZGVsaW5lIHRvIGxvY2F0ZSBhdCBhIGRhdGUgdGhhdFxcJ3Mgb3V0c2lkZSBvZiB5b3VyIGRhdGEhJyk7XG4gICAgICAgIGxvZygnUmVuZGVyaW5nIG1vc3QgcmVjZW50IGRhdGEgaW5zdGVhZC4nKTtcbiAgICAgICAgbW9zdFJlY2VudCgpO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAocGx1c0hhbGYudmFsdWVPZigpID4gY2hhcnQuZW5kcG9pbnRzWzFdKSB7XG4gICAgICAgIG1vc3RSZWNlbnQoKTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKG1pbnVzSGFsZi52YWx1ZU9mKCkgPCBjaGFydC5lbmRwb2ludHNbMF0pIHtcbiAgICAgICAgc3RhcnQgPSBjaGFydC5lbmRwb2ludHNbMF07XG4gICAgICAgIHZhciBmaXJzdEVuZCA9IG5ldyBEYXRlKHN0YXJ0KTtcbiAgICAgICAgZmlyc3RFbmQuc2V0VVRDRGF0ZShmaXJzdEVuZC5nZXRVVENEYXRlKCkgKyAxKTtcbiAgICAgICAgZW5kID0gZmlyc3RFbmQ7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgZW5kID0gbmV3IERhdGUoc3RhcnQpO1xuICAgICAgICBzdGFydC5zZXRVVENIb3VycyhzdGFydC5nZXRVVENIb3VycygpIC0gMTIpO1xuICAgICAgICBlbmQuc2V0VVRDSG91cnMoZW5kLmdldFVUQ0hvdXJzKCkgKyAxMik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY2hhcnQucmVuZGVyZWREYXRhKFtzdGFydCwgZW5kXSk7XG5cbiAgICAvLyByZW5kZXIgcG9vbHNcbiAgICBfLmVhY2goY2hhcnQucG9vbHMoKSwgZnVuY3Rpb24ocG9vbCkge1xuICAgICAgcG9vbC5yZW5kZXIoY2hhcnQucG9vbEdyb3VwKCksIGNoYXJ0LnJlbmRlcmVkRGF0YSgpKTtcbiAgICB9KTtcblxuICAgIGNoYXJ0LnNldEF0RGF0ZShzdGFydCwgYXRNb3N0UmVjZW50KTtcblxuICAgIGNoYXJ0Lm5hdlN0cmluZyhbc3RhcnQsIGVuZF0pO1xuXG4gICAgcmV0dXJuIGNoYXJ0O1xuICB9O1xuXG4gIGNoYXJ0LmdldEN1cnJlbnREYXkgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gY2hhcnQuZ2V0Q3VycmVudERvbWFpbigpLmNlbnRlcjtcbiAgfTtcblxuICBjaGFydC5jcmVhdGVNZXNzYWdlID0gZnVuY3Rpb24obWVzc2FnZSkge1xuICAgIGxvZygnTmV3IG1lc3NhZ2UgY3JlYXRlZDonLCBtZXNzYWdlKTtcbiAgICBjaGFydC50aWRlbGluZURhdGEgPSBjaGFydC50aWRlbGluZURhdGEuYWRkRGF0dW0obWVzc2FnZSk7XG4gICAgY2hhcnQuZGF0YShjaGFydC50aWRlbGluZURhdGEpO1xuICAgIGNoYXJ0LmVtaXR0ZXIuZW1pdCgnbWVzc2FnZUNyZWF0ZWQnLCBtZXNzYWdlKTtcbiAgfTtcblxuICBjaGFydC5jbG9zZU1lc3NhZ2UgPSBmdW5jdGlvbigpIHtcbiAgICBkMy5zZWxlY3RBbGwoJy5kMy1yZWN0LW1lc3NhZ2UnKS5jbGFzc2VkKCdoaWRkZW4nLCB0cnVlKTtcbiAgfTtcblxuICBjaGFydC50eXBlID0gJ2RhaWx5JztcblxuICByZXR1cm4gY3JlYXRlKGVsLCBvcHRpb25zKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjaGFydERhaWx5RmFjdG9yeTtcbiIsIi8qXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqIENvcHlyaWdodCAoYykgMjAxNCwgVGlkZXBvb2wgUHJvamVjdFxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTsgeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeSBpdCB1bmRlclxuICogdGhlIHRlcm1zIG9mIHRoZSBhc3NvY2lhdGVkIExpY2Vuc2UsIHdoaWNoIGlzIGlkZW50aWNhbCB0byB0aGUgQlNEIDItQ2xhdXNlXG4gKiBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieSB0aGUgT3BlbiBTb3VyY2UgSW5pdGlhdGl2ZSBhdCBvcGVuc291cmNlLm9yZy5cbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsIGJ1dCBXSVRIT1VUXG4gKiBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTU1xuICogRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiBTZWUgdGhlIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqIFxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbTsgaWZcbiAqIG5vdCwgeW91IGNhbiBvYnRhaW4gb25lIGZyb20gVGlkZXBvb2wgUHJvamVjdCBhdCB0aWRlcG9vbC5vcmcuXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqL1xuXG52YXIgXyA9IHdpbmRvdy5fO1xudmFyIGJvd3MgPSB3aW5kb3cuYm93cztcbnZhciBkMyA9IHdpbmRvdy5kMztcblxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcjtcblxudmFyIHRpZGVsaW5lID0gd2luZG93LnRpZGVsaW5lO1xudmFyIGZpbGwgPSB0aWRlbGluZS5wbG90LnV0aWwuZmlsbDtcblxuLy8gQ3JlYXRlIGEgJ1R3byBXZWVrcycgY2hhcnQgb2JqZWN0IHRoYXQgaXMgYSB3cmFwcGVyIGFyb3VuZCBUaWRlbGluZSBjb21wb25lbnRzXG5mdW5jdGlvbiBjaGFydFdlZWtseUZhY3RvcnkoZWwsIG9wdGlvbnMpIHtcbiAgdmFyIGxvZyA9IGJvd3MoJ1dlZWtseSBGYWN0b3J5Jyk7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIHZhciBlbWl0dGVyID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICB2YXIgY2hhcnQgPSB0aWRlbGluZS50d29XZWVrKGVtaXR0ZXIpO1xuICBjaGFydC5lbWl0dGVyID0gZW1pdHRlcjtcblxuICB2YXIgcG9vbHMgPSBbXTtcblxuICB2YXIgc21iZ1RpbWU7XG5cbiAgdmFyIGNyZWF0ZSA9IGZ1bmN0aW9uKGVsLCBvcHRpb25zKSB7XG4gICAgaWYgKCFlbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdTb3JyeSwgeW91IG11c3QgcHJvdmlkZSBhIERPTSBlbGVtZW50ISA6KCcpO1xuICAgIH1cblxuICAgIHZhciB3aWR0aCA9IGVsLm9mZnNldFdpZHRoO1xuICAgIHZhciBoZWlnaHQgPSBlbC5vZmZzZXRIZWlnaHQ7XG4gICAgaWYgKCEod2lkdGggJiYgaGVpZ2h0KSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDaGFydCBlbGVtZW50IG11c3QgaGF2ZSBhIHNldCB3aWR0aCBhbmQgaGVpZ2h0ICcgK1xuICAgICAgICAgICAgICAgICAgICAgICcoZ290OiAnICsgd2lkdGggKyAnLCAnICsgaGVpZ2h0ICsgJyknKTtcbiAgICB9XG5cbiAgICAvLyBiYXNpYyBjaGFydCBzZXQgdXBcbiAgICBjaGFydC53aWR0aCh3aWR0aCkuaGVpZ2h0KGhlaWdodCk7XG5cbiAgICBpZiAob3B0aW9ucy5pbWFnZXNCYXNlVXJsKSB7XG4gICAgICBjaGFydC5pbWFnZXNCYXNlVXJsKG9wdGlvbnMuaW1hZ2VzQmFzZVVybCk7XG4gICAgICBjaGFydC5kYXRhR3V0dGVyKDgpO1xuICAgIH1cblxuICAgIGQzLnNlbGVjdChlbCkuY2FsbChjaGFydCk7XG5cbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQubG9hZCA9IGZ1bmN0aW9uKHRpZGVsaW5lRGF0YSwgZGF0ZXRpbWUpIHtcbiAgICB2YXIgYmFzYWxVdGlsID0gdGlkZWxpbmVEYXRhLmJhc2FsVXRpbDtcbiAgICB2YXIgYm9sdXNVdGlsID0gdGlkZWxpbmVEYXRhLmJvbHVzVXRpbDtcbiAgICB2YXIgY2JnVXRpbCA9IHRpZGVsaW5lRGF0YS5jYmdVdGlsO1xuICAgIHZhciBzbWJnVXRpbCA9IHRpZGVsaW5lRGF0YS5zbWJnVXRpbDtcblxuICAgIHZhciBzbWJnRGF0YSA9IHRpZGVsaW5lRGF0YS5ncm91cGVkLnNtYmcgfHwgW107XG5cbiAgICBpZiAoIWRhdGV0aW1lKSB7XG4gICAgICBjaGFydC5kYXRhKHNtYmdEYXRhKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBpZiAoc21iZ0RhdGEubGVuZ3RoICYmXG4gICAgICAgICAgZGF0ZXRpbWUudmFsdWVPZigpID4gRGF0ZS5wYXJzZShzbWJnRGF0YVtzbWJnRGF0YS5sZW5ndGggLSAxXS5ub3JtYWxUaW1lKSkge1xuICAgICAgICBkYXRldGltZSA9IHNtYmdEYXRhW3NtYmdEYXRhLmxlbmd0aCAtIDFdLm5vcm1hbFRpbWU7XG4gICAgICB9XG4gICAgICBjaGFydC5kYXRhKHNtYmdEYXRhLCBkYXRldGltZSk7XG4gICAgfVxuXG4gICAgY2hhcnQuc2V0dXAoKTtcblxuICAgIHZhciBkYXlzID0gY2hhcnQuZGF5cztcblxuICAgIC8vIG1ha2UgcG9vbHMgZm9yIGVhY2ggZGF5XG4gICAgZGF5cy5mb3JFYWNoKGZ1bmN0aW9uKGRheSwgaSkge1xuICAgICAgdmFyIG5ld1Bvb2wgPSBjaGFydC5uZXdQb29sKClcbiAgICAgICAgLmlkKCdwb29sQkdfJyArIGRheSwgY2hhcnQuZGF5c0dyb3VwKCkpXG4gICAgICAgIC5pbmRleChjaGFydC5wb29scygpLmluZGV4T2YobmV3UG9vbCkpXG4gICAgICAgIC53ZWlnaHQoMS4wKTtcbiAgICB9KTtcblxuICAgIGNoYXJ0LmFycmFuZ2VQb29scygpO1xuICAgIGNoYXJ0LnNldFRvb2x0aXAoKS5zZXRBbm5vdGF0aW9uKCk7XG5cbiAgICBjaGFydC5zZXRBeGVzKCkuc2V0TmF2KCkuc2V0U2Nyb2xsTmF2KCk7XG5cbiAgICB2YXIgZmlsbEVuZHBvaW50cyA9IFtuZXcgRGF0ZSgnMjAxNC0wMS0wMVQwMDowMDowMFonKSwgbmV3IERhdGUoJzIwMTQtMDEtMDJUMDA6MDA6MDBaJyldO1xuICAgIHZhciBmaWxsU2NhbGUgPSBkMy50aW1lLnNjYWxlLnV0YygpXG4gICAgICAuZG9tYWluKGZpbGxFbmRwb2ludHMpXG4gICAgICAucmFuZ2UoW2NoYXJ0LmF4aXNHdXR0ZXIoKSArIGNoYXJ0LmRhdGFHdXR0ZXIoKSwgY2hhcnQud2lkdGgoKSAtIGNoYXJ0Lm5hdkd1dHRlcigpIC0gY2hhcnQuZGF0YUd1dHRlcigpXSk7XG5cbiAgICBzbWJnVGltZSA9IG5ldyB0aWRlbGluZS5wbG90LlNNQkdUaW1lKHtlbWl0dGVyOiBlbWl0dGVyfSk7XG5cbiAgICBjaGFydC5wb29scygpLmZvckVhY2goZnVuY3Rpb24ocG9vbCwgaSkge1xuICAgICAgdmFyIGd1dHRlcjtcbiAgICAgIHZhciBkID0gbmV3IERhdGUocG9vbC5pZCgpLnJlcGxhY2UoJ3Bvb2xCR18nLCAnJykpO1xuICAgICAgdmFyIGRheU9mVGhlV2VlayA9IGQuZ2V0VVRDRGF5KCk7XG4gICAgICBpZiAoKGRheU9mVGhlV2VlayA9PT0gMCkgfHwgKGRheU9mVGhlV2VlayA9PT0gNikpIHtcbiAgICAgICAgZ3V0dGVyID0geyd0b3AnOiAxLjUsICdib3R0b20nOiAxLjV9O1xuICAgICAgfVxuICAgICAgLy8gb24gTW9uZGF5cyB0aGUgYm90dG9tIGd1dHRlciBzaG91bGQgYmUgYSB3ZWVrZW5kIGd1dHRlclxuICAgICAgZWxzZSBpZiAoZGF5T2ZUaGVXZWVrID09PSAxKSB7XG4gICAgICAgIGd1dHRlciA9IHsndG9wJzogMC41LCAnYm90dG9tJzogMS41fTtcbiAgICAgIH1cbiAgICAgIC8vIG9uIEZyaWRheXMgdGhlIHRvcCBndXR0ZXIgc2hvdWxkIGJlIGEgd2Vla2VuZCBndXR0ZXJcbiAgICAgIGVsc2UgaWYgKGRheU9mVGhlV2VlayA9PT0gNSkge1xuICAgICAgICBndXR0ZXIgPSB7J3RvcCc6IDEuNSwgJ2JvdHRvbSc6IDAuNX07XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgZ3V0dGVyID0geyd0b3AnOiAwLjUsICdib3R0b20nOiAwLjV9O1xuICAgICAgfVxuICAgICAgcG9vbC5hZGRQbG90VHlwZSgnZmlsbCcsIGZpbGwocG9vbCwge1xuICAgICAgICBlbmRwb2ludHM6IGZpbGxFbmRwb2ludHMsXG4gICAgICAgIHhTY2FsZTogZmlsbFNjYWxlLFxuICAgICAgICBndXR0ZXI6IGd1dHRlcixcbiAgICAgICAgZGF0YUd1dHRlcjogY2hhcnQuZGF0YUd1dHRlcigpXG4gICAgICB9KSwgZmFsc2UpO1xuICAgICAgcG9vbC5hZGRQbG90VHlwZSgnc21iZycsIHNtYmdUaW1lLmRyYXcocG9vbCksIHRydWUsIHRydWUpO1xuICAgICAgY2hhcnQudG9vbHRpcHMoKS5hZGRHcm91cChkMy5zZWxlY3QoJyMnICsgY2hhcnQuaWQoKSkuc2VsZWN0KCcjJyArIHBvb2wuaWQoKSksIHBvb2wuaWQoKSk7XG4gICAgICBwb29sLnJlbmRlcihjaGFydC5kYXlzR3JvdXAoKSwgY2hhcnQuZGF0YVBlckRheVtpXSk7XG4gICAgfSk7XG5cbiAgICBjaGFydC5wb29sU3RhdHMuYWRkUGxvdFR5cGUoJ3N0YXRzJywgdGlkZWxpbmUucGxvdC5zdGF0cy53aWRnZXQoY2hhcnQucG9vbFN0YXRzLCB7XG4gICAgICBjYmc6IGNiZ1V0aWwsXG4gICAgICBzbWJnOiBzbWJnVXRpbCxcbiAgICAgIGJvbHVzOiBib2x1c1V0aWwsXG4gICAgICBiYXNhbDogYmFzYWxVdGlsLFxuICAgICAgeFBvc2l0aW9uOiAwLFxuICAgICAgeVBvc2l0aW9uOiBjaGFydC5wb29sU3RhdHMuaGVpZ2h0KCkgLyAxMCxcbiAgICAgIGVtaXR0ZXI6IGVtaXR0ZXIsXG4gICAgICBhdmVyYWdlTGFiZWw6ICdUaGVzZSB0d28gd2Vla3MnLFxuICAgICAgcHVkZGxlV2VpZ2h0cyA6IHtcbiAgICAgICAgcmF0aW86IDEuMSxcbiAgICAgICAgcmFuZ2U6IDEuMixcbiAgICAgICAgYXZlcmFnZTogMS4wXG4gICAgICB9XG4gICAgfSksIGZhbHNlLCBmYWxzZSk7XG5cbiAgICBjaGFydC5wb29sU3RhdHMucmVuZGVyKGNoYXJ0LnBvb2xHcm91cCgpKTtcblxuICAgIGNoYXJ0LmFubm90YXRpb25zKCkuYWRkR3JvdXAoZDMuc2VsZWN0KCcjJyArIGNoYXJ0LmlkKCkpLnNlbGVjdCgnIycgKyBjaGFydC5wb29sU3RhdHMuaWQoKSksICdzdGF0cycpO1xuXG4gICAgY2hhcnQubmF2U3RyaW5nKCk7XG5cbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQuc2hvd1ZhbHVlcyA9IGZ1bmN0aW9uKCkge1xuICAgIHNtYmdUaW1lLnNob3dWYWx1ZXMoKTtcbiAgfTtcblxuICBjaGFydC5oaWRlVmFsdWVzID0gZnVuY3Rpb24oKSB7XG4gICAgc21iZ1RpbWUuaGlkZVZhbHVlcygpO1xuICB9O1xuXG4gIGNoYXJ0LnR5cGUgPSAnd2Vla2x5JztcblxuICByZXR1cm4gY3JlYXRlKGVsLCBvcHRpb25zKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjaGFydFdlZWtseUZhY3Rvcnk7XG4iLCIvKiBcbiAqID09IEJTRDIgTElDRU5TRSA9PVxuICogQ29weXJpZ2h0IChjKSAyMDE0LCBUaWRlcG9vbCBQcm9qZWN0XG4gKiBcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOyB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5IGl0IHVuZGVyXG4gKiB0aGUgdGVybXMgb2YgdGhlIGFzc29jaWF0ZWQgTGljZW5zZSwgd2hpY2ggaXMgaWRlbnRpY2FsIHRvIHRoZSBCU0QgMi1DbGF1c2VcbiAqIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5IHRoZSBPcGVuIFNvdXJjZSBJbml0aWF0aXZlIGF0IG9wZW5zb3VyY2Uub3JnLlxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCwgYnV0IFdJVEhPVVRcbiAqIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTXG4gKiBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuIFNlZSB0aGUgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICogXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtOyBpZlxuICogbm90LCB5b3UgY2FuIG9idGFpbiBvbmUgZnJvbSBUaWRlcG9vbCBQcm9qZWN0IGF0IHRpZGVwb29sLm9yZy5cbiAqID09IEJTRDIgTElDRU5TRSA9PVxuICovXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBvbmVkYXk6IHJlcXVpcmUoJy4vY2hhcnRkYWlseWZhY3RvcnknKSxcbiAgdHdvd2VlazogcmVxdWlyZSgnLi9jaGFydHdlZWtseWZhY3RvcnknKSxcbiAgc2V0dGluZ3M6IHJlcXVpcmUoJy4vc2V0dGluZ3NmYWN0b3J5Jylcbn07IiwiLyogXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqIENvcHlyaWdodCAoYykgMjAxNCwgVGlkZXBvb2wgUHJvamVjdFxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTsgeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeSBpdCB1bmRlclxuICogdGhlIHRlcm1zIG9mIHRoZSBhc3NvY2lhdGVkIExpY2Vuc2UsIHdoaWNoIGlzIGlkZW50aWNhbCB0byB0aGUgQlNEIDItQ2xhdXNlXG4gKiBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieSB0aGUgT3BlbiBTb3VyY2UgSW5pdGlhdGl2ZSBhdCBvcGVuc291cmNlLm9yZy5cbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsIGJ1dCBXSVRIT1VUXG4gKiBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTU1xuICogRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiBTZWUgdGhlIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqIFxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbTsgaWZcbiAqIG5vdCwgeW91IGNhbiBvYnRhaW4gb25lIGZyb20gVGlkZXBvb2wgUHJvamVjdCBhdCB0aWRlcG9vbC5vcmcuXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqL1xuXG52YXIgXyA9IHdpbmRvdy5fO1xudmFyIGJvd3MgPSB3aW5kb3cuYm93cztcbnZhciBkMyA9IHdpbmRvdy5kMztcblxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcjtcblxudmFyIHRpZGVsaW5lID0gd2luZG93LnRpZGVsaW5lO1xuXG5mdW5jdGlvbiBzZXR0aW5nc0ZhY3RvcnkoZWwsIG9wdGlvbnMpIHtcbiAgdmFyIGxvZyA9IGJvd3MoJ1NldHRpbmdzIEZhY3RvcnknKTtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgdmFyIGVtaXR0ZXIgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gIHZhciBwYWdlID0gdGlkZWxpbmUuc2V0dGluZ3MoZW1pdHRlcik7XG4gIHBhZ2UuZW1pdHRlciA9IGVtaXR0ZXI7XG5cbiAgdmFyIGNyZWF0ZSA9IGZ1bmN0aW9uKGVsLCBvcHRpb25zKSB7XG4gICAgaWYgKCFlbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdTb3JyeSwgeW91IG11c3QgcHJvdmlkZSBhIERPTSBlbGVtZW50ISA6KCcpO1xuICAgIH1cblxuICAgIGQzLnNlbGVjdChlbCkuY2FsbChwYWdlKTtcblxuICAgIHJldHVybiBwYWdlO1xuICB9O1xuXG4gIHBhZ2UubG9hZCA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICBwYWdlLmRhdGEoZGF0YSkucmVuZGVyKCk7XG5cbiAgICByZXR1cm4gcGFnZTtcbiAgfTtcblxuICBwYWdlLnR5cGUgPSAnc2V0dGluZ3MnO1xuXG4gIHJldHVybiBjcmVhdGUoZWwsIG9wdGlvbnMpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHNldHRpbmdzRmFjdG9yeTsiLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iXX0=
(3)
});
