"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="page-shell">
      <h1>Let’s try that again.</h1>
      <p>
        Something interrupted the planner. Your saved celebrations are still on
        your device.
      </p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
