// Native (iOS/Android) AdMob controller. The native SDK is required LAZILY
// inside functions so that:
//  - Expo Go (where the native module is absent) never executes the require
//    unless a real build calls these (callers guard with the preview check).
//  - Metro's web bundler uses index.web.ts instead and never sees this file.
import Constants from "expo-constants";

const useTestAds = __DEV__;
const INTERSTITIAL_ID = process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID ?? "";
const REWARDED_ID = process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID ?? "";

// Ads only run in a real/EAS build; Expo Go returns false here.
export const adsAvailable = Constants.appOwnership !== "expo";

let native: any;
function m() {
  return (native ??= require("react-native-google-mobile-ads"));
}

let interstitial: any = null;
let interstitialReady = false;
let rewarded: any = null;
let rewardedReady = false;

function loadInterstitial() {
  const { InterstitialAd, TestIds, AdEventType } = m();
  const ad = InterstitialAd.createForAdRequest(useTestAds ? TestIds.INTERSTITIAL : INTERSTITIAL_ID);
  interstitialReady = false;
  ad.addAdEventListener(AdEventType.LOADED, () => {
    interstitialReady = true;
  });
  interstitial = ad;
  ad.load();
}

function loadRewarded() {
  const { RewardedAd, TestIds, RewardedAdEventType } = m();
  const ad = RewardedAd.createForAdRequest(useTestAds ? TestIds.REWARDED : REWARDED_ID);
  rewardedReady = false;
  ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
    rewardedReady = true;
  });
  rewarded = ad;
  ad.load();
}

export function initAds() {
  try {
    m().default().initialize().catch(() => {});
    loadInterstitial();
    loadRewarded();
  } catch {
    // native module missing (e.g. Expo Go) — ignore
  }
}

export function showInterstitialAd(): Promise<void> {
  return new Promise<void>((resolve) => {
    try {
      const { AdEventType } = m();
      if (!interstitial || !interstitialReady) {
        loadInterstitial();
        resolve();
        return;
      }
      const unsub = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
        unsub?.();
        loadInterstitial();
        resolve();
      });
      interstitial.show();
    } catch {
      resolve();
    }
  });
}

export function showRewardedAd(): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    try {
      const { AdEventType, RewardedAdEventType } = m();
      if (!rewarded || !rewardedReady) {
        loadRewarded();
        resolve(false);
        return;
      }
      let earned = false;
      const unsubEarn = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        earned = true;
      });
      const unsubClose = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
        unsubEarn?.();
        unsubClose?.();
        loadRewarded();
        resolve(earned);
      });
      rewarded.show();
    } catch {
      resolve(false);
    }
  });
}
