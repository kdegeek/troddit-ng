import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { FiDownload, FiWifiOff } from "react-icons/fi";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function PwaStatus() {
  const router = useRouter();
  const [online, setOnline] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(
    null,
  );
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [message, setMessage] = useState("");
  const [storage, setStorage] = useState("");
  useEffect(() => {
    let disposed = false;
    const cleanup: (() => void)[] = [];
    const syncOnline = () => setOnline(navigator.onLine);
    const captureInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    const installed = () => {
      setStandalone(true);
      setInstallPrompt(null);
    };
    syncOnline();
    setStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
    );
    window.addEventListener("online", syncOnline);
    window.addEventListener("offline", syncOnline);
    window.addEventListener("beforeinstallprompt", captureInstall);
    window.addEventListener("appinstalled", installed);
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.ready.then((registration) => {
        if (disposed) return;
        if (registration.waiting) setWaiting(registration.waiting);
        const updateFound = () => {
          const worker = registration.installing;
          const stateChange = () => {
            if (
              worker?.state === "installed" &&
              navigator.serviceWorker.controller
            )
              setWaiting(worker);
          };
          worker?.addEventListener("statechange", stateChange);
          cleanup.push(() =>
            worker?.removeEventListener("statechange", stateChange),
          );
        };
        registration.addEventListener("updatefound", updateFound);
        if (registration.installing) updateFound();
        cleanup.push(() =>
          registration.removeEventListener("updatefound", updateFound),
        );
      });
    navigator.storage
      ?.estimate?.()
      .then((estimate) => {
        if (!disposed)
          setStorage(
            `${((estimate.usage ?? 0) / 1024 / 1024).toFixed(1)} MB used on this device`,
          );
      })
      .catch(() => {});
    return () => {
      disposed = true;
      window.removeEventListener("online", syncOnline);
      window.removeEventListener("offline", syncOnline);
      window.removeEventListener("beforeinstallprompt", captureInstall);
      window.removeEventListener("appinstalled", installed);
      cleanup.forEach((remove) => remove());
    };
  }, []);
  const activate = () => {
    if (
      !window.confirm(
        "Reload to update Troddit? Saved drafts and preferences will be kept. Your current reading view will reload.",
      )
    )
      return;
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => location.reload(),
      { once: true },
    );
    waiting?.postMessage({ type: "SKIP_WAITING" });
  };
  const install = async () => {
    if (!installPrompt) {
      setMessage(
        "In Safari on iPhone or iPad, choose Share → Add to Home Screen. In a supported desktop browser, use the install option in the address bar or browser menu.",
      );
      return;
    }
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
    } catch {
      setMessage("Use your browser’s menu to install Troddit.");
    }
  };
  const clearAssets = async () => {
    if (
      !("caches" in window) ||
      !window.confirm(
        "Clear downloaded app assets? Offline launch may be unavailable until your next online visit. Drafts and preferences will be kept.",
      )
    )
      return;
    try {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter(
            (name) =>
              name.startsWith("troddit-static") ||
              (name.includes("precache") && name.includes("troddit")),
          )
          .map((name) => caches.delete(name)),
      );
      setMessage("App assets cleared. Your drafts and preferences were kept.");
    } catch {
      setMessage("Couldn’t clear app assets in this browser.");
    }
  };
  return (
    <>
      {(!online || waiting) && (
        <aside className="pwa-banner" role="status">
          {!online ? (
            <>
              <FiWifiOff />
              <span>
                You’re offline. Your local preferences and drafts are safe.
              </span>
            </>
          ) : (
            <>
              <span>A fresh version of Troddit is ready.</span>
              <button className="primary-button" onClick={activate}>
                Update
              </button>
            </>
          )}
        </aside>
      )}
      {router.pathname === "/settings" && (
        <section className="pwa-settings">
          <h2>At home on your device</h2>
          <p>
            Install Troddit for a dedicated window and a place on your home
            screen. Your settings, collections, and comment drafts stay on this
            device.
          </p>
          <div className="pwa-settings-actions">
            {!standalone && (
              <button className="primary-button" onClick={install}>
                <FiDownload className="mr-2" />
                Install Troddit
              </button>
            )}
            <button className="settings-action" onClick={clearAssets}>
              Clear offline assets
            </button>
            {waiting && (
              <button className="settings-action" onClick={activate}>
                Update now
              </button>
            )}
          </div>
          {storage && <p>{storage}</p>}
          {message && <p role="status">{message}</p>}
        </section>
      )}
    </>
  );
}
