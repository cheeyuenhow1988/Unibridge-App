# UniBridge

**Link all universities, colleges and institutes.** UniBridge connects students finishing
high school with institutions worldwide: enter your grades once, instantly see which
courses you qualify for, what they *truly* cost, apply and track everything — then meet
your intake before you land.

> 📱 Pre-launch prototype: full UI/UX with realistic mock data, no backend.
> All institutions, scholarships and people in the app are **fictional**.

## Launch countries

🇦🇺 Australia · 🇲🇾 Malaysia · 🇹🇼 Taiwan · 🇬🇧 United Kingdom · 🇸🇬 Singapore · 🇳🇿 New Zealand · 🇷🇺 Russia

## Features

### Phase 1 — core journey (built fully)
- **Onboarding** — welcome carousel, profile setup, dynamic grade entry for 9
  qualification systems (SPM, STPM, UEC, A-Levels, IB, HKDSE, GSAT, ATAR, GPA) + IELTS/TOEFL
- **Eligibility Match** — the hero screen: ✅ Eligible / 🟡 Borderline / 🔵 Pathway buckets,
  filters (country, field, true-cost budget in home currency, duration), profile-strength
  meter ("Add IELTS 6.5 to unlock 14 more courses"), per-course recognition badges
- **Compare** — 2–4 courses side by side with aligned rows: tuition per semester/year/total,
  cost of living, true total cost (cheapest highlighted), intakes, English requirement,
  recognition, nearby attractions — plus a shareable image summary for parents
- **Institution & course pages** — true-cost breakdown (tuition + rent + food + transport +
  insurance + visa), local vs international entry requirements, ambassadors, around-campus carousel
- **Scholarships** — searchable, filtered by nationality and destination
- **Document Vault** — upload via document/image picker, expiry tracking
  ("Your IELTS expires before the Feb 2027 intake")
- **Apply & Track** — checklist auto-generated from course requirements against your vault,
  fee-waived badge for Verified Partners, status timeline (Submitted → … → CoE/Visa letter),
  offer comparison and mock deposit
- **Pre-departure** — country checklist, pickup card, intake countdown, work-rights info

### Phase 2 — Community (UI shells, marked Beta)
Intake group chats, verified ambassador feed, coursemates grid, sponsored events.

### Phase 3 — Arrival services (roadmap screen only)
Housing partners, car rental, part-time jobs with visa work-limit warnings, local support staff.

## Tech

| | |
|---|---|
| Runtime | Expo SDK 57 · React Native 0.86 · TypeScript (strict) |
| Navigation | Expo Router (typed routes) |
| State | Zustand (persisted to AsyncStorage) |
| Forms | react-hook-form |
| i18n | i18next / react-i18next — no hardcoded strings in components |
| Data | `src/services/api.ts` over `src/data/*.json` — async + typed, designed to swap to Supabase without touching screens |
| Design | Fraunces + Manrope, deep-teal on warm ivory, full dark mode |

## Getting started

```bash
npm install
npm start          # scan the QR with Expo Go (iOS/Android)
```

On the welcome screen, tap **“Explore with a demo profile”** to load a seeded persona
(UEC grades, IELTS 6.5, saved courses, 3 in-flight applications, one intake group).

Useful scripts:

```bash
npm run typecheck      # tsc --noEmit
npm run lint           # expo lint
npm run generate-data  # regenerate all mock JSON (deterministic, seeded)
```

## Project structure

```
src/
  app/            # Expo Router screens (tabs: Match · Explore · Applications · Community · Profile)
  components/     # UI kit + feature components
  constants/      # theme (design tokens), countries/currencies
  data/           # generated mock JSON (institutions, courses, fx, …)
  hooks/          # useTheme, useAsync, useMatchData
  i18n/           # i18next setup + en.json
  services/       # api.ts (data access), eligibility.ts, currency.ts, costs.ts
  store/          # Zustand stores (profile, saved, vault, applications, community)
  types/          # domain models
scripts/
  generate-data.mjs  # seeded generator for everything in src/data
```

## Currency & eligibility model

All costs are stored in the institution's local currency and displayed alongside the
student's home currency ("AUD 38,000 / ≈ RM 114,500 per year") using a static FX table
(`src/data/fx.json`). Eligibility compares a computed score per qualification system
against per-course thresholds, with a borderline band and English-test conditions;
degree recognition comes from a per-course matrix over six home countries
(Malaysia, Taiwan, Singapore, Indonesia, Vietnam, China).

*Indicative eligibility — final decisions are always made by each institution.*
