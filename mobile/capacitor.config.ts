import type { CapacitorConfig } from "@capacitor/cli";

// The app loads the live site, so every web deploy reaches app users without an app store update.
// Point it at a different deployment with: SETTLED_URL=https://staging.example.com npx cap sync
const url = process.env.SETTLED_URL ?? "https://settled-production.up.railway.app";

const config: CapacitorConfig = {
  appId: "pet.settled.app",
  appName: "Settled",
  webDir: "www",
  server: {
    url,
    cleartext: url.startsWith("http://"),
    // Keep these hosts inside the app; everything else (clinic websites, maps) opens in the browser.
    allowNavigation: [new URL(url).host],
  },
  ios: {
    contentInset: "never",
    scheme: "Settled",
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: "#e6ebe9",
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: false,
      style: "LIGHT",
      backgroundColor: "#e6ebe9",
    },
  },
};

export default config;
