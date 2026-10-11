// Signs the release build with your own upload key when these environment variables are set
// (the GitHub workflow fills them from repository secrets). Without them the build is signed with
// the debug key, which is fine for testing on your own phone but not accepted by the Play Store.
const { withAppBuildGradle } = require('@expo/config-plugins');

const SIGNING = `
    signingConfigs {
        release {
            if (System.getenv("TW_KEYSTORE_FILE")) {
                storeFile file(System.getenv("TW_KEYSTORE_FILE"))
                storePassword System.getenv("TW_KEYSTORE_PASSWORD")
                keyAlias System.getenv("TW_KEY_ALIAS")
                keyPassword System.getenv("TW_KEY_PASSWORD")
            }
        }
    }
`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let g = cfg.modResults.contents;
    if (g.includes('TW_KEYSTORE_FILE')) return cfg;
    // add the release signing config right after the existing signingConfigs block start
    if (/signingConfigs\s*\{/.test(g)) {
      g = g.replace(/signingConfigs\s*\{/, 'signingConfigs {\n        release {\n            if (System.getenv("TW_KEYSTORE_FILE")) {\n                storeFile file(System.getenv("TW_KEYSTORE_FILE"))\n                storePassword System.getenv("TW_KEYSTORE_PASSWORD")\n                keyAlias System.getenv("TW_KEY_ALIAS")\n                keyPassword System.getenv("TW_KEY_PASSWORD")\n            }\n        }');
    } else {
      g = g.replace(/android\s*\{/, 'android {' + SIGNING);
    }
    // use it for the release build type when the key is available
    g = g.replace(/(buildTypes\s*\{[\s\S]*?release\s*\{)([\s\S]*?)(signingConfig\s+signingConfigs\.debug)/, (m, a, b) =>
      a + b + 'signingConfig System.getenv("TW_KEYSTORE_FILE") ? signingConfigs.release : signingConfigs.debug');
    cfg.modResults.contents = g;
    return cfg;
  });
};
