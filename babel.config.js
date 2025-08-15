module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // IMPORTANT: This plugin must be the last one.
      'react-native-reanimated/plugin',
    ],
  };
};