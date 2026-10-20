export function sseResponse(
  request: Request,
  run: (
    send: (event: string, data: unknown) => void,
    signal: AbortSignal,
  ) => Promise<void>,
): Response {
  const abort = new AbortController();
  const onAbort = () => abort.abort();
  request.signal.addEventListener("abort", onAbort, { once: true });
  if (request.signal.aborted) abort.abort();
  let cancelled = false;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (!cancelled && !abort.signal.aborted)
          controller.enqueue(
            encoder.encode(
              `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
            ),
          );
      };
      try {
        await run(send, abort.signal);
      } catch {
        send("error", {
          message: "Unable to complete the request. Please retry.",
        });
      } finally {
        request.signal.removeEventListener("abort", onAbort);
        if (!cancelled) controller.close();
      }
    },
    cancel() {
      cancelled = true;
      abort.abort();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
