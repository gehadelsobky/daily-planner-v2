"use client";

export default function GlobalError({
  error
}: {
  error: Error & { digest?: string };
}) {
  console.error(error);

  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-900">
        <main className="mx-auto max-w-3xl px-4 py-16">
          <h1 className="text-2xl font-semibold">Application error</h1>
          <p className="mt-3 text-sm text-slate-600">
            A critical error occurred. Please refresh the page.
          </p>
        </main>
      </body>
    </html>
  );
}
