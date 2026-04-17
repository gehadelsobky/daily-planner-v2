"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPageClient({ forgotEnabled }: { forgotEnabled: boolean }) {
  const searchParams = useSearchParams();
  const queryError = searchParams.get("error");
  const fallbackError =
    queryError === "invalid_credentials"
      ? "Invalid email or password."
      : queryError === "invalid_input"
        ? "Please enter a valid email and password."
        : queryError === "db_unavailable"
          ? "Database unavailable. Start PostgreSQL, then try again."
        : queryError === "server_error"
          ? "Login is temporarily unavailable. Please try again."
        : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10" suppressHydrationWarning>
      <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1.1fr)_460px] lg:items-center">
        <div className="hidden lg:block">
          <div className="space-y-5">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Welcome Back</p>
            <h1 className="max-w-xl text-5xl font-semibold leading-tight tracking-tight text-[hsl(var(--foreground))]">
              Return to your daily system with clarity and momentum.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-muted-foreground">
              Review priorities, maintain your habits, and keep your productivity score moving in the right direction.
            </p>
          </div>
        </div>
        <Card className="w-full space-y-5">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Account Access</p>
          <h1 className="text-3xl font-semibold tracking-tight">Login</h1>
          <p className="text-sm leading-6 text-muted-foreground">Use your email and password to continue into the planner.</p>
        </div>
        <form method="POST" action="/api/auth/login" className="space-y-3">
          <Input name="email" type="email" placeholder="Email" autoComplete="email" required />
          <Input
            name="password"
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            minLength={8}
            required
          />
          {fallbackError ? <p className="text-sm text-red-600">{fallbackError}</p> : null}
          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </form>
        <div className="flex items-center justify-between gap-3 text-sm">
          {forgotEnabled ? (
            <Link href="/forgot-password" className="underline">
              Forgot password?
            </Link>
          ) : (
            <span />
          )}
          <Link href="/register" className="underline">
            Create an account
          </Link>
        </div>
        </Card>
      </div>
    </main>
  );
}
