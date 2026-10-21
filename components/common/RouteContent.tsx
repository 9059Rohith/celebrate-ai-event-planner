"use client";

import type { ReactNode } from "react";

// Flight children can resolve during a concurrent hydration replay. Resolve
// them on this component's fiber, not on the already-claimed <main> host fiber.
// https://github.com/react/react/issues/37584
export function RouteContent({ children }: { children: ReactNode }) {
  return children;
}
