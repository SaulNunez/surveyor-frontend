"use client";

import { useEffect, useState } from "react";
import { I18nProvider } from "@lingui/react";
import { setupI18n, type Messages } from "@lingui/core";

type Props = {
  children: React.ReactNode;
  locale: string;
  messages: Messages;
};

/**
 * Gives Client Components the active catalog. The server cannot hand over its
 * own `I18n` object — it is not serialisable — so it passes the locale and its
 * compiled messages and the browser builds an equivalent instance.
 *
 * Switching language re-renders the server tree with new props; the effect
 * below swaps the catalog in place so client-rendered text follows, rather
 * than staying on the locale the page first loaded with.
 */
export function LinguiClientProvider({ children, locale, messages }: Props) {
  const [i18n] = useState(() => setupI18n({ locale, messages: { [locale]: messages } }));

  useEffect(() => {
    if (i18n.locale !== locale) {
      i18n.loadAndActivate({ locale, messages });
    }
  }, [i18n, locale, messages]);

  return <I18nProvider i18n={i18n}>{children}</I18nProvider>;
}
