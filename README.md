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

## MCP

См. [docs/MCP-SETUP.md](docs/MCP-SETUP.md).
