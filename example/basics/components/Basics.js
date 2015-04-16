/** @jsx React.DOM */
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

var _ = require('lodash');
var bows = require('bows');
var React = require('react');

var basicsState = require('../logic/state');
var basicsActions = require('../logic/actions');

var Section = require('./DashboardSection');
var TimeNav = require('./TimeNavigation');

var Basics = React.createClass({
  getInitialState: function() {
    return basicsState.getInitial();
  },
  componentWillMount: function() {
    basicsActions.bindApp(this);
  },
  render: function() {
    var leftColumn = this.renderColumn('left');
    var rightColumn = this.renderColumn('right');
    return (
      <div className='Container--flex'>
        <div className='Column Column--left'>
          <TimeNav dateRange={this.state.dateRange} 
            domain={this.state.domain} 
            timezone={this.state.timezone}
            switchDomain={basicsActions.switchDomain} />
          {leftColumn}
        </div>
        <div className='Column Column--right'>
          {rightColumn}
        </div>
      </div>
    );
  },
  renderColumn: function(columnSide) {
    var self = this;
    var sections = [];
    for (var key in this.state.sections) {
      var section = _.cloneDeep(self.state.sections[key]);
      section.name = key;
      sections.push(section);
    }
    var column = _.sortBy(
      _.where(sections, {column: columnSide, active: true}),
      'index'
    );

    var keys = Object.keys(column);
    return _.map(column, function(section, index) {
      return (
        <Section key={section.name}
          chart={section.chart || section.components}
          name={section.name}
          open={section.open}
          title={section.title} />
      );
    });
  }
});

module.exports = Basics;