"use client";
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <h1>Let’s try that again.</h1>
        <p>The planner encountered an unexpected issue.</p>
        <button onClick={reset}>Reload planner</button>
      </body>
    </html>
  );
}
