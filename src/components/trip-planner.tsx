"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { FloatingInput, FloatingTextarea, GlassCard, Button } from "@/components/ui";
import { Select } from "@/components/select";
import { DateRangePicker } from "@/components/date-range-picker";
import { AirportSearch } from "@/components/airport-search";
import { AirlineSelect } from "@/components/airline-select";
import { countryFor } from "@/lib/airports";
import type { TripFormData, UserProfile } from "@/lib/types";

const DRAFT_KEY = "atlas:tripDraft";

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

function localeCurrency(): string {
  try {
    const lang = navigator.language || "en-GB";
    const loc = new Intl.Locale(lang);
    const region = (loc.maximize?.().region ?? loc.region ?? "").toUpperCase();
    const map: Record<string, string> = {
      US: "USD", GB: "GBP", CH: "CHF", SG: "SGD", AE: "AED", JP: "JPY",
      AU: "AUD", NZ: "NZD", DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR", NL: "EUR", IE: "EUR",
    };
    return map[region] ?? "GBP";
  } catch {
    return "GBP";
  }
}

function buildDefaults(profile: UserProfile): TripFormData {
  return {
    fullName: profile.name,
    email: profile.email,
    phone: profile.phone,
    originCity: profile.defaultAirports[0] ?? "",
    destinations: [""],
    departureDate: "",
    returnDate: "",
    numberOfNights: 0,
    totalBudget: undefined, // blank — optional
    currency: "GBP",
    numberOfTravellers: 1,
    cabinClass: "economy", // Economy is the default
    preferredAirline: "",
    airlineRewards: "",
    hotelStarRating: profile.defaultHotelStars ?? 5,
    locationPreference: (profile.defaultLocationPreference || "city_centre") as TripFormData["locationPreference"],
    amenities: [],
    tripPurpose: "",
    specialRequirements: profile.standingRequirements,
    loyaltyNumbers: "",
  };
}

function nightsBetween(a: string, b: string): number {
  if (!a || !b) return 0;
  const diff = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
  return diff > 0 ? diff : 0;
}

export function TripPlanner({ profile }: { profile: UserProfile }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [draftRestored, setDraftRestored] = useState(false);
  const hydrated = useRef(false);

  const [form, setForm] = useState<TripFormData>(() => buildDefaults(profile));

  // Rehydrate from localStorage (or seed currency from locale) on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        setForm((prev) => ({ ...prev, ...saved }));
        setDraftRestored(true);
      } else {
        setForm((prev) => ({ ...prev, currency: localeCurrency() }));
      }
    } catch {
      /* ignore */
    } finally {
      hydrated.current = true;
    }
  }, []);

  // Debounced persistence to localStorage on every change.
  useEffect(() => {
    if (!hydrated.current || loading) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
      } catch {
        /* ignore */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [form, loading]);

  function set<K extends keyof TripFormData>(key: K, value: TripFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    setForm({ ...buildDefaults(profile), currency: localeCurrency() });
    setDraftRestored(false);
    setStep(1);
  }

  function setDates(from: string, to: string) {
    setForm((prev) => ({
      ...prev,
      departureDate: from,
      returnDate: to,
      numberOfNights: nightsBetween(from, to),
    }));
  }

  const departureCountry = useMemo(() => countryFor(form.originCity), [form.originCity]);
  const destinationCountry = useMemo(
    () => countryFor(form.destinations[0] ?? ""),
    [form.destinations]
  );

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
      const request = fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to generate itineraries");
        return data;
      });
      // Hold the premium loading sequence for a minimum so it feels deliberate,
      // even when results come back faster. Errors still surface immediately.
      const [data] = await Promise.all([
        request,
        new Promise((r) => setTimeout(r, 4500)),
      ]);
      localStorage.removeItem(DRAFT_KEY);
      router.push(`/plans/${data.tripId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  if (loading) return <PlanningScreen />;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="text-center mb-12"
      >
        <p className="text-xs tracking-[0.35em] uppercase text-[var(--text-dim)] mb-4">
          Atlas
        </p>
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight mb-4 leading-[1.05]">
          Where to next,{" "}
          <span className="accent-text">{profile.name?.split(" ")[0] || "traveller"}</span>?
        </h1>
        <p className="text-[var(--text-muted)] max-w-md mx-auto text-lg leading-relaxed">
          Your next trip, planned in moments.
        </p>
      </motion.div>

      <AnimatePresence>
        {draftRestored && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <div className="glass rounded-2xl px-4 py-3 flex items-center justify-between text-sm">
              <span className="text-[var(--text-muted)] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full accent-gradient" />
                Draft restored — picking up where you left off
              </span>
              <button
                onClick={clearDraft}
                className="text-[var(--accent)] hover:underline font-medium"
              >
                Start fresh
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-3 mb-10">
        {([1, 2] as const).map((s) => (
          <button key={s} onClick={() => setStep(s)} className="flex items-center gap-2 text-sm">
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
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            <GlassCard strong className="p-7 space-y-5">
              <SectionTitle>Traveller</SectionTitle>
              <div className="grid sm:grid-cols-2 gap-4">
                <FloatingInput label="Full name" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
                <FloatingInput label="Email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
                <FloatingInput label="Phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} className="sm:col-span-2" />
              </div>
            </GlassCard>

            <GlassCard strong className="p-7 space-y-5">
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

            <GlassCard strong className="p-7 space-y-5">
              <SectionTitle>Dates & party</SectionTitle>
              <DateRangePicker from={form.departureDate} to={form.returnDate} onChange={setDates} />
              <div className="grid sm:grid-cols-3 gap-4">
                <FloatingInput
                  label="Total budget"
                  type="number"
                  min={0}
                  value={form.totalBudget ? form.totalBudget : ""}
                  onChange={(e) => set("totalBudget", e.target.value ? parseFloat(e.target.value) : undefined)}
                />
                <Select
                  label="Currency"
                  value={form.currency}
                  onChange={(v) => set("currency", v)}
                  options={CURRENCIES.map((c) => ({ value: c, label: c }))}
                />
                <Select
                  label="Travellers"
                  value={String(form.numberOfTravellers)}
                  onChange={(v) => set("numberOfTravellers", Number(v))}
                  options={Array.from({ length: 12 }, (_, i) => ({
                    value: String(i + 1),
                    label: `${i + 1} ${i === 0 ? "traveller" : "travellers"}`,
                  }))}
                />
              </div>
              <Select
                label="Cabin class"
                value={form.cabinClass}
                onChange={(v) => set("cabinClass", v as TripFormData["cabinClass"])}
                options={[
                  { value: "economy", label: "Economy" },
                  { value: "business", label: "Business" },
                  { value: "first", label: "First" },
                ]}
              />
            </GlassCard>

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)}>Continue →</Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            <GlassCard strong className="p-7 space-y-5">
              <SectionTitle>Airline</SectionTitle>
              <div className="grid sm:grid-cols-2 gap-4">
                <AirlineSelect
                  label="Preferred airline"
                  value={form.preferredAirline ?? ""}
                  onSelect={(a) => selectAirline(a?.name ?? "")}
                  departureCountry={departureCountry}
                  destinationCountry={destinationCountry}
                />
                <div>
                  <FloatingInput
                    label="Rewards number"
                    value={form.airlineRewards ?? ""}
                    onChange={(e) => set("airlineRewards", e.target.value)}
                  />
                  {savedAirlineMatch && (
                    <p className="mt-1 text-xs text-[var(--accent)]">✓ Applied from your saved profile</p>
                  )}
                  {form.preferredAirline && !savedAirlineMatch && (
                    <p className="mt-1 text-xs text-[var(--text-dim)]">
                      Add it in your{" "}
                      <a href="/profile" className="text-[var(--accent)] hover:underline">profile</a>{" "}
                      to save for next time.
                    </p>
                  )}
                </div>
              </div>
            </GlassCard>

            <GlassCard strong className="p-7 space-y-5">
              <SectionTitle>Accommodation</SectionTitle>
              <div className="grid sm:grid-cols-2 gap-4">
                <Select
                  label="Hotel rating"
                  value={String(form.hotelStarRating)}
                  onChange={(v) => set("hotelStarRating", Number(v))}
                  options={[3, 4, 5].map((s) => ({ value: String(s), label: `${s} stars` }))}
                />
                <Select
                  label="Location preference"
                  value={form.locationPreference}
                  onChange={(v) => set("locationPreference", v as TripFormData["locationPreference"])}
                  options={[
                    { value: "city_centre", label: "City centre" },
                    { value: "airport", label: "Near airport" },
                    { value: "flexible", label: "Flexible" },
                  ]}
                />
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

            <GlassCard strong className="p-7 space-y-5">
              <SectionTitle>Context</SectionTitle>
              <div className="grid sm:grid-cols-2 gap-4">
                <Select
                  label="Purpose of trip"
                  value={form.tripPurpose}
                  onChange={(v) => set("tripPurpose", v)}
                  placeholder="Select…"
                  options={PURPOSES.map((p) => ({ value: p, label: p }))}
                />
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
              <div className="rounded-2xl bg-[var(--danger)]/10 border border-[var(--danger)]/30 px-4 py-3 text-sm text-[var(--danger)]">
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

const PLANNING_STEPS = [
  "Searching available flights...",
  "Checking airline availability...",
  "Finding hotels near your destination...",
  "Calculating transfer times...",
  "Building your itinerary options...",
];

function PlanningScreen() {
  // `done` advances one step at a time; the final step stays active until the
  // results are ready and the page navigates away.
  const [done, setDone] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setDone((d) => Math.min(d + 1, PLANNING_STEPS.length - 1)),
      850
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center px-4">
      {/* Pulsing concierge orb */}
      <div className="relative mb-10 flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.45, 0.12, 0.45] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
          className="absolute w-24 h-24 rounded-full accent-gradient blur-2xl"
        />
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
          className="relative w-20 h-20 rounded-full accent-gradient flex items-center justify-center text-3xl text-[var(--accent-contrast)] shadow-xl"
        >
          ✈
        </motion.div>
      </div>

      <p className="text-xs tracking-[0.3em] uppercase text-[var(--text-dim)] mb-2">
        Your concierge is working
      </p>
      <h2 className="text-2xl font-semibold mb-8">Planning your trip</h2>

      <div className="w-full max-w-sm space-y-3">
        {PLANNING_STEPS.map((s, i) => {
          if (i > done) return null;
          const complete = i < done;
          return (
            <motion.div
              key={s}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-3"
            >
              <span className="w-5 h-5 shrink-0 flex items-center justify-center">
                {complete ? (
                  <motion.svg
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 420, damping: 16 }}
                    className="w-5 h-5 text-[var(--success)]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </motion.svg>
                ) : (
                  <motion.span
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
                    transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }}
                    className="w-2 h-2 rounded-full accent-gradient"
                  />
                )}
              </span>
              <span
                className={`text-sm transition-colors ${
                  complete
                    ? "text-[var(--text-muted)]"
                    : "text-[var(--text)] font-medium"
                }`}
              >
                {s}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-dim)]">
      {children}
    </h2>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[var(--text-muted)] mb-2">{children}</p>;
}
