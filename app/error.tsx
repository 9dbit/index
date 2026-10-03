"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="loading">
      <h1>Could not load your workspace</h1>
      <p>Check the database configuration and your workspace membership.</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
