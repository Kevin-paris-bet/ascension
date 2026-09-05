export type RewardedReason = "injury_recovery" | "career_extension" | "creation_perk" | "second_chance";

export type RewardedAdRequest = {
  reason: RewardedReason;
  rewardLabel: string;
};

export type RewardedAdResult = "completed" | "dismissed" | "unavailable" | "error";

export type RewardedAdProvider = {
  isAvailable(): boolean;
  show(request: RewardedAdRequest): Promise<RewardedAdResult>;
};

declare global {
  interface Window {
    AscensionRewardedAds?: RewardedAdProvider;
  }
}

/**
 * Point d'entrée unique pour le futur SDK AdMob/native. Une récompense n'est
 * accordée que si le provider confirme explicitement `completed`.
 */
let showing = false;
export async function requestRewardedAd(request: RewardedAdRequest): Promise<RewardedAdResult> {
  if (typeof window === "undefined" || showing) return "unavailable";
  showing = true;
  try {
    const provider = window.AscensionRewardedAds;
    if (!provider?.isAvailable()) return "unavailable";
    const result = await provider.show(request);
    return ["completed", "dismissed", "unavailable", "error"].includes(result) ? result : "error";
  } catch {
    return "error";
  } finally {
    showing = false;
  }
}
