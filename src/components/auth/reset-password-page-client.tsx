"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/fetcher";

const schema = z
  .object({
    password: z.string().min(8).max(128),
    confirm_password: z.string().min(8).max(128)
  })
  .refine((data) => data.password === data.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords do not match"
  });

type FormValues = z.infer<typeof schema>;
type ResetResponse = { message: string };

export default function ResetPasswordPageClient() {
  const router = useRouter();
  const search = useSearchParams();
  const [token] = useState(() => search.get("token") ?? "");
  const hasToken = useMemo(() => token.length >= 20, [token]);

  useEffect(() => {
    if (!token) return;
    router.replace("/reset-password", { scroll: false });
  }, [router, token]);

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const [apiError, setApiError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!hasToken) {
      setApiError("Reset link is invalid. Request a new one.");
      return;
    }

    setApiError(null);
    setMessage(null);

    try {
      const res = await apiFetch<ResetResponse>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, ...values })
      });
      setMessage(res.message);
      form.reset();
      setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 1200);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Could not reset password");
    }
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4" suppressHydrationWarning>
      <Card className="w-full space-y-4">
        <h1 className="text-2xl font-semibold">Reset password</h1>
        {!hasToken ? (
          <p className="text-sm text-red-600">Reset link is missing or invalid. Request a new one.</p>
        ) : (
          <p className="text-sm text-slate-600">Enter your new password.</p>
        )}
        <form onSubmit={onSubmit} className="space-y-3" noValidate>
          <Input type="password" placeholder="New password" autoComplete="new-password" {...form.register("password")} />
          {form.formState.errors.password ? (
            <p className="text-sm text-red-600">Password must be at least 8 characters.</p>
          ) : null}
          <Input
            type="password"
            placeholder="Confirm new password"
            autoComplete="new-password"
            {...form.register("confirm_password")}
          />
          {form.formState.errors.confirm_password ? (
            <p className="text-sm text-red-600">{form.formState.errors.confirm_password.message}</p>
          ) : null}
          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          {apiError ? <p className="text-sm text-red-600">{apiError}</p> : null}
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || !hasToken}>
            Reset password
          </Button>
        </form>
        <Link href="/login" className="text-sm underline">
          Back to login
        </Link>
      </Card>
    </main>
  );
}
