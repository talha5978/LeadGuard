# LeadGuard

**Every lead gets an owner. No exceptions.**

LeadGuard is a multi-tenant web platform that guarantees every inbound lead is assigned, acknowledged, and escalated if ignored — so service businesses stop losing revenue to silence.

---

## The Problem

Small and growing service businesses (agencies, installers, clinics, sales teams) lose deals because:

- Leads arrive via web forms, chat, or phone and nobody owns them
- Assignment is informal — easy to dodge responsibility
- Absence, leave, and overload are not considered when distributing leads
- No alert fires when a lead has been waiting too long
- CRM, messaging, and calendars live in separate tools with incomplete records
- Managers cannot see response times, missed opportunities, or pipeline health in one place

**LeadGuard solves the central failure mode:**  
*a lead sitting unowned until the customer goes to a competitor.*

---

## What LeadGuard Does

| Capability | Description |
|------------|-------------|
| **Smart assignment** | Round-robin among Available employees with max open-lead limits |
| **Forced acknowledgement** | Configurable SLA countdown; assignee must acknowledge or act |
| **Automatic escalation** | Expired windows reassign to the next available employee, then surface in Recovery |
| **Recovery Queue** | Single page of overdue, multi-escalated, and idle leads with reasons and actions |
| **Public lead capture** | Website form creates Contact + Opportunity and assigns instantly |
| **Manual CRM** | Contacts, opportunities, stages, notes, activity history |
| **Team & invites** | Invite members by email/link; roles: Owner, Admin, User |
| **Operational dashboard** | Live metrics for leads, escalations, team availability, recovery count |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Monorepo** | npm workspaces |
| **Framework** | React Router v7 (**Framework Mode**) |
| **UI** | React 19, Tailwind CSS, shadcn/ui |
| **Data fetching** | TanStack Query (React Query) |
| **Forms** | React Hook Form + Zod |
| **Backend / DB** | Supabase (PostgreSQL) |
| **Auth** | Custom session auth (bcrypt password hashing + signed HTTP-only cookies) |
| **Language** | TypeScript |

### Why this stack

- **React Router Framework Mode** — loaders/actions on the server, type-safe routes, clean SPA or SSR options
- **Supabase Postgres** — multi-tenant data, RLS-ready schema, fast iteration for a competition build
- **Custom auth** — full control over signup, invites, and sessions without coupling to Supabase Auth
- **shadcn + Tailwind** — consistent, accessible UI with Field, Dialog, Table, Sidebar primitives
- **TanStack Query** — shared query options between server loaders and client cache invalidation

---

## Core Domain Model

```
workspaces          → one company (tenant)
profiles            → users (owner | admin | user) + availability status + password hash
contacts            → customers / leads’ people
opportunities       → pipeline items (the “lead” object)
activity_logs       → audit trail (assign, ack, escalate, notes, …)
notifications       → in-app alerts
invitations         → pending team invites (token-based)
```

**Opportunity ownership fields (heart of the product):**

- `assigned_to`, `assigned_at`
- `acknowledged_at`, `acknowledgement_deadline`
- `escalation_count`, `is_in_recovery`, `last_action_at`

---

## Features by Area

### Public
- Marketing landing page
- **Public lead form** → Contact + Opportunity (`source = web_form`) + auto-assign
- Login / Signup (creates workspace + owner profile)
- Accept team invite (`/invite/:token`)

### Portal (`/d`)
- **Dashboard** — new leads today, open pipeline, recovery count, escalations (24h), team availability, my open leads, recent activity
- **Contacts** — list, search, create, view dialog, create opportunity from contact
- **Opportunities** — list, filters (stage, assigned to me, unacknowledged), acknowledge, change stage
- **Recovery Queue** (Owner/Admin) — overdue / multi-escalated / idle leads, re-assign, acknowledge, run escalation check
- **Team** (Owner/Admin) — members list, invite by email + role, copy invite link, revoke
- **Profile dialog** — view identity, update availability status (Available / Busy / On leave / Offline)

### Roles

| Role | Access |
|------|--------|
| **Owner** | Full access including workspace settings & invites |
| **Admin** | Team, recovery, CRM, dashboard (cannot replace owner) |
| **User** | Own leads, contacts, acknowledge, personal dashboard metrics |

---

## Project Structure (typical monorepo)

```
apps/
  web/                    # React Router Framework Mode app
    app/routes/           # File-based routes
    components/           # UI + feature components
packages/
  shared/
    services/             # AuthService, ContactsService, OpportunitiesService, …
    queries/              # TanStack queryOptions
    schemas/              # Zod schemas
    utils/                # session-cookie, ApiError, …
    types/
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- A [Supabase](https://supabase.com) project (free tier is fine)

### 1. Clone & install

```bash
git clone <your-repo-url>
cd leadguard
npm install
```

### 2. Environment variables

Create `apps/web/.env` (or root `.env` depending on your monorepo layout):

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Used to sign session cookies
SESSION_SECRET=replace-with-a-long-random-string

# Optional
NODE_ENV=development
```

> Use the **service role** key only on the server (loaders/actions/services). Never expose it to the browser.

### 3. Database

In the Supabase SQL Editor, run your schema script (tables: `workspaces`, `profiles`, `contacts`, `opportunities`, `activity_logs`, `notifications`, `invitations`) plus:

```sql
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS idle_period_minutes integer not null default 30;

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS last_action_at timestamptz default now();

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password text;

-- profiles.id should use default gen_random_uuid() (no auth.users FK if using custom auth)
```

For demos, keep acknowledgement windows short:

```sql
UPDATE workspaces
SET acknowledgement_window_seconds = 30,
    idle_period_minutes = 5;
```

### 4. Run locally

```bash
npm run dev
# or from the web app package:
# npm run dev --workspace=web
```

Open `http://localhost:5173` (or the port Vite prints).

---

## Deploy

### Option A — Vercel (recommended for React Router Framework Mode)

1. Push the repo to GitHub/GitLab.
2. Import the project in [Vercel](https://vercel.com).
3. Set **Root Directory** to the web app if needed (`apps/web`).
4. Add the same environment variables as local.
5. Build command (adjust to your package scripts):

```bash
npm run build
```

6. Deploy. Vercel runs the React Router server build for loaders/actions.

### Option B — Node host (Railway, Render, Fly.io, VPS)

1. Build:

```bash
npm run build
```

2. Start the production server (React Router / Vite Node server — use the command from your `package.json`, often):

```bash
npm run start
```

3. Set env vars on the host.
4. Point the process at `PORT` provided by the platform.

### Supabase

- No extra deploy step for the DB — production uses the same Supabase project or a separate prod project.
- Restrict CORS / site URL as needed.
- Rotate `SESSION_SECRET` and service role keys for production.

### Post-deploy checklist

- [ ] Signup creates workspace + owner  
- [ ] Public form on homepage creates a lead  
- [ ] Login cookie works over HTTPS (`secure` cookies in production)  
- [ ] Recovery Queue visible to Owner/Admin  
- [ ] Invite link `/invite/:token` works on the production domain  

---

## Demo Script (for judges)

1. **Signup** → new workspace + owner  
2. **Homepage public form** → submit an inquiry  
3. Open **Opportunities** → lead appears, assigned, countdown active  
4. Do **not** acknowledge; wait for the window (30–60s)  
5. Open **Recovery Queue** → lead shows as **Overdue**  
6. Click **Run Escalation Check** → lead forwards to another Available user, escalation count increases  
7. Escalate again → **Multi-escalated** reason  
8. **Re-assign** or **Acknowledge** from Recovery  
9. **Dashboard** reflects recovery count, escalations, team availability  

Optional: invite a teammate via **Team → Invite**, open invite link, set password, join as User.

---

## Auth Model (important)

LeadGuard does **not** use Supabase Auth for end users.

- Passwords are hashed with **bcrypt** and stored on `profiles.password`
- Sessions are **signed HTTP-only cookies** (`leadguard_session`)
- Shared package stays framework-agnostic (`cookie` + HMAC), app sets `Set-Cookie` from loaders/actions

---

## Out of Scope (intentionally reduced for delivery)

Per competition time constraints, the following from the full problem vision are deferred:

- Real Twilio WhatsApp/SMS webhooks  
- Stripe payments + webhooks  
- Google Calendar OAuth  
- Full custom field / custom pipeline builders  
- Complex fine-grained permission matrices  
- LIVE PREVIEW OF ESCALATION 

The **core problem** — accountable ownership, acknowledgement windows, escalation, and recovery — is fully implemented.

---

## License

Private / competition submission — all rights reserved by the team unless otherwise stated.

---

## Team

Built for the **NASSCOM / National University of Computer and Emerging Sciences** web development competition.

**Product name:** LeadGuard  
**Tagline:** Every lead gets an owner. No exceptions.