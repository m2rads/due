const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const { withNativeWind } = require("nativewind/metro");

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    sourceExts: ['jsx', 'js', 'ts', 'tsx', 'json'],
    extraNodeModules: {
      '@env': require.resolve('react-native-dotenv'),
      'path': require.resolve('path-browserify'),
      'fs': require.resolve('react-native-fs')
    }
  }
};

module.exports = withNativeWind(mergeConfig(getDefaultConfig(__dirname), config), { input: "./global.css" });
