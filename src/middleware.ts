import { NextResponse, type NextRequest } from "next/server";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const ORIGIN_EXEMPT_PATHS = new Set(["/api/jobs/for-tomorrow"]);

function normalizeOrigin(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    if (process.env.NODE_ENV !== "production" && url.hostname === "0.0.0.0") {
      url.hostname = "localhost";
    }
    return url.origin;
  } catch {
    return null;
  }
}

function getAllowedOrigins(origin: string) {
  const allowed = new Set([origin]);
  const url = new URL(origin);

  if (process.env.NEXT_PUBLIC_APP_URL) {
    const envOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL);
    if (envOrigin) {
      allowed.add(envOrigin);
    }
  }

  // Allow the common local aliases so development works whether the browser
  // opened localhost or 127.0.0.1 on the same port.
  if (process.env.NODE_ENV !== "production") {
    if (url.hostname === "localhost") {
      allowed.add(`${url.protocol}//127.0.0.1${url.port ? `:${url.port}` : ""}`);
      allowed.add(`${url.protocol}//0.0.0.0${url.port ? `:${url.port}` : ""}`);
    }

    if (url.hostname === "127.0.0.1") {
      allowed.add(`${url.protocol}//localhost${url.port ? `:${url.port}` : ""}`);
      allowed.add(`${url.protocol}//0.0.0.0${url.port ? `:${url.port}` : ""}`);
    }

    if (url.hostname === "0.0.0.0") {
      allowed.add(`${url.protocol}//localhost${url.port ? `:${url.port}` : ""}`);
      allowed.add(`${url.protocol}//127.0.0.1${url.port ? `:${url.port}` : ""}`);
    }
  }

  return allowed;
}

function getRequestOrigin(req: NextRequest) {
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost = req.headers.get("x-forwarded-host");
  const rawHost = forwardedHost ?? req.headers.get("host") ?? req.nextUrl.host;
  const host = process.env.NODE_ENV !== "production" ? rawHost.replace(/^0\.0\.0\.0(?=[:]|$)/, "localhost") : rawHost;
  const protocol = forwardedProto ?? req.nextUrl.protocol.replace(/:$/, "");

  return `${protocol}://${host}`;
}

function withSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  return response;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const requestUrlOrigin = getRequestOrigin(req);

  if (pathname.startsWith("/api/") && MUTATION_METHODS.has(req.method) && !ORIGIN_EXEMPT_PATHS.has(pathname)) {
    const allowedOrigins = getAllowedOrigins(requestUrlOrigin);
    const requestOrigin = normalizeOrigin(req.headers.get("origin"));
    const referer = req.headers.get("referer");
    const refererOrigin = normalizeOrigin(referer);
    const sameOrigin =
      (requestOrigin && allowedOrigins.has(requestOrigin)) ||
      (refererOrigin && allowedOrigins.has(refererOrigin));

    if (!sameOrigin) {
      return withSecurityHeaders(
        NextResponse.json({ error: "Blocked by origin policy" }, { status: 403 })
      );
    }
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
