// Web stub — react-native-google-mobile-ads is native-only and must never be
// imported into the web bundle. The app uses the placeholder ad UI on web.
export const adsAvailable = false;
export function initAds(): void {}
export async function showInterstitialAd(): Promise<void> {}
export async function showRewardedAd(): Promise<boolean> {
  return false;
}
