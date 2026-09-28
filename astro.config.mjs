// @ts-check
import { defineConfig } from 'astro/config';
import { LOCALES, DEFAULT_LOCALE } from './src/i18n/locales.mjs';
// Откуда сайт тянет план в браузере: публично, без токенов (решение владельца).
import { SWARM_ORIGIN } from './src/lib/swarm.mjs';

export default defineConfig({
  site: 'https://garrov.github.io',
  base: '/dodo-hub',
  trailingSlash: 'always',
  i18n: {
    locales: [...LOCALES],
    defaultLocale: DEFAULT_LOCALE,
    routing: { prefixDefaultLocale: false },
  },
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        `connect-src 'self' ${SWARM_ORIGIN}`,
        "img-src 'self' data:",
        "base-uri 'self'",
        "form-action 'none'",
        "object-src 'none'",
      ],
    },
  },
});
