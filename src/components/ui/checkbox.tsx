import * as React from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => (
    <input
      type="checkbox"
      ref={ref}
      className={cn(
        "size-4 shrink-0 cursor-pointer appearance-none rounded border border-outline-variant bg-surface-container-lowest transition",
        "checked:border-primary checked:bg-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1",
        "disabled:cursor-not-allowed disabled:opacity-50",
        // custom checkmark via CSS
        "relative after:absolute after:inset-0 after:flex after:items-center after:justify-center after:text-white after:text-[10px] after:font-bold checked:after:content-['✓']",
        className,
      )}
      {...props}
    />
  ),
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
