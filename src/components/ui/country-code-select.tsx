"use client";

import { PHONE_COUNTRY_OPTIONS } from "@/lib/phone";
import { cn } from "@/lib/utils";

type CountryCodeSelectProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
};

export function CountryCodeSelect({
  value,
  onChange,
  className,
  disabled,
  id,
  name
}: CountryCodeSelectProps) {
  return (
    <select
      id={id}
      name={name}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className={cn(
        "h-11 w-full rounded-xl border border-border bg-[rgba(255,255,255,0.92)] px-4 py-2.5 text-sm text-[hsl(var(--foreground))] outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] ring-offset-background transition focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-ring/60",
        className
      )}
    >
      {PHONE_COUNTRY_OPTIONS.map((option) => (
        <option key={option.iso2} value={option.iso2}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
