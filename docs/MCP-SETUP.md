# Подключение MCP к проекту Denis120→80

Проект использует **три MCP-сервера** на уровне репозитория:  
файл [`.cursor/mcp.json`](../.cursor/mcp.json).

| Сервер | URL | Назначение |
|--------|-----|------------|
| **Supabase** | `https://mcp.supabase.com/mcp` | БД, миграции, Auth, Edge Functions |
| **Vercel** | `https://mcp.vercel.com` | Деплой, домены, env vars, логи сборок |
| **Cloudflare** | `mcp-remote` → `https://mcp.cloudflare.com/mcp` | DNS для `tuttech.net`, SSL, зона |

---

## Шаг 1. Перезагрузить Cursor

После создания `.cursor/mcp.json`:

1. **Settings → Tools & MCP** — убедиться, что серверы `supabase`, `vercel`, `cloudflare-api` видны.
2. Если дублируются с глобальными плагинами — **отключить** глобальные копии Supabase/Cloudflare в настройках (оставить проектные).
3. Перезагрузить окно: `Ctrl+Shift+P` → **Developer: Reload Window**.

---

## Шаг 2. Авторизация (OAuth)

Для каждого сервера нажать **Needs login** / **Authenticate** и пройти OAuth в браузере:

### Supabase
- Войти в аккаунт Supabase.
- Разрешить доступ MCP.
- **Важно:** в `.cursor/mcp.json` URL должен быть `https://mcp.supabase.com/mcp` **без** `project_ref`, пока проект не создан.
- После `create_project` / `list_projects` скопировать **Project Ref** (ровно 20 строчных букв, например `abcdefghijklmnop`).
- Записать в `.env`:
  ```
  SUPABASE_PROJECT_REF=abcdefghijklmnop
  ```
- Опционально сузить доступ MCP, добавив в URL:
  ```
  https://mcp.supabase.com/mcp?project_ref=abcdefghijklmnop
  ```
- Перезагрузить Cursor.

### Vercel
- Войти в аккаунт Vercel.
- Разрешить доступ к проектам и деплоям.

> Если OAuth падает с «redirect URL is invalid» — обновите Cursor до последней версии или используйте fallback:
> ```json
> "vercel": {
>   "command": "npx",
>   "args": ["-y", "mcp-remote", "https://mcp.vercel.com"]
> }
> ```

### Cloudflare (`cloudflare-api`)
- Используется **mcp-remote** (обход бага Cursor: `SSE stream: Not Found` при прямом URL).
- При первом запуске откроется OAuth в браузере — войти в аккаунт Cloudflare.
- Выдать права на **DNS** и **Zone** (для настройки записей под Vercel).

> Если снова ошибка SSE — отключите глобальный plugin-cloudflare в Settings (оставьте только `cloudflare-api` из проекта).

---

## Шаг 3. Supabase — создать проект

После авторизации попросите агента:

```
Создай Supabase-проект "denis120-80" и примени миграцию из ТЗ
```

Или вручную через MCP-инструменты:
- `list_organizations` → `create_project`
- `get_project_url`, `get_publishable_keys` → записать в `.env`

---

## Шаг 4. Vercel — деплой и домен

После инициализации Next.js:

1. Подключить репозиторий к Vercel (через MCP или dashboard).
2. Добавить env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`.
3. Добавить custom domain: `denis.tuttech.net`.

---

## Шаг 5. Cloudflare — DNS для tuttech.net

Целевая схема (поддомен на Vercel):

| Тип | Имя | Значение |
|-----|-----|----------|
| CNAME | `denis` | `cname.vercel-dns.com` |

Или корневой домен — по инструкции Vercel (A/CNAME).

Через Cloudflare MCP агент может:
- найти zone `tuttech.net`;
- создать/обновить DNS-запись;
- проверить проксирование (для Vercel обычно **DNS only**, без оранжевого облака).

---

## Проверка подключения

Попросите агента:

```
Проверь MCP: list_projects (Supabase), list deployments (Vercel), DNS zone tuttech.net (Cloudflare)
```

Все три должны ответить без ошибки авторизации.

---

## Troubleshooting

| Проблема | Решение |
|----------|---------|
| Supabase MCP без project_ref | Сначала URL без `?project_ref=`, после создания проекта — добавить 20-символьный ref |
| Дублирующиеся инструменты | Отключить глобальные plugin-supabase / plugin-cloudflare |
| Vercel OAuth fail | Fallback `mcp-remote` или обновить Cursor |
| Cloudflare `SSE stream: Not Found` | Использовать `mcp-remote` (уже в `.cursor/mcp.json` как `cloudflare-api`) |
| Cloudflare нет прав на DNS | Переавторизовать с правами Zone:Edit |
| Env не подхватывается | `.env` в корне проекта, не `.env.example` |
