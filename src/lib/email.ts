import { BookingDetails } from "./types";

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
    from: "Executive Travel <noreply@yourdomain.com>",
    to: [to],
    subject: `Booking Confirmed — Reference ${reference}`,
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
        <p style="color:#c9a84c;font-size:12px;letter-spacing:4px;margin:0 0 8px">EXECUTIVE TRAVEL</p>
        <h1 style="color:#ffffff;font-size:24px;margin:0">Booking Confirmed</h1>
        <p style="color:#c9a84c;font-size:18px;margin:8px 0 0;letter-spacing:2px">${reference}</p>
      </td>
    </tr>
    <tr>
      <td style="background:#ffffff;padding:32px;border:1px solid #e8e4d9;border-top:none">
        <p style="color:#0a1628;font-size:16px;margin:0 0 24px">Dear ${trip.fullName},</p>
        <p style="color:#4a5568;margin:0 0 24px">Your executive travel itinerary has been confirmed. Please find your booking details below.</p>

        <div style="background:#fdfaf5;border:1px solid #e8e4d9;border-radius:8px;padding:20px;margin-bottom:24px">
          <h2 style="color:#0a1628;font-size:16px;margin:0 0 16px;display:flex;align-items:center">
            ✈️ ${plan.label} — Flight Details
          </h2>
          ${outbound ? `
          <div style="margin-bottom:12px">
            <p style="color:#718096;font-size:12px;margin:0 0 4px;letter-spacing:1px">OUTBOUND</p>
            <p style="color:#0a1628;font-size:15px;font-weight:bold;margin:0">${outbound.airline} ${outbound.flightNumber}</p>
            <p style="color:#4a5568;margin:4px 0">${outbound.departure.airport} ${outbound.departure.time} → ${outbound.arrival.airport} ${outbound.arrival.time}</p>
            <p style="color:#718096;font-size:13px;margin:0">${outbound.duration}${outbound.layovers.length > 0 ? ` · via ${outbound.layovers.map((l) => l.airport).join(", ")}` : " · Direct"}</p>
          </div>` : ""}
          ${returnFlight ? `
          <div>
            <p style="color:#718096;font-size:12px;margin:8px 0 4px;letter-spacing:1px">RETURN</p>
            <p style="color:#0a1628;font-size:15px;font-weight:bold;margin:0">${returnFlight.airline} ${returnFlight.flightNumber}</p>
            <p style="color:#4a5568;margin:4px 0">${returnFlight.departure.airport} ${returnFlight.departure.time} → ${returnFlight.arrival.airport} ${returnFlight.arrival.time}</p>
            <p style="color:#718096;font-size:13px;margin:0">${returnFlight.duration}${returnFlight.layovers.length > 0 ? ` · via ${returnFlight.layovers.map((l) => l.airport).join(", ")}` : " · Direct"}</p>
          </div>` : ""}
        </div>

        <div style="background:#fdfaf5;border:1px solid #e8e4d9;border-radius:8px;padding:20px;margin-bottom:24px">
          <h2 style="color:#0a1628;font-size:16px;margin:0 0 16px">🏨 Hotel Accommodation</h2>
          <p style="color:#0a1628;font-size:15px;font-weight:bold;margin:0">${plan.hotel.name}</p>
          <p style="color:#4a5568;margin:4px 0">${plan.hotel.location}</p>
          <p style="color:#718096;font-size:13px;margin:4px 0">${plan.hotel.checkIn} → ${plan.hotel.checkOut} · ${trip.numberOfNights} nights</p>
          <p style="color:#718096;font-size:13px;margin:4px 0">${plan.hotel.cancellationPolicy}</p>
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
        <p style="color:#718096;font-size:12px;margin:0">Executive Travel Planner · Confidential</p>
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

  return `BOOKING CONFIRMED — ${reference}

Dear ${trip.fullName},

Your executive travel itinerary has been confirmed.

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
