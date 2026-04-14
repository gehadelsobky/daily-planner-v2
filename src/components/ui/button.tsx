import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "ghost" | "danger";
};

export function Button({ className, variant = "default", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]",
        variant === "default" &&
          "bg-[linear-gradient(135deg,#1745C7,#0a0087)] text-white shadow-[0_10px_24px_rgba(23,69,199,0.22)] hover:-translate-y-[1px] hover:brightness-105",
        variant === "secondary" &&
          "border border-[hsl(var(--border))] bg-white text-[hsl(var(--foreground))] shadow-[0_6px_18px_rgba(15,23,42,0.06)] hover:border-[#00b0ff] hover:bg-[rgba(0,176,255,0.04)]",
        variant === "ghost" && "bg-transparent text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.6)]",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
        className
      )}
      {...props}
    />
  );
}
