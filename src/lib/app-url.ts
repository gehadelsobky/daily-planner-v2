export function resolveAppUrl(req?: Request): string | null {
  const explicit =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL;

  if (explicit?.trim()) {
    return explicit.trim().replace(/\/+$/, "");
  }

  const origin = req?.headers.get("origin")?.trim();
  if (origin) {
    return origin.replace(/\/+$/, "");
  }

  return null;
}
