# UniBridge local-partner strategy — rooms, jobs, cars

Student Life (jobs, room rentals, cars) currently runs on generated
prototype listings. At launch that inventory comes from **one local partner
per vertical per destination country** — established marketplaces students
already trust — instead of UniBridge building its own listing supply.
UniBridge stays the student layer: matching, applications, community,
safety; partners supply the marketplace inventory.

## Why this works

- Solves the cold-start problem: real inventory from day one, zero listings
  to moderate ourselves.
- Partners get exactly the audience they want: verified international
  students arriving with housing/job/transport needs and a known city+date.
- Each country's obvious local winner is different — so the plan is
  per-country by design.

## The honesty rule (same as verified badges)

**No partner's name or logo appears inside the app until an agreement is
signed.** Naming candidates in this planning document is fine; implying a
partnership in the product before it exists is not. Until then the app keeps
its "indicative prototype data" labels (see EMAIL_RELAY.md section 9, item 5).

## Phases

| Phase | What | Needs permission? |
| --- | --- | --- |
| 1. Smart link-out | "See rooms near Monash" opens the partner's site pre-filtered to the right city/campus, with affiliate/UTM tracking. Clear "You're leaving UniBridge" disclosure | No agreement needed to link; affiliate programmes are self-serve sign-ups |
| 2. Feed/API integration | Partner listings render inside Student Life cards (price, photo, distance to campus), tap-through to partner to transact | Yes — data agreement |
| 3. Co-branded | "Student housing by <partner> × UniBridge", bundled onboarding offers (e.g. first-month promos), revenue share | Yes — full partnership |

Start every country at Phase 1 — it ships in days and produces the click
data that makes the Phase 2 pitch ("we sent you 4,000 qualified clicks last
month") credible.

## Candidate partners by destination country

Candidates to approach, not commitments. One per vertical to start;
exclusivity is a negotiation lever, not a default.

| Country | Rooms / rentals | Student jobs | Cars |
| --- | --- | --- | --- |
| MY | iBilik (rooms), iProperty | JobStreet (SEEK) | Mudah.my, Carlist.my |
| SG | PropertyGuru, 99.co | JobStreet SG, FastJobs | Sgcarmart |
| AU | Flatmates.com.au (share rooms), realestate.com.au | SEEK | Carsales, Gumtree |
| NZ | Trade Me Property | Student Job Search (non-profit), SEEK NZ | Trade Me Motors |
| GB | SpareRoom (rooms), Rightmove | Indeed UK, StudentJob UK | AutoTrader UK |
| US | Apartments.com, Zillow | Handshake (campus hiring), Indeed | CarGurus, Facebook Marketplace |
| CA | Rentals.ca, Kijiji | Indeed CA | AutoTrader.ca, Kijiji Autos |
| TW | 591房屋交易 | 104人力銀行 | 8891汽車 |
| CN | Ziroom 自如, Beike 贝壳 | BOSS直聘 (note: intl-student work rights are heavily restricted — jobs vertical mostly OFF in CN, mirror the app's work-rights data) | (skip — students rarely buy cars in CN) |
| RU | Cian ЦИАН | hh.ru | Avito Auto |

Notes:
- NZ is the easiest first win: Trade Me alone covers rooms + cars (+ jobs),
  and Student Job Search exists specifically for students.
- SEEK owns JobStreet — one negotiation could cover MY + SG + AU + NZ.
- Mudah.my and Carousell Group overlap in MY/SG classifieds; pick per
  vertical, not per brand.
- Jobs verticals must respect the app's per-country work-rights data (hours
  caps, CN restrictions) — never surface jobs a student can't legally take.

## Revenue models (typical for these partnerships)

- Affiliate / cost-per-click or cost-per-lead from partner programmes
  (Phase 1) — small but immediate.
- Referral fee per completed transaction (booking, hire, sale) — Phase 2+.
- Flat co-marketing / featured-placement fees — Phase 3.
- Never charge students extra for reaching a partner; monetise the partner
  side, keep Season Pass value on the UniBridge feature layer.

## What the app needs built for Phase 1

1. Partner-link registry (per country × vertical × city deep-link template,
   with UTM/affiliate parameters) — a config table, not hardcoded.
2. Outbound-click tracking (the currency of every Phase 2 negotiation).
3. Disclosure UI: partner links clearly marked as external, with the
   existing "listings are indicative" labels dropped only where a real feed
   replaces them (label-is-the-contract rule).
4. Work-rights gate stays in front of the jobs vertical.

## Outreach order

1. Malaysia (home market, founder network) + New Zealand (one partner covers
   nearly everything) as pilots.
2. AU/SG via the SEEK/JobStreet relationship once MY shows click volume.
3. GB/US/CA next; TW/CN/RU once local complexity (language, entities,
   work-rights) is resourced.
