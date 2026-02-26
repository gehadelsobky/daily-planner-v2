import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  let db = "down";
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    db = "up";
  } catch {
    db = "down";
  }

  return NextResponse.json({
    ok: db === "up",
    db,
    node: process.versions.node,
    env: process.env.NODE_ENV ?? "development",
    ts: new Date().toISOString()
  });
}
