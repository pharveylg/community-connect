import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/dal";
import { getServiceListing } from "@/lib/firestore";
import { LEAD_TIME_LABELS, formatRate } from "@/lib/catalog";
import { RequestBookingForm } from "./request-booking-form";

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  const service = await getServiceListing(id);
  if (!service || !service.active) notFound();

  return (
    <div className="mx-auto w-full max-w-sm">
      <Link
        href="/seeker"
        className="mb-4 inline-block text-sm"
        style={{ color: "var(--c-accent)" }}
      >
        ← Back to browse
      </Link>

      <div className="mb-1 flex items-start justify-between gap-2">
        <h1 className="text-xl font-semibold">{service.title}</h1>
        {service.custom && (
          <span className="cc-badge" style={{ background: "var(--c-accent-light)", color: "var(--c-accent)" }}>
            custom service
          </span>
        )}
      </div>
      <div className="mb-3 text-xs" style={{ color: "var(--c-text-2)" }}>
        {service.categoryLabel} · by {service.providerName}
      </div>

      <div className="cc-card mb-3">
        <div className="mb-2 text-lg font-semibold">
          {formatRate(service.rateAmount, service.rateType)}
          {service.negotiable && (
            <span className="ml-1.5 text-xs font-normal" style={{ color: "var(--c-text-3)" }}>
              negotiable
            </span>
          )}
        </div>
        {service.description && (
          <p className="mb-2 text-sm leading-relaxed" style={{ color: "var(--c-text)" }}>
            {service.description}
          </p>
        )}
        <div className="text-xs" style={{ color: "var(--c-text-3)" }}>
          📍 {service.barangay}, {service.city} · {LEAD_TIME_LABELS[service.leadTime]}
        </div>
      </div>

      {profile.role === "provider" ? (
        <div className="cc-card text-xs" style={{ color: "var(--c-text-2)" }}>
          You&apos;re signed in as a provider — switch to a seeker account to book.
        </div>
      ) : (
        <RequestBookingForm serviceId={service.id} rate={formatRate(service.rateAmount, service.rateType)} />
      )}

      <div className="mt-4 text-xs leading-relaxed" style={{ color: "var(--c-text-3)" }}>
        Payment is arranged directly with your provider (cash, GCash, Maya) —
        Community Connect never holds your money. Agree on the price before the
        work starts.
      </div>
    </div>
  );
}
