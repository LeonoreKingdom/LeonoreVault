/**
 * Reusable skeleton loading components.
 */

interface SkeletonProps {
  className?: string;
}

/** Base animated skeleton block */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-skeleton bg-border rounded-lg ${className}`} aria-hidden="true" />
  );
}

/** Card-shaped skeleton matching the item card layout */
export function SkeletonCard() {
  return (
    <div className="border-border bg-surface space-y-3 rounded-2xl border p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-60" />
      <div className="flex items-center gap-2 pt-1">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

/** Row-shaped skeleton for list views */
export function SkeletonRow() {
  return (
    <div className="border-border flex items-center gap-4 rounded-xl border p-4">
      <Skeleton className="h-10 w-10 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-8 w-16 rounded-lg" />
    </div>
  );
}
