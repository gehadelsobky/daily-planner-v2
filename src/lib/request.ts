export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "local";
}

export function getUserAgentFingerprint(req: Request): string {
  return req.headers.get("user-agent")?.trim().slice(0, 180) || "unknown-agent";
}

export function buildRateLimitKey(parts: Array<string | number | null | undefined>): string {
  return parts
    .map((part) => String(part ?? "").trim().toLowerCase())
    .filter(Boolean)
    .join(":");
}
