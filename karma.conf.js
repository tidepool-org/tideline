const path = require('path');
const webpack = require('webpack');
const webpackConf = require('./webpack.config.js');

// Enable webpack debug mode if WEBPACK_DEBUG is set
const isWebpackDebug = process.env.WEBPACK_DEBUG === 'true';

// Check if karma debug flag is set
const isKarmaDebug = process.argv.includes('--karma-debug');

// Add debug configuration to webpack if in debug mode
if (isWebpackDebug) {
  webpackConf.infrastructureLogging = {
    level: 'verbose',
    debug: /webpack/
  };

  // Enable more detailed logging for webpack
  webpackConf.output = webpackConf.output || {};
  webpackConf.output.pathinfo = true;

  // Set log level for webpack
  webpackConf.stats = {
    colors: true,
    hash: true,
    version: true,
    timings: true,
    assets: true,
    chunks: true,
    modules: true,
    reasons: true,
    children: true,
    source: true,
    errors: true,
    errorDetails: true,
    warnings: true,
    publicPath: true,
    cachedAssets: true,
    performance: true,
    moduleTrace: true,
    logging: 'verbose',
    loggingTrace: true,
    loggingDebug: true,
    all: true
  };

  // Add profile option for timing information
  webpackConf.profile = true;

  // Ensure the progress plugin is enabled
  if (!webpackConf.plugins) {
    webpackConf.plugins = [];
  }

  // Add progress plugin if not already added
  const hasProgressPlugin = webpackConf.plugins.some(plugin =>
    plugin?.constructor?.name === 'ProgressPlugin'
  );

  if (!hasProgressPlugin) {
    webpackConf.plugins.push(new webpack.ProgressPlugin({
      activeModules: true,
      entries: true,
      modules: true,
      modulesCount: 100,
      profile: true,
      dependencies: true,
      dependenciesCount: 10000,
    }));
  }
}

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
    browsers: ['CustomChromeHeadless'],
    captureTimeout: 60000,
    client: {
      mocha: {
        timeout: 4000,
        reporter: isKarmaDebug ? 'spec' : 'dot'
      },
      captureConsole: true,
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
    logLevel: isKarmaDebug ? config.LOG_DEBUG : config.LOG_INFO,
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
      'js/**/*.js': isKarmaDebug ? ['coverage'] : [],
      'plugins/**/*.js': isKarmaDebug ? ['coverage'] : []
    },
    reporters: isKarmaDebug ? ['mocha', 'coverage'] : ['mocha'],
    coverageReporter: isKarmaDebug ? {
      type: 'text',
      dir: 'coverage/',
      file: 'coverage.txt',
      includeAllSources: true,
      verbose: true
    } : {},
    singleRun: true,
    webpack: webpackConf,
    webpackMiddleware: {
      noInfo: !isWebpackDebug,
      stats: isWebpackDebug ? {
        colors: true,
        hash: true,
        version: true,
        timings: true,
        assets: true,
        chunks: true,
        modules: true,
        reasons: true,
        children: true,
        source: true,
        errors: true,
        errorDetails: true,
        warnings: true,
        publicPath: true,
        cachedAssets: true,
        performance: true,
        moduleTrace: true,
        logging: 'verbose',
        loggingTrace: true,
        loggingDebug: true,
        all: true
      } : 'errors-only'
    }
  });
};
