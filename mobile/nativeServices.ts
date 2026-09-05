import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { AdMob, AdmobConsentStatus, RewardAdPluginEvents } from "@capacitor-community/admob";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import type { RewardedAdResult } from "../lib/rewardedAds";

// Google Android test unit. Replace only after device QA and production setup.
const REWARDED_TEST_ID = "ca-app-pub-3940256099942544/5224354917";

export function installNativeServices() {
  if (Capacitor.getPlatform() !== "android") return;
  window.AscensionNativeShare = async (blob, filename, text) => {
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    const path = `share-${Date.now()}-${filename}`;
    const saved = await Filesystem.writeFile({ path, data, directory: Directory.Cache });
    try {
      await Share.share({ title: "Ma carrière Ascension", text, files: [saved.uri], dialogTitle: "Partager ma carrière" });
      // Android confirms opening the chooser, not publication on a social network.
      return "share";
    } catch (error) {
      if (error instanceof Error && /cancel|dismiss/i.test(error.message)) return "cancelled";
      throw error;
    } finally {
      // Give the receiving app time to read the URI.
      setTimeout(() => { void Filesystem.deleteFile({ path, directory: Directory.Cache }).catch(() => {}); }, 300_000);
    }
  };
  window.AscensionRewardedAds = {
    isAvailable: () => true,
    async show() {
      await AdMob.initialize({ initializeForTesting: true });
      let consent = await AdMob.requestConsentInfo();
      if (consent.isConsentFormAvailable && consent.status === AdmobConsentStatus.REQUIRED) {
        consent = await AdMob.showConsentForm();
      }
      if (!consent.canRequestAds) return "unavailable";
      const handles: PluginListenerHandle[] = [];
      let earned = false;
      let complete!: (result: RewardedAdResult) => void;
      const completion = new Promise<RewardedAdResult>((resolve) => { complete = resolve; });
      try {
        handles.push(await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => { earned = true; }));
        handles.push(await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => complete(earned ? "completed" : "dismissed")));
        handles.push(await AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => complete("error")));
        await AdMob.prepareRewardVideoAd({ adId: REWARDED_TEST_ID, isTesting: true });
        void AdMob.showRewardVideoAd().catch(() => complete("error"));
        return await completion;
      } finally {
        await Promise.all(handles.map((handle) => handle.remove()));
      }
    },
  };
}
