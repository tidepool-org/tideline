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
/* global sinon */

var React = require('react');
var ReactDOM = require('react-dom');
var TestUtils = require('react-dom/test-utils');
var expect = chai.expect;

var constants = require('../../../../plugins/blip/basics/logic/constants');

var Selector = require('../../../../plugins/blip/basics/components/sitechange/Selector');

describe('SiteChangeSelector', function () {
  var basicsActions = {
    setSiteChangeEvent: sinon.stub()
  };

  Selector.__set__('basicsActions', basicsActions);

  beforeEach(function() {
    basicsActions.setSiteChangeEvent = sinon.stub();
    this.props = {
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
      updateBasicsSettings: sinon.stub(),
      sectionId: 'siteChanges',
      trackMetric: sinon.stub(),
    };
  });

  it('should be a function', function() {
    expect(Selector).to.be.a('function');
  });

  describe('render', function() {
    it('should render without problem when props provided', function () {
      var elem = React.createElement(Selector, this.props);
      var renderedElem = TestUtils.renderIntoDocument(elem);

      var compElem = TestUtils.findRenderedDOMComponentWithClass(renderedElem, 'SiteChangeSelector');
      expect(compElem).to.be.ok;
    });

    it('should render with cannula message when cannula selected', function () {
      this.props.selectedSubtotal = constants.SITE_CHANGE_CANNULA;

      var elem = React.createElement(Selector, this.props);
      var renderedElem = TestUtils.renderIntoDocument(elem);

      var compElem = TestUtils.findRenderedDOMComponentWithClass(renderedElem, 'SiteChangeSelector');
      expect(compElem).to.be.ok;

      var optionElem = TestUtils.findRenderedDOMComponentWithClass(renderedElem, 'SiteChangeSelector-option--selected');
      expect(ReactDOM.findDOMNode(optionElem).textContent).to.equal('Cannula Fill');
    });

    it('should render with tubing message when tubing selected', function () {
      this.props.selectedSubtotal = constants.SITE_CHANGE_TUBING;

      var elem = React.createElement(Selector, this.props);
      var renderedElem = TestUtils.renderIntoDocument(elem);

      var compElem = TestUtils.findRenderedDOMComponentWithClass(renderedElem, 'SiteChangeSelector');
      expect(compElem).to.be.ok;

      var optionElem = TestUtils.findRenderedDOMComponentWithClass(renderedElem, 'SiteChangeSelector-option--tubing');
      expect(ReactDOM.findDOMNode(optionElem).textContent).to.equal('Tubing Fill');
    });

    it('should render with message disabled when canUpdateSettings is false and user has not selected siteChange source', function () {
      this.props.selectorMetaData.canUpdateSettings = false;

      var elem = React.createElement(Selector, this.props);
      var renderedElem = TestUtils.renderIntoDocument(elem);

      var compElem = TestUtils.findRenderedDOMComponentWithClass(renderedElem, 'SiteChangeSelector');
      expect(compElem).to.be.ok;
    });

    it('should render with cannula message when canUpdateSettings is false and careteam user has selected siteChange source', function () {
      this.props.selectorMetaData.canUpdateSettings = false;
      this.props.selectedSubtotal = constants.SITE_CHANGE_CANNULA;

      var elem = React.createElement(Selector, this.props);
      var renderedElem = TestUtils.renderIntoDocument(elem);

      var compElem = TestUtils.findRenderedDOMComponentWithClass(renderedElem, 'SiteChangeSelector');
      expect(compElem).to.be.ok;
    });

    it('should render with tubing message when canUpdateSettings is false and careteam user has selected siteChange source', function () {
      this.props.selectorMetaData.canUpdateSettings = false;
      this.props.selectedSubtotal = constants.SITE_CHANGE_TUBING;

      var elem = React.createElement(Selector, this.props);
      var renderedElem = TestUtils.renderIntoDocument(elem);

      var compElem = TestUtils.findRenderedDOMComponentWithClass(renderedElem, 'SiteChangeSelector');
      expect(compElem).to.be.ok;
    });
  });

  describe('onChange', function() {
    it('should switch from cannulaPrime to tubingPrime', function () {
      this.props.selectedSubtotal = constants.SITE_CHANGE_CANNULA;

      var elem = React.createElement(Selector, this.props);
      var renderedElem = TestUtils.renderIntoDocument(elem);

      var compElem = TestUtils.findRenderedDOMComponentWithClass(renderedElem, 'SiteChangeSelector');
      expect(compElem).to.be.ok;

      var cannulaOptionElem = TestUtils.findRenderedDOMComponentWithClass(renderedElem, 'SiteChangeSelector-option--selected');
      expect(ReactDOM.findDOMNode(cannulaOptionElem).textContent).to.equal('Cannula Fill');

      expect(basicsActions.setSiteChangeEvent.callCount).to.equal(0);
      renderedElem.handleSelectSubtotal(constants.SITE_CHANGE_TUBING, 'Tubing Fill');
      expect(basicsActions.setSiteChangeEvent.withArgs('siteChanges', constants.SITE_CHANGE_TUBING, 'Tubing Fill', this.props.trackMetric, this.props.updateBasicsSettings).callCount).to.equal(1);
    });
  });
});
