/*
 * == BSD2 LICENSE ==
 * Copyright (c) 2015, Tidepool Project
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

/* jshint esversion:9 */
/* global sinon */

var _ = require('lodash');
var chai = require('chai');
var expect = chai.expect;

var React = require('react');
var ReactDOM = require('react-dom');
var TestUtils = require('react-dom/test-utils');

var BasicsChart = require('../plugins/blip/basics/chartbasicsfactory');
var types = require('../dev/testpage/types');

var { MGDL_UNITS, MMOL_UNITS } = require('../js/data/util/constants');

var defaultData = {
  metaData: {
    latestDatumByType: {
      bolus: new types.Bolus(),
      basal: new types.Basal(),
      wizard: new types.Wizard(),
    },
    bgSources: {
      cbg: true,
      smbg: true,
      current: 'cbg',
    }
  },
};

var defaultAggregations = {
  basals: {
    active: true,
    dimensions: [
      { path: 'summary', key: 'total', label: 'Basal Events', primary: true },
      { path: 'summary.subtotals', key: 'temp', label: 'Temp Basals' },
      { path: 'summary.subtotals', key: 'suspend', label: 'Suspends' },
      { path: 'summary.subtotals', key: 'automatedStop', label: 'Automated Exited', hideEmpty: true },
    ],
    disabled: false,
    emptyText: undefined,
    summaryTitle: 'Total basal events',
    title: 'Basals',
    type: 'basals',
  },
  boluses: {
    active: true,
    dimensions: [
      { path: 'summary', key: 'total', label: 'Avg per day', average: true, primary: true },
      { path: 'summary.subtotals', key: 'wizard', label: 'Calculator', percentage: true, selectorIndex: 0 },
      { path: 'summary.subtotals', key: 'correction', label: 'Correction', percentage: true, selectorIndex: 1 },
      { path: 'summary.subtotals', key: 'extended', label: 'Extended', percentage: true, selectorIndex: 3 },
      { path: 'summary.subtotals', key: 'interrupted', label: 'Interrupted', percentage: true, selectorIndex: 4 },
      { path: 'summary.subtotals', key: 'override', label: 'Override', percentage: true, selectorIndex: 2 },
      { path: 'summary.subtotals', key: 'underride', label: 'Underride', percentage: true, selectorIndex: 5 },
    ],
    disabled: false,
    emptyText: undefined,
    summaryTitle: 'Avg boluses / day',
    title: 'Bolusing',
    type: 'boluses',
  },
  fingersticks: {
    active: true,
    dimensions: [
      { path: 'smbg.summary', key: 'total', label: 'Avg per day', average: true, primary: true },
      { path: 'smbg.summary.subtotals', key: 'meter', label: 'Meter', percentage: true },
      { path: 'smbg.summary.subtotals', key: 'manual', label: 'Manual', percentage: true },
      { path: 'calibration.summary', key: 'total', label: 'Calibrations', hideEmpty: true },
      { path: 'smbg.summary.subtotals', key: 'veryLow', label: 'Below 3.0 mmol/L', percentage: true },
      { path: 'smbg.summary.subtotals', key: 'veryHigh', label: 'Above 13.9 mmol/L', percentage: true},
    ],
    disabled: false,
    emptyText: undefined,
    summaryTitle: 'Avg BG readings / day',
    title: 'BG readings',
    type: 'fingersticks',
  },
  siteChanges: {
    active: true,
    dimensions: undefined,
    disabled: false,
    emptyText: undefined,
    manufacturer: 'animas',
    source: 'cannulaPrime',
    subTitle: 'Cannula Fill',
    summaryTitle: undefined,
    title: 'Site Changes',
    type: 'siteChanges',
  },
};

var defaultBgClasses = {
  [MGDL_UNITS]: {
    high: { boundary: 250 },
    low: { boundary: 70 },
    target: { boundary: 180 },
    'very-low': { boundary: 54 },
  },
  [MMOL_UNITS]: {
    high: { boundary: 13.9 },
    low: { boundary: 3.9 },
    target: { boundary: 10 },
    'very-low': { boundary: 3 },
  },
};

var defaultProps = {
  aggregations: { ...defaultAggregations },
  bgUnits: MGDL_UNITS,
  bgClasses: defaultBgClasses[MGDL_UNITS],
  data: { ...defaultData },
  onSelectDay: sinon.stub(),
  patient: {
    profile: {
      fullName: 'John Doe',
    }
  },
  permsOfLoggedInUser: {
    view: {},
  },
  timePrefs: {},
  updateBasicsSettings: sinon.stub(),
  trackMetric: sinon.stub(),
  size: { width: 1000 }
};

const props = overrides => _.assign({}, defaultProps, overrides);

describe('BasicsChart', function() {
  it('should render', function() {
    console.error = sinon.stub();
    var elem = React.createElement(BasicsChart.inner, props());
    expect(elem).to.be.ok;
    expect(console.error.callCount).to.equal(0);
  });

  it('should console.error when required props are missing', function() {
    console.error = sinon.stub();
    var elem = React.createElement(BasicsChart.inner, props());
    try {
      TestUtils.renderIntoDocument(elem);
    }
    catch(e) {
      expect(console.error.callCount).to.equal(11);
    }
  });

  describe('_insulinDataAvailable', function() {
    it('should return false if insulin pump data is empty', function() {
      var elem = React.createElement(BasicsChart.inner, props({
        data: {
          ...defaultData,
          metaData: {
            latestDatumByType: {
              cbg: new types.CBG(),
            },
            bgSources: defaultData.metaData.bgSources,
          },
        },
      }));
      var render = TestUtils.renderIntoDocument(elem);

      expect(render._insulinDataAvailable()).to.be.false;
    });

    it('should return true if bolus data is present', function() {
      var elem = React.createElement(BasicsChart.inner, props({
        data: {
          ...defaultData,
          metaData: {
            latestDatumByType: {
              bolus: new types.Bolus(),
            },
            bgSources: defaultData.metaData.bgSources,
          },
        },
      }));
      var render = TestUtils.renderIntoDocument(elem);

      expect(render._insulinDataAvailable()).to.be.true;
    });

    it('should return true if basal data is present', function() {
      var elem = React.createElement(BasicsChart.inner, props({
        data: {
          ...defaultData,
          metaData: {
            latestDatumByType: {
              basal: new types.Basal(),
            },
            bgSources: defaultData.metaData.bgSources,
          },
        },
      }));
      var render = TestUtils.renderIntoDocument(elem);

      expect(render._insulinDataAvailable()).to.be.true;
    });

    it('should return true if wizard data is present', function() {
      var elem = React.createElement(BasicsChart.inner, props({
        data: {
          ...defaultData,
          metaData: {
            latestDatumByType: {
              wizard: new types.Wizard(),
            },
            bgSources: defaultData.metaData.bgSources,
          },
        },
      }));
      var render = TestUtils.renderIntoDocument(elem);

      expect(render._insulinDataAvailable()).to.be.true;
    });
  });

  describe('componentDidMount', function() {
    it('should track metrics which device data was available to the user when viewing', function() {
      this.timeout(8000); // Double timeout for this test, as it seems to fail often on travis

      var elem = React.createElement(BasicsChart.inner, props({
        data: {
          ...defaultData,
          metaData: {
            latestDatumByType: {
              basal: new types.Basal(),
            },
            bgSources: {
              cbg: false,
              smbg: false,
            },
          },
        },
      }));
      TestUtils.renderIntoDocument(elem);
      sinon.assert.calledWith(defaultProps.trackMetric, 'web - viewed basics data', {device: 'Pump only'});

      defaultProps.trackMetric.reset();
      elem = React.createElement(BasicsChart.inner, props({
        data: {
          ...defaultData,
          metaData: {
            latestDatumByType: {},
            bgSources: {
              cbg: false,
              smbg: true,
            },
          },
        },
      }));
      TestUtils.renderIntoDocument(elem);
      sinon.assert.calledWith(defaultProps.trackMetric, 'web - viewed basics data', {device: 'BGM only'});

      defaultProps.trackMetric.reset();
      elem = React.createElement(BasicsChart.inner, props({
        data: {
          ...defaultData,
          metaData: {
            latestDatumByType: {},
            bgSources: {
              cbg: true,
              smbg: false,
            },
          },
        },
      }));
      TestUtils.renderIntoDocument(elem);
      sinon.assert.calledWith(defaultProps.trackMetric, 'web - viewed basics data', {device: 'CGM only'});

      defaultProps.trackMetric.reset();
      elem = React.createElement(BasicsChart.inner, props({
        data: {
          ...defaultData,
          metaData: {
            latestDatumByType: {},
            bgSources: {
              cbg: true,
              smbg: true,
            },
          },
        },
      }));
      TestUtils.renderIntoDocument(elem);
      sinon.assert.calledWith(defaultProps.trackMetric, 'web - viewed basics data', {device: 'BGM+CGM'});

      defaultProps.trackMetric.reset();
      elem = React.createElement(BasicsChart.inner, props({
        data: {
          ...defaultData,
          metaData: {
            latestDatumByType: {
              basal: new types.Basal(),
            },
            bgSources: {
              cbg: false,
              smbg: true,
            },
          },
        },
      }));
      TestUtils.renderIntoDocument(elem);
      sinon.assert.calledWith(defaultProps.trackMetric, 'web - viewed basics data', {device: 'BGM+Pump'});

      defaultProps.trackMetric.reset();
      elem = React.createElement(BasicsChart.inner, props({
        data: {
          ...defaultData,
          metaData: {
            latestDatumByType: {
              basal: new types.Basal(),
            },
            bgSources: {
              cbg: true,
              smbg: false,
            },
          },
        },
      }));
      TestUtils.renderIntoDocument(elem);
      sinon.assert.calledWith(defaultProps.trackMetric, 'web - viewed basics data', {device: 'CGM+Pump'});

      defaultProps.trackMetric.reset();
      elem = React.createElement(BasicsChart.inner, props({
        data: {
          ...defaultData,
          metaData: {
            latestDatumByType: {
              basal: new types.Basal(),
            },
            bgSources: {
              cbg: true,
              smbg: true,
            },
          },
        },
      }));
      TestUtils.renderIntoDocument(elem);
      sinon.assert.calledWith(defaultProps.trackMetric, 'web - viewed basics data', {device: 'BGM+CGM+Pump'});
    });
  });
});
