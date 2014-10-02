/** @jsx React.DOM */
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
var _ = require('lodash');
var bows = require('bows');
var moment = require('moment');
var React = require('react');

// tideline dependencies & plugins
var chartWeeklyFactory = require('../../plugins/blip').twoweek;

var Header = require('./header');
var Footer = require('./footer');

var tideline = {
  log: bows('Two Weeks')
};

var Weekly = React.createClass({
  chartType: 'weekly',
  log: bows('Weekly View'),
  propTypes: {
    bgPrefs: React.PropTypes.object.isRequired,
    chartPrefs: React.PropTypes.object.isRequired,
    initialDatetimeLocation: React.PropTypes.string,
    patientData: React.PropTypes.object.isRequired,
    onSwitchToDaily: React.PropTypes.func.isRequired,
    onSwitchToSettings: React.PropTypes.func.isRequired,
    onSwitchToWeekly: React.PropTypes.func.isRequired,
    updateChartPrefs: React.PropTypes.func.isRequired,
    updateDatetimeLocation: React.PropTypes.func.isRequired
  },
  getInitialState: function() {
    return {
      atMostRecent: false,
      inTransition: false,
      showingValues: false,
      title: ''
    };
  },
  render: function() {
    /* jshint ignore:start */
    return (
      <div id="tidelineMain" className="grid">
        <Header
          chartType={this.chartType}
          atMostRecent={this.state.atMostRecent}
          inTransition={this.state.inTransition}
          title={this.state.title}
          iconBack={'icon-back-down'}
          iconNext={'icon-next-up'}
          iconMostRecent={'icon-most-recent-up'}
          onClickBack={this.handlePanBack}
          onClickMostRecent={this.handleClickMostRecent}
          onClickNext={this.handlePanForward}
          onClickOneDay={this.handleClickOneDay}
          onClickTwoWeeks={this.handleClickTwoWeeks}
          onClickSettings={this.props.onSwitchToSettings}
        ref="header" />
        <div id="tidelineOuterContainer">
          <WeeklyChart
            bgClasses={this.props.bgPrefs.bgClasses}
            bgUnits={this.props.bgPrefs.bgUnits}
            initialDatetimeLocation={this.props.initialDatetimeLocation}
            patientData={this.props.patientData}
            // handlers
            onDatetimeLocationChange={this.handleDatetimeLocationChange}
            onMostRecent={this.handleMostRecent}
            onClickValues={this.toggleValues}
            onSelectSMBG={this.handleSelectSMBG}
            onTransition={this.handleInTransition}
            ref="chart" />
        </div>
        <Footer
         chartType={this.chartType}
         onClickValues={this.toggleValues}
         showingValues={this.state.showingValues}
        ref="footer" />
      </div>
      );
    /* jshint ignore:end */
  },
  formatDate: function(datetime) {
    return moment(datetime).utc().format('MMMM Do');
  },
  getTitle: function(datetimeLocationEndpoints) {
    return this.formatDate(datetimeLocationEndpoints[0]) + ' - ' + this.formatDate(datetimeLocationEndpoints[1]);
  },
  // handlers
  handleClickMostRecent: function() {
    this.setState({showingValues: false});
    this.refs.chart.goToMostRecent();
  },
  handleClickOneDay: function() {
    var datetime = this.refs.chart.getCurrentDay();
    this.props.onSwitchToDaily(datetime);
  },
  handleClickTwoWeeks: function() {
    // when you're on two-week view, clicking one-day does nothing
    return;
  },
  handleDatetimeLocationChange: function(datetimeLocationEndpoints) {
    this.setState({
      datetimeLocation: datetimeLocationEndpoints[1],
      title: this.getTitle(datetimeLocationEndpoints)
    });
    this.props.updateDatetimeLocation(this.refs.chart.getCurrentDay());
  },
  handleInTransition: function(inTransition) {
    this.setState({
      inTransition: inTransition
    });
  },
  handleMostRecent: function(atMostRecent) {
    this.setState({
      atMostRecent: atMostRecent
    });
  },
  handlePanBack: function() {
    this.refs.chart.panBack();
  },
  handlePanForward: function() {
    this.refs.chart.panForward();
  },
  handleSelectSMBG: function(datetime) {
    this.props.onSwitchToDaily(datetime);
  },
  toggleValues: function() {
    if (this.state.showingValues) {
      this.refs.chart.hideValues();
    }
    else {
      this.refs.chart.showValues();
    }
    this.setState({showingValues: !this.state.showingValues});
  }
});

var WeeklyChart = React.createClass({
  chartOpts: ['bgClasses', 'bgUnits'],
  log: bows('Weekly Chart'),
  propTypes: {
    bgClasses: React.PropTypes.object.isRequired,
    bgUnits: React.PropTypes.string.isRequired,
    initialDatetimeLocation: React.PropTypes.string,
    patientData: React.PropTypes.object.isRequired,
    // handlers
    onDatetimeLocationChange: React.PropTypes.func.isRequired,
    onMostRecent: React.PropTypes.func.isRequired,
    onClickValues: React.PropTypes.func.isRequired,
    onSelectSMBG: React.PropTypes.func.isRequired,
    onTransition: React.PropTypes.func.isRequired
  },
  componentDidMount: function() {
    this.mountChart(this.getDOMNode());
    this.initializeChart(this.props.patientData, this.props.initialDatetimeLocation);
  },
  componentWillUnmount: function() {
    this.unmountChart();
  },
  mountChart: function(node, chartOpts) {
    this.log('Mounting...');
    this.chart = chartWeeklyFactory(node,  _.pick(this.props, this.chartOpts));
    this.bindEvents();
  },
  unmountChart: function() {
    this.log('Unmounting...');
    this.chart.destroy();
  },
  bindEvents: function() {
    this.chart.emitter.on('inTransition', this.props.onTransition);
    this.chart.emitter.on('navigated', this.handleDatetimeLocationChange);
    this.chart.emitter.on('mostRecent', this.props.onMostRecent);
    this.chart.emitter.on('selectSMBG', this.props.onSelectSMBG);
  },
  initializeChart: function(data, datetimeLocation) {
    this.log('Initializing...');
    if (_.isEmpty(data)) {
      throw new Error('Cannot create new chart with no data');
    }

    if (datetimeLocation) {
      this.chart.load(data, datetimeLocation);
    }
    else {
      this.chart.load(data);
    }
  },
  render: function() {
    /* jshint ignore:start */
    return (
      <div id="tidelineContainer"></div>
      );
    /* jshint ignore:end */
  },
  // handlers
  handleDatetimeLocationChange: function(datetimeLocationEndpoints) {
    this.setState({
      datetimeLocation: datetimeLocationEndpoints[1]
    });
    this.props.onDatetimeLocationChange(datetimeLocationEndpoints);
  },
  getCurrentDay: function() {
    return this.chart.getCurrentDay().toISOString();
  },
  goToMostRecent: function() {
    this.chart.clear();
    this.bindEvents();
    this.chart.load(this.props.patientData);
  },
  hideValues: function() {
    this.chart.hideValues();
  },
  panBack: function() {
    this.chart.panBack();
  },
  panForward: function() {
    this.chart.panForward();
  },
  showValues: function() {
    this.chart.showValues();
  }
});

module.exports = Weekly;
