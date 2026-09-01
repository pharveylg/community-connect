# Community Connect

A mobile-first marketplace for everyday local services in the Philippines —
connecting **seekers** (including seniors and people booking for family
members) with **providers** (transport, handyman, errands, cleaning, gardening,
care, events — **and services providers invent themselves**, like trash
pickup or junk & scrap hauling).

**How money works:** Community Connect is a listing & connectivity service.
Payments happen **directly between seeker and provider** (cash, GCash, Maya) —
the app never holds seeker money. Providers get a **free tier** (active
listings + free accepted bookings each month) and will be able to top up
credits for extras (more slots, boosts, unlimited accepts).

All prices in Philippine Pesos (PHP).

---

## Stack

- **Next.js 16** (App Router, Server Actions) + React 19 + Tailwind CSS v4 + TypeScript
- **Firebase** — Auth (client SDK, email/password), Firestore via the **Admin
  SDK on the server only**; session cookies are httpOnly (14 days, revocation checked)
- **Zod 4** schemas shared between client and server

Architecture rule: the browser only ever talks to Firebase **Auth**. Every
Firestore read/write goes through Server Actions using the Admin SDK, so the
client-side Firestore rules are deny-all (defense in depth).

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Firebase config (both blocks)
npm run dev
```

### Firebase project setup

1. Create a project at the [Firebase console](https://console.firebase.google.com).
2. **Auth**: enable the Email/Password provider.
3. **Web app config**: Project settings → General → Your apps → Web app — copy
   the values into the `NEXT_PUBLIC_FIREBASE_*` variables.
4. **Admin SDK**: Project settings → Service accounts → *Generate new private
   key* — copy `project_id`, `client_email`, and `private_key` into the
   `FIREBASE_*` variables (keep the `\n` escapes in the private key as-is).
5. **Firestore**: create a Firestore database (production mode). No composite
   indexes are required. Client rules in `firestore.rules` deny all direct
   access — deploy them with `firebase deploy --only firestore:rules` if you
   change them.

## Creating the first admin

Admins **cannot be created through the app** — the public role-selection
action only accepts `seeker` or `provider`. To bootstrap an admin:

1. Register a normal account through the app (choose any role).
2. In the Firebase console → Firestore → find `profiles/{yourUid}`.
3. Set the field `role` to `"admin"`.

After that, admins can manage other users' roles via the admin-only server
action (`changeUserRole` in `app/actions/admin.ts`); the admin console UI is
coming in a later build.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |

CI (GitHub Actions, `.github/workflows/ci.yml`) runs lint + typecheck + build
on every push/PR.

## Deploying (Vercel)

1. Push this repo to GitHub and import it in Vercel.
2. Add all the environment variables from `.env.local` in the project settings.
3. Deploy — no other configuration needed.

## Project layout

```
app/                    Next.js App Router
  (app)/                Authenticated area (header + session required)
    seeker/             Seeker home = browse services (category filter)
    provider/           Provider dashboard + create/pause services
    admin/              Admin stub (full console coming later)
  actions/              Server Actions (auth, services, admin)
  login/ register/ onboarding/
lib/                    Firebase clients, Firestore data layer, validation,
                        service catalog + freemium entitlements, session, DAL
firestore.rules         Deny-all client rules (all access via Admin SDK)
```

## Status & roadmap

Built: auth + onboarding (incl. resume-after-interruption), role guardrails
(no self-serve admin), provider service listings **with custom services**,
seeker browse with category filters, freemium free-tier limits.

Next: booking request → accept flow with the accept-fee ledger, provider
credits/wallet + manual top-up approval, verification badges, SMS
notifications, ratings with job-done confirmation, admin console with audit
log.

Deliberately deferred: in-app seeker payments (off-platform by design),
rentals/professional-services categories, VAT/BIR accounting module (pending
the principal-vs-agent question).
