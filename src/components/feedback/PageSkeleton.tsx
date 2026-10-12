export function PageSkeleton({ label = 'Loading market data' }: { label?: string }) {
  return (
    <div className="page-skeleton" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-line" />
      <div className="skeleton-grid">
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </div>
    </div>
  );
}
