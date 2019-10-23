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

/* jshint esversion:6 */

var i18next = require('i18next');
var t = i18next.t.bind(i18next);

// in order to get d3.chart dependency
var tideline = require('../../../js/');

var _ = require('lodash');
var React = require('react');
var sizeMe = require('react-sizeme');

require('./less/basics.less');
var basicsActions = require('./logic/actions');
var constants = require('./logic/constants');
var dt = require('../../../js/data/util/datetime');

var Section = require('./components/DashboardSection');
var CalendarContainer = require('./components/CalendarContainer');
var SummaryGroup = React.createFactory(require('./components/misc/SummaryGroup'));
var SiteChangeSelector = React.createFactory(require('./components/sitechange/Selector'));
var WrapCount = React.createFactory(require('./components/chart/WrapCount'));
var SiteChange = React.createFactory(require('./components/chart/SiteChange'));
var InfusionHoverDisplay = React.createFactory(require('./components/day/hover/InfusionHoverDisplay'));
var togglableState = require('./TogglableState');


var BasicsChart = React.createClass({
  propTypes: {
    aggregations: React.PropTypes.object.isRequired,
    bgClasses: React.PropTypes.object.isRequired,
    bgUnits: React.PropTypes.string.isRequired,
    data: React.PropTypes.object.isRequired,
    onSelectDay: React.PropTypes.func.isRequired,
    patient: React.PropTypes.object.isRequired,
    permsOfLoggedInUser: React.PropTypes.object.isRequired,
    size: React.PropTypes.object.isRequired,
    timePrefs: React.PropTypes.object.isRequired,
    // updateBasicsData: React.PropTypes.func.isRequired,
    updateBasicsSettings: React.PropTypes.func.isRequired,
    trackMetric: React.PropTypes.func.isRequired,
  },

  _insulinDataAvailable: function() {
    const {
      metaData: {
        latestDatumByType: {
          basal,
          bolus,
          wizard,
        } = {},
      } = {},
    } = this.props.data;

    return (basal || bolus || wizard);
  },

  _availableDeviceData: function () {
    const {
      metaData: {
        bgSources,
      } = {},
    } = this.props.data;

    var deviceTypes = [];

    if (bgSources.cbg) {
      deviceTypes.push('CGM');
    }

    if (bgSources.smbg) {
      deviceTypes.push('BGM');
    }

    if (this._insulinDataAvailable()) {
      deviceTypes.push('Pump');
    }

    return deviceTypes;
  },

  componentWillMount: function() {
    // var basicsData = _.get(this.props, 'aggregationsData', {});
    // console.log('basicsData', basicsData);
    // this.setState(basicsData);
    basicsActions.bindApp(this);

    this.setSectionsToState();
  },

  componentDidMount: function() {
    var availableDeviceData = this._availableDeviceData();
    console.log('availableDeviceData', availableDeviceData);

    if (availableDeviceData.length > 0) {
      var device = availableDeviceData.sort().join('+');
      if (availableDeviceData.length === 1) {
        device += ' only';
      }

      this.props.trackMetric('web - viewed basics data', { device });
    }
  },

  setSectionsToState: function() {
    const typeSectionIndexMap = {
      fingersticks: 0,
      boluses: 1,
      siteChanges: 2,
      basals: 3,
    }

    const sections = [];

    _.forOwn(this.props.aggregations, (aggregation, key) => {
      const isSiteChanges = key === 'siteChanges';
      const section = _.cloneDeep(aggregation);
      let chart = WrapCount;
      let hoverDisplay;
      let noDataMessage;
      let selector = SummaryGroup;
      let selectorOptions;
      let settingsTogglable = togglableState.off;

      if (isSiteChanges) {
        chart = SiteChange;
        hoverDisplay = InfusionHoverDisplay;
        noDataMessage = this._insulinDataAvailable() ? t('Infusion site changes are not yet available for all pumps. Coming soon!') : null;
        selector = SiteChangeSelector;
        settingsTogglable = togglableState.closed

        selectorOptions = {
          primary: { key: constants.SITE_CHANGE_RESERVOIR, label: t('Reservoir Changes') },
          rows: [
            [
              { key: constants.SITE_CHANGE_CANNULA, label: t('Cannula Fills') },
              { key: constants.SITE_CHANGE_TUBING, label: t('Tube Primes') },
            ]
          ]
        };
      } else {
        selectorOptions = _.groupBy(section.dimensions, dimension => dimension.primary ? 'primary' : 'rows');
        if (_.isArray(selectorOptions.primary)) selectorOptions.primary = selectorOptions.primary[0] || {};
        if (_.isArray(selectorOptions.rows)) selectorOptions.rows = _.chunk(selectorOptions.rows, 3);
      }

      _.defaults(section, {
        active: !section.disabled,
        chart,
        container: CalendarContainer,
        hasHover: true,
        hoverDisplay,
        id: key,
        index: typeSectionIndexMap[key],
        name: key,
        noDataMessage,
        togglable: togglableState.off,
        selector,
        selectorOptions,
        settingsTogglable,
      })

      sections.push(section);
    });

    const sortedSections = _.sortBy(sections, 'index');
    this.setState({ sections: sortedSections });
  },

  // componentWillUnmount: function() {
  //   this.props.updateBasicsData(this.state);
  // },

  render: function() {
    var aggregations = this.renderAggregations();
    return (
      <div>
        {aggregations}
      </div>
    );
  },

  renderAggregations: function() {
    const self = this;
    const timePrefs = self.props.timePrefs;
    const timezoneName = timePrefs.timezoneAware ? timePrefs.timezoneName : 'UTC';
    const range = _.get(self.props, 'data.data.current.endpoints.range', []);
    const aggregationsByDate = _.get(self.props, 'data.data.current.aggregationsByDate', {});
    const days = dt.findBasicsDays(range, timezoneName);

    console.log('aggregationsByDate', aggregationsByDate);
    console.log('range', range);
    console.log('days', days);
    console.log('self.state.sections', this.state.sections);

    return _.map(self.state.sections, function(section) {
      return (
        <Section key={section.name}
          bgClasses={self.props.bgClasses}
          bgUnits={self.props.bgUnits}
          chart={section.chart}
          chartWidth={self.props.size.width}
          data={aggregationsByDate[section.type]}
          days={days}
          labels={section.labels}
          name={section.name}
          onSelectDay={self.props.onSelectDay}
          open={section.open}
          togglable={section.togglable}
          section={section}
          title={section.title}
          settingsTogglable={section.settingsTogglable}
          updateBasicsSettings={self.props.updateBasicsSettings}
          timezone={timezoneName}
          trackMetric={self.props.trackMetric} />
      );
    });
  }
});

module.exports = sizeMe({ monitorHeight: true })(BasicsChart);
module.exports.inner = BasicsChart;
