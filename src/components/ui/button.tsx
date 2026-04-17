import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "ghost" | "danger";
};

export function Button({ className, variant = "default", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-[1rem] px-4 py-2.5 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2",
        variant === "default" &&
          "bg-[linear-gradient(135deg,#1745C7,#0a0087)] text-white shadow-[0_12px_28px_rgba(23,69,199,0.24)] enabled:hover:-translate-y-[1px] enabled:hover:brightness-[1.04]",
        variant === "secondary" &&
          "border border-[hsl(var(--border))] bg-white/95 text-[hsl(var(--foreground))] shadow-[0_8px_22px_rgba(15,23,42,0.06)] enabled:hover:border-[#00b0ff] enabled:hover:bg-[rgba(0,176,255,0.04)]",
        variant === "ghost" && "bg-transparent text-[hsl(var(--foreground))] enabled:hover:bg-[hsl(var(--muted)/0.65)]",
        variant === "danger" && "bg-red-600 text-white enabled:hover:bg-red-700",
        className
      )}
      {...props}
    />
  );
}
