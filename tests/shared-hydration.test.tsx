// @vitest-environment jsdom
import React, { Suspense } from "react";
import { act } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot, type Root } from "react-dom/client";
import { afterEach, describe, it, expect, vi } from "vitest";
import { SharedPlan } from "@/components/planner/SharedPlan";
import { createPlan, exampleInput } from "@/lib/domain/planner";
import { encodePlan } from "@/lib/share";
vi.mock("@/components/planner/Workspace", () => ({
  Workspace: ({
    plan,
    readOnly,
  }: {
    plan: { input: { title: string } };
    readOnly: boolean;
  }) => (
    <section>
      <h1>{plan.input.title}</h1>
      <span>{readOnly ? "Read only" : "Editable"}</span>
    </section>
  ),
}));
let root: Root | undefined;
afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  history.replaceState(null, "", "/");
});
describe("shared-page hydration", () => {
  it("hydrates the server placeholder before reading a populated browser fragment", async () => {
    const plan = createPlan({
      ...exampleInput(),
      title: "Hydration regression",
    });
    history.replaceState(null, "", "/shared#" + encodePlan(plan));
    const element = (
      <Suspense fallback={<p>Loading</p>}>
        <SharedPlan />
      </Suspense>
    );
    const html = renderToString(element);
    expect(html).toContain("Opening shared celebration");
    expect(html).not.toContain("Hydration regression");
    const host = document.createElement("div");
    host.innerHTML = html;
    document.body.append(host);
    const recoverable: unknown[] = [];
    await act(async () => {
      root = hydrateRoot(host, element, {
        onRecoverableError: (error) => recoverable.push(error),
      });
    });
    expect(host.textContent).toContain("Hydration regression");
    expect(host.textContent).toContain("Read only");
    expect(recoverable).toEqual([]);
    await act(async () => {
      history.replaceState(null, "", "/shared#invalid");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(host.textContent).toContain("This shared link is invalid");
    expect(recoverable).toEqual([]);
  });
  it("hydrates an invalid fragment without a recoverable mismatch", async () => {
    history.replaceState(null, "", "/shared#invalid");
    const element = (
      <Suspense>
        <SharedPlan />
      </Suspense>
    );
    const host = document.createElement("div");
    host.innerHTML = renderToString(element);
    document.body.append(host);
    const errors: unknown[] = [];
    await act(async () => {
      root = hydrateRoot(host, element, {
        onRecoverableError: (e) => errors.push(e),
      });
    });
    expect(host.textContent).toContain("This shared link is invalid");
    expect(errors).toEqual([]);
  });
});
