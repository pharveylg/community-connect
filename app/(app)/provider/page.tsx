import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/dal";
import { getProviderServices } from "@/lib/firestore";
import { listProviderBookings } from "@/lib/bookings";
import { allowanceFor } from "@/lib/wallet";
import { acceptBookingAction, declineBookingAction } from "@/app/actions/bookings";
import { toggleServiceActiveAction } from "@/app/actions/services";
import {
  EXTRA_ACCEPT_FEE_PESOS,
  FREE_MAX_ACTIVE_SERVICES,
  FREE_MONTHLY_ACCEPTS,
  LEAD_TIME_LABELS,
  formatPeso,
  formatRate,
} from "@/lib/catalog";

export default async function ProviderHomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const profile = await getCurrentProfile();
  if (profile.role === "seeker") redirect("/seeker");

  const params = await searchParams;
  const banner = typeof params.accepted === "string"
    ? "Booking accepted — the seeker has been notified."
    : typeof params.declined === "string"
      ? "Booking declined."
      : typeof params.error === "string"
        ? params.error
        : null;

  const [services, bookings] = await Promise.all([
    getProviderServices(profile.uid),
    listProviderBookings(profile.uid),
  ]);
  const allowance = allowanceFor(profile);
  const pending = bookings.filter((b) => b.status === "pending");
  const accepted = bookings.filter((b) => b.status === "accepted");
  const activeCount = services.filter((s) => s.active).length;
  const atCap = activeCount >= FREE_MAX_ACTIVE_SERVICES;

  return (
    <div className="mx-auto w-full max-w-sm">
      <p className="mb-1 text-xs" style={{ color: "var(--c-text-2)" }}>
        Provider dashboard
      </p>
      <h1 className="mb-4 text-lg font-semibold">{profile.fullName}</h1>

      {banner && (
        <div className="cc-card mb-4 text-xs leading-relaxed" style={{ borderColor: "var(--c-accent)" }}>
          {banner}
        </div>
      )}

      {/* Wallet / allowance */}
      <Link href="/provider/credits" className="cc-card mb-5 block">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs" style={{ color: "var(--c-text-2)" }}>
              Credit balance
            </div>
            <div className="text-xl font-semibold">{formatPeso(profile.credits)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs" style={{ color: "var(--c-text-2)" }}>
              Free accepts left this month
            </div>
            <div className="text-xl font-semibold">
              {allowance.freeRemaining}
              <span className="text-sm font-normal" style={{ color: "var(--c-text-3)" }}>
                {" "}/ {FREE_MONTHLY_ACCEPTS}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-2 text-xs" style={{ color: "var(--c-text-3)" }}>
          After your free accepts: {formatPeso(EXTRA_ACCEPT_FEE_PESOS)} per accept from credits →
        </div>
      </Link>

      {/* Booking requests */}
      <h2 className="mb-2 text-sm font-semibold">
        Booking requests {pending.length > 0 && `(${pending.length})`}
      </h2>
      <div className="mb-5 flex flex-col gap-3">
        {pending.length === 0 && (
          <div className="cc-card text-center text-xs" style={{ color: "var(--c-text-2)" }}>
            No pending requests right now.
          </div>
        )}
        {pending.map((b) => (
          <div key={b.id} className="cc-card">
            <div className="mb-1 text-sm font-semibold">{b.serviceTitle}</div>
            <div className="mb-2 text-xs" style={{ color: "var(--c-text-2)" }}>
              From {b.seekerName} · {b.preferredDate}
              {b.preferredTime && ` · ${b.preferredTime}`} · {formatRate(b.rateAmount, b.rateType)}
            </div>
            {b.message && (
              <p className="mb-3 text-xs leading-relaxed" style={{ color: "var(--c-text)" }}>
                “{b.message}”
              </p>
            )}
            <div className="flex gap-2">
              <form action={acceptBookingAction}>
                <input type="hidden" name="bookingId" value={b.id} />
                <button
                  type="submit"
                  className="cc-btn cc-btn-primary"
                  style={{ width: "auto", minHeight: 38, fontSize: 13, padding: "0 16px" }}
                >
                  {allowance.freeRemaining > 0 ? "Accept (free)" : `Accept (${formatPeso(EXTRA_ACCEPT_FEE_PESOS)})`}
                </button>
              </form>
              <form action={declineBookingAction}>
                <input type="hidden" name="bookingId" value={b.id} />
                <button
                  type="submit"
                  className="cc-btn cc-btn-secondary"
                  style={{ width: "auto", minHeight: 38, fontSize: 13, padding: "0 16px" }}
                >
                  Decline
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>

      {/* Accepted jobs */}
      {accepted.length > 0 && (
        <div className="mb-5">
          <h2 className="mb-2 text-sm font-semibold">Accepted jobs ({accepted.length})</h2>
          <div className="flex flex-col gap-2">
            {accepted.map((b) => (
              <div key={b.id} className="cc-card">
                <div className="text-sm font-semibold">{b.serviceTitle}</div>
                <div className="text-xs" style={{ color: "var(--c-text-2)" }}>
                  {b.seekerName} · {b.preferredDate}
                  {b.preferredTime && ` · ${b.preferredTime}`}
                </div>
                <div className="mt-1 text-xs" style={{ color: "var(--c-text-3)" }}>
                  Agree on payment directly (cash, GCash, Maya).
                  {b.feeCharged > 0 && ` · ${formatPeso(b.feeCharged)} accept fee charged.`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Services */}
      <h2 className="mb-2 text-sm font-semibold">Services ({activeCount} active)</h2>
      <div className="mb-4 flex flex-col gap-3">
        {services.length === 0 && (
          <div className="cc-card text-center">
            <div className="mb-3 text-xs" style={{ color: "var(--c-text-2)" }}>
              No services yet — create your first listing.
            </div>
            <Link href="/provider/services/new" className="cc-btn cc-btn-primary">
              ＋ Create a service
            </Link>
          </div>
        )}
        {services.map((service) => (
          <div key={service.id} className="cc-card">
            <div className="mb-1 flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">{service.title}</div>
                <div className="text-xs" style={{ color: "var(--c-text-2)" }}>
                  {service.categoryLabel}
                  {service.custom && (
                    <span
                      className="cc-badge"
                      style={{ marginLeft: 6, background: "var(--c-accent-light)", color: "var(--c-accent)" }}
                    >
                      custom
                    </span>
                  )}
                </div>
              </div>
              <span
                className="cc-badge"
                style={
                  service.active
                    ? { background: "#e7f4e9", color: "#1e6b2e" }
                    : { background: "var(--c-surface-2)", color: "var(--c-text-2)" }
                }
              >
                {service.active ? "Active" : "Paused"}
              </span>
            </div>
            <div className="mb-2 text-sm font-medium">{formatRate(service.rateAmount, service.rateType)}</div>
            <div className="mb-3 text-xs" style={{ color: "var(--c-text-2)" }}>
              {service.barangay}, {service.city} · {LEAD_TIME_LABELS[service.leadTime]}
              {service.negotiable && " · Rate negotiable"}
            </div>
            <form action={toggleServiceActiveAction}>
              <input type="hidden" name="serviceId" value={service.id} />
              <button
                type="submit"
                className="cc-btn cc-btn-secondary"
                style={{ width: "auto", minHeight: 36, fontSize: 12, padding: "0 12px" }}
              >
                {service.active ? "Pause" : "Resume"}
              </button>
            </form>
          </div>
        ))}
      </div>

      {services.length > 0 && (
        <Link
          href="/provider/services/new"
          className={`cc-btn ${atCap ? "cc-btn-secondary" : "cc-btn-primary"} mb-4`}
        >
          {atCap ? `＋ New service (free slots full — pause one above)` : "＋ Create another service"}
        </Link>
      )}

      <div className="cc-card">
        <div className="mb-1.5 text-sm font-medium">💳 Credits &amp; top-ups</div>
        <div className="text-xs" style={{ color: "var(--c-text-2)" }}>
          Send GCash/Maya/bank transfer to the platform account, then submit the
          reference number — an admin confirms and your credits appear.{" "}
          <Link href="/provider/credits" style={{ color: "var(--c-accent)" }}>
            Top up →
          </Link>
        </div>
      </div>
    </div>
  );
}
