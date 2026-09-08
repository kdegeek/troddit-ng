import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { FiDownload, FiWifiOff } from "react-icons/fi";
import usePwaViewport from "../hooks/usePwaViewport";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function PwaStatus() {
  usePwaViewport();
  const router = useRouter();
  const [online, setOnline] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(
    null,
  );
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [message, setMessage] = useState("");
  const [storage, setStorage] = useState("");
  const [checking, setChecking] = useState(false);
  const [persistent, setPersistent] = useState<boolean | null>(null);
  useEffect(() => {
    navigator.storage
      ?.persisted?.()
      .then(setPersistent)
      .catch(() => {});
  }, []);
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
      navigator.serviceWorker.ready
        .then((registration) => {
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
        })
        .catch(() => {});
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
        "On iPhone or iPad, open Troddit in Safari, then Share (sometimes inside More …) → Add to Home Screen. Leave Open as Web App enabled if offered, then tap Add. Launch from the new icon. Other browsers may offer installation in their menu.",
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
  const checkUpdates = async () => {
    setChecking(true);
    try {
      if (!navigator.onLine) throw new Error("offline");
      const registration = await navigator.serviceWorker?.getRegistration();
      if (!registration) {
        setMessage(
          "Offline support is not active. Visit over HTTPS and reload; private browsing or browser policy may prevent installation.",
        );
        return;
      }
      await registration.update();
      if (registration.waiting) setWaiting(registration.waiting);
      setMessage(
        registration.waiting
          ? "An update is ready. Choose Update now when you are ready to reload."
          : registration.installing
            ? "An update is downloading. You will be notified when it is ready."
            : "Update check complete. No waiting update was found.",
      );
    } catch {
      setMessage(
        "Couldn’t check for updates. Check your connection and try again.",
      );
    } finally {
      setChecking(false);
    }
  };
  const protectStorage = async () => {
    try {
      const granted = await navigator.storage?.persist?.();
      setPersistent(Boolean(granted));
      setMessage(
        granted
          ? "Persistent storage granted. Clearing website data still removes local data; keep preference backups."
          : "This browser did not grant persistent storage. Install to the Home Screen and keep preference backups. Troddit cannot prevent browser eviction.",
      );
    } catch {
      setMessage(
        "Storage protection is unavailable in this browser. Keep preference backups.",
      );
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
                You’re offline. Reddit content requires a connection; saved
                local data stays on this device unless cleared by the browser.
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
            <button
              className="settings-action"
              onClick={checkUpdates}
              disabled={checking || !online}
            >
              {checking ? "Checking…" : "Check for updates"}
            </button>
            {persistent !== null && !persistent && (
              <button className="settings-action" onClick={protectStorage}>
                Protect local storage
              </button>
            )}
            {waiting && (
              <button className="settings-action" onClick={activate}>
                Update now
              </button>
            )}
          </div>
          {storage && <p>{storage}</p>}
          <p>
            {standalone
              ? "Running as an installed app. "
              : "Running in a browser. "}
            {persistent
              ? "Persistent storage is enabled. "
              : "Browser storage may be evicted. "}
            Use Data → Export preferences for a backup. Bookmarks and drafts are
            not included in that backup.
          </p>
          {message && <p role="status">{message}</p>}
        </section>
      )}
    </>
  );
}
