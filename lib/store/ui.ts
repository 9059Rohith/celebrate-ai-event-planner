"use client";
import { create } from "zustand";
import {
  persist,
  createJSONStorage,
  type StateStorage,
} from "zustand/middleware";
interface UIState {
  currency: "INR" | "USD" | "EUR" | "GBP";
  theme: "light" | "dark" | "system";
  activeTab: string;
  setCurrency: (currency: UIState["currency"]) => void;
  setTheme: (theme: UIState["theme"]) => void;
  setActiveTab: (tab: string) => void;
}
const storage: StateStorage = {
  getItem(key) {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      if (typeof window !== "undefined") window.dispatchEvent(new Event("celebrate-storage-error"));
    }
  },
  removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};
export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      currency: "INR",
      theme: "system",
      activeTab: "overview",
      setCurrency: (currency) => set({ currency }),
      setTheme: (theme) => set({ theme }),
      setActiveTab: (activeTab) => set({ activeTab }),
    }),
    { name: "celebrate-ai-ui", storage: createJSONStorage(() => storage) },
  ),
);

