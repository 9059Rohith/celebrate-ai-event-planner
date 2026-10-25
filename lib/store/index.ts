/**
 * Plan Store — Zustand with localStorage persistence
 */
"use client";
import { migratePlans } from "@/lib/client/planStorage";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Plan } from "@/lib/schemas";

import { safeStorage } from "@/lib/client/storage";

interface PlanHistory {
  past: Plan[];
  future: Plan[];
}

interface PlanState {
  plans: Plan[];
  currentPlanId: string | null;
  history: PlanHistory;

  // Actions
  addPlan: (plan: Plan) => void;
  updatePlan: (id: string, updates: Partial<Plan>) => void;
  deletePlan: (id: string) => void;
  duplicatePlan: (id: string) => Plan | null;
  setCurrentPlan: (id: string | null) => void;
  getCurrentPlan: () => Plan | null;

  // History
  pushHistory: (plan: Plan) => void;
  undo: () => Plan | null;
  redo: () => Plan | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const usePlanStore = create<PlanState>()(
  persist(
    (set, get) => ({
      plans: [],
      currentPlanId: null,
      history: { past: [], future: [] },

      addPlan: (plan) => {
        set((state) => ({
          plans: [plan, ...state.plans],
          currentPlanId: plan.id,
          history: { past: [], future: [] },
        }));
      },

      updatePlan: (id, updates) => {
        set((state) => ({
          plans: state.plans.map((p) =>
            p.id === id
              ? {
                  ...p,
                  ...updates,
                  updatedAt: new Date().toISOString(),
                  version: p.version + 1,
                }
              : p,
          ),
        }));
      },

      deletePlan: (id) => {
        set((state) => ({
          plans: state.plans.filter((p) => p.id !== id),
          currentPlanId:
            state.currentPlanId === id ? null : state.currentPlanId,
        }));
      },

      duplicatePlan: (id) => {
        const state = get();
        const plan = state.plans.find((p) => p.id === id);
        if (!plan) return null;

        const newPlan: Plan = {
          ...JSON.parse(JSON.stringify(plan)),
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
        };
        // Ensure summary headline changes
        if (newPlan.summary) {
          newPlan.summary.headline = `${plan.summary.headline} (Copy)`;
        }

        set((state) => ({
          plans: [newPlan, ...state.plans],
        }));

        return newPlan;
      },

      setCurrentPlan: (id) =>
        set((state) => ({
          currentPlanId: id,
          history:
            state.currentPlanId === id
              ? state.history
              : { past: [], future: [] },
        })),

      getCurrentPlan: () => {
        const state = get();
        return state.plans.find((p) => p.id === state.currentPlanId) ?? null;
      },

      pushHistory: (plan) => {
        set((state) => ({
          history: {
            past: [
              ...state.history.past.slice(-19),
              JSON.parse(JSON.stringify(plan)),
            ],
            future: [],
          },
        }));
      },

      undo: () => {
        const state = get();
        if (state.history.past.length === 0) return null;

        const currentPlan = state.getCurrentPlan();
        if (!currentPlan) return null;

        const previous = state.history.past[state.history.past.length - 1];

        set({
          history: {
            past: state.history.past.slice(0, -1),
            future: [
              JSON.parse(JSON.stringify(currentPlan)),
              ...state.history.future,
            ],
          },
        });

        // Apply the previous state
        set((s) => ({
          plans: s.plans.map((p) => (p.id === previous.id ? previous : p)),
        }));

        return previous;
      },

      redo: () => {
        const state = get();
        if (state.history.future.length === 0) return null;

        const currentPlan = state.getCurrentPlan();
        if (!currentPlan) return null;

        const next = state.history.future[0];

        set({
          history: {
            past: [
              ...state.history.past,
              JSON.parse(JSON.stringify(currentPlan)),
            ],
            future: state.history.future.slice(1),
          },
        });

        set((s) => ({
          plans: s.plans.map((p) => (p.id === next.id ? next : p)),
        }));

        return next;
      },

      canUndo: () => get().history.past.length > 0,
      canRedo: () => get().history.future.length > 0,
    }),
    {
      name: "celebrate-ai-plans",
      storage: createJSONStorage(() => safeStorage),
      version: 2,
      migrate: migratePlans,
      merge: (persisted, current) => ({
        ...current,
        ...migratePlans(persisted),
      }),
      partialize: (state) => ({
        plans: state.plans,
        currentPlanId: state.currentPlanId,
      }),
    },
  ),
);

export { useUIStore } from "./ui";
