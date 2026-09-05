import assert from "node:assert/strict";
import { requestRewardedAd, type RewardedAdProvider, type RewardedAdResult } from "../lib/rewardedAds";
const request = { reason: "second_chance" as const, rewardLabel: "Test" };
const fake = {} as Window;
Object.defineProperty(globalThis, "window", { value: fake, configurable: true });
assert.equal(await requestRewardedAd(request), "unavailable");
for (const result of ["completed", "dismissed", "unavailable", "error"] as const) {
  fake.AscensionRewardedAds = { isAvailable: () => true, show: async () => result };
  assert.equal(await requestRewardedAd(request), result);
}
fake.AscensionRewardedAds = { isAvailable: () => { throw new Error("SDK"); }, show: async () => "completed" };
assert.equal(await requestRewardedAd(request), "error");
fake.AscensionRewardedAds = { isAvailable: () => true, show: async () => "unexpected" } as unknown as RewardedAdProvider;
assert.equal(await requestRewardedAd(request), "error");
let finish!: (value: RewardedAdResult) => void;
fake.AscensionRewardedAds = { isAvailable: () => true, show: () => new Promise(resolve => { finish = resolve; }) };
const first = requestRewardedAd(request);
assert.equal(await requestRewardedAd(request), "unavailable");
finish("dismissed");
assert.equal(await first, "dismissed");
fake.AscensionRewardedAds = { isAvailable: () => true, show: async () => "completed" };
assert.equal(await requestRewardedAd(request), "completed", "le verrou doit être libéré");
Reflect.deleteProperty(globalThis, "window");
console.log("✓ Publicités : fermeture, indisponibilité, erreur SDK, réponse invalide, concurrence et récupération");
