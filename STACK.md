# UniBridge production stack — decision record

Question asked: do we need a backend, Supabase or a VPS, and what is the
cheapest way to start?

## Decision

**Backend: yes (non-negotiable). Supabase, not a VPS. Start entirely on free
tiers.** Payments inside the mobile app must use Apple/Google in-app
purchases (via RevenueCat), not Stripe — Stripe serves the web version only.

## Why a backend at all

The prototype keeps everything on the device — fine for demos, impossible for
a real product. Accounts that survive a lost phone, entitlements that can't
be faked, the mail relay, partner clicks, chat history sync, push
notifications, store compliance: all server-side. This was always the plan
(EMAIL_RELAY.md §7 lists it as launch work; `src/services/api.ts` was built
to be swapped without touching screens).

## Why Supabase and not a VPS

| | Supabase | VPS (Hetzner/DO, ~US$6/mo) |
| --- | --- | --- |
| Money | Free tier → US$25/mo when real users arrive | ~US$6/mo forever |
| Auth (signup, OAuth, resets) | Built-in, battle-tested | You build and secure it yourself |
| Backups, patching, TLS, monitoring | Included | Your job, forever |
| Time to first real login | Days | Weeks |
| Team fit | R already knows it | New ops burden |

The VPS saves roughly RM 60–100/month on paper and costs weeks of build time
plus permanent ops duty — on a product holding minors' personal data (many
users are 17–19; PDPA applies), hand-rolled auth is the single riskiest
corner to cut. **A VPS is a later cost-optimization (revisit at tens of
thousands of users), not a starting point.** The one place a tiny VPS could
appear early is as the email-relay worker, and even that fits in Supabase
Edge Functions.

## Payments — the correction

"Stripe handles App Store billing" is not quite right. For **digital
features sold inside an iOS/Android app** (Season Pass, VIP), Apple and
Google **require their own in-app purchase systems** — Stripe inside the app
is a rejection. The standard budget setup:

- **RevenueCat** (free until ~US$2.5k/month revenue) wraps StoreKit + Play
  Billing, syncs entitlements to Supabase, handles receipts/restores.
- **Stripe** only if we also sell on the web version.
- Apple's small-business program: 15% commission, not 30%, under US$1M/yr.

## IAP product mapping (our actual catalog)

| Product | Store product type | Notes |
| --- | --- | --- |
| Season Pass — 1 month (US$19.99) | **Non-renewing** 30-day purchase (recommended) | Matches the "pay for the final sprint" promise; no auto-renew means no surprise charges for teen users and no cancellation flows to build. Can switch to auto-renew later if data says so. |
| Season Pass — lifetime (US$69.99) | **Non-consumable** (one-time, forever) | Apple requires a working "Restore purchases" button for this — add it to the pass screen at launch. |
| VIP (US$199) | **Non-consumable** at launch | Its arrival services (pickup, SIM, bank) might qualify for external payment under the real-world-services rule, but VIP also unlocks in-app features, and mixed bundles invite rejection. Sell as IAP first; restructure only if commission ever justifies the legal review. |

What UniBridge keeps per sale at the 15% small-business rate: monthly
≈ US$17.00, lifetime ≈ US$59.50, VIP ≈ US$169. Web sales through Stripe
keep ≈ 96%.

Launch additions this implies (append to the de-mocking list): "Restore
purchases" button, store-required terms/privacy links on the pass and VIP
screens, and RevenueCat entitlement checks replacing the local plan store.

## Cheapest launch path (single Expo codebase, as today)

| Phase | Monthly | One-time |
| --- | --- | --- |
| Pilot (now → first hundreds of users): Supabase free, RevenueCat free, GitHub Pages/Vercel free for web, domain | ~RM 0 | Domain ~RM 60/yr, Google Play US$25, Apple US$99/yr |
| Traction: Supabase Pro US$25, Postmark ~US$15 (mail relay), maybe EAS US$19 | ~RM 250–300 | — |

Frontend stays exactly what it is — one Expo/React Native codebase shipping
iOS + Android + web. No rewrite, no second frontend. Vercel is optional
polish for the web build (custom domain, preview deploys); GitHub Pages
already works.

## Build order when backend work starts

1. Supabase Auth replaces mock sign-in (screens unchanged).
2. Move profile/applications/mail/chat stores to Postgres with Row Level
   Security; keep AsyncStorage as offline cache.
3. RevenueCat entitlements replace the plan store's mock purchase.
4. Push notifications (Expo Push, free) keyed off real events.
5. Email relay + analytics per EMAIL_RELAY.md / ANALYTICS.md.
