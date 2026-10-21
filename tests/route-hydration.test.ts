// @vitest-environment jsdom
import { createRequire } from "node:module";
import { expect, test } from "vitest";
import { RouteContent } from "@/components/common/RouteContent";
import type { ReactElement, ReactNode } from "react";
import type { Root } from "react-dom/client";
interface FlightChunk {
  status: "pending" | "fulfilled";
  value?: { default: ReactElement };
  then(resolve: (value: { default: ReactElement }) => void): void;
}
const require = createRequire(import.meta.url);
// Exercise Next's vendored renderer: the top-level React dependency already
// contains the replay fix and would miss this regression.
const React = require("next/dist/compiled/react") as {
  createElement: typeof import("react").createElement;
  startTransition: typeof import("react").startTransition;
  lazy: (factory: () => FlightChunk) => ReactNode;
};
const { hydrateRoot } = require("next/dist/compiled/react-dom/client") as {
  hydrateRoot: typeof import("react-dom/client").hydrateRoot;
};
test("route hydration preserves the host when a Flight lazy node resolves during replay", async () => {
  const container = document.createElement("div");
  container.innerHTML =
    '<main id="main-content"><section>Ready</section></main>';
  document.body.appendChild(container);
  const main = container.firstChild;
  const section = main!.firstChild;
  const errors: unknown[] = [];
  const chunk: FlightChunk = {
    status: "pending",
    then(resolve: (value: unknown) => void) {
      queueMicrotask(() => {
        chunk.status = "fulfilled";
        chunk.value = {
          default: React.createElement("section", null, "Ready"),
        };
        resolve(chunk.value);
      });
    },
  };
  const lazyNode = React.lazy(() => chunk);
  let root: Root | undefined;
  React.startTransition(() => {
    root = hydrateRoot(
      container,
      React.createElement(
        "main",
        { id: "main-content" },
        React.createElement(RouteContent, null, lazyNode),
      ),
      { onRecoverableError: (error: unknown) => errors.push(error) },
    );
  });
  try {
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(errors).toEqual([]);
    expect(container.firstChild).toBe(main);
    expect(container.firstChild!.firstChild).toBe(section);
  } finally {
    root?.unmount();
    container.remove();
  }
});
