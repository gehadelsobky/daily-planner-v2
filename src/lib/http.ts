import { NextResponse } from "next/server";
import { z } from "zod";

export async function parseJson<T>(req: Request, schema: z.Schema<T>) {
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Validation failed" }, { status: 400 })
    };
  }

  return { ok: true as const, data: parsed.data };
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
