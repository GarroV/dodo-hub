// Фикстура выдачи Swarm по договору docs/roadmap-contract.md. Даты считаются
// от «сейчас», чтобы окно «выкачено за 30 дней» не протухало со временем.
// Заголовки — примеры для dev и e2e, на прод не попадают.

export const IDS = {
  decimus: '0b0255cc-b72d-454b-958d-ddbefde73330',
  meridius: 'e39c1244-022c-470e-bfe6-6eeb1393d7dc',
  maximus: 'bf4ac028-3fd8-4908-8028-1e85c626040e',
} as const;

const day = 24 * 60 * 60 * 1000;
const ymd = (now: Date, offsetDays: number) =>
  new Date(now.getTime() + offsetDays * day).toISOString().slice(0, 10);

export const FIXTURE_TITLES = {
  decimusInProgress: 'Пример: веб с аналитикой по сети',
  decimusPlanned: 'Пример: уведомления по срокам проверок',
  decimusShipped: 'Пример: переезд базы проверок в облако',
  decimusShippedOld: 'Пример: выкачено давно, за окном 30 дней',
  meridiusInProgress: 'Пример: печать QR-наклеек для станций',
  maximusPlanned: 'Пример: сравнение P&L с прошлым месяцем',
} as const;

export function buildRoadmapFixture(now: Date) {
  return {
    board: 'Vibe Coding',
    generated_at: now.toISOString(),
    projects: [
      {
        id: IDS.decimus,
        name: 'DECIMUS - Audit Management System',
        items: [
          { title: FIXTURE_TITLES.decimusInProgress, state: 'in_progress', due: ymd(now, 8), shipped_at: null },
          { title: FIXTURE_TITLES.decimusPlanned, state: 'planned', due: ymd(now, 14), shipped_at: null },
          { title: FIXTURE_TITLES.decimusShipped, state: 'shipped', due: null, shipped_at: ymd(now, -1) },
          { title: FIXTURE_TITLES.decimusShippedOld, state: 'shipped', due: null, shipped_at: ymd(now, -45) },
        ],
      },
      {
        id: IDS.meridius,
        name: 'MERIDIUS',
        items: [
          { title: FIXTURE_TITLES.meridiusInProgress, state: 'in_progress', due: null, shipped_at: null },
        ],
      },
      {
        id: IDS.maximus,
        name: 'MAXIMUS',
        items: [{ title: FIXTURE_TITLES.maximusPlanned, state: 'planned', due: null, shipped_at: null }],
      },
    ],
  };
}
