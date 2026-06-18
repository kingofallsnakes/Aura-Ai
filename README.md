# AURA AI

Open-source AI personal assistant platform for productivity, learning, and knowledge management.

## Features

- **Dashboard** — Overview of tasks, goals, reminders, and quick actions
- **AI Chat** — Multi-mode assistant (general, RAG, tasks, goals, learning, resume, email)
- **Task Manager** — CRUD with AI breakdown and daily planning
- **Notes** — Rich notes with AI summarization and pinning
- **Goals** — Progress tracking with AI reviews
- **Reminders** — Scheduled reminders with overdue tracking
- **Knowledge Base** — Upload PDF/DOCX/TXT/MD and query with RAG
- **Learning Assistant** — AI-generated study plans and roadmaps
- **Resume & Email** — AI-powered career writing tools
- **Settings** — Theme, AI mode (cloud/local/hybrid), notifications
- **Admin Dashboard** — User stats and activity logs (admin role)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, Tailwind CSS, Zustand, React Router |
| Backend | Express, TypeScript, Zod, Winston |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| AI | OpenRouter (cloud) + Ollama (local/hybrid) |

## Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- An [OpenRouter](https://openrouter.ai) API key (for cloud AI)
- Optional: [Ollama](https://ollama.ai) running locally (for local/hybrid AI)

## Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd Aura-ai
npm install
cd client && npm install
cd ../server && npm install
```

### 2. Configure Supabase

1. Create a new Supabase project
2. Run the schema in the SQL editor:

```bash
# Copy contents of supabase/schema.sql into Supabase SQL Editor and run
```

3. Enable Google OAuth in Supabase Auth settings (optional)
4. Add `http://localhost:5173/auth/callback` and `http://localhost:5173/auth/reset-password` to redirect URLs

### 3. Environment variables

Copy `.env.example` to `.env` in the project root and fill in values:

```bash
cp .env.example .env
```

Also create `client/.env`:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:5000/api
```

And `server/.env`:

```env
PORT=5000
NODE_ENV=development
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
OPENROUTER_API_KEY=your_openrouter_key
JWT_SECRET=your_random_secret
SESSION_SECRET=your_random_secret
CORS_ORIGIN=http://localhost:5173
```

### 4. Run development servers

From the project root:

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start client + server concurrently |
| `npm run build` | Build client and server for production |
| `npm start` | Start production server |
| `npm test` | Run server unit tests |
| `npm run lint` | Lint client and server |

## Project Structure

```
Aura-ai/
├── client/          # React frontend (Vite)
├── server/          # Express API (TypeScript)
├── supabase/        # Database schema
└── .env.example     # Environment template
```

## Deployment

- **Frontend**: Deploy `client/` to Vercel (see `client/vercel.json`)
- **Backend**: Deploy `server/` to Render or Railway (see `server/render.yaml`, `server/railway.toml`, `server/Dockerfile`)

Set production environment variables in your hosting provider and update `CORS_ORIGIN` and Supabase redirect URLs.

## Admin Access

To make a user an admin, update their role in Supabase:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
```

## License

Open source — see repository for license details.
