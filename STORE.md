# Shipping UniBridge to the App Store & Google Play

The repo is store-ready: bundle ids are set (`com.unibridge.app`), `eas.json`
holds the build profiles, and every screen runs on-device via Expo.

## One-time setup (your accounts)
1. Apple Developer Program (US$99/yr) and Google Play Console (US$25 once).
2. `npm i -g eas-cli && eas login` (free Expo account).
3. `eas build:configure` once to link this repo to your Expo project.

## Build & submit
- iOS: `eas build -p ios --profile production` then `eas submit -p ios`
  (first run walks you through App Store Connect app creation + signing).
- Android: `eas build -p android --profile production` then
  `eas submit -p android` (upload key is managed by EAS).
- Internal testing first: `--profile preview` gives an installable
  .apk / TestFlight build for your own phones.

## Review checklist before submitting
- **Mock sign-in buttons**: "Continue with Google/Apple" currently create a
  local demo account. App Review may flag these as broken sign-in. Either
  wire real OAuth first (Apple requires *Sign in with Apple* whenever other
  social logins exist) or relabel them "Demo account" for the first build.
- **Prototype data**: tuition/requirements are labeled indicative in-app —
  keep those labels; they are the honest-metadata story for review notes.
- **Privacy policy URL**: both stores require one. The app stores data
  on-device only; write that up on any public page and link it in the
  store listings.
- **Account deletion**: required by both stores — already satisfied by
  Profile → "Delete app data" and the /reset link.
- **Assets still to brand**: `assets/` icon + splash are Expo defaults;
  replace with UniBridge art (1024×1024 icon, adaptive icon foreground)
  before production submission.
