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

var tideline = require('../../../js/');

var _ = require('lodash');
const PropTypes = require('prop-types');
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


class BasicsChart extends React.Component {
  static propTypes = {
    aggregations: PropTypes.object.isRequired,
    bgClasses: PropTypes.object.isRequired,
    bgUnits: PropTypes.string.isRequired,
    data: PropTypes.object.isRequired,
    excludeDaysWithoutBolus: PropTypes.bool,
    onSelectDay: PropTypes.func.isRequired,
    patient: PropTypes.object.isRequired,
    permsOfLoggedInUser: PropTypes.object.isRequired,
    size: PropTypes.object.isRequired,
    timePrefs: PropTypes.object.isRequired,
    updateBasicsSettings: PropTypes.func.isRequired,
    trackMetric: PropTypes.func.isRequired,
  };

  _insulinDataAvailable = (props = this.props) => {
    const { basal, bolus, wizard } = _.get(props, 'data.metaData.latestDatumByType', {});

    return !!(basal || bolus || wizard);
  };

  _siteChangeDataAvailable = (props = this.props) => {
    const siteChangeDataCount = _.reduce(
      _.get(props, 'data.data.current.aggregationsByDate.siteChanges.byDate'),
      (result, value) => result + _.max(_.values(value.subtotals)),
      0
    );

    return siteChangeDataCount > 0
  };

  _availableDeviceData = () => {
    const { bgSources } = _.get(this.props, 'data.metaData', {});

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
  };

  componentWillMount() {
    basicsActions.bindApp(this);

    this.setSectionsToState();
  }

  // eslint-disable-next-line camelcase
  UNSAFE_componentWillReceiveProps(nextProps) {
    let reRenderSections = false;

    if (nextProps.aggregations) {
      _.each(nextProps.aggregations, ({ disabled }, key) => {
        if (disabled !== this.props.aggregations?.[key].disabled) reRenderSections = true;
      });
    }

    if (reRenderSections) this.setSectionsToState(nextProps);
  }

  componentDidMount() {
    var availableDeviceData = this._availableDeviceData();

    if (availableDeviceData.length > 0) {
      var device = availableDeviceData.sort().join('+');
      if (availableDeviceData.length === 1) {
        device += ' only';
      }

      this.props.trackMetric('web - viewed basics data', { device });
    }
  }

  setSectionsToState = (props = this.props) => {
    const typeSectionIndexMap = {
      fingersticks: 0,
      boluses: 1,
      siteChanges: 2,
      basals: 3,
    };

    const sections = [];

    _.forOwn(props.aggregations, (aggregation, key) => {
      const isSiteChanges = key === 'siteChanges';
      const section = _.cloneDeep(aggregation);
      let chart = WrapCount;
      let hasHover = true;
      let hoverDisplay;
      let noDataMessage;
      let selector = SummaryGroup;
      let selectorOptions;
      let selectorMetaData;
      let settingsTogglable = togglableState.off;

      if (isSiteChanges) {
        const { latestPumpUpload: latestPump } = _.get(props, 'data.metaData', {});

        const {
          profile: {
            fullName,
          },
          settings,
        } = props.patient;

        const permissions = props.permsOfLoggedInUser;
        const canUpdateSettings = permissions && (permissions.hasOwnProperty('custodian') || permissions.hasOwnProperty('root'));
        const hasSiteChangeSourceSettings = settings && settings.hasOwnProperty('siteChangeSource');

        chart = SiteChange;
        hoverDisplay = InfusionHoverDisplay;
        noDataMessage = this._insulinDataAvailable() ? t('Infusion site changes are not yet available for all pumps. Coming soon!') : null;
        selector = SiteChangeSelector;
        settingsTogglable = togglableState.off;

        if (!_.includes(_.map([constants.INSULET, constants.LOOP], _.lowerCase), section.manufacturer)) {
          hasHover = hasSiteChangeSourceSettings;
          settingsTogglable = hasSiteChangeSourceSettings ? togglableState.closed : togglableState.open;

          selectorOptions = {
            primary: { key: constants.SITE_CHANGE_RESERVOIR, label: t('Reservoir Changes') },
            rows: [
              [
                { key: constants.SITE_CHANGE_CANNULA, label: t('Cannula Fills'), selected: section.source === constants.SITE_CHANGE_CANNULA},
                { key: constants.SITE_CHANGE_TUBING, label: t('Tube Primes'), selected: section.source === constants.SITE_CHANGE_TUBING },
              ]
            ]
          };

          selectorMetaData = {
            latestPump,
            canUpdateSettings,
            hasSiteChangeSourceSettings,
            patientName: fullName,
          };
        }
      } else {
        selectorOptions = _.groupBy(section.dimensions, dimension => dimension.primary ? 'primary' : 'rows');
        if (_.isArray(selectorOptions.primary)) selectorOptions.primary = selectorOptions.primary[0] || {};

        if (section.type === 'basals') {
          const basalAggregationData = props.data?.data?.aggregationsByDate?.basals;
          const hasAutomatedSuspends = basalAggregationData?.automatedSuspend?.summary?.subtotals?.automatedSuspend?.count > 0;
          const hasAutomatedStops = basalAggregationData?.basal?.summary?.subtotals?.automatedStop?.count > 0;
          if (hasAutomatedSuspends && hasAutomatedStops) section.perRow = 2;
        }

        if (_.isArray(selectorOptions.rows)) selectorOptions.rows = _.chunk(_.orderBy(selectorOptions.rows, 'selectorIndex'), section.perRow || 3);
      }

      let active = !section.disabled;

      if (isSiteChanges) {
        active = !section.disabled || this._siteChangeDataAvailable()
      }

      _.defaults(section, {
        active,
        chart,
        container: CalendarContainer,
        hasHover,
        hoverDisplay,
        id: key,
        index: typeSectionIndexMap[key],
        name: key,
        noDataMessage,
        selector,
        selectorOptions,
        selectorMetaData,
        settingsTogglable,
      });

      sections.push(section);
    });

    const sortedSections = _.sortBy(sections, 'index');
    this.setState({ sections: sortedSections });
  };

  render() {
    var aggregations = this.renderAggregations();
    return (
      <div>
        {aggregations}
      </div>
    );
  }

  renderAggregations = () => {
    const self = this;
    const timePrefs = self.props.timePrefs;
    const timezoneName = timePrefs.timezoneAware ? timePrefs.timezoneName : 'UTC';
    const range = _.get(self.props, 'data.data.current.endpoints.range', []);
    const aggregationsByDate = _.get(self.props, 'data.data.aggregationsByDate', {});
    const days = dt.findBasicsDays(range, timezoneName);

    return _.map(self.state.sections, function(section) {
      return (
        <Section key={section.name}
          bgClasses={self.props.bgClasses}
          bgUnits={self.props.bgUnits}
          chart={section.chart}
          chartWidth={self.props.size.width}
          data={aggregationsByDate[section.type]}
          days={days}
          excludeDaysWithoutBolus={self.props.excludeDaysWithoutBolus}
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
  };
}

module.exports = sizeMe({ monitorHeight: true })(BasicsChart);
module.exports.inner = BasicsChart;
