import { Skeleton } from "@/shared/components/ui/skeleton";

interface PageSkeletonProps {
  variant?: "page" | "artists" | "albums" | "albumDetail" | "recommendation";
}

export function PageSkeleton({ variant = "page" }: PageSkeletonProps) {
  if (variant === "recommendation") {
    return (
      <div
        aria-hidden="true"
        className="grid items-center gap-7 sm:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] sm:gap-8 lg:max-w-4xl lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-12"
      >
        <Skeleton className="mx-auto aspect-square w-full max-w-72 rounded-2xl sm:max-w-none" />
        <div className="space-y-5">
          <div className="space-y-3">
            <Skeleton className="h-3 w-28 rounded-md" />
            <Skeleton className="h-8 w-4/5 rounded-md" />
            <Skeleton className="h-4 w-1/2 rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-full rounded-md" />
            <Skeleton className="h-3.5 w-3/4 rounded-md" />
          </div>
          <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
            <Skeleton className="h-11 rounded-lg" />
            <Skeleton className="h-11 rounded-lg" />
          </div>
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (variant === "artists") {
    return (
      <div
        aria-hidden="true"
        className="grid grid-cols-2 items-start justify-items-center gap-x-6 gap-y-7 px-3 py-4 sm:grid-cols-3 sm:gap-x-8 sm:gap-y-9 lg:grid-cols-4 xl:grid-cols-5"
      >
        {Array.from({ length: 15 }, (_, index) => (
          <div key={index} className="w-full max-w-44 pb-13">
            <Skeleton className="aspect-square w-full rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "albums") {
    return (
      <div
        aria-hidden="true"
        className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-7 lg:grid-cols-4 xl:grid-cols-5"
      >
        {Array.from({ length: 10 }, (_, index) => (
          <div key={index} className="min-w-0 pb-14">
            <Skeleton className="aspect-square w-full rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "albumDetail") {
    return (
      <div aria-hidden="true">
        <Skeleton className="size-28 rounded-xl sm:size-44" />
      </div>
    );
  }

  return (
    <div aria-hidden="true" className="mx-auto w-full max-w-5xl space-y-6 py-2">
      <div className="space-y-3">
        <Skeleton className="h-7 w-48 max-w-full rounded-md" />
        <Skeleton className="h-4 w-72 max-w-full rounded-md" />
      </div>

      <Skeleton className="h-10 w-full max-w-sm rounded-lg" />

      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="min-w-0 space-y-3">
            <Skeleton className="aspect-square w-full rounded-xl" />
            <Skeleton className="h-3.5 w-4/5 rounded-md" />
            <Skeleton className="h-3 w-1/2 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
