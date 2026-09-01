import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/dal";
import { browseServices } from "@/lib/firestore";
import { listSeekerBookings, type Booking } from "@/lib/bookings";
import {
  SERVICE_CATEGORIES,
  LEAD_TIME_LABELS,
  formatRate,
  getCategory,
} from "@/lib/catalog";
import { cancelBookingAction } from "@/app/actions/bookings";

const STATUS_STYLES: Record<Booking["status"], { bg: string; fg: string; label: string }> = {
  pending: { bg: "#fff4e0", fg: "#8a5a00", label: "Waiting for provider" },
  accepted: { bg: "#e7f4e9", fg: "#1e6b2e", label: "Accepted ✓" },
  declined: { bg: "var(--c-danger-light)", fg: "var(--c-danger)", label: "Declined" },
  cancelled: { bg: "var(--c-surface-2)", fg: "var(--c-text-2)", label: "Cancelled" },
};

export default async function SeekerHomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const profile = await getCurrentProfile();
  if (profile.role === "provider") redirect("/provider");

  const params = await searchParams;
  const rawCategory = typeof params.category === "string" ? params.category : undefined;
  const category = rawCategory ? getCategory(rawCategory) : undefined;
  const banner = typeof params.booked === "string"
    ? "Request sent — you'll see the provider's response below."
    : typeof params.cancelled === "string"
      ? "Request cancelled."
      : typeof params.error === "string"
        ? params.error
        : null;

  const [services, bookings] = await Promise.all([
    browseServices(category?.slug),
    listSeekerBookings(profile.uid),
  ]);
  const activeBookings = bookings.filter((b) => b.status === "pending" || b.status === "accepted");

  return (
    <div className="mx-auto w-full max-w-sm">
      <p className="mb-1 text-xs" style={{ color: "var(--c-text-2)" }}>
        Good morning 👋 {profile.bookingFor === "dependent" ? "(booking for a family member)" : ""}
      </p>
      <h1 className="mb-4 text-lg font-semibold">{profile.fullName}</h1>

      {banner && (
        <div className="cc-card mb-4 text-xs leading-relaxed" style={{ borderColor: "var(--c-accent)" }}>
          {banner}
        </div>
      )}

      {activeBookings.length > 0 && (
        <div className="mb-5">
          <h2 className="mb-2 text-sm font-semibold">My bookings</h2>
          <div className="flex flex-col gap-2">
            {activeBookings.map((b) => {
              const st = STATUS_STYLES[b.status];
              return (
                <div key={b.id} className="cc-card">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <div className="text-sm font-semibold">{b.serviceTitle}</div>
                    <span className="cc-badge" style={{ background: st.bg, color: st.fg }}>
                      {st.label}
                    </span>
                  </div>
                  <div className="text-xs" style={{ color: "var(--c-text-2)" }}>
                    {b.providerName} · {b.preferredDate}
                    {b.preferredTime && ` · ${b.preferredTime}`}
                  </div>
                  {b.status === "pending" && (
                    <form action={cancelBookingAction} className="mt-2">
                      <input type="hidden" name="bookingId" value={b.id} />
                      <button
                        type="submit"
                        className="cc-btn cc-btn-secondary"
                        style={{ width: "auto", minHeight: 32, fontSize: 12, padding: "0 12px" }}
                      >
                        Cancel request
                      </button>
                    </form>
                  )}
                  {b.status === "accepted" && (
                    <div className="mt-1.5 text-xs" style={{ color: "var(--c-text-3)" }}>
                      Agree on payment directly with {b.providerName} (cash, GCash, Maya).
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-1.5">
        <Link
          href="/seeker"
          className="cc-chip"
          style={!category ? { background: "var(--c-accent)", color: "#fff", borderColor: "var(--c-accent)" } : undefined}
        >
          All
        </Link>
        {SERVICE_CATEGORIES.map((cat) => (
          <Link
            key={cat.slug}
            href={`/seeker?category=${cat.slug}`}
            className="cc-chip"
            style={
              category?.slug === cat.slug
                ? { background: "var(--c-accent)", color: "#fff", borderColor: "var(--c-accent)" }
                : undefined
            }
          >
            {cat.emoji} {cat.label}
          </Link>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {services.length === 0 && (
          <div className="cc-card text-center">
            <div className="mb-1.5 text-sm font-medium">
              {category ? `No ${category.label.toLowerCase()} services yet` : "No services listed yet"}
            </div>
            <div className="text-xs" style={{ color: "var(--c-text-2)" }}>
              Providers are signing up — check another category, or come back soon.
            </div>
          </div>
        )}

        {services.map((service) => (
          <Link key={service.id} href={`/seeker/services/${service.id}`} className="cc-card block">
            <div className="mb-1 flex items-start justify-between gap-2">
              <div className="text-sm font-semibold">{service.title}</div>
              {service.custom && (
                <span className="cc-badge" style={{ background: "var(--c-accent-light)", color: "var(--c-accent)" }}>
                  custom service
                </span>
              )}
            </div>
            <div className="mb-2 text-xs" style={{ color: "var(--c-text-2)" }}>
              {service.categoryLabel} · by {service.providerName}
            </div>
            <div className="mb-2 text-sm font-medium">
              {formatRate(service.rateAmount, service.rateType)}
              {service.negotiable && (
                <span className="ml-1.5 text-xs font-normal" style={{ color: "var(--c-text-3)" }}>
                  negotiable
                </span>
              )}
            </div>
            {service.description && (
              <p className="mb-2 text-xs leading-relaxed" style={{ color: "var(--c-text-2)" }}>
                {service.description}
              </p>
            )}
            <div className="text-xs" style={{ color: "var(--c-text-3)" }}>
              📍 {service.barangay}, {service.city} · {LEAD_TIME_LABELS[service.leadTime]}
            </div>
          </Link>
        ))}
      </div>

      <div className="cc-card mt-4">
        <div className="mb-1.5 text-sm font-medium">🧾 How payment works</div>
        <div className="text-xs leading-relaxed" style={{ color: "var(--c-text-2)" }}>
          Community Connect connects you with providers — payments are arranged
          directly with them (cash, GCash, Maya). Agree on the price and payment
          method before the work starts.
        </div>
      </div>
    </div>
  );
}
