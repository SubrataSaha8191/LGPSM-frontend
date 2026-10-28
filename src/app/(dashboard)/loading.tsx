import { Skeleton, SkeletonRegion } from "@/components/common/Skeleton";

// Shown inside the dashboard shell while a page is on its way (route change, first compile), for Admin and Organiser alike.
// It mirrors the common page shape: header bar, a controls row, then cards and a table.
export default function DashboardLoading() {
  return (
    <SkeletonRegion label="Loading page" className="w-full min-h-full bg-white">
      <div className="h-[68px] px-6 flex items-center justify-between border-b border-[#E0E0E0]">
        <Skeleton className="h-6 w-48" />
        <div className="flex items-center gap-3"><Skeleton className="size-8 rounded-full!" /><Skeleton className="h-5 w-24" /></div>
      </div>
      <div className="px-4 sm:px-6 pt-8 space-y-6">
        <div className="flex items-center gap-4"><Skeleton className="h-6 w-28" /><Skeleton className="h-[47px] flex-1" /><Skeleton className="h-[47px] w-32" /></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[100px] rounded-lg!" />)}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
        </div>
      </div>
    </SkeletonRegion>
  );
}
