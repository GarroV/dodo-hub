// План из Swarm: загрузка, проверка формы и раскладка по группам.
// Договор выдачи — docs/roadmap-contract.md. Ответ чужой системы проверяется
// целиком: всё, что не совпало с договором, считается недоступным планом,
// а не пустым — пустота на экране читалась бы как «ничего не делаем».

export const ROADMAP_STATES = ['in_progress', 'planned', 'shipped'] as const;
export type RoadmapState = (typeof ROADMAP_STATES)[number];

export interface RoadmapItem {
  title: string;
  state: RoadmapState;
  due: string | null;
  shippedAt: string | null;
}

export interface RoadmapProject {
  id: string;
  items: RoadmapItem[];
}

export interface Roadmap {
  generatedAt: string | null;
  projects: RoadmapProject[];
}

export type RoadmapResult =
  | { ok: true; roadmap: Roadmap }
  | { ok: false; reason: string };

export const FETCH_TIMEOUT_MS = 8000;
export const SHIPPED_WINDOW_DAYS = 30;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TITLE = 300;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const dateOrNull = (v: unknown): string | null | undefined => {
  if (v === null || v === undefined) return null;
  return typeof v === 'string' && DATE_RE.test(v) ? v : undefined;
};

function parseItem(raw: unknown): RoadmapItem | undefined {
  if (!isRecord(raw)) return undefined;
  const { title, state } = raw;
  if (typeof title !== 'string' || title.trim() === '') return undefined;
  if (!(ROADMAP_STATES as readonly unknown[]).includes(state)) return undefined;
  const due = dateOrNull(raw.due);
  const shippedAt = dateOrNull(raw.shipped_at);
  if (due === undefined || shippedAt === undefined) return undefined;
  return { title: title.trim().slice(0, MAX_TITLE), state: state as RoadmapState, due, shippedAt };
}

/** Проверяет ответ по договору. Любое расхождение — `null`. */
export function parseRoadmap(raw: unknown): Roadmap | null {
  if (!isRecord(raw) || !Array.isArray(raw.projects)) return null;
  const projects: RoadmapProject[] = [];
  for (const p of raw.projects) {
    if (!isRecord(p) || typeof p.id !== 'string' || !Array.isArray(p.items)) return null;
    const items: RoadmapItem[] = [];
    for (const rawItem of p.items) {
      const item = parseItem(rawItem);
      if (!item) return null;
      items.push(item);
    }
    projects.push({ id: p.id.toLowerCase(), items });
  }
  const generatedAt =
    typeof raw.generated_at === 'string' && !Number.isNaN(Date.parse(raw.generated_at))
      ? raw.generated_at
      : null;
  return { generatedAt, projects };
}

/** Одна попытка с таймаутом. Никогда не бросает: ошибка — это результат. */
export async function fetchRoadmap(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<RoadmapResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
      credentials: 'omit',
      referrerPolicy: 'strict-origin-when-cross-origin',
    });
    if (!res.ok) return { ok: false, reason: `http ${res.status}` };
    const roadmap = parseRoadmap(await res.json());
    return roadmap ? { ok: true, roadmap } : { ok: false, reason: 'contract mismatch' };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.name : 'network' };
  } finally {
    clearTimeout(timer);
  }
}

const dayMs = 24 * 60 * 60 * 1000;
const toUtc = (ymd: string) => Date.parse(`${ymd}T00:00:00Z`);

export interface Grouped {
  inProgress: RoadmapItem[];
  planned: RoadmapItem[];
  shipped: RoadmapItem[];
}

/**
 * Раскладывает задачи проекта по группам. Порядок и окно 30 дней обещает
 * выдача, но сайт держит их сам: протухший кэш не должен показать старое.
 */
export function groupItems(items: readonly RoadmapItem[], now: Date, plannedLimit: number): Grouped {
  const since = now.getTime() - SHIPPED_WINDOW_DAYS * dayMs;
  const byDueAsc = (a: RoadmapItem, b: RoadmapItem) =>
    (a.due ? toUtc(a.due) : Infinity) - (b.due ? toUtc(b.due) : Infinity);
  const byShippedDesc = (a: RoadmapItem, b: RoadmapItem) =>
    toUtc(b.shippedAt ?? '1970-01-01') - toUtc(a.shippedAt ?? '1970-01-01');
  return {
    inProgress: items.filter((i) => i.state === 'in_progress'),
    planned: items.filter((i) => i.state === 'planned').toSorted(byDueAsc).slice(0, plannedLimit),
    shipped: items
      .filter((i) => i.state === 'shipped' && i.shippedAt !== null && toUtc(i.shippedAt) >= since)
      .toSorted(byShippedDesc),
  };
}
