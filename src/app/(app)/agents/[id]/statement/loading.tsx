import { Card } from "@/components/ui/card";
import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <div className="mb-5 space-y-2">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-7 w-64" />
      </div>
      <Card>
        <div className="border-b border-hairline px-5 py-5">
          <Skeleton className="h-6 w-48" />
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-12" />
            ))}
          </div>
        </div>
        <TableSkeleton rows={7} columns={6} />
      </Card>
    </>
  );
}
