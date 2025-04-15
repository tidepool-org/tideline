const path = require('path');
const webpack = require('webpack');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

const appDirectory = path.resolve(__dirname);
const isDev = (process.env.NODE_ENV === 'development');
const isTest = (process.env.NODE_ENV === 'test');
const isWebpackDebug = process.env.WEBPACK_DEBUG === 'true';

// Enzyme as of v2.4.1 has trouble with classes
// that do not start and *end* with an alpha character
// but that will sometimes happen with the base64 hashes
// so we leave them off in the test env
const localIdentName = process.env.NODE_ENV === 'test'
  ? '[name]--[local]'
  : '[name]--[local]--[hash:base64:5]';

// NodePolyfillPlugin is already imported at the top

const styleLoaderConfiguration = [
  {
    test: /\.css$/,
    use: [
      'style-loader',
      {
        loader: 'css-loader?sourceMap',
        options: {
          modules: {
            localIdentName,
            mode: 'local'
          },
          importLoaders: 1,
          sourceMap: true,
        },
      },
      {
        loader: 'postcss-loader',
        options: {
          sourceMap: true,
        },
      },
    ],
  },
  {
    test: /\.less$/i,
    use: [
      // compiles Less to CSS
      'style-loader',
      'css-loader',
      'less-loader',
    ],
  },
];

const babelLoaderConfiguration = {
  test: /\.js$/,
  include: [
    // Add every directory that needs to be compiled by babel during the build
    path.resolve(appDirectory, 'js'),
    path.resolve(appDirectory, 'test'),
    path.resolve(appDirectory, 'plugins'),
  ],
  use: [
    {
      loader: 'babel-loader',
      options: {
        cacheDirectory: true,
      },
    },
  ],
};

// This is needed for webpack to import static images in JavaScript files
const imageLoaderConfiguration = {
  test: /\.(gif|jpe?g|png|svg)$/,
  type: 'asset/resource',
  generator: {
    filename: '[name].[ext]'
  },
};

const fontLoaderConfiguration = [
  {
    test: /\.eot$/,
    type: 'asset/resource',
  },
  {
    test: /\.woff$/,
    type: 'asset/resource',
  },
  {
    test: /\.ttf$/,
    type: 'asset/resource',
  },
];

const plugins = [
  // `process.env.NODE_ENV === 'production'` must be `true` for production
  // builds to eliminate development checks and reduce build size. You may
  // wish to include additional optimizations.
  new webpack.DefinePlugin({
    __DEV__: isDev,
  }),
  new NodePolyfillPlugin(),
  // Add progress plugin to show compilation progress
  new webpack.ProgressPlugin({
    activeModules: true,
    entries: true,
    modules: true,
    modulesCount: 100,
    profile: true,
    dependencies: true,
    dependenciesCount: 10000,
  }),
  // Add bundle analyzer plugin when in debug mode
  ...(isWebpackDebug ? [new BundleAnalyzerPlugin({
    analyzerMode: 'static',
    reportFilename: 'report.html',
    openAnalyzer: false,
    generateStatsFile: true,
    statsFilename: 'stats.json',
  })] : []),
];

const entry = {
  index: [path.join(__dirname, '/src/index')],
};

const output = {
  filename: '[name].js',
  assetModuleFilename: '[name][ext]',
  path: path.join(__dirname, '/dist/'),
};

const resolve = {
  alias: {
    crossfilter: 'crossfilter2',
  },
  extensions: [
    '.js',
  ],
  fallback: {
    fs: false,
  },
};

module.exports = {
  cache: isDev,
  entry,
  devtool: isDev || isTest ? 'cheap-source-map' : 'source-map',
  mode: isDev ? 'development' : 'production',
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
  } : 'errors-only',
  module: {
    rules: [
      babelLoaderConfiguration,
      imageLoaderConfiguration,
      ...styleLoaderConfiguration,
      ...fontLoaderConfiguration,
    ],
  },
  output,
  plugins,
  resolve,
};
