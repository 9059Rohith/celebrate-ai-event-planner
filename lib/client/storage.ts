"use client";
import type { StateStorage } from "zustand/middleware";
let lastError = "";
export function storageError() {
  return lastError;
}
export function writeLocal(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    lastError =
      "Device storage is full or unavailable. Your changes are in memory; export JSON to keep a backup.";
    if (typeof window !== "undefined")
      window.dispatchEvent(new Event("celebrate-storage-error"));
    return false;
  }
}
export const safeStorage: StateStorage = {
  getItem(key) {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    writeLocal(key, value);
  },
  removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};
