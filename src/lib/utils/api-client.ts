import { messageFromResponseBody } from "@/lib/utils/errors";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

/**
 * Thin fetch wrapper for client components. Always same-origin and always
 * `credentials: "same-origin"` so the session cookie travels with the request;
 * errors come back as a typed result rather than a thrown exception, which
 * keeps form submit handlers linear.
 */
export async function apiRequest<T>(
  input: string,
  init: RequestInit = {},
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(input, {
      ...init,
      credentials: "same-origin",
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        Accept: "application/json",
        ...init.headers,
      },
    });

    if (response.status === 204) return { ok: true, data: undefined as T };

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false,
        message: messageFromResponseBody(body, "Something went wrong. Please try again."),
        fieldErrors:
          body && typeof body === "object" && "fieldErrors" in body
            ? ((body as { fieldErrors?: Record<string, string[]> }).fieldErrors ?? undefined)
            : undefined,
      };
    }

    return { ok: true, data: body as T };
  } catch {
    return {
      ok: false,
      message: "Could not reach the server. Check your connection and try again.",
    };
  }
}
