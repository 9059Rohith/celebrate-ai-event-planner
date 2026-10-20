"use client";
import { useEffect, useState } from "react";
import { useUIStore } from "@/lib/store/ui";

export function ClientRuntime() {
  const theme = useUIStore((s) => s.theme);
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      document.documentElement.classList.toggle(
        "dark",
        theme === "dark" || (theme === "system" && media.matches),
      );
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  useEffect(() => {
    const storage = () =>
      setError(
        "Device storage is full or unavailable. Your changes are in memory; export JSON to keep a backup.",
      );
    const online = () => setOffline(!navigator.onLine);
    online();
    window.addEventListener("celebrate-storage-error", storage);
    window.addEventListener("online", online);
    window.addEventListener("offline", online);
    const workerTimer = setTimeout(() => {
      if ("serviceWorker" in navigator && process.env.NODE_ENV === "production")
        void navigator.serviceWorker.register("/sw.js").catch(() => {});
    }, 5000);
    return () => {
      clearTimeout(workerTimer);
      window.removeEventListener("celebrate-storage-error", storage);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", online);
    };
  }, []);
  return (
    <>
      {offline && (
        <div role="status" className="global-notice">
          You’re offline. Saved plans and smart templates still work. AI
          requests will resume when you reconnect.
        </div>
      )}
      {error && (
        <div role="alert" className="global-notice">
          {error}
          <button
            aria-label="Dismiss storage notice"
            onClick={() => setError("")}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
