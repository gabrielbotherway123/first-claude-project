"use client";

import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "motion/react";

/* ─── Floating-label text input ─────────────────────────────── */

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export const FloatingInput = forwardRef<HTMLInputElement, InputProps>(
  function FloatingInput({ label, error, id, className = "", ...props }, ref) {
    const inputId = id ?? `f-${label.replace(/\s+/g, "-").toLowerCase()}`;
    return (
      <div className={className}>
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            placeholder=" "
            className="field-input peer"
            {...props}
          />
          <label htmlFor={inputId} className="field-label">
            {label}
          </label>
        </div>
        {error && <p className="mt-1.5 text-xs text-[var(--danger)]">{error}</p>}
      </div>
    );
  }
);

/* ─── Floating-label textarea ───────────────────────────────── */

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
};

export const FloatingTextarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function FloatingTextarea({ label, id, className = "", rows = 3, ...props }, ref) {
    const inputId = id ?? `f-${label.replace(/\s+/g, "-").toLowerCase()}`;
    return (
      <div className={`relative ${className}`}>
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          placeholder=" "
          className="field-input peer"
          {...props}
        />
        <label htmlFor={inputId} className="field-label">
          {label}
        </label>
      </div>
    );
  }
);

/* ─── Labeled select (label always floated) ─────────────────── */

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
};

export const FloatingSelect = forwardRef<HTMLSelectElement, SelectProps>(
  function FloatingSelect({ label, id, className = "", children, ...props }, ref) {
    const inputId = id ?? `f-${label.replace(/\s+/g, "-").toLowerCase()}`;
    return (
      <div className={`relative ${className}`}>
        <select
          ref={ref}
          id={inputId}
          className="field-input appearance-none cursor-pointer pr-9"
          style={{ paddingTop: "1.45rem", paddingBottom: "0.5rem" }}
          {...props}
        >
          {children}
        </select>
        <label
          htmlFor={inputId}
          className="field-label"
          style={{
            top: "0.42rem",
            fontSize: "0.68rem",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "var(--accent)",
            fontWeight: 600,
          }}
        >
          {label}
        </label>
        <svg
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-dim)] pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    );
  }
);

/* ─── Glass card ────────────────────────────────────────────── */

export function GlassCard({
  children,
  className = "",
  strong = false,
  ...props
}: Omit<HTMLMotionProps<"div">, "children"> & {
  strong?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <motion.div
      className={`${strong ? "glass-strong" : "glass"} rounded-2xl ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/* ─── Button ────────────────────────────────────────────────── */

type ButtonProps = Omit<HTMLMotionProps<"button">, "children"> & {
  variant?: "primary" | "ghost" | "outline";
  loading?: boolean;
  children?: React.ReactNode;
};

export function Button({
  children,
  variant = "primary",
  loading = false,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "relative inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary:
      "accent-gradient text-[var(--accent-contrast)] shadow-lg shadow-[var(--accent-soft)] hover:brightness-110",
    ghost: "text-[var(--text-muted)] hover:text-[var(--text)]",
    outline:
      "glass border border-[var(--border-strong)] text-[var(--text)] hover:border-[var(--accent)]",
  };
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      )}
      {children}
    </motion.button>
  );
}
