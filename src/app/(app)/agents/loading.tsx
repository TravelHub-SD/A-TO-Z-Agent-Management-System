import { Card } from "@/components/ui/card";
import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <div className="mb-5 space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Card>
        <div className="flex gap-2 border-b border-hairline px-5 py-3">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-40" />
        </div>
        <TableSkeleton rows={8} columns={7} />
      </Card>
    </>
  );
}
