"use client";

import { useActionState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { signIn } from "next-auth/react";
import { signInAction, signUpAction, type AuthState } from "@/app/actions/auth";
import { FloatingInput, GlassCard, Button } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";

export function AuthForm({
  mode,
  googleEnabled,
}: {
  mode: "signin" | "signup";
  googleEnabled: boolean;
}) {
  const isSignup = mode === "signup";
  const action = isSignup ? signUpAction : signInAction;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    undefined
  );

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 relative">
      <div className="absolute top-5 right-5">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <span className="w-9 h-9 rounded-xl accent-gradient flex items-center justify-center text-[var(--accent-contrast)] font-bold text-lg">
              A
            </span>
            <span className="text-xl font-semibold tracking-tight">Atlas</span>
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight mb-2">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-[var(--text-muted)] text-sm">
            {isSignup ? "Start planning in seconds." : "Sign in to your account."}
          </p>
        </div>

        <GlassCard strong className="p-7">
          {googleEnabled && (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full mb-4"
                onClick={() => signIn("google", { callbackUrl: "/" })}
              >
                <GoogleIcon />
                Continue with Google
              </Button>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-[var(--border)]" />
                <span className="text-xs text-[var(--text-dim)] uppercase tracking-wider">
                  or
                </span>
                <div className="flex-1 h-px bg-[var(--border)]" />
              </div>
            </>
          )}

          <form action={formAction} className="space-y-4">
            {isSignup && (
              <FloatingInput
                label="Full name"
                name="name"
                autoComplete="name"
                required
                error={state?.fieldErrors?.name?.[0]}
              />
            )}
            <FloatingInput
              label="Email address"
              name="email"
              type="email"
              autoComplete="email"
              required
              error={state?.fieldErrors?.email?.[0]}
            />
            <FloatingInput
              label="Password"
              name="password"
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              error={state?.fieldErrors?.password?.[0]}
            />

            {state?.error && (
              <div className="rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/30 px-4 py-2.5 text-sm text-[var(--danger)]">
                {state.error}
              </div>
            )}

            <Button type="submit" loading={pending} className="w-full !mt-6">
              {isSignup ? "Create account" : "Sign in"}
            </Button>
          </form>
        </GlassCard>

        <p className="text-center text-sm text-[var(--text-muted)] mt-6">
          {isSignup ? "Already have an account? " : "Don't have an account? "}
          <Link
            href={isSignup ? "/sign-in" : "/sign-up"}
            className="text-[var(--accent)] font-medium hover:underline"
          >
            {isSignup ? "Sign in" : "Create one"}
          </Link>
        </p>
      </motion.div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
