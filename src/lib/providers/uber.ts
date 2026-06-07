import "server-only";
import { TransferEstimate } from "@/lib/types";
import { cached } from "@/lib/cache";

// Rough airport→city rideshare fares per currency, used when a live Uber
// estimate isn't available (Uber's public price-estimate endpoint was
// restricted/deprecated for new apps, so this is the realistic default).
const HEURISTIC_BASE: Record<string, number> = {
  USD: 45, GBP: 40, EUR: 45, NZD: 70, AUD: 65, SGD: 35,
  AED: 90, JPY: 6000, CHF: 50, CAD: 60,
};

function heuristicTransfer(params: {
  from: string;
  to: string;
  currency: string;
}): TransferEstimate {
  const amount = HEURISTIC_BASE[params.currency] ?? 45;
  return {
    provider: "Estimate",
    product: "Rideshare / taxi",
    amount,
    currency: params.currency,
    from: params.from,
    to: params.to,
    note: "Approximate airport transfer — confirm in-app at travel time.",
    bookingLink: "https://www.uber.com/global/en/price-estimate/",
    live: false,
  };
}

export async function getTransferEstimate(params: {
  from: string; // airport label / IATA
  to: string; // hotel / city label
  currency: string;
  startLat?: number;
  startLng?: number;
  endLat?: number;
  endLng?: number;
}): Promise<TransferEstimate> {
  const token = process.env.UBER_SERVER_TOKEN;
  const haveCoords =
    params.startLat != null && params.startLng != null && params.endLat != null && params.endLng != null;

  if (!token || !haveCoords) {
    return heuristicTransfer(params);
  }

  const cacheKey = `uber:${params.startLat},${params.startLng}->${params.endLat},${params.endLng}`;
  try {
    return await cached(cacheKey, 10 * 60 * 1000, async () => {
      const qs = new URLSearchParams({
        start_latitude: String(params.startLat),
        start_longitude: String(params.startLng),
        end_latitude: String(params.endLat),
        end_longitude: String(params.endLng),
      });
      const res = await fetch(`https://api.uber.com/v1.2/estimates/price?${qs.toString()}`, {
        headers: { Authorization: `Token ${token}`, "Accept-Language": "en_US" },
      });
      if (!res.ok) throw new Error(`Uber estimate failed (${res.status})`);
      const json = await res.json();
      const prices = Array.isArray(json.prices) ? json.prices : [];
      const cheapest = prices.sort(
        (a: { low_estimate: number }, b: { low_estimate: number }) => a.low_estimate - b.low_estimate
      )[0];
      if (!cheapest) throw new Error("Uber returned no products for this route");

      const deepLink = `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${params.startLat}&pickup[longitude]=${params.startLng}&dropoff[latitude]=${params.endLat}&dropoff[longitude]=${params.endLng}`;
      return {
        provider: "Uber",
        product: cheapest.display_name,
        amount: Math.round((cheapest.low_estimate + cheapest.high_estimate) / 2),
        currency: cheapest.currency_code ?? params.currency,
        from: params.from,
        to: params.to,
        note: cheapest.estimate ? `Uber estimate: ${cheapest.estimate}` : undefined,
        bookingLink: deepLink,
        live: true,
      } satisfies TransferEstimate;
    });
  } catch {
    // Endpoint is frequently unavailable — fall back rather than failing the plan.
    return heuristicTransfer(params);
  }
}
