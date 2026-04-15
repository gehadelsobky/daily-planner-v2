"use client";

import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CountryCodeSelect } from "@/components/ui/country-code-select";
import { apiFetch } from "@/lib/fetcher";
import { DEFAULT_PHONE_COUNTRY, getPhoneCountryOption, normalizePhoneDetails } from "@/lib/phone";

const schema = z
  .object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
    phone_country: z.string().min(2).max(2),
    phone_number: z.string().min(4)
  })
  .superRefine((value, ctx) => {
    if (!normalizePhoneDetails(value.phone_country, value.phone_number)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone_number"],
        message: "Please enter a valid phone number."
      });
    }
  });

type FormValues = z.infer<typeof schema>;

export default function RegisterPageClient() {
  const router = useRouter();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      phone_country: DEFAULT_PHONE_COUNTRY
    }
  });
  const [apiError, setApiError] = useState<string | null>(null);
  const selectedCountry = getPhoneCountryOption(form.watch("phone_country"));

  const onSubmit = async (values: FormValues) => {
    setApiError(null);
    try {
      await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(values)
      });
      router.push("/daily");
      router.refresh();
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Registration failed");
    }
  };

  const onInvalid = () => {
    setApiError("Please fill all fields correctly.");
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4" suppressHydrationWarning>
      <Card className="w-full space-y-4">
        <h1 className="text-2xl font-semibold">Create account</h1>
        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-3" noValidate>
          <Input placeholder="Name" autoComplete="name" {...form.register("name")} />
          {form.formState.errors.name ? (
            <p className="text-sm text-red-600">Name is required.</p>
          ) : null}
          <Input placeholder="Email" autoComplete="email" {...form.register("email")} />
          {form.formState.errors.email ? (
            <p className="text-sm text-red-600">Please enter a valid email.</p>
          ) : null}
          <Input type="password" placeholder="Password" autoComplete="new-password" {...form.register("password")} />
          {form.formState.errors.password ? (
            <p className="text-sm text-red-600">Password must be at least 8 characters.</p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-[1.15fr,1.85fr]">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Country code</span>
              <CountryCodeSelect
                value={form.watch("phone_country")}
                onChange={(value) => form.setValue("phone_country", value, { shouldValidate: true })}
                disabled={form.formState.isSubmitting}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Phone number</span>
              <Input
                placeholder={`Number without ${selectedCountry.dialCode}`}
                autoComplete="tel-national"
                inputMode="tel"
                {...form.register("phone_number")}
              />
            </label>
          </div>
          {form.formState.errors.phone_number ? (
            <p className="text-sm text-red-600">{form.formState.errors.phone_number.message ?? "Phone number is required."}</p>
          ) : null}
          {apiError ? <p className="text-sm text-red-600">{apiError}</p> : null}
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            Register
          </Button>
        </form>
        <a href="/login" className="text-sm underline">
          Already have an account
        </a>
      </Card>
    </main>
  );
}
