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

    settings.load(data);
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
      oneDay.clear().show().locate();
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
      twoWeek.hideValues();
      $(this).parent().removeClass('active');
      $(this).html('Show Values');
    }
    else {
      twoWeek.showValues();
      $(this).parent().addClass('active');
      $(this).html('Hide Values');
    }
  });
});

},{}]},{},[1])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1ZvbHVtZXMvVGlkZXBvb2wvdGlkZWxpbmUvZXhhbXBsZS9leGFtcGxlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKiBcbiAqID09IEJTRDIgTElDRU5TRSA9PVxuICogQ29weXJpZ2h0IChjKSAyMDE0LCBUaWRlcG9vbCBQcm9qZWN0XG4gKiBcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOyB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5IGl0IHVuZGVyXG4gKiB0aGUgdGVybXMgb2YgdGhlIGFzc29jaWF0ZWQgTGljZW5zZSwgd2hpY2ggaXMgaWRlbnRpY2FsIHRvIHRoZSBCU0QgMi1DbGF1c2VcbiAqIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5IHRoZSBPcGVuIFNvdXJjZSBJbml0aWF0aXZlIGF0IG9wZW5zb3VyY2Uub3JnLlxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCwgYnV0IFdJVEhPVVRcbiAqIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTXG4gKiBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuIFNlZSB0aGUgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICogXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtOyBpZlxuICogbm90LCB5b3UgY2FuIG9idGFpbiBvbmUgZnJvbSBUaWRlcG9vbCBQcm9qZWN0IGF0IHRpZGVwb29sLm9yZy5cbiAqID09IEJTRDIgTElDRU5TRSA9PVxuICovXG5cbnZhciAkID0gd2luZG93LiQ7XG52YXIgZDMgPSB3aW5kb3cuZDM7XG52YXIgXyA9IHdpbmRvdy5fO1xuXG4vLyB0aWRlbGluZSBkZXBlbmRlbmNpZXMgJiBwbHVnaW5zXG52YXIgdGlkZWxpbmUgPSB3aW5kb3cudGlkZWxpbmU7XG52YXIgcHJlcHJvY2VzcyA9IHdpbmRvdy50aWRlbGluZS5wcmVwcm9jZXNzO1xudmFyIGJsaXAgPSB3aW5kb3cudGlkZWxpbmUuYmxpcDtcbnZhciBjaGFydERhaWx5RmFjdG9yeSA9IGJsaXAub25lZGF5O1xudmFyIGNoYXJ0V2Vla2x5RmFjdG9yeSA9IGJsaXAudHdvd2VlaztcbnZhciBzZXR0aW5nc0ZhY3RvcnkgPSBibGlwLnNldHRpbmdzO1xuXG52YXIgbG9nID0gd2luZG93LmJvd3MoJ0V4YW1wbGUnKTtcblxudmFyIGVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RpZGVsaW5lQ29udGFpbmVyJyk7XG52YXIgaW1hZ2VzQmFzZVVybCA9ICcuLi9pbWcnO1xuXG52YXIgb25lRGF5ID0gY2hhcnREYWlseUZhY3RvcnkoZWwsIHtpbWFnZXNCYXNlVXJsOiBpbWFnZXNCYXNlVXJsfSkuc2V0dXBQb29scygpO1xudmFyIHR3b1dlZWsgPSBjaGFydFdlZWtseUZhY3RvcnkoZWwsIHtpbWFnZXNCYXNlVXJsOiBpbWFnZXNCYXNlVXJsfSk7XG52YXIgc2V0dGluZ3MgPSBzZXR0aW5nc0ZhY3RvcnkoZWwpO1xuXG4vLyB0aGluZ3MgY29tbW9uIHRvIG9uZS1kYXkgYW5kIHR3by13ZWVrIHZpZXdzXG5vbmVEYXkuZW1pdHRlci5vbignbmF2aWdhdGVkJywgZnVuY3Rpb24obmF2U3RyaW5nKSB7XG4gIHZhciBkID0gbmV3IERhdGUobmF2U3RyaW5nWzBdKTtcbiAgdmFyIGZvcm1hdERhdGUgPSBkMy50aW1lLmZvcm1hdC51dGMoJyVBLCAlQiAlLWQnKTtcbiAgJCgnI3RpZGVsaW5lTmF2U3RyaW5nJykuaHRtbChmb3JtYXREYXRlKGQpKTtcbn0pO1xuXG50d29XZWVrLmVtaXR0ZXIub24oJ25hdmlnYXRlZCcsIGZ1bmN0aW9uKG5hdlN0cmluZykge1xuICB2YXIgYmVnID0gbmV3IERhdGUobmF2U3RyaW5nWzBdKTtcbiAgdmFyIGVuZCA9IG5ldyBEYXRlKG5hdlN0cmluZ1sxXSk7XG4gIHZhciBtb250aERheSA9IGQzLnRpbWUuZm9ybWF0LnV0YygnJUIgJS1kJyk7XG4gICQoJyN0aWRlbGluZU5hdlN0cmluZycpLmh0bWwobW9udGhEYXkoYmVnKSArICcgLSAnICsgbW9udGhEYXkoZW5kKSk7XG59KTtcblxub25lRGF5LmVtaXR0ZXIub24oJ21vc3RSZWNlbnQnLCBmdW5jdGlvbihtb3N0UmVjZW50KSB7XG4gIGlmIChtb3N0UmVjZW50KSB7XG4gICAgJCgnI21vc3RSZWNlbnQnKS5wYXJlbnQoKS5hZGRDbGFzcygnYWN0aXZlJyk7XG4gIH1cbiAgZWxzZSB7XG4gICAgJCgnI21vc3RSZWNlbnQnKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gIH1cbn0pO1xuXG50d29XZWVrLmVtaXR0ZXIub24oJ21vc3RSZWNlbnQnLCBmdW5jdGlvbihtb3N0UmVjZW50KSB7XG4gIGlmIChtb3N0UmVjZW50KSB7XG4gICAgJCgnI21vc3RSZWNlbnQnKS5wYXJlbnQoKS5hZGRDbGFzcygnYWN0aXZlJyk7XG4gIH1cbiAgZWxzZSB7XG4gICAgJCgnI21vc3RSZWNlbnQnKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gIH1cbn0pO1xuXG4vLyBsb2FkIGRhdGEgYW5kIGRyYXcgY2hhcnRzXG5kMy5qc29uKCdkYXRhL2RldmljZS1kYXRhLmpzb24nLCBmdW5jdGlvbihkYXRhKSB7XG4gIGxvZygnRGF0YSBsb2FkZWQuJyk7XG4gIGRhdGEgPSBwcmVwcm9jZXNzLnByb2Nlc3NEYXRhKGRhdGEpO1xuXG4gIGxvZygnSW5pdGlhbCBvbmUtZGF5IHZpZXcuJyk7XG4gIG9uZURheS5sb2FkKGRhdGEpLmxvY2F0ZSgnMjAxNC0wMy0wNlQwOTowMDowMC4wMDBaJyk7XG4gIC8vIGF0dGFjaCBjbGljayBoYW5kbGVycyB0byBzZXQgdXAgcHJvZ3JhbW1hdGljIHBhblxuICAkKCcjdGlkZWxpbmVOYXZGb3J3YXJkJykub24oJ2NsaWNrJywgb25lRGF5LnBhbkZvcndhcmQpO1xuICAkKCcjdGlkZWxpbmVOYXZCYWNrJykub24oJ2NsaWNrJywgb25lRGF5LnBhbkJhY2spO1xuXG4gICQoJyN0d29XZWVrVmlldycpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgIGxvZygnTmF2aWdhdGVkIHRvIHR3by13ZWVrIHZpZXcgZnJvbSBuYXYgYmFyLicpO1xuICAgIHZhciBkYXRlID0gb25lRGF5LmdldEN1cnJlbnREYXkoKTtcbiAgICBvbmVEYXkuY2xlYXIoKS5oaWRlKCk7XG4gICAgc2V0dGluZ3MuY2xlYXIoKTtcbiAgICB0d29XZWVrLmNsZWFyKCk7XG5cbiAgICAkKHRoaXMpLnBhcmVudCgpLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAkKCcjb25lRGF5VmlldycpLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAkKCcjZGV2aWNlU2V0dGluZ3MnKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgJCgnI3RpZGVsaW5lTGFiZWwnKS5jc3MoJ3Zpc2liaWxpdHknLCAndmlzaWJsZScpO1xuICAgICQoJy5vbmUtZGF5JykuY3NzKCd2aXNpYmlsaXR5JywgJ2hpZGRlbicpO1xuICAgICQoJy50d28td2VlaycpLmNzcygndmlzaWJpbGl0eScsICd2aXNpYmxlJyk7XG5cbiAgICAkKCcudGlkZWxpbmUtbmF2Jykub2ZmKCdjbGljaycpO1xuICAgIC8vIGF0dGFjaCBjbGljayBoYW5kbGVycyB0byBzZXQgdXAgcHJvZ3JhbW1hdGljIHBhblxuICAgICQoJyN0aWRlbGluZU5hdkZvcndhcmQnKS5vbignY2xpY2snLCB0d29XZWVrLnBhbkZvcndhcmQpO1xuICAgICQoJyN0aWRlbGluZU5hdkJhY2snKS5vbignY2xpY2snLCB0d29XZWVrLnBhbkJhY2spO1xuICAgIFxuICAgIC8vIHRha2VzIHVzZXIgdG8gdHdvLXdlZWsgdmlldyB3aXRoIGRheSB1c2VyIHdhcyB2aWV3aW5nIGluIG9uZS1kYXkgdmlldyBhdCB0aGUgZW5kIG9mIHRoZSB0d28td2VlayB2aWV3IHdpbmRvd1xuICAgIHR3b1dlZWsuc2hvdygpLmxvYWQoZGF0YSwgZGF0ZSk7XG4gIH0pO1xuXG4gICQoJyNkZXZpY2VTZXR0aW5ncycpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgIGxvZygnTmF2aWdhdGVkIHRvIGRldmljZSBzZXR0aW5ncyBmcm9tIGxvd2VyIG5hdiBiYXIuJyk7XG4gICAgb25lRGF5LmNsZWFyKCkuaGlkZSgpO1xuICAgIHR3b1dlZWsuY2xlYXIoKS5oaWRlKCk7XG5cbiAgICAkKHRoaXMpLnBhcmVudCgpLmFkZENsYXNzKCdhY3RpdmUnKTtcblxuICAgICQoJyNvbmVEYXlWaWV3JykucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICQoJyN0d29XZWVrVmlldycpLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAkKCcudHdvLXdlZWsnKS5jc3MoJ3Zpc2liaWxpdHknLCAnaGlkZGVuJyk7XG4gICAgJCgnI3RpZGVsaW5lTGFiZWwnKS5jc3MoJ3Zpc2liaWxpdHknLCAnaGlkZGVuJyk7XG5cbiAgICBzZXR0aW5ncy5sb2FkKGRhdGEpO1xuICB9KTtcblxuICAkKCcjb25lRGF5VmlldycpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgIGxvZygnTmF2aWdhdGVkIHRvIG9uZS1kYXkgdmlldyBmcm9tIG5hdiBiYXIuJyk7XG4gICAgdHdvV2Vlay5jbGVhcigpLmhpZGUoKTtcbiAgICBzZXR0aW5ncy5jbGVhcigpO1xuICAgIFxuICAgICQoJy50aWRlbGluZS1uYXYnKS5vZmYoJ2NsaWNrJyk7XG4gICAgLy8gYXR0YWNoIGNsaWNrIGhhbmRsZXJzIHRvIHNldCB1cCBwcm9ncmFtbWF0aWMgcGFuXG4gICAgJCgnI3RpZGVsaW5lTmF2Rm9yd2FyZCcpLm9uKCdjbGljaycsIG9uZURheS5wYW5Gb3J3YXJkKTtcbiAgICAkKCcjdGlkZWxpbmVOYXZCYWNrJykub24oJ2NsaWNrJywgb25lRGF5LnBhbkJhY2spO1xuXG4gICAgJCh0aGlzKS5wYXJlbnQoKS5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgXG4gICAgJCgnI3R3b1dlZWtWaWV3JykucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICQoJyNkZXZpY2VTZXR0aW5ncycpLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAkKCcjdGlkZWxpbmVMYWJlbCcpLmNzcygndmlzaWJpbGl0eScsICd2aXNpYmxlJyk7XG4gICAgJCgnLnR3by13ZWVrJykuY3NzKCd2aXNpYmlsaXR5JywgJ2hpZGRlbicpO1xuICAgIFxuICAgIC8vIHRha2VzIHVzZXIgdG8gb25lLWRheSB2aWV3IG9mIG1vc3QgcmVjZW50IGRhdGFcbiAgICBvbmVEYXkuc2hvdygpLmxvY2F0ZSgpO1xuICB9KTtcblxuICAkKCcjbW9zdFJlY2VudCcpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgIGxvZygnTmF2aWdhdGVkIHRvIG1vc3QgcmVjZW50IGRhdGEuJyk7XG4gICAgc2V0dGluZ3MuY2xlYXIoKTtcbiAgICAkKCcjdGlkZWxpbmVMYWJlbCcpLmNzcygndmlzaWJpbGl0eScsICd2aXNpYmxlJyk7XG4gICAgaWYgKCQoJyN0d29XZWVrVmlldycpLnBhcmVudCgpLmhhc0NsYXNzKCdhY3RpdmUnKSkge1xuICAgICAgdHdvV2Vlay5jbGVhcigpLmxvYWQoZGF0YSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgb25lRGF5LmNsZWFyKCkuc2hvdygpLmxvY2F0ZSgpO1xuICAgIH1cbiAgICAkKCcjbW9zdFJlY2VudCcpLnBhcmVudCgpLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAkKCcjZGV2aWNlU2V0dGluZ3MnKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gIH0pO1xuXG4gIHR3b1dlZWsuZW1pdHRlci5vbignc2VsZWN0U01CRycsIGZ1bmN0aW9uKGRhdGUpIHtcbiAgICBsb2coJ05hdmlnYXRlZCB0byBvbmUtZGF5IHZpZXcgZnJvbSBkb3VibGUgY2xpY2tpbmcgYSB0d28td2VlayB2aWV3IFNNQkcuJyk7XG4gICAgdHdvV2Vlay5jbGVhcigpLmhpZGUoKTtcbiAgICBcbiAgICAkKCcudGlkZWxpbmUtbmF2Jykub2ZmKCdjbGljaycpO1xuICAgIC8vIGF0dGFjaCBjbGljayBoYW5kbGVycyB0byBzZXQgdXAgcHJvZ3JhbW1hdGljIHBhblxuICAgICQoJyN0aWRlbGluZU5hdkZvcndhcmQnKS5vbignY2xpY2snLCBvbmVEYXkucGFuRm9yd2FyZCk7XG4gICAgJCgnI3RpZGVsaW5lTmF2QmFjaycpLm9uKCdjbGljaycsIG9uZURheS5wYW5CYWNrKTtcblxuICAgICQoJyNvbmVEYXlWaWV3JykucGFyZW50KCkuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICQoJyN0d29XZWVrVmlldycpLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAkKCcjb25lRGF5TW9zdFJlY2VudCcpLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAkKCcudHdvLXdlZWsnKS5jc3MoJ3Zpc2liaWxpdHknLCAnaGlkZGVuJyk7XG5cbiAgICAvLyB0YWtlcyB1c2VyIHRvIG9uZS1kYXkgdmlldyBvZiBkYXRlIGdpdmVuIGJ5IHRoZSAuZDMtc21iZy10aW1lIGVtaXR0ZXJcbiAgICBvbmVEYXkuc2hvdygpLmxvYWQoZGF0YSkubG9jYXRlKGRhdGUpO1xuICB9KTtcblxuICAkKCcjc2hvd0hpZGVOdW1iZXJzJykub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgaWYgKCQodGhpcykucGFyZW50KCkuaGFzQ2xhc3MoJ2FjdGl2ZScpKSB7XG4gICAgICB0d29XZWVrLmhpZGVWYWx1ZXMoKTtcbiAgICAgICQodGhpcykucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgJCh0aGlzKS5odG1sKCdTaG93IFZhbHVlcycpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHR3b1dlZWsuc2hvd1ZhbHVlcygpO1xuICAgICAgJCh0aGlzKS5wYXJlbnQoKS5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAkKHRoaXMpLmh0bWwoJ0hpZGUgVmFsdWVzJyk7XG4gICAgfVxuICB9KTtcbn0pO1xuIl19
