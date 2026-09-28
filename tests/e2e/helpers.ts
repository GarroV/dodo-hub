import type { Page } from '@playwright/test';
import { buildRoadmapFixture } from '../fixtures/roadmap';

/** Выдача Swarm перехватывается: сайт ходит на боевой адрес, отвечает фикстура. */
export const ROADMAP_ROUTE = '**/functions/v1/swarm-api/public/roadmap/**';

export async function serveFixture(page: Page): Promise<void> {
  await page.route(ROADMAP_ROUTE, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(buildRoadmapFixture(new Date())),
    }),
  );
}

export type Outage = 'network' | 'http-500' | 'http-404' | 'bad-json' | 'contract';

export async function serveOutage(page: Page, kind: Outage): Promise<void> {
  await page.route(ROADMAP_ROUTE, (route) => {
    switch (kind) {
      case 'network':
        return route.abort('connectionrefused');
      case 'http-500':
        return route.fulfill({ status: 500, body: 'boom' });
      case 'http-404':
        return route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"not_found"}' });
      case 'bad-json':
        return route.fulfill({ status: 200, contentType: 'application/json', body: '<html>' });
      case 'contract':
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'access-control-allow-origin': '*' },
          body: JSON.stringify({ projects: [{ id: 'x', items: [{ title: 1, state: 'weird' }] }] }),
        });
    }
  });
}
