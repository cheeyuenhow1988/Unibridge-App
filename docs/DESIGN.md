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
| Accent (teal) | `#0E7C6B` | `#3FCDB1` |
| Eligible | teal | teal |
| Borderline | amber `#A85B0A` | `#E8A23D` |
| Pathway | cobalt `#3A57C4` | `#93A9F2` |
| Verified | gold `#8A6A12` | `#E2C15E` |

No SaaS-blue defaults, no purple-gradient-on-white, no glassmorphism. Contrast targets
WCAG 2.1 AA (4.5:1 normal text) in both schemes.

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
- The three Match buckets are the money shot: big Fraunces counts on soft semantic
  fills, one tap to switch, screenshot-ready.
