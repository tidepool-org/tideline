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

var $ = window.$;
var d3 = window.d3;
var _ = window._;

// tideline dependencies & plugins
var tideline = window.tideline;
var preprocess = window.tideline.preprocess;
var blip = window.tideline.blip;
var chartDailyFactory = blip.oneday;
var chartWeeklyFactory = blip.twoweek;
var settingsFactory = blip.settings;

var log = window.bows('Example');

var el = document.getElementById('tidelineContainer');
var imagesBaseUrl = '../img';

var oneDay = chartDailyFactory(el, {imagesBaseUrl: imagesBaseUrl}).setupPools();
var twoWeek = chartWeeklyFactory(el, {imagesBaseUrl: imagesBaseUrl});
var settings = settingsFactory(el);

// things common to one-day and two-week views
oneDay.emitter.on('navigated', function(navString) {
  var d = new Date(navString[0]);
  var formatDate = d3.time.format.utc('%A, %B %-d');
  $('#tidelineNavString').html(formatDate(d));
});

twoWeek.emitter.on('navigated', function(navString) {
  var beg = new Date(navString[0]);
  var end = new Date(navString[1]);
  var monthDay = d3.time.format.utc('%B %-d');
  $('#tidelineNavString').html(monthDay(beg) + ' - ' + monthDay(end));
});

oneDay.emitter.on('mostRecent', function(mostRecent) {
  if (mostRecent) {
    $('#mostRecent').parent().addClass('active');
  }
  else {
    $('#mostRecent').parent().removeClass('active');
  }
});

twoWeek.emitter.on('mostRecent', function(mostRecent) {
  if (mostRecent) {
    $('#mostRecent').parent().addClass('active');
  }
  else {
    $('#mostRecent').parent().removeClass('active');
  }
});

// load data and draw charts
d3.json('data/device-data.json', function(data) {
  log('Data loaded.');
  data = preprocess.processData(data);

  log('Initial one-day view.');
  oneDay.load(data).locate('2014-03-06T09:00:00.000Z');
  // attach click handlers to set up programmatic pan
  $('#tidelineNavForward').on('click', oneDay.panForward);
  $('#tidelineNavBack').on('click', oneDay.panBack);

  $('#twoWeekView').on('click', function() {
    log('Navigated to two-week view from nav bar.');
    var date = oneDay.getCurrentDay();
    oneDay.clear().hide();
    settings.clear();
    twoWeek.clear();

    $(this).parent().addClass('active');
    $('#oneDayView').parent().removeClass('active');
    $('#deviceSettings').parent().removeClass('active');
    $('#tidelineLabel').css('visibility', 'visible');
    $('.one-day').css('visibility', 'hidden');
    $('.two-week').css('visibility', 'visible');

    $('.tideline-nav').off('click');
    // attach click handlers to set up programmatic pan
    $('#tidelineNavForward').on('click', twoWeek.panForward);
    $('#tidelineNavBack').on('click', twoWeek.panBack);
    
    // takes user to two-week view with day user was viewing in one-day view at the end of the two-week view window
    twoWeek.show().load(data, date);
  });

  $('#deviceSettings').on('click', function() {
    log('Navigated to device settings from lower nav bar.');
    oneDay.clear().hide();
    twoWeek.clear().hide();

    $(this).parent().addClass('active');

    $('#oneDayView').parent().removeClass('active');
    $('#twoWeekView').parent().removeClass('active');
    $('.two-week').css('visibility', 'hidden');
    $('#tidelineLabel').css('visibility', 'hidden');

    settings.draw(data);
  });

  $('#oneDayView').on('click', function() {
    log('Navigated to one-day view from nav bar.');
    twoWeek.clear().hide();
    settings.clear();
    
    $('.tideline-nav').off('click');
    // attach click handlers to set up programmatic pan
    $('#tidelineNavForward').on('click', oneDay.panForward);
    $('#tidelineNavBack').on('click', oneDay.panBack);

    $(this).parent().addClass('active');
    
    $('#twoWeekView').parent().removeClass('active');
    $('#deviceSettings').parent().removeClass('active');
    $('#mostRecent').parent().addClass('active');
    $('#tidelineLabel').css('visibility', 'visible');
    $('.two-week').css('visibility', 'hidden');
    
    // takes user to one-day view of most recent data
    oneDay.show().locate();
  });

  $('#mostRecent').on('click', function() {
    log('Navigated to most recent data.');
    settings.clear();
    $('#tidelineLabel').css('visibility', 'visible');
    if ($('#twoWeekView').parent().hasClass('active')) {
      twoWeek.clear().load(data);
    }
    else {
      oneDay.clear().locate();
    }
    $('#mostRecent').parent().addClass('active');
    $('#deviceSettings').parent().removeClass('active');
  });

  twoWeek.emitter.on('selectSMBG', function(date) {
    log('Navigated to one-day view from double clicking a two-week view SMBG.');
    twoWeek.clear().hide();
    
    $('.tideline-nav').off('click');
    // attach click handlers to set up programmatic pan
    $('#tidelineNavForward').on('click', oneDay.panForward);
    $('#tidelineNavBack').on('click', oneDay.panBack);

    $('#oneDayView').parent().addClass('active');
    $('#twoWeekView').parent().removeClass('active');
    $('#oneDayMostRecent').parent().removeClass('active');
    $('.two-week').css('visibility', 'hidden');

    // takes user to one-day view of date given by the .d3-smbg-time emitter
    oneDay.show().load(data).locate(date);
  });

  $('#showHideNumbers').on('click', function() {
    if ($(this).parent().hasClass('active')) {
      twoWeek.emitter.emit('numbers', 'hide');
      $(this).parent().removeClass('active');
      $(this).html('Show Values');
    }
    else {
      twoWeek.emitter.emit('numbers', 'show');
      $(this).parent().addClass('active');
      $(this).html('Hide Values');
    }
  });
});

},{}]},{},[1])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1ZvbHVtZXMvVGlkZXBvb2wvdGlkZWxpbmUvZXhhbXBsZS9leGFtcGxlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qIFxuICogPT0gQlNEMiBMSUNFTlNFID09XG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQsIFRpZGVwb29sIFByb2plY3RcbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU7IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnkgaXQgdW5kZXJcbiAqIHRoZSB0ZXJtcyBvZiB0aGUgYXNzb2NpYXRlZCBMaWNlbnNlLCB3aGljaCBpcyBpZGVudGljYWwgdG8gdGhlIEJTRCAyLUNsYXVzZVxuICogTGljZW5zZSBhcyBwdWJsaXNoZWQgYnkgdGhlIE9wZW4gU291cmNlIEluaXRpYXRpdmUgYXQgb3BlbnNvdXJjZS5vcmcuXG4gKiBcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLCBidXQgV0lUSE9VVFxuICogQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2YgTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1NcbiAqIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gU2VlIHRoZSBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKiBcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW07IGlmXG4gKiBub3QsIHlvdSBjYW4gb2J0YWluIG9uZSBmcm9tIFRpZGVwb29sIFByb2plY3QgYXQgdGlkZXBvb2wub3JnLlxuICogPT0gQlNEMiBMSUNFTlNFID09XG4gKi9cblxudmFyICQgPSB3aW5kb3cuJDtcbnZhciBkMyA9IHdpbmRvdy5kMztcbnZhciBfID0gd2luZG93Ll87XG5cbi8vIHRpZGVsaW5lIGRlcGVuZGVuY2llcyAmIHBsdWdpbnNcbnZhciB0aWRlbGluZSA9IHdpbmRvdy50aWRlbGluZTtcbnZhciBwcmVwcm9jZXNzID0gd2luZG93LnRpZGVsaW5lLnByZXByb2Nlc3M7XG52YXIgYmxpcCA9IHdpbmRvdy50aWRlbGluZS5ibGlwO1xudmFyIGNoYXJ0RGFpbHlGYWN0b3J5ID0gYmxpcC5vbmVkYXk7XG52YXIgY2hhcnRXZWVrbHlGYWN0b3J5ID0gYmxpcC50d293ZWVrO1xudmFyIHNldHRpbmdzRmFjdG9yeSA9IGJsaXAuc2V0dGluZ3M7XG5cbnZhciBsb2cgPSB3aW5kb3cuYm93cygnRXhhbXBsZScpO1xuXG52YXIgZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndGlkZWxpbmVDb250YWluZXInKTtcbnZhciBpbWFnZXNCYXNlVXJsID0gJy4uL2ltZyc7XG5cbnZhciBvbmVEYXkgPSBjaGFydERhaWx5RmFjdG9yeShlbCwge2ltYWdlc0Jhc2VVcmw6IGltYWdlc0Jhc2VVcmx9KS5zZXR1cFBvb2xzKCk7XG52YXIgdHdvV2VlayA9IGNoYXJ0V2Vla2x5RmFjdG9yeShlbCwge2ltYWdlc0Jhc2VVcmw6IGltYWdlc0Jhc2VVcmx9KTtcbnZhciBzZXR0aW5ncyA9IHNldHRpbmdzRmFjdG9yeShlbCk7XG5cbi8vIHRoaW5ncyBjb21tb24gdG8gb25lLWRheSBhbmQgdHdvLXdlZWsgdmlld3Ncbm9uZURheS5lbWl0dGVyLm9uKCduYXZpZ2F0ZWQnLCBmdW5jdGlvbihuYXZTdHJpbmcpIHtcbiAgdmFyIGQgPSBuZXcgRGF0ZShuYXZTdHJpbmdbMF0pO1xuICB2YXIgZm9ybWF0RGF0ZSA9IGQzLnRpbWUuZm9ybWF0LnV0YygnJUEsICVCICUtZCcpO1xuICAkKCcjdGlkZWxpbmVOYXZTdHJpbmcnKS5odG1sKGZvcm1hdERhdGUoZCkpO1xufSk7XG5cbnR3b1dlZWsuZW1pdHRlci5vbignbmF2aWdhdGVkJywgZnVuY3Rpb24obmF2U3RyaW5nKSB7XG4gIHZhciBiZWcgPSBuZXcgRGF0ZShuYXZTdHJpbmdbMF0pO1xuICB2YXIgZW5kID0gbmV3IERhdGUobmF2U3RyaW5nWzFdKTtcbiAgdmFyIG1vbnRoRGF5ID0gZDMudGltZS5mb3JtYXQudXRjKCclQiAlLWQnKTtcbiAgJCgnI3RpZGVsaW5lTmF2U3RyaW5nJykuaHRtbChtb250aERheShiZWcpICsgJyAtICcgKyBtb250aERheShlbmQpKTtcbn0pO1xuXG5vbmVEYXkuZW1pdHRlci5vbignbW9zdFJlY2VudCcsIGZ1bmN0aW9uKG1vc3RSZWNlbnQpIHtcbiAgaWYgKG1vc3RSZWNlbnQpIHtcbiAgICAkKCcjbW9zdFJlY2VudCcpLnBhcmVudCgpLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgfVxuICBlbHNlIHtcbiAgICAkKCcjbW9zdFJlY2VudCcpLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgfVxufSk7XG5cbnR3b1dlZWsuZW1pdHRlci5vbignbW9zdFJlY2VudCcsIGZ1bmN0aW9uKG1vc3RSZWNlbnQpIHtcbiAgaWYgKG1vc3RSZWNlbnQpIHtcbiAgICAkKCcjbW9zdFJlY2VudCcpLnBhcmVudCgpLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgfVxuICBlbHNlIHtcbiAgICAkKCcjbW9zdFJlY2VudCcpLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgfVxufSk7XG5cbi8vIGxvYWQgZGF0YSBhbmQgZHJhdyBjaGFydHNcbmQzLmpzb24oJ2RhdGEvZGV2aWNlLWRhdGEuanNvbicsIGZ1bmN0aW9uKGRhdGEpIHtcbiAgbG9nKCdEYXRhIGxvYWRlZC4nKTtcbiAgZGF0YSA9IHByZXByb2Nlc3MucHJvY2Vzc0RhdGEoZGF0YSk7XG5cbiAgbG9nKCdJbml0aWFsIG9uZS1kYXkgdmlldy4nKTtcbiAgb25lRGF5LmxvYWQoZGF0YSkubG9jYXRlKCcyMDE0LTAzLTA2VDA5OjAwOjAwLjAwMFonKTtcbiAgLy8gYXR0YWNoIGNsaWNrIGhhbmRsZXJzIHRvIHNldCB1cCBwcm9ncmFtbWF0aWMgcGFuXG4gICQoJyN0aWRlbGluZU5hdkZvcndhcmQnKS5vbignY2xpY2snLCBvbmVEYXkucGFuRm9yd2FyZCk7XG4gICQoJyN0aWRlbGluZU5hdkJhY2snKS5vbignY2xpY2snLCBvbmVEYXkucGFuQmFjayk7XG5cbiAgJCgnI3R3b1dlZWtWaWV3Jykub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgbG9nKCdOYXZpZ2F0ZWQgdG8gdHdvLXdlZWsgdmlldyBmcm9tIG5hdiBiYXIuJyk7XG4gICAgdmFyIGRhdGUgPSBvbmVEYXkuZ2V0Q3VycmVudERheSgpO1xuICAgIG9uZURheS5jbGVhcigpLmhpZGUoKTtcbiAgICBzZXR0aW5ncy5jbGVhcigpO1xuICAgIHR3b1dlZWsuY2xlYXIoKTtcblxuICAgICQodGhpcykucGFyZW50KCkuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICQoJyNvbmVEYXlWaWV3JykucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICQoJyNkZXZpY2VTZXR0aW5ncycpLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAkKCcjdGlkZWxpbmVMYWJlbCcpLmNzcygndmlzaWJpbGl0eScsICd2aXNpYmxlJyk7XG4gICAgJCgnLm9uZS1kYXknKS5jc3MoJ3Zpc2liaWxpdHknLCAnaGlkZGVuJyk7XG4gICAgJCgnLnR3by13ZWVrJykuY3NzKCd2aXNpYmlsaXR5JywgJ3Zpc2libGUnKTtcblxuICAgICQoJy50aWRlbGluZS1uYXYnKS5vZmYoJ2NsaWNrJyk7XG4gICAgLy8gYXR0YWNoIGNsaWNrIGhhbmRsZXJzIHRvIHNldCB1cCBwcm9ncmFtbWF0aWMgcGFuXG4gICAgJCgnI3RpZGVsaW5lTmF2Rm9yd2FyZCcpLm9uKCdjbGljaycsIHR3b1dlZWsucGFuRm9yd2FyZCk7XG4gICAgJCgnI3RpZGVsaW5lTmF2QmFjaycpLm9uKCdjbGljaycsIHR3b1dlZWsucGFuQmFjayk7XG4gICAgXG4gICAgLy8gdGFrZXMgdXNlciB0byB0d28td2VlayB2aWV3IHdpdGggZGF5IHVzZXIgd2FzIHZpZXdpbmcgaW4gb25lLWRheSB2aWV3IGF0IHRoZSBlbmQgb2YgdGhlIHR3by13ZWVrIHZpZXcgd2luZG93XG4gICAgdHdvV2Vlay5zaG93KCkubG9hZChkYXRhLCBkYXRlKTtcbiAgfSk7XG5cbiAgJCgnI2RldmljZVNldHRpbmdzJykub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgbG9nKCdOYXZpZ2F0ZWQgdG8gZGV2aWNlIHNldHRpbmdzIGZyb20gbG93ZXIgbmF2IGJhci4nKTtcbiAgICBvbmVEYXkuY2xlYXIoKS5oaWRlKCk7XG4gICAgdHdvV2Vlay5jbGVhcigpLmhpZGUoKTtcblxuICAgICQodGhpcykucGFyZW50KCkuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuXG4gICAgJCgnI29uZURheVZpZXcnKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgJCgnI3R3b1dlZWtWaWV3JykucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICQoJy50d28td2VlaycpLmNzcygndmlzaWJpbGl0eScsICdoaWRkZW4nKTtcbiAgICAkKCcjdGlkZWxpbmVMYWJlbCcpLmNzcygndmlzaWJpbGl0eScsICdoaWRkZW4nKTtcblxuICAgIHNldHRpbmdzLmRyYXcoZGF0YSk7XG4gIH0pO1xuXG4gICQoJyNvbmVEYXlWaWV3Jykub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgbG9nKCdOYXZpZ2F0ZWQgdG8gb25lLWRheSB2aWV3IGZyb20gbmF2IGJhci4nKTtcbiAgICB0d29XZWVrLmNsZWFyKCkuaGlkZSgpO1xuICAgIHNldHRpbmdzLmNsZWFyKCk7XG4gICAgXG4gICAgJCgnLnRpZGVsaW5lLW5hdicpLm9mZignY2xpY2snKTtcbiAgICAvLyBhdHRhY2ggY2xpY2sgaGFuZGxlcnMgdG8gc2V0IHVwIHByb2dyYW1tYXRpYyBwYW5cbiAgICAkKCcjdGlkZWxpbmVOYXZGb3J3YXJkJykub24oJ2NsaWNrJywgb25lRGF5LnBhbkZvcndhcmQpO1xuICAgICQoJyN0aWRlbGluZU5hdkJhY2snKS5vbignY2xpY2snLCBvbmVEYXkucGFuQmFjayk7XG5cbiAgICAkKHRoaXMpLnBhcmVudCgpLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICBcbiAgICAkKCcjdHdvV2Vla1ZpZXcnKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgJCgnI2RldmljZVNldHRpbmdzJykucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICQoJyNtb3N0UmVjZW50JykucGFyZW50KCkuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICQoJyN0aWRlbGluZUxhYmVsJykuY3NzKCd2aXNpYmlsaXR5JywgJ3Zpc2libGUnKTtcbiAgICAkKCcudHdvLXdlZWsnKS5jc3MoJ3Zpc2liaWxpdHknLCAnaGlkZGVuJyk7XG4gICAgXG4gICAgLy8gdGFrZXMgdXNlciB0byBvbmUtZGF5IHZpZXcgb2YgbW9zdCByZWNlbnQgZGF0YVxuICAgIG9uZURheS5zaG93KCkubG9jYXRlKCk7XG4gIH0pO1xuXG4gICQoJyNtb3N0UmVjZW50Jykub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgbG9nKCdOYXZpZ2F0ZWQgdG8gbW9zdCByZWNlbnQgZGF0YS4nKTtcbiAgICBzZXR0aW5ncy5jbGVhcigpO1xuICAgICQoJyN0aWRlbGluZUxhYmVsJykuY3NzKCd2aXNpYmlsaXR5JywgJ3Zpc2libGUnKTtcbiAgICBpZiAoJCgnI3R3b1dlZWtWaWV3JykucGFyZW50KCkuaGFzQ2xhc3MoJ2FjdGl2ZScpKSB7XG4gICAgICB0d29XZWVrLmNsZWFyKCkubG9hZChkYXRhKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBvbmVEYXkuY2xlYXIoKS5sb2NhdGUoKTtcbiAgICB9XG4gICAgJCgnI21vc3RSZWNlbnQnKS5wYXJlbnQoKS5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgJCgnI2RldmljZVNldHRpbmdzJykucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICB9KTtcblxuICB0d29XZWVrLmVtaXR0ZXIub24oJ3NlbGVjdFNNQkcnLCBmdW5jdGlvbihkYXRlKSB7XG4gICAgbG9nKCdOYXZpZ2F0ZWQgdG8gb25lLWRheSB2aWV3IGZyb20gZG91YmxlIGNsaWNraW5nIGEgdHdvLXdlZWsgdmlldyBTTUJHLicpO1xuICAgIHR3b1dlZWsuY2xlYXIoKS5oaWRlKCk7XG4gICAgXG4gICAgJCgnLnRpZGVsaW5lLW5hdicpLm9mZignY2xpY2snKTtcbiAgICAvLyBhdHRhY2ggY2xpY2sgaGFuZGxlcnMgdG8gc2V0IHVwIHByb2dyYW1tYXRpYyBwYW5cbiAgICAkKCcjdGlkZWxpbmVOYXZGb3J3YXJkJykub24oJ2NsaWNrJywgb25lRGF5LnBhbkZvcndhcmQpO1xuICAgICQoJyN0aWRlbGluZU5hdkJhY2snKS5vbignY2xpY2snLCBvbmVEYXkucGFuQmFjayk7XG5cbiAgICAkKCcjb25lRGF5VmlldycpLnBhcmVudCgpLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAkKCcjdHdvV2Vla1ZpZXcnKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgJCgnI29uZURheU1vc3RSZWNlbnQnKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgJCgnLnR3by13ZWVrJykuY3NzKCd2aXNpYmlsaXR5JywgJ2hpZGRlbicpO1xuXG4gICAgLy8gdGFrZXMgdXNlciB0byBvbmUtZGF5IHZpZXcgb2YgZGF0ZSBnaXZlbiBieSB0aGUgLmQzLXNtYmctdGltZSBlbWl0dGVyXG4gICAgb25lRGF5LnNob3coKS5sb2FkKGRhdGEpLmxvY2F0ZShkYXRlKTtcbiAgfSk7XG5cbiAgJCgnI3Nob3dIaWRlTnVtYmVycycpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgIGlmICgkKHRoaXMpLnBhcmVudCgpLmhhc0NsYXNzKCdhY3RpdmUnKSkge1xuICAgICAgdHdvV2Vlay5lbWl0dGVyLmVtaXQoJ251bWJlcnMnLCAnaGlkZScpO1xuICAgICAgJCh0aGlzKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAkKHRoaXMpLmh0bWwoJ1Nob3cgVmFsdWVzJyk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdHdvV2Vlay5lbWl0dGVyLmVtaXQoJ251bWJlcnMnLCAnc2hvdycpO1xuICAgICAgJCh0aGlzKS5wYXJlbnQoKS5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAkKHRoaXMpLmh0bWwoJ0hpZGUgVmFsdWVzJyk7XG4gICAgfVxuICB9KTtcbn0pO1xuIl19
