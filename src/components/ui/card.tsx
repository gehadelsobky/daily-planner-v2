import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[1.5rem] border border-[hsl(var(--border)/0.9)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(247,251,255,0.92))] p-5 text-[hsl(var(--card-foreground))] shadow-[0_12px_40px_rgba(23,69,199,0.08)] backdrop-blur-md",
        className
      )}
      {...props}
    />
  );
}
