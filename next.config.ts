import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // Transforms the `@lingui/core/macro` and `@lingui/react/macro` calls into
    // runtime i18n code. Without it, `t` and `<Trans>` reach the bundle
    // untransformed and throw at render time.
    swcPlugins: [["@lingui/swc-plugin", {}]],
  },
  turbopack: {
    // The `.po` catalogs in locales/ are the source of truth; the loader
    // compiles them to message maps as they are imported. Both `npm run dev`
    // and `npm run build` use Turbopack, so this is the only rule needed — a
    // build without `--turbopack` would also want the equivalent
    // `webpack.module.rules` entry.
    rules: {
      "*.po": {
        loaders: ["@lingui/loader"],
        as: "*.js",
      },
    },
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/surveys",
        permanent: true,
      },
    ];
  }
};

export default nextConfig;
