import assert from "node:assert/strict";
import { shareCardBlob } from "../lib/shareCard";
const blob = new Blob(["card"], { type: "image/png" });
const fake = {} as Window;
Object.defineProperty(globalThis, "window", { value: fake, configurable: true });
Object.defineProperty(globalThis, "navigator", { value: { canShare: () => true, share: async () => { throw new DOMException("Cancelled", "AbortError"); } }, configurable: true });
assert.equal(await shareCardBlob(blob, "Kevin", 82), "cancelled", "une annulation ne doit ni télécharger ni annoncer un succès");
Object.defineProperty(globalThis, "navigator", { value: { canShare: () => true, share: async () => {} }, configurable: true });
assert.equal(await shareCardBlob(blob, "Kevin", 82), "share");
fake.AscensionNativeShare = async (data, filename) => {
  assert.equal(data, blob);
  assert.equal(filename, "ascension-kevin.png");
  return "cancelled";
};
assert.equal(await shareCardBlob(blob, "Kevin", 82), "cancelled");
fake.AscensionNativeShare = async () => "share";
assert.equal(await shareCardBlob(blob, "Kevin", 82), "share");
console.log("✓ Partage web et natif : carte transmise et annulation sans faux succès");
