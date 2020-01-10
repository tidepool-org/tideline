/*
 * == BSD2 LICENSE ==
 * Copyright (c) 2016, Tidepool Project
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

/* global sinon */

var chai = require('chai');
var expect = chai.expect;
var _ = require('lodash');

var basicsActions = require('../../../../plugins/blip/basics/logic/actions');
var constants = require('../../../../plugins/blip/basics/logic/constants');
var basicsSections = require('../../../fixtures/basicsSections.json');

describe('actions', function() {
  var app = {
    state: {
      sections: basicsSections,
    },
    setState: sinon.stub(),
    props: {
      patient: {
        userid: 1,
        profile: {
          fullName: 'Test Patient',
          patient: {
            about: 'Testing Patient Update',
            birthday: '2000-01-01',
            diagnosisDate: '2010-01-01',
          },
        },
        settings: {
          previousSetting: true,
        },
      },
    },
  };

  beforeEach(function() {
    basicsActions.bindApp(app);
  });

  describe('toggleSectionSettings', function() {
    it('should track opened metric', function() {
      var trackMetric = sinon.stub();
      expect(trackMetric.callCount).to.equal(0);
      basicsActions.toggleSectionSettings('siteChanges', trackMetric);
      expect(trackMetric.callCount).to.equal(1);
      expect(trackMetric.calledWith('siteChanges settings was opened')).to.be.true;
    });
    it('should track closed metric', function() {
      var settingsOpen = _.cloneDeep(app);
      settingsOpen.state.sections[2].settingsTogglable = true;
      basicsActions.bindApp(settingsOpen);
      var trackMetric = sinon.stub();
      expect(trackMetric.callCount).to.equal(0);
      basicsActions.toggleSectionSettings('siteChanges', trackMetric);
      expect(trackMetric.callCount).to.equal(1);
      expect(trackMetric.calledWith('siteChanges settings was closed')).to.be.true;
    });
  });

  describe('selectSubtotal', function() {
    it('should track filtered metric if metrics function is provided', function() {
      var trackMetric = sinon.stub();
      expect(trackMetric.callCount).to.equal(0);
      basicsActions.selectSubtotal('fingersticks', 'calibrations', trackMetric);
      expect(trackMetric.callCount).to.equal(1);
      expect(trackMetric.calledWith('filtered on calibrations')).to.be.true;
    });
  });

  describe('setSiteChangeEvent', function() {
    it('should track metric for a user setting the source', function() {
      var trackMetric = sinon.stub();
      var updateBasicsSettings = sinon.stub();
      expect(trackMetric.callCount).to.equal(0);
      basicsActions.setSiteChangeEvent('siteChanges', constants.SITE_CHANGE_CANNULA, 'Cannula Prime', trackMetric, updateBasicsSettings);
      expect(trackMetric.callCount).to.equal(1);
      expect(trackMetric.calledWith('Selected Cannula Prime', { initiatedBy: 'User' })).to.be.true;
    });
    it('should track metric for a care team member setting the initiatedBy', function() {
      var careTeamApp = _.cloneDeep(app);
      careTeamApp.state.sections[2].selectorMetaData.canUpdateSettings = false;
      basicsActions.bindApp(careTeamApp);
      var trackMetric = sinon.stub();
      var updateBasicsSettings = sinon.stub();
      expect(trackMetric.callCount).to.equal(0);
      basicsActions.setSiteChangeEvent('siteChanges', constants.SITE_CHANGE_TUBING, 'Tubing Prime', trackMetric, updateBasicsSettings);
      expect(trackMetric.callCount).to.equal(1);
      expect(trackMetric.calledWith('Selected Tubing Prime', { initiatedBy: 'Care Team' })).to.be.true;
    });
    it('should call updateBasicsSettings function', function() {
      var trackMetric = sinon.stub();
      var updateBasicsSettings = sinon.stub();
      var canUpdateSettings = app.state.sections[2].selectorMetaData.canUpdateSettings;
      expect(updateBasicsSettings.callCount).to.equal(0);
      basicsActions.setSiteChangeEvent('siteChanges', constants.SITE_CHANGE_CANNULA, 'Cannula Prime', trackMetric, updateBasicsSettings);

      expect(canUpdateSettings).to.be.true;

      expect(updateBasicsSettings.callCount).to.equal(1);
      expect(updateBasicsSettings.calledWithExactly(
        app.props.patient.userid,
        {
          previousSetting: true,
          siteChangeSource: constants.SITE_CHANGE_CANNULA,
        },
        canUpdateSettings
      )).to.be.true;
    });
  });
});
