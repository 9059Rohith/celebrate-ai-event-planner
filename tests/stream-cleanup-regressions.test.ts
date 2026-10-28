import { expect, it, vi } from "vitest";
import { consumeSSE } from "@/lib/client/network";

it("cancels the source when a malformed event cannot be consumed", async () => {
  const cancel = vi.fn();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("data: {invalid}\n\n"));
    },
    cancel,
  });
  await expect(consumeSSE(new Response(stream), () => {})).rejects.toThrow();
  expect(cancel).toHaveBeenCalledOnce();
  expect(stream.locked).toBe(false);
});

it("cancels a blocked read immediately on abort", async () => {
  const cancel = vi.fn();
  const stream = new ReadableStream<Uint8Array>({ cancel });
  const controller = new AbortController();
  const consume = consumeSSE(new Response(stream), () => {}, controller.signal);
  controller.abort();
  await expect(consume).resolves.toBeUndefined();
  expect(cancel).toHaveBeenCalledOnce();
  expect(stream.locked).toBe(false);
}, 1000);
