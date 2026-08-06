# UniBridge email relay — production design

How "Contact this school" becomes real email at launch, without students ever
using (or exposing) their personal email addresses.

The prototype already ships the front end of this system: the Contact screen,
the University Mail inbox, and the mail reader with reply box. This document
specifies the backend that replaces the simulated reply.

## The idea in one paragraph

Every student–school conversation gets its own hidden relay address, e.g.
`t-8f3kq2@relay.unibridge.com`. When a student sends a question in the app,
UniBridge emails the school's **verified** admissions inbox *from* that relay
address. The school replies normally from their email client; the reply hits
the relay address, UniBridge matches it to the conversation, and it appears in
the student's University Mail with a push notification. Students never see the
relay address and never hand out their personal email; schools never need to
install anything. The relay address only accepts mail from that school's
domains, so it cannot be spammed.

```
Student (app) ──► UniBridge backend ──► email ──► admissions@monash.edu
   ▲                                                     │ replies to
   │                                                     ▼
University Mail ◄── inbound webhook ◄── t-8f3kq2@relay.unibridge.com
```

## 1. Verified school email directory (the hard, valuable part)

Never guess an address. Three tiers, in order of preference:

| Tier | How | Badge shown in app |
| --- | --- | --- |
| 1. School-claimed | School staff claims its UniBridge profile and verifies by clicking a link sent to an address on the school's own domain | "Verified partner" (the only way this badge is ever earned) |
| 2. Outreach-confirmed | We email the international office from the official contact page, introduce UniBridge, and they confirm the inbox they want enquiries sent to | "Contact verified" |
| 3. Source-audited | Address copied from the school's official website contact page, stored with `source_url` + `checked_at` + who checked it | none (plain send) |

Rules:
- Every row keeps an audit trail: where the address came from, when, by whom.
- Re-verify on a schedule (addresses rot): tier 3 every 6 months, tier 2
  yearly; bounces immediately flag the row and hide the send button until
  re-checked.
- The student can never type an arbitrary "to" address — the app only sends to
  addresses in this table.

## 2. Relay aliases

- **Created automatically at first contact, not at registration.** Signing up
  creates nothing email-related. The moment a student first messages a given
  school, the system mints the alias for that pair. A student who talks to
  three schools has three aliases; a student who never contacts any school
  has none.
- One alias **per conversation thread** (student × school), not per student:
  simplest spam allowlisting, and a school forwarding a thread internally
  can't accidentally reach the same student about something else.
- Format: `t-<opaque random id>@relay.unibridge.com` — at least 10 characters
  in production so addresses can't be guessed by enumeration (examples in
  this document are shortened for readability). No student name or id is ever
  encoded in it.
- The From header the school sees: `"Aisyah via UniBridge" <t-8f3kq2@relay.unibridge.com>`
  — first name only, unless the student opts into full name.
- Footer appended to every outbound mail: "Sent via UniBridge on behalf of a
  verified student applicant. Reply normally — your reply reaches the student
  in their UniBridge inbox."

### Decision record: why not one shared address for all students?

Considered: a single `students@unibridge.com` used for every student, with a
tracking system mapping who wrote to which school. Rejected because inbound
routing becomes guesswork — straight replies can be matched via threading
headers, but fresh composes, internal forwards and university CRMs
(Slate/Salesforce-type systems) drop those headers, leaving only subject/name
matching. The worst-case failure — one student's offer or rejection delivered
to another student — is a privacy breach and unacceptable. Per-thread aliases
cost the same (a catch-all domain makes unlimited addresses free; an alias is
a database row, not a mailbox) and make mis-routing structurally impossible:
the address itself is the tracking number. The shared-address idea survives
as `hello@unibridge.com`: any inbound mail matching no thread lands in a
staff review queue instead of being dropped.

## 3. Outbound flow (student → school)

1. Student writes in the app (the existing reply box).
2. Backend checks rate limits and content rules (below), renders the email
   (plain text + simple HTML), sets threading headers
   (`Message-ID`, `In-Reply-To`, `References`) so school inboxes keep the
   conversation in one thread.
3. Send through the transactional provider; store the message with provider
   message id + delivery status (queued → delivered / bounced).
4. Show delivery state in the app ("Delivered to Monash admissions" /
   "Could not deliver — our team is checking the address").

## 4. Inbound flow (school → student)

1. MX for `relay.unibridge.com` points at the provider's inbound parser.
2. Webhook hits the backend with the parsed message.
3. Backend looks up the alias → thread. Unknown alias: if the sender's domain
   matches any school in the directory, route to the `hello@` staff review
   queue (school mail is never silently deleted — see the decision record);
   anything else (dictionary-attack spam on the catch-all) is dropped.
4. **Sender allowlist**: accept only if the From/Return-Path domain matches
   the school's registered domains (e.g. `monash.edu`, `e.monash.edu`).
   Anything else → quarantine, never delivered to the student.
5. Sanitise: strip tracking pixels, virus-scan attachments (size cap ~10 MB),
   convert to app-safe rich text.
6. Store in the thread, classify kind if possible (offer / docs request /
   interview — the prototype's mail kinds), push-notify the student.

## 5. Abuse, reputation and compliance

- Rate limits: new-school first-contacts per student per day (e.g. 5), and
  per-school daily ceiling so a school never perceives UniBridge as bulk mail.
- First-contact quality: the compose screen nudges structure (which course,
  intake, the actual question) — protects our domain reputation and gets
  students real answers.
- Deliverability: dedicated subdomain (`relay.unibridge.com`) with SPF, DKIM,
  DMARC aligned; warm the domain up slowly; monitor bounce/complaint rates.
- Privacy (PDPA Malaysia + destination-country equivalents): student personal
  email is never shared with schools; students are told replies pass through
  UniBridge servers; retention and export/delete policy documented. Many
  users are 17–19 — Parent View can optionally mirror thread *existence*
  (not content) for guardians.
- Blocklist: a school can opt out of relay contact entirely; we then show
  only its official website on the Contact screen.

## 6. Suggested stack

- Backend: Supabase (already the planned data layer) + one small worker
  (Edge Function / Node service) for the two email webhooks.
- Email provider: Postmark (simplest inbound parsing + excellent
  deliverability) or AWS SES (cheapest at scale; inbound via receipt rules →
  SNS/S3). Either handles both directions; start with Postmark, revisit at
  ~50k mails/month.
- Cost at early volumes: roughly free tier → tens of USD per month.

### Tables (minimum)

```
school_contacts  (institution_id, email, tier, source_url, verified_at,
                  verified_by, status: active|bounced|retired)
threads          (id, student_id, institution_id, alias, status, created_at)
messages         (id, thread_id, direction: out|in, subject, body, headers,
                  provider_msg_id, delivery_status, kind, created_at)
quarantine       (alias, from_addr, reason, raw_ref, created_at)
```

## 7. Pre-launch checklist — what UniBridge must have in hand

Everything the relay needs that the prototype does not have today.

**Accounts & services to set up** (≈ RM 650–700 to start with email on free
tier during the pilot; ≈ RM 1,500–2,000 for the first full year once paid
email volume kicks in)

| What | Why | Cost (approx) |
| --- | --- | --- |
| Own domain (e.g. `unibridge.com`) + DNS control (Cloudflare) | The relay subdomain `relay.unibridge.com` and its MX/SPF/DKIM/DMARC records | ~RM 60/yr, DNS free |
| Supabase project | Real accounts, database (threads, messages, school directory), file storage, webhook functions | Free tier → RM 120/mo when it grows |
| Transactional email provider (Postmark or AWS SES) with inbound parsing enabled | Sending to schools + receiving their replies; new senders go through a short approval review | ~RM 70/mo (Postmark 10k mails) |
| Expo push notifications | "The school replied" must reach the student's phone | Free |
| Apple Developer + Google Play accounts | Ship the real app (see STORE.md) | US$99/yr + US$25 once |
| Error/deliverability monitoring (Sentry free tier + provider dashboards) | Bounces and complaint rates are the health of the whole system | Free to start |

**Things to build (development work)**

1. Real sign-in (the prototype's Google/email buttons are mock) — Supabase Auth.
2. Move data off-device: profiles, applications and mail threads into the
   database (the app's screens stay as they are; the API layer in
   `src/services/api.ts` was built to be swapped to Supabase).
3. The two webhook workers from sections 3–4 (outbound send, inbound receive)
   plus the quarantine and allowlist logic.
4. School-directory admin tool (even a spreadsheet-backed one at first) with
   the audit fields from section 1.

**Human work (no code)**

- Collect and verify admissions emails for the launch school list (section 1
  tiers) — the single most valuable manual task before launch.
- Warm up the sending domain: start with low volume to pilot schools.

**Paperwork**

- A company entity to own the domain and the accounts above.
- Privacy policy + terms covering the relay (PDPA Malaysia; many users are
  17–19), stating that school correspondence passes through UniBridge servers
  and personal emails are never shared with schools.

## 8. Rollout order

1. Build directory tooling + collect tier-3 addresses for the launch schools
   (with audit trail), start tier-2 outreach in parallel.
2. Relay MVP: one pilot school that agreed to it (tier 1), real students, real
   threads, measure reply rates.
3. Open to all tier-1/2 schools; tier-3 behind a "response not guaranteed"
   note.
4. School dashboard (claim profile, see enquiries, canned answers) — this is
   also the honest path to every "Verified partner" badge in the app.

## 9. De-mocking checklist — demo behavior that MUST NOT ship to real users

The prototype simulates things on purpose. Each item below must be replaced
or removed before real students use the app; none of it may survive into
production by accident.

| # | Prototype behavior (where) | At launch |
| --- | --- | --- |
| 1 | Contact screen fakes a school reply after ~1 second (`chat.mockReply`); coursemate chats send canned replies | Remove entirely — replace with real relay delivery states. A student must never see a school answer that no school wrote |
| 2 | University Mail shows the same 6 sample mails to every account (generated demo data) | Inbox shows only the student's real threads; new accounts see an empty state |
| 3 | Mail reader's reply box is demo-only ("nothing is sent…" note) | Wire to the outbound relay (section 3) and delete the demo note |
| 4 | Every school shows a "Verified partner" badge as visual placeholder | Badge only for tier-1 school-claimed profiles (section 1). Everything else shows no badge |
| 5 | Job/support contacts are fictional by design: `*.example` emails, `0000` phone blocks, `UniBridgeSupportDemo`-style handles | Replace with the company's real channels; jobs/rentals/cars inventory comes via per-country marketplace partners (see PARTNERS.md) or stays clearly labeled |
| 6 | School reviews, food ratings and snippets are labeled sample data | Keep the labels until real data replaces them — never present sample numbers as real reviews |
| 7 | Season Pass RM49.90 / VIP purchases are one-tap mocks | Real app-store billing (IAP) before any money is taken |
| 8 | Sign-in buttons are mock; demo seed data (`app-demo-*` applications) exists | Real auth (Supabase); strip demo seeds from production builds |

Rule of thumb: anything the prototype labels "demo", "sample", "prototype" or
"indicative" is a placeholder for a real system — the label is the contract.
Ship the real system, or keep the label; never drop the label alone.
