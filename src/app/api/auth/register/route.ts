import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseJson } from "@/lib/http";
import { registerSchema } from "@/lib/validation/schemas";
import { hashPassword } from "@/lib/auth/password";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { DEFAULT_WEIGHTS } from "@/lib/score/constants";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (!checkRateLimit(`auth-register:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = await parseJson(req, registerSchema);
  if (!parsed.ok) return parsed.response;

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

  const token = await createSessionToken({ sub: user.id, email: user.email });
  await setSessionCookie(token);

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, timezone: user.timezone }
  });
}
