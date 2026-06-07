"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AIRLINES, searchAirlines, suggestAirlines, type Airline } from "@/lib/airlines";

type Row = { type: "divider"; key: string } | { type: "airline"; airline: Airline };

export function AirlineSelect({
  label,
  value,
  onSelect,
  departureCountry,
  destinationCountry,
}: {
  label: string;
  value: string;
  onSelect: (airline: Airline | null) => void;
  departureCountry?: string;
  destinationCountry?: string;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => setQuery(value), [value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const typing = query.trim() !== "" && query.trim() !== value.trim();

  const rows: Row[] = useMemo(() => {
    if (!open) return [];
    if (typing) {
      return searchAirlines(query).map((airline) => ({ type: "airline" as const, airline }));
    }
    const { suggested, rest } = suggestAirlines(departureCountry, destinationCountry);
    const out: Row[] = [];
    if (suggested.length) {
      suggested.forEach((airline) => out.push({ type: "airline", airline }));
      out.push({ type: "divider", key: "div" });
    }
    rest.forEach((airline) => out.push({ type: "airline", airline }));
    return out;
  }, [open, typing, query, departureCountry, destinationCountry]);

  const airlineRows = rows.filter((r): r is { type: "airline"; airline: Airline } => r.type === "airline");

  function choose(a: Airline) {
    setQuery(a.name);
    onSelect(a);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || airlineRows.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % airlineRows.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + airlineRows.length) % airlineRows.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(airlineRows[active].airline);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const suggestedCodes = useMemo(() => {
    const { suggested } = suggestAirlines(departureCountry, destinationCountry);
    return new Set(suggested.map((a) => a.code));
  }, [departureCountry, destinationCountry]);

  let airlineIdx = -1;

  return (
    <div className="relative" ref={boxRef}>
      <div className="relative">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
            if (e.target.value.trim() === "") onSelect(null);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder=" "
          className="field-input peer"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
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
        {open && rows.length > 0 && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.14 }}
            className="absolute z-50 mt-2 w-full glass-strong rounded-2xl overflow-hidden py-1 max-h-72 overflow-y-auto"
          >
            {rows.map((row) => {
              if (row.type === "divider") {
                return (
                  <li key={row.key} aria-hidden className="px-4 py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="h-px flex-1 bg-[var(--border)]" />
                      <span className="text-[10px] uppercase tracking-wider text-[var(--text-dim)]">
                        All airlines
                      </span>
                      <span className="h-px flex-1 bg-[var(--border)]" />
                    </div>
                  </li>
                );
              }
              airlineIdx += 1;
              const i = airlineIdx;
              const a = row.airline;
              const isSuggested = !typing && suggestedCodes.has(a.code);
              return (
                <li key={a.code} role="option" aria-selected={a.name === value}>
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
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-sm truncate">{a.name}</span>
                        {isSuggested && (
                          <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] shrink-0">
                            National carrier
                          </span>
                        )}
                      </span>
                      <span className="block text-xs text-[var(--text-dim)]">
                        {a.program}
                        {a.alliance ? ` · ${a.alliance}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export { AIRLINES };
