module.exports = function babelConfig(api) {
  const presets = [
    ['@babel/preset-env', { loose: true }],
    '@babel/preset-react',
    'babel-preset-react-app',
  ];

  const plugins = [
    ['@babel/plugin-proposal-class-properties', { loose: true }],
    '@babel/plugin-transform-modules-commonjs',
  ];

  const env = api.env();

  if (env === 'test') {
    plugins.unshift(
      ['babel-plugin-istanbul', {
        useInlineSourceMaps: false,
      }],
      'babel-plugin-rewire',
    );
  }

  api.cache(true);

  return {
    presets,
    plugins,
  };
};
