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

  var emitter = new EventEmitter();
  var chart = tideline.oneDay(emitter);
  chart.emitter = emitter;

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
      .label('Blood Glucose')
      .index(chart.pools().indexOf(poolBG))
      .weight(1.5);

    // carbs and boluses data pool
    poolBolus = chart.newPool()
      .id('poolBolus', chart.poolGroup())
      .label('Bolus & Carbohydrates')
      .index(chart.pools().indexOf(poolBolus))
      .weight(1.5);

    // basal data pool
    poolBasal = chart.newPool()
      .id('poolBasal', chart.poolGroup())
      .label('Basal Rates')
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
    chart.annotations().addGroup(d3.select('#' + chart.id()).select('#' + poolBolus.id()), 'carbs');
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
    poolBG.addPlotType('fill', fill(poolBG, {endpoints: chart.endpoints}), false, true);

    // add CBG data to BG pool
    poolBG.addPlotType('cbg', tideline.plot.cbg(poolBG, {yScale: scaleBG}), true, true);

    // add SMBG data to BG pool
    poolBG.addPlotType('smbg', tideline.plot.smbg(poolBG, {yScale: scaleBG}), true, true);

    // bolus & carbs pool
    var scaleBolus = scales.bolus(tidelineData.grouped.bolus, poolBolus);
    var scaleCarbs = scales.carbs(tidelineData.grouped.carbs, poolBolus);
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
    poolBolus.addPlotType('fill', fill(poolBolus, {endpoints: chart.endpoints}), false, true);

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
      bolus: bolusUtil,
      basal: basalUtil,
      xPosition: chart.axisGutter(),
      yPosition: 0,
      emitter: emitter,
      oneDay: true
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

    chart.setAtDate(start, atMostRecent);

    // render pools
    _.each(chart.pools(), function(pool) {
      pool.render(chart.poolGroup(), chart.renderedData());
      pool.pan({'translate': [chart.currentTranslation(), 0]});
    });

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
    chart.setAnnotation();

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
      pool.render(chart.daysGroup(), chart.dataPerDay[i]);
    });

    chart.poolStats.addPlotType('stats', tideline.plot.stats.widget(chart.poolStats, {
      cbg: cbgUtil,
      bolus: bolusUtil,
      basal: basalUtil,
      xPosition: 0,
      yPosition: chart.poolStats.height() / 10,
      emitter: emitter,
      oneDay: false
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
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1ZvbHVtZXMvVGlkZXBvb2wvdGlkZWxpbmUvcGx1Z2lucy9ibGlwL2NoYXJ0ZGFpbHlmYWN0b3J5LmpzIiwiL1ZvbHVtZXMvVGlkZXBvb2wvdGlkZWxpbmUvcGx1Z2lucy9ibGlwL2NoYXJ0d2Vla2x5ZmFjdG9yeS5qcyIsIi9Wb2x1bWVzL1RpZGVwb29sL3RpZGVsaW5lL3BsdWdpbnMvYmxpcC9pbmRleC5qcyIsIi9Wb2x1bWVzL1RpZGVwb29sL3RpZGVsaW5lL3BsdWdpbnMvYmxpcC9zZXR0aW5nc2ZhY3RvcnkuanMiLCIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKlxuICogPT0gQlNEMiBMSUNFTlNFID09XG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQsIFRpZGVwb29sIFByb2plY3RcbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU7IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnkgaXQgdW5kZXJcbiAqIHRoZSB0ZXJtcyBvZiB0aGUgYXNzb2NpYXRlZCBMaWNlbnNlLCB3aGljaCBpcyBpZGVudGljYWwgdG8gdGhlIEJTRCAyLUNsYXVzZVxuICogTGljZW5zZSBhcyBwdWJsaXNoZWQgYnkgdGhlIE9wZW4gU291cmNlIEluaXRpYXRpdmUgYXQgb3BlbnNvdXJjZS5vcmcuXG4gKiBcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLCBidXQgV0lUSE9VVFxuICogQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2YgTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1NcbiAqIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gU2VlIHRoZSBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKiBcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW07IGlmXG4gKiBub3QsIHlvdSBjYW4gb2J0YWluIG9uZSBmcm9tIFRpZGVwb29sIFByb2plY3QgYXQgdGlkZXBvb2wub3JnLlxuICogPT0gQlNEMiBMSUNFTlNFID09XG4gKi9cblxudmFyIF8gPSB3aW5kb3cuXztcbnZhciBib3dzID0gd2luZG93LmJvd3M7XG52YXIgZDMgPSB3aW5kb3cuZDM7XG5cbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XG5cbnZhciB0aWRlbGluZSA9IHdpbmRvdy50aWRlbGluZTtcbnZhciBmaWxsID0gdGlkZWxpbmUucGxvdC51dGlsLmZpbGw7XG52YXIgc2NhbGVzID0gdGlkZWxpbmUucGxvdC51dGlsLnNjYWxlcztcblxuLy8gQ3JlYXRlIGEgJ09uZSBEYXknIGNoYXJ0IG9iamVjdCB0aGF0IGlzIGEgd3JhcHBlciBhcm91bmQgVGlkZWxpbmUgY29tcG9uZW50c1xuZnVuY3Rpb24gY2hhcnREYWlseUZhY3RvcnkoZWwsIG9wdGlvbnMpIHtcbiAgdmFyIGxvZyA9IGJvd3MoJ0RhaWx5IEZhY3RvcnknKTtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgdmFyIGVtaXR0ZXIgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gIHZhciBjaGFydCA9IHRpZGVsaW5lLm9uZURheShlbWl0dGVyKTtcbiAgY2hhcnQuZW1pdHRlciA9IGVtaXR0ZXI7XG5cbiAgdmFyIHBvb2xNZXNzYWdlcywgcG9vbEJHLCBwb29sQm9sdXMsIHBvb2xCYXNhbCwgcG9vbFN0YXRzO1xuXG4gIHZhciBTTUJHX1NJWkUgPSAxNjtcblxuICB2YXIgY3JlYXRlID0gZnVuY3Rpb24oZWwsIG9wdGlvbnMpIHtcblxuICAgIGlmICghZWwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignU29ycnksIHlvdSBtdXN0IHByb3ZpZGUgYSBET00gZWxlbWVudCEgOignKTtcbiAgICB9XG5cbiAgICB2YXIgd2lkdGggPSBlbC5vZmZzZXRXaWR0aDtcbiAgICB2YXIgaGVpZ2h0ID0gZWwub2Zmc2V0SGVpZ2h0O1xuICAgIGlmICghKHdpZHRoICYmIGhlaWdodCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2hhcnQgZWxlbWVudCBtdXN0IGhhdmUgYSBzZXQgd2lkdGggYW5kIGhlaWdodCAnICtcbiAgICAgICAgICAgICAgICAgICAgICAnKGdvdDogJyArIHdpZHRoICsgJywgJyArIGhlaWdodCArICcpJyk7XG4gICAgfVxuXG4gICAgLy8gYmFzaWMgY2hhcnQgc2V0IHVwXG4gICAgY2hhcnQud2lkdGgod2lkdGgpLmhlaWdodChoZWlnaHQpO1xuXG4gICAgaWYgKG9wdGlvbnMuaW1hZ2VzQmFzZVVybCkge1xuICAgICAgY2hhcnQuaW1hZ2VzQmFzZVVybChvcHRpb25zLmltYWdlc0Jhc2VVcmwpO1xuICAgIH1cblxuICAgIGQzLnNlbGVjdChlbCkuY2FsbChjaGFydCk7XG5cbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQuc2V0dXBQb29scyA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIG1lc3NhZ2VzIHBvb2xcbiAgICBwb29sTWVzc2FnZXMgPSBjaGFydC5uZXdQb29sKClcbiAgICAgIC5pZCgncG9vbE1lc3NhZ2VzJywgY2hhcnQucG9vbEdyb3VwKCkpXG4gICAgICAubGFiZWwoJycpXG4gICAgICAuaW5kZXgoY2hhcnQucG9vbHMoKS5pbmRleE9mKHBvb2xNZXNzYWdlcykpXG4gICAgICAud2VpZ2h0KDAuNSk7XG5cbiAgICAvLyBibG9vZCBnbHVjb3NlIGRhdGEgcG9vbFxuICAgIHBvb2xCRyA9IGNoYXJ0Lm5ld1Bvb2woKVxuICAgICAgLmlkKCdwb29sQkcnLCBjaGFydC5wb29sR3JvdXAoKSlcbiAgICAgIC5sYWJlbCgnQmxvb2QgR2x1Y29zZScpXG4gICAgICAuaW5kZXgoY2hhcnQucG9vbHMoKS5pbmRleE9mKHBvb2xCRykpXG4gICAgICAud2VpZ2h0KDEuNSk7XG5cbiAgICAvLyBjYXJicyBhbmQgYm9sdXNlcyBkYXRhIHBvb2xcbiAgICBwb29sQm9sdXMgPSBjaGFydC5uZXdQb29sKClcbiAgICAgIC5pZCgncG9vbEJvbHVzJywgY2hhcnQucG9vbEdyb3VwKCkpXG4gICAgICAubGFiZWwoJ0JvbHVzICYgQ2FyYm9oeWRyYXRlcycpXG4gICAgICAuaW5kZXgoY2hhcnQucG9vbHMoKS5pbmRleE9mKHBvb2xCb2x1cykpXG4gICAgICAud2VpZ2h0KDEuNSk7XG5cbiAgICAvLyBiYXNhbCBkYXRhIHBvb2xcbiAgICBwb29sQmFzYWwgPSBjaGFydC5uZXdQb29sKClcbiAgICAgIC5pZCgncG9vbEJhc2FsJywgY2hhcnQucG9vbEdyb3VwKCkpXG4gICAgICAubGFiZWwoJ0Jhc2FsIFJhdGVzJylcbiAgICAgIC5pbmRleChjaGFydC5wb29scygpLmluZGV4T2YocG9vbEJhc2FsKSlcbiAgICAgIC53ZWlnaHQoMS4wKTtcblxuICAgIC8vIHN0YXRzIGRhdGEgcG9vbFxuICAgIHBvb2xTdGF0cyA9IGNoYXJ0Lm5ld1Bvb2woKVxuICAgICAgLmlkKCdwb29sU3RhdHMnLCBjaGFydC5wb29sR3JvdXAoKSlcbiAgICAgIC5pbmRleChjaGFydC5wb29scygpLmluZGV4T2YocG9vbFN0YXRzKSlcbiAgICAgIC53ZWlnaHQoMS4wKTtcblxuICAgIGNoYXJ0LmFycmFuZ2VQb29scygpO1xuXG4gICAgY2hhcnQuc2V0QW5ub3RhdGlvbigpLnNldFRvb2x0aXAoKTtcblxuICAgIC8vIGFkZCBhbm5vdGF0aW9uc1xuICAgIGNoYXJ0LmFubm90YXRpb25zKCkuYWRkR3JvdXAoZDMuc2VsZWN0KCcjJyArIGNoYXJ0LmlkKCkpLnNlbGVjdCgnIycgKyBwb29sQm9sdXMuaWQoKSksICdjYXJicycpO1xuICAgIGNoYXJ0LmFubm90YXRpb25zKCkuYWRkR3JvdXAoZDMuc2VsZWN0KCcjJyArIGNoYXJ0LmlkKCkpLnNlbGVjdCgnIycgKyBwb29sQm9sdXMuaWQoKSksICdib2x1cycpO1xuICAgIGNoYXJ0LmFubm90YXRpb25zKCkuYWRkR3JvdXAoZDMuc2VsZWN0KCcjJyArIGNoYXJ0LmlkKCkpLnNlbGVjdCgnIycgKyBwb29sQmFzYWwuaWQoKSksICdiYXNhbC1yYXRlLXNlZ21lbnQnKTtcbiAgICBjaGFydC5hbm5vdGF0aW9ucygpLmFkZEdyb3VwKGQzLnNlbGVjdCgnIycgKyBjaGFydC5pZCgpKS5zZWxlY3QoJyMnICsgcG9vbFN0YXRzLmlkKCkpLCAnc3RhdHMnKTtcblxuICAgIC8vIGFkZCB0b29sdGlwc1xuICAgIGNoYXJ0LnRvb2x0aXBzKCkuYWRkR3JvdXAoZDMuc2VsZWN0KCcjJyArIGNoYXJ0LmlkKCkpLnNlbGVjdCgnIycgKyBwb29sQkcuaWQoKSksICdjYmcnKTtcbiAgICBjaGFydC50b29sdGlwcygpLmFkZEdyb3VwKGQzLnNlbGVjdCgnIycgKyBjaGFydC5pZCgpKS5zZWxlY3QoJyMnICsgcG9vbEJHLmlkKCkpLCAnc21iZycpO1xuICAgIGNoYXJ0LnRvb2x0aXBzKCkuYWRkR3JvdXAoZDMuc2VsZWN0KCcjJyArIGNoYXJ0LmlkKCkpLnNlbGVjdCgnIycgKyBwb29sQm9sdXMuaWQoKSksICdjYXJicycpO1xuICAgIGNoYXJ0LnRvb2x0aXBzKCkuYWRkR3JvdXAoZDMuc2VsZWN0KCcjJyArIGNoYXJ0LmlkKCkpLnNlbGVjdCgnIycgKyBwb29sQm9sdXMuaWQoKSksICdib2x1cycpO1xuICAgIGNoYXJ0LnRvb2x0aXBzKCkuYWRkR3JvdXAoZDMuc2VsZWN0KCcjJyArIGNoYXJ0LmlkKCkpLnNlbGVjdCgnIycgKyBwb29sQmFzYWwuaWQoKSksICdiYXNhbCcpO1xuXG4gICAgcmV0dXJuIGNoYXJ0O1xuICB9O1xuXG4gIGNoYXJ0LmxvYWQgPSBmdW5jdGlvbih0aWRlbGluZURhdGEsIGRhdGV0aW1lKSB7XG4gICAgdmFyIGRhdGEgPSB0aWRlbGluZURhdGEuZGF0YTtcbiAgICBjaGFydC50aWRlbGluZURhdGEgPSB0aWRlbGluZURhdGE7XG5cbiAgICB2YXIgYmFzYWxVdGlsID0gdGlkZWxpbmVEYXRhLmJhc2FsVXRpbDtcbiAgICB2YXIgYm9sdXNVdGlsID0gdGlkZWxpbmVEYXRhLmJvbHVzVXRpbDtcbiAgICB2YXIgY2JnVXRpbCA9IHRpZGVsaW5lRGF0YS5jYmdVdGlsO1xuXG4gICAgY2hhcnQuc3RvcExpc3RlbmluZygpO1xuICAgIC8vIGluaXRpYWxpemUgY2hhcnQgd2l0aCBkYXRhXG4gICAgY2hhcnQuZGF0YSh0aWRlbGluZURhdGEpLnNldEF4ZXMoKS5zZXROYXYoKS5zZXRTY3JvbGxOYXYoKTtcblxuICAgIC8vIEJHIHBvb2xcbiAgICB2YXIgYWxsQkcgPSBfLmZpbHRlcihkYXRhLCBmdW5jdGlvbihkKSB7XG4gICAgICBpZiAoKGQudHlwZSA9PT0gJ2NiZycpIHx8IChkLnR5cGUgPT09ICdzbWJnJykpIHtcbiAgICAgICAgcmV0dXJuIGQ7XG4gICAgICB9XG4gICAgfSk7XG4gICAgdmFyIHNjYWxlQkcgPSBzY2FsZXMuYmdMb2coYWxsQkcsIHBvb2xCRywgU01CR19TSVpFLzIpO1xuICAgIC8vIHNldCB1cCB5LWF4aXNcbiAgICBwb29sQkcueUF4aXMoZDMuc3ZnLmF4aXMoKVxuICAgICAgLnNjYWxlKHNjYWxlQkcpXG4gICAgICAub3JpZW50KCdsZWZ0JylcbiAgICAgIC5vdXRlclRpY2tTaXplKDApXG4gICAgICAudGlja1ZhbHVlcyhzY2FsZXMuYmdUaWNrcyhhbGxCRykpXG4gICAgICAudGlja0Zvcm1hdChkMy5mb3JtYXQoJ2cnKSkpO1xuICAgIC8vIGFkZCBiYWNrZ3JvdW5kIGZpbGwgcmVjdGFuZ2xlcyB0byBCRyBwb29sXG4gICAgcG9vbEJHLmFkZFBsb3RUeXBlKCdmaWxsJywgZmlsbChwb29sQkcsIHtlbmRwb2ludHM6IGNoYXJ0LmVuZHBvaW50c30pLCBmYWxzZSwgdHJ1ZSk7XG5cbiAgICAvLyBhZGQgQ0JHIGRhdGEgdG8gQkcgcG9vbFxuICAgIHBvb2xCRy5hZGRQbG90VHlwZSgnY2JnJywgdGlkZWxpbmUucGxvdC5jYmcocG9vbEJHLCB7eVNjYWxlOiBzY2FsZUJHfSksIHRydWUsIHRydWUpO1xuXG4gICAgLy8gYWRkIFNNQkcgZGF0YSB0byBCRyBwb29sXG4gICAgcG9vbEJHLmFkZFBsb3RUeXBlKCdzbWJnJywgdGlkZWxpbmUucGxvdC5zbWJnKHBvb2xCRywge3lTY2FsZTogc2NhbGVCR30pLCB0cnVlLCB0cnVlKTtcblxuICAgIC8vIGJvbHVzICYgY2FyYnMgcG9vbFxuICAgIHZhciBzY2FsZUJvbHVzID0gc2NhbGVzLmJvbHVzKHRpZGVsaW5lRGF0YS5ncm91cGVkLmJvbHVzLCBwb29sQm9sdXMpO1xuICAgIHZhciBzY2FsZUNhcmJzID0gc2NhbGVzLmNhcmJzKHRpZGVsaW5lRGF0YS5ncm91cGVkLmNhcmJzLCBwb29sQm9sdXMpO1xuICAgIC8vIHNldCB1cCB5LWF4aXMgZm9yIGJvbHVzXG4gICAgcG9vbEJvbHVzLnlBeGlzKGQzLnN2Zy5heGlzKClcbiAgICAgIC5zY2FsZShzY2FsZUJvbHVzKVxuICAgICAgLm9yaWVudCgnbGVmdCcpXG4gICAgICAub3V0ZXJUaWNrU2l6ZSgwKVxuICAgICAgLnRpY2tzKDMpKTtcbiAgICAvLyBzZXQgdXAgeS1heGlzIGZvciBjYXJic1xuICAgIHBvb2xCb2x1cy55QXhpcyhkMy5zdmcuYXhpcygpXG4gICAgICAuc2NhbGUoc2NhbGVDYXJicylcbiAgICAgIC5vcmllbnQoJ2xlZnQnKVxuICAgICAgLm91dGVyVGlja1NpemUoMClcbiAgICAgIC50aWNrcygzKSk7XG4gICAgLy8gYWRkIGJhY2tncm91bmQgZmlsbCByZWN0YW5nbGVzIHRvIGJvbHVzIHBvb2xcbiAgICBwb29sQm9sdXMuYWRkUGxvdFR5cGUoJ2ZpbGwnLCBmaWxsKHBvb2xCb2x1cywge2VuZHBvaW50czogY2hhcnQuZW5kcG9pbnRzfSksIGZhbHNlLCB0cnVlKTtcblxuICAgIC8vIGFkZCBjYXJicyBkYXRhIHRvIGJvbHVzIHBvb2xcbiAgICBwb29sQm9sdXMuYWRkUGxvdFR5cGUoJ2NhcmJzJywgdGlkZWxpbmUucGxvdC5jYXJicyhwb29sQm9sdXMsIHtcbiAgICAgIHlTY2FsZTogc2NhbGVDYXJicyxcbiAgICAgIGVtaXR0ZXI6IGVtaXR0ZXIsXG4gICAgICBkYXRhOiB0aWRlbGluZURhdGEuZ3JvdXBlZC5jYXJic1xuICAgIH0pLCB0cnVlLCB0cnVlKTtcblxuICAgIC8vIGFkZCBib2x1cyBkYXRhIHRvIGJvbHVzIHBvb2xcbiAgICBwb29sQm9sdXMuYWRkUGxvdFR5cGUoJ2JvbHVzJywgdGlkZWxpbmUucGxvdC5ib2x1cyhwb29sQm9sdXMsIHtcbiAgICAgIHlTY2FsZTogc2NhbGVCb2x1cyxcbiAgICAgIGVtaXR0ZXI6IGVtaXR0ZXIsXG4gICAgICBkYXRhOiB0aWRlbGluZURhdGEuZ3JvdXBlZC5ib2x1c1xuICAgIH0pLCB0cnVlLCB0cnVlKTtcblxuICAgIC8vIGJhc2FsIHBvb2xcbiAgICB2YXIgc2NhbGVCYXNhbCA9IHNjYWxlcy5iYXNhbCh0aWRlbGluZURhdGEuZ3JvdXBlZFsnYmFzYWwtcmF0ZS1zZWdtZW50J10sIHBvb2xCYXNhbCk7XG4gICAgLy8gc2V0IHVwIHktYXhpc1xuICAgIHBvb2xCYXNhbC55QXhpcyhkMy5zdmcuYXhpcygpXG4gICAgICAuc2NhbGUoc2NhbGVCYXNhbClcbiAgICAgIC5vcmllbnQoJ2xlZnQnKVxuICAgICAgLm91dGVyVGlja1NpemUoMClcbiAgICAgIC50aWNrcyg0KSk7XG4gICAgLy8gYWRkIGJhY2tncm91bmQgZmlsbCByZWN0YW5nbGVzIHRvIGJhc2FsIHBvb2xcbiAgICBwb29sQmFzYWwuYWRkUGxvdFR5cGUoJ2ZpbGwnLCBmaWxsKHBvb2xCYXNhbCwge2VuZHBvaW50czogY2hhcnQuZW5kcG9pbnRzfSksIGZhbHNlLCB0cnVlKTtcblxuICAgIC8vIGFkZCBiYXNhbCBkYXRhIHRvIGJhc2FsIHBvb2xcbiAgICBwb29sQmFzYWwuYWRkUGxvdFR5cGUoJ2Jhc2FsLXJhdGUtc2VnbWVudCcsIHRpZGVsaW5lLnBsb3QuYmFzYWwocG9vbEJhc2FsLCB7XG4gICAgICB5U2NhbGU6IHNjYWxlQmFzYWwsXG4gICAgICBkYXRhOiB0aWRlbGluZURhdGEuZ3JvdXBlZFsnYmFzYWwtcmF0ZS1zZWdtZW50J11cbiAgICB9KSwgdHJ1ZSwgdHJ1ZSk7XG5cbiAgICAvLyBtZXNzYWdlcyBwb29sXG4gICAgLy8gYWRkIGJhY2tncm91bmQgZmlsbCByZWN0YW5nbGVzIHRvIG1lc3NhZ2VzIHBvb2xcbiAgICBwb29sTWVzc2FnZXMuYWRkUGxvdFR5cGUoJ2ZpbGwnLCBmaWxsKHBvb2xNZXNzYWdlcywge2VuZHBvaW50czogY2hhcnQuZW5kcG9pbnRzfSksIGZhbHNlLCB0cnVlKTtcblxuICAgIC8vIGFkZCBtZXNzYWdlIGltYWdlcyB0byBtZXNzYWdlcyBwb29sXG4gICAgcG9vbE1lc3NhZ2VzLmFkZFBsb3RUeXBlKCdtZXNzYWdlJywgdGlkZWxpbmUucGxvdC5tZXNzYWdlKHBvb2xNZXNzYWdlcywge1xuICAgICAgc2l6ZTogMzAsXG4gICAgICBlbWl0dGVyOiBlbWl0dGVyXG4gICAgfSksIHRydWUsIHRydWUpO1xuXG4gICAgLy8gc3RhdHMgcG9vbFxuICAgIHBvb2xTdGF0cy5hZGRQbG90VHlwZSgnc3RhdHMnLCB0aWRlbGluZS5wbG90LnN0YXRzLndpZGdldChwb29sU3RhdHMsIHtcbiAgICAgIGNiZzogY2JnVXRpbCxcbiAgICAgIGJvbHVzOiBib2x1c1V0aWwsXG4gICAgICBiYXNhbDogYmFzYWxVdGlsLFxuICAgICAgeFBvc2l0aW9uOiBjaGFydC5heGlzR3V0dGVyKCksXG4gICAgICB5UG9zaXRpb246IDAsXG4gICAgICBlbWl0dGVyOiBlbWl0dGVyLFxuICAgICAgb25lRGF5OiB0cnVlXG4gICAgfSksIGZhbHNlLCBmYWxzZSk7XG5cbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgLy8gbG9jYXRlIHRoZSBjaGFydCBhcm91bmQgYSBjZXJ0YWluIGRhdGV0aW1lXG4gIC8vIGlmIGNhbGxlZCB3aXRob3V0IGFuIGFyZ3VtZW50LCBsb2NhdGVzIHRoZSBjaGFydCBhdCB0aGUgbW9zdCByZWNlbnQgMjQgaG91cnMgb2YgZGF0YVxuICBjaGFydC5sb2NhdGUgPSBmdW5jdGlvbihkYXRldGltZSkge1xuXG4gICAgdmFyIHN0YXJ0LCBlbmQsIGF0TW9zdFJlY2VudCA9IGZhbHNlO1xuXG4gICAgdmFyIG1vc3RSZWNlbnQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHN0YXJ0ID0gY2hhcnQuaW5pdGlhbEVuZHBvaW50c1swXTtcbiAgICAgIGVuZCA9IGNoYXJ0LmluaXRpYWxFbmRwb2ludHNbMV07XG4gICAgfTtcblxuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgYXRNb3N0UmVjZW50ID0gdHJ1ZTtcbiAgICAgIG1vc3RSZWNlbnQoKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAvLyB0cmFuc2xhdGUgdGhlIGRlc2lyZWQgY2VudGVyLW9mLXZpZXcgZGF0ZXRpbWUgaW50byBhbiBlZGdlcG9pbnQgZm9yIHRpZGVsaW5lXG4gICAgICBzdGFydCA9IG5ldyBEYXRlKGRhdGV0aW1lKTtcbiAgICAgIGNoYXJ0LmN1cnJlbnRDZW50ZXIoc3RhcnQpO1xuICAgICAgdmFyIHBsdXNIYWxmID0gbmV3IERhdGUoc3RhcnQpO1xuICAgICAgcGx1c0hhbGYuc2V0VVRDSG91cnMocGx1c0hhbGYuZ2V0VVRDSG91cnMoKSArIDEyKTtcbiAgICAgIHZhciBtaW51c0hhbGYgPSBuZXcgRGF0ZShzdGFydCk7XG4gICAgICBtaW51c0hhbGYuc2V0VVRDSG91cnMobWludXNIYWxmLmdldFVUQ0hvdXJzKCkgLSAxMik7XG4gICAgICBpZiAoKHN0YXJ0LnZhbHVlT2YoKSA8IGNoYXJ0LmVuZHBvaW50c1swXSkgfHwgKHN0YXJ0LnZhbHVlT2YoKSA+IGNoYXJ0LmVuZHBvaW50c1sxXSkpIHtcbiAgICAgICAgbG9nKCdQbGVhc2UgZG9uXFwndCBhc2sgdGlkZWxpbmUgdG8gbG9jYXRlIGF0IGEgZGF0ZSB0aGF0XFwncyBvdXRzaWRlIG9mIHlvdXIgZGF0YSEnKTtcbiAgICAgICAgbG9nKCdSZW5kZXJpbmcgbW9zdCByZWNlbnQgZGF0YSBpbnN0ZWFkLicpO1xuICAgICAgICBtb3N0UmVjZW50KCk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChwbHVzSGFsZi52YWx1ZU9mKCkgPiBjaGFydC5lbmRwb2ludHNbMV0pIHtcbiAgICAgICAgbW9zdFJlY2VudCgpO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAobWludXNIYWxmLnZhbHVlT2YoKSA8IGNoYXJ0LmVuZHBvaW50c1swXSkge1xuICAgICAgICBzdGFydCA9IGNoYXJ0LmVuZHBvaW50c1swXTtcbiAgICAgICAgdmFyIGZpcnN0RW5kID0gbmV3IERhdGUoc3RhcnQpO1xuICAgICAgICBmaXJzdEVuZC5zZXRVVENEYXRlKGZpcnN0RW5kLmdldFVUQ0RhdGUoKSArIDEpO1xuICAgICAgICBlbmQgPSBmaXJzdEVuZDtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBlbmQgPSBuZXcgRGF0ZShzdGFydCk7XG4gICAgICAgIHN0YXJ0LnNldFVUQ0hvdXJzKHN0YXJ0LmdldFVUQ0hvdXJzKCkgLSAxMik7XG4gICAgICAgIGVuZC5zZXRVVENIb3VycyhlbmQuZ2V0VVRDSG91cnMoKSArIDEyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjaGFydC5yZW5kZXJlZERhdGEoW3N0YXJ0LCBlbmRdKTtcblxuICAgIGNoYXJ0LnNldEF0RGF0ZShzdGFydCwgYXRNb3N0UmVjZW50KTtcblxuICAgIC8vIHJlbmRlciBwb29sc1xuICAgIF8uZWFjaChjaGFydC5wb29scygpLCBmdW5jdGlvbihwb29sKSB7XG4gICAgICBwb29sLnJlbmRlcihjaGFydC5wb29sR3JvdXAoKSwgY2hhcnQucmVuZGVyZWREYXRhKCkpO1xuICAgICAgcG9vbC5wYW4oeyd0cmFuc2xhdGUnOiBbY2hhcnQuY3VycmVudFRyYW5zbGF0aW9uKCksIDBdfSk7XG4gICAgfSk7XG5cbiAgICBjaGFydC5uYXZTdHJpbmcoW3N0YXJ0LCBlbmRdKTtcblxuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC5nZXRDdXJyZW50RGF5ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGNoYXJ0LmdldEN1cnJlbnREb21haW4oKS5jZW50ZXI7XG4gIH07XG5cbiAgY2hhcnQuY3JlYXRlTWVzc2FnZSA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgICBsb2coJ05ldyBtZXNzYWdlIGNyZWF0ZWQ6JywgbWVzc2FnZSk7XG4gICAgY2hhcnQudGlkZWxpbmVEYXRhID0gY2hhcnQudGlkZWxpbmVEYXRhLmFkZERhdHVtKG1lc3NhZ2UpO1xuICAgIGNoYXJ0LmRhdGEoY2hhcnQudGlkZWxpbmVEYXRhKTtcbiAgICBjaGFydC5lbWl0dGVyLmVtaXQoJ21lc3NhZ2VDcmVhdGVkJywgbWVzc2FnZSk7XG4gIH07XG5cbiAgY2hhcnQuY2xvc2VNZXNzYWdlID0gZnVuY3Rpb24oKSB7XG4gICAgZDMuc2VsZWN0QWxsKCcuZDMtcmVjdC1tZXNzYWdlJykuY2xhc3NlZCgnaGlkZGVuJywgdHJ1ZSk7XG4gIH07XG5cbiAgY2hhcnQudHlwZSA9ICdkYWlseSc7XG5cbiAgcmV0dXJuIGNyZWF0ZShlbCwgb3B0aW9ucyk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gY2hhcnREYWlseUZhY3Rvcnk7XG4iLCIvKlxuICogPT0gQlNEMiBMSUNFTlNFID09XG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQsIFRpZGVwb29sIFByb2plY3RcbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU7IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnkgaXQgdW5kZXJcbiAqIHRoZSB0ZXJtcyBvZiB0aGUgYXNzb2NpYXRlZCBMaWNlbnNlLCB3aGljaCBpcyBpZGVudGljYWwgdG8gdGhlIEJTRCAyLUNsYXVzZVxuICogTGljZW5zZSBhcyBwdWJsaXNoZWQgYnkgdGhlIE9wZW4gU291cmNlIEluaXRpYXRpdmUgYXQgb3BlbnNvdXJjZS5vcmcuXG4gKiBcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLCBidXQgV0lUSE9VVFxuICogQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2YgTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1NcbiAqIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gU2VlIHRoZSBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKiBcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW07IGlmXG4gKiBub3QsIHlvdSBjYW4gb2J0YWluIG9uZSBmcm9tIFRpZGVwb29sIFByb2plY3QgYXQgdGlkZXBvb2wub3JnLlxuICogPT0gQlNEMiBMSUNFTlNFID09XG4gKi9cblxudmFyIF8gPSB3aW5kb3cuXztcbnZhciBib3dzID0gd2luZG93LmJvd3M7XG52YXIgZDMgPSB3aW5kb3cuZDM7XG5cbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XG5cbnZhciB0aWRlbGluZSA9IHdpbmRvdy50aWRlbGluZTtcbnZhciBmaWxsID0gdGlkZWxpbmUucGxvdC51dGlsLmZpbGw7XG5cbi8vIENyZWF0ZSBhICdUd28gV2Vla3MnIGNoYXJ0IG9iamVjdCB0aGF0IGlzIGEgd3JhcHBlciBhcm91bmQgVGlkZWxpbmUgY29tcG9uZW50c1xuZnVuY3Rpb24gY2hhcnRXZWVrbHlGYWN0b3J5KGVsLCBvcHRpb25zKSB7XG4gIHZhciBsb2cgPSBib3dzKCdXZWVrbHkgRmFjdG9yeScpO1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICB2YXIgZW1pdHRlciA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgdmFyIGNoYXJ0ID0gdGlkZWxpbmUudHdvV2VlayhlbWl0dGVyKTtcbiAgY2hhcnQuZW1pdHRlciA9IGVtaXR0ZXI7XG5cbiAgdmFyIHBvb2xzID0gW107XG5cbiAgdmFyIHNtYmdUaW1lO1xuXG4gIHZhciBjcmVhdGUgPSBmdW5jdGlvbihlbCwgb3B0aW9ucykge1xuICAgIGlmICghZWwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignU29ycnksIHlvdSBtdXN0IHByb3ZpZGUgYSBET00gZWxlbWVudCEgOignKTtcbiAgICB9XG5cbiAgICB2YXIgd2lkdGggPSBlbC5vZmZzZXRXaWR0aDtcbiAgICB2YXIgaGVpZ2h0ID0gZWwub2Zmc2V0SGVpZ2h0O1xuICAgIGlmICghKHdpZHRoICYmIGhlaWdodCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2hhcnQgZWxlbWVudCBtdXN0IGhhdmUgYSBzZXQgd2lkdGggYW5kIGhlaWdodCAnICtcbiAgICAgICAgICAgICAgICAgICAgICAnKGdvdDogJyArIHdpZHRoICsgJywgJyArIGhlaWdodCArICcpJyk7XG4gICAgfVxuXG4gICAgLy8gYmFzaWMgY2hhcnQgc2V0IHVwXG4gICAgY2hhcnQud2lkdGgod2lkdGgpLmhlaWdodChoZWlnaHQpO1xuXG4gICAgaWYgKG9wdGlvbnMuaW1hZ2VzQmFzZVVybCkge1xuICAgICAgY2hhcnQuaW1hZ2VzQmFzZVVybChvcHRpb25zLmltYWdlc0Jhc2VVcmwpO1xuICAgICAgY2hhcnQuZGF0YUd1dHRlcig4KTtcbiAgICB9XG5cbiAgICBkMy5zZWxlY3QoZWwpLmNhbGwoY2hhcnQpO1xuXG4gICAgcmV0dXJuIGNoYXJ0O1xuICB9O1xuXG4gIGNoYXJ0LmxvYWQgPSBmdW5jdGlvbih0aWRlbGluZURhdGEsIGRhdGV0aW1lKSB7XG4gICAgdmFyIGJhc2FsVXRpbCA9IHRpZGVsaW5lRGF0YS5iYXNhbFV0aWw7XG4gICAgdmFyIGJvbHVzVXRpbCA9IHRpZGVsaW5lRGF0YS5ib2x1c1V0aWw7XG4gICAgdmFyIGNiZ1V0aWwgPSB0aWRlbGluZURhdGEuY2JnVXRpbDtcblxuICAgIHZhciBzbWJnRGF0YSA9IHRpZGVsaW5lRGF0YS5ncm91cGVkLnNtYmcgfHwgW107XG5cbiAgICBpZiAoIWRhdGV0aW1lKSB7XG4gICAgICBjaGFydC5kYXRhKHNtYmdEYXRhKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBpZiAoc21iZ0RhdGEubGVuZ3RoICYmXG4gICAgICAgICAgZGF0ZXRpbWUudmFsdWVPZigpID4gRGF0ZS5wYXJzZShzbWJnRGF0YVtzbWJnRGF0YS5sZW5ndGggLSAxXS5ub3JtYWxUaW1lKSkge1xuICAgICAgICBkYXRldGltZSA9IHNtYmdEYXRhW3NtYmdEYXRhLmxlbmd0aCAtIDFdLm5vcm1hbFRpbWU7XG4gICAgICB9XG4gICAgICBjaGFydC5kYXRhKHNtYmdEYXRhLCBkYXRldGltZSk7XG4gICAgfVxuXG4gICAgY2hhcnQuc2V0dXAoKTtcblxuICAgIHZhciBkYXlzID0gY2hhcnQuZGF5cztcblxuICAgIC8vIG1ha2UgcG9vbHMgZm9yIGVhY2ggZGF5XG4gICAgZGF5cy5mb3JFYWNoKGZ1bmN0aW9uKGRheSwgaSkge1xuICAgICAgdmFyIG5ld1Bvb2wgPSBjaGFydC5uZXdQb29sKClcbiAgICAgICAgLmlkKCdwb29sQkdfJyArIGRheSwgY2hhcnQuZGF5c0dyb3VwKCkpXG4gICAgICAgIC5pbmRleChjaGFydC5wb29scygpLmluZGV4T2YobmV3UG9vbCkpXG4gICAgICAgIC53ZWlnaHQoMS4wKTtcbiAgICB9KTtcblxuICAgIGNoYXJ0LmFycmFuZ2VQb29scygpO1xuICAgIGNoYXJ0LnNldEFubm90YXRpb24oKTtcblxuICAgIGNoYXJ0LnNldEF4ZXMoKS5zZXROYXYoKS5zZXRTY3JvbGxOYXYoKTtcblxuICAgIHZhciBmaWxsRW5kcG9pbnRzID0gW25ldyBEYXRlKCcyMDE0LTAxLTAxVDAwOjAwOjAwWicpLCBuZXcgRGF0ZSgnMjAxNC0wMS0wMlQwMDowMDowMFonKV07XG4gICAgdmFyIGZpbGxTY2FsZSA9IGQzLnRpbWUuc2NhbGUudXRjKClcbiAgICAgIC5kb21haW4oZmlsbEVuZHBvaW50cylcbiAgICAgIC5yYW5nZShbY2hhcnQuYXhpc0d1dHRlcigpICsgY2hhcnQuZGF0YUd1dHRlcigpLCBjaGFydC53aWR0aCgpIC0gY2hhcnQubmF2R3V0dGVyKCkgLSBjaGFydC5kYXRhR3V0dGVyKCldKTtcblxuICAgIHNtYmdUaW1lID0gbmV3IHRpZGVsaW5lLnBsb3QuU01CR1RpbWUoe2VtaXR0ZXI6IGVtaXR0ZXJ9KTtcblxuICAgIGNoYXJ0LnBvb2xzKCkuZm9yRWFjaChmdW5jdGlvbihwb29sLCBpKSB7XG4gICAgICB2YXIgZ3V0dGVyO1xuICAgICAgdmFyIGQgPSBuZXcgRGF0ZShwb29sLmlkKCkucmVwbGFjZSgncG9vbEJHXycsICcnKSk7XG4gICAgICB2YXIgZGF5T2ZUaGVXZWVrID0gZC5nZXRVVENEYXkoKTtcbiAgICAgIGlmICgoZGF5T2ZUaGVXZWVrID09PSAwKSB8fCAoZGF5T2ZUaGVXZWVrID09PSA2KSkge1xuICAgICAgICBndXR0ZXIgPSB7J3RvcCc6IDEuNSwgJ2JvdHRvbSc6IDEuNX07XG4gICAgICB9XG4gICAgICAvLyBvbiBNb25kYXlzIHRoZSBib3R0b20gZ3V0dGVyIHNob3VsZCBiZSBhIHdlZWtlbmQgZ3V0dGVyXG4gICAgICBlbHNlIGlmIChkYXlPZlRoZVdlZWsgPT09IDEpIHtcbiAgICAgICAgZ3V0dGVyID0geyd0b3AnOiAwLjUsICdib3R0b20nOiAxLjV9O1xuICAgICAgfVxuICAgICAgLy8gb24gRnJpZGF5cyB0aGUgdG9wIGd1dHRlciBzaG91bGQgYmUgYSB3ZWVrZW5kIGd1dHRlclxuICAgICAgZWxzZSBpZiAoZGF5T2ZUaGVXZWVrID09PSA1KSB7XG4gICAgICAgIGd1dHRlciA9IHsndG9wJzogMS41LCAnYm90dG9tJzogMC41fTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBndXR0ZXIgPSB7J3RvcCc6IDAuNSwgJ2JvdHRvbSc6IDAuNX07XG4gICAgICB9XG4gICAgICBwb29sLmFkZFBsb3RUeXBlKCdmaWxsJywgZmlsbChwb29sLCB7XG4gICAgICAgIGVuZHBvaW50czogZmlsbEVuZHBvaW50cyxcbiAgICAgICAgeFNjYWxlOiBmaWxsU2NhbGUsXG4gICAgICAgIGd1dHRlcjogZ3V0dGVyLFxuICAgICAgICBkYXRhR3V0dGVyOiBjaGFydC5kYXRhR3V0dGVyKClcbiAgICAgIH0pLCBmYWxzZSk7XG4gICAgICBwb29sLmFkZFBsb3RUeXBlKCdzbWJnJywgc21iZ1RpbWUuZHJhdyhwb29sKSwgdHJ1ZSwgdHJ1ZSk7XG4gICAgICBwb29sLnJlbmRlcihjaGFydC5kYXlzR3JvdXAoKSwgY2hhcnQuZGF0YVBlckRheVtpXSk7XG4gICAgfSk7XG5cbiAgICBjaGFydC5wb29sU3RhdHMuYWRkUGxvdFR5cGUoJ3N0YXRzJywgdGlkZWxpbmUucGxvdC5zdGF0cy53aWRnZXQoY2hhcnQucG9vbFN0YXRzLCB7XG4gICAgICBjYmc6IGNiZ1V0aWwsXG4gICAgICBib2x1czogYm9sdXNVdGlsLFxuICAgICAgYmFzYWw6IGJhc2FsVXRpbCxcbiAgICAgIHhQb3NpdGlvbjogMCxcbiAgICAgIHlQb3NpdGlvbjogY2hhcnQucG9vbFN0YXRzLmhlaWdodCgpIC8gMTAsXG4gICAgICBlbWl0dGVyOiBlbWl0dGVyLFxuICAgICAgb25lRGF5OiBmYWxzZVxuICAgIH0pLCBmYWxzZSwgZmFsc2UpO1xuXG4gICAgY2hhcnQucG9vbFN0YXRzLnJlbmRlcihjaGFydC5wb29sR3JvdXAoKSk7XG5cbiAgICBjaGFydC5hbm5vdGF0aW9ucygpLmFkZEdyb3VwKGQzLnNlbGVjdCgnIycgKyBjaGFydC5pZCgpKS5zZWxlY3QoJyMnICsgY2hhcnQucG9vbFN0YXRzLmlkKCkpLCAnc3RhdHMnKTtcblxuICAgIGNoYXJ0Lm5hdlN0cmluZygpO1xuXG4gICAgcmV0dXJuIGNoYXJ0O1xuICB9O1xuXG4gIGNoYXJ0LnNob3dWYWx1ZXMgPSBmdW5jdGlvbigpIHtcbiAgICBzbWJnVGltZS5zaG93VmFsdWVzKCk7XG4gIH07XG5cbiAgY2hhcnQuaGlkZVZhbHVlcyA9IGZ1bmN0aW9uKCkge1xuICAgIHNtYmdUaW1lLmhpZGVWYWx1ZXMoKTtcbiAgfTtcblxuICBjaGFydC50eXBlID0gJ3dlZWtseSc7XG5cbiAgcmV0dXJuIGNyZWF0ZShlbCwgb3B0aW9ucyk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gY2hhcnRXZWVrbHlGYWN0b3J5O1xuIiwiLyogXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqIENvcHlyaWdodCAoYykgMjAxNCwgVGlkZXBvb2wgUHJvamVjdFxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTsgeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeSBpdCB1bmRlclxuICogdGhlIHRlcm1zIG9mIHRoZSBhc3NvY2lhdGVkIExpY2Vuc2UsIHdoaWNoIGlzIGlkZW50aWNhbCB0byB0aGUgQlNEIDItQ2xhdXNlXG4gKiBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieSB0aGUgT3BlbiBTb3VyY2UgSW5pdGlhdGl2ZSBhdCBvcGVuc291cmNlLm9yZy5cbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsIGJ1dCBXSVRIT1VUXG4gKiBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTU1xuICogRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiBTZWUgdGhlIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqIFxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbTsgaWZcbiAqIG5vdCwgeW91IGNhbiBvYnRhaW4gb25lIGZyb20gVGlkZXBvb2wgUHJvamVjdCBhdCB0aWRlcG9vbC5vcmcuXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgb25lZGF5OiByZXF1aXJlKCcuL2NoYXJ0ZGFpbHlmYWN0b3J5JyksXG4gIHR3b3dlZWs6IHJlcXVpcmUoJy4vY2hhcnR3ZWVrbHlmYWN0b3J5JyksXG4gIHNldHRpbmdzOiByZXF1aXJlKCcuL3NldHRpbmdzZmFjdG9yeScpXG59OyIsIi8qIFxuICogPT0gQlNEMiBMSUNFTlNFID09XG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQsIFRpZGVwb29sIFByb2plY3RcbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU7IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnkgaXQgdW5kZXJcbiAqIHRoZSB0ZXJtcyBvZiB0aGUgYXNzb2NpYXRlZCBMaWNlbnNlLCB3aGljaCBpcyBpZGVudGljYWwgdG8gdGhlIEJTRCAyLUNsYXVzZVxuICogTGljZW5zZSBhcyBwdWJsaXNoZWQgYnkgdGhlIE9wZW4gU291cmNlIEluaXRpYXRpdmUgYXQgb3BlbnNvdXJjZS5vcmcuXG4gKiBcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLCBidXQgV0lUSE9VVFxuICogQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2YgTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1NcbiAqIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gU2VlIHRoZSBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKiBcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW07IGlmXG4gKiBub3QsIHlvdSBjYW4gb2J0YWluIG9uZSBmcm9tIFRpZGVwb29sIFByb2plY3QgYXQgdGlkZXBvb2wub3JnLlxuICogPT0gQlNEMiBMSUNFTlNFID09XG4gKi9cblxudmFyIF8gPSB3aW5kb3cuXztcbnZhciBib3dzID0gd2luZG93LmJvd3M7XG52YXIgZDMgPSB3aW5kb3cuZDM7XG5cbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XG5cbnZhciB0aWRlbGluZSA9IHdpbmRvdy50aWRlbGluZTtcblxuZnVuY3Rpb24gc2V0dGluZ3NGYWN0b3J5KGVsLCBvcHRpb25zKSB7XG4gIHZhciBsb2cgPSBib3dzKCdTZXR0aW5ncyBGYWN0b3J5Jyk7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIHZhciBlbWl0dGVyID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICB2YXIgcGFnZSA9IHRpZGVsaW5lLnNldHRpbmdzKGVtaXR0ZXIpO1xuICBwYWdlLmVtaXR0ZXIgPSBlbWl0dGVyO1xuXG4gIHZhciBjcmVhdGUgPSBmdW5jdGlvbihlbCwgb3B0aW9ucykge1xuICAgIGlmICghZWwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignU29ycnksIHlvdSBtdXN0IHByb3ZpZGUgYSBET00gZWxlbWVudCEgOignKTtcbiAgICB9XG5cbiAgICBkMy5zZWxlY3QoZWwpLmNhbGwocGFnZSk7XG5cbiAgICByZXR1cm4gcGFnZTtcbiAgfTtcblxuICBwYWdlLmxvYWQgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgcGFnZS5kYXRhKGRhdGEpLnJlbmRlcigpO1xuXG4gICAgcmV0dXJuIHBhZ2U7XG4gIH07XG5cbiAgcGFnZS50eXBlID0gJ3NldHRpbmdzJztcblxuICByZXR1cm4gY3JlYXRlKGVsLCBvcHRpb25zKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzZXR0aW5nc0ZhY3Rvcnk7IiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghaXNOdW1iZXIobikgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCduIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc09iamVjdCh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSkge1xuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IFR5cGVFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc1VuZGVmaW5lZChoYW5kbGVyKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIHZhciBtO1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghZW1pdHRlci5fZXZlbnRzIHx8ICFlbWl0dGVyLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gMDtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbihlbWl0dGVyLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IDE7XG4gIGVsc2VcbiAgICByZXQgPSBlbWl0dGVyLl9ldmVudHNbdHlwZV0ubGVuZ3RoO1xuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuIl19
(3)
});
