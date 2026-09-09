import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <div className="mb-5 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-7 w-40" />
      </div>
      <Card className="h-24" />
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <Card className="h-80" />
          <Card className="h-56" />
        </div>
        <Card className="h-64" />
      </div>
    </>
  );
}
