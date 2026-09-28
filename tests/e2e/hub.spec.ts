import { expect, test } from '@playwright/test';
import { FIXTURE_TITLES } from '../fixtures/roadmap';
import { ru } from '../../src/i18n/ru';
import { en } from '../../src/i18n/en';
import { serveFixture, serveOutage, type Outage } from './helpers';

const PROJECTS = ['decimus', 'meridius', 'maximus', 'construction-bot'];

test.describe('с фикстурой плана', () => {
  test.beforeEach(async ({ page }) => {
    await serveFixture(page);
  });

  test('главная рендерит 4 плитки', async ({ page }) => {
    const problems: string[] = [];
    page.on('pageerror', (e) => problems.push(e.message));
    page.on('console', (m) => m.type() === 'error' && problems.push(m.text()));
    await page.goto('./');
    const tiles = page.locator('a.tile');
    await expect(tiles).toHaveCount(4);
    for (const slug of PROJECTS) await expect(page.locator(`#tile-${slug}`)).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await expect(page.locator('[data-roadmap="all"]')).toHaveAttribute('data-state', 'ready');
    // Ни ошибок скрипта, ни нарушений CSP.
    expect(problems).toEqual([]);
  });

  test('карточка открывается, показывает ссылку и закрывается', async ({ page }) => {
    await page.goto('./');
    await page.locator('#tile-decimus').click();
    const card = page.locator('#card-decimus');
    await expect(card).toBeVisible();
    await expect(card.getByRole('heading', { name: 'Decimus', level: 2 })).toBeVisible();
    await expect(card.locator('[data-link]')).toHaveText('https://decimus.95-111-249-216.sslip.io');
    await expect(card.getByRole('link', { name: ru.open + ' админку' })).toHaveAttribute(
      'href',
      'https://decimus.95-111-249-216.sslip.io',
    );
    await expect(page).toHaveURL(/#decimus$/);
    await page.keyboard.press('Escape');
    await expect(card).toBeHidden();
    await expect(page).not.toHaveURL(/#decimus/);
  });

  test('прямая ссылка на карточку открывает её', async ({ page }) => {
    await page.goto('./#meridius');
    await expect(page.locator('#card-meridius')).toBeVisible();
    await expect(page.locator('#card-meridius [data-link]')).toHaveText('https://meridius.95-111-249-216.sslip.io');
  });

  test('факт без источника показан как «уточняется»', async ({ page }) => {
    await page.goto('./#construction-bot');
    const card = page.locator('#card-construction-bot');
    await expect(card.locator('[data-pending]').first()).toHaveText(ru.pending);
    await expect(card).toContainText(ru.planNone);
  });

  test('RU/EN переключается', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    await expect(page.locator('h1')).toContainText(ru.heroTitle);
    await expect(page.getByRole('link', { name: ru.langName })).toHaveAttribute('aria-current', 'page');

    await page.getByRole('link', { name: en.langName }).click();
    await expect(page).toHaveURL(/\/dodo-hub\/en\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('h1')).toContainText(en.heroTitle);
    await expect(page.locator('#tile-decimus')).toContainText(en.status.build);
    await page.locator('#tile-decimus').click();
    await expect(page.locator('#card-decimus')).toContainText(en.howToEnter);
    await expect(page.locator('#card-decimus')).toContainText('Ask the project owner');
    await page.locator('#card-decimus [data-close]').click();

    await page.getByRole('link', { name: ru.langName }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    await expect(page.locator('h1')).toContainText(ru.heroTitle);
  });

  test('лента: в работе, дальше, выкачено за 30 дней', async ({ page }) => {
    await page.goto('./');
    const feed = page.locator('[data-roadmap="all"]');
    await expect(feed).toHaveAttribute('data-state', 'ready');
    await expect(feed.locator('[data-group="inProgress"]')).toContainText(FIXTURE_TITLES.decimusInProgress);
    await expect(feed.locator('[data-group="inProgress"]')).toContainText(FIXTURE_TITLES.meridiusInProgress);
    await expect(feed.locator('[data-group="planned"]')).toContainText(FIXTURE_TITLES.maximusPlanned);
    await expect(feed.locator('[data-group="shipped"]')).toContainText(FIXTURE_TITLES.decimusShipped);
    await expect(feed).not.toContainText(FIXTURE_TITLES.decimusShippedOld);

    await page.locator('#tile-decimus').click();
    const cardPlan = page.locator('[data-roadmap="decimus"]');
    await expect(cardPlan).toContainText(FIXTURE_TITLES.decimusPlanned);
    await expect(cardPlan).not.toContainText(FIXTURE_TITLES.meridiusInProgress);
  });

  test('нет горизонтального скролла', async ({ page }) => {
    for (const width of [320, 375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('./#decimus');
      await page.locator('#card-decimus').waitFor();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `ширина ${width}`).toBeLessThanOrEqual(0);
    }
  });

  test('reduced-motion выключает анимации', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('./#decimus');
    const anim = await page
      .locator('#card-decimus .sheet')
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(anim).toBe('none');
  });

  test('клавиатура: плитка открывается Enter, фокус уходит в карточку', async ({ page }) => {
    await page.goto('./');
    await page.locator('#tile-meridius').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#card-meridius')).toBeVisible();
    const inside = await page.evaluate(() => !!document.activeElement?.closest('#card-meridius'));
    expect(inside).toBe(true);
  });
});

test.describe('эндпоинт плана недоступен', () => {
  const outages: Outage[] = ['network', 'http-500', 'http-404', 'bad-json', 'contract'];
  for (const kind of outages) {
    test(`${kind}: видно «план временно недоступен», плитки и карточки на месте`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await serveOutage(page, kind);
      await page.goto('./');
      const feed = page.locator('[data-roadmap="all"]');
      await expect(feed.locator('[data-plan-status]')).toHaveText(ru.planUnavailable);
      await expect(feed).toHaveAttribute('data-state', 'unavailable');
      await expect(page.locator('a.tile')).toHaveCount(4);

      await page.locator('#tile-decimus').click();
      await expect(page.locator('[data-roadmap="decimus"] [data-plan-status]')).toHaveText(ru.planUnavailable);
      await expect(page.locator('#card-decimus [data-link]')).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

  test('английская версия тоже честно говорит о недоступности', async ({ page }) => {
    await serveOutage(page, 'network');
    await page.goto('./en/');
    await expect(page.locator('[data-roadmap="all"] [data-plan-status]')).toHaveText(en.planUnavailable);
  });
});
