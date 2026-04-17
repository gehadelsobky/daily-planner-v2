"use client";

import Link from "next/link";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/fetcher";

const schema = z.object({
  email: z.string().email()
});

type FormValues = z.infer<typeof schema>;
type ForgotResponse = { message: string };

export default function ForgotPasswordPageClient() {
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const [apiError, setApiError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = form.handleSubmit(async (values) => {
    setApiError(null);
    setMessage(null);
    try {
      const res = await apiFetch<ForgotResponse>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify(values)
      });
      setMessage(res.message);
      form.reset();
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Could not request reset");
    }
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10" suppressHydrationWarning>
      <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1.1fr)_460px] lg:items-center">
        <div className="hidden lg:block space-y-5">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Account Recovery</p>
          <h1 className="max-w-xl text-5xl font-semibold leading-tight tracking-tight text-[hsl(var(--foreground))]">
            Regain access without losing your planning history.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-muted-foreground">
            Enter your email and we’ll prepare a secure reset flow if the account exists.
          </p>
        </div>
        <Card className="w-full space-y-5">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Password Reset</p>
          <h1 className="text-3xl font-semibold tracking-tight">Forgot password</h1>
          <p className="text-sm leading-6 text-muted-foreground">Enter your email and we will send a reset link if the account exists.</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-3" noValidate>
          <Input placeholder="Email" autoComplete="email" {...form.register("email")} />
          {form.formState.errors.email ? <p className="text-sm text-red-600">Please enter a valid email.</p> : null}
          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          {apiError ? <p className="text-sm text-red-600">{apiError}</p> : null}
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            Send reset link
          </Button>
        </form>
        <Link href="/login" className="text-sm underline">
          Back to login
        </Link>
        </Card>
      </div>
    </main>
  );
}
