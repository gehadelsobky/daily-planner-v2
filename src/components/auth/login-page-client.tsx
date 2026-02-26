"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPageClient() {
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
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4" suppressHydrationWarning>
      <Card className="w-full space-y-4">
        <h1 className="text-2xl font-semibold">Login</h1>
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
          <Link href="/forgot-password" className="underline">
            Forgot password?
          </Link>
          <Link href="/register" className="underline">
            Create an account
          </Link>
        </div>
      </Card>
    </main>
  );
}
