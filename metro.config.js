// Web preview only: the AdMob native module cannot load in a browser, so it is replaced by an empty module there.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const original = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-google-mobile-ads') return { type: 'empty' };
  return (original || context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
