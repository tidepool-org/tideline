var d3 = require('d3');
var _ = require('lodash');

// Site-change deviceEvent subType keys (inlined; js/ must not import from plugins/).
var SITE_CHANGE_CANNULA = 'cannulaPrime';
var SITE_CHANGE_TUBING = 'tubingPrime';
var SITE_CHANGE_RESERVOIR = 'reservoirChange';
var SITE_CHANGE_SUBTYPES = [SITE_CHANGE_CANNULA, SITE_CHANGE_TUBING, SITE_CHANGE_RESERVOIR];

// Manufacturer matches for the loop/twiist icon variants, lower-cased for comparison.
var LOOP_MANUFACTURERS = _.map(['DIY Loop', 'Tidepool Loop'], _.lowerCase);
var TWIIST_MANUFACTURER = _.lowerCase('twiist');

// Site changes within 5 minutes of one another count as the same change; only the
// first is drawn, so at most one icon shows per 5-minute window.
var DEDUP_WINDOW_MS = 5 * 60 * 1000;

// Resolve a deviceEvent to a SITE_CHANGE_* subtype. Daily data records site
// changes as subType `reservoirChange` or `prime` (+ `primeTarget`); also
// tolerate the already-keyed subTypes and boolean `tags`.
function getSiteChangeSubType(d) {
  if (d.subType === SITE_CHANGE_RESERVOIR) return SITE_CHANGE_RESERVOIR;
  if (d.subType === 'prime' && d.primeTarget === 'cannula') return SITE_CHANGE_CANNULA;
  if (d.subType === 'prime' && d.primeTarget === 'tubing') return SITE_CHANGE_TUBING;
  if (_.includes(SITE_CHANGE_SUBTYPES, d.subType)) return d.subType;
  if (_.get(d, 'tags.reservoirChange')) return SITE_CHANGE_RESERVOIR;
  if (_.get(d, 'tags.cannulaPrime')) return SITE_CHANGE_CANNULA;
  if (_.get(d, 'tags.tubingPrime')) return SITE_CHANGE_TUBING;
  return null;
}

// Resolve the site-change icon key from subtype + manufacturer. Loop uses the
// loop-tubing variant, twiist the twiist-cassette variant; otherwise the base
// cannula/tubing/reservoir icon.
function getIconForDatum(d) {
  var subType = getSiteChangeSubType(d);
  var manufacturer = _.lowerCase(_.get(d, 'source', ''));

  if (subType === SITE_CHANGE_TUBING && _.includes(LOOP_MANUFACTURERS, manufacturer)) {
    return 'loop-tubing';
  }
  if (subType === SITE_CHANGE_RESERVOIR && manufacturer === TWIIST_MANUFACTURER) {
    return 'twiist-cassette';
  }

  switch (subType) {
    case SITE_CHANGE_TUBING:
      return 'tubing';
    case SITE_CHANGE_RESERVOIR:
      return 'reservoir';
    case SITE_CHANGE_CANNULA:
    default:
      // generic non-Omnipod fill
      return 'cannula';
  }
}

/**
 * Module for adding site-change icons to a chart pool.
 *
 * Renders one icon per site-change deviceEvent at its normalTime, after dropping
 * changes that fall within 5 minutes of an already-drawn one.
 * Rendering is gated on `opts.icons` (the URL map injected by the factory) being present.
 *
 * @param  {Object} pool the chart pool
 * @param  {Object} opts configuration options
 * @return {Object}      site change object
 */
module.exports = function(pool, opts = {}) {
  function sitechange(selection) {
    opts.xScale = pool.xScale().copy();

    selection.each(function(currentData) {
      var icons = opts.icons || {};

      // Show only the selected subtype, then drop same-subtype changes within 5
      // minutes of each other so a quick burst draws a single icon. No selection
      // (or no icon map) means render nothing.
      var filteredData = (_.isEmpty(icons) || !opts.siteChangeSource)
        ? []
        : _.filter(currentData, function(d) {
            return getSiteChangeSubType(d) === opts.siteChangeSource;
          });

      var siteChanges = sitechange.dedupeWithinWindow(filteredData);

      var groups = d3.select(this)
        .selectAll('g.d3-sitechange-group')
        .data(siteChanges, function(d) {
          return d.id;
        });

      var siteChangeGroup = groups.enter()
        .append('g')
        .attr({
          'class': 'd3-sitechange-group',
          id: function(d) {
            return 'sitechange_' + d.id;
          }
        });

      sitechange.addIconsToPool(siteChangeGroup);

      groups.exit().remove();

      // Reuse the event hover channel so viz's EventTooltip receives site-change hovers.
      selection.selectAll('.d3-sitechange-group').on('mouseover', function() {
        var parentContainer = document.getElementsByClassName('patient-data')[0].getBoundingClientRect();
        var chartNavContainer = document.getElementById('tidelineScrollNav').getBoundingClientRect();
        var container = this.getBoundingClientRect();
        container.y = container.top - parentContainer.top;

        var chartExtents = {
          left: chartNavContainer.left,
          right: chartNavContainer.right,
          width: chartNavContainer.right - chartNavContainer.left,
        };

        sitechange.addTooltip(d3.select(this).datum(), container, chartExtents);
      });

      selection.selectAll('.d3-sitechange-group').on('mouseout', function() {
        if (_.get(opts, 'onEventOut', false)) {
          opts.onEventOut();
        }
      });
    });
  }

  // Keep the first datum, then any later one at least DEDUP_WINDOW_MS after the
  // previous kept datum. Sorted by normalTime so "previous" is the prior in time.
  sitechange.dedupeWithinWindow = function(data) {
    var sorted = _.sortBy(data, 'normalTime');
    var kept = [];

    _.each(sorted, function(d) {
      var last = _.last(kept);
      if (!last || (d.normalTime - last.normalTime) >= DEDUP_WINDOW_MS) {
        kept.push(d);
      }
    });

    return kept;
  };

  sitechange.addIconsToPool = function(selection) {
    selection.append('image')
      .attr({
        'xlink:href': sitechange.imageForDatum,
        x: sitechange.xPositionCorner,
        y: sitechange.yPositionCorner,
        width: opts.size,
        height: opts.size,
      })
      .classed({'d3-image': true, 'd3-sitechange': true, 'd3-image-sitechange': true});
  };

  sitechange.imageForDatum = function(d) {
    return (opts.icons || {})[getIconForDatum(d)];
  };

  sitechange.addTooltip = function(d, rect, chartExtents) {
    if (_.get(opts, 'onEventHover', false)) {
      opts.onEventHover({
        data: d,
        rect: rect,
        chartExtents,
      });
    }
  };

  sitechange.xPositionCorner = function(d) {
    return opts.xScale(d.normalTime) - opts.size / 2;
  };

  sitechange.yPositionCorner = function() {
    return pool.height() / 2 - opts.size / 2;
  };

  // Exposed for unit testing.
  sitechange.getIconForDatum = getIconForDatum;

  return sitechange;
};
