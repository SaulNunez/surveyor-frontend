"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { useLingui } from "@lingui/react/macro";
import { setLocale } from "@/libs/i18n/actions";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/libs/i18n/locales";

export function LanguageSwitcher() {
  const router = useRouter();
  const { i18n, t } = useLingui();
  const [isPending, startTransition] = useTransition();

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value;
    startTransition(async () => {
      await setLocale(next);
      // The language lives in a cookie, so the server tree has to be re-rendered
      // for server-side text to come back in the new language.
      router.refresh();
    });
  };

  return (
    <label className="flex items-center gap-1.5" title={t`Language`}>
      <Languages className="w-4 h-4 text-gray-600 dark:text-gray-300" aria-hidden />
      <span className="sr-only">{t`Language`}</span>
      <select
        value={i18n.locale}
        onChange={handleChange}
        disabled={isPending}
        className="bg-transparent text-sm text-gray-700 dark:text-gray-200 rounded-md py-1 pr-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
      >
        {LOCALES.map((locale: Locale) => (
          <option key={locale} value={locale} className="text-gray-900">
            {LOCALE_NAMES[locale]}
          </option>
        ))}
      </select>
    </label>
  );
}
