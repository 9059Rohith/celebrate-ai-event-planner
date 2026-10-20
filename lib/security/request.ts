import { rateLimit } from "./rateLimit";
export class RequestError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function checkedBody(request: Request): Promise<unknown> {
  const origin = request.headers.get("origin");
  if (
    (origin && origin !== new URL(request.url).origin) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new RequestError(403, "Origin not allowed");
  if (!(await rateLimit(request)))
    throw new RequestError(429, "Too many requests. Please wait a minute.");
  if (Number(request.headers.get("content-length") || 0) > 32768)
    throw new RequestError(413, "Request too large");
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError(400, "Missing body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 32768) {
      await reader.cancel();
      throw new RequestError(413, "Request too large");
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
