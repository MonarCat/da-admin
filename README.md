# DA Admin

Vehicle fleet administration dashboard powered by React, Supabase, and Netlify Functions.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- A [Supabase](https://supabase.com/) project
- (For deployment) A [Netlify](https://netlify.com/) site

## Local Development Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example environment file and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Open `.env` and replace the placeholder values with your real credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

You can find both values in your **Supabase Dashboard → Project Settings → API**.

> **Note:** Never commit `.env` to version control. It is already listed in `.gitignore`.

### 3. Run the development server

```bash
npm run dev
```

The app will be available at <http://localhost:3001>.

## Deployment (Netlify)

The Netlify Functions (`/api/vehicles`, `/api/command`, `/api/sos`, `/api/telemetry`) use a service-role key that must **never** be exposed to the browser. Set these in the **Netlify Dashboard → Site → Environment variables**:

| Variable                  | Description                                      |
|---------------------------|--------------------------------------------------|
| `SUPABASE_URL`            | Your Supabase project URL                        |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key (server-side only — keep secret) |

The frontend variables (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`) should also be added there for production builds.

## Available Scripts

| Command           | Description                          |
|-------------------|--------------------------------------|
| `npm run dev`     | Start the dev server on port 3001    |
| `npm run build`   | Build for production                 |
| `npm run preview` | Preview the production build locally |

## Database

SQL migrations are located in `supabase/migrations/`. Apply them via the [Supabase CLI](https://supabase.com/docs/guides/cli) or the Supabase Dashboard SQL editor.
