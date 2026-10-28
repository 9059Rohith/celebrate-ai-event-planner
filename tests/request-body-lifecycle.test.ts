import { afterEach, expect, it, vi } from "vitest";
import { checkedBody, RequestError } from "@/lib/security/request";

vi.mock("@/lib/security/rateLimit", () => ({
  rateLimit: vi.fn(async () => true),
}));
afterEach(() => vi.restoreAllMocks());

function request(body: ReadableStream<Uint8Array>, signal?: AbortSignal) {
  return new Request("https://celebrate.test/api/ideas", {
    method: "POST",
    body,
    signal,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
}

it("releases the body reader after valid multibyte JSON", async () => {
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(new TextEncoder().encode('{"name":"庆典"}'));
      c.close();
    },
  });
  expect(await checkedBody(request(body))).toEqual({ name: "庆典" });
  expect(body.locked).toBe(false);
});

it("cancels a blocked body read on request abort without waiting for source cleanup", async () => {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const cancel = vi.fn(() => new Promise<void>(() => {}));
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
    cancel,
  });
  const abort = new AbortController();
  const result = checkedBody(request(body, abort.signal)).then(
    () => "resolved",
    (error: unknown) => error,
  );
  await vi.waitFor(() => expect(body.locked).toBe(true));
  abort.abort();
  try {
    const outcome = await Promise.race([
      result,
      new Promise((resolve) => setTimeout(() => resolve("still reading"), 100)),
    ]);
    expect(outcome).toMatchObject({ name: "AbortError" });
    expect(cancel).toHaveBeenCalledOnce();
    expect(body.locked).toBe(false);
  } finally {
    if (!cancel.mock.calls.length) controller.close();
    await result;
  }
});

it("keeps the 413 error when oversized-body cancellation rejects", async () => {
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(new Uint8Array(32769));
    },
    cancel() {
      throw new Error("transport cleanup failed");
    },
  });
  await expect(checkedBody(request(body))).rejects.toMatchObject({
    status: 413,
  });
  expect(body.locked).toBe(false);
});

it("releases the reader when its source fails", async () => {
  const error = new Error("broken transport");
  const body = new ReadableStream<Uint8Array>({
    pull(c) {
      c.error(error);
    },
  });
  await expect(checkedBody(request(body))).rejects.toBe(error);
  expect(body.locked).toBe(false);
});

it("rejects a request that was aborted before body reading", async () => {
  const abort = new AbortController();
  abort.abort();
  const req = new Request("https://celebrate.test/api/ideas", {
    method: "POST",
    body: "{}",
    signal: abort.signal,
  });
  await expect(checkedBody(req)).rejects.toMatchObject({ name: "AbortError" });
});

it("retains the declared-size boundary before reading the stream", async () => {
  const req = new Request("https://celebrate.test/api/ideas", {
    method: "POST",
    body: "{}",
    headers: { "Content-Length": "32769" },
  });
  await expect(checkedBody(req)).rejects.toBeInstanceOf(RequestError);
});
