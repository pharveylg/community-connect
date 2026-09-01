import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/dal";
import { getProviderServices } from "@/lib/firestore";
import { toggleServiceActiveAction } from "@/app/actions/services";
import {
  FREE_MAX_ACTIVE_SERVICES,
  LEAD_TIME_LABELS,
  formatRate,
} from "@/lib/catalog";

export default async function ProviderHomePage() {
  const profile = await getCurrentProfile();
  if (profile.role === "seeker") redirect("/seeker");

  const services = await getProviderServices(profile.uid);
  const activeCount = services.filter((s) => s.active).length;
  const atCap = activeCount >= FREE_MAX_ACTIVE_SERVICES;

  return (
    <div className="mx-auto w-full max-w-sm">
      <p className="mb-1 text-xs" style={{ color: "var(--c-text-2)" }}>
        Provider dashboard
      </p>
      <h1 className="mb-5 text-lg font-semibold">{profile.fullName}</h1>

      <div className="mb-6 rounded-2xl p-4 text-white" style={{ background: "#1e6b2e" }}>
        <div className="mb-1 text-[11px] opacity-80">COMMUNITY CONNECT</div>
        <div className="mb-0.5 text-base font-semibold">Your services</div>
        <div className="text-xs opacity-85">
          List what you offer and set your own rates — including services you
          invent, like trash pickup or junk &amp; scrap hauling.
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          Services ({activeCount} active)
        </h2>
        <span className="text-xs" style={{ color: "var(--c-text-3)" }}>
          Free plan: {FREE_MAX_ACTIVE_SERVICES} active slots
        </span>
      </div>

      <div className="mb-4 flex flex-col gap-3">
        {services.length === 0 && (
          <div className="cc-card text-center">
            <div className="mb-1.5 text-sm font-medium">No services yet</div>
            <div className="mb-3 text-xs" style={{ color: "var(--c-text-2)" }}>
              Create your first listing — pick a category, or choose &ldquo;My own
              service&rdquo; and name it yourself.
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
          aria-disabled={atCap}
        >
          {atCap ? `＋ New service (free slots full — manage above)` : "＋ Create another service"}
        </Link>
      )}

      <div className="cc-card">
        <div className="mb-1.5 text-sm font-medium">💳 Credits &amp; earnings</div>
        <div className="text-xs" style={{ color: "var(--c-text-2)" }}>
          Your first bookings each month are free. Top-ups, boosts, and earnings
          analytics arrive in the next build.
        </div>
      </div>
    </div>
  );
}
