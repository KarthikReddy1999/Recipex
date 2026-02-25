# Parallel Build Checklist (Web Only)

## You can do now (external setup)

1. Supabase setup
- Create project
- Enable Email + Google auth
- Run SQL: `recipex-web/supabase/schema.sql`

2. Groq setup
- Create API key
- Check free-tier limits

3. Cloudinary setup
- Create account
- Copy cloud name, key, secret

4. Deploy web
- Push `recipex-web` to GitHub
- Import into Vercel
- Add env vars from `.env.local.example`

5. Deploy API
- Push `recipex-api` to GitHub
- Deploy on Render
- Add env vars from `.env.example`

## Run locally in two terminals

### Terminal 1 (API)
```bash
cd recipex-api
npm install
cp .env.example .env
npm run dev
```

### Terminal 2 (Web)
```bash
cd recipex-web
npm install
cp .env.local.example .env.local
npm run dev
```

## First smoke test

1. Open web `/scan`, upload ingredient image.
2. Confirm `POST /api/analyze` returns matched recipes.
3. Open recipe details from scan and discover.
4. Save recipe to My Recipes after signing in.
