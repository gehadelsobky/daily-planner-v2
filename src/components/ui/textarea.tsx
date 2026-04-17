import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-border bg-[rgba(255,255,255,0.94)] px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] ring-offset-background transition focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-ring/60",
        className
      )}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";
