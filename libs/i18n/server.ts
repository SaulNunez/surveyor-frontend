import "server-only";

import { cookies, headers } from "next/headers";
import { setupI18n, type I18n } from "@lingui/core";
import { setI18n } from "@lingui/react/server";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  negotiateLocale,
  type Locale,
} from "./locales";

// Catalog imports are written out one per locale rather than built from a
// template string, so the bundler can see every catalog it has to include.
const catalogs: Record<Locale, () => Promise<{ messages: import("@lingui/core").Messages }>> = {
  en: () => import("@/locales/en.po"),
  es: () => import("@/locales/es.po"),
};

// One I18n instance per locale, built on first use and kept for the process.
// Requests for different locales run concurrently, so they must never share an
// instance — and an instance is never re-activated, so sharing one *per locale*
// across requests is safe.
const instances = new Map<Locale, Promise<I18n>>();

function getI18nInstance(locale: Locale): Promise<I18n> {
  let instance = instances.get(locale);
  if (!instance) {
    instance = catalogs[locale]().then(({ messages }) =>
      setupI18n({ locale, messages: { [locale]: messages } }),
    );
    instances.set(locale, instance);
  }
  return instance;
}

/**
 * The locale for the current request: the reader's cookie if they have chosen
 * one, otherwise the best match for their `Accept-Language` header.
 */
export async function getRequestLocale(): Promise<Locale> {
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(chosen)) return chosen;

  return negotiateLocale((await headers()).get("accept-language"));
}

/**
 * The catalog for the current request, for code that resolves messages itself
 * rather than rendering them — API route handlers, above all. Unlike
 * {@link initLingui} it registers nothing, because a route renders no Server
 * Components.
 */
export async function getRequestI18n(): Promise<I18n> {
  return getI18nInstance(await getRequestLocale());
}

/**
 * Makes the request's catalog available to Server Components and returns the
 * instance for imperative use (`i18n._(...)`, e.g. in `generateMetadata`).
 *
 * Lingui's server-side `Trans` and `useLingui` read the instance synchronously
 * out of a React `cache`, so **every layout and page that renders a translated
 * Server Component must await this first**. Client Components get their catalog
 * from `LinguiClientProvider` instead and need no such call.
 */
export async function initLingui(): Promise<I18n> {
  const i18n = await getI18nInstance(await getRequestLocale());
  setI18n(i18n);
  return i18n;
}

export { DEFAULT_LOCALE };
