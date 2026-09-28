import { z } from 'astro/zod';
import { LOCALES } from '../i18n/locales.mjs';

/** Текст на каждом языке из LOCALES. Новый язык без текстов роняет сборку. */
export const localized = z.object(
  Object.fromEntries(LOCALES.map((l) => [l, z.string().trim().min(1)])) as Record<
    (typeof LOCALES)[number],
    z.ZodString
  >,
);

/**
 * Явная дыра в данных: факта нет в источниках. Сайт показывает «уточняется»,
 * а `todo` — вопрос владельцу (он же уходит в беклог). Пустое поле вместо
 * `todo` сборку роняет: молча пропустить факт нельзя.
 */
export const todo = z.object({ todo: z.string().trim().min(1) }).strict();

export const orTodo = <T extends z.ZodType>(schema: T) => z.union([schema, todo]);

export const STATUSES = ['live', 'pilot', 'build'] as const;
export const SIZES = ['lg', 'sm'] as const;
export const GLYPHS = ['audit', 'qr', 'chart', 'building'] as const;
export const TINTS = ['orange', 'blue', 'green', 'violet'] as const;

const httpsUrl = z.url({ protocol: /^https$/ });

export const projectSchema = z
  .object({
    order: z.number().int().nonnegative(),
    name: z.string().trim().min(1),
    repo: z.string().regex(/^GarroV\/[\w.-]+$/),
    status: z.enum(STATUSES),
    size: z.enum(SIZES),
    glyph: z.enum(GLYPHS),
    tint: z.enum(TINTS),
    /** Подпроект доски «Vibe Coding» в Swarm; null — у проекта нет плана. */
    swarm_project_id: z.uuid().nullable(),
    owner: z.string().trim().min(1),
    kind: localized,
    summary: localized,
    audience: orTodo(localized),
    runs_on: orTodo(localized),
    link: orTodo(z.object({ url: httpsUrl, label: localized.optional() }).strict()),
    login_steps: orTodo(z.array(localized).min(1)),
    demo: orTodo(
      z.union([
        z.object({ url: httpsUrl, note: localized.optional() }).strict(),
        z.literal('none'),
      ]),
    ),
    /** Откуда взяты факты: файлы в репозитории проекта или карта хозяйства. */
    sources: z.array(z.string().trim().min(1)).min(1),
  })
  .strict();

export type Project = z.infer<typeof projectSchema>;
export type Todo = z.infer<typeof todo>;
export const isTodo = (v: unknown): v is Todo =>
  typeof v === 'object' && v !== null && 'todo' in v;
