import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton() {
  return (
    <div aria-hidden="true" className="mx-auto w-full max-w-3xl space-y-5">
      <Skeleton className="h-4 w-28 motion-reduce:animate-none" />

      <Skeleton
        className="
          h-10 w-4/5 rounded-xl
          motion-reduce:animate-none sm:h-14
        "
      />

      <div className="space-y-3">
        <Skeleton className="h-4 w-full motion-reduce:animate-none" />
        <Skeleton className="h-4 w-2/3 motion-reduce:animate-none" />
      </div>

      <Skeleton
        className="
          mt-8 h-48 w-full rounded-2xl
          motion-reduce:animate-none sm:h-64
        "
      />
    </div>
  );
}
