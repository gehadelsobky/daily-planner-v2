import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

const SESSION_COOKIE = "dp_session";
const encoder = new TextEncoder();

function shouldUseSecureCookie() {
  if (process.env.COOKIE_SECURE === "true") {
    return true;
  }
  if (process.env.COOKIE_SECURE === "false") {
    return false;
  }

  const explicitUrl = process.env.APP_URL || process.env.AUTH_URL || process.env.NEXTAUTH_URL;
  if (explicitUrl?.startsWith("https://")) {
    return true;
  }

  return process.env.VERCEL === "1";
}

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("Missing AUTH_SECRET");
  }
  return encoder.encode(secret);
}

export type SessionPayload = {
  sub: string;
  email: string;
  ver: number;
};

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const verified = await jwtVerify(token, getSecret());
    return verified.payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: shouldUseSecureCookie(),
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const payload = await verifySessionToken(token);
  if (!payload?.sub) {
    return null;
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return null;
    if ((payload.ver ?? 0) !== user.sessionVersion) {
      return null;
    }
    return user;
  } catch {
    // Keep the app usable when DB is temporarily unavailable.
    return null;
  }
}
