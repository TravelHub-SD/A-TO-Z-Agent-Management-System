import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

/**
 * Errors that are safe to show a user. Anything else is logged server-side and
 * surfaced as a generic message so raw database errors never reach the client.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    message: string,
    options: {
      status?: number;
      code?: string;
      fieldErrors?: Record<string, string[]>;
    } = {},
  ) {
    super(message);
    this.name = "AppError";
    this.status = options.status ?? 400;
    this.code = options.code ?? "BAD_REQUEST";
    this.fieldErrors = options.fieldErrors;
  }
}

export const badRequest = (message: string, fieldErrors?: Record<string, string[]>) =>
  new AppError(message, { status: 400, code: "BAD_REQUEST", fieldErrors });

export const unauthorized = (message = "You must sign in to continue.") =>
  new AppError(message, { status: 401, code: "UNAUTHORIZED" });

export const forbidden = (message = "You do not have permission to do that.") =>
  new AppError(message, { status: 403, code: "FORBIDDEN" });

export const notFound = (message = "The requested record was not found.") =>
  new AppError(message, { status: 404, code: "NOT_FOUND" });

export const conflict = (message: string) =>
  new AppError(message, { status: 409, code: "CONFLICT" });

export const tooManyRequests = (message: string) =>
  new AppError(message, { status: 429, code: "TOO_MANY_REQUESTS" });

export type ApiErrorBody = {
  error: string;
  code: string;
  fieldErrors?: Record<string, string[]>;
};

/** Flatten a Zod error into `{ field: [messages] }` for form display. */
export function zodFieldErrors(error: ZodError): Record<string, string[]> {
  const flat: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    (flat[key] ??= []).push(issue.message);
  }
  return flat;
}

/**
 * Single funnel for API route errors. Known error shapes get a helpful
 * message; everything else becomes a 500 with the details kept in the logs.
 */
export function toErrorResponse(error: unknown): NextResponse<ApiErrorBody> {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code, fieldErrors: error.fieldErrors },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Please correct the highlighted fields.",
        code: "VALIDATION_ERROR",
        fieldErrors: zodFieldErrors(error),
      },
      { status: 422 },
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = (error.meta?.target as string[] | undefined)?.join(", ");
      return NextResponse.json(
        {
          error: friendlyUniqueMessage(target),
          code: "CONFLICT",
        },
        { status: 409 },
      );
    }
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "The requested record was not found.", code: "NOT_FOUND" },
        { status: 404 },
      );
    }
    if (error.code === "P2003") {
      return NextResponse.json(
        {
          error: "That record is referenced elsewhere and cannot be changed.",
          code: "CONFLICT",
        },
        { status: 409 },
      );
    }
  }

  console.error("[api] unhandled error:", error);
  return NextResponse.json(
    { error: "Something went wrong. Please try again.", code: "INTERNAL_ERROR" },
    { status: 500 },
  );
}

function friendlyUniqueMessage(target?: string) {
  if (!target) return "That value is already in use.";
  if (target.includes("code")) return "That agent code is already in use.";
  if (target.includes("transaction_number"))
    return "That transaction number has already been used on another payment.";
  if (target.includes("ticket_id"))
    return "This ticket has already been paid.";
  if (target.includes("email")) return "That email address is already registered.";
  return "That value is already in use.";
}

/** Message extraction for client-side fetch failures. */
export function messageFromResponseBody(body: unknown, fallback: string) {
  if (body && typeof body === "object" && "error" in body) {
    const value = (body as { error?: unknown }).error;
    if (typeof value === "string" && value.trim()) return value;
  }
  return fallback;
}
