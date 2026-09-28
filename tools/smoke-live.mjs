// Смоук живого сайта на Pages, без подмен: настоящая выдача Swarm.
//   npm run smoke:live              (по умолчанию https://garrov.github.io/dodo-hub/)
//   SMOKE_URL=http://… npm run smoke:live
// Падает, если нет 4 плиток, карточка не открывается, план ни загрузился,
// ни честно не сказал «недоступен», или в консоли есть ошибки (включая CSP).
import { chromium } from '@playwright/test';

const URL = process.env.SMOKE_URL ?? 'https://garrov.github.io/dodo-hub/';
const browser = await chromium.launch();
const page = await browser.newPage();
/** @type {string[]} */
const problems = [];
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  // Отказ самой выдачи браузер пишет в консоль как ошибку ресурса — это
  // ожидаемый сбой, который страница обрабатывает. Остальное — проблема.
  if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) problems.push(`console: ${m.text()}`);
});
/** @param {string} msg */
const fail = async (msg) => {
  console.error(`✗ ${msg}`);
  await browser.close();
  process.exit(1);
};

try {
  await page.goto(URL, { waitUntil: 'load' });
  const tiles = await page.locator('a.tile').count();
  if (tiles !== 4) await fail(`плиток ${tiles}, ожидалось 4`);
  console.log('✓ 4 плитки');

  await page.locator('#tile-decimus').click();
  await page.locator('#card-decimus[open] [data-link]').waitFor({ timeout: 5000 });
  console.log(`✓ карточка открывается, ссылка: ${await page.locator('#card-decimus [data-link]').textContent()}`);
  await page.keyboard.press('Escape');

  const feed = page.locator('[data-roadmap="all"]');
  await page.waitForFunction(
    () => ['ready', 'unavailable'].includes(document.querySelector('[data-roadmap="all"]')?.getAttribute('data-state') ?? ''),
    null,
    { timeout: 15000 },
  );
  const state = await feed.getAttribute('data-state');
  console.log(`✓ план: ${state} — «${(await feed.locator('[data-plan-status]').textContent())?.trim()}»`);

  await page.goto(new globalThis.URL('en/', URL).href);
  const lang = await page.locator('html').getAttribute('lang');
  if (lang !== 'en') await fail(`английская версия отдала lang=${lang}`);
  console.log('✓ /en/ открывается');

  if (problems.length) await fail(`ошибки в консоли:\n  ${problems.join('\n  ')}`);
  console.log('✓ консоль чистая');
} finally {
  await browser.close();
}
