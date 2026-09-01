import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/dal";
import { browseServices } from "@/lib/firestore";
import {
  SERVICE_CATEGORIES,
  LEAD_TIME_LABELS,
  formatRate,
  getCategory,
} from "@/lib/catalog";

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
  const services = await browseServices(category?.slug);

  return (
    <div className="mx-auto w-full max-w-sm">
      <p className="mb-1 text-xs" style={{ color: "var(--c-text-2)" }}>
        Good morning 👋 {profile.bookingFor === "dependent" ? "(booking for a family member)" : ""}
      </p>
      <h1 className="mb-4 text-lg font-semibold">{profile.fullName}</h1>

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
          <div key={service.id} className="cc-card">
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
          </div>
        ))}
      </div>

      <div className="cc-card mt-4">
        <div className="mb-1.5 text-sm font-medium">🧾 How payment works</div>
        <div className="text-xs leading-relaxed" style={{ color: "var(--c-text-2)" }}>
          Community Connect connects you with providers — payments are arranged
          directly with them (cash, GCash, Maya). Agree on the price and payment
          method before the work starts. Booking requests and chat arrive in the
          next build.
        </div>
      </div>
    </div>
  );
}
