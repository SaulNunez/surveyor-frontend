import { defineConfig } from "@lingui/cli";
import { DEFAULT_LOCALE, LOCALES } from "./libs/i18n/locales";

export default defineConfig({
  locales: [...LOCALES],
  sourceLocale: DEFAULT_LOCALE,
  fallbackLocales: {
    default: DEFAULT_LOCALE,
  },
  catalogs: [
    {
      path: "<rootDir>/locales/{locale}",
      include: ["app", "components", "libs"],
      exclude: ["**/node_modules/**", "**/.next/**"],
    },
  ],
});
