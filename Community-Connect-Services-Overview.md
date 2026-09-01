# Community Connect Services
### Full Product & Technical Overview

*Philippine services marketplace connecting seekers (including seniors and caregivers) with service providers.*

---

## 1. What This App Is

Community Connect Services is a **mobile-first Android app** (with a desktop dashboard planned for later) that lets people in the Philippines find and book local service providers — from a plumber to a caregiver to a rental car. It's built with everyday users in mind, including seniors and the people who care for them, so the flows are kept simple and guided.

All prices are in **Philippine Pesos (PHP)**.

---

## 2. The Eight Service Categories

| # | Category | Examples |
|---|----------|----------|
| 1 | **Transport** | Drivers, delivery, errand rides |
| 2 | **Landscaping** | Gardening, lawn care |
| 3 | **Handyman** | Repairs, installations |
| 4 | **Events** | Catering, event staff, decorations |
| 5 | **Care & Home** | Caregiving, cleaning, house help |
| 6 | **Errands** | Shopping, pickups, drop-offs |
| 7 | **Other Professional Services** | Bookkeeping, architecture, construction |
| 8 | **Rentals** | Equipment, vehicles, venues |

There's also a **catch-all "Other services"** option during provider signup, for anything that doesn't fit neatly into the categories above.

---

## 3. Who Uses the App

There are three types of users:

- **Seekers** — people looking to book a service (may set up a "dependent profile" for a parent or family member they're arranging care for)
- **Providers** — people or businesses offering a service
- **Admins** — the platform team, who can review bookings, manage disputes, and moderate accounts

---

## 4. Core Features Built So Far (Prototype)

The current working version is an **interactive HTML prototype** — a clickable mockup used to test and refine the flows before any real backend is built. It already includes:

- **Registration & login** for both seekers and providers, with simulated OTP (one-time password) verification
- **Provider signup wizard**: basic info → service category → rates & availability → optional credentials → final review
- **Admin panel** with tabs for Bookings, Providers, Seekers, and an Audit Log — every admin override requires a typed comment, and all actions are logged
- **Booking flows** for every category type
- **Cancellation flow**, including recording "strikes" against repeat cancellers
- **Dispute reporting**
- **Chat / inbox** between seekers and providers, with unread message badges
- **Landing and auth screens** with a consistent design system (colors, spacing, type — called "design tokens")
- **Home screen stubs** for each user role
- **Desktop Operations Dashboard** (early version) with KPI cards and a bookings table — this is for the *admin/ops team*, not for regular seekers or providers

---

## 5. Key Product Decisions (Already Confirmed)

These are the business rules the app is being built around:

### Money & Payments
- **Payment between seeker and provider happens off-platform** — cash, GCash, bank transfer, whatever the two parties agree on. The app does **not** process seeker payments.
- Before a booking is finalized, a **payment method confirmation screen** shows how the seeker and provider agreed to pay.
- **Providers pre-load a "credit balance"** into the app.
- When a provider **accepts a booking**, a **platform fee is automatically deducted from their credit balance**. Seekers never see or pay this fee — it's entirely between the platform and the provider.

### Rates & Negotiation
- On regular (non-professional) listings, providers can **allow rate negotiation** — a back-and-forth counter-offer flow.
- **Professional services** (bookkeeping, architecture, construction, etc.) have **fixed rates only** — no negotiation.
- Even if a rate is negotiated down, the **platform fee is still calculated on the original listed rate**, not the negotiated one.

### Rentals (special case)
- Rentals use a **quote-request** flow instead of instant booking.
- When a provider responds to a quote request, a **flat ₱150 fee** is deducted from their credit balance — this unlocks chat with the seeker.

### Availability & Cancellations
- Providers set their own availability: **same-day**, or a required lead time (from 1 hour up to 1 week).
- Every listing has a **cancellation policy**: Flexible, Moderate, or Strict.

---

## 6. Deliberately Deferred or Set Aside

To avoid wasted work, a few things have been **intentionally paused** until they're properly resolved:

- **VAT and BIR tax treatment** — whether the platform is acting as a "principal" or an "agent" in the eyes of Philippine tax law hasn't been confirmed by an accountant yet. **No accounting or tax logic will be built until this is settled**, because building it early risks having to redo it.
- **"Seeker wallet" concept** — an earlier idea from the original product brief. This has been **superseded** by the off-platform payment model above. If it ever resurfaces in old notes, it should be treated as outdated.
- **Desktop dashboard audience** — needs clearer definition of who exactly uses it day-to-day before it's built out further.

---

## 7. Planned Technology Stack (For the Real, Production App)

The current prototype is just HTML — a **visual mockup**, not the real running app. Here's what's planned for the actual production build:

| Layer | Technology | Plain-English Role |
|-------|-----------|---------------------|
| **Frontend (what users see)** | Next.js | The framework that builds the actual screens users tap through |
| **Backend (the "brain")** | NestJS | Handles the logic — bookings, payments, notifications, etc. |
| **Database** | PostgreSQL + Prisma | Where all the data (users, bookings, listings) is stored; Prisma is the tool that lets the backend talk to the database easily |
| **Authentication & File Storage** | Supabase | Handles user login/signup and stores uploaded files (like provider credentials) |
| **Payments (future phase)** | PayMongo | Philippine payment processor, for when in-app payment features are added later |
| **SMS / OTP** | Semaphore | Sends the text messages used for phone verification |
| **Local payment method** | GCash | One of the off-platform payment options seekers/providers can use |
| **Tax compliance** | BIR-compliant tooling | To be added once VAT/principal-agent questions are resolved |

---

## 8. Deployment: How This App Would Actually Go Live

Since you mentioned limited coding experience, here's a breakdown of what "deployment" means for each part of the stack, and the easiest realistic path — written in plain terms.

### 8.1 What "Deployment" Means Here

Right now the prototype lives only as a file/artifact you can view — it isn't running as a real, public app. Going live means:

1. Turning the design into real, working code (Next.js frontend + NestJS backend)
2. Hosting that code somewhere it runs 24/7 and is reachable by a public web/app address
3. Connecting it to a real database and real external services (SMS, payments)
4. Publishing the mobile app so people can install it (Android, via Google Play)

### 8.2 Recommended Hosting Setup (Simplest Path)

| Component | Recommended Host | Why |
|-----------|-------------------|-----|
| **Frontend (Next.js)** | **Vercel** | Made by the creators of Next.js; deployment is close to "push a button" — connect your code repository and it builds and hosts it automatically |
| **Backend (NestJS)** | **Railway** or **Render** | Both offer simple, low-maintenance hosting for backend servers, with free/cheap starter tiers and simple dashboards (no server management knowledge needed) |
| **Database (PostgreSQL)** | **Supabase** (built-in) | Since Supabase is already planned for auth/storage, its included PostgreSQL database avoids needing a separate database host |
| **File storage** | **Supabase Storage** | Same reasoning — one less service to manage |
| **Domain name** | Any registrar (e.g., Namecheap, Google Domains successor Squarespace Domains) | Where you buy "communityconnect.ph" or similar |

This combination is chosen deliberately because each of these services has a **web dashboard** (not just command-line tools), so day-to-day management doesn't require deep coding knowledge once the initial setup is done by a developer.

### 8.3 Step-by-Step Deployment Flow (High Level)

1. **Code is finished and pushed to GitHub** (a code storage/versioning service — think of it like Google Drive for code, with history tracking)
2. **Backend goes live first:**
   - Connect the GitHub repository to Railway or Render
   - Set "environment variables" (secret settings like database passwords and API keys) in their dashboard
   - The host builds and runs the NestJS backend, giving it a public web address (e.g., `api.communityconnect.ph`)
3. **Database & Auth go live:**
   - Create a Supabase project
   - Run the database setup scripts ("migrations") to create all the necessary tables
   - Configure Supabase Auth settings (OTP via Semaphore integration, etc.)
4. **Frontend goes live:**
   - Connect the GitHub repository to Vercel
   - Vercel automatically builds and hosts the Next.js app, pointing it at the backend's address
   - Attach your custom domain (e.g., `communityconnect.ph`) in Vercel's dashboard
5. **Mobile app packaging:**
   - Since this is described as a mobile-first *Android app*, the Next.js web app is typically wrapped using a tool like **Capacitor** or **React Native** (if going fully native) so it can be submitted to the **Google Play Store**
   - This requires a **Google Play Developer account** (one-time $25 registration fee) and going through Google's app review process
6. **Payments go live (later phase):**
   - Once ready, PayMongo is connected via API keys in the backend's environment variables — no separate hosting needed, it's a service you call, not something you host
7. **SMS/OTP goes live:**
   - Semaphore is connected the same way — an API key added to the backend's settings

### 8.4 Ongoing Costs (Rough Ballpark, Early Stage)

| Service | Approx. Starting Cost |
|---------|------------------------|
| Vercel | Free tier available; paid plans start ~$20/month as traffic grows |
| Railway / Render | Free or ~$5–20/month for small backend usage |
| Supabase | Free tier available; paid plans start ~$25/month |
| Domain name | ~$10–20/year |
| Google Play Developer account | $25 one-time |
| Semaphore SMS | Pay-per-message, Philippine peso pricing |
| PayMongo | Percentage-based transaction fees, no monthly cost |

*(Exact prices change over time — worth double-checking current rates before committing.)*

### 8.5 What You'd Need From a Developer (If You're Not Coding This Yourself)

Given your background, the realistic division of labor is:

- **You:** Product decisions, testing the prototype, reviewing flows, business/legal questions (like the VAT issue), choosing branding/domain name
- **A developer (contractor or team):** Turning the Next.js/NestJS code from the prototype design, setting up Supabase/Railway/Vercel accounts, connecting Semaphore/PayMongo, submitting to Google Play

---

## 9. What's Left To Build (Roadmap)

1. **Remaining mobile screens** — all role-specific home screens and detailed booking flows not yet built in the prototype
2. **Desktop SaaS dashboards** — expanded admin/ops tooling, after mobile is complete
3. **Real backend + database** — replacing the HTML prototype with actual working Next.js/NestJS/PostgreSQL code
4. **Philippine accounting & BIR compliance module** — paused until VAT/principal-vs-agent question is resolved
5. **PayMongo integration** — production-grade payment processing (once in-platform payment features, if any, are needed)
6. **Google Play submission** — packaging and publishing the Android app

---

## 10. Quick Reference: Confirmed vs. Open Questions

**Confirmed / Locked In:**
- Off-platform payments only
- Provider credit balance + fee-on-accept model
- Rate negotiation rules (regular listings only, fee based on listed rate)
- Rental quote-request flow with flat ₱150 fee
- Cancellation policy tiers (Flexible/Moderate/Strict)

**Still Open:**
- VAT treatment & principal-vs-agent tax classification (needs accountant)
- Exact audience/use case for the desktop dashboard
- Final Supabase vs. NestJS division of responsibilities (some overlap flagged, not yet resolved)

---

*This document reflects the state of the Community Connect Services project as of the current build. It's meant as a shareable reference — for a developer, an investor, or your own notes — summarizing what's been decided, what's been built, and what it would take to bring the app to a real, live deployment.*
