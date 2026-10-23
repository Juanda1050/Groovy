export function PageSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-5 motion-safe:animate-pulse">
      <div className="h-4 w-32 rounded bg-muted" />
      <div className="h-12 w-3/4 max-w-lg rounded-xl bg-muted" />
      <div className="h-5 w-full max-w-xl rounded bg-muted" />
      <div className="h-5 w-2/3 max-w-md rounded bg-muted" />
    </div>
  );
}
