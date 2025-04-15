const path = require('path');
const webpackConf = require('./webpack.config.js');

webpackConf.externals = {
  cheerio: 'window',
  'react/addons': true,
  'react/lib/ExecutionEnvironment': true,
  'react/lib/ReactContext': true,
};

webpackConf.output = {
  path: path.join(__dirname, '/dist/'),
};

delete webpackConf.entry;

module.exports = function (config) {
  config.set({
    autoWatch: true,
    browserNoActivityTimeout: 60000,
    browsers: ['Chrome', 'ChromeHeadless', 'CustomChromeHeadless'],
    captureTimeout: 60000,
    client: {
      mocha: {
        timeout: 4000
      },
    },
    colors: true,
    concurrency: Infinity,
    customLaunchers: {
      CustomChromeHeadless: {
        base: 'ChromeHeadless',
        flags: [
          '--headless',
          '--disable-gpu',
          '--no-sandbox',
          '--remote-debugging-port=9222',
        ],
      },
    },
    files: [
      'loadtests.js',
    ],
    frameworks: ['webpack', 'mocha', 'chai', 'sinon', 'intl-shim'],
    logLevel: config.LOG_INFO,
    plugins: [
      'karma-webpack',
      'karma-sourcemap-loader',
      'karma-mocha',
      'karma-mocha-reporter',
      'karma-chai',
      'karma-sinon',
      'karma-intl-shim',
      'karma-chrome-launcher',
      'karma-coverage',
    ],
    preprocessors: {
      'loadtests.js': ['webpack', 'sourcemap'],
    },
    reporters: [ 'mocha' ],
    singleRun: true,
    webpack: webpackConf,
    webpackMiddleware: {
      noInfo: true // We don't want webpack output
    }
  });
};
