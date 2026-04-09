/*
 * == BSD2 LICENSE ==
 * Copyright (c) 2014, Tidepool Project
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

const d3 = require('d3');

module.exports = function(pool, opts) {
  const defaults = {
    r: 14,
    carbPadding: 4,
    // Portrait oblong (stadium shape): rx = ry = ovalWidth/2 makes the short ends
    // fully semicircular while the long sides remain straight.
    ovalWidth: 28,     // same as circle diameter; tweak for visual balance
    ovalHeight: 40,    // taller than wide = portrait orientation
    ovalWidthWide: 30, // for 3-digit values (≥100)
  };

  opts = { ...defaults, ...opts };

  const xPos = (d) => opts.xScale(d.normalTime);

  // Original carb value from either dosingDecision path (mirrors FoodTooltip.js logic)
  const getOriginalCarbs = (d) =>
    d?.dosingDecision?.originalFood?.nutrition?.carbohydrate?.net
    ?? d?.originalDosingDecision?.food?.nutrition?.carbohydrate?.net;

  // tags.carbsEdited: true → oblong showing original (struck through) + current value
  const hasCarbsEdited = (d) => d?.tags?.carbsEdited === true;

  // tags.entryTimeDiffers: true → circle with special border styling
  const hasEntryTimeDiffers = (d) => d?.tags?.entryTimeDiffers === true;

  function carb(selection) {
    const yPos = opts.r + opts.carbPadding;
    opts.xScale = pool.xScale().copy();
    selection.each(function(currentData) {
      const filteredData = currentData.filter(data =>
        data?.nutrition?.carbohydrate?.net || data?.tags?.carbsEdited
      );
      const allCarbs = d3
        .select(this)
        .selectAll('.d3-carbs-only')
        .data(filteredData, d => d.id);
      const carbGroup = allCarbs.enter()
        .append('g')
        .attr({
          'class': 'd3-carb-group',
          id: d => 'carb_group_' + d.id,
        });

      carbGroup.each(function(d) {
        const group = d3.select(this);

        if (hasCarbsEdited(d)) {
          // --- Edited carbs: portrait oblong with original (struck through) + current ---
          const original = getOriginalCarbs(d);
          const current = d.nutrition.carbohydrate.net;
          const w = (Math.round(original) >= 100 || Math.round(current) >= 100)
            ? opts.ovalWidthWide
            : opts.ovalWidth;
          const h = opts.ovalHeight;
          // rx = ry = w/2: left/right ends are full semicircles; top/bottom stay straight
          const r = w / 2;
          const cy = h / 2 + opts.carbPadding;

          group.append('rect').attr({
            x: xPos(d) - w / 2,
            y: opts.carbPadding,
            width: w,
            height: h,
            rx: r,
            ry: r,
            class: 'd3-circle-carbs d3-carbs-only d3-carbs-edited',
            id: 'carbs_' + d.id,
          });

          // Original value — upper half
          const originalText = group.append('text')
            .text(Math.round(original))
            .attr({
              x: xPos(d),
              y: cy - 5,
              class: 'd3-carbs-text d3-carbs-text-original',
            });

          // Manual strikethrough line (getBBox works here since element is in live DOM)
          const bbox = originalText.node().getBBox();
          const strikepadding = 2;
          group.append('line').attr({
            x1: bbox.x - strikepadding,
            y1: bbox.y + bbox.height / 2 - 1,
            x2: bbox.x + bbox.width + strikepadding,
            y2: bbox.y + bbox.height / 2 - 1,
            class: 'd3-carbs-strikethrough',
          });

          // Current value — lower half (bold)
          group.append('text')
            .text(Math.round(current))
            .attr({
              x: xPos(d),
              y: cy + 7,
              class: 'd3-carbs-text d3-carbs-text-current d3-carbs-text-current-bold',
            });

        } else if (hasEntryTimeDiffers(d)) {
          // --- Entry time differs: standard circle with special border styling ---
          group.append('circle').attr({
            cx: xPos(d),
            cy: yPos,
            r: opts.r,
            class: 'd3-circle-carbs d3-carbs-only d3-carbs-edited',
            id: 'carbs_' + d.id,
          });

          group.append('text')
            .text(Math.round(d.nutrition.carbohydrate.net))
            .attr({
              x: xPos(d),
              y: yPos,
              class: 'd3-carbs-text d3-carbs-text-current',
            });

        } else {
          // --- Standard carb: unchanged ---
          group.append('circle').attr({
            cx: xPos(d),
            cy: yPos,
            r: opts.r,
            'stroke-width': 0,
            class: 'd3-circle-carbs d3-carbs-only',
            id: 'carbs_' + d.id,
          });

          group.append('text')
            .text(Math.round(d.nutrition.carbohydrate.net))
            .attr({
              x: xPos(d),
              y: yPos,
              class: 'd3-carbs-text',
            });
        }
      });

      allCarbs.exit().remove();

      // tooltips
      selection.selectAll('.d3-carb-group').on('mouseover', function() {
        const parentContainer = document
          .getElementsByClassName('patient-data')[0]
          .getBoundingClientRect();
        const container = this.getBoundingClientRect();
        container.y = container.top - parentContainer.top;

        carb.addTooltip(d3.select(this).datum(), container);
      });

      selection.selectAll('.d3-carb-group').on('mouseout', function() {
        if (opts?.onCarbOut) {
          opts.onCarbOut();
        }
      });
    });
  }

  carb.addTooltip = function(d, rect) {
    if (opts?.onCarbHover) {
      opts.onCarbHover({
        data: d,
        rect: rect,
      });
    }
  };

  return carb;
};
