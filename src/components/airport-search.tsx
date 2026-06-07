"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Airport } from "@/lib/airports";

export function AirportSearch({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<Airport[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const skipNextFetch = useRef(false);

  // Keep local query in sync when parent value changes externally (e.g. chips).
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Debounced live search.
  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/airports?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data.results ?? []);
        setActive(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [query]);

  // Close on outside click.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function select(a: Airport) {
    const formatted = `${a.city} ${a.name} (${a.iata})`;
    skipNextFetch.current = true;
    setQuery(formatted);
    onChange(formatted);
    setOpen(false);
    setResults([]);
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
      select(results[active]);
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
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => query && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder=" "
          className="field-input peer"
          autoComplete="off"
        />
        <label className="field-label">{label}</label>
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]">
          {loading ? (
            <span className="block w-4 h-4 rounded-full border-2 border-[var(--text-dim)] border-t-transparent animate-spin" />
          ) : (
            "✈"
          )}
        </span>
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
              <li key={a.iata}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => select(a)}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                    i === active ? "bg-[var(--accent-soft)]" : ""
                  }`}
                >
                  <span className="font-mono text-xs font-bold text-[var(--accent)] w-10 shrink-0">
                    {a.iata}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm text-[var(--text)] truncate">
                      {a.city} · {a.name}
                    </span>
                    <span className="block text-xs text-[var(--text-dim)]">
                      {a.country}
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
