"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Automatically adds the trip to Google Calendar — no button. On first view of a
 * confirmation it opens Google's pre-filled "add event" page in a new tab (once
 * per order, tracked in localStorage). If the browser blocks the pop-up, a small
 * fallback link is shown so the trip can still be added.
 */
export function AutoCalendar({ orderId, url }: { orderId: string; url: string }) {
  const [blocked, setBlocked] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const key = `atlas:cal:${orderId}`;
    try {
      if (localStorage.getItem(key)) return; // already added on a previous view
      const win = window.open(url, "_blank", "noopener,noreferrer");
      if (win) {
        localStorage.setItem(key, "1");
      } else {
        setBlocked(true); // pop-up blocked — offer a manual link
      }
    } catch {
      setBlocked(true);
    }
  }, [orderId, url]);

  if (!blocked) {
    return (
      <p className="text-xs text-[var(--text-dim)] mt-2">Added to your Google Calendar.</p>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-[var(--accent)] hover:underline mt-2 inline-block"
    >
      Add this trip to Google Calendar
    </a>
  );
}
