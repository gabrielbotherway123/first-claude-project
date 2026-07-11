// Approximate FX for DISPLAY only — units per 1 USD. Bookings still settle in the
// provider's own currency; this just lets Atlas show one consistent currency (the
// one the traveller selected) across the itinerary and checkout.
const FX: Record<string, number> = {
  USD: 1,
  GBP: 0.79,
  EUR: 0.92,
  CHF: 0.88,
  SGD: 1.34,
  AED: 3.67,
  JPY: 150,
  AUD: 1.52,
  NZD: 1.66,
  CAD: 1.36,
};

/** Convert an amount between currencies for display. Falls back to the input
 *  amount when either currency is unknown. */
export function convertCurrency(amount: number, from: string, to: string): number {
  const f = FX[from?.toUpperCase()];
  const t = FX[to?.toUpperCase()];
  if (!f || !t || from?.toUpperCase() === to?.toUpperCase()) return amount;
  return (amount / f) * t;
}

/** True when we have an FX rate for the currency. */
export function knownCurrency(code: string): boolean {
  return Boolean(FX[code?.toUpperCase()]);
}
