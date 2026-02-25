# Recipex Web (Next.js Frontend)

## Install

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

## Backend dependency

This app is frontend-only and calls `recipex-api`.

- Set `NEXT_PUBLIC_API_URL` and `RECIPEX_API_URL` in `.env.local`.
- Local default: `http://localhost:4000`.

## Required APIs and Services

- `recipex-api` service URL
- Supabase project (URL + anon key for auth flows)

## Key pages

- `/scan`
- `/discover`
- `/recipe/[id]`
- `/auth`

## Deploy

```bash
npx vercel --prod
```

Then set `NEXT_PUBLIC_API_URL` and `RECIPEX_API_URL` in Vercel project settings.
