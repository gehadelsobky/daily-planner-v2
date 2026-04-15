import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      timezone: user.timezone,
      phoneCountry: user.phoneCountry,
      phoneNumber: user.phoneNumber,
      phoneE164: user.phoneE164,
      avatarUrl: user.avatarUrl
    }
  });
}
