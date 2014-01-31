(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
d3.json('device-data.json', function(data) {
  var container = require('../js/container')();

  var watson = require('./watson');

  // Watson the data
  data = watson.data(data);
  data = watson.normalize(data);
  data = _.sortBy(data, 'normalTime');

  // set up main one-day container
  container.data(data).defaults().width(1000).height(700);

  watson.print('Start', new Date(container.endpoints[0]));
  watson.print('End', new Date(container.endpoints[1]));

  d3.select('#tidelineContainer').datum(container.getData()).call(container);

  // SVG definitions
  // TODO: pool.js should perhaps have an API for defining these per pool
  // or maybe container.js should have it, if the same patterns might occur across multiple pools
  var svgDefinitions = d3.select('#tidelineSVG').append('defs');
  // create extended bolus pattern fill definition
  d3.select('defs')
    .append('pattern')
    .attr({
      'id': 'extendedBolusFill',
      'width': 50,
      'height': 50,
      'patternUnits': 'userSpaceOnUse'
    })
    .append('image')
    .attr({
      'xlink:href': '../img/bolus/extended_bolus_fill.png',
      'x': 0,
      'y': 0,
      'width': 50,
      'height': 50
    });

  // set up click-and-drag and scroll navigation
  container.setNav().setScrollNav();

  // attach click handlers to set up programmatic pan
  $('#tidelineNavForward').on('click', container.panForward);
  $('#tidelineNavBack').on('click', container.panBack);

  // start setting up pools
  // messages pool
  var poolMessages = container.newPool().defaults()
    .id('poolMessages')
    .label('')
    .index(container.pools().indexOf(poolMessages))
    .weight(0.5);

  // blood glucose data pool
  var poolBG = container.newPool().defaults()
    .id('poolBG')
    .label('Blood Glucose')
    .index(container.pools().indexOf(poolBG))
    .weight(1.5);

  // carbs and boluses data pool
  var poolBolus = container.newPool().defaults()
    .id('poolBolus')
    .label('Bolus & Carbohydrates')
    .index(container.pools().indexOf(poolBolus))
    .weight(1.5);
  
  // basal data pool
  var poolBasal = container.newPool().defaults()
    .id('poolBasal')
    .label('Basal Rates')
    .index(container.pools().indexOf(poolBasal))
    .weight(1.0);

  container.arrangePools();

  var fill = require('../js/plot/fill');

  var scales = require('../js/plot/scales');

  // BG pool
  var scaleBG = scales.bg(_.where(data, {'type': 'cbg'}), poolBG);
  // set up y-axis
  poolBG.yAxis(d3.svg.axis()
    .scale(scaleBG)
    .orient('left')
    .outerTickSize(0)
    .tickValues([40, 80, 120, 180, 300]));
  // add background fill rectangles to BG pool
  poolBG.addPlotType('fill', fill(poolBG, {endpoints: container.endpoints}));

  // add CBG data to BG pool
  poolBG.addPlotType('cbg', require('../js/plot/cbg')(poolBG, {yScale: scaleBG}));

  // add SMBG data to BG pool
  poolBG.addPlotType('smbg', require('../js/plot/smbg')(poolBG, {yScale: scaleBG}));

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
  poolBolus.addPlotType('fill', fill(poolBolus, {endpoints: container.endpoints}));

  // add carbs data to bolus pool
  poolBolus.addPlotType('carbs', require('../js/plot/carbs')(poolBolus, {yScale: scaleCarbs}));

  // add bolus data to bolus pool
  poolBolus.addPlotType('bolus', require('../js/plot/bolus')(poolBolus, {yScale: scaleBolus}));

  // basal pool
  // add background fill rectangles to basal pool
  poolBasal.addPlotType('fill', fill(poolBasal, {endpoints: container.endpoints}));

  // messages pool
  // add background fill rectangles to messages pool
  poolMessages.addPlotType('fill', fill(poolMessages, {endpoints: container.endpoints}));

  // add message images to messages pool
  poolMessages.addPlotType('message', require('../js/plot/message')(poolMessages, {size: 30}));

  var poolGroup = d3.select('#tidelinePools');

  var initialData = container.getData(container.initialEndpoints, 'both');

  container.allData(initialData);

  // render BG pool
  poolBG(poolGroup, initialData);

  // render bolus pool
  poolBolus(poolGroup, initialData);

  // render basal pool
  poolBasal(poolGroup, initialData);

  //render messages pool
  poolMessages(poolGroup, initialData);
});
},{"../js/container":3,"../js/plot/bolus":4,"../js/plot/carbs":5,"../js/plot/cbg":6,"../js/plot/fill":7,"../js/plot/message":8,"../js/plot/scales":9,"../js/plot/smbg":10,"./watson":2}],2:[function(require,module,exports){
// 'Good old Watson! You are the one fixed point in a changing age.' - Sherlock Holmes, His Last Bow

var data = function(a) {
  messages = _.where(a, {'type': 'message'});
  watson = _.map(_.reject(a, function(i) {
    if (i.type === 'message') {
      return i;
    }}), function(i) {
      i.deviceTime = i.deviceTime + 'Z';
      return i;
  });

  return watson.concat(messages);
};

var normalize = function(a) {
  return _.map(a, function(i) {
    i.normalTime = i.deviceTime;
    if (!i.normalTime) {
      i.normalTime = i.utcTime;
    }
    return i;
  });
};

var print = function(arg, d) {
  console.log(arg, d.toUTCString().replace(' GMT', ''));
};

var strip = function(d) {
  return d.toUTCString().replace(' GMT', '');
};

module.exports.data = data;
module.exports.normalize = normalize;
module.exports.print = print;
module.exports.strip = strip;
},{}],3:[function(require,module,exports){
var pool = require('./pool');

module.exports = function() {

  var MS_IN_24 = 86400000;

  var bucket,
    id,
    width, minWidth,
    height, minHeight,
    gutter,
    axisGutter,
    pad,
    nav = {},
    pools = [], gutter,
    xScale = d3.time.scale.utc(),
    xAxis = d3.svg.axis().scale(xScale).orient('top').outerTickSize(0),
    beginningOfData, endOfData, data, allData = [], buffer, endpoints, outerEndpoints, initialEndpoints,
    mainGroup, poolGroup, scrollNav, scrollHandleTrigger = true;

  var defaults = {
    bucket: $('#tidelineContainer'),
    id: 'tidelineSVG',
    minWidth: 400,
    minHeight: 400,
    pad: 10,
    nav: {
      minNavHeight: 30,
      scrollNav: true,
      scrollNavHeight: 40,
      latestTranslation: 0,
      currentTranslation: 0
    },
    axisGutter: 40,
    gutter: 30,
    buffer: 5
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
          height += pad * 2 + nav.axisHeight;
          if (nav.scrollNav) {
            height += nav.scrollNavHeight;
          }
          return height;
        }
      });

      // set the domain and range for the main tideline x-scale
      xScale.domain([container.initialEndpoints[0], container.initialEndpoints[1]])
        .range([container.axisGutter(), width]);

      mainGroup.append('g')
        .attr('class', 'd3-x d3-axis')
        .attr('id', 'tidelineXAxis')
        .attr('transform', 'translate(0,' + nav.axisHeight + ')')
        .call(xAxis);

      poolGroup = mainGroup.append('g').attr('id', 'tidelinePools');

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
          'opacity': 1,
          'fill': 'white'
        });

      if (nav.scrollNav) {
        scrollNav = mainGroup.append('g')
          .attr('class', 'x scroll')
          .attr('id', 'tidelineScrollNav');

        nav.scrollScale = d3.time.scale.utc()
          .domain([Date.parse(data[0].normalTime), Date.parse(currentData[0].normalTime)])
          .range([container.axisGutter(), width]);
      }
    });
  }

  // non-chainable methods
  container.getData = function(endpoints, direction) {
    if (!arguments.length) {
      endpoints = initialEndpoints;
      direction = 'both';
    }
    var start = new Date(endpoints[0]);
    var end = new Date(endpoints[1]);

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
    console.log('Jumped forward a day.');
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
    console.log('Jumped back a day.');
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
    var totalPoolsHeight = 
      container.height() - container.axisHeight() - container.scrollNavHeight() - numPools * container.gutter();
    var poolScaleHeight = totalPoolsHeight/cumWeight;
    var actualPoolsHeight = 0;
    pools.forEach(function(pool) {
      pool.height(poolScaleHeight);
      actualPoolsHeight += pool.height();
    });
    actualPoolsHeight += (numPools - 1) * container.gutter();
    var baseline = container.height() - container.scrollNavHeight();
    var topline = container.axisHeight() + container.gutter();
    var content = baseline - topline;
    var meridian = content/2 + topline;
    var difference = content - actualPoolsHeight;
    var offset = difference/2;
    if (offset < 0) {
      offset = 0;
    }
    var currentYPosition = topline;
    pools.forEach(function(pool) {
      pool.yPosition(offset + currentYPosition);
      currentYPosition += offset + pool.height() + container.gutter();
    });
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
    this.pad(properties.pad);
    this.scrollNav(properties.nav.scrollNav);
    this.minNavHeight(properties.nav.minNavHeight)
      .axisHeight(properties.nav.minNavHeight)
      .scrollNavHeight(properties.nav.scrollNavHeight);
    this.minHeight(properties.minHeight).height(properties.minHeight);
    this.latestTranslation(properties.nav.latestTranslation)
      .currentTranslation(properties.nav.currentTranslation);
    this.axisGutter(properties.axisGutter);
    this.gutter(properties.gutter);
    this.buffer(properties.buffer);

    return container;
  };

  container.setNav = function() {
    nav.pan = d3.behavior.zoom()
      .scaleExtent([1, 1])
      .x(xScale)
      .on('zoom', function() {
        if ((endOfData - xScale.domain()[1] < MS_IN_24) && !(endOfData.getTime() === endpoints[1])) {
          console.log('Fetching new data! (right)');
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
            pools[j](poolGroup, container.allData());
          }
        }
        if ((xScale.domain()[0] - beginningOfData < MS_IN_24) && !(beginningOfData.getTime() === endpoints[0])) {
          console.log('Fetching new data! (left)');
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
            pools[j](poolGroup, container.allData());
          }
        }
        for (var i = 0; i < pools.length; i++) {
          pools[i].pan(d3.event);
        }
        d3.select('.d3-x.d3-axis').call(xAxis);
        if (scrollHandleTrigger) {
          d3.select('#scrollHandle').transition().ease('linear').attr('cx', function(d) {
            d.x = nav.scrollScale(xScale.domain()[0]);
            return d.x;
          });       
        }
      })
      .on('zoomend', function() {
        container.currentTranslation(nav.latestTranslation);
        scrollHandleTrigger = true;
      });

    mainGroup.call(nav.pan);

    return container;
  };

  container.setScrollNav = function() {
    scrollNav.attr('transform', 'translate(0,' + (height - nav.scrollNavHeight/4) + ')')
      .append('line')
      .attr({
        'x1': nav.scrollScale(endpoints[0]),
        'x2': nav.scrollScale(endpoints[1]),
        'y1': 0,
        'y2': 0,
        'stroke-width': 1,
        // TODO: move to LESS
        'stroke': '#989897',
        'shape-rendering': 'crispEdges'
      });

    var drag = d3.behavior.drag()
      .origin(function(d) {
        return d;
      })
      .on('dragstart', function() {
        d3.event.sourceEvent.stopPropagation(); // silence the click-and-drag listener
      })
      .on('drag', function(d) {
        d.x += d3.event.dx;
        d3.select(this).attr('cx', function(d) { return d.x; });
        var date = nav.scrollScale.invert(d.x);
        nav.currentTranslation += -xScale(date);
        scrollHandleTrigger = false;
        nav.pan.translate([nav.currentTranslation, 0]);
        nav.pan.event(mainGroup);
      });

    scrollNav.selectAll('circle')
      .data([{'x': nav.scrollScale(beginningOfData), 'y': 0}])
      .enter()
      .append('circle')
      .attr({
        'cx': function(d) { return d.x; },
        'r': 5,
        'fill': '#989897',
        'id': 'scrollHandle'
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
    var totalHeight = x + container.pad() * 2 + container.axisHeight();
    if (nav.scrollNav) {
      totalHeight += container.scrollNavHeight();
    }
    if (totalHeight >= minHeight) {
      if (totalHeight > bucket.height()) {
        height = bucket.height() - container.axisHeight() - container.pad() * 2;
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

  container.pad = function(x) {
    if (!arguments.length) return pad;
    pad = x;
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
    initialEndpoints = [minusOne, last];
    container.beginningOfData(minusOne).endOfData(last);
    endpoints = [first, last];
    container.endpoints = endpoints;
    var outerBeg = new Date(endpoints[0]);
    outerBeg.setDate(outerBeg.getDate() - 1);
    var outerEnd = new Date(endpoints[1]);
    outerEnd.setDate(outerEnd.getDate() + 1);
    outerEndpoints = [outerBeg, outerEnd];
    container.initialEndpoints = initialEndpoints;
    return container;
  };

  container.allData = function(x) {
    if (!arguments.length) return allData;
    allData = allData.concat(x);
    console.log('Length of allData array is', allData.length);
    var plus = new Date(xScale.domain()[1]);
    plus.setDate(plus.getDate() + container.buffer());
    var minus = new Date(xScale.domain()[0]);
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
    allData = _.sortBy(allData, 'normalTime');
    return pool;
  };

  container.buffer = function(x) {
    if (!arguments.length) return buffer;
    buffer = x;
    return pool;
  };

  return container;
};
},{"./pool":11}],4:[function(require,module,exports){
// TODO: remove; watson shouldn't be a dependency outside of example/
// just here for now to ease development
var watson = require('../../example/watson');

module.exports = function(pool, opts) {

  var opts = opts || {};

  var defaults = {
    xScale: pool.xScale().copy(),
    width: 12,
    bolusStroke: 2
  };

  _.defaults(opts, defaults);

  function bolus(selection) {
    selection.each(function(currentData) {
      var boluses = d3.select(this)
        .selectAll('g')
        .data(currentData, function(d) {
          // leveraging the timestamp of each datapoint as the ID for D3's binding
          return d.normalTime;
        });
      var bolusGroups = boluses.enter()
        .append('g')
        .attr({
          'class': 'd3-bolus-group'
        });
      var top = opts.yScale.range()[0];
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
            return d.normalTime + ' ' + d.value + ' ' + d.recommended + ' recommended';
          }
        });
      // square- and dual-wave boluses
      bolusGroups.filter(function(d) {
        if (d.extended) {
          return d;
        }
      })
        .append('path')
        .attr({
          'd': function(d) {
            var rightEdge = bolus.x(d) + opts.width;
            var doseHeight = opts.yScale(d.extendedDelivery) + opts.bolusStroke / 2;
            var mid = opts.yScale(d.extendedDelivery/2);
            var doseEnd = opts.xScale(Date.parse(d.normalTime) + d.duration);
            return "M" + rightEdge + ' ' + doseHeight + "L" + doseEnd + ' ' + mid + "L" + rightEdge + ' ' + (top - opts.bolusStroke / 2) + "Z";
          },
          'stroke-width': opts.bolusStroke,
          'fill': 'url(#extendedBolusFill)',
          'class': 'd3-path-extended d3-bolus',
          'id': function(d) {
            return d.normalTime + ' ' + d.extendedDelivery + ' ' + ' ended at ' + watson.strip(new Date(opts.xScale.invert(opts.xScale(Date.parse(d.normalTime) + d.duration))));
          }
        });
      boluses.exit().remove();
    });
  }
  
  bolus.x = function(d) {
    return opts.xScale(Date.parse(d.normalTime)) - opts.width/2;
  };

  return bolus; 
};
},{"../../example/watson":2}],5:[function(require,module,exports){
module.exports = function(pool, opts) {

  var opts = opts || {};

  var defaults = {
    xScale: pool.xScale().copy(),
    width: 8
  };

  _.defaults(opts, defaults);

  function carbs(selection) {
    selection.each(function(currentData) {
      var rects = d3.select(this)
        .selectAll('rect')
        .data(currentData, function(d) {
          // leveraging the timestamp of each datapoint as the ID for D3's binding
          return d.normalTime;
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
            return d.normalTime + ' ' + d.value;
          }
        });
        rects.exit().remove();
    });
  }

  return carbs; 
};
},{}],6:[function(require,module,exports){
module.exports = function(pool, opts) {

  var opts = opts || {};

  var defaults = {
    classes: {
      'low': 80,
      'target': 180,
      'high': 200
    },
    xScale: pool.xScale().copy()
  };

  _.defaults(opts, defaults);

  function cbg(selection) {
    selection.each(function(currentData) {
      var circles = d3.select(this)
        .selectAll('circle')
        .data(currentData, function(d) {
          // leveraging the timestamp of each datapoint as the ID for D3's binding
          return d.normalTime;
        });
      circles.enter()
        .append('circle')
        .attr({
          'cx': function(d) {
            return opts.xScale(Date.parse(d.normalTime));
          },
          'class': function(d) {
            if (d.value < opts.classes['low']) {
              return 'd3-bg-low';
            }
            else if (d.value < opts.classes['target']) {
              return 'd3-bg-target';
            }
            else {
              return 'd3-bg-high'
            }
          },
          'cy': function(d) {
            return opts.yScale(d.value);
          },
          'r': 2.5,
          'id': function(d) {
            return d.normalTime + ' ' + d.value;
          }
        })
        .classed({'d3-circle': true, 'd3-cbg': true});
      circles.exit().remove();
    });
  }

  return cbg; 
};
},{}],7:[function(require,module,exports){
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
    scale: pool.xScale().copy()
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
        'y': 0,
        'width': function(d) {
          return d.width;
        },
        'height': pool.height(),
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
},{}],8:[function(require,module,exports){
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
          // leveraging the timestamp of each datapoint as the ID for D3's binding
          // only top-level message get an icon on the timeline
          if (d.parentMessage === '') {
            return d.normalTime;
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
            return d.id;
          }
        })
        .classed({'d3-image': true, 'd3-message': true});
      messages.exit().remove();
    });
  }

  return cbg; 
};
},{}],9:[function(require,module,exports){
var bg = function(data, pool) {
  var scale = d3.scale.linear()
    .domain([0, d3.max(data, function(d) { return d.value; })])
    .range([pool.height(), 0]);

  return scale;
};

var carbs = function(data, pool) {
  var scale = d3.scale.linear()
    .domain([0, d3.max(data, function(d) { return d.value; })])
    .range([0, 0.475 * pool.height()]);

  return scale;
};

var bolus = function(data, pool) {
  var scale = d3.scale.linear()
    .domain([0, d3.max(data, function(d) { return d.value; })])
    .range([pool.height(), 0.525 * pool.height()]);

  return scale;
};

module.exports.bg = bg;
module.exports.carbs = carbs;
module.exports.bolus = bolus;
},{}],10:[function(require,module,exports){
module.exports = function(pool, opts) {

  var opts = opts || {};

  var defaults = {
    classes: {
      'very-low': 60,
      'low': 80,
      'target': 180,
      'high': 200,
      'very-high': 300
    },
    xScale: pool.xScale().copy(),
    yScale: d3.scale.linear().domain([0, 400]).range([pool.height(), 0])
  };

  _.defaults(opts, defaults);

  function cbg(selection) {
    selection.each(function(currentData) {
      var circles = d3.select(this)
        .selectAll('circle')
        .data(currentData, function(d) {
          // leveraging the timestamp of each datapoint as the ID for D3's binding
          return d.normalTime;
        });
      circles.enter()
        .append('circle')
        .attr({
          'cx': function(d) {
            return opts.xScale(Date.parse(d.normalTime));
          },
          'class': function(d) {
            if (d.value < opts.classes['low']) {
              return 'd3-bg-low';
            }
            else if (d.value < opts.classes['target']) {
              return 'd3-bg-target';
            }
            else {
              return 'd3-bg-high'
            }
          },
          'cy': function(d) {
            return opts.yScale(d.value);
          },
          'r': 7,
          'id': function(d) {
            return d.normalTime + ' ' + d.value;
          }
        })
        .classed({'d3-circle': true, 'd3-smbg': true});
      circles.exit().remove();
    });
  }

  return cbg; 
};
},{}],11:[function(require,module,exports){
module.exports = function(container) {

  // TMP: colors, etc. for demo-ing
  var colors = d3.scale.category20(),
    grays = ['#636363', '#969696', '#bdbdbd', '#d9d9d9', '#d9d9d9', '#bdbdbd', '#969696', '#636363'];

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
    minHeight: 35,
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
    // TODO: this is diabetes-data specific, doesn't belong here, factor out into example.js/passed arguments
    var dataFill = {'cbg': true, 'smbg': true, 'carbs': true, 'bolus': true, 'fill': false, 'message': true};
    plotTypes.forEach(function(plotType) {
      if (dataFill[plotType.type]) {
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

    return pool;
  };

  pool.pan = function(e) {
    container.latestTranslation(e.translate[0]);
    plotTypes.forEach(function(plotType) {
      d3.select('#' + id + '_' + plotType.type).attr('transform', 'translate(' + e.translate[0] + ',0)');
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
        .attr('transform', 'translate(' + container.axisGutter() + ',' + yPosition + ')')
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

  pool.addPlotType = function (dataType, plotFunction) {
    plotTypes.push({
      type: dataType,
      plot: plotFunction
    });
    return pool;
  };

  return pool;
};
},{}]},{},[1])