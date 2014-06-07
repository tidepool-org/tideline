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
    chart.id(el.id).width(width).height(height);

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
    chart.id(el.id).width(width).height(height);

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
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1ZvbHVtZXMvVGlkZXBvb2wvdGlkZWxpbmUvcGx1Z2lucy9ibGlwL2NoYXJ0ZGFpbHlmYWN0b3J5LmpzIiwiL1ZvbHVtZXMvVGlkZXBvb2wvdGlkZWxpbmUvcGx1Z2lucy9ibGlwL2NoYXJ0d2Vla2x5ZmFjdG9yeS5qcyIsIi9Wb2x1bWVzL1RpZGVwb29sL3RpZGVsaW5lL3BsdWdpbnMvYmxpcC9pbmRleC5qcyIsIi9Wb2x1bWVzL1RpZGVwb29sL3RpZGVsaW5lL3BsdWdpbnMvYmxpcC9zZXR0aW5nc2ZhY3RvcnkuanMiLCIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeldBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqIENvcHlyaWdodCAoYykgMjAxNCwgVGlkZXBvb2wgUHJvamVjdFxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTsgeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeSBpdCB1bmRlclxuICogdGhlIHRlcm1zIG9mIHRoZSBhc3NvY2lhdGVkIExpY2Vuc2UsIHdoaWNoIGlzIGlkZW50aWNhbCB0byB0aGUgQlNEIDItQ2xhdXNlXG4gKiBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieSB0aGUgT3BlbiBTb3VyY2UgSW5pdGlhdGl2ZSBhdCBvcGVuc291cmNlLm9yZy5cbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsIGJ1dCBXSVRIT1VUXG4gKiBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTU1xuICogRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiBTZWUgdGhlIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqIFxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbTsgaWZcbiAqIG5vdCwgeW91IGNhbiBvYnRhaW4gb25lIGZyb20gVGlkZXBvb2wgUHJvamVjdCBhdCB0aWRlcG9vbC5vcmcuXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqL1xuXG52YXIgXyA9IHdpbmRvdy5fO1xudmFyIGJvd3MgPSB3aW5kb3cuYm93cztcbnZhciBkMyA9IHdpbmRvdy5kMztcblxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcjtcblxudmFyIHRpZGVsaW5lID0gd2luZG93LnRpZGVsaW5lO1xudmFyIGZpbGwgPSB0aWRlbGluZS5wbG90LnV0aWwuZmlsbDtcbnZhciBzY2FsZXMgPSB0aWRlbGluZS5wbG90LnV0aWwuc2NhbGVzO1xuXG4vLyBDcmVhdGUgYSAnT25lIERheScgY2hhcnQgb2JqZWN0IHRoYXQgaXMgYSB3cmFwcGVyIGFyb3VuZCBUaWRlbGluZSBjb21wb25lbnRzXG5mdW5jdGlvbiBjaGFydERhaWx5RmFjdG9yeShlbCwgb3B0aW9ucykge1xuICB2YXIgbG9nID0gYm93cygnRGFpbHkgRmFjdG9yeScpO1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgdmFyIGRlZmF1bHRzID0ge1xuICAgICdiZ1VuaXRzJzogJ21nL2RMJ1xuICB9O1xuICBfLmRlZmF1bHRzKG9wdGlvbnMsIGRlZmF1bHRzKTtcblxuICB2YXIgZW1pdHRlciA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgdmFyIGNoYXJ0ID0gdGlkZWxpbmUub25lRGF5KGVtaXR0ZXIpO1xuICBjaGFydC5lbWl0dGVyID0gZW1pdHRlcjtcbiAgY2hhcnQub3B0aW9ucyA9IG9wdGlvbnM7XG5cbiAgdmFyIHBvb2xNZXNzYWdlcywgcG9vbEJHLCBwb29sQm9sdXMsIHBvb2xCYXNhbCwgcG9vbFN0YXRzO1xuXG4gIHZhciBTTUJHX1NJWkUgPSAxNjtcblxuICB2YXIgY3JlYXRlID0gZnVuY3Rpb24oZWwsIG9wdGlvbnMpIHtcblxuICAgIGlmICghZWwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignU29ycnksIHlvdSBtdXN0IHByb3ZpZGUgYSBET00gZWxlbWVudCEgOignKTtcbiAgICB9XG5cbiAgICB2YXIgd2lkdGggPSBlbC5vZmZzZXRXaWR0aDtcbiAgICB2YXIgaGVpZ2h0ID0gZWwub2Zmc2V0SGVpZ2h0O1xuICAgIGlmICghKHdpZHRoICYmIGhlaWdodCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2hhcnQgZWxlbWVudCBtdXN0IGhhdmUgYSBzZXQgd2lkdGggYW5kIGhlaWdodCAnICtcbiAgICAgICAgICAgICAgICAgICAgICAnKGdvdDogJyArIHdpZHRoICsgJywgJyArIGhlaWdodCArICcpJyk7XG4gICAgfVxuXG4gICAgLy8gYmFzaWMgY2hhcnQgc2V0IHVwXG4gICAgY2hhcnQuaWQoZWwuaWQpLndpZHRoKHdpZHRoKS5oZWlnaHQoaGVpZ2h0KTtcblxuICAgIGlmIChvcHRpb25zLmltYWdlc0Jhc2VVcmwpIHtcbiAgICAgIGNoYXJ0LmltYWdlc0Jhc2VVcmwob3B0aW9ucy5pbWFnZXNCYXNlVXJsKTtcbiAgICB9XG5cbiAgICBkMy5zZWxlY3QoZWwpLmNhbGwoY2hhcnQpO1xuXG4gICAgcmV0dXJuIGNoYXJ0O1xuICB9O1xuXG4gIGNoYXJ0LnNldHVwUG9vbHMgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBtZXNzYWdlcyBwb29sXG4gICAgcG9vbE1lc3NhZ2VzID0gY2hhcnQubmV3UG9vbCgpXG4gICAgICAuaWQoJ3Bvb2xNZXNzYWdlcycsIGNoYXJ0LnBvb2xHcm91cCgpKVxuICAgICAgLmxhYmVsKCcnKVxuICAgICAgLmluZGV4KGNoYXJ0LnBvb2xzKCkuaW5kZXhPZihwb29sTWVzc2FnZXMpKVxuICAgICAgLndlaWdodCgwLjUpO1xuXG4gICAgLy8gYmxvb2QgZ2x1Y29zZSBkYXRhIHBvb2xcbiAgICBwb29sQkcgPSBjaGFydC5uZXdQb29sKClcbiAgICAgIC5pZCgncG9vbEJHJywgY2hhcnQucG9vbEdyb3VwKCkpXG4gICAgICAubGFiZWwoW3tcbiAgICAgICAgJ21haW4nOiAnQmxvb2QgR2x1Y29zZScsXG4gICAgICAgICdsaWdodCc6ICcgKCcgKyBjaGFydC5vcHRpb25zLmJnVW5pdHMgKyAnKSdcbiAgICAgIH1dKVxuICAgICAgLmxlZ2VuZChbJ2JnJ10pXG4gICAgICAuaW5kZXgoY2hhcnQucG9vbHMoKS5pbmRleE9mKHBvb2xCRykpXG4gICAgICAud2VpZ2h0KDEuNSk7XG5cbiAgICAvLyBjYXJicyBhbmQgYm9sdXNlcyBkYXRhIHBvb2xcbiAgICBwb29sQm9sdXMgPSBjaGFydC5uZXdQb29sKClcbiAgICAgIC5pZCgncG9vbEJvbHVzJywgY2hhcnQucG9vbEdyb3VwKCkpXG4gICAgICAubGFiZWwoW3tcbiAgICAgICAgJ21haW4nOiAnQm9sdXMnLFxuICAgICAgICAnbGlnaHQnOiAnIChVKSdcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgICdtYWluJzogJyAmIENhcmJvaHlkcmF0ZXMnLFxuICAgICAgICAnbGlnaHQnOiAnIChnKSdcbiAgICAgIH1dKVxuICAgICAgLmxlZ2VuZChbJ2JvbHVzJywgJ2NhcmJzJ10pXG4gICAgICAuaW5kZXgoY2hhcnQucG9vbHMoKS5pbmRleE9mKHBvb2xCb2x1cykpXG4gICAgICAud2VpZ2h0KDEuNSk7XG5cbiAgICAvLyBiYXNhbCBkYXRhIHBvb2xcbiAgICBwb29sQmFzYWwgPSBjaGFydC5uZXdQb29sKClcbiAgICAgIC5pZCgncG9vbEJhc2FsJywgY2hhcnQucG9vbEdyb3VwKCkpXG4gICAgICAubGFiZWwoW3tcbiAgICAgICAgJ21haW4nOiAnQmFzYWwgUmF0ZXMnLFxuICAgICAgICAnbGlnaHQnOiAnIChVL2hyKSdcbiAgICAgIH1dKVxuICAgICAgLmxlZ2VuZChbJ2Jhc2FsJ10pXG4gICAgICAuaW5kZXgoY2hhcnQucG9vbHMoKS5pbmRleE9mKHBvb2xCYXNhbCkpXG4gICAgICAud2VpZ2h0KDEuMCk7XG5cbiAgICAvLyBzdGF0cyBkYXRhIHBvb2xcbiAgICBwb29sU3RhdHMgPSBjaGFydC5uZXdQb29sKClcbiAgICAgIC5pZCgncG9vbFN0YXRzJywgY2hhcnQucG9vbEdyb3VwKCkpXG4gICAgICAuaW5kZXgoY2hhcnQucG9vbHMoKS5pbmRleE9mKHBvb2xTdGF0cykpXG4gICAgICAud2VpZ2h0KDEuMCk7XG5cbiAgICBjaGFydC5hcnJhbmdlUG9vbHMoKTtcblxuICAgIGNoYXJ0LnNldEFubm90YXRpb24oKS5zZXRUb29sdGlwKCk7XG5cbiAgICAvLyBhZGQgYW5ub3RhdGlvbnNcbiAgICBjaGFydC5hbm5vdGF0aW9ucygpLmFkZEdyb3VwKGQzLnNlbGVjdCgnIycgKyBjaGFydC5pZCgpKS5zZWxlY3QoJyMnICsgcG9vbEJvbHVzLmlkKCkpLCAnYm9sdXMnKTtcbiAgICBjaGFydC5hbm5vdGF0aW9ucygpLmFkZEdyb3VwKGQzLnNlbGVjdCgnIycgKyBjaGFydC5pZCgpKS5zZWxlY3QoJyMnICsgcG9vbEJhc2FsLmlkKCkpLCAnYmFzYWwtcmF0ZS1zZWdtZW50Jyk7XG4gICAgY2hhcnQuYW5ub3RhdGlvbnMoKS5hZGRHcm91cChkMy5zZWxlY3QoJyMnICsgY2hhcnQuaWQoKSkuc2VsZWN0KCcjJyArIHBvb2xTdGF0cy5pZCgpKSwgJ3N0YXRzJyk7XG5cbiAgICAvLyBhZGQgdG9vbHRpcHNcbiAgICBjaGFydC50b29sdGlwcygpLmFkZEdyb3VwKGQzLnNlbGVjdCgnIycgKyBjaGFydC5pZCgpKS5zZWxlY3QoJyMnICsgcG9vbEJHLmlkKCkpLCAnY2JnJyk7XG4gICAgY2hhcnQudG9vbHRpcHMoKS5hZGRHcm91cChkMy5zZWxlY3QoJyMnICsgY2hhcnQuaWQoKSkuc2VsZWN0KCcjJyArIHBvb2xCRy5pZCgpKSwgJ3NtYmcnKTtcbiAgICBjaGFydC50b29sdGlwcygpLmFkZEdyb3VwKGQzLnNlbGVjdCgnIycgKyBjaGFydC5pZCgpKS5zZWxlY3QoJyMnICsgcG9vbEJvbHVzLmlkKCkpLCAnY2FyYnMnKTtcbiAgICBjaGFydC50b29sdGlwcygpLmFkZEdyb3VwKGQzLnNlbGVjdCgnIycgKyBjaGFydC5pZCgpKS5zZWxlY3QoJyMnICsgcG9vbEJvbHVzLmlkKCkpLCAnYm9sdXMnKTtcbiAgICBjaGFydC50b29sdGlwcygpLmFkZEdyb3VwKGQzLnNlbGVjdCgnIycgKyBjaGFydC5pZCgpKS5zZWxlY3QoJyMnICsgcG9vbEJhc2FsLmlkKCkpLCAnYmFzYWwnKTtcblxuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC5sb2FkID0gZnVuY3Rpb24odGlkZWxpbmVEYXRhLCBkYXRldGltZSkge1xuICAgIHZhciBkYXRhID0gdGlkZWxpbmVEYXRhLmRhdGE7XG4gICAgY2hhcnQudGlkZWxpbmVEYXRhID0gdGlkZWxpbmVEYXRhO1xuXG4gICAgdmFyIGJhc2FsVXRpbCA9IHRpZGVsaW5lRGF0YS5iYXNhbFV0aWw7XG4gICAgdmFyIGJvbHVzVXRpbCA9IHRpZGVsaW5lRGF0YS5ib2x1c1V0aWw7XG4gICAgdmFyIGNiZ1V0aWwgPSB0aWRlbGluZURhdGEuY2JnVXRpbDtcbiAgICB2YXIgc21iZ1V0aWwgPSB0aWRlbGluZURhdGEuc21iZ1V0aWw7XG5cbiAgICBjaGFydC5zdG9wTGlzdGVuaW5nKCk7XG4gICAgLy8gaW5pdGlhbGl6ZSBjaGFydCB3aXRoIGRhdGFcbiAgICBjaGFydC5kYXRhKHRpZGVsaW5lRGF0YSkuc2V0QXhlcygpLnNldE5hdigpLnNldFNjcm9sbE5hdigpO1xuXG4gICAgLy8gQkcgcG9vbFxuICAgIHZhciBhbGxCRyA9IF8uZmlsdGVyKGRhdGEsIGZ1bmN0aW9uKGQpIHtcbiAgICAgIGlmICgoZC50eXBlID09PSAnY2JnJykgfHwgKGQudHlwZSA9PT0gJ3NtYmcnKSkge1xuICAgICAgICByZXR1cm4gZDtcbiAgICAgIH1cbiAgICB9KTtcbiAgICB2YXIgc2NhbGVCRyA9IHNjYWxlcy5iZ0xvZyhhbGxCRywgcG9vbEJHLCBTTUJHX1NJWkUvMik7XG4gICAgLy8gc2V0IHVwIHktYXhpc1xuICAgIHBvb2xCRy55QXhpcyhkMy5zdmcuYXhpcygpXG4gICAgICAuc2NhbGUoc2NhbGVCRylcbiAgICAgIC5vcmllbnQoJ2xlZnQnKVxuICAgICAgLm91dGVyVGlja1NpemUoMClcbiAgICAgIC50aWNrVmFsdWVzKHNjYWxlcy5iZ1RpY2tzKGFsbEJHKSlcbiAgICAgIC50aWNrRm9ybWF0KGQzLmZvcm1hdCgnZycpKSk7XG4gICAgLy8gYWRkIGJhY2tncm91bmQgZmlsbCByZWN0YW5nbGVzIHRvIEJHIHBvb2xcbiAgICBwb29sQkcuYWRkUGxvdFR5cGUoJ2ZpbGwnLCBmaWxsKHBvb2xCRywge1xuICAgICAgZW5kcG9pbnRzOiBjaGFydC5lbmRwb2ludHMsXG4gICAgICBndWlkZWxpbmVzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAnY2xhc3MnOiAnZDMtbGluZS1iZy10aHJlc2hvbGQnLFxuICAgICAgICAgICdoZWlnaHQnOiA4MFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgJ2NsYXNzJzogJ2QzLWxpbmUtYmctdGhyZXNob2xkJyxcbiAgICAgICAgICAnaGVpZ2h0JzogMTgwXG4gICAgICAgIH1cbiAgICAgIF0sXG4gICAgICB5U2NhbGU6IHNjYWxlQkdcbiAgICB9KSwgZmFsc2UsIHRydWUpO1xuXG4gICAgLy8gYWRkIENCRyBkYXRhIHRvIEJHIHBvb2xcbiAgICBwb29sQkcuYWRkUGxvdFR5cGUoJ2NiZycsIHRpZGVsaW5lLnBsb3QuY2JnKHBvb2xCRywge3lTY2FsZTogc2NhbGVCR30pLCB0cnVlLCB0cnVlKTtcblxuICAgIC8vIGFkZCBTTUJHIGRhdGEgdG8gQkcgcG9vbFxuICAgIHBvb2xCRy5hZGRQbG90VHlwZSgnc21iZycsIHRpZGVsaW5lLnBsb3Quc21iZyhwb29sQkcsIHt5U2NhbGU6IHNjYWxlQkd9KSwgdHJ1ZSwgdHJ1ZSk7XG5cbiAgICAvLyBUT0RPOiB3aGVuIHdlIGJyaW5nIHJlc3BvbnNpdmVuZXNzIGluXG4gICAgLy8gZGVjaWRlIG51bWJlciBvZiB0aWNrcyBmb3IgdGhlc2Ugc2NhbGVzIGJhc2VkIG9uIGNvbnRhaW5lciBoZWlnaHQ/XG4gICAgLy8gYm9sdXMgJiBjYXJicyBwb29sXG4gICAgdmFyIHNjYWxlQm9sdXMgPSBzY2FsZXMuYm9sdXModGlkZWxpbmVEYXRhLmdyb3VwZWQuYm9sdXMsIHBvb2xCb2x1cyk7XG4gICAgdmFyIHNjYWxlQ2FyYnMgPSBzY2FsZXMuY2FyYnModGlkZWxpbmVEYXRhLmdyb3VwZWQuY2FyYnMsIHBvb2xCb2x1cyk7XG4gICAgLy8gc2V0IHVwIHktYXhpcyBmb3IgYm9sdXNcbiAgICBwb29sQm9sdXMueUF4aXMoZDMuc3ZnLmF4aXMoKVxuICAgICAgLnNjYWxlKHNjYWxlQm9sdXMpXG4gICAgICAub3JpZW50KCdsZWZ0JylcbiAgICAgIC5vdXRlclRpY2tTaXplKDApXG4gICAgICAudGlja3MoMikpO1xuICAgIC8vIHNldCB1cCB5LWF4aXMgZm9yIGNhcmJzXG4gICAgcG9vbEJvbHVzLnlBeGlzKGQzLnN2Zy5heGlzKClcbiAgICAgIC5zY2FsZShzY2FsZUNhcmJzKVxuICAgICAgLm9yaWVudCgnbGVmdCcpXG4gICAgICAub3V0ZXJUaWNrU2l6ZSgwKVxuICAgICAgLnRpY2tzKDIpKTtcbiAgICAvLyBhZGQgYmFja2dyb3VuZCBmaWxsIHJlY3RhbmdsZXMgdG8gYm9sdXMgcG9vbFxuICAgIHZhciBzY2FsZURpdmlkZXIgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgLmRvbWFpbihbMCwgcG9vbEJvbHVzLmhlaWdodCgpXSlcbiAgICAgIC5yYW5nZShbMCwgcG9vbEJvbHVzLmhlaWdodCgpXSk7XG4gICAgcG9vbEJvbHVzLmFkZFBsb3RUeXBlKCdmaWxsJywgZmlsbChwb29sQm9sdXMsIHtcbiAgICAgIGVuZHBvaW50czogY2hhcnQuZW5kcG9pbnRzLFxuICAgICAgZ3VpZGVsaW5lczogW1xuICAgICAgICB7XG4gICAgICAgICAgJ2NsYXNzJzogJ2QzLWxpbmUtZGl2aWRlcicsXG4gICAgICAgICAgJ2hlaWdodCc6IHBvb2xCb2x1cy5oZWlnaHQoKS8yXG4gICAgICAgIH1cbiAgICAgIF0sXG4gICAgICB5U2NhbGU6IHNjYWxlRGl2aWRlclxuICAgIH0pLCBmYWxzZSwgdHJ1ZSk7XG5cbiAgICAvLyBhZGQgY2FyYnMgZGF0YSB0byBib2x1cyBwb29sXG4gICAgcG9vbEJvbHVzLmFkZFBsb3RUeXBlKCdjYXJicycsIHRpZGVsaW5lLnBsb3QuY2FyYnMocG9vbEJvbHVzLCB7XG4gICAgICB5U2NhbGU6IHNjYWxlQ2FyYnMsXG4gICAgICBlbWl0dGVyOiBlbWl0dGVyLFxuICAgICAgZGF0YTogdGlkZWxpbmVEYXRhLmdyb3VwZWQuY2FyYnNcbiAgICB9KSwgdHJ1ZSwgdHJ1ZSk7XG5cbiAgICAvLyBhZGQgYm9sdXMgZGF0YSB0byBib2x1cyBwb29sXG4gICAgcG9vbEJvbHVzLmFkZFBsb3RUeXBlKCdib2x1cycsIHRpZGVsaW5lLnBsb3QuYm9sdXMocG9vbEJvbHVzLCB7XG4gICAgICB5U2NhbGU6IHNjYWxlQm9sdXMsXG4gICAgICBlbWl0dGVyOiBlbWl0dGVyLFxuICAgICAgZGF0YTogdGlkZWxpbmVEYXRhLmdyb3VwZWQuYm9sdXNcbiAgICB9KSwgdHJ1ZSwgdHJ1ZSk7XG5cbiAgICAvLyBiYXNhbCBwb29sXG4gICAgdmFyIHNjYWxlQmFzYWwgPSBzY2FsZXMuYmFzYWwodGlkZWxpbmVEYXRhLmdyb3VwZWRbJ2Jhc2FsLXJhdGUtc2VnbWVudCddLCBwb29sQmFzYWwpO1xuICAgIC8vIHNldCB1cCB5LWF4aXNcbiAgICBwb29sQmFzYWwueUF4aXMoZDMuc3ZnLmF4aXMoKVxuICAgICAgLnNjYWxlKHNjYWxlQmFzYWwpXG4gICAgICAub3JpZW50KCdsZWZ0JylcbiAgICAgIC5vdXRlclRpY2tTaXplKDApXG4gICAgICAudGlja3MoNCkpO1xuICAgIC8vIGFkZCBiYWNrZ3JvdW5kIGZpbGwgcmVjdGFuZ2xlcyB0byBiYXNhbCBwb29sXG4gICAgcG9vbEJhc2FsLmFkZFBsb3RUeXBlKCdmaWxsJywgZmlsbChwb29sQmFzYWwsIHtlbmRwb2ludHM6IGNoYXJ0LmVuZHBvaW50c30pLCBmYWxzZSwgdHJ1ZSk7XG5cbiAgICAvLyBhZGQgYmFzYWwgZGF0YSB0byBiYXNhbCBwb29sXG4gICAgcG9vbEJhc2FsLmFkZFBsb3RUeXBlKCdiYXNhbC1yYXRlLXNlZ21lbnQnLCB0aWRlbGluZS5wbG90LmJhc2FsKHBvb2xCYXNhbCwge1xuICAgICAgeVNjYWxlOiBzY2FsZUJhc2FsLFxuICAgICAgZGF0YTogdGlkZWxpbmVEYXRhLmdyb3VwZWRbJ2Jhc2FsLXJhdGUtc2VnbWVudCddXG4gICAgfSksIHRydWUsIHRydWUpO1xuXG4gICAgLy8gbWVzc2FnZXMgcG9vbFxuICAgIC8vIGFkZCBiYWNrZ3JvdW5kIGZpbGwgcmVjdGFuZ2xlcyB0byBtZXNzYWdlcyBwb29sXG4gICAgcG9vbE1lc3NhZ2VzLmFkZFBsb3RUeXBlKCdmaWxsJywgZmlsbChwb29sTWVzc2FnZXMsIHtlbmRwb2ludHM6IGNoYXJ0LmVuZHBvaW50c30pLCBmYWxzZSwgdHJ1ZSk7XG5cbiAgICAvLyBhZGQgbWVzc2FnZSBpbWFnZXMgdG8gbWVzc2FnZXMgcG9vbFxuICAgIHBvb2xNZXNzYWdlcy5hZGRQbG90VHlwZSgnbWVzc2FnZScsIHRpZGVsaW5lLnBsb3QubWVzc2FnZShwb29sTWVzc2FnZXMsIHtcbiAgICAgIHNpemU6IDMwLFxuICAgICAgZW1pdHRlcjogZW1pdHRlclxuICAgIH0pLCB0cnVlLCB0cnVlKTtcblxuICAgIC8vIHN0YXRzIHBvb2xcbiAgICBwb29sU3RhdHMuYWRkUGxvdFR5cGUoJ3N0YXRzJywgdGlkZWxpbmUucGxvdC5zdGF0cy53aWRnZXQocG9vbFN0YXRzLCB7XG4gICAgICBjYmc6IGNiZ1V0aWwsXG4gICAgICBzbWJnOiBzbWJnVXRpbCxcbiAgICAgIGJvbHVzOiBib2x1c1V0aWwsXG4gICAgICBiYXNhbDogYmFzYWxVdGlsLFxuICAgICAgeFBvc2l0aW9uOiBjaGFydC5heGlzR3V0dGVyKCksXG4gICAgICB5UG9zaXRpb246IDAsXG4gICAgICBlbWl0dGVyOiBlbWl0dGVyLFxuICAgICAgYXZlcmFnZUxhYmVsOiAnVGhlc2UgMjQgaG91cnMnLFxuICAgICAgcHVkZGxlV2VpZ2h0czoge1xuICAgICAgICByYXRpbzogMS4wLFxuICAgICAgICByYW5nZTogMS4yLFxuICAgICAgICBhdmVyYWdlOiAwLjlcbiAgICAgIH1cbiAgICB9KSwgZmFsc2UsIGZhbHNlKTtcblxuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICAvLyBsb2NhdGUgdGhlIGNoYXJ0IGFyb3VuZCBhIGNlcnRhaW4gZGF0ZXRpbWVcbiAgLy8gaWYgY2FsbGVkIHdpdGhvdXQgYW4gYXJndW1lbnQsIGxvY2F0ZXMgdGhlIGNoYXJ0IGF0IHRoZSBtb3N0IHJlY2VudCAyNCBob3VycyBvZiBkYXRhXG4gIGNoYXJ0LmxvY2F0ZSA9IGZ1bmN0aW9uKGRhdGV0aW1lKSB7XG5cbiAgICB2YXIgc3RhcnQsIGVuZCwgYXRNb3N0UmVjZW50ID0gZmFsc2U7XG5cbiAgICB2YXIgbW9zdFJlY2VudCA9IGZ1bmN0aW9uKCkge1xuICAgICAgc3RhcnQgPSBjaGFydC5pbml0aWFsRW5kcG9pbnRzWzBdO1xuICAgICAgZW5kID0gY2hhcnQuaW5pdGlhbEVuZHBvaW50c1sxXTtcbiAgICB9O1xuXG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICBhdE1vc3RSZWNlbnQgPSB0cnVlO1xuICAgICAgbW9zdFJlY2VudCgpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIC8vIHRyYW5zbGF0ZSB0aGUgZGVzaXJlZCBjZW50ZXItb2YtdmlldyBkYXRldGltZSBpbnRvIGFuIGVkZ2Vwb2ludCBmb3IgdGlkZWxpbmVcbiAgICAgIHN0YXJ0ID0gbmV3IERhdGUoZGF0ZXRpbWUpO1xuICAgICAgY2hhcnQuY3VycmVudENlbnRlcihzdGFydCk7XG4gICAgICB2YXIgcGx1c0hhbGYgPSBuZXcgRGF0ZShzdGFydCk7XG4gICAgICBwbHVzSGFsZi5zZXRVVENIb3VycyhwbHVzSGFsZi5nZXRVVENIb3VycygpICsgMTIpO1xuICAgICAgdmFyIG1pbnVzSGFsZiA9IG5ldyBEYXRlKHN0YXJ0KTtcbiAgICAgIG1pbnVzSGFsZi5zZXRVVENIb3VycyhtaW51c0hhbGYuZ2V0VVRDSG91cnMoKSAtIDEyKTtcbiAgICAgIGlmICgoc3RhcnQudmFsdWVPZigpIDwgY2hhcnQuZW5kcG9pbnRzWzBdKSB8fCAoc3RhcnQudmFsdWVPZigpID4gY2hhcnQuZW5kcG9pbnRzWzFdKSkge1xuICAgICAgICBsb2coJ1BsZWFzZSBkb25cXCd0IGFzayB0aWRlbGluZSB0byBsb2NhdGUgYXQgYSBkYXRlIHRoYXRcXCdzIG91dHNpZGUgb2YgeW91ciBkYXRhIScpO1xuICAgICAgICBsb2coJ1JlbmRlcmluZyBtb3N0IHJlY2VudCBkYXRhIGluc3RlYWQuJyk7XG4gICAgICAgIG1vc3RSZWNlbnQoKTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKHBsdXNIYWxmLnZhbHVlT2YoKSA+IGNoYXJ0LmVuZHBvaW50c1sxXSkge1xuICAgICAgICBtb3N0UmVjZW50KCk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChtaW51c0hhbGYudmFsdWVPZigpIDwgY2hhcnQuZW5kcG9pbnRzWzBdKSB7XG4gICAgICAgIHN0YXJ0ID0gY2hhcnQuZW5kcG9pbnRzWzBdO1xuICAgICAgICB2YXIgZmlyc3RFbmQgPSBuZXcgRGF0ZShzdGFydCk7XG4gICAgICAgIGZpcnN0RW5kLnNldFVUQ0RhdGUoZmlyc3RFbmQuZ2V0VVRDRGF0ZSgpICsgMSk7XG4gICAgICAgIGVuZCA9IGZpcnN0RW5kO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGVuZCA9IG5ldyBEYXRlKHN0YXJ0KTtcbiAgICAgICAgc3RhcnQuc2V0VVRDSG91cnMoc3RhcnQuZ2V0VVRDSG91cnMoKSAtIDEyKTtcbiAgICAgICAgZW5kLnNldFVUQ0hvdXJzKGVuZC5nZXRVVENIb3VycygpICsgMTIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNoYXJ0LnJlbmRlcmVkRGF0YShbc3RhcnQsIGVuZF0pO1xuXG4gICAgLy8gcmVuZGVyIHBvb2xzXG4gICAgXy5lYWNoKGNoYXJ0LnBvb2xzKCksIGZ1bmN0aW9uKHBvb2wpIHtcbiAgICAgIHBvb2wucmVuZGVyKGNoYXJ0LnBvb2xHcm91cCgpLCBjaGFydC5yZW5kZXJlZERhdGEoKSk7XG4gICAgfSk7XG5cbiAgICBjaGFydC5zZXRBdERhdGUoc3RhcnQsIGF0TW9zdFJlY2VudCk7XG5cbiAgICBjaGFydC5uYXZTdHJpbmcoW3N0YXJ0LCBlbmRdKTtcblxuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC5nZXRDdXJyZW50RGF5ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGNoYXJ0LmdldEN1cnJlbnREb21haW4oKS5jZW50ZXI7XG4gIH07XG5cbiAgY2hhcnQuY3JlYXRlTWVzc2FnZSA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgICBsb2coJ05ldyBtZXNzYWdlIGNyZWF0ZWQ6JywgbWVzc2FnZSk7XG4gICAgY2hhcnQudGlkZWxpbmVEYXRhID0gY2hhcnQudGlkZWxpbmVEYXRhLmFkZERhdHVtKG1lc3NhZ2UpO1xuICAgIGNoYXJ0LmRhdGEoY2hhcnQudGlkZWxpbmVEYXRhKTtcbiAgICBjaGFydC5lbWl0dGVyLmVtaXQoJ21lc3NhZ2VDcmVhdGVkJywgbWVzc2FnZSk7XG4gIH07XG5cbiAgY2hhcnQuY2xvc2VNZXNzYWdlID0gZnVuY3Rpb24oKSB7XG4gICAgZDMuc2VsZWN0QWxsKCcuZDMtcmVjdC1tZXNzYWdlJykuY2xhc3NlZCgnaGlkZGVuJywgdHJ1ZSk7XG4gIH07XG5cbiAgY2hhcnQudHlwZSA9ICdkYWlseSc7XG5cbiAgcmV0dXJuIGNyZWF0ZShlbCwgb3B0aW9ucyk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gY2hhcnREYWlseUZhY3Rvcnk7XG4iLCIvKlxuICogPT0gQlNEMiBMSUNFTlNFID09XG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQsIFRpZGVwb29sIFByb2plY3RcbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU7IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnkgaXQgdW5kZXJcbiAqIHRoZSB0ZXJtcyBvZiB0aGUgYXNzb2NpYXRlZCBMaWNlbnNlLCB3aGljaCBpcyBpZGVudGljYWwgdG8gdGhlIEJTRCAyLUNsYXVzZVxuICogTGljZW5zZSBhcyBwdWJsaXNoZWQgYnkgdGhlIE9wZW4gU291cmNlIEluaXRpYXRpdmUgYXQgb3BlbnNvdXJjZS5vcmcuXG4gKiBcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLCBidXQgV0lUSE9VVFxuICogQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2YgTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1NcbiAqIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gU2VlIHRoZSBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKiBcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW07IGlmXG4gKiBub3QsIHlvdSBjYW4gb2J0YWluIG9uZSBmcm9tIFRpZGVwb29sIFByb2plY3QgYXQgdGlkZXBvb2wub3JnLlxuICogPT0gQlNEMiBMSUNFTlNFID09XG4gKi9cblxudmFyIF8gPSB3aW5kb3cuXztcbnZhciBib3dzID0gd2luZG93LmJvd3M7XG52YXIgZDMgPSB3aW5kb3cuZDM7XG5cbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XG5cbnZhciB0aWRlbGluZSA9IHdpbmRvdy50aWRlbGluZTtcbnZhciBmaWxsID0gdGlkZWxpbmUucGxvdC51dGlsLmZpbGw7XG5cbi8vIENyZWF0ZSBhICdUd28gV2Vla3MnIGNoYXJ0IG9iamVjdCB0aGF0IGlzIGEgd3JhcHBlciBhcm91bmQgVGlkZWxpbmUgY29tcG9uZW50c1xuZnVuY3Rpb24gY2hhcnRXZWVrbHlGYWN0b3J5KGVsLCBvcHRpb25zKSB7XG4gIHZhciBsb2cgPSBib3dzKCdXZWVrbHkgRmFjdG9yeScpO1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICB2YXIgZW1pdHRlciA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgdmFyIGNoYXJ0ID0gdGlkZWxpbmUudHdvV2VlayhlbWl0dGVyKTtcbiAgY2hhcnQuZW1pdHRlciA9IGVtaXR0ZXI7XG5cbiAgdmFyIHBvb2xzID0gW107XG5cbiAgdmFyIHNtYmdUaW1lO1xuXG4gIHZhciBjcmVhdGUgPSBmdW5jdGlvbihlbCwgb3B0aW9ucykge1xuICAgIGlmICghZWwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignU29ycnksIHlvdSBtdXN0IHByb3ZpZGUgYSBET00gZWxlbWVudCEgOignKTtcbiAgICB9XG5cbiAgICB2YXIgd2lkdGggPSBlbC5vZmZzZXRXaWR0aDtcbiAgICB2YXIgaGVpZ2h0ID0gZWwub2Zmc2V0SGVpZ2h0O1xuICAgIGlmICghKHdpZHRoICYmIGhlaWdodCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2hhcnQgZWxlbWVudCBtdXN0IGhhdmUgYSBzZXQgd2lkdGggYW5kIGhlaWdodCAnICtcbiAgICAgICAgICAgICAgICAgICAgICAnKGdvdDogJyArIHdpZHRoICsgJywgJyArIGhlaWdodCArICcpJyk7XG4gICAgfVxuXG4gICAgLy8gYmFzaWMgY2hhcnQgc2V0IHVwXG4gICAgY2hhcnQuaWQoZWwuaWQpLndpZHRoKHdpZHRoKS5oZWlnaHQoaGVpZ2h0KTtcblxuICAgIGlmIChvcHRpb25zLmltYWdlc0Jhc2VVcmwpIHtcbiAgICAgIGNoYXJ0LmltYWdlc0Jhc2VVcmwob3B0aW9ucy5pbWFnZXNCYXNlVXJsKTtcbiAgICAgIGNoYXJ0LmRhdGFHdXR0ZXIoOCk7XG4gICAgfVxuXG4gICAgZDMuc2VsZWN0KGVsKS5jYWxsKGNoYXJ0KTtcblxuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC5sb2FkID0gZnVuY3Rpb24odGlkZWxpbmVEYXRhLCBkYXRldGltZSkge1xuICAgIHZhciBiYXNhbFV0aWwgPSB0aWRlbGluZURhdGEuYmFzYWxVdGlsO1xuICAgIHZhciBib2x1c1V0aWwgPSB0aWRlbGluZURhdGEuYm9sdXNVdGlsO1xuICAgIHZhciBjYmdVdGlsID0gdGlkZWxpbmVEYXRhLmNiZ1V0aWw7XG4gICAgdmFyIHNtYmdVdGlsID0gdGlkZWxpbmVEYXRhLnNtYmdVdGlsO1xuXG4gICAgdmFyIHNtYmdEYXRhID0gdGlkZWxpbmVEYXRhLmdyb3VwZWQuc21iZyB8fCBbXTtcblxuICAgIGlmICghZGF0ZXRpbWUpIHtcbiAgICAgIGNoYXJ0LmRhdGEoc21iZ0RhdGEpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGlmIChzbWJnRGF0YS5sZW5ndGggJiZcbiAgICAgICAgICBkYXRldGltZS52YWx1ZU9mKCkgPiBEYXRlLnBhcnNlKHNtYmdEYXRhW3NtYmdEYXRhLmxlbmd0aCAtIDFdLm5vcm1hbFRpbWUpKSB7XG4gICAgICAgIGRhdGV0aW1lID0gc21iZ0RhdGFbc21iZ0RhdGEubGVuZ3RoIC0gMV0ubm9ybWFsVGltZTtcbiAgICAgIH1cbiAgICAgIGNoYXJ0LmRhdGEoc21iZ0RhdGEsIGRhdGV0aW1lKTtcbiAgICB9XG5cbiAgICBjaGFydC5zZXR1cCgpO1xuXG4gICAgdmFyIGRheXMgPSBjaGFydC5kYXlzO1xuXG4gICAgLy8gbWFrZSBwb29scyBmb3IgZWFjaCBkYXlcbiAgICBkYXlzLmZvckVhY2goZnVuY3Rpb24oZGF5LCBpKSB7XG4gICAgICB2YXIgbmV3UG9vbCA9IGNoYXJ0Lm5ld1Bvb2woKVxuICAgICAgICAuaWQoJ3Bvb2xCR18nICsgZGF5LCBjaGFydC5kYXlzR3JvdXAoKSlcbiAgICAgICAgLmluZGV4KGNoYXJ0LnBvb2xzKCkuaW5kZXhPZihuZXdQb29sKSlcbiAgICAgICAgLndlaWdodCgxLjApO1xuICAgIH0pO1xuXG4gICAgY2hhcnQuYXJyYW5nZVBvb2xzKCk7XG4gICAgY2hhcnQuc2V0VG9vbHRpcCgpLnNldEFubm90YXRpb24oKTtcblxuICAgIGNoYXJ0LnNldEF4ZXMoKS5zZXROYXYoKS5zZXRTY3JvbGxOYXYoKTtcblxuICAgIHZhciBmaWxsRW5kcG9pbnRzID0gW25ldyBEYXRlKCcyMDE0LTAxLTAxVDAwOjAwOjAwWicpLCBuZXcgRGF0ZSgnMjAxNC0wMS0wMlQwMDowMDowMFonKV07XG4gICAgdmFyIGZpbGxTY2FsZSA9IGQzLnRpbWUuc2NhbGUudXRjKClcbiAgICAgIC5kb21haW4oZmlsbEVuZHBvaW50cylcbiAgICAgIC5yYW5nZShbY2hhcnQuYXhpc0d1dHRlcigpICsgY2hhcnQuZGF0YUd1dHRlcigpLCBjaGFydC53aWR0aCgpIC0gY2hhcnQubmF2R3V0dGVyKCkgLSBjaGFydC5kYXRhR3V0dGVyKCldKTtcblxuICAgIHNtYmdUaW1lID0gbmV3IHRpZGVsaW5lLnBsb3QuU01CR1RpbWUoe2VtaXR0ZXI6IGVtaXR0ZXJ9KTtcblxuICAgIGNoYXJ0LnBvb2xzKCkuZm9yRWFjaChmdW5jdGlvbihwb29sLCBpKSB7XG4gICAgICB2YXIgZ3V0dGVyO1xuICAgICAgdmFyIGQgPSBuZXcgRGF0ZShwb29sLmlkKCkucmVwbGFjZSgncG9vbEJHXycsICcnKSk7XG4gICAgICB2YXIgZGF5T2ZUaGVXZWVrID0gZC5nZXRVVENEYXkoKTtcbiAgICAgIGlmICgoZGF5T2ZUaGVXZWVrID09PSAwKSB8fCAoZGF5T2ZUaGVXZWVrID09PSA2KSkge1xuICAgICAgICBndXR0ZXIgPSB7J3RvcCc6IDEuNSwgJ2JvdHRvbSc6IDEuNX07XG4gICAgICB9XG4gICAgICAvLyBvbiBNb25kYXlzIHRoZSBib3R0b20gZ3V0dGVyIHNob3VsZCBiZSBhIHdlZWtlbmQgZ3V0dGVyXG4gICAgICBlbHNlIGlmIChkYXlPZlRoZVdlZWsgPT09IDEpIHtcbiAgICAgICAgZ3V0dGVyID0geyd0b3AnOiAwLjUsICdib3R0b20nOiAxLjV9O1xuICAgICAgfVxuICAgICAgLy8gb24gRnJpZGF5cyB0aGUgdG9wIGd1dHRlciBzaG91bGQgYmUgYSB3ZWVrZW5kIGd1dHRlclxuICAgICAgZWxzZSBpZiAoZGF5T2ZUaGVXZWVrID09PSA1KSB7XG4gICAgICAgIGd1dHRlciA9IHsndG9wJzogMS41LCAnYm90dG9tJzogMC41fTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBndXR0ZXIgPSB7J3RvcCc6IDAuNSwgJ2JvdHRvbSc6IDAuNX07XG4gICAgICB9XG4gICAgICBwb29sLmFkZFBsb3RUeXBlKCdmaWxsJywgZmlsbChwb29sLCB7XG4gICAgICAgIGVuZHBvaW50czogZmlsbEVuZHBvaW50cyxcbiAgICAgICAgeFNjYWxlOiBmaWxsU2NhbGUsXG4gICAgICAgIGd1dHRlcjogZ3V0dGVyLFxuICAgICAgICBkYXRhR3V0dGVyOiBjaGFydC5kYXRhR3V0dGVyKClcbiAgICAgIH0pLCBmYWxzZSk7XG4gICAgICBwb29sLmFkZFBsb3RUeXBlKCdzbWJnJywgc21iZ1RpbWUuZHJhdyhwb29sKSwgdHJ1ZSwgdHJ1ZSk7XG4gICAgICBjaGFydC50b29sdGlwcygpLmFkZEdyb3VwKGQzLnNlbGVjdCgnIycgKyBjaGFydC5pZCgpKS5zZWxlY3QoJyMnICsgcG9vbC5pZCgpKSwgcG9vbC5pZCgpKTtcbiAgICAgIHBvb2wucmVuZGVyKGNoYXJ0LmRheXNHcm91cCgpLCBjaGFydC5kYXRhUGVyRGF5W2ldKTtcbiAgICB9KTtcblxuICAgIGNoYXJ0LnBvb2xTdGF0cy5hZGRQbG90VHlwZSgnc3RhdHMnLCB0aWRlbGluZS5wbG90LnN0YXRzLndpZGdldChjaGFydC5wb29sU3RhdHMsIHtcbiAgICAgIGNiZzogY2JnVXRpbCxcbiAgICAgIHNtYmc6IHNtYmdVdGlsLFxuICAgICAgYm9sdXM6IGJvbHVzVXRpbCxcbiAgICAgIGJhc2FsOiBiYXNhbFV0aWwsXG4gICAgICB4UG9zaXRpb246IDAsXG4gICAgICB5UG9zaXRpb246IGNoYXJ0LnBvb2xTdGF0cy5oZWlnaHQoKSAvIDEwLFxuICAgICAgZW1pdHRlcjogZW1pdHRlcixcbiAgICAgIGF2ZXJhZ2VMYWJlbDogJ1RoZXNlIHR3byB3ZWVrcycsXG4gICAgICBwdWRkbGVXZWlnaHRzIDoge1xuICAgICAgICByYXRpbzogMS4xLFxuICAgICAgICByYW5nZTogMS4yLFxuICAgICAgICBhdmVyYWdlOiAxLjBcbiAgICAgIH1cbiAgICB9KSwgZmFsc2UsIGZhbHNlKTtcblxuICAgIGNoYXJ0LnBvb2xTdGF0cy5yZW5kZXIoY2hhcnQucG9vbEdyb3VwKCkpO1xuXG4gICAgY2hhcnQuYW5ub3RhdGlvbnMoKS5hZGRHcm91cChkMy5zZWxlY3QoJyMnICsgY2hhcnQuaWQoKSkuc2VsZWN0KCcjJyArIGNoYXJ0LnBvb2xTdGF0cy5pZCgpKSwgJ3N0YXRzJyk7XG5cbiAgICBjaGFydC5uYXZTdHJpbmcoKTtcblxuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC5zaG93VmFsdWVzID0gZnVuY3Rpb24oKSB7XG4gICAgc21iZ1RpbWUuc2hvd1ZhbHVlcygpO1xuICB9O1xuXG4gIGNoYXJ0LmhpZGVWYWx1ZXMgPSBmdW5jdGlvbigpIHtcbiAgICBzbWJnVGltZS5oaWRlVmFsdWVzKCk7XG4gIH07XG5cbiAgY2hhcnQudHlwZSA9ICd3ZWVrbHknO1xuXG4gIHJldHVybiBjcmVhdGUoZWwsIG9wdGlvbnMpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNoYXJ0V2Vla2x5RmFjdG9yeTtcbiIsIi8qIFxuICogPT0gQlNEMiBMSUNFTlNFID09XG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQsIFRpZGVwb29sIFByb2plY3RcbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU7IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnkgaXQgdW5kZXJcbiAqIHRoZSB0ZXJtcyBvZiB0aGUgYXNzb2NpYXRlZCBMaWNlbnNlLCB3aGljaCBpcyBpZGVudGljYWwgdG8gdGhlIEJTRCAyLUNsYXVzZVxuICogTGljZW5zZSBhcyBwdWJsaXNoZWQgYnkgdGhlIE9wZW4gU291cmNlIEluaXRpYXRpdmUgYXQgb3BlbnNvdXJjZS5vcmcuXG4gKiBcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLCBidXQgV0lUSE9VVFxuICogQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2YgTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1NcbiAqIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gU2VlIHRoZSBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKiBcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW07IGlmXG4gKiBub3QsIHlvdSBjYW4gb2J0YWluIG9uZSBmcm9tIFRpZGVwb29sIFByb2plY3QgYXQgdGlkZXBvb2wub3JnLlxuICogPT0gQlNEMiBMSUNFTlNFID09XG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIG9uZWRheTogcmVxdWlyZSgnLi9jaGFydGRhaWx5ZmFjdG9yeScpLFxuICB0d293ZWVrOiByZXF1aXJlKCcuL2NoYXJ0d2Vla2x5ZmFjdG9yeScpLFxuICBzZXR0aW5nczogcmVxdWlyZSgnLi9zZXR0aW5nc2ZhY3RvcnknKVxufTsiLCIvKiBcbiAqID09IEJTRDIgTElDRU5TRSA9PVxuICogQ29weXJpZ2h0IChjKSAyMDE0LCBUaWRlcG9vbCBQcm9qZWN0XG4gKiBcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOyB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5IGl0IHVuZGVyXG4gKiB0aGUgdGVybXMgb2YgdGhlIGFzc29jaWF0ZWQgTGljZW5zZSwgd2hpY2ggaXMgaWRlbnRpY2FsIHRvIHRoZSBCU0QgMi1DbGF1c2VcbiAqIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5IHRoZSBPcGVuIFNvdXJjZSBJbml0aWF0aXZlIGF0IG9wZW5zb3VyY2Uub3JnLlxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCwgYnV0IFdJVEhPVVRcbiAqIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTXG4gKiBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuIFNlZSB0aGUgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICogXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtOyBpZlxuICogbm90LCB5b3UgY2FuIG9idGFpbiBvbmUgZnJvbSBUaWRlcG9vbCBQcm9qZWN0IGF0IHRpZGVwb29sLm9yZy5cbiAqID09IEJTRDIgTElDRU5TRSA9PVxuICovXG5cbnZhciBfID0gd2luZG93Ll87XG52YXIgYm93cyA9IHdpbmRvdy5ib3dzO1xudmFyIGQzID0gd2luZG93LmQzO1xuXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xuXG52YXIgdGlkZWxpbmUgPSB3aW5kb3cudGlkZWxpbmU7XG5cbmZ1bmN0aW9uIHNldHRpbmdzRmFjdG9yeShlbCwgb3B0aW9ucykge1xuICB2YXIgbG9nID0gYm93cygnU2V0dGluZ3MgRmFjdG9yeScpO1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICB2YXIgZW1pdHRlciA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgdmFyIHBhZ2UgPSB0aWRlbGluZS5zZXR0aW5ncyhlbWl0dGVyKTtcbiAgcGFnZS5lbWl0dGVyID0gZW1pdHRlcjtcblxuICB2YXIgY3JlYXRlID0gZnVuY3Rpb24oZWwsIG9wdGlvbnMpIHtcbiAgICBpZiAoIWVsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1NvcnJ5LCB5b3UgbXVzdCBwcm92aWRlIGEgRE9NIGVsZW1lbnQhIDooJyk7XG4gICAgfVxuXG4gICAgZDMuc2VsZWN0KGVsKS5jYWxsKHBhZ2UpO1xuXG4gICAgcmV0dXJuIHBhZ2U7XG4gIH07XG5cbiAgcGFnZS5sb2FkID0gZnVuY3Rpb24oZGF0YSkge1xuICAgIHBhZ2UuZGF0YShkYXRhKS5yZW5kZXIoKTtcblxuICAgIHJldHVybiBwYWdlO1xuICB9O1xuXG4gIHBhZ2UudHlwZSA9ICdzZXR0aW5ncyc7XG5cbiAgcmV0dXJuIGNyZWF0ZShlbCwgb3B0aW9ucyk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gc2V0dGluZ3NGYWN0b3J5OyIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiJdfQ==
(3)
});
