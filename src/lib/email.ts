import { BookingDetails } from "./types";
import type { FlightDetail } from "./types";

/** Escapes user-controlled text before interpolating it into an HTML email body. */
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/* ─── Flight order (Duffel) confirmation ────────────────────── */

export interface FlightOrderEmail {
  toEmail: string;
  toName: string;
  pnr: string;
  airlineName: string;
  totalAmount: number;
  currency: string;
  liveMode: boolean;
  flights: FlightDetail[];
}

export async function sendFlightOrderConfirmation(order: FlightOrderEmail): Promise<void> {
  const legs = order.flights
    .map(
      (f) =>
        `${f.isReturn ? "Return" : "Outbound"}: ${f.airline} ${f.flightNumber} — ` +
        `${f.departure.airport} ${f.departure.time} → ${f.arrival.airport} ${f.arrival.time} (${f.departure.date})`
    )
    .join("\n");

  const text = `YOUR FLIGHT IS BOOKED — ${order.pnr}

Dear ${order.toName},

Your ${order.airlineName} booking is confirmed.
Airline reference (PNR): ${order.pnr}

${legs}

Total paid: ${order.currency} ${order.totalAmount.toLocaleString()}
${order.liveMode ? "" : "\nThis is a TEST booking — no real ticket was issued and no money moved.\n"}
Atlas · Private Travel
`;

  const legsHtml = order.flights
    .map(
      (f) => `
    <div style="margin-bottom:12px">
      <p style="color:#718096;font-size:12px;margin:0 0 4px;letter-spacing:1px">${f.isReturn ? "RETURN" : "OUTBOUND"}</p>
      <p style="color:#0a1628;font-size:15px;font-weight:bold;margin:0">${esc(f.airline)} ${esc(f.flightNumber)}</p>
      <p style="color:#4a5568;margin:4px 0">${esc(f.departure.airport)} ${esc(f.departure.time)} → ${esc(f.arrival.airport)} ${esc(f.arrival.time)} · ${esc(f.departure.date)}</p>
      <p style="color:#718096;font-size:13px;margin:0">${esc(f.duration)}${f.layovers.length > 0 ? ` · via ${esc(f.layovers.map((l) => l.airport).join(", "))}` : " · Direct"}</p>
    </div>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fdfaf5;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:24px">
    <tr>
      <td style="background:#0a1628;padding:32px;text-align:center;border-radius:8px 8px 0 0">
        <p style="color:#c9a84c;font-size:12px;letter-spacing:4px;margin:0 0 8px">ATLAS</p>
        <h1 style="color:#ffffff;font-size:24px;margin:0">Your flight is booked</h1>
        <p style="color:#c9a84c;font-size:18px;margin:8px 0 0;letter-spacing:2px">${esc(order.pnr)}</p>
      </td>
    </tr>
    <tr>
      <td style="background:#ffffff;padding:32px;border:1px solid #e8e4d9;border-top:none">
        <p style="color:#0a1628;font-size:16px;margin:0 0 24px">Dear ${esc(order.toName)},</p>
        <p style="color:#4a5568;margin:0 0 24px">Your ${esc(order.airlineName)} booking is confirmed. Quote the airline reference <strong>${esc(order.pnr)}</strong> at check-in.</p>
        <div style="background:#fdfaf5;border:1px solid #e8e4d9;border-radius:8px;padding:20px;margin-bottom:24px">
          ${legsHtml}
        </div>
        <div style="background:#0a1628;border-radius:8px;padding:20px;margin-bottom:24px">
          <div style="display:flex;justify-content:space-between">
            <span style="color:#c9a84c;font-weight:bold">Total paid</span>
            <span style="color:#c9a84c;font-weight:bold">${esc(order.currency)} ${order.totalAmount.toLocaleString()}</span>
          </div>
        </div>
        ${order.liveMode ? "" : `<p style="color:#b7791f;font-size:13px;margin:0 0 12px">This is a test booking — no real ticket was issued and no money moved.</p>`}
        <p style="color:#718096;font-size:13px;margin:0">Questions? Contact us at travel@yourcompany.com</p>
      </td>
    </tr>
    <tr>
      <td style="padding:16px;text-align:center">
        <p style="color:#718096;font-size:12px;margin:0">Atlas · Private Travel</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.length > 0) {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Atlas Travel <noreply@yourdomain.com>",
      to: [order.toEmail],
      subject: `Your flight is booked — ${order.pnr}`,
      html,
      text,
    });
  } else {
    console.log("=== FLIGHT ORDER CONFIRMATION EMAIL ===");
    console.log(`To: ${order.toName} <${order.toEmail}>`);
    console.log(text);
    console.log("=== END EMAIL ===");
  }
}

/* ─── Hotel order (Duffel Stays) confirmation ───────────────── */

export interface HotelOrderEmail {
  toEmail: string;
  toName: string;
  reference: string;
  accommodationName: string;
  city: string;
  checkInDate: string;
  checkOutDate: string;
  totalAmount: number;
  currency: string;
  liveMode: boolean;
}

export async function sendHotelOrderConfirmation(order: HotelOrderEmail): Promise<void> {
  const text = `YOUR STAY IS BOOKED — ${order.reference || "pending"}

Dear ${order.toName},

Your booking at ${order.accommodationName}, ${order.city} is confirmed.
Check-in: ${order.checkInDate}
Check-out: ${order.checkOutDate}

Total paid: ${order.currency} ${order.totalAmount.toLocaleString()}
${order.liveMode ? "" : "\nThis is a TEST booking — no real reservation was made and no money moved.\n"}
Atlas · Private Travel
`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fdfaf5;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:24px">
    <tr>
      <td style="background:#0a1628;padding:32px;text-align:center;border-radius:8px 8px 0 0">
        <p style="color:#c9a84c;font-size:12px;letter-spacing:4px;margin:0 0 8px">ATLAS</p>
        <h1 style="color:#ffffff;font-size:24px;margin:0">Your stay is booked</h1>
        <p style="color:#c9a84c;font-size:18px;margin:8px 0 0;letter-spacing:2px">${esc(order.reference || "Pending")}</p>
      </td>
    </tr>
    <tr>
      <td style="background:#ffffff;padding:32px;border:1px solid #e8e4d9;border-top:none">
        <p style="color:#0a1628;font-size:16px;margin:0 0 24px">Dear ${esc(order.toName)},</p>
        <p style="color:#4a5568;margin:0 0 24px">Your booking is confirmed.</p>
        <div style="background:#fdfaf5;border:1px solid #e8e4d9;border-radius:8px;padding:20px;margin-bottom:24px">
          <p style="color:#0a1628;font-size:15px;font-weight:bold;margin:0">${esc(order.accommodationName)}</p>
          <p style="color:#4a5568;margin:4px 0">${esc(order.city)}</p>
          <p style="color:#718096;font-size:13px;margin:4px 0">${esc(order.checkInDate)} → ${esc(order.checkOutDate)}</p>
        </div>
        <div style="background:#0a1628;border-radius:8px;padding:20px;margin-bottom:24px">
          <div style="display:flex;justify-content:space-between">
            <span style="color:#c9a84c;font-weight:bold">Total paid</span>
            <span style="color:#c9a84c;font-weight:bold">${esc(order.currency)} ${order.totalAmount.toLocaleString()}</span>
          </div>
        </div>
        ${order.liveMode ? "" : `<p style="color:#b7791f;font-size:13px;margin:0 0 12px">This is a test booking — no real reservation was made and no money moved.</p>`}
        <p style="color:#718096;font-size:13px;margin:0">Questions? Contact us at travel@yourcompany.com</p>
      </td>
    </tr>
    <tr>
      <td style="padding:16px;text-align:center">
        <p style="color:#718096;font-size:12px;margin:0">Atlas · Private Travel</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.length > 0) {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Atlas Travel <noreply@yourdomain.com>",
      to: [order.toEmail],
      subject: `Your stay is booked — ${order.reference || order.accommodationName}`,
      html,
      text,
    });
  } else {
    console.log("=== HOTEL ORDER CONFIRMATION EMAIL ===");
    console.log(`To: ${order.toName} <${order.toEmail}>`);
    console.log(text);
    console.log("=== END EMAIL ===");
  }
}

export async function sendBookingConfirmation(booking: BookingDetails): Promise<void> {
  const html = buildEmailHtml(booking);
  const text = buildEmailText(booking);

  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.length > 0) {
    await sendViaResend(booking.trip.email, booking.trip.fullName, booking.reference, html, text);
  } else {
    console.log("=== BOOKING CONFIRMATION EMAIL ===");
    console.log(`To: ${booking.trip.fullName} <${booking.trip.email}>`);
    console.log(`Reference: ${booking.reference}`);
    console.log(text);
    console.log("=== END EMAIL ===");
  }
}

async function sendViaResend(
  to: string,
  name: string,
  reference: string,
  html: string,
  text: string
): Promise<void> {
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: "Atlas Travel <noreply@yourdomain.com>",
    to: [to],
    subject: `Your Atlas itinerary — ${reference}`,
    html,
    text,
  });
}

function buildEmailHtml(booking: BookingDetails): string {
  const { trip, plan, reference } = booking;
  const outbound = plan.flights.find((f) => !f.isReturn);
  const returnFlight = plan.flights.find((f) => f.isReturn);

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fdfaf5;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:24px">
    <tr>
      <td style="background:#0a1628;padding:32px;text-align:center;border-radius:8px 8px 0 0">
        <p style="color:#c9a84c;font-size:12px;letter-spacing:4px;margin:0 0 8px">ATLAS</p>
        <h1 style="color:#ffffff;font-size:24px;margin:0">Your itinerary is ready</h1>
        <p style="color:#c9a84c;font-size:18px;margin:8px 0 0;letter-spacing:2px">${reference}</p>
      </td>
    </tr>
    <tr>
      <td style="background:#ffffff;padding:32px;border:1px solid #e8e4d9;border-top:none">
        <p style="color:#0a1628;font-size:16px;margin:0 0 24px">Dear ${esc(trip.fullName)},</p>
        <p style="color:#4a5568;margin:0 0 24px">Here is your planned itinerary. Complete each booking with our travel partners — full details below.</p>

        <div style="background:#fdfaf5;border:1px solid #e8e4d9;border-radius:8px;padding:20px;margin-bottom:24px">
          <h2 style="color:#0a1628;font-size:16px;margin:0 0 16px;display:flex;align-items:center">
            ${esc(plan.label)} — Flight Details
          </h2>
          ${outbound ? `
          <div style="margin-bottom:12px">
            <p style="color:#718096;font-size:12px;margin:0 0 4px;letter-spacing:1px">OUTBOUND</p>
            <p style="color:#0a1628;font-size:15px;font-weight:bold;margin:0">${esc(outbound.airline)} ${esc(outbound.flightNumber)}</p>
            <p style="color:#4a5568;margin:4px 0">${esc(outbound.departure.airport)} ${esc(outbound.departure.time)} → ${esc(outbound.arrival.airport)} ${esc(outbound.arrival.time)}</p>
            <p style="color:#718096;font-size:13px;margin:0">${esc(outbound.duration)}${outbound.layovers.length > 0 ? ` · via ${esc(outbound.layovers.map((l) => l.airport).join(", "))}` : " · Direct"}</p>
          </div>` : ""}
          ${returnFlight ? `
          <div>
            <p style="color:#718096;font-size:12px;margin:8px 0 4px;letter-spacing:1px">RETURN</p>
            <p style="color:#0a1628;font-size:15px;font-weight:bold;margin:0">${esc(returnFlight.airline)} ${esc(returnFlight.flightNumber)}</p>
            <p style="color:#4a5568;margin:4px 0">${esc(returnFlight.departure.airport)} ${esc(returnFlight.departure.time)} → ${esc(returnFlight.arrival.airport)} ${esc(returnFlight.arrival.time)}</p>
            <p style="color:#718096;font-size:13px;margin:0">${esc(returnFlight.duration)}${returnFlight.layovers.length > 0 ? ` · via ${esc(returnFlight.layovers.map((l) => l.airport).join(", "))}` : " · Direct"}</p>
          </div>` : ""}
        </div>

        <div style="background:#fdfaf5;border:1px solid #e8e4d9;border-radius:8px;padding:20px;margin-bottom:24px">
          <h2 style="color:#0a1628;font-size:16px;margin:0 0 16px">Hotel Accommodation</h2>
          <p style="color:#0a1628;font-size:15px;font-weight:bold;margin:0">${esc(plan.hotel.name)}</p>
          <p style="color:#4a5568;margin:4px 0">${esc(plan.hotel.location)}</p>
          <p style="color:#718096;font-size:13px;margin:4px 0">${esc(plan.hotel.checkIn)} → ${esc(plan.hotel.checkOut)} · ${trip.numberOfNights} nights</p>
          <p style="color:#718096;font-size:13px;margin:4px 0">${esc(plan.hotel.cancellationPolicy)}</p>
        </div>

        <div style="background:#0a1628;border-radius:8px;padding:20px;margin-bottom:24px">
          <h2 style="color:#c9a84c;font-size:14px;letter-spacing:2px;margin:0 0 12px">COST SUMMARY</h2>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="color:#ffffff">Flights</span>
            <span style="color:#ffffff">${trip.currency} ${plan.flightCost.toLocaleString()}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:12px">
            <span style="color:#ffffff">Hotel (${trip.numberOfNights} nights)</span>
            <span style="color:#ffffff">${trip.currency} ${plan.hotelCost.toLocaleString()}</span>
          </div>
          <div style="border-top:1px solid #c9a84c;padding-top:12px;display:flex;justify-content:space-between">
            <span style="color:#c9a84c;font-weight:bold">Total</span>
            <span style="color:#c9a84c;font-weight:bold">${trip.currency} ${plan.totalCost.toLocaleString()}</span>
          </div>
        </div>

        <p style="color:#718096;font-size:13px;margin:0">Questions? Contact us at travel@yourcompany.com</p>
      </td>
    </tr>
    <tr>
      <td style="padding:16px;text-align:center">
        <p style="color:#718096;font-size:12px;margin:0">Atlas · Private Travel</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildEmailText(booking: BookingDetails): string {
  const { trip, plan, reference } = booking;
  const outbound = plan.flights.find((f) => !f.isReturn);
  const returnFlight = plan.flights.find((f) => f.isReturn);

  return `YOUR ATLAS ITINERARY — ${reference}

Dear ${trip.fullName},

Here is your planned itinerary. Complete each booking with our travel partners.

FLIGHT DETAILS (${plan.label})
${outbound ? `Outbound: ${outbound.airline} ${outbound.flightNumber} — ${outbound.departure.airport} ${outbound.departure.time} → ${outbound.arrival.airport} ${outbound.arrival.time}` : ""}
${returnFlight ? `Return: ${returnFlight.airline} ${returnFlight.flightNumber} — ${returnFlight.departure.airport} ${returnFlight.departure.time} → ${returnFlight.arrival.airport} ${returnFlight.arrival.time}` : ""}

HOTEL: ${plan.hotel.name}, ${plan.hotel.location}
Check-in: ${plan.hotel.checkIn} | Check-out: ${plan.hotel.checkOut}

COST SUMMARY
Flights: ${trip.currency} ${plan.flightCost.toLocaleString()}
Hotel: ${trip.currency} ${plan.hotelCost.toLocaleString()}
Total: ${trip.currency} ${plan.totalCost.toLocaleString()}

Questions? Contact travel@yourcompany.com
`;
}
