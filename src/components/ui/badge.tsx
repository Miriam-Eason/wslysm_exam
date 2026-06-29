import { cn } from "@/lib/utils";

const VARIANTS = {
  primary: "bg-primary-container text-primary",
  neutral: "bg-surface-container text-on-surface-variant",
  success: "bg-success-container text-success",
  warning: "bg-warning-container text-on-surface",
  danger: "bg-danger-container text-danger",
} as const;

export function Badge({
  variant = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof VARIANTS }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
