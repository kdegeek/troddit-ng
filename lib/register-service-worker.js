// Intentionally no client-side response caching. The generated worker owns
// the static-asset policy; updates are activated explicitly by PwaStatus.
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  const register = async () => {
    try {
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      // Remove caches created by the previous next-pwa registration/runtime.
      // Preferences and drafts live in localForage/localStorage, not here.
      if ("caches" in window) {
        await Promise.all(["next-data", "start-url", "apis", "others"].map((key) => caches.delete(key)));
      }
    } catch {
      // Installation is optional: online browsing must still work without it.
    }
  };
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
