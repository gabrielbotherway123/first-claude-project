"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { FloatingInput, FloatingTextarea, FloatingSelect, GlassCard, Button } from "@/components/ui";
import { AirportSearch } from "@/components/airport-search";
import { AirlineSelect } from "@/components/airline-select";
import type { TripFormData, UserProfile } from "@/lib/types";

const CURRENCIES = ["GBP", "USD", "EUR", "CHF", "SGD", "AED", "JPY", "AUD", "NZD"];
const AMENITIES = [
  "Gym", "Spa", "Pool", "Restaurant", "Bar", "Concierge",
  "Business Centre", "Room Service", "Parking", "Airport Shuttle",
  "Valet", "Laundry", "High-Speed WiFi",
];
const PURPOSES = [
  "Business Meeting", "Conference / Summit", "Client Entertainment",
  "Board Offsite", "Roadshow", "Due Diligence Visit",
  "Investor Relations", "Team Leadership", "Leisure", "Other",
];

function nightsBetween(a: string, b: string): number | null {
  if (!a || !b) return null;
  const d1 = new Date(a);
  const d2 = new Date(b);
  const diff = Math.round((d2.getTime() - d1.getTime()) / 86_400_000);
  return diff > 0 ? diff : null;
}

export function TripPlanner({ profile }: { profile: UserProfile }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<TripFormData>({
    fullName: profile.name,
    email: profile.email,
    phone: profile.phone,
    originCity: profile.defaultAirports[0] ?? "",
    destinations: [""],
    departureDate: "",
    returnDate: "",
    numberOfNights: 1,
    totalBudget: 5000,
    currency: "GBP",
    numberOfTravellers: 1,
    cabinClass: (profile.defaultCabinClass || "business") as TripFormData["cabinClass"],
    preferredAirline: "",
    airlineRewards: "",
    hotelStarRating: profile.defaultHotelStars ?? 5,
    locationPreference: (profile.defaultLocationPreference ||
      "city_centre") as TripFormData["locationPreference"],
    amenities: [],
    tripPurpose: "",
    specialRequirements: profile.standingRequirements,
    loyaltyNumbers: "",
  });

  function set<K extends keyof TripFormData>(key: K, value: TripFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Auto-compute nights when both dates are set.
  function setDate(key: "departureDate" | "returnDate", value: string) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      const n = nightsBetween(next.departureDate, next.returnDate);
      if (n) next.numberOfNights = n;
      return next;
    });
  }

  const savedAirlineMatch = useMemo(() => {
    if (!form.preferredAirline) return undefined;
    return profile.preferredAirlines.find(
      (a) => a.airline.toLowerCase() === form.preferredAirline!.toLowerCase()
    );
  }, [form.preferredAirline, profile.preferredAirlines]);

  function selectAirline(name: string) {
    const saved = profile.preferredAirlines.find(
      (a) => a.airline.toLowerCase() === name.toLowerCase()
    );
    setForm((prev) => ({
      ...prev,
      preferredAirline: name,
      airlineRewards: saved?.rewardsNumber ?? "",
    }));
  }

  function toggleAmenity(a: string) {
    set(
      "amenities",
      form.amenities.includes(a)
        ? form.amenities.filter((x) => x !== a)
        : [...form.amenities, a]
    );
  }

  async function submit() {
    setError("");
    if (!form.originCity.trim()) return setError("Please choose an origin airport.");
    if (form.destinations.some((d) => !d.trim()))
      return setError("Please fill in all destination fields.");
    if (!form.departureDate || !form.returnDate)
      return setError("Please choose your travel dates.");
    if (!form.tripPurpose) return setError("Please select the purpose of your trip.");

    setLoading(true);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate itineraries");
      router.push(`/plans/${data.tripId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  if (loading) return <PlanningScreen />;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10"
      >
        <p className="text-xs tracking-[0.3em] uppercase text-[var(--accent)] mb-3">
          Bespoke Travel
        </p>
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight mb-3">
          Where to next,{" "}
          <span className="accent-text">{profile.name?.split(" ")[0] || "traveller"}</span>?
        </h1>
        <p className="text-[var(--text-muted)] max-w-lg mx-auto">
          Tell us about your journey and receive five tailored itineraries — flights and
          accommodation, ready to book.
        </p>
      </motion.div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-3 mb-8">
        {([1, 2] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStep(s)}
            className="flex items-center gap-2 text-sm"
          >
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === s
                  ? "accent-gradient text-[var(--accent-contrast)]"
                  : "glass text-[var(--text-muted)]"
              }`}
            >
              {s}
            </span>
            <span className={step === s ? "text-[var(--text)]" : "text-[var(--text-dim)]"}>
              {s === 1 ? "Journey" : "Preferences"}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3 }}
            className="space-y-5"
          >
            <GlassCard strong className="p-6 space-y-4">
              <SectionTitle>Traveller</SectionTitle>
              <div className="grid sm:grid-cols-2 gap-4">
                <FloatingInput label="Full name" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
                <FloatingInput label="Email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
                <FloatingInput label="Phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} className="sm:col-span-2" />
              </div>
            </GlassCard>

            <GlassCard strong className="p-6 space-y-4">
              <SectionTitle>Route</SectionTitle>

              {profile.defaultAirports.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {profile.defaultAirports.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => set("originCity", a)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                        form.originCity === a
                          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]"
                          : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
                      }`}
                    >
                      ✈ {a}
                    </button>
                  ))}
                </div>
              )}

              <AirportSearch label="Origin airport" value={form.originCity} onChange={(v) => set("originCity", v)} />

              <div className="space-y-2">
                {form.destinations.map((d, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <AirportSearch
                        label={`Destination ${i + 1}`}
                        value={d}
                        onChange={(v) =>
                          set("destinations", form.destinations.map((x, idx) => (idx === i ? v : x)))
                        }
                      />
                    </div>
                    {form.destinations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => set("destinations", form.destinations.filter((_, idx) => idx !== i))}
                        className="mt-3 text-[var(--text-dim)] hover:text-[var(--danger)] text-xl px-1"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => set("destinations", [...form.destinations, ""])}
                  className="text-sm text-[var(--accent)] hover:underline"
                >
                  + Add destination
                </button>
              </div>
            </GlassCard>

            <GlassCard strong className="p-6 space-y-4">
              <SectionTitle>Dates & party</SectionTitle>
              <div className="grid sm:grid-cols-3 gap-4">
                <FloatingInput label="Departure" type="date" value={form.departureDate} onChange={(e) => setDate("departureDate", e.target.value)} />
                <FloatingInput label="Return" type="date" value={form.returnDate} onChange={(e) => setDate("returnDate", e.target.value)} />
                <FloatingInput label="Nights" type="number" min={1} value={form.numberOfNights} onChange={(e) => set("numberOfNights", parseInt(e.target.value) || 1)} />
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <FloatingInput label="Total budget" type="number" min={0} value={form.totalBudget} onChange={(e) => set("totalBudget", parseFloat(e.target.value) || 0)} />
                <FloatingSelect label="Currency" value={form.currency} onChange={(e) => set("currency", e.target.value)}>
                  {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                </FloatingSelect>
                <FloatingInput label="Travellers" type="number" min={1} max={20} value={form.numberOfTravellers} onChange={(e) => set("numberOfTravellers", parseInt(e.target.value) || 1)} />
              </div>
              <div>
                <FieldLabel>Cabin class</FieldLabel>
                <Segmented
                  options={[
                    { value: "economy", label: "Economy" },
                    { value: "business", label: "Business" },
                    { value: "first", label: "First" },
                  ]}
                  value={form.cabinClass}
                  onChange={(v) => set("cabinClass", v as TripFormData["cabinClass"])}
                />
              </div>
            </GlassCard>

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)}>Continue →</Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.3 }}
            className="space-y-5"
          >
            <GlassCard strong className="p-6 space-y-4">
              <SectionTitle>Airline</SectionTitle>
              <div className="grid sm:grid-cols-2 gap-4">
                <AirlineSelect
                  label="Preferred airline"
                  value={form.preferredAirline ?? ""}
                  onSelect={(a) => selectAirline(a?.name ?? "")}
                />
                <div>
                  <FloatingInput
                    label="Rewards number"
                    value={form.airlineRewards ?? ""}
                    onChange={(e) => set("airlineRewards", e.target.value)}
                    placeholder=" "
                  />
                  {savedAirlineMatch && (
                    <p className="mt-1 text-xs text-[var(--accent)]">
                      ✓ Applied from your saved profile
                    </p>
                  )}
                  {form.preferredAirline && !savedAirlineMatch && (
                    <p className="mt-1 text-xs text-[var(--text-dim)]">
                      Add it in your{" "}
                      <a href="/profile" className="text-[var(--accent)] hover:underline">
                        profile
                      </a>{" "}
                      to save for next time.
                    </p>
                  )}
                </div>
              </div>
            </GlassCard>

            <GlassCard strong className="p-6 space-y-4">
              <SectionTitle>Accommodation</SectionTitle>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <FieldLabel>Hotel rating</FieldLabel>
                  <Segmented
                    options={[3, 4, 5].map((s) => ({ value: String(s), label: `${s}★` }))}
                    value={String(form.hotelStarRating)}
                    onChange={(v) => set("hotelStarRating", Number(v) || 5)}
                  />
                </div>
                <FloatingSelect
                  label="Location preference"
                  value={form.locationPreference}
                  onChange={(e) => set("locationPreference", e.target.value as TripFormData["locationPreference"])}
                >
                  <option value="city_centre">City centre</option>
                  <option value="airport">Near airport</option>
                  <option value="flexible">Flexible</option>
                </FloatingSelect>
              </div>
              <div>
                <FieldLabel>Preferred amenities</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {AMENITIES.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleAmenity(a)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                        form.amenities.includes(a)
                          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]"
                          : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </GlassCard>

            <GlassCard strong className="p-6 space-y-4">
              <SectionTitle>Context</SectionTitle>
              <div className="grid sm:grid-cols-2 gap-4">
                <FloatingSelect label="Purpose of trip" value={form.tripPurpose} onChange={(e) => set("tripPurpose", e.target.value)}>
                  <option value="">Select…</option>
                  {PURPOSES.map((p) => <option key={p}>{p}</option>)}
                </FloatingSelect>
                <FloatingInput label="Other loyalty numbers" value={form.loyaltyNumbers ?? ""} onChange={(e) => set("loyaltyNumbers", e.target.value)} />
              </div>
              <FloatingTextarea
                label="Special requirements"
                rows={3}
                value={form.specialRequirements ?? ""}
                onChange={(e) => set("specialRequirements", e.target.value)}
              />
            </GlassCard>

            {error && (
              <div className="rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/30 px-4 py-3 text-sm text-[var(--danger)]">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between">
              <button onClick={() => setStep(1)} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
                ← Back
              </button>
              <Button onClick={submit}>Create itineraries →</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PlanningScreen() {
  const steps = [
    "Searching flights",
    "Comparing fares & schedules",
    "Curating accommodation",
    "Assembling five itineraries",
  ];
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
        className="w-16 h-16 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] mb-8"
      />
      <p className="text-xs tracking-[0.3em] uppercase text-[var(--accent)] mb-2">One moment</p>
      <h2 className="text-2xl font-semibold mb-8">Designing your journey</h2>
      <div className="space-y-2.5">
        {steps.map((s, i) => (
          <motion.div
            key={s}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.6 }}
            className="flex items-center gap-3 text-sm text-[var(--text-muted)]"
          >
            <span className="w-1.5 h-1.5 rounded-full accent-gradient" />
            {s}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--accent)]">
      {children}
    </h2>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[var(--text-muted)] mb-2">{children}</p>;
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`relative px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
              selected
                ? "border-[var(--accent)] text-[var(--text)]"
                : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
            }`}
          >
            {selected && (
              <motion.span
                layoutId={`tp-seg-${options.map((x) => x.value).join("")}`}
                className="absolute inset-0 rounded-xl bg-[var(--accent-soft)]"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
