export type RewardedReason = "injury_recovery" | "career_extension" | "creation_perk";

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
export async function requestRewardedAd(request: RewardedAdRequest): Promise<RewardedAdResult> {
  const provider = window.AscensionRewardedAds;
  if (!provider?.isAvailable()) return "unavailable";

  try {
    return await provider.show(request);
  } catch {
    return "error";
  }
}
