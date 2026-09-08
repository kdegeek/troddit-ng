const { withPlausibleProxy } = require("next-plausible");
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  cacheStartUrl: false,
  dynamicStartUrl: false,
  cacheOnFrontEndNav: false,
  skipWaiting: false,
  clientsClaim: false,
  cacheId: "troddit",
  fallbacks: {
    document: "/offline.html",
  },
  runtimeCaching: [
    // Authentication and API traffic can contain user-specific data. Always go
    // to the network and never place those responses in Cache Storage.
    {
      urlPattern: ({ url }) =>
        url.origin === self.location.origin &&
        (url.pathname.startsWith("/api/") ||
          url.pathname.startsWith("/api/auth/") ||
          url.pathname.startsWith("/_next/data/")),
      handler: "NetworkOnly",
      method: "GET",
      options: {},
    },
    {
      urlPattern: ({ request, url }) =>
        request.mode === "navigate" && url.origin === self.location.origin,
      handler: "NetworkOnly",
      options: {
        precacheFallback: { fallbackURL: "/offline.html" },
      },
    },
    {
      urlPattern: ({ request, url }) =>
        url.origin === self.location.origin &&
        ["style", "script", "font", "image"].includes(request.destination),
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "troddit-static-assets",
        expiration: { maxEntries: 150, maxAgeSeconds: 30 * 24 * 60 * 60 },
        cacheableResponse: { statuses: [200] },
      },
    },
  ],
});
module.exports = withPlausibleProxy()(
  withPWA({
    output: "standalone",
    webpack(config, { webpack }) {
      // next-pwa 5.6's injected client caches Next data independently of the
      // worker's rules. Replace it so user-specific responses never enter Cache Storage.
      config.plugins.push(new webpack.NormalModuleReplacementPlugin(
        /next-pwa[\\/]register\.js$/,
        require.resolve("./lib/register-service-worker.js")
      ));
      return config;
    },
    reactStrictMode: false, //true
    swcMinify: true,
    compiler: {
      removeConsole: process.env.NODE_ENV !== "development",
    },
    images: {
      domains: [],
    },
    experimental: {
      scrollRestoration: true,
    },
    async headers() {
      return [
        { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] },
        { source: "/manifest.json", headers: [{ key: "Cache-Control", value: "no-cache" }] },
      ];
    },
    async redirects() {
      return [
        {
          source: "/user/:path*",
          destination: "/u/:path*",
          permanent: true,
        },
        { source: "/comments/:path*", destination: "/:path*", permanent: true },
        {
          source: "/r/:sub/w/:page*",
          destination: "/r/:sub/wiki/:page*",
          permanent: true,
        },
      ];
    },
    async rewrites() {
      return [
        {
          source: "/js/script.js",
          destination: "https://plausible.io/js/plausible.js",
        },
        {
          source: "/api/event", // Or '/api/event/' if you have `trailingSlash: true` in this config
          destination: "https://plausible.io/api/event",
        },
      ];
    },
  })
);
