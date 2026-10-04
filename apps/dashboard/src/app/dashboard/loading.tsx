/** Shown while a dashboard page loads. Mirrors the page layout so nothing jumps when data arrives. */
export default function DashboardLoading() {
  return (
    <div role="status" aria-label="Loading">
      <div className="mb-3 h-9 w-56 animate-pulse rounded-sm bg-surface-raised motion-reduce:animate-none" />
      <div className="mb-8 h-5 w-96 max-w-full animate-pulse rounded-sm bg-surface-raised motion-reduce:animate-none" />
      <div className="grid max-w-[640px] gap-3">
        {[0, 1, 2].map((row) => (
          <div
            key={row}
            className="h-16 animate-pulse rounded-lg border border-line bg-surface-raised motion-reduce:animate-none"
          />
        ))}
      </div>
    </div>
  );
}
