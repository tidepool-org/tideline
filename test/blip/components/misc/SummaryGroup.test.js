/*
 * == BSD2 LICENSE ==
 * Copyright (c) 2017, Tidepool Project
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

/* jshint esversion: 9 */

/* global sinon */
/* global chai */

var expect = chai.expect;
var { DEFAULT_BG_BOUNDS, MGDL_UNITS } = require('../../../../js/data/util/constants');

const React = require('react');
const _ = require('lodash');
const { render, fireEvent } = require('@testing-library/react');
const SummaryGroup = require('../../../../plugins/blip/basics/components/misc/SummaryGroup');

describe('SummaryGroup', () => {
  const data = {
    smbg: {
      summary: {
        total: 1,
        avgPerDay: 3,
      },
    },
  };

  var props = {
    bgClasses: {
      'very-low': {
        boundary: DEFAULT_BG_BOUNDS[MGDL_UNITS].veryLow,
      },
      'low': {
        boundary: DEFAULT_BG_BOUNDS[MGDL_UNITS].targetLower,
      },
      'target': {
        boundary: DEFAULT_BG_BOUNDS[MGDL_UNITS].targetUpper,
      },
      'high': {
        boundary: DEFAULT_BG_BOUNDS[MGDL_UNITS].veryHigh,
      },
      'very-high': {
        boundary: 600,
      },
    },
    bgUnits: 'mg/dL',
    data,
    selectedSubtotal: 'total',
    selectorOptions: {
      primary: {
        key: 'total',
        label: 'Avg per day',
        average: true,
        path: 'smbg.summary',
        primary: true,
      },
      rows: [],
    },
    sectionId: 'fingersticks',
    trackMetric: sinon.stub(),
  };

  let selectSubtotalSpy;

  before(() => {
    selectSubtotalSpy = sinon.stub(SummaryGroup.prototype.actions, 'selectSubtotal');
  });

  afterEach(() => {
    selectSubtotalSpy.reset();
  });

  after(() => {
    selectSubtotalSpy.restore();
  });

  describe('render', () => {
    it('should disable options that have a zero value', () => {
      var { container, rerender } = render(<SummaryGroup {...props} />);

      expect(container.querySelector('.SummaryGroup-info-primary')).to.be.ok;
      expect(container.querySelectorAll('.SummaryGroup-info--disabled').length).to.equal(0);

      rerender(<SummaryGroup {..._.assign({}, props, {
        data: _.assign({}, data, {
          smbg: {
            summary: {
              total: 0,
            },
          },
        }),
      })} />);

      expect(container.querySelectorAll('.SummaryGroup-info--disabled').length).to.equal(1);
    });

    it('should set an NaN average to zero', () => {
      var { container, rerender } = render(<SummaryGroup {...props} />);

      expect(container.querySelector('.SummaryGroup-option-count').textContent).to.equal('3');

      rerender(<SummaryGroup {..._.assign({}, props, {
        data: _.assign({}, data, {
          smbg: {
            summary: {
              avgPerDay: NaN,
            },
          },
        }),
      })} />);

      expect(container.querySelector('.SummaryGroup-option-count').textContent).to.equal('0');
    });
  });

  describe('option rows', () => {
    const bolusOption = (key, opts = {}) => ({ path: 'summary.subtotals', key, label: key, percentage: true, ...opts });

    const bolusOptions = [
      bolusOption('wizard'),
      bolusOption('correction'),
      bolusOption('override'),
      bolusOption('manual', { hideEmpty: true }),
      bolusOption('extended'),
      bolusOption('interrupted'),
      bolusOption('underride'),
      bolusOption('oneButton', { hideEmpty: true }),
    ];

    const bolusData = counts => ({
      summary: {
        total: 10,
        subtotals: _.mapValues(_.keyBy(_.map(bolusOptions, 'key')), key => ({ count: _.get(counts, key, 1) })),
      },
    });

    const renderRows = (options, data, perRow = 3) => {
      const { container } = render(<SummaryGroup {..._.assign({}, props, {
        data,
        sectionId: 'boluses',
        selectorOptions: {
          primary: { key: 'total', label: 'Avg per day', average: true, path: 'summary', primary: true },
          perRow,
          rows: [options],
        },
      })} />);

      return _.map(container.querySelectorAll('.SummaryGroup-row'), row => row.children.length);
    };

    it('should render 6 visible options in 2 rows of 3 when both hide-empty options are empty', () => {
      expect(renderRows(bolusOptions, bolusData({ manual: 0, oneButton: 0 }))).to.eql([3, 3]);
    });

    it('should render 7 visible options in rows of 4 when one hide-empty option is empty', () => {
      expect(renderRows(bolusOptions, bolusData({ manual: 0 }))).to.eql([4, 3]);
      expect(renderRows(bolusOptions, bolusData({ oneButton: 0 }))).to.eql([4, 3]);
    });

    it('should render 8 visible options in 2 rows of 4', () => {
      expect(renderRows(bolusOptions, bolusData())).to.eql([4, 4]);
    });

    it('should render 9 visible options in 3 balanced rows of 3 rather than a lone option on a third row', () => {
      const options = [...bolusOptions, bolusOption('automated', { percentage: false })];
      expect(renderRows(options, { summary: { total: 10, subtotals: { ...bolusData().summary.subtotals, automated: { count: 1 } } } }, 4)).to.eql([3, 3, 3]);
    });

    it('should close the row left by a hidden option when the section is already 4 per row', () => {
      const options = [...bolusOptions, bolusOption('automated', { percentage: false })];
      expect(renderRows(options, { summary: { total: 10, subtotals: { ...bolusData({ oneButton: 0 }).summary.subtotals, automated: { count: 1 } } } }, 4)).to.eql([4, 4]);
    });

    it('should keep the incoming option order when re-chunking around hidden options', () => {
      const { container } = render(<SummaryGroup {..._.assign({}, props, {
        data: bolusData({ manual: 0 }),
        sectionId: 'boluses',
        selectorOptions: {
          primary: { key: 'total', label: 'Avg per day', average: true, path: 'summary', primary: true },
          perRow: 3,
          rows: [bolusOptions],
        },
      })} />);

      const labels = _.map(container.querySelectorAll('.SummaryGroup-row .SummaryGroup-option-label'), 'textContent');
      expect(labels).to.eql(['wizard', 'correction', 'override', 'extended', 'interrupted', 'underride', 'oneButton']);
    });

    it('should not widen sections with 6 or fewer visible options beyond the default 3 per row', () => {
      expect(renderRows(_.take(bolusOptions, 5), bolusData())).to.eql([3, 2]);
    });

    it('should balance 4 visible options at 3 per row into 2 rows of 2 when a hide-empty option is empty', () => {
      // Mirrors the BG readings section: meter, manual, calibrations (hide-empty), low, high
      const options = [bolusOption('meter'), bolusOption('manual'), bolusOption('calibration', { hideEmpty: true }), bolusOption('low'), bolusOption('high')];
      const data = { summary: { total: 10, subtotals: { meter: { count: 1 }, manual: { count: 1 }, calibration: { count: 0 }, low: { count: 1 }, high: { count: 1 } } } };
      expect(renderRows(options, data)).to.eql([2, 2]);
    });

    it('should keep a 2-per-row section at 2 per row', () => {
      // Mirrors the basals section: temp, suspend, automated stop (hide-empty), automated suspend (hide-empty)
      const options = [bolusOption('temp'), bolusOption('suspend'), bolusOption('automatedStop', { hideEmpty: true }), bolusOption('automatedSuspend', { hideEmpty: true })];
      const data = counts => ({ summary: { total: 10, subtotals: _.mapValues(_.keyBy(_.map(options, 'key')), key => ({ count: _.get(counts, key, 1) })) } });
      expect(renderRows(options, data(), 2)).to.eql([2, 2]);
      expect(renderRows(options, data({ automatedSuspend: 0 }), 2)).to.eql([2, 1]);
    });
  });

  describe('handleSelectSubtotal', () => {
    it('should call the selectSubtotal action', () => {
      var { container } = render(<SummaryGroup {...props} />);

      var options = container.querySelectorAll('.SummaryGroup-info-primary');
      expect(options.length).to.equal(1);

      fireEvent.click(options[0]);
      sinon.assert.callCount(selectSubtotalSpy, 1);
      sinon.assert.calledWith(selectSubtotalSpy, props.sectionId, props.selectorOptions.primary.key);
    });

    it('should not call the selectSubtotal action for disabled options', () => {
      var { container } = render(<SummaryGroup {..._.assign({}, props, {
        data: _.assign({}, data, {
          smbg: {
            summary: {
              total: 0,
            },
          },
        }),
      })} />);

      var disabledOptions = container.querySelectorAll('.SummaryGroup-info-primary.SummaryGroup-info--disabled');
      expect(disabledOptions.length).to.equal(1);

      fireEvent.click(disabledOptions[0]);
      sinon.assert.callCount(selectSubtotalSpy, 0);
    });
  });
});
