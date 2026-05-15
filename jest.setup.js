/* eslint-disable global-require */
/* global jest, beforeAll, afterAll, describe */

// Ensure NODE_ENV is set
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

// Add any global setup for Jest tests here
require('core-js/stable');

// Setup Intl polyfill
global.IntlPolyfill = require('intl');
require('intl/locale-data/jsonp/en.js');
require('intl-pluralrules');

// Setup i18next
var i18next = require('i18next');
var _ = require('lodash');

if (_.get(i18next, 'options.returnEmptyString') === undefined) {
  i18next.init({ returnEmptyString: false });
}

// Setup Jest DOM matchers
require('@testing-library/jest-dom');

// Make chai and sinon available globally (matching Karma/Mocha globals)
global.chai = require('chai');
global.sinon = require('sinon');
global.assert = global.chai.assert;
global.expect = global.chai.expect;

// Map Mocha lifecycle hooks to Jest equivalents
global.before = beforeAll;
global.after = afterAll;
global.context = describe;
