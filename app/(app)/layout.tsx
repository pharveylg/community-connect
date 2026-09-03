import { getCurrentProfile } from "@/lib/dal";
import { logout } from "@/app/actions/auth";
import { countUnread } from "@/lib/notifications";
import Link from "next/link";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  const unread = await countUnread(profile.uid);

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-end gap-3 px-4 pt-2.5">
        <Link
          href="/notifications"
          aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-base"
          style={{ background: "var(--c-surface)", boxShadow: "var(--shadow-border)" }}
        >
          🔔
          {unread > 0 && (
            <span
              className="cc-num absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
              style={{ background: "var(--c-danger)" }}
            >
              {unread}
            </span>
          )}
        </Link>
        <div
          className="flex h-9 max-w-[10rem] items-center justify-center truncate rounded-full px-3.5 text-[13px] font-bold"
          style={{
            background: "var(--c-accent-light)",
            color: "var(--c-accent)",
            boxShadow: "var(--shadow-border)",
          }}
          title={profile.email}
        >
          {profile.fullName || profile.email}
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="cc-btn cc-btn-ghost"
            style={{ width: "auto", minHeight: 36, fontSize: 12.5, padding: "0 12px" }}
          >
            Log out
          </button>
        </form>
      </div>
      <main className="flex flex-1 flex-col px-4 py-6">{children}</main>
    </div>
  );
}
