# UniBridge analytics & feedback — production design

Two systems: **event tracking** (what each registered student actually does
and clicks) and **in-app surveys** (what they tell us). Both feed one
question: what should UniBridge build, fix, or sell next — and both are the
evidence pack for partner and investor conversations.

## 1. Event tracking (clicks & behavior)

### Tool

PostHog (recommended): works with Expo/React Native, generous free tier
(~1M events/month), self-hostable later if data-residency matters, and
includes funnels, retention, session analysis and surveys in one product.
Alternatives: Amplitude (strong free tier), Firebase Analytics (free,
weaker analysis). Decision can wait; the taxonomy below is tool-agnostic.

### What gets recorded

Every event carries the student's anonymous id (linked to their account
after sign-in) plus context properties. Core taxonomy — implement these
names exactly, resist inventing variants later:

| Event | Properties | Why it matters |
| --- | --- | --- |
| `onboarding_completed` | home_country, qualification, intake_year | Who our students are |
| `match_viewed` | eligible_count, pathway_count | Does matching deliver value fast |
| `school_viewed` | institution_id, source (match/explore/ai) | THE ranking of most-clicked schools |
| `course_saved` | course_id, institution_id | Demand signal per course |
| `application_started` / `application_submitted` | course_id | The core funnel |
| `contact_school_sent` | institution_id | Relay demand (EMAIL_RELAY.md) |
| `partner_link_clicked` | partner, vertical (room/job/car), city | The currency of every partner negotiation (PARTNERS.md) |
| `assistant_asked` | topic_bucket only — never the raw question text by default | What students are confused about |
| `group_joined` / `mate_request_sent` | institution_id | Community health |
| `pass_purchased` / `vip_purchased` | price, currency | Revenue funnel |
| `survey_submitted` | survey_id, score | Feedback loop health |

User properties (set once, updated on change): home country, qualification
system, intake year, plan tier (free/pass/VIP), enrolled city once an offer
is accepted, app language.

### The dashboards that answer "what do they click most"

1. **Top schools / top courses** — `school_viewed` and `course_saved`
   ranked, split by student home country (tells you which recruitment
   markets match which schools).
2. **Feature leaderboard** — screen-view counts for Match, Explore, AI,
   Community, Student Life; where time is actually spent.
3. **Core funnel** — onboarding → match → school view → application →
   offer → pass purchase; the drop-off step is always the next thing to fix.
4. **Partner clicks** — `partner_link_clicked` by vertical and city.
5. **Retention** — D1/D7/D30 return rates by cohort.

### Privacy rules (non-negotiable)

- Disclose tracking in the privacy policy; offer an opt-out toggle in
  Profile. Many users are 17–19 — collect the minimum, no ad-tech SDKs.
- Never log message bodies, personal statements, grades documents or chat
  content as analytics events. Aggregate counts only.
- PDPA Malaysia + destination-country equivalents; EU-style consent if GB
  student traffic grows.
- Data lives in the analytics tool + Supabase only; never sold.

## 2. Surveys & feedback ("sometimes ask the person")

### Mechanics

- **Trigger-based, not random**: ask right after a meaningful moment, one
  survey max per moment, skippable in one tap.
- **Three questions maximum** per survey. Response rates collapse beyond
  that.
- **Paid in coins**: add a `survey` rule (~30 coins) to the existing
  Rewards coin rules (profile 20 / grades 30 / application 60), so
  feedback slots into the earn-and-redeem loop already in the app.
- Tooling: PostHog Surveys (in-app, targeted by event history) or a native
  UniBridge form writing to Supabase. Avoid kicking users out to external
  Typeform links — completion drops.

### The survey calendar

| When | Ask | Format |
| --- | --- | --- |
| Right after first match results | "Did these matches feel right for you?" | 1–5 stars + one optional line |
| After application submitted | "How hard was applying through UniBridge?" | 1–5 + multi-select of friction points |
| Day 7 of usage | NPS: "How likely would you recommend UniBridge to a friend applying abroad?" (0–10) | Standard NPS |
| After Season Pass / VIP purchase | "What made you upgrade? What's missing?" | Multi-select + free text |
| After a school replies via relay | "Did the school's answer help?" | Yes/No + optional line |
| Visa granted / arrival (self-reported milestone) | The gold-mine exit survey: what almost made you quit, what would you pay more for | 3 questions, 60 coins |

### Closing the loop

- Weekly: one page — top 3 friction points from surveys vs. what the
  funnel data says; fix the overlap first.
- Tag every piece of free-text feedback to a feature area; a recurring tag
  three weeks running becomes a roadmap item.
- Tell students what changed ("You asked, we fixed") in the app's
  notifications — it trains users that feedback is worth giving.

## 3. What the prototype can demo today vs. production

- The prototype has no tracking SDK and sends nothing anywhere — all data
  stays on-device. Adding PostHog is a production task (needs the privacy
  policy + opt-out first; see the de-mocking rule in EMAIL_RELAY.md §9).
- A demo feedback form wired to Rewards coins can be built into the
  prototype now to show the mechanic (answers stored locally, labeled
  demo) — the survey calendar above then just swaps local storage for
  Supabase.
