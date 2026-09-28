import { DEFAULT_LOCALE, LOCALES } from './locales.mjs';
import { ru, type Dict } from './ru';
import { en } from './en';

export type Locale = (typeof LOCALES)[number];
export { LOCALES, DEFAULT_LOCALE };

const DICTS: Record<Locale, Dict> = { ru, en };

export const t = (locale: Locale): Dict => DICTS[locale];

export const isLocale = (v: unknown): v is Locale =>
  typeof v === 'string' && (LOCALES as readonly string[]).includes(v);
