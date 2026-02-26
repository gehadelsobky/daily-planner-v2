import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { parseJson } from "@/lib/http";
import { forgotPasswordSchema } from "@/lib/validation/schemas";
import { prisma } from "@/lib/db";
import { createHash, randomBytes } from "crypto";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (!checkRateLimit(`auth-forgot:${ip}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = await parseJson(req, forgotPasswordSchema);
  if (!parsed.ok) return parsed.response;

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    select: { id: true, email: true }
  });

  let devResetUrl: string | undefined;
  if (user) {
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetTokenHash: tokenHash,
        resetTokenExpiresAt: expiresAt
      }
    });

    if (process.env.NODE_ENV !== "production") {
      const appOrigin = req.headers.get("origin") ?? "http://localhost:3000";
      devResetUrl = `${appOrigin}/reset-password?token=${token}`;
      // Helpful local signal when email provider is not configured.
      console.log(`[DEV] Password reset link for ${user.email}: ${devResetUrl}`);
    }
  }

  return NextResponse.json(
    {
    message: "If the email exists, a reset link has been sent."
    },
    devResetUrl ? { headers: { "x-dev-reset-url": devResetUrl } } : undefined
  );
}
