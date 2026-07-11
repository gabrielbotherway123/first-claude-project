"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Button, FloatingInput, FloatingTextarea } from "@/components/ui";

interface RateView {
  rateId: string;
  roomName: string;
  totalAmount: number;
  totalAmountRaw: string;
  totalCurrency: string;
  boardType?: string;
  payAtAccommodation: boolean;
  freeCancellationBefore?: string;
}

interface GuestForm {
  givenName: string;
  familyName: string;
}

export interface HotelCheckoutParams {
  accommodationId: string;
  city: string;
  checkIn: string;
  checkOut: string;
  adults: number;
}

function money(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function boardLabel(boardType?: string): string {
  if (!boardType) return "";
  return boardType
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

function emptyGuest(): GuestForm {
  return { givenName: "", familyName: "" };
}

export function HotelBooking({
  configured,
  params,
  contact,
}: {
  configured: boolean;
  params: HotelCheckoutParams;
  contact: { name: string; email: string; phone: string };
}) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [accommodationName, setAccommodationName] = useState("");
  const [address, setAddress] = useState("");
  const [rates, setRates] = useState<RateView[]>([]);
  const [selected, setSelected] = useState<RateView | null>(null);

  const [guests, setGuests] = useState<GuestForm[]>([]);
  const [email, setEmail] = useState(contact.email);
  const [phoneNumber, setPhoneNumber] = useState(contact.phone);
  const [specialRequests, setSpecialRequests] = useState("");

  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/hotels/rates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error ?? "Failed to load rates");
        setAccommodationName(data.accommodationName ?? "");
        setAddress(data.address ?? "");
        setRates(data.rates ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load rates");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured]);

  function selectRate(rate: RateView) {
    const parts = contact.name.trim().split(/\s+/);
    const given = parts.length > 1 ? parts.slice(0, -1).join(" ") : contact.name;
    const family = parts.length > 1 ? parts[parts.length - 1] : "";
    setSelected(rate);
    setGuests([{ givenName: given, familyName: family }, ...Array.from({ length: 0 }, emptyGuest)]);
    setError("");
    setNotice("");
  }

  function setGuest(i: number, key: keyof GuestForm, value: string) {
    setGuests((prev) => prev.map((g, idx) => (idx === i ? { ...g, [key]: value } : g)));
  }

  function addGuest() {
    setGuests((prev) => (prev.length >= params.adults ? prev : [...prev, emptyGuest()]));
  }

  function validate(): string | null {
    if (!selected) return "Select a rate first.";
    for (let i = 0; i < guests.length; i++) {
      const g = guests[i];
      const who = guests.length > 1 ? `Guest ${i + 1}: ` : "";
      if (!g.givenName.trim()) return `${who}first name is required.`;
      if (!g.familyName.trim()) return `${who}last name is required.`;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email.";
    const phone = phoneNumber.replace(/[\s()-]/g, "");
    if (!/^\+[1-9]\d{6,14}$/.test(phone)) return "Phone must be international format, e.g. +447700900123.";
    return null;
  }

  async function book() {
    if (!selected) return;
    const invalid = validate();
    if (invalid) {
      setError(invalid);
      return;
    }
    setError("");
    setNotice("");
    setBooking(true);
    try {
      const res = await fetch("/api/hotels/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rateId: selected.rateId,
          expectedTotal: selected.totalAmount,
          expectedCurrency: selected.totalCurrency,
          accommodationName,
          city: params.city,
          checkInDate: params.checkIn,
          checkOutDate: params.checkOut,
          roomName: selected.roomName,
          email: email.trim(),
          phoneNumber: phoneNumber.replace(/[\s()-]/g, ""),
          guests: guests.map((g) => ({ givenName: g.givenName.trim(), familyName: g.familyName.trim() })),
          specialRequests: specialRequests.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/hotels/orders/${data.orderId}`);
        return;
      }
      if (data.code === "price_changed" && typeof data.newTotal === "number") {
        setSelected({ ...selected, totalAmount: data.newTotal, totalCurrency: data.newCurrency ?? selected.totalCurrency });
        setNotice(`The price changed to ${money(data.newTotal, data.newCurrency ?? selected.totalCurrency)}. Review and press Book again to confirm.`);
      } else if (data.code === "rate_expired") {
        setError("This rate has expired — refresh the page to search again.");
      } else {
        setError(data.error ?? "Booking failed");
      }
      setBooking(false);
    } catch {
      setError("Booking failed — check your connection and try again.");
      setBooking(false);
    }
  }

  if (!configured) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold mb-3">Hotel booking</h1>
        <p className="text-[var(--text-muted)]">
          Hotel booking isn&apos;t configured yet — set <code className="font-mono text-sm">DUFFEL_ACCESS_TOKEN</code> to enable it.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <p className="text-xs tracking-[0.3em] uppercase text-[var(--accent)] mb-2">Book direct</p>
        <h1 className="text-3xl font-semibold tracking-tight">{accommodationName || "Loading…"}</h1>
        {address && <p className="text-[var(--text-muted)] mt-2">{address}</p>}
        <p className="text-sm text-[var(--text-dim)] mt-2">
          {params.checkIn} → {params.checkOut} · {params.adults} guest{params.adults === 1 ? "" : "s"}
        </p>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="w-10 h-10 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] mb-4"
          />
          <p className="text-[var(--text-muted)]">Loading live rates…</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/30 px-4 py-3 text-sm text-[var(--danger)] mb-4">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-xl bg-[var(--accent-soft)] border border-[var(--accent)]/40 px-4 py-3 text-sm mb-4">{notice}</div>
      )}

      {!loading && !selected && rates.length > 0 && (
        <div className="space-y-3">
          {rates.map((r) => (
            <motion.div
              key={r.rateId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-strong rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <p className="font-semibold">{r.roomName}</p>
                <p className="text-xs text-[var(--text-dim)] mt-1">
                  {boardLabel(r.boardType)}
                  {r.payAtAccommodation ? " · Pay at property" : " · Pay now"}
                  {r.freeCancellationBefore ? ` · Free cancellation before ${r.freeCancellationBefore.slice(0, 10)}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-lg font-bold">{money(r.totalAmount, r.totalCurrency)}</p>
                <Button onClick={() => selectRate(r)} className="!px-5 !py-2">
                  Select →
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="glass-strong rounded-2xl p-6 mb-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-[var(--accent)]">Selected room</p>
                  <h2 className="text-xl font-semibold mt-1">{selected.roomName}</h2>
                  <p className="text-sm text-[var(--text-muted)] mt-1">{boardLabel(selected.boardType)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-[var(--text-dim)] uppercase">Total</p>
                  <p className="text-2xl font-bold">{money(selected.totalAmount, selected.totalCurrency)}</p>
                </div>
              </div>
            </div>

            {guests.map((g, i) => (
              <div key={i} className="glass-strong rounded-2xl p-6 mb-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-4">
                  Guest {i + 1}
                  {i === 0 ? " · lead" : ""}
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <FloatingInput
                    id={`given-${i}`}
                    label="First name"
                    value={g.givenName}
                    onChange={(e) => setGuest(i, "givenName", e.target.value)}
                  />
                  <FloatingInput
                    id={`family-${i}`}
                    label="Last name"
                    value={g.familyName}
                    onChange={(e) => setGuest(i, "familyName", e.target.value)}
                  />
                </div>
              </div>
            ))}
            {guests.length < params.adults && (
              <button
                type="button"
                onClick={addGuest}
                className="text-sm text-[var(--accent)] hover:underline mb-4"
              >
                + Add another guest
              </button>
            )}

            <div className="glass-strong rounded-2xl p-6 mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-4">Contact</h3>
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <FloatingInput label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <FloatingInput label="Phone (+44…)" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
              </div>
              <FloatingTextarea
                label="Special requests (optional)"
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
              />
            </div>

            <div className="glass-strong rounded-2xl p-6 mb-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-[var(--text-dim)] uppercase mb-1">Pay now</p>
                  <p className="text-2xl font-bold text-[var(--accent)]">{money(selected.totalAmount, selected.totalCurrency)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={() => { setSelected(null); setError(""); setNotice(""); }}>
                    ← Back to rates
                  </Button>
                  <Button onClick={book} loading={booking}>
                    {booking ? "Booking…" : "Book now"}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
