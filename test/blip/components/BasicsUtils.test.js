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

/* jshint esversion:6 */

/* global describe */
/* global context */
/* global it */
/* global expect */
/* global chai */

var expect = chai.expect;

const BasicsUtils = require('../../../plugins/blip/basics/components/BasicsUtils');

describe('BasicsUtils', () => {
  const optionPathAndKey = {
    path: 'smbg',
    key: 'total',
  };

  const optionInvalidPath = {
    path: 'foo',
    key: 'bar',
  };

  const optionNestedPathAndKey = {
    path: 'other.data',
    key: 'count',
  };

  const optionNoPath = {
    key: 'total',
  };

  const optionNoKey = {
    path: 'total',
  };

  const data = {
    other: {
      data: {
        count: 6,
      },
    },
    smbg: {
      total: 8,
    },
    total: 14,
  };

  describe('getOptionValue', () => {
    it('should return 0 if no data is provided', () => {
      expect(BasicsUtils.getOptionValue(optionPathAndKey)).to.equal(0);
    });

    it('should return 0 if data is provided, but path does not resolve', () => {
      expect(BasicsUtils.getOptionValue(optionInvalidPath)).to.equal(0);
    });

    it('should return the correct value when path and key are provided', () => {
      expect(BasicsUtils.getOptionValue(optionPathAndKey, data)).to.equal(8);
    });

    it('should return the correct value when nested path and key are provided', () => {
      expect(BasicsUtils.getOptionValue(optionNestedPathAndKey, data)).to.equal(6);
    });

    it('should return the correct value when only path is provided', () => {
      expect(BasicsUtils.getOptionValue(optionNoKey, data)).to.equal(14);
    });

    it('should return the correct value when only key is provided', () => {
      expect(BasicsUtils.getOptionValue(optionNoPath, data)).to.equal(14);
    });
  });
});
