/**
 * The locales the app ships catalogs for.
 *
 * This list is the single source of truth: `lingui.config.ts` reads it to know
 * which catalogs to extract, the server reads it to pick a catalog per request,
 * and the language switcher reads it to build its menu. Adding a locale means
 * adding it here, running `npm run i18n:extract`, and translating the new
 * `locales/<locale>.po`.
 */
export const LOCALES = ["en", "es"] as const;

export type Locale = (typeof LOCALES)[number];

/** The locale messages are authored in, and the fallback for unknown values. */
export const DEFAULT_LOCALE: Locale = "en";

/** Cookie that carries the reader's chosen locale across requests. */
export const LOCALE_COOKIE = "locale";

/**
 * How each locale names itself. Deliberately *not* translated: a reader looking
 * for their own language needs to recognise it in a menu rendered in a language
 * they do not read.
 */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  es: "Español",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return value != null && (LOCALES as readonly string[]).includes(value);
}

/**
 * Picks the best supported locale out of an `Accept-Language` header, so a
 * first-time visitor gets their own language before they ever touch the
 * switcher. Falls back to {@link DEFAULT_LOCALE}.
 */
export function negotiateLocale(acceptLanguage: string | undefined | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith("q="))
        ?.slice(2);
      const quality = q === undefined ? 1 : Number.parseFloat(q);
      return { tag: tag.trim().toLowerCase(), quality: Number.isNaN(quality) ? 0 : quality };
    })
    .filter((entry) => entry.tag.length > 0 && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality);

  for (const { tag } of ranked) {
    // Match "es" as well as the regional "es-MX" the browser is more likely to send.
    const base = tag.split("-")[0];
    const match = LOCALES.find((locale) => locale === tag || locale === base);
    if (match) return match;
  }

  return DEFAULT_LOCALE;
}
