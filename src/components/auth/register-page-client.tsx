"use client";

import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/fetcher";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8)
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPageClient() {
  const router = useRouter();
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const [apiError, setApiError] = useState<string | null>(null);

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
