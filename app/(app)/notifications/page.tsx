import Link from "next/link";
import { getCurrentProfile } from "@/lib/dal";
import { listMyNotifications, countUnread } from "@/lib/notifications";
import { markNotificationsReadAction } from "@/app/actions/notifications";
import { updatePushPrefsFormAction } from "@/app/actions/push";
import { PushOptIn } from "@/components/push-opt-in";
import { BackLink } from "@/components/back-link";
import { BlurFade } from "@/components/mp/blur-fade";

function timeAgo(d: Date | null) {
  if (!d) return "";
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

const ICONS: Record<string, string> = {
  moderation_removed: "🚫",
  moderation_review: "⏳",
  moderation_restored: "✅",
};

export default async function NotificationsPage() {
  const profile = await getCurrentProfile();
  const [items, unread] = await Promise.all([
    listMyNotifications(profile.uid),
    countUnread(profile.uid),
  ]);

  return (
    <div className="mx-auto w-full max-w-sm md:max-w-md lg:max-w-2xl xl:max-w-3xl">
      <BackLink href={roleHome(profile.role ?? "seeker")} label="Home" />

      <BlurFade delay={0}>
        <div className="mb-4 flex items-center justify-between gap-2">
          <h1 className="text-[24px] font-semibold tracking-tight">
            Notifications{" "}
            {unread > 0 && (
              <span className="cc-badge align-middle" style={{ background: "var(--c-danger-light)", color: "var(--c-danger)" }}>
                {unread} new
              </span>
            )}
          </h1>
          {unread > 0 && (
            <form action={markNotificationsReadAction}>
              <button type="submit" className="cc-btn cc-btn-ghost" style={{ width: "auto", padding: "0 12px", minHeight: 34, fontSize: 12 }}>
                Mark all read
              </button>
            </form>
          )}
        </div>
      </BlurFade>

      <PushOptIn context="seeker" />

      <BlurFade delay={0.04}>
        <div className="cc-card mb-4">
          <div className="mb-2 text-sm font-semibold">Notification settings</div>
          <form action={updatePushPrefsFormAction} className="flex flex-col gap-2">
            {[
              { name: "bookingOffers", label: "Bookings & offers", hint: "booking requests, accepted bookings, job-board offers" },
              { name: "jobTrabaho", label: "Job board & Trabaho", hint: "applicants, shortlists, offers" },
              { name: "accountModeration", label: "Account & moderation", hint: "verification decisions, top-ups, moderation outcomes" },
              { name: "digest", label: "📬 Daily digest", hint: "one morning summary of new posts (opt-in)" },
            ].map((row) => (
              <label key={row.name} className="flex items-start gap-2.5 rounded-[10px] px-2.5 py-2" style={{ background: "var(--c-surface)", boxShadow: "var(--shadow-border)" }}>
                <input
                  type="checkbox"
                  name={row.name}
                  defaultChecked={row.name === "digest" ? profile.notificationPrefs?.digest === true : profile.notificationPrefs?.[row.name as "bookingOffers"] !== false}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-[13px] font-semibold">{row.label}</span>
                  <span className="block text-[11px]" style={{ color: "var(--c-text-3)" }}>
                    {row.hint}
                  </span>
                </span>
              </label>
            ))}
            <button type="submit" className="cc-btn cc-btn-primary" style={{ minHeight: 38 }}>
              Save settings
            </button>
          </form>
        </div>
      </BlurFade>

      <div className="flex flex-col gap-2.5">
        {items.length === 0 && (
          <BlurFade delay={0.05}>
            <div className="cc-card text-center text-xs" style={{ color: "var(--c-text-2)" }}>
              Nothing yet — you&apos;ll hear from us here about your posts,
              listings, and account.
            </div>
          </BlurFade>
        )}

        {items.map((n, i) => {
          const inner = (
            <div className="cc-card" style={n.read ? { opacity: 0.75 } : { boxShadow: "0 0 0 1px var(--c-accent), var(--shadow-border)" }}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-base">{ICONS[n.type] ?? "🔔"}</span>
                  <span className="truncate text-[13.5px] font-semibold">{n.title}</span>
                </div>
                <span className="shrink-0 text-[11px]" style={{ color: "var(--c-text-3)" }}>
                  {timeAgo(n.createdAt)}
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--c-text-2)" }}>
                {n.body}
              </p>
            </div>
          );
          return (
            <BlurFade key={n.id} delay={0.05 + Math.min(i, 6) * 0.04}>
              {n.link ? (
                <Link href={n.link} className="block">
                  {inner}
                </Link>
              ) : (
                inner
              )}
            </BlurFade>
          );
        })}
      </div>
    </div>
  );
}

function roleHome(role: string) {
  if (role === "provider") return "/provider";
  if (role === "admin") return "/admin";
  return "/seeker";
}
