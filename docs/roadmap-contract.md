# Договор: публичная дорожная карта Swarm → хаб проектов Dodo

> Копия договора, по которому сайт читает план. Канон выдачи — эндпоинт в Swarm-brain (задача GarroV/Swarm-brain#562). Меняется договор — меняются `src/lib/roadmap.ts`, `tests/fixtures/roadmap.ts` и этот файл одним коммитом.

Решения владельца (28.09.2026), обязательные:
- Никаких секретов и токенов в CI или на странице сайта. Выдача публичная по замыслу: на ней только то, что сайт и так показывает.
- В Swarm нет ссылок на GitHub. Задачи Swarm сформулированы для команды.

## Эндпоинт
`GET {SUPABASE_URL}/functions/v1/swarm-api/public/roadmap/{project_id}`

- `project_id` — UUID доски или проекта Swarm. Для хаба это доска «Vibe Coding»: `d8299ea3-6a8f-4e57-bbfb-4a9b0a53aea9`, подпроекты которой — проекты хаба.
- Без авторизации. Отвечает только если на этой доске включён флаг публикации (`public_roadmap = true`). Иначе `404 {"error":"not_found"}` — одинаково для «нет такой доски» и «не опубликована», чтобы не раскрывать, что существует.
- Только GET/OPTIONS. CORS: `Access-Control-Allow-Origin: *`. `Cache-Control: public, max-age=300`.
- Никогда не отдавать: описания, комментарии, исполнителей, telegram_id, страны, метки, id задач, внутренние поля.

## Ответ 200
```json
{
  "board": "Vibe Coding",
  "generated_at": "2026-09-28T14:00:00Z",
  "projects": [
    {
      "id": "0b0255cc-b72d-454b-958d-ddbefde73330",
      "name": "DECIMUS - Audit Management System",
      "items": [
        { "title": "Веб с аналитикой по сети", "state": "in_progress", "due": "2026-10-06", "shipped_at": null },
        { "title": "Уведомления по срокам проверок и экшн-планов", "state": "planned", "due": "2026-10-06", "shipped_at": null },
        { "title": "Переезд базы проверок в облако", "state": "shipped", "due": null, "shipped_at": "2026-09-27" }
      ]
    }
  ]
}
```
- `projects` — прямые подпроекты опубликованной доски (и сама доска, если у неё есть свои задачи). Порядок — как на доске.
- `state`: `backlog`/`open` → `planned`; `in_progress` → `in_progress`; `done` → `shipped`, но только если задача закрыта за последние 30 дней. `cancelled` не отдаются никогда.
- Задача с флагом `hidden_from_hub = true` не отдаётся.
- `due`, `shipped_at` — дата `YYYY-MM-DD` или `null`.
- Порядок в `items`: in_progress, потом planned по сроку (без срока — в конец), потом shipped по дате, новые сверху.

## Управление флагами
- `public_roadmap` (у проекта/доски) и `hidden_from_hub` (у задачи) — колонки со значением по умолчанию `false`.
- В MCP: `update_task` принимает `hidden_from_hub`. Флаг доски на первом этапе ставится миграцией для «Vibe Coding». Переключатель в вебе — отдельная задача.
