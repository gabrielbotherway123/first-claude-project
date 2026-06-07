"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

/**
 * Fully custom, accessible single-select dropdown (no native <select>).
 * Keyboard: ↑/↓ move, Home/End jump, Enter/Space select, Esc close, type-ahead.
 */
export function Select({
  label,
  value,
  options,
  onChange,
  placeholder = "Select…",
  className = "",
}: {
  label?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const typeahead = useRef("");
  const typeaheadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listboxId = useId();

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (open) {
      const idx = Math.max(0, options.findIndex((o) => o.value === value));
      setActive(idx);
      requestAnimationFrame(() => listRef.current?.focus());
    }
  }, [open, value, options]);

  function choose(i: number) {
    const opt = options[i];
    if (!opt) return;
    onChange(opt.value);
    setOpen(false);
    btnRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((a) => Math.min(options.length - 1, a + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(active);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        btnRef.current?.focus();
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        if (e.key.length === 1) {
          typeahead.current += e.key.toLowerCase();
          if (typeaheadTimer.current) clearTimeout(typeaheadTimer.current);
          typeaheadTimer.current = setTimeout(() => (typeahead.current = ""), 600);
          const idx = options.findIndex((o) =>
            o.label.toLowerCase().startsWith(typeahead.current)
          );
          if (idx >= 0) setActive(idx);
        }
    }
  }

  return (
    <div className={`relative ${className}`} ref={rootRef}>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="field-input peer text-left flex items-center justify-between w-full"
        style={{ paddingTop: label ? "1.45rem" : "0.85rem", paddingBottom: "0.5rem" }}
      >
        <span className={selected ? "" : "text-[var(--text-dim)]"}>
          {selected ? selected.label : placeholder}
        </span>
        <motion.svg
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-4 h-4 text-[var(--text-dim)] shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>
      {label && (
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
          {label}
        </span>
      )}

      <AnimatePresence>
        {open && (
          <motion.ul
            ref={listRef}
            role="listbox"
            id={listboxId}
            tabIndex={-1}
            aria-activedescendant={`${listboxId}-${active}`}
            onKeyDown={onKeyDown}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.14 }}
            className="absolute z-50 mt-2 w-full glass-strong rounded-2xl overflow-hidden py-1 max-h-72 overflow-y-auto outline-none"
          >
            {options.map((o, i) => {
              const isSel = o.value === value;
              return (
                <li
                  key={o.value}
                  id={`${listboxId}-${i}`}
                  role="option"
                  aria-selected={isSel}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(i)}
                  className={`px-4 py-2.5 cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                    i === active ? "bg-[var(--accent-soft)]" : ""
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-sm truncate">{o.label}</span>
                    {o.sublabel && (
                      <span className="block text-xs text-[var(--text-dim)]">{o.sublabel}</span>
                    )}
                  </span>
                  {isSel && <span className="text-[var(--accent)] text-sm shrink-0">✓</span>}
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
