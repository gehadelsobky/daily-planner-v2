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
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4" suppressHydrationWarning>
      <Card className="w-full space-y-4">
        <h1 className="text-2xl font-semibold">Forgot password</h1>
        <p className="text-sm text-slate-600">Enter your email and we will send a reset link if the account exists.</p>
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
    </main>
  );
}
