# Denis120→80

Персональное PWA для похудения с учётом ночного графика.

## Стек

- Next.js 15 + TypeScript + Tailwind CSS
- Supabase (Auth, PostgreSQL, RLS)
- Vercel (деплой)
- Cloudflare (DNS `tuttech.net`)

## Локальный запуск

```bash
cp .env.example .env.local
npm install
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

## Скрипты

- `npm run dev` — dev-сервер
- `npm run build` — production-сборка
- `npm run test` — unit-тесты расчётов
- `npm run lint` — ESLint

## Песочница и деплой

| Ветка | Куда деплоится | URL |
|-------|----------------|-----|
| `sandbox` | Preview (песочница) | `https://denis120-80-git-sandbox-dzianis1.vercel.app` |
| `main` | Production | `https://denis.tuttech.net` |

**Workflow:**

1. Переключись на `sandbox`: `git checkout sandbox`
2. Делай доработки, коммить и пушь: `git push`
3. Vercel автоматически соберёт preview — ссылка появится в GitHub (Deployments) или в [Vercel Dashboard](https://vercel.com/dzianis1/denis120-80)
4. Когда всё ок — merge `sandbox` → `main` (через PR или локально) → production обновится сам

Локально: `npm run dev` на `http://localhost:3000`.

## MCP

См. [docs/MCP-SETUP.md](docs/MCP-SETUP.md).
