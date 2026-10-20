import snapshot from "@/evals/results/latest.json";
export function GET() {
  return Response.json(
    { ...snapshot, snapshot: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
