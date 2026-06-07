"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AIRLINES, searchAirlines, type Airline } from "@/lib/airlines";

export function AirlineSelect({
  label,
  value,
  onSelect,
}: {
  label: string;
  value: string;
  onSelect: (airline: Airline | null) => void;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => setQuery(value), [value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const results = open ? searchAirlines(query) : [];

  function choose(a: Airline) {
    setQuery(a.name);
    onSelect(a);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={boxRef}>
      <div className="relative">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (e.target.value.trim() === "") onSelect(null);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder=" "
          className="field-input peer"
          autoComplete="off"
        />
        <label className="field-label">{label}</label>
        <svg
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-dim)] pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.14 }}
            className="absolute z-50 mt-2 w-full glass-strong rounded-xl overflow-hidden py-1 max-h-72 overflow-y-auto"
          >
            {results.map((a, i) => (
              <li key={a.code}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(a)}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                    i === active ? "bg-[var(--accent-soft)]" : ""
                  }`}
                >
                  <span className="font-mono text-xs font-bold text-[var(--accent)] w-8 shrink-0">
                    {a.code}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm text-[var(--text)] truncate">{a.name}</span>
                    <span className="block text-xs text-[var(--text-dim)]">
                      {a.program}
                      {a.alliance ? ` · ${a.alliance}` : ""}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export { AIRLINES };
