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
- **Sign-in**: the live build (Supabase configured) uses real email +
  password accounts with confirmation emails, and shows no Google/Apple
  buttons. Ship the store build in live mode. Adding Google later means
  adding *Sign in with Apple* too (Apple's rule when other social logins
  exist). The demo build's "Continue with Google/Apple" buttons only create a
  local demo account — never submit the demo build.
- **Prototype data**: tuition/requirements are labeled indicative in-app —
  keep those labels; they are the honest-metadata story for review notes.
- **Privacy policy URL**: both stores require one. The live build stores
  accounts, profiles, grades and documents on UniBridge's servers (Supabase,
  Singapore region) — the policy must say so, and name who to contact.
- **Account deletion**: required by both stores. Profile → "Delete app data"
  only clears the device; with real server accounts the stores need in-app
  deletion of the server account too (still to build — see
  supabase/README.md caveats).
- **Assets still to brand**: `assets/` icon + splash are Expo defaults;
  replace with UniBridge art (1024×1024 icon, adaptive icon foreground)
  before production submission.
