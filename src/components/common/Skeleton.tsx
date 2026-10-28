import React from "react";

// Grey placeholder blocks shown while a page's data loads. They keep the layout of what will replace them, so nothing jumps.
export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div aria-hidden style={style} className={`animate-pulse rounded-md bg-[#ECECEC] ${className}`} />;
}

/** Wraps a skeleton group so assistive tech hears one "loading" message rather than the individual blocks. */
export function SkeletonRegion({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={className}>
      {children}
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Table body placeholder: `rows` lines of `cols` cells, with the first cell narrower (id / checkbox column). */
export function TableSkeletonRows({ rows = 6, cols }: { rows?: number; cols: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} aria-hidden>
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c} className="py-4 px-4">
              <Skeleton className={`h-4 ${c === 0 ? "w-16" : c % 3 === 1 ? "w-3/4" : "w-1/2"}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Stand-alone table placeholder for pages whose table isn't rendered until data arrives. */
export function TableSkeleton({ rows = 6, cols = 5, label = "Loading" }: { rows?: number; cols?: number; label?: string }) {
  return (
    <SkeletonRegion label={label} className="w-full">
      <table className="w-full"><tbody><TableSkeletonRows rows={rows} cols={cols} /></tbody></table>
    </SkeletonRegion>
  );
}

/** A bordered card with a title line and a few text lines. */
export function CardSkeleton({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div aria-hidden className={`border border-[#E0E0E0] rounded-lg p-5 space-y-3 ${className}`}>
      <Skeleton className="h-5 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => <Skeleton key={i} className={`h-3.5 ${i % 2 ? "w-2/3" : "w-full"}`} />)}
    </div>
  );
}
