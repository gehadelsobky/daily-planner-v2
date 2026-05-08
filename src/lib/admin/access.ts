import { AccountStatus, User } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guard";

function getConfiguredAdminEmails() {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function isLocalAdminFallbackEnabled() {
  const appUrl = (process.env.APP_URL ?? "").toLowerCase();
  return appUrl.includes("localhost") || appUrl.includes("127.0.0.1");
}

export function getAdminAccess(user: Pick<User, "email" | "accountStatus">) {
  const configuredAdmins = getConfiguredAdminEmails();
  const normalizedEmail = user.email.trim().toLowerCase();
  const isConfiguredAdmin = configuredAdmins.includes(normalizedEmail);
  const isFallbackAdmin = configuredAdmins.length === 0 && isLocalAdminFallbackEnabled();
  const isAllowed = user.accountStatus === AccountStatus.active && (isConfiguredAdmin || isFallbackAdmin);

  return {
    isAdmin: isAllowed,
    accessMode: isConfiguredAdmin ? "configured" : isFallbackAdmin ? "local_fallback" : "none"
  } as const;
}

export async function requireAdminUser() {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const access = getAdminAccess(auth.user);
  if (!access.isAdmin) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 })
    };
  }

  return {
    ok: true as const,
    user: auth.user,
    access
  };
}
