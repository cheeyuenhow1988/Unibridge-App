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

- One alias **per conversation thread** (student × school), not per student:
  simplest spam allowlisting, and a school forwarding a thread internally
  can't accidentally reach the same student about something else.
- Format: `t-<10-char opaque id>@relay.unibridge.com`. No student name or id
  encoded in it.
- The From header the school sees: `"Aisyah via UniBridge" <t-8f3kq2@relay.unibridge.com>`
  — first name only, unless the student opts into full name.
- Footer appended to every outbound mail: "Sent via UniBridge on behalf of a
  verified student applicant. Reply normally — your reply reaches the student
  in their UniBridge inbox."

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
3. Backend looks up the alias → thread. Unknown alias → drop.
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

## 7. Rollout order

1. Build directory tooling + collect tier-3 addresses for the launch schools
   (with audit trail), start tier-2 outreach in parallel.
2. Relay MVP: one pilot school that agreed to it (tier 1), real students, real
   threads, measure reply rates.
3. Open to all tier-1/2 schools; tier-3 behind a "response not guaranteed"
   note.
4. School dashboard (claim profile, see enquiries, canned answers) — this is
   also the honest path to every "Verified partner" badge in the app.
