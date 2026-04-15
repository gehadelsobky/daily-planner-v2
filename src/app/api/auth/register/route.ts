import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseJson } from "@/lib/http";
import { registerSchema } from "@/lib/validation/schemas";
import { hashPassword } from "@/lib/auth/password";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { DEFAULT_WEIGHTS } from "@/lib/score/constants";
import { checkRateLimit } from "@/lib/rate-limit";
import { buildRateLimitKey, getClientIp, getUserAgentFingerprint } from "@/lib/request";

export async function POST(req: Request) {
  const parsed = await parseJson(req, registerSchema);
  if (!parsed.ok) return parsed.response;

  const ip = getClientIp(req);
  const agent = getUserAgentFingerprint(req);
  const emailKey = parsed.data.email.trim().toLowerCase();
  const ipAllowed = await checkRateLimit(buildRateLimitKey(["auth-register-ip", ip, agent]), 10, 60_000);
  const identityAllowed = await checkRateLimit(buildRateLimitKey(["auth-register-account", emailKey]), 5, 60_000);
  if (!ipAllowed || !identityAllowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email.toLowerCase(),
      passwordHash,
      name: parsed.data.name,
      scoreSettings: {
        create: {
          effectiveFrom: new Date(),
          tasksWeight: DEFAULT_WEIGHTS.tasks,
          growWeight: DEFAULT_WEIGHTS.grow,
          habitsWeight: DEFAULT_WEIGHTS.habits,
          exerciseWeight: DEFAULT_WEIGHTS.exercise,
          gratefulWeight: DEFAULT_WEIGHTS.grateful,
          waterWeight: DEFAULT_WEIGHTS.water
        }
      }
    }
  });

  const token = await createSessionToken({ sub: user.id, email: user.email, ver: user.sessionVersion });
  await setSessionCookie(token);

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, timezone: user.timezone }
  });
}
