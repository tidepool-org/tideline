(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var pool = require('./pool');

module.exports = function() {

  var MS_IN_24 = 86400000;

  var id = 'tidelineSVG',
    endpoints,
    width = 960,
    height = 580,
    pad = 0,
    pools = [],
    xScale = d3.time.scale(),
    xAxis = d3.svg.axis().scale(xScale).orient("bottom"),
    pan,
    scrollScale = d3.time.scale(),
    xScroll = d3.svg.axis().scale(scrollScale).orient("bottom"),
    horizon,
    beginningOfData,
    endOfData,
    latestTranslation = 0,
    currentTranslation = 0;

  container.newPool = function() {
    var p = pool(container);
    pools.push(p);
    return p;
  };

  function container(selection) {
    selection.each(function(data) {
      // select the SVG if it already exists
      var mainSVG = selection.selectAll('svg').data([data]);
      // otherwise create a new SVG and enter   
      var mainGroup = mainSVG.enter().append('svg').append('g').attr('id', 'tidelineMain');

      var poolGroup = mainGroup.append('g').attr('id', 'tidelinePools');

      // update SVG dimenions and ID
      mainSVG.attr({
        'id': id,
        'width': width,
        'height': height
      });

      container.updateXScale(data);

      mainGroup.append('g')
        .attr('class', 'x axis')
        .attr('id', 'tidelineXAxis')
        // TODO: remove magic number 50
        .attr('transform', 'translate(0,' + (height - 50) + ')')
        .call(xAxis);

      mainGroup.append('rect')
        .attr({
          'id': 'poolsInvisibleRect',
          'width': width,
          'height': height,
          'opacity': 0.0
        });

      mainGroup.append('g')
        .attr('id', 'tidelineLabels');

      var xNav = mainGroup.append('g')
        .attr('class', 'x')
        .attr('id', 'tidelineNav')
        .attr('transform', 'translate(' + (width / 2) + ',0)');

      xNav.append('path')
        .attr({
          // TODO: remove magic numbers, colors
          'd': 'M -100 10 L -140 25 -100 40 Z',
          'fill': 'white',
          'stroke': 'black',
          'id': 'd3NavBack'
        });

      xNav.append('path')
        .attr({
          // TODO: remove magic numbers, colors
          'd': 'M 100 10 L 140 25 100 40 Z',
          'fill': 'white',
          'stroke': 'black',
          'id': 'd3NavForward'
        });

      mainGroup.append('g')
        // TODO: change later when not (re-)using .axis CSS class
        .attr('class', 'x scroll')
        .attr('id', 'tidelineScroll');

      // TODO: update inner group dimensions if decide to have a margin
      // mainGroup.attr('transform', 'translate(' + margin.left + "," + margin.top + ')');   
    });
  }

  container.setNav = function() {
    var mainGroup = d3.select('#tidelineMain');
    var poolGroup = d3.select('#tidelinePools');

    pan = d3.behavior.zoom()
      .scaleExtent([1, 1])
      .x(xScale)
      .on('zoom', function() {
        scrollBarTrigger = true;
        // update horizon
        horizon.start = xScale.domain()[0];
        horizon.end = xScale.domain()[1];
        if (endOfData - horizon.end < MS_IN_24) {
          console.log('Creating new data! (right)');
          for (j = 0; j < pools.length; j++) {
            var plusOne = new Date(container.endOfData());
            plusOne.setDate(plusOne.getDate() + 1);
            pools[j](poolGroup, [endOfData, plusOne]);
          }
          // update endOfData
          container.endOfData(plusOne);
        }
        else if (horizon.start - beginningOfData < MS_IN_24) {
          console.log('Creating new data! (left)');
          for (j = 0; j < pools.length; j++) {
            var plusOne = new Date(container.beginningOfData());
            plusOne.setDate(plusOne.getDate() - 1);
            pools[j](poolGroup, [plusOne, beginningOfData]);
          }
          // update beginningOfData
          container.beginningOfData(plusOne);
        }
        for (var i = 0; i < pools.length; i++) {
          pools[i].pan(d3.event);
        }
        d3.select('.x.axis').call(xAxis);
        if (scrollBarTrigger) {        
          d3.select('#scrollHandle').transition().ease('linear').attr('cx', function(d) {
            d.x = scrollScale(horizon.start);
            return d.x;
          });
        }
      })
      .on('zoomend', function() {
        container.currentTranslation(latestTranslation);
        console.log('Current translation ' + currentTranslation);
      });

    mainGroup.call(pan);

    $('#d3NavForward').on('click', function() {
      console.log('Jumped forward a day.');
      scrollBarTrigger = true;
      currentTranslation -= width;
      pan.translate([currentTranslation, 0]);
      pan.event(mainGroup.transition().duration(500));
    });

    $('#d3NavBack').on('click', function() {
      console.log('Jumped back a day.');
      scrollBarTrigger = true;
      currentTranslation += width;
      pan.translate([currentTranslation, 0]);
      pan.event(mainGroup.transition().duration(500));
    });
  };

  container.updateXScale = function(_) {
    if (!arguments.length) return xScale;
    container.horizon(_[0].timestamp);
    container.beginningOfData(_[0].timestamp);
    container.endOfData(_[_.length - 1].timestamp);
    xScale.domain([horizon.start, horizon.end]).range([pad, width - pad]);
    return container;
  };

  container.updateScrollScale = function(_) {
    if (!arguments.length) return scrollScale;
    scrollScale.domain(endpoints).range([pad, width - pad]);
    return container;
  };

  container.setScrollbar = function() {

    var mainGroup = d3.select('#tidelineMain');
    var scrollBar = d3.select('#tidelineScroll');

    // TODO: remove magic number 20
    scrollBar.attr('transform', 'translate(0,' + (height - 20) + ')')
      .append('line')
      .attr({
        'x1': scrollScale(endpoints[0]),
        'x2': scrollScale(endpoints[1]),
        'y1': 0,
        'y2': 0,
        'stroke-width': 3,
        'stroke': 'black'
      });

    var drag = d3.behavior.drag()
      .origin(function(d) {
        return d;
      })
      .on('dragstart', function() {
        d3.event.sourceEvent.stopPropagation(); // silence other listeners
        scrollBarTrigger = false;
      })
      .on('drag', function(d) {
        d.x += d3.event.dx;
        d3.select(this).attr('cx', function(d) { return d.x; });
        var date = scrollScale.invert(d.x);
        currentTranslation -= xScale(date);
        pan.translate([currentTranslation, 0]);
        pan.event(mainGroup);
      });

    scrollBar.selectAll('circle')
      .data([{'x': scrollScale(endpoints[0]), 'y': 0}])
      .enter()
      .append('circle')
      .attr({
        'cx': function(d) { return d.x; },
        'r': 5,
        'fill': 'gray',
        'id': 'scrollHandle'
      })
      .call(drag);
  };

  container.id = function(_) {
    if (!arguments.length) return id;
    id = _;
    return container;
  };

  container.endpoints = function(x) {
    if (!arguments.length) return endpoints;
    endpoints = x;
    container.updateScrollScale(endpoints);
    container.setScrollbar();
    return container;
  };

  container.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return container;
  };

  container.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return container;
  };

  container.horizon = function(d) {
    if (!arguments.length) return horizon;
    horizon = {
      start: new Date(d),
      end: new Date(d)
    };
    horizon.end.setDate(horizon.end.getDate() + 1);
    return container;
  }

  container.beginningOfData = function(d) {
    if (!arguments.length) return beginningOfData;
    beginningOfData = new Date(d);
    return container;
  }

  container.endOfData = function(d) {
    if (!arguments.length) return endOfData;
    endOfData = new Date(d);
    return container;
  }

  container.pad = function(_) {
    if (!arguments.length) return pad;
    pad = _;
    return container;
  };

  container.pools = function(_) {
    if (!arguments.length) return pools;
    pools = _;
    return container;
  };

  container.latestTranslation = function(x) {
    if (!arguments.length) return latestTranslation;
    latestTranslation = x;
    return container;
  }

  container.currentTranslation = function(x) {
    if (!arguments.length) return currentTranslation;
    currentTranslation = x;
    return container;
  }

  return container;
};
},{"./pool":4}],2:[function(require,module,exports){
module.exports = function() {

  return function d(endpoints) {
    var start = new Date(endpoints[0]);
    var end = new Date(endpoints[1]);

    start.setMinutes(start.getMinutes() - 30);
    
    var readings = [];

    while (start < end) {
      readings.push({
        value: Math.floor((Math.random() * 360) + 41),
        timestamp: start.setMinutes(start.getMinutes() + 30)
      });
    }

    return readings;
  }
};
},{}],3:[function(require,module,exports){
var container = require('./container');
var data = require('./data');

var d = data();

var initialEndpoints = [new Date(2014, 0, 1, 0, 0, 0, 0), new Date(2014, 0, 2, 0, 0, 0, 0)];

var container = container();

var s = new Date(initialEndpoints[0]), e = new Date(initialEndpoints[1]);

var onDeckLeft = [s.setDate(s.getDate() - 1), e.setDate(e.getDate() - 1)];
var onDeckRight = [s.setDate(s.getDate() + 2), e.setDate(e.getDate() + 2)];

d3.select('#tidelineContainer').datum(d(initialEndpoints)).call(container);
container.setNav();
container.endpoints([new Date(2014, 0, 1, 0, 0, 0, 0), new Date(2014, 0, 15, 23, 59, 59, 0)]);

var mainGroup = d3.select('#tidelineMain');

var poolGroup = d3.select('#tidelinePools');

for (j = 0; j < 6; j++) {
  var pool = container.newPool();
  pool.id('pool_' + j).yPosition((j * 80) + 60).label('This is pool #' + (j+1)).drawLabel().xScale(container.updateXScale().copy());
  pool(poolGroup, initialEndpoints);
  pool(poolGroup, onDeckLeft);
  pool(poolGroup, onDeckRight);
}
container.beginningOfData(onDeckLeft[0]);
container.endOfData(onDeckRight[1]);

},{"./container":1,"./data":2}],4:[function(require,module,exports){
var data = require('./data');

module.exports = function(container) {

  var d = data();

  // TMP: colors, etc. for demo-ing
  var colors = d3.scale.category20(),
    grays = ['#f7f7f7', '#d9d9d9', '#bdbdbd', '#969696', '#636363', '#252525'];

  var allData = [],
    id, yPosition, label, group,
    mainSVG = d3.select('#tidelineSVG'),
    xScale,
    yScale = d3.scale.linear(),
    fillGap = 1,
    width,
    height = 60,
    pad = 5;

  function pool(selection, endpoints) {
    var poolData = d(endpoints);
    pool.allData(poolData);
    // select the pool group if it already exists
    group = selection.selectAll('#' + id).data([allData]);
    // otherwise create a new pool group
    group.enter().append('g').attr({
      'id': id,
      'transform': 'translate(0,' + yPosition + ')'
    });
    pool.updateYScale(allData).fillPool(xScale(poolData[0].timestamp)).plotPool();
  }

  pool.fillPool = function(init) {
    var rectGroup = group.selectAll('#' + id + '_fill').data(group.data());
    rectGroup.enter().append('g').attr('id', id + '_fill');
    for (var i = 0; i < 12; i++) {
      rectGroup.append('rect')
        .attr({
          'width': width,
          'height': height,
          'x': init + (i * (width + fillGap)) + fillGap/2,
          'y': 0,
          'fill': grays[j],
          'class': 'd3-rect on-deck'
        });
    }
    return pool;
  };

  pool.plotPool = function() {
    var plotGroup = group.selectAll('#' + id + '_random').data(group.data());
    plotGroup.enter().append('g').attr('id', id + '_random');
    plotGroup.selectAll('circle')
      .data(plotGroup.data()[0])
      .enter()
      .append('circle')
      .attr({
        'cx': function(d) {
          return xScale(d.timestamp);
        },
        'cy': function(d) {
          return yScale(d.value);
        },
        'r': 3,
        'fill': function(d) {
          return colors(d.value);
        },
        'class': 'd3-circle on-deck'
      });
    return pool;
  };

  pool.pan = function(e) {
    container.latestTranslation(e.translate[0]);
    d3.selectAll('.d3-circle').attr('transform', 'translate(' + e.translate[0] + ',0)');
    d3.selectAll('.d3-rect').attr('transform', 'translate(' + e.translate[0] + ',0)');
  };

  pool.drawLabel = function() {
    var labelGroup = d3.select('#tidelineLabels');
    labelGroup.append('text')
      .attr({
        'id': 'pool_' + id + '_label',
        'class': 'd3-pool-label',
        'transform': 'translate(0,' + yPosition + ')'
      })
      .text(label);
    return pool;
  };

  // getters & setters
  pool.allData = function(_) {
    if (!arguments.length) return allData;
    allData = allData.concat(_);
    return pool;
  }

  pool.id = function(_) {
    if (!arguments.length) return id;
    id = _;
    return pool;
  };

  pool.yPosition = function(_) {
    if (!arguments.length) return yPosition;
    yPosition = _;
    return pool;
  };

  pool.label = function(_) {
    if (!arguments.length) return label;
    label = _;
    return pool;
  }

  pool.updateYScale = function(_) {
    if (!arguments.length) return yScale;
    yScale.domain(d3.extent(_, function(d) { return d.value; })).range([height - pad, pad]);
    return pool;
  };

  pool.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return pool;
  };

  pool.pad = function(_) {
    if (!arguments.length) return pad;
    pad = _;
    return pool;
  };

  pool.xScale = function(_) {
    if (!arguments.length) return xScale;
    xScale = _;
    // width is equivalent to a duration of 2 hours minus the pixels for the gap in fill between sections
    width = xScale(new Date(2014, 0, 1, 2, 0, 0, 0)) - fillGap;
    return pool;
  }

  return pool;
};
},{"./data":2}]},{},[3])