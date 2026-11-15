"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, isLocale } from "./locales";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

/**
 * Records the reader's language choice. Not `httpOnly`: nothing here is
 * sensitive, and a client-side read is useful. An unknown value is ignored
 * rather than stored, so a hand-edited cookie cannot knock the app onto a
 * locale it has no catalog for.
 */
export async function setLocale(locale: string): Promise<void> {
  if (!isLocale(locale)) return;

  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR_IN_SECONDS,
    sameSite: "lax",
  });
}
