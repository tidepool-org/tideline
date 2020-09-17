var PropTypes = require('prop-types');
var React = require('react');
var moment = require('moment-timezone');
var cx = require('classnames');
var _ = require('lodash');

var constants = require('../../logic/constants');

class ADay extends React.Component {
  static propTypes = {
    dayAbbrevMask: PropTypes.string.isRequired,
    monthAbbrevMask: PropTypes.string.isRequired,
    chart: PropTypes.func.isRequired,
    chartWidth: PropTypes.number.isRequired,
    data: PropTypes.object,
    date: PropTypes.string.isRequired,
    future: PropTypes.bool.isRequired,
    isFirst: PropTypes.bool.isRequired,
    mostRecent: PropTypes.bool.isRequired,
    onHover: PropTypes.func.isRequired,
    subtotalType: PropTypes.string,
    type: PropTypes.string.isRequired
  };

  static defaultProps = {
    dayAbbrevMask: 'D',
    monthAbbrevMask: 'MMM D'
  };

  isASiteChangeEvent = () => {
    return (this.props.type === constants.SITE_CHANGE_CANNULA) ||
      (this.props.type === constants.SITE_CHANGE_TUBING) ||
      (this.props.type === constants.SITE_CHANGE_RESERVOIR);
  };

  isASiteChangeDay = () => {
    return (_.get(this.props, ['data', 'subtotals', this.props.type], 0) > 0);
  };

  mouseEnter = () => {
    // We do not want a hover effect on days in the future
    if (this.props.future) {
      return;
    }
    // We do not want a hover effect on infusion site days that were not site changes
    if (this.isASiteChangeEvent() && !this.isASiteChangeDay()) {
      return;
    }
    this.props.onHover(this.props.date);
  };

  mouseLeave = () => {
    if (this.props.future) {
      return;
    }
    this.props.onHover(null);
  };

  render() {
    var date = moment(this.props.date);

    var isDisabled = (this.props.type === constants.SECTION_TYPE_UNDECLARED);

    var containerClass = cx('Calendar-day--' + this.props.type, {
      'Calendar-day': !this.props.future,
      'Calendar-day-future': this.props.future,
      'Calendar-day-most-recent': this.props.mostRecent,
      'Calendar-day--disabled': isDisabled,
    });

    var drawMonthLabel = (date.date() === 1 || this.props.isFirst);
    var monthLabel = null;

    if (drawMonthLabel) {
      monthLabel = (
        <span className='Calendar-monthlabel'>{date.format(this.props.monthAbbrevMask)}</span>
      );
    }

    var chart;
    if (!isDisabled) {
      chart = this.props.chart({
        chartWidth: this.props.chartWidth,
        data: this.props.data,
        date: this.props.date,
        subtotalType: this.props.subtotalType,
      });
    }

    return (
      <div className={containerClass} onMouseEnter={this.mouseEnter} onMouseLeave={this.mouseLeave}>
        <p className='Calendar-weekday'>
          {(monthLabel) ? monthLabel : date.format(this.props.dayAbbrevMask)}
        </p>
        {this.props.future ? null: chart}
      </div>
    );
  }
}

module.exports = ADay;
