"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/theme-toggle";

const LINKS = [
  { href: "/", label: "Plan" },
  { href: "/trips", label: "My Trips" },
  { href: "/profile", label: "Profile" },
];

export function AppNav({
  name,
  email,
  image,
}: {
  name: string;
  email: string;
  image: string | null;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const initials = (name || email).slice(0, 1).toUpperCase();

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <header className="sticky top-0 z-40 px-4 sm:px-6 py-3">
      <nav className="glass-strong rounded-2xl max-w-6xl mx-auto px-4 sm:px-5 py-2.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="w-8 h-8 rounded-lg accent-gradient flex items-center justify-center text-[var(--accent-contrast)] font-bold">
            A
          </span>
          <span className="font-semibold tracking-tight hidden sm:block">Atlas</span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          {LINKS.map((l) => {
            const activeLink =
              l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`relative px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  activeLink
                    ? "text-[var(--text)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                {activeLink && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-lg bg-[var(--accent-soft)]"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative">{l.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="w-9 h-9 rounded-full overflow-hidden border border-[var(--border-strong)] flex items-center justify-center accent-gradient text-[var(--accent-contrast)] font-semibold text-sm"
              aria-label="Account menu"
            >
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-56 glass-strong rounded-xl overflow-hidden py-1"
                >
                  <div className="px-4 py-3 border-b border-[var(--border)]">
                    <p className="text-sm font-medium truncate">{name || "Traveller"}</p>
                    <p className="text-xs text-[var(--text-dim)] truncate">{email}</p>
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--accent-soft)] transition-colors"
                  >
                    Profile & preferences
                  </Link>
                  <Link
                    href="/trips"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--accent-soft)] transition-colors"
                  >
                    My trips
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/sign-in" })}
                    className="w-full text-left px-4 py-2.5 text-sm text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors"
                  >
                    Sign out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </nav>
    </header>
  );
}
