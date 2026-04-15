import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseJson } from "@/lib/http";
import { loginSchema } from "@/lib/validation/schemas";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { todayInTimezone } from "@/lib/date";
import { ensureCarryoverReminder } from "@/lib/notifications";
import { buildRateLimitKey, getClientIp, getUserAgentFingerprint } from "@/lib/request";

function isJsonRequest(req: Request): boolean {
  const contentType = req.headers.get("content-type") ?? "";
  const accept = req.headers.get("accept") ?? "";
  const requestedWith = req.headers.get("x-requested-with") ?? "";

  return (
    contentType.includes("application/json") ||
    accept.includes("application/json") ||
    requestedWith.toLowerCase() === "xmlhttprequest"
  );
}

function isDatabaseConnectivityError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybe = error as { message?: string; code?: string; name?: string };
  const msg = (maybe.message ?? "").toLowerCase();
  return (
    maybe.code === "P1001" ||
    msg.includes("can't reach database server") ||
    msg.includes("connection") && msg.includes("refused") ||
    msg.includes("operation not permitted")
  );
}

async function readLoginPayload(req: Request): Promise<
  | { ok: true; data: { email: string; password: string }; isFormRequest: boolean }
  | { ok: false; response: NextResponse }
> {
  const isJson = isJsonRequest(req);

  if (isJson) {
    const parsed = await parseJson(req, loginSchema);
    if (!parsed.ok) return { ok: false, response: parsed.response };
    return { ok: true, data: parsed.data, isFormRequest: false };
  }

  const form = await req.formData().catch(() => null);
  const payload = {
    email: String(form?.get("email") ?? ""),
    password: String(form?.get("password") ?? "")
  };
  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.redirect(new URL("/login?error=invalid_input", req.url), { status: 303 })
    };
  }
  return { ok: true, data: parsed.data, isFormRequest: true };
}

export async function POST(req: Request) {
  try {
    const parsed = await readLoginPayload(req);
    if (!parsed.ok) return parsed.response;

    const ip = getClientIp(req);
    const agent = getUserAgentFingerprint(req);
    const emailKey = parsed.data.email.trim().toLowerCase();
    const ipAllowed = await checkRateLimit(buildRateLimitKey(["auth-login-ip", ip, agent]), 20, 60_000);
    const identityAllowed = await checkRateLimit(buildRateLimitKey(["auth-login-account", emailKey]), 10, 60_000);
    if (!ipAllowed || !identityAllowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    if (!user) {
      if (parsed.isFormRequest) {
        return NextResponse.redirect(new URL("/login?error=invalid_credentials", req.url), { status: 303 });
      }
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!valid) {
      if (parsed.isFormRequest) {
        return NextResponse.redirect(new URL("/login?error=invalid_credentials", req.url), { status: 303 });
      }
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await createSessionToken({ sub: user.id, email: user.email, ver: user.sessionVersion });
    await setSessionCookie(token);

    // Notification reminder should never block login.
    try {
      await ensureCarryoverReminder(user.id, user.timezone, todayInTimezone(user.timezone));
    } catch (error) {
      console.error("ensureCarryoverReminder failed during login", error);
    }

    if (parsed.isFormRequest) {
      return NextResponse.redirect(new URL("/daily", req.url), { status: 303 });
    }

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, timezone: user.timezone }
    });
  } catch (error) {
    console.error("POST /api/auth/login failed", error);
    const isJson = isJsonRequest(req);
    const dbUnavailable = isDatabaseConnectivityError(error);
    if (!isJson) {
      return NextResponse.redirect(
        new URL(`/login?error=${dbUnavailable ? "db_unavailable" : "server_error"}`, req.url),
        { status: 303 }
      );
    }
    return NextResponse.json(
      {
        error: dbUnavailable
          ? "Database unavailable. Start PostgreSQL and try again."
          : "Login temporarily unavailable. Please try again."
      },
      { status: 500 }
    );
  }
}
