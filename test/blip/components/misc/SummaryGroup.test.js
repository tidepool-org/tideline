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
