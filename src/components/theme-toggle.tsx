"use client";

import { motion } from "motion/react";
import { useTheme } from "./providers";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className={`relative w-12 h-7 rounded-full glass flex items-center px-1 transition-colors ${className}`}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        className="w-5 h-5 rounded-full accent-gradient flex items-center justify-center text-[10px]"
        style={{ marginLeft: isDark ? 0 : "auto" }}
      >
        {isDark ? "🌙" : "☀️"}
      </motion.span>
    </button>
  );
}
