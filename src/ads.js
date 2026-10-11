// Ad layer. Uses Google AdMob when the native module is available (release builds) and falls back
// to a demo ad screen otherwise (web preview, Expo Go). Ad IDs come from config/ads.json.
//
//   Ads.rewarded(label, onGranted, onSkipped, onUnavailable)  onGranted only after the reward is earned
//   Ads.interstitial(onDone)                                  onDone when the ad closes or cannot be shown
import { Platform } from 'react-native';
import { ADS } from './config';

let lib = null;
let ready = false;
let demoUI = null;
const st = { rewarded: null, rewardedOk: false, inter: null, interOk: false };

export function setDemoAdUI(fn) { demoUI = fn; }

const unitId = (kind) => {
  if (!lib) return '';
  if (ADS.useTestAds) return kind === 'rewarded' ? lib.TestIds.REWARDED : lib.TestIds.INTERSTITIAL;
  return kind === 'rewarded' ? ADS.rewardedUnitId : ADS.interstitialUnitId;
};

function loadRewarded() {
  try {
    const id = unitId('rewarded'); if (!id) return;
    const ad = lib.RewardedAd.createForAdRequest(id);
    st.rewardedOk = false; st.rewarded = ad;
    ad.addAdEventListener(lib.RewardedAdEventType.LOADED, () => { st.rewardedOk = true; });
    ad.addAdEventListener(lib.AdEventType.ERROR, () => { st.rewardedOk = false; setTimeout(loadRewarded, 30000); });
    ad.load();
  } catch (e) {}
}

function loadInter() {
  try {
    const id = unitId('interstitial'); if (!id) return;
    const ad = lib.InterstitialAd.createForAdRequest(id);
    st.interOk = false; st.inter = ad;
    ad.addAdEventListener(lib.AdEventType.LOADED, () => { st.interOk = true; });
    ad.addAdEventListener(lib.AdEventType.ERROR, () => { st.interOk = false; setTimeout(loadInter, 30000); });
    ad.load();
  } catch (e) {}
}

// Call once at startup. Shows the EU consent form when required, then starts the ad SDK.
export async function initAds() {
  if (Platform.OS === 'web') return;
  try { lib = require('react-native-google-mobile-ads'); } catch (e) { lib = null; return; }
  try { await lib.AdsConsent.gatherConsent(); } catch (e) {}
  try {
    const m = lib.default();
    await m.setRequestConfiguration({ maxAdContentRating: 'PG', tagForChildDirectedTreatment: false, tagForUnderAgeOfConsent: false });
    await m.initialize();
  } catch (e) { lib = null; return; }
  ready = true;
  loadRewarded(); loadInter();
}

export const Ads = {
  real: () => !!lib && ready,
  // Whether a rewarded ad can be shown right now.
  rewardReady: () => (lib ? ready && st.rewardedOk : !!demoUI),

  rewarded(label, onGranted, onSkipped, onUnavailable) {
    if (lib) {
      const ad = st.rewarded;
      if (!ready || !ad || !st.rewardedOk) { loadRewarded(); if (onUnavailable) onUnavailable(); else if (onSkipped) onSkipped(); return; }
      let earned = false;
      const off = [];
      const clean = () => off.forEach((f) => { try { f(); } catch (e) {} });
      off.push(ad.addAdEventListener(lib.RewardedAdEventType.EARNED_REWARD, () => { earned = true; }));
      off.push(ad.addAdEventListener(lib.AdEventType.CLOSED, () => {
        clean(); st.rewardedOk = false; loadRewarded();
        if (earned) onGranted(); else if (onSkipped) onSkipped();
      }));
      ad.show().catch(() => { clean(); st.rewardedOk = false; loadRewarded(); if (onSkipped) onSkipped(); });
      return;
    }
    if (demoUI) demoUI('reward', onGranted, onSkipped || (() => {}));
    else if (onUnavailable) onUnavailable();
  },

  interstitial(onDone) {
    if (lib) {
      const ad = st.inter;
      if (!ready || !ad || !st.interOk) { loadInter(); onDone(); return; }
      let finished = false;
      const off = [];
      const done = () => { if (finished) return; finished = true; off.forEach((f) => { try { f(); } catch (e) {} }); st.interOk = false; loadInter(); onDone(); };
      off.push(ad.addAdEventListener(lib.AdEventType.CLOSED, done));
      off.push(ad.addAdEventListener(lib.AdEventType.ERROR, done));
      ad.show().catch(done);
      return;
    }
    if (demoUI) demoUI('interstitial', onDone, onDone); else onDone();
  },

  // EU privacy options (only offered when Google says the user can change their choice).
  async privacyRequired() {
    if (!lib || !ready) return false;
    try {
      const info = await lib.AdsConsent.getConsentInfo();
      return String(info.privacyOptionsRequirementStatus).toUpperCase() === 'REQUIRED';
    } catch (e) { return false; }
  },
  async showPrivacy() {
    if (!lib) return;
    try { await lib.AdsConsent.showPrivacyOptionsForm(); } catch (e) {}
  },
};
