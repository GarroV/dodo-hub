// Пересъёмка скриншотов для README одной командой:
//   npm run screens
// Собирает сайт, поднимает прод-превью, подставляет фикстуру плана вместо
// выдачи Swarm и снимает экраны в docs/screens/. После съёмки обновите дату
// сверки в реестре материалов README.
import { chromium } from '@playwright/test';
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildRoadmapFixture } from '../tests/fixtures/roadmap.ts';

const ROOT = resolve(import.meta.dirname, '..');
const PORT = 4351;
const BASE = `http://localhost:${PORT}/dodo-hub/`;
const OUT = resolve(ROOT, 'docs/screens');

/** @type {{file: string, path: string, scheme: 'light' | 'dark', viewport: {width: number, height: number}, fullPage?: boolean, outage?: boolean, scrollTo?: string}[]} */
const SHOTS = [
  { file: 'home-light.png', path: '', scheme: 'light', viewport: { width: 1280, height: 800 }, fullPage: true },
  { file: 'home-dark.png', path: '', scheme: 'dark', viewport: { width: 1280, height: 800 } },
  { file: 'card-decimus.png', path: '#decimus', scheme: 'light', viewport: { width: 1280, height: 900 } },
  { file: 'home-en.png', path: 'en/', scheme: 'light', viewport: { width: 1280, height: 800 } },
  { file: 'mobile-card.png', path: '#meridius', scheme: 'dark', viewport: { width: 390, height: 844 } },
  { file: 'card-plan.png', path: '#decimus', scheme: 'light', viewport: { width: 1280, height: 900 }, scrollTo: '#card-decimus [data-roadmap]' },
  { file: 'plan-unavailable.png', path: '#decimus', scheme: 'light', viewport: { width: 1280, height: 900 }, outage: true, scrollTo: '#card-decimus [data-roadmap]' },
];

/** @param {string} url */
async function waitForServer(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* ещё не поднялся */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`превью не поднялось на ${url}`);
}

const build = spawnSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);

const server = spawn('npx', ['astro', 'preview', '--port', String(PORT), '--ignore-lock'], { cwd: ROOT, stdio: 'ignore' });
let browser;
try {
  await waitForServer(BASE);
  mkdirSync(OUT, { recursive: true });
  browser = await chromium.launch();
  for (const s of SHOTS) {
    const context = await browser.newContext({ viewport: s.viewport, deviceScaleFactor: 2, colorScheme: s.scheme });
    const page = await context.newPage();
    await page.route('**/functions/v1/swarm-api/public/roadmap/**', (route) =>
      s.outage
        ? route.abort('connectionrefused')
        : route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(buildRoadmapFixture(new Date())) }),
    );
    await page.goto(BASE + s.path);
    // План живёт только в карточках: ждём первую, она есть в разметке и при закрытой карточке.
    await page
      .locator(`[data-roadmap="decimus"][data-state="${s.outage ? 'unavailable' : 'ready'}"]`)
      .waitFor({ state: 'attached' });
    if (s.path.includes('#')) await page.locator('dialog[open] .sheet').waitFor();
    if (s.scrollTo) await page.locator(s.scrollTo).scrollIntoViewIfNeeded();
    await page.emulateMedia({ reducedMotion: 'reduce' }); // без полукадров анимации
    await page.screenshot({ path: resolve(OUT, s.file), fullPage: !!s.fullPage });
    console.log('saved', `docs/screens/${s.file}`);
    await context.close();
  }
} finally {
  await browser?.close();
  server.kill();
}
