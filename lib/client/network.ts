export async function consumeSSE(
  response: Response,
  onEvent: (event: string, data: unknown) => void,
  signal?: AbortSignal,
) {
  if (!response.ok) {
    const data = await response
      .json()
      .catch(() => ({ error: "Unable to connect. Please retry." }));
    throw new Error(data.error || "Unable to complete request.");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Streaming is unavailable. Please retry.");
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel();
        return;
      }
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const chunks = buffer.split(/\r?\n\r?\n/);
      buffer = chunks.pop() || "";
      for (const chunk of chunks) {
        const event = chunk.match(/^event: (.+)$/m)?.[1] || "message";
        const data = chunk
          .split(/\r?\n/)
          .filter((l) => l.startsWith("data: "))
          .map((l) => l.slice(6))
          .join("\n");
        if (data) onEvent(event, JSON.parse(data));
      }
      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }
}
export function download(content: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
