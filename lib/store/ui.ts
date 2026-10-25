"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeStorage } from "@/lib/client/storage";
interface UIState {
  currency: "INR" | "USD" | "EUR" | "GBP";
  theme: "light" | "dark" | "system";
  activeTab: string;
  setCurrency: (currency: UIState["currency"]) => void;
  setTheme: (theme: UIState["theme"]) => void;
  setActiveTab: (tab: string) => void;
}
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
    { name: "celebrate-ai-ui", storage: createJSONStorage(() => safeStorage) },
  ),
);
