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
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--c-border)" }}
      >
        <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--c-accent)" }}>
          <span className="text-lg">🤝</span> Community Connect
        </span>
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold"
            style={{ background: "var(--c-accent-light)", color: "var(--c-accent)" }}
          >
            {initials(profile.fullName || profile.email)}
          </div>
          <form action={logout}>
            <button type="submit" className="cc-btn cc-btn-secondary" style={{ width: "auto", minHeight: 36, fontSize: 12, padding: "0 12px" }}>
              Log out
            </button>
          </form>
        </div>
      </header>
      <main className="flex flex-1 flex-col px-4 py-6">{children}</main>
    </div>
  );
}
