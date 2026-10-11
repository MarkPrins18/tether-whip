// Expo config. Ad IDs live in config/ads.json so you can change them from GitHub without touching code.
const ads = require('./config/ads.json');

const runNumber = parseInt(process.env.GITHUB_RUN_NUMBER || '1', 10);

module.exports = () => ({
  expo: {
    name: 'Tether Whip',
    slug: 'tether-whip',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'dark',
    backgroundColor: '#0b0f2e',
    icon: './assets/icon.png',
    android: {
      package: 'com.markprins.tetherwhip',
      versionCode: runNumber,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#0b0f2e',
      },
      blockedPermissions: ['android.permission.RECORD_AUDIO'],
    },
    ios: {
      bundleIdentifier: 'com.markprins.tetherwhip',
      supportsTablet: false,
    },
    web: { bundler: 'metro', output: 'single' },
    plugins: [
      [
        'expo-splash-screen',
        {
          image: './assets/splash-icon.png',
          imageWidth: 220,
          backgroundColor: '#0b0f2e',
          resizeMode: 'contain',
        },
      ],
      [
        'react-native-google-mobile-ads',
        {
          androidAppId: ads.androidAppId,
          iosAppId: 'ca-app-pub-3940256099942544~1458002511',
          delayAppMeasurementInit: true,
        },
      ],
      './plugins/withReleaseSigning',
    ],
    extra: { ads },
  },
});
