# ReachTheSoul

**Ministry Growth Platform — AI-Powered, Human-Hearted**

Every Conversation. Every Soul. All in One Place.

## Overview

ReachTheSoul is a multi-tenant SaaS platform for churches, ministries, and Christian organizations to manage outreach conversations, counseling, and follow-up across digital channels — powered by AI with human on-demand.

## Tech Stack

- **Frontend:** Next.js 15 + React 19 + TypeScript + Tailwind CSS 4
- **Backend:** Firebase (Firestore + Auth + Cloud Functions v2 + Storage)
- **AI:** OpenAI / Anthropic (configurable per organization)
- **Channels:** WhatsApp (Meta + Fonnte), Instagram, Facebook, YouTube, Website
- **State:** Zustand
- **Deploy:** Vercel (frontend) + Firebase (functions)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
app/              → Next.js pages & API routes
components/       → React components
functions/        → Firebase Cloud Functions (webhooks, triggers)
hooks/            → Custom React hooks
lib/              → Firebase config, Firestore services, AI engine
store/            → Zustand stores (auth, org, presence, calls)
types/            → TypeScript type definitions
```

## Multi-Tenant Architecture

Every organization (church/ministry) gets isolated data through `orgId` scoping:
- All Firestore queries filter by `orgId`
- Security rules validate org membership
- Each org has independent channel config, AI settings, and branding
- Webhook URLs are org-scoped: `?org={orgId}`

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your values.

## License

Proprietary — All rights reserved.

---

**ReachTheSoul** — *Where Every Soul Finds Care*
