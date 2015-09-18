/** @jsx React.DOM */
/* 
 * == BSD2 LICENSE ==
 * Copyright (c) 2015 Tidepool Project
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

var _ = require('lodash');
var bows = require('bows');
var cx = require('classnames');
var moment = require('moment');
var React = require('react');

var debug = bows('Calendar');
var basicsActions = require('../logic/actions');
var dotUtil = require('../util/dots');

var ADay = require('./day/ADay');
var HoverDay = require('./day/HoverDay');

var CalendarContainer = React.createClass({
  propTypes: {
    section: React.PropTypes.string.isRequired,
    component: React.PropTypes.string.isRequired,
    chart: React.PropTypes.func.isRequired,
    data: React.PropTypes.object.isRequired,
    days: React.PropTypes.array.isRequired,
    title: React.PropTypes.string.isRequired,
    type: React.PropTypes.string.isRequired,
    hasHover: React.PropTypes.bool
  },
  getInitialState: function() {
    return {
      hoverDate: null
    };
  },
  /**
   * Function that is passed to children to update the state
   * to the current hover date, of which there can only be one
   * 
   * @param  {String} date
   */
  onHover: function(date) {
    this.setState({hoverDate: date});
  },
  render: function() {
    var self = this;

    var containerClass = cx({
      'Calendar-container': true
    });

    var days = this.renderDays();
    var dayLabels = this.renderDayLabels();
    var legend = null;
    if (this.props.type === 'smbg') {
      legend = this.renderFingerstickLegend();
    }

    return (
      <div className='Container'>
        {legend}
        <div className={containerClass} ref='container'>
          <div className='Calendar' ref='content'>
            {dayLabels}
            {days}
          </div>
        </div>
      </div>
    );
  },
  renderFingerstickLegend: function() {
    return (
      <div className='Calendar-legend'>
        <div className='Calendar-legend-series'>
          {dotUtil.drawDot(1,true)}
          <span>Manual</span>
        </div>
        <div className='Calendar-legend-series'>
          {dotUtil.drawDot(1,false)}
          <span>Linked</span>
        </div>
      </div>
    );
  },
  renderDayLabels: function() {
    // Take the first day in the set and use this to set the day labels
    // Could be subject to change so I thought this was preferred over
    // hard-coding a solution that assumes Monday is the first day
    // of the week.
    var firstDay = moment(this.props.days[0].date).day();
    return _.range(firstDay, firstDay + 7).map(function(dow) {
      return (
        <div key={moment().day(dow)} className='Calendar-day-label'>
          <div className='Calendar-dayofweek'>
            {moment().day(dow).format('ddd')}
          </div>
        </div>
      );
    });
  },
  renderDays: function() {
    var self = this;

    return this.props.days.map(function(day, id) {
      if (self.props.hasHover && self.state.hoverDate === day.date) {
        return (
          <HoverDay key={day.date}
            data={self.props.data[self.props.type]}
            date={day.date}
            onHover={self.onHover}
            type={self.props.type} />
        );
      } else {
        return (
          <ADay key={day.date}
            chart={self.props.chart}
            data={self.props.data[self.props.type]}
            date={day.date}
            future={day.type === 'future'}
            mostRecent={day.type === 'mostRecent'}
            isFirst={id === 0}
            onHover={self.onHover}
            type={self.props.type} />
        );
      }  
    });
  }
});

module.exports = CalendarContainer;