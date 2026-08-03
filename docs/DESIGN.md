# UniBridge design direction

Feel: **optimistic, international, trustworthy — with Gen-Z energy.** Editorial fintech
foundation ("Electric Optimism" pass): deep-teal gradient statement moments and an
electric-lime pop accent layered over the calm ivory trust base.

## Type

- **Fraunces** (SemiBold/Bold, plus **Black** for hero numerals and gradient headlines) —
  a characterful serif that gives the app the warm, editorial confidence of modern
  fintech brands, pushed to poster weight for the moments that should be screenshotted.
- **Manrope** (400–800) for UI, body and numbers — clear, tabular-friendly, never generic.
- Scale ≈1.25: display 34 / title 27 / heading 20 / sub 16 / body 15 / caption 12.5 / micro 10.5.
- Body line-height 1.5×; large headlines tracked −0.5 to −0.7.

## Color

One committed accent, warm neutrals, semantic bucket colors:

| Token | Light | Dark |
|---|---|---|
| Background | `#F6F4EF` warm ivory | `#101917` warm charcoal-green |
| Surface | `#FFFFFF` | `#1A2421` |
| Ink | `#172723` | `#ECF2EF` |
| Accent (teal) | `#0C6F60` | `#3FCDB1` |
| Eligible | teal | teal |
| Borderline | amber `#96500A` | `#E8A23D` |
| Pathway | cobalt `#3A57C4` | `#93A9F2` |
| Verified | gold `#77590E` | `#E2C15E` |
| Pop (lime) | `#C8F14A` on-ink | `#CDF463` |
| Hero gradient | `#0D7A68 → #083D33` | `#12564A → #0B211D` |

**Electric Optimism rules:** lime is an *energy* accent, never body text — it lives on
gradients and dark ink (hero CTAs, strength meter, countdown, tags, active dots). The
teal hero gradient is reserved for brand statement moments: welcome carousel, Match
greeting card, pre-departure countdown. Everything transactional stays on the trust
base. White body text on gradients ≥5.2:1; lime labels on gradients are bold/large only
(≥4.0:1, above the 3:1 large-text threshold); ink on lime ≥11.9:1.

No SaaS-blue defaults, no purple-gradient-on-white, no glassmorphism. Contrast is
verified programmatically: every shipped text/background token pair (36 pairs across
both schemes, including badge-on-soft combinations) meets WCAG 2.1 AA 4.5:1.

## Space & shape

- 4px-base spacing scale (4/8/12/16/20/28/40), generous whitespace throughout.
- Radii 10/14/20/28 + pill; cards are 1px hairline borders with soft shadows in light mode.
- Touch targets ≥44×44; pressed states dim to 85–88% opacity.

## Patterns

- **Skeletons** for every list >300ms, **empty states** with icon + CTA, **error states**
  with retry — standardized via `useAsync` + `SkeletonCards`/`EmptyState`/`ErrorState`.
- Currency always dual: local + ≈ home ("A$38,000 / ≈ RM114,500 per year"); compact
  M/B notation keeps IDR/VND/RUB scannable.
- Country flags (emoji) as consistent scannability anchors; Ionicons for UI chrome
  (no emoji icons in controls).
- Status is never color-only: badges pair color with icon + label.
- Decorative animation respects the OS reduce-motion setting (skeleton pulse goes static).
- The three Match buckets are the money shot: big Fraunces counts on soft semantic
  fills, one tap to switch, screenshot-ready.

## Design-engine cross-check (ui-ux-pro-max v2.11)

The full `--design-system` run for "international student university admissions
marketplace / trust / fintech / mobile" recommended: Vibrant & Block-based style,
micro-interactions, dark-mode support, 200–300ms transitions, large display type —
**adopted** (block cards, pressed states, full dark scheme, Fraunces display sizes).
Its pre-delivery checklist drove two fixes: the WCAG audit above (7 token pairs were
below 4.5:1 and were darkened/adjusted) and reduce-motion support.

Its generic palette pick (gold `#F59E0B` + purple `#8B5CF6` on slate) and IBM Plex Sans
were **rejected deliberately**: the product brief specifies one deep-teal/cobalt accent
on warm neutrals, and the companion bencium-innovative-ux-designer skill bans
purple-accent defaults and interchangeable corporate sans-serifs. Trust-color intent is
carried by the teal + gold *Verified Partner* accents instead.
