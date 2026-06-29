import { cn } from "@/lib/utils";

// 加载骨架（design.md：shimmer，surface-container → high）
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-surface-container",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
