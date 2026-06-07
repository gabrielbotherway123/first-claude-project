"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function fromISO(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function sameDay(a: Date, b: Date): boolean {
  return toISO(a) === toISO(b);
}
function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function nightsBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000);
}
function fmtShort(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

export function DateRangePicker({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const today = startOfDay(new Date());

  const fromDate = fromISO(from);
  const toDate = fromISO(to);

  const [view, setView] = useState<Date>(() => fromDate ?? new Date());

  // Track the live selection in a ref so back-to-back clicks don't read stale
  // props (state updates are async; the second click would otherwise restart).
  const selRef = useRef<{ from: Date | null; to: Date | null }>({ from: fromDate, to: toDate });
  useEffect(() => {
    selRef.current = { from: fromISO(from), to: fromISO(to) };
  }, [from, to]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const nights = fromDate && toDate ? nightsBetween(fromDate, toDate) : null;

  function pick(day: Date) {
    if (startOfDay(day) < today) return;
    const cur = selRef.current;
    let next: { from: Date | null; to: Date | null };
    if (!cur.from || (cur.from && cur.to)) {
      next = { from: day, to: null };
    } else if (day < cur.from) {
      next = { from: day, to: null };
    } else {
      next = { from: cur.from, to: day };
    }
    selRef.current = next;
    onChange(next.from ? toISO(next.from) : "", next.to ? toISO(next.to) : "");
    if (next.to) setTimeout(() => setOpen(false), 150);
  }

  const label =
    fromDate && toDate
      ? `${fmtShort(fromDate)} – ${fmtShort(toDate)}`
      : fromDate
        ? `${fmtShort(fromDate)} – …`
        : "";

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="field-input peer text-left flex items-center justify-between w-full"
        style={{ paddingTop: "1.45rem", paddingBottom: "0.5rem" }}
      >
        <span className={label ? "" : "text-transparent"}>{label || "."}</span>
        <span className="flex items-center gap-2 text-[var(--text-dim)] shrink-0">
          {nights !== null && (
            <span className="text-xs text-[var(--accent)]">{nights} {nights === 1 ? "night" : "nights"}</span>
          )}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </span>
      </button>
      <span
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
        Travel dates
      </span>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16 }}
            className="absolute z-50 mt-2 glass-strong rounded-2xl p-4 left-0 sm:left-auto"
          >
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => setView((v) => addMonths(v, -1))}
                className="w-8 h-8 rounded-lg hover:bg-[var(--accent-soft)] flex items-center justify-center"
                aria-label="Previous month"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => setView((v) => addMonths(v, 1))}
                className="w-8 h-8 rounded-lg hover:bg-[var(--accent-soft)] flex items-center justify-center"
                aria-label="Next month"
              >
                ›
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-6">
              <MonthGrid month={view} from={fromDate} to={toDate} today={today} onPick={pick} />
              <MonthGrid month={addMonths(view, 1)} from={fromDate} to={toDate} today={today} onPick={pick} />
            </div>
            {nights !== null && (
              <p className="text-center text-sm text-[var(--text-muted)] mt-3">
                {nights} {nights === 1 ? "night" : "nights"} selected
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MonthGrid({
  month,
  from,
  to,
  today,
  onPick,
}: {
  month: Date;
  from: Date | null;
  to: Date | null;
  today: Date;
  onPick: (d: Date) => void;
}) {
  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const startWeekday = (first.getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const arr: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(month.getFullYear(), month.getMonth(), d));
    return arr;
  }, [month]);

  return (
    <div className="w-[15rem]">
      <p className="text-center text-sm font-semibold mb-2">
        {MONTHS[month.getMonth()]} {month.getFullYear()}
      </p>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAYS.map((w) => (
          <span key={w} className="text-center text-[10px] text-[var(--text-dim)] uppercase">
            {w}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const past = startOfDay(d) < today;
          const isFrom = from && sameDay(d, from);
          const isTo = to && sameDay(d, to);
          const inRange = from && to && d > from && d < to;
          const isEdge = isFrom || isTo;
          return (
            <button
              key={i}
              type="button"
              disabled={past}
              onClick={() => onPick(d)}
              className={`h-9 text-sm rounded-lg transition-colors ${
                past
                  ? "text-[var(--text-dim)] opacity-40 cursor-not-allowed"
                  : "hover:bg-[var(--accent-soft)]"
              } ${isEdge ? "accent-gradient text-[var(--accent-contrast)] font-semibold" : ""} ${
                inRange ? "bg-[var(--accent-soft)] rounded-none" : ""
              }`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
