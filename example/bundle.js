(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
d3.json('device-data.json', function(data) {
  var container = require('../js/container')();

  // set up main one-day container
  container.data(data).defaults().width(1000).height(700);

  d3.select('#tidelineContainer').datum(container.getData()).call(container);

  // set up click-and-drag and scroll navigation
  container.setNav().setScrollNav();

  // attach click handlers to set up programmatic pan
  $('#tidelineNavForward').on('click', container.panForward);
  $('#tidelineNavBack').on('click', container.panBack);

  console.log(new Date(container.endpoints[0]), new Date(container.endpoints[1]));

  // start setting up pools
  // blood glucose data pool
  var poolBG = container.newPool().defaults()
    .id('poolBG')
    .label('Blood Glucose')
    .index(container.pools().indexOf(poolBG))
    .weight(1.5);

  container.arrangePools();

  // add background fill rectangles to BG pool
  poolBG.addPlotType('fill', require('../js/plot/fill')(poolBG, {endpoints: container.endpoints}));

  // add CBG data to BG pool
  poolBG.addPlotType('cbg', require('../js/plot/cbg')(poolBG));

  var poolGroup = d3.select('#tidelinePools');

  // render BG pool
  poolBG(poolGroup, container.getData(container.initialEndpoints, 'both'));
});
},{"../js/container":2,"../js/plot/cbg":3,"../js/plot/fill":4}],2:[function(require,module,exports){
var pool = require('./pool');

module.exports = function() {

  var MS_IN_24 = 86400000;

  var bucket,
    id,
    width, minWidth,
    height, minHeight,
    pad,
    nav = {},
    pools = [], gutter,
    xScale = d3.time.scale.utc(),
    xAxis = d3.svg.axis().scale(xScale).orient('top').outerTickSize(0),
    beginningOfData, endOfData, data, endpoints, outerEndpoints, initialEndpoints,
    mainGroup, poolGroup, scrollNav;

  var defaults = {
    bucket: $('#tidelineContainer'),
    id: 'tidelineSVG',
    minWidth: 400,
    minHeight: 400,
    pad: 10,
    nav: {
      minNavHeight: 30,
      scrollNav: true,
      scrollNavHeight: 30,
      latestTranslation: 0,
      currentTranslation: 0
    },
    gutter: 10
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
        .range([0, width]);

      mainGroup.append('g')
        .attr('class', 'x axis')
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

      if (nav.scrollNav) {
        scrollNav = mainGroup.append('g')
          .attr('class', 'x scroll')
          .attr('id', 'tidelineScrollNav');

        nav.scrollScale = d3.time.scale()
          .domain([Date.parse(data[0].time), Date.parse(currentData[0].time)])
          .range([0, width]);
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
      t = Date.parse(datapoint.time);
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
    nav.currentTranslation -= width;
    mainGroup.transition().duration(2000).tween('zoom', function() {
      var ix = d3.interpolate(nav.currentTranslation + width, nav.currentTranslation);
      return function(t) {
        nav.pan.translate([ix(t), 0]);
        nav.pan.event(mainGroup);
      };
    });
  };

  container.panBack = function() {
    console.log('Jumped back a day.');
    nav.currentTranslation += width;
    mainGroup.transition().duration(2000).tween('zoom', function() {
      var ix = d3.interpolate(nav.currentTranslation - width, nav.currentTranslation);
      return function(t) {
        nav.pan.translate([ix(t), 0]);
        nav.pan.event(mainGroup);
      };
    });
  };

  container.newPool = function() {
    var p = pool(container);
    pools.push(p);
    return p;
  };

  container.arrangePools = function() {
    var numPools = pools.length;
    var cumWeight = 0;
    pools.forEach(function(pool) {
      cumWeight += pool.weight();
    });
    var totalPoolsHeight = container.height() - container.axisHeight() - container.scrollNavHeight() - (numPools - 1) * container.gutter();
    var poolScaleHeight = totalPoolsHeight/numPools;
    var actualPoolsHeight = 0;
    pools.forEach(function(pool) {
      pool.height(poolScaleHeight);
      actualPoolsHeight += pool.height();
    });
    actualPoolsHeight += (numPools - 1) * container.gutter();
    var baseline = container.height() - container.scrollNavHeight();
    var topline = container.axisHeight();
    var content = baseline - topline;
    var meridian = content/2 + topline;
    var difference = content - actualPoolsHeight;
    var offset = difference/2;
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
    this.gutter(properties.gutter);

    return container;
  };

  container.setNav = function() {
    nav.pan = d3.behavior.zoom()
      .scaleExtent([1, 1])
      .x(xScale)
      .on('zoom', function() {
        if ((endOfData - xScale.domain()[1] < MS_IN_24) && !(endOfData.getTime() > outerEndpoints[1])) {
          console.log('Fetching new data! (right)');
          for (j = 0; j < pools.length; j++) {
            var plusOne = new Date(container.endOfData());
            plusOne.setDate(plusOne.getDate() + 1);
            pools[j](poolGroup, container.getData([endOfData, plusOne], 'right'));
          }
          // update endOfData
          container.endOfData(plusOne);
        }
        else if ((xScale.domain()[0] - beginningOfData < MS_IN_24) && !(beginningOfData.getTime() < outerEndpoints[0])) {
          console.log('Fetching new data! (left)');
          for (j = 0; j < pools.length; j++) {
            var plusOne = new Date(container.beginningOfData());
            plusOne.setDate(plusOne.getDate() - 1);
            pools[j](poolGroup, container.getData([plusOne, beginningOfData], 'left'));
          }
          // update beginningOfData
          container.beginningOfData(plusOne);
        }
        for (var i = 0; i < pools.length; i++) {
          pools[i].pan(d3.event);
        }
        d3.select('.x.axis').call(xAxis);
      })
      .on('zoomend', function() {
        // TODO: find a way to put transition of #scrollHandle back in 'zoom'
        // BUG: after click-and-drag, weird jump first time perform panBack or panForward
        d3.select('#scrollHandle').transition().ease('linear').attr('cx', function(d) {
          d.x = nav.scrollScale(xScale.domain()[0]);
          return d.x;
        });
        container.currentTranslation(nav.latestTranslation);
        console.log('Current translation ' + nav.currentTranslation);
      });

    mainGroup.call(nav.pan);

    return container;
  };

  container.setScrollNav = function() {
    scrollNav.attr('transform', 'translate(0,' + (height - nav.scrollNavHeight/2) + ')')
      .append('line')
      .attr({
        'x1': nav.scrollScale(endpoints[0]),
        'x2': nav.scrollScale(endpoints[1]),
        'y1': 0,
        'y2': 0,
        'stroke-width': 1,
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
    var first = Date.parse(a[0].time);
    var last = Date.parse(a[a.length - 1].time);
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

  return container;
};
},{"./pool":5}],3:[function(require,module,exports){
module.exports = function(pool, opts) {

  var opts = opts || {};

  var defaults = {
    classes: {
      'low': 80,
      'target': 180,
      'high': 200
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
          return d.time;
        });
      circles.enter()
        .append('circle')
        .attr({
          'cx': function(d) {
            return opts.xScale(Date.parse(d.time));
          },
          'class': function(d) {
            if (d.value < opts.classes['low']) {
              return 'low';
            }
            else if (d.value < opts.classes['target']) {
              return 'target';
            }
            else {
              return 'high'
            }
          },
          'cy': function(d) {
            return opts.yScale(d.value);
          },
          'r': 2.5,
          'id': function(d) {
            return d.time + ' ' + d.value;
          }
        })
        .classed({'d3-circle': true, 'cbg': true});
      circles.exit().remove();
    });
  }

  return cbg; 
};
},{}],4:[function(require,module,exports){
module.exports = function(pool, opts) {

  var first = new Date(opts.endpoints[0]),
    nearest, fills = [];

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
    fills.push({
      width: opts.scale(opts.endpoints[1]) - opts.scale(nearest),
      x: opts.scale(nearest),
      fill: opts.classes[nearest.getHours()]
    });
    current = new Date(nearest);
    while (current > first) {
      var next = new Date(current);
      next.setHours(current.getHours() - opts.duration);
      fills.push({
        width: opts.scale(current) - opts.scale(next),
        x: opts.scale(next),
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
          return 'd3-rect-fill ' + d.fill;
        }
      });
  }

  fill.findNearest = function(d) {
    var date = new Date(d);
    var hourBreaks = [];
    var i = 0;
    while (i < 24) {
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
},{}],5:[function(require,module,exports){
module.exports = function(container) {

  // TMP: colors, etc. for demo-ing
  var colors = d3.scale.category20(),
    grays = ['#636363', '#969696', '#bdbdbd', '#d9d9d9', '#d9d9d9', '#bdbdbd', '#969696', '#636363'];

  var allData = [],
    id, label,
    index, weight, yPosition,
    height, minHeight, maxHeight,
    group,
    mainSVG = d3.select(container.id()),
    xScale = container.xScale().copy(),
    plotTypes = [];

  var defaults = {
    minHeight: 100,
    maxHeight: 300
  };

  function pool(selection, poolData) {
    pool.allData(poolData);
    // select the pool group if it already exists
    group = selection.selectAll('#' + id).data([allData]);
    // otherwise create a new pool group
    group.enter().append('g').attr({
      'id': id,
      'transform': 'translate(0,' + yPosition + ')'
    });
    plotTypes.forEach(function(plotType) {
      if (allData.length) {
        plotType.data = _.where(allData, {'type': plotType.type});
        dataGroup = group.selectAll('#' + id + '_' + plotType.type).data([plotType.data]);
        dataGroup.enter().append('g').attr('id', id + '_' + plotType.type);
        dataGroup.call(plotType.plot);
      }
      else {
        pool.noDataFill(plotType);
      }
    });
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
    d3.selectAll('.d3-circle').attr('transform', 'translate(' + e.translate[0] + ',0)');
    d3.selectAll('.d3-rect-fill').attr('transform', 'translate(' + e.translate[0] + ',0)');
  };

  // only once methods
  pool.drawLabel = _.once(function() {
    var labelGroup = d3.select('#tidelineLabels');
    labelGroup.append('text')
      .attr({
        'id': 'pool_' + id + '_label',
        'class': 'd3-pool-label',
        'transform': 'translate(0,' + yPosition + ')'
      })
      .text(label);
    return pool;
  });

  pool.noDataFill = _.once(function(plotType) {
    d3.select('#' + id).append('g').attr('id', id + '_' + plotType.type).call(plotType.plot);
    return pool;
  });

  // getters & setters
  pool.allData = function(x) {
    if (!arguments.length) return allData;
    allData = allData.concat(x);
    var currentDomain = container.xScale().domain();
    // TODO: parametrize what the buffer is with a buffer variable that sets number of days for minus and plus
    var plusTwo = new Date(currentDomain[1]);
    plusTwo.setDate(plusTwo.getDate() + 2);
    var minusTwo = new Date(currentDomain[0]);
    minusTwo.setDate(minusTwo.getDate() - 2);
    if (currentDomain[0] < minusTwo) {
      container.beginningOfData(minusTwo); 
      allData = _.filter(allData, function(datapoint) {
        var t = Date.parse(datapoint.time);
        if (t > minusTwo) {
          return t;
        }
      });
    }
    if (plusTwo > currentDomain[1]) {
      container.endOfData(plusTwo);
      allData = _.filter(allData, function(datapoint) {
        var t = Date.parse(datapoint.time);
        if (t < plusTwo) {
          return t;
        }
      });
    }
    allData = _.sortBy(allData, 'time');
    return pool;
  };

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