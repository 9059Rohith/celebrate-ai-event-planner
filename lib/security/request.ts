import { rateLimit } from "./rateLimit";
const MAX_REQUEST_BYTES = 32 * 1024;
export class RequestError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function checkedBody(request: Request): Promise<unknown> {
  request.signal.throwIfAborted();
  const origin = request.headers.get("origin");
  if (
    (origin && origin !== new URL(request.url).origin) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new RequestError(403, "Origin not allowed");
  if (!(await rateLimit(request)))
    throw new RequestError(429, "Too many requests. Please wait a minute.");
  if (Number(request.headers.get("content-length") || 0) > MAX_REQUEST_BYTES)
    throw new RequestError(413, "Request too large");
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError(400, "Missing body");
  // Cancellation unblocks pending reads immediately. Source cleanup may fail or
  // never settle, so it must not delay the response or replace its original error.
  const cancel = (reason: unknown) => {
    void reader.cancel(reason).catch(() => undefined);
  };
  const onAbort = () => cancel(request.signal.reason);
  request.signal.addEventListener("abort", onAbort, { once: true });
  if (request.signal.aborted) onAbort();
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      request.signal.throwIfAborted();
      const { done, value } = await reader.read();
      request.signal.throwIfAborted();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_REQUEST_BYTES) {
        const error = new RequestError(413, "Request too large");
        cancel(error);
        throw error;
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return JSON.parse(new TextDecoder().decode(bytes));
  } finally {
    request.signal.removeEventListener("abort", onAbort);
    reader.releaseLock();
  }
}
export function apiError(error: unknown) {
  const status = error instanceof RequestError ? error.status : 400;
  return Response.json(
    {
      error:
        error instanceof RequestError
          ? error.message
          : "Please check your event details and try again.",
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...(status === 429 ? { "Retry-After": "60" } : {}),
      },
    },
  );
}
