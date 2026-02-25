# Recipex API

Dedicated backend for Recipex web.

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

Server runs at `http://localhost:4000`.

AI provider order:
- Groq (primary when configured)
- Demo response (fallback when Groq is unavailable)

## Endpoints

- `GET /health`
- `GET /api/cuisines`
- `GET /api/search?q=`
- `GET /api/recipes?q=`
- `GET /api/recipes/:id`
- `POST /api/analyze`
- `POST /api/shopping-list`
- `DELETE /api/account`
