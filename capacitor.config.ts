import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "com.ascension.football",
  appName: "Ascension",
  webDir: "dist/mobile",
  android: { allowMixedContent: false },
};
export default config;
