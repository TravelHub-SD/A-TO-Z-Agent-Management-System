import { Card } from "@/components/ui/card";
import { Skeleton, StatCardSkeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <div className="mb-5 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-7 w-56" />
      </div>
      <Card className="mb-5 h-14" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <StatCardSkeleton key={index} />
        ))}
      </div>
      <Card className="mt-5">
        <TableSkeleton rows={6} columns={6} />
      </Card>
    </>
  );
}
