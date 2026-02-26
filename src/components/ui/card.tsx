import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-[hsl(var(--card)/0.82)] p-4 text-[hsl(var(--card-foreground))] shadow-sm backdrop-blur-sm",
        className
      )}
      {...props}
    />
  );
}
