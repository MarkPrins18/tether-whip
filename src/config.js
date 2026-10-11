import Constants from 'expo-constants';

const extra = (Constants.expoConfig && Constants.expoConfig.extra) || {};
export const ADS = extra.ads || {};
export const VERSION = (Constants.expoConfig && Constants.expoConfig.version) || '1.0.0';
export const PRIVACY_URL = ADS.privacyPolicyUrl || 'https://markprins18.github.io/tether-whip/privacy.html';
