/*
 * == BSD2 LICENSE ==
 * Copyright (c) 2017 Tidepool Project
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

var _ = require('lodash');
const PropTypes = require('prop-types');
var React = require('react');
var createReactClass = require('create-react-class');
var cx = require('classnames');

var basicsActions = require('../../logic/actions');
var BasicsUtils = require('../BasicsUtils');

var constants = require('../../logic/constants');

var Selector = createReactClass({
  displayName: 'Selector',
  mixins: [BasicsUtils],

  propTypes: {
    data: PropTypes.object,
    selectedSubtotal: PropTypes.string.isRequired,
    selectorOptions: PropTypes.object.isRequired,
    selectorMetaData: PropTypes.object.isRequired,
    updateBasicsSettings: PropTypes.func.isRequired,
    sectionId: PropTypes.string.isRequired,
    trackMetric: PropTypes.func.isRequired,
  },

  render: function() {
    var self = this;

    return (
      <div className="SiteChangeSelector">
        {this.renderOptions()}
      </div>
    );
  },

  renderOptions: function() {
    var self = this;
    var optionRows = self.props.selectorOptions.rows;

    return optionRows.map(function(row, id) {
      var options = row.map(self.renderOption);
      return (
        <div key={'row-'+id} className="SummaryGroup-row">
          {options}
        </div>
      );
    });
  },

  renderOption: function(option) {
    var optionClass = cx({
      'SiteChangeSelector-option': true,
      'SiteChangeSelector-option--cannula': (option.key === constants.SITE_CHANGE_CANNULA),
      'SiteChangeSelector-option--tubing': (option.key === constants.SITE_CHANGE_TUBING),
      'SiteChangeSelector-option--reservoir': (option.key === constants.SITE_CHANGE_RESERVOIR),
      'SiteChangeSelector-option--selected': (option.key === this.props.selectedSubtotal),
    });

    var latestPump = 'default';
    if (this.props.selectorMetaData.hasOwnProperty('latestPump')) {
      latestPump = this.props.selectorMetaData.latestPump;
    }

    return (
      <label key={option.key} className={optionClass}>
        <input type="radio" name="site_change_event" value={option.key} onChange={this.handleSelectSubtotal.bind(null, option.key, option.label)} checked={option.key === this.props.selectedSubtotal} />
        {this.subAction(latestPump, option.key)}
      </label>
    );
  },

  subAction: function(pump, action) {
    var pumpVocabulary = {
      [constants.ANIMAS]: {
        [constants.SITE_CHANGE_RESERVOIR]: 'Go Rewind',
        [constants.SITE_CHANGE_TUBING]: 'Go Prime',
        [constants.SITE_CHANGE_CANNULA]: 'Cannula Fill',
      },
      [constants.INSULET]: {
        [constants.SITE_CHANGE_RESERVOIR]: 'Pod Change',
        [constants.SITE_CHANGE_TUBING]: 'Pod Activate',
        [constants.SITE_CHANGE_CANNULA]: 'Prime',
      },
      [constants.MICROTECH]: {
        [constants.SITE_CHANGE_RESERVOIR]: 'Rewind',
        [constants.SITE_CHANGE_TUBING]: 'Reservoir Prime',
        [constants.SITE_CHANGE_CANNULA]: 'Cannula Prime',
      },
      [constants.DIY_LOOP]: {
        [constants.SITE_CHANGE_RESERVOIR]: 'Pod Change',
        [constants.SITE_CHANGE_TUBING]: 'Tubing Fill',
        [constants.SITE_CHANGE_CANNULA]: 'Cannula Fill',
      },
      [constants.TIDEPOOL_LOOP]: {
        [constants.SITE_CHANGE_RESERVOIR]: 'Pod Change',
        [constants.SITE_CHANGE_TUBING]: 'Tubing Fill',
        [constants.SITE_CHANGE_CANNULA]: 'Cannula Fill',
      },
      [constants.TWIIST_LOOP]: {
        [constants.SITE_CHANGE_RESERVOIR]: 'Cassette Change',
        [constants.SITE_CHANGE_TUBING]: 'Tubing Fill',
        [constants.SITE_CHANGE_CANNULA]: 'Cannula Fill',
      },
      [constants.MEDTRONIC]: {
        [constants.SITE_CHANGE_RESERVOIR]: 'Rewind',
        [constants.SITE_CHANGE_TUBING]: 'Prime',
        [constants.SITE_CHANGE_CANNULA]: 'Cannula Prime',
      },
      [constants.TANDEM]: {
        [constants.SITE_CHANGE_RESERVOIR]: 'Cartridge Change',
        [constants.SITE_CHANGE_TUBING]: 'Tubing Fill',
        [constants.SITE_CHANGE_CANNULA]: 'Cannula Fill',
      },
      default: {
        [constants.SITE_CHANGE_RESERVOIR]: 'Cartridge Change',
        [constants.SITE_CHANGE_TUBING]: 'Tubing Fill',
        [constants.SITE_CHANGE_CANNULA]: 'Cannula Fill',
      }
    };

    const manufacturer = _.capitalize(_.get(pump, 'manufacturer', ''));

    if (pumpVocabulary.hasOwnProperty(manufacturer)) {
      return (
        <span key={action}>{pumpVocabulary[manufacturer][action]}</span>
      );
    }

    return (
      <span key={action}>{pumpVocabulary.default[action]}</span>
    );
  },

  handleSelectSubtotal: function(selectedSubtotal, optionLabel) {
    basicsActions.setSiteChangeEvent(this.props.sectionId, selectedSubtotal, optionLabel, this.props.trackMetric, this.props.updateBasicsSettings);
  },
});

module.exports = Selector;
