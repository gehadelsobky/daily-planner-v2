import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-[linear-gradient(135deg,#00b0ff,#1fd9b5)] px-3 py-1 text-xs font-semibold text-[#0a0087] shadow-[0_8px_20px_rgba(0,176,255,0.16)]",
        className
      )}
      {...props}
    />
  );
}
