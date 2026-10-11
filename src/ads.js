// Ad layer. Right now both calls show a demo ad screen (set by App.js).
// To earn real money, replace the bodies with AdMob calls (react-native-google-mobile-ads,
// which needs an EAS development build, not Expo Go). Keep the same callbacks:
//   rewarded(label, onGranted, onSkipped)   -> call onGranted only after the reward is earned
//   interstitial(onDone)                    -> call onDone when the ad closes or fails to load
let demoUI = null;
export function setDemoAdUI(fn) { demoUI = fn; }

export const Ads = {
  rewarded(label, onGranted, onSkipped) {
    if (demoUI) demoUI('reward', onGranted, onSkipped); else if (onSkipped) onSkipped();
  },
  interstitial(onDone) {
    if (demoUI) demoUI('interstitial', onDone, onDone); else onDone();
  },
};
