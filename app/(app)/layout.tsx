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
      <div className="flex items-center justify-end gap-3 px-4 pt-2.5">
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
      <main className="flex flex-1 flex-col px-4 py-6">{children}</main>
    </div>
  );
}
