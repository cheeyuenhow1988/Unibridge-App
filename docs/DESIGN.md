# UniBridge design direction

Feel: **optimistic, international, trustworthy** — editorial fintech, not a school portal.

## Type

- **Fraunces** (SemiBold/Bold) for display and titles — a characterful serif that gives
  the app the warm, editorial confidence of modern fintech brands.
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
