# Recipex Implementation Guide (Web Only)

This workspace is now web-only:

- `recipex-web` -> Next.js frontend app (UI)
- `recipex-api` -> Express backend API

## 1) External setup

1. Create Supabase project and run SQL from `recipex-web/supabase/schema.sql`.
2. Enable Supabase auth providers you need (Email/Google).
3. Create Groq API key.
4. Create Cloudinary account and collect cloud name/key/secret.
5. Deploy `recipex-api` on Render.
6. Deploy `recipex-web` on Vercel.

## 2) Required APIs / tools

- Groq API (vision + recipe generation)
- Supabase (Postgres, Auth, RLS)
- Cloudinary (image storage)
- TheMealDB (free recipe source)
- Vercel (web frontend)
- Render (backend hosting for `recipex-api`)

## 3) Local install

If `GROQ_API_KEY` is missing, analyze falls back to demo mode.

### API

```bash
cd recipex-api
npm install
cp .env.example .env
npm run dev
```

### Web

```bash
cd recipex-web
npm install
cp .env.local.example .env.local
npm run dev
```

## 4) Environment variables

### `recipex-web/.env.local`

- `NEXT_PUBLIC_API_URL=http://localhost:4000`
- `RECIPEX_API_URL=http://localhost:4000`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### `recipex-api/.env`

- `PORT` (default 4000)
- `HOST` (default `0.0.0.0`)
- `ALLOWED_ORIGINS` (comma-separated web origins)
- `GROQ_API_KEY`
- `GROQ_TEXT_MODEL` (optional)
- `GROQ_VISION_MODEL` (optional)
- `SPOONACULAR_API_KEY` (optional)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

## 5) Current scope

Implemented:
- Web scan/discover/recipe/auth pages
- Express API: analyze, search, cuisines, recipes, detail, shopping list, account delete
- Supabase schema and RLS SQL

Pending before production:
- Rate limiting and retries
- Better observability dashboards
- Test coverage (API + UI flows)
