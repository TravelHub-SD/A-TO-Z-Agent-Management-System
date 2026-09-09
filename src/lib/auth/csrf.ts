import { badRequest } from "@/lib/utils/errors";

/**
 * CSRF defence for state-changing API routes.
 *
 * The session cookie is SameSite=Lax, which already blocks cross-site form
 * posts. On top of that every mutating request must come from this origin:
 * `Origin` is compared against the request host (or APP_ORIGIN when the app
 * sits behind a proxy that rewrites Host). Browsers set `Origin` on every
 * non-GET request and scripts cannot forge it.
 */
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function assertSameOrigin(request: Request) {
  if (!MUTATING_METHODS.has(request.method.toUpperCase())) return;

  const origin = request.headers.get("origin");
  if (!origin) {
    // No Origin header on a mutating request means it did not come from a
    // browser page load we control. Reject rather than guess.
    throw badRequest("Missing origin header. Request rejected.");
  }

  const allowed = new Set<string>();
  if (process.env.APP_ORIGIN) allowed.add(process.env.APP_ORIGIN);

  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) {
    const proto =
      request.headers.get("x-forwarded-proto") ??
      (process.env.NODE_ENV === "production" ? "https" : "http");
    allowed.add(`${proto}://${host}`);
    // Local development commonly mixes http/https on the same host.
    if (process.env.NODE_ENV !== "production") {
      allowed.add(`http://${host}`);
      allowed.add(`https://${host}`);
    }
  }

  if (!allowed.has(origin)) {
    throw badRequest("Cross-origin request rejected.");
  }
}
