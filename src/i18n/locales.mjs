// Единственный список языков. Новый язык = строка здесь + файл словаря
// src/i18n/<код>.ts + тексты в YAML проектов (сборка упадёт, пока их нет).
export const LOCALES = /** @type {const} */ (['ru', 'en']);
export const DEFAULT_LOCALE = 'ru';
