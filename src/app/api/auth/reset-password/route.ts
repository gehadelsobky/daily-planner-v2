import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db";
import { parseJson } from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limit";
import { resetPasswordSchema } from "@/lib/validation/schemas";
import { isForgotPasswordEnabled } from "@/lib/features";

export async function POST(req: Request) {
  if (!isForgotPasswordEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (!checkRateLimit(`auth-reset:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = await parseJson(req, resetPasswordSchema);
  if (!parsed.ok) return parsed.response;

  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const now = new Date();

  const user = await prisma.user.findFirst({
    where: {
      resetTokenHash: tokenHash,
      resetTokenExpiresAt: { gt: now }
    },
    select: { id: true }
  });

  if (!user) {
    return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetTokenHash: null,
      resetTokenExpiresAt: null
    }
  });

  return NextResponse.json({ message: "Password reset successfully. You can now sign in." });
}
