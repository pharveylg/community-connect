import { getCurrentProfile } from "@/lib/dal";
import { logout } from "@/app/actions/auth";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  return (
    <div className="flex flex-1 flex-col">
      <header
        className="cc-glass sticky top-0 z-40 flex items-center justify-between px-4 py-3"
        style={{ boxShadow: "var(--shadow-border)" }}
      >
        <span className="flex items-center gap-2.5 text-sm font-semibold">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-[10px] text-base"
            style={{ background: "linear-gradient(135deg,#0b4480,#0e7a5f)" }}
          >
            🤝
          </span>
          <span className="cc-gradient-text">Community Connect</span>
        </span>
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold"
            style={{
              background: "var(--c-accent-light)",
              color: "var(--c-accent)",
              boxShadow: "var(--shadow-border)",
            }}
            title={profile.email}
          >
            {initials(profile.fullName || profile.email)}
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
      </header>
      <main className="flex flex-1 flex-col px-4 py-6">{children}</main>
    </div>
  );
}
