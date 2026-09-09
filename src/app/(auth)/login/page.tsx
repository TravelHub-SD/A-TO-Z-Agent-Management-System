import type { Metadata } from "next";
import { Suspense } from "react";
import { getSettings } from "@/lib/services/settings";
import { Brand } from "@/components/layout/brand";
import { LoginForm } from "@/components/auth/login-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

/**
 * The only public page. There is no registration and no agent portal —
 * accounts are created by an administrator inside the application.
 */
export default async function LoginPage() {
  const settings = await getSettings();

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel — hidden on small screens so the form owns the viewport. */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-navy-900 p-10 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-brand-600/20 blur-3xl"
        />

        <Brand agencyName={settings.agencyName} href={null} />

        <div className="relative max-w-md">
          <h2 className="text-[26px] font-semibold leading-tight tracking-tight text-white">
            Agent balances, ticket by ticket.
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-navy-300">
            Track what every travel agent owes, record payments against a
            transaction number, and keep a complete audit trail of every
            financial action.
          </p>

          <dl className="mt-8 space-y-3.5">
            {[
              ["Who owes A TO Z money", "Live outstanding balance per agent"],
              ["What exactly the debt is", "Ticket-level statements with running balance"],
              ["What confirms a payment", "4-digit transaction number and audit record"],
            ].map(([title, detail]) => (
              <div key={title} className="flex gap-3">
                <span
                  aria-hidden
                  className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-400"
                />
                <div>
                  <dt className="text-[13.5px] font-medium text-white">{title}</dt>
                  <dd className="text-[12.5px] text-navy-400">{detail}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>

        <p className="relative text-[11.5px] text-navy-500">
          Internal staff access only. External agents do not have accounts.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-[23rem]">
          <div className="mb-8 lg:hidden">
            <Brand agencyName={settings.agencyName} tone="light" href={null} />
          </div>

          <h1 className="text-[22px] font-semibold tracking-tight text-navy-900">
            Sign in
          </h1>
          <p className="mt-1.5 text-[13.5px] text-navy-500">
            Enter your A TO Z staff credentials to continue.
          </p>

          <Suspense fallback={<Skeleton className="mt-7 h-56 w-full" />}>
            <LoginForm />
          </Suspense>

          <p className="mt-8 border-t border-hairline pt-5 text-[12px] leading-relaxed text-navy-400">
            Accounts are created by an administrator. If you cannot sign in,
            contact your A TO Z system administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
