// `@lingui/loader` compiles the `.po` catalogs at build time (see the
// `turbopack` / `webpack` rules in next.config.ts), so an import of one yields
// a module of compiled messages rather than raw gettext text.
declare module "*.po" {
  import type { Messages } from "@lingui/core";
  export const messages: Messages;
}
