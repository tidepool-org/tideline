/*
 * == BSD2 LICENSE ==
 * Copyright (c) 2016 Tidepool Project
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

/* global chai */

var React = require('react');
var { render, fireEvent } = require('@testing-library/react');
var expect = chai.expect;

var constants = require('../../../../plugins/blip/basics/logic/constants');

var basicsActions = require('../../../../plugins/blip/basics/logic/actions');

var Selector = require('../../../../plugins/blip/basics/components/sitechange/Selector');

describe('SiteChangeSelector', function () {
  var mockSetSiteChangeEvent;

  var testProps;

  beforeEach(function() {
    mockSetSiteChangeEvent = jest.spyOn(basicsActions, 'setSiteChangeEvent').mockImplementation(() => {});
    testProps = {
      selectedSubtotal: '',
      selectorOptions: {
        primary: { key: constants.SITE_CHANGE_RESERVOIR, label: 'Reservoir Change' },
        rows: [
          [
            { key: constants.SITE_CHANGE_TUBING, label: 'Tube Primes' },
            { key: constants.SITE_CHANGE_CANNULA, label: 'Cannula Fills' },
          ],
        ],
      },
      selectorMetaData: {
        latestPump: 'Tandem',
        canUpdateSettings: true,
        patientName: 'Jill Jellyfish',
      },
      updateBasicsSettings: jest.fn(),
      sectionId: 'siteChanges',
      trackMetric: jest.fn(),
    };
  });

  afterEach(function() {
    jest.restoreAllMocks();
  });

  it('should be a function', function() {
    expect(Selector).to.be.a('function');
  });

  describe('render', function() {
    it('should render without problem when props provided', function () {
      var { container } = render(<Selector {...testProps} />);

      var compElem = container.querySelector('.SiteChangeSelector');
      expect(compElem).to.be.ok;
    });

    it('should render with cannula message when cannula selected', function () {
      testProps.selectedSubtotal = constants.SITE_CHANGE_CANNULA;

      var { container } = render(<Selector {...testProps} />);

      var compElem = container.querySelector('.SiteChangeSelector');
      expect(compElem).to.be.ok;

      var optionElem = container.querySelector('.SiteChangeSelector-option--selected');
      expect(optionElem.textContent).to.equal('Cannula Fill');
    });

    it('should render with tubing message when tubing selected', function () {
      testProps.selectedSubtotal = constants.SITE_CHANGE_TUBING;

      var { container } = render(<Selector {...testProps} />);

      var compElem = container.querySelector('.SiteChangeSelector');
      expect(compElem).to.be.ok;

      var optionElem = container.querySelector('.SiteChangeSelector-option--tubing');
      expect(optionElem.textContent).to.equal('Tubing Fill');
    });

    it('should render with message disabled when canUpdateSettings is false and user has not selected siteChange source', function () {
      testProps.selectorMetaData.canUpdateSettings = false;

      var { container } = render(<Selector {...testProps} />);

      var compElem = container.querySelector('.SiteChangeSelector');
      expect(compElem).to.be.ok;
    });

    it('should render with cannula message when canUpdateSettings is false and careteam user has selected siteChange source', function () {
      testProps.selectorMetaData.canUpdateSettings = false;
      testProps.selectedSubtotal = constants.SITE_CHANGE_CANNULA;

      var { container } = render(<Selector {...testProps} />);

      var compElem = container.querySelector('.SiteChangeSelector');
      expect(compElem).to.be.ok;
    });

    it('should render with tubing message when canUpdateSettings is false and careteam user has selected siteChange source', function () {
      testProps.selectorMetaData.canUpdateSettings = false;
      testProps.selectedSubtotal = constants.SITE_CHANGE_TUBING;

      var { container } = render(<Selector {...testProps} />);

      var compElem = container.querySelector('.SiteChangeSelector');
      expect(compElem).to.be.ok;
    });
  });

  describe('onChange', function() {
    it('should switch from cannulaPrime to tubingPrime', function () {
      testProps.selectedSubtotal = constants.SITE_CHANGE_CANNULA;

      var { container } = render(<Selector {...testProps} />);

      var compElem = container.querySelector('.SiteChangeSelector');
      expect(compElem).to.be.ok;

      var cannulaOptionElem = container.querySelector('.SiteChangeSelector-option--selected');
      expect(cannulaOptionElem.textContent).to.equal('Cannula Fill');

      expect(mockSetSiteChangeEvent.mock.calls.length).to.equal(0);

      // Click the tubing radio button to trigger onChange -> handleSelectSubtotal
      var tubingRadio = container.querySelector('input[value="' + constants.SITE_CHANGE_TUBING + '"]');
      fireEvent.click(tubingRadio);

      expect(mockSetSiteChangeEvent.mock.calls.length).to.equal(1);
      expect(mockSetSiteChangeEvent.mock.calls[0]).to.deep.equal(['siteChanges', constants.SITE_CHANGE_TUBING, 'Tube Primes', testProps.trackMetric, testProps.updateBasicsSettings]);
    });
  });
});
