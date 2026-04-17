import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-xl border border-border bg-[rgba(255,255,255,0.94)] px-4 py-2.5 text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] ring-offset-background transition focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-ring/60",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
