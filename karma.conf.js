var webpackConf = require('./webpack.config.js');

webpackConf.externals = {
  cheerio: 'window',
  'react/addons': true,
  'react/lib/ExecutionEnvironment': true,
  'react/lib/ReactContext': true,
};

module.exports = function (config) {
  config.set({
    autoWatch: true,
    browserNoActivityTimeout: 60000,
    browsers: ['CustomChromeHeadless'],
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
    preprocessors: {
      'loadtests.js': ['webpack', 'sourcemap'],
    },
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
    reporters: [ 'mocha' ],
    singleRun: true,
    webpack: webpackConf,
    webpackMiddleware: {
      noInfo: true // We don't want webpack output
    }
  });
};
