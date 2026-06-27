# FIFA 2026 World Cup Content Dashboard

This is a production-ready Next.js application that automates content generation for the ongoing 2026 FIFA World Cup.

## Core Tech Stack
- **Framework**: Next.js 14+ (App Router)
- **Database & ORM**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **AI Engine**: Groq API (Llama-3-70b-8192)
- **Posting Targets**: YouTube Data API v3 (Shorts & Community tab)
- **Scheduling**: Vercel Cron Jobs (hourly)

## Folder & Architecture Layout
The application files are structured as follows:
- `prisma/schema.prisma` - DB Models
- `lib/prisma.ts` - DB Client singleton
- `lib/groq.ts` - Groq SDK Llama-3-70b generation helper
- `lib/youtube.ts` - YouTube Data API helper (Shorts upload and Community post Simulation)
- `components/Sidebar.tsx` - Admin layout Sidebar navigation
- `components/OverviewActions.tsx` - Overview control buttons
- `components/LoginButton.tsx` - Login trigger handles Google Sign-In and local Sandbox developer mode
- `app/layout.tsx` & `app/page.tsx` - Home login page
- `app/dashboard/` - Sub-pages: Overview, Content Pipeline, YouTube Scheduler, Settings
- `app/api/` - Endpoint handlers: Auth config, News Ingest, AI generate, Settings sync, Cron queue worker
- `vercel.json` - Serverless Scheduling cron configuration
- `.env.example` - Environment variable parameters template

## Local Setup Quickstart
1. Install dependencies:
   ```bash
   npm install
   ```
2. Setup environment variables:
   ```bash
   cp .env.example .env
   ```
3. Initialize the database schema:
   ```bash
   npx prisma db push
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

For a comprehensive guide on configuring Google Cloud OAuth credentials and deploying to Vercel, check the generated `walkthrough.md` in the system logs or review the repository configuration notes.
