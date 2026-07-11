"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Button, FloatingInput } from "@/components/ui";
import { Select } from "@/components/select";
import { AirportSearch } from "@/components/airport-search";
import { extractIata } from "@/lib/airports";
import type { FlightDetail } from "@/lib/types";

interface OfferView {
  offerId: string;
  expiresAt: string;
  totalAmount: number;
  totalCurrency: string;
  airlineName: string;
  airlineCode: string;
  airlineLogo?: string;
  refundable: boolean;
  changeable: boolean;
  liveMode: boolean;
  passengerIds: string[];
  durationMinutes: number;
  flights: FlightDetail[];
}

interface PassengerForm {
  title: string;
  givenName: string;
  familyName: string;
  bornOn: string;
  gender: string;
  email: string;
  phoneNumber: string;
}

export interface FlightsPrefill {
  origin: string;
  destination: string;
  depart: string;
  return: string;
  adults: number;
  cabin: string;
  autoSearch: boolean;
}

const CABIN_OPTIONS = [
  { value: "economy", label: "Economy" },
  { value: "premium_economy", label: "Premium Economy" },
  { value: "business", label: "Business" },
  { value: "first", label: "First" },
];

const TITLE_OPTIONS = [
  { value: "mr", label: "Mr" },
  { value: "mrs", label: "Mrs" },
  { value: "ms", label: "Ms" },
  { value: "miss", label: "Miss" },
];

const GENDER_OPTIONS = [
  { value: "m", label: "Male" },
  { value: "f", label: "Female" },
];

function stripCode(s: string) {
  return s.replace(/\s*\(.*\)/, "");
}

function money(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function splitName(full: string): { given: string; family: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) return { given: full.trim(), family: "" };
  return { given: parts.slice(0, -1).join(" "), family: parts[parts.length - 1] };
}

function emptyPassenger(): PassengerForm {
  return { title: "", givenName: "", familyName: "", bornOn: "", gender: "", email: "", phoneNumber: "" };
}

export function FlightBooking({
  configured,
  liveMode,
  prefill,
  contact,
}: {
  configured: boolean;
  liveMode: boolean;
  prefill: FlightsPrefill;
  contact: { name: string; email: string; phone: string };
}) {
  const router = useRouter();

  const [step, setStep] = useState<"search" | "results" | "checkout">("search");
  const [origin, setOrigin] = useState(prefill.origin);
  const [destination, setDestination] = useState(prefill.destination);
  const [tripType, setTripType] = useState<"return" | "one_way">(prefill.return ? "return" : "one_way");
  const [departDate, setDepartDate] = useState(prefill.depart);
  const [returnDate, setReturnDate] = useState(prefill.return);
  const [adults, setAdults] = useState(String(prefill.adults || 1));
  const [cabin, setCabin] = useState(prefill.cabin || "economy");

  const [searching, setSearching] = useState(false);
  const [offers, setOffers] = useState<OfferView[]>([]);
  const [selected, setSelected] = useState<OfferView | null>(null);
  const [passengers, setPassengers] = useState<PassengerForm[]>([]);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const today = new Date().toISOString().slice(0, 10);

  async function runSearch() {
    const o = extractIata(origin) ?? (origin.trim().length === 3 ? origin.trim().toUpperCase() : null);
    const d = extractIata(destination) ?? (destination.trim().length === 3 ? destination.trim().toUpperCase() : null);
    if (!o || !d) {
      setError("Pick origin and destination airports from the suggestions.");
      return;
    }
    if (!departDate) {
      setError("Choose a departure date.");
      return;
    }
    if (tripType === "return" && !returnDate) {
      setError("Choose a return date (or switch to one-way).");
      return;
    }

    setError("");
    setNotice("");
    setSearching(true);
    setOffers([]);
    try {
      const res = await fetch("/api/flights/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: o,
          destination: d,
          departureDate: departDate,
          returnDate: tripType === "return" ? returnDate : undefined,
          adults: parseInt(adults, 10),
          cabinClass: cabin,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      const found: OfferView[] = data.offers ?? [];
      setOffers(found);
      // Arriving from a chosen itinerary: skip the results list and drop straight
      // onto the pay screen for the best fare — one click from plan to booking.
      // Prefer the cheapest non-stop; fall back to the cheapest overall.
      if (prefill.autoSearch && found.length > 0) {
        const direct = found.filter((o) => o.flights.every((f) => f.layovers.length === 0));
        selectOffer(direct[0] ?? found[0]);
      } else {
        setStep("results");
        if (found.length === 0) {
          setNotice("No fares found for this route and date — try different dates or airports.");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  const didAuto = useRef(false);
  useEffect(() => {
    if (prefill.autoSearch && !didAuto.current) {
      didAuto.current = true;
      runSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectOffer(offer: OfferView) {
    const count = offer.passengerIds.length;
    const { given, family } = splitName(contact.name);
    const forms = Array.from({ length: count }, (_, i) =>
      i === 0
        ? { ...emptyPassenger(), givenName: given, familyName: family, email: contact.email, phoneNumber: contact.phone }
        : emptyPassenger()
    );
    setSelected(offer);
    setPassengers(forms);
    setError("");
    setNotice("");
    setStep("checkout");
  }

  function setPassenger(i: number, key: keyof PassengerForm, value: string) {
    setPassengers((prev) => prev.map((p, idx) => (idx === i ? { ...p, [key]: value } : p)));
  }

  function validatePassengers(): string | null {
    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];
      const who = passengers.length > 1 ? `Passenger ${i + 1}: ` : "";
      if (!p.title) return `${who}select a title.`;
      if (!p.givenName.trim()) return `${who}first name is required.`;
      if (!p.familyName.trim()) return `${who}last name is required.`;
      if (!p.bornOn) return `${who}date of birth is required.`;
      if (p.bornOn >= today) return `${who}date of birth must be in the past.`;
      if (!p.gender) return `${who}select a gender (as shown on the travel document).`;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) return `${who}enter a valid email.`;
      const phone = p.phoneNumber.replace(/[\s()-]/g, "");
      if (!/^\+[1-9]\d{6,14}$/.test(phone)) return `${who}phone must be international format, e.g. +447700900123.`;
    }
    return null;
  }

  async function book() {
    if (!selected) return;
    const invalid = validatePassengers();
    if (invalid) {
      setError(invalid);
      return;
    }
    setError("");
    setNotice("");
    setBooking(true);
    try {
      const res = await fetch("/api/flights/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId: selected.offerId,
          expectedTotal: selected.totalAmount,
          expectedCurrency: selected.totalCurrency,
          cabinClass: cabin,
          passengers: passengers.map((p, i) => ({
            id: selected.passengerIds[i],
            title: p.title,
            gender: p.gender,
            givenName: p.givenName.trim(),
            familyName: p.familyName.trim(),
            bornOn: p.bornOn,
            email: p.email.trim(),
            phoneNumber: p.phoneNumber.replace(/[\s()-]/g, ""),
          })),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/flights/orders/${data.orderId}`);
        return;
      }
      if (data.code === "price_changed" && typeof data.newTotal === "number") {
        setSelected({ ...selected, totalAmount: data.newTotal, totalCurrency: data.newCurrency ?? selected.totalCurrency });
        setNotice(`The fare changed to ${money(data.newTotal, data.newCurrency ?? selected.totalCurrency)}. Review and press Book again to confirm.`);
      } else if (data.code === "offer_expired" || data.code === "offer_mismatch") {
        setError("This fare has expired — run the search again for fresh prices.");
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
        <h1 className="text-2xl font-semibold mb-3">Flights</h1>
        <p className="text-[var(--text-muted)]">
          Flight booking isn&apos;t configured yet — set <code className="font-mono text-sm">DUFFEL_ACCESS_TOKEN</code> to enable it.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <p className="text-xs tracking-[0.3em] uppercase text-[var(--accent)] mb-2">Book direct</p>
        <h1 className="text-3xl font-semibold tracking-tight">Flights</h1>
        <p className="text-[var(--text-muted)] mt-2">Live fares, booked and ticketed inside Atlas.</p>
        {!liveMode && (
          <p className="inline-block mt-3 px-3 py-1 rounded-full text-xs glass text-[var(--text-muted)]">
            Test mode — bookings are real API orders but no tickets are issued and no money moves
          </p>
        )}
      </div>

      {(!prefill.autoSearch || (step === "results" && offers.length === 0 && !searching)) && (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-strong rounded-2xl p-6 mb-6">
        <div className="flex gap-2 mb-5">
          {(["return", "one_way"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTripType(t)}
              className={`px-4 py-1.5 rounded-full text-sm transition-colors border ${
                tripType === t
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]"
                  : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
              }`}
            >
              {t === "return" ? "Return" : "One-way"}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <AirportSearch label="From" value={origin} onChange={setOrigin} />
          <AirportSearch label="To" value={destination} onChange={setDestination} />
        </div>

        <div className={`grid gap-4 mb-4 ${tripType === "return" ? "sm:grid-cols-2" : "sm:grid-cols-1"}`}>
          <FloatingInput label="Depart" type="date" min={today} value={departDate} onChange={(e) => setDepartDate(e.target.value)} />
          {tripType === "return" && (
            <FloatingInput
              label="Return"
              type="date"
              min={departDate || today}
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
            />
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <Select
            label="Passengers"
            value={adults}
            onChange={setAdults}
            options={Array.from({ length: 9 }, (_, i) => ({
              value: String(i + 1),
              label: `${i + 1} adult${i > 0 ? "s" : ""}`,
            }))}
          />
          <Select label="Cabin" value={cabin} onChange={setCabin} options={CABIN_OPTIONS} />
        </div>

        <Button onClick={runSearch} loading={searching} className="w-full">
          {searching ? "Searching live fares…" : "Search flights"}
        </Button>
      </motion.div>
      )}

      {prefill.autoSearch && searching && (
        <div className="flex flex-col items-center justify-center py-16">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="w-10 h-10 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] mb-4"
          />
          <p className="text-[var(--text-muted)]">Finding your fare…</p>
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

      <AnimatePresence>
        {step === "results" && offers.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <p className="text-sm text-[var(--text-muted)] mb-3">
              {offers.length} fare{offers.length === 1 ? "" : "s"} · sorted by price
            </p>
            <div className="space-y-3 mb-8">
              {offers.map((offer, i) => (
                <motion.div
                  key={offer.offerId}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.4) }}
                  className="glass-strong rounded-2xl p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[var(--accent)] glass px-2 py-0.5 rounded-full">
                        {offer.airlineCode}
                      </span>
                      <span className="font-semibold text-sm">{offer.airlineName}</span>
                      {offer.refundable && <span className="text-xs text-[var(--success)]">Refundable</span>}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{money(offer.totalAmount, offer.totalCurrency)}</p>
                      <p className="text-xs text-[var(--text-dim)]">total · {offer.passengerIds.length} pax</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    {offer.flights.map((f, fi) => (
                      <div key={fi} className="flex items-center gap-3 text-sm">
                        <span className="text-xs text-[var(--text-dim)] uppercase w-16 shrink-0">
                          {f.isReturn ? "Return" : "Out"}
                        </span>
                        <span className="font-bold">{f.departure.airport}</span>
                        <span className="text-xs text-[var(--text-dim)]">{f.departure.time}</span>
                        <span className="flex-1 border-t border-dashed border-[var(--border-strong)]" />
                        <span className="text-xs text-[var(--text-dim)]">{f.duration}</span>
                        <span className="flex-1 border-t border-dashed border-[var(--border-strong)]" />
                        <span className="text-xs text-[var(--text-dim)]">{f.arrival.time}</span>
                        <span className="font-bold">{f.arrival.airport}</span>
                        <span className="text-xs text-[var(--accent)] w-14 text-right shrink-0">
                          {f.layovers.length > 0 ? `${f.layovers.length} stop` : ""}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-[var(--text-dim)]">
                      {offer.flights[0]?.airline} {offer.flights[0]?.flightNumber} · fare held until {offer.expiresAt.slice(11, 16)} UTC
                    </span>
                    <Button onClick={() => selectOffer(offer)} className="!px-5 !py-2">
                      Select →
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {step === "checkout" && selected && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="glass-strong rounded-2xl p-6 mb-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-[var(--accent)]">Selected fare</p>
                  <h2 className="text-xl font-semibold mt-1">
                    {stripCode(origin) || selected.flights[0]?.departure.airport} → {stripCode(destination) || selected.flights[0]?.arrival.airport}
                  </h2>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    {selected.airlineName} · {CABIN_OPTIONS.find((c) => c.value === cabin)?.label}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-[var(--text-dim)] uppercase">Total</p>
                  <p className="text-2xl font-bold">{money(selected.totalAmount, selected.totalCurrency)}</p>
                </div>
              </div>
              <div className="space-y-2">
                {selected.flights.map((f, fi) => (
                  <div key={fi} className="glass rounded-xl p-3 text-sm flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-xs text-[var(--text-dim)] uppercase">{f.isReturn ? "Return" : "Outbound"}</span>
                    <span className="font-medium">
                      {f.airline} {f.flightNumber}
                    </span>
                    <span>
                      {f.departure.airport} {f.departure.time} → {f.arrival.airport} {f.arrival.time}
                    </span>
                    <span className="text-xs text-[var(--text-dim)]">
                      {f.departure.date} · {f.duration}{f.layovers.length > 0 ? ` · ${f.layovers.length} stop` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {passengers.map((p, i) => (
              <div key={i} className="glass-strong rounded-2xl p-6 mb-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-4">
                  Passenger {i + 1}
                  {i === 0 ? " · lead" : ""}
                </h3>
                <div className="grid sm:grid-cols-3 gap-4 mb-4">
                  <Select label="Title" value={p.title} onChange={(v) => setPassenger(i, "title", v)} options={TITLE_OPTIONS} placeholder="Title" />
                  <FloatingInput id={`given-${i}`} label="First name" value={p.givenName} onChange={(e) => setPassenger(i, "givenName", e.target.value)} />
                  <FloatingInput id={`family-${i}`} label="Last name" value={p.familyName} onChange={(e) => setPassenger(i, "familyName", e.target.value)} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <FloatingInput id={`dob-${i}`} label="Date of birth" type="date" max={today} value={p.bornOn} onChange={(e) => setPassenger(i, "bornOn", e.target.value)} />
                  <Select label="Gender (travel document)" value={p.gender} onChange={(v) => setPassenger(i, "gender", v)} options={GENDER_OPTIONS} placeholder="Select" />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <FloatingInput id={`email-${i}`} label="Email" type="email" value={p.email} onChange={(e) => setPassenger(i, "email", e.target.value)} />
                  <FloatingInput id={`phone-${i}`} label="Phone (+44…)" type="tel" value={p.phoneNumber} onChange={(e) => setPassenger(i, "phoneNumber", e.target.value)} />
                </div>
              </div>
            ))}

            <div className="glass-strong rounded-2xl p-6 mb-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-[var(--text-dim)] uppercase mb-1">Pay now</p>
                  <p className="text-2xl font-bold text-[var(--accent)]">{money(selected.totalAmount, selected.totalCurrency)}</p>
                  {!selected.liveMode && (
                    <p className="text-xs text-[var(--text-dim)] mt-1">Test booking — no money moves, no ticket is issued.</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={() => { setStep("results"); setError(""); setNotice(""); }}>
                    ← Back to fares
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
