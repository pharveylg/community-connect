import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/dal";

export default async function AdminHomePage() {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") redirect(`/${profile.role ?? "seeker"}`);

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="mb-5 text-lg font-semibold">{profile.fullName} · Admin</h1>

      <div className="mb-6 rounded-2xl p-4 text-white" style={{ background: "#5b21b6" }}>
        <div className="mb-1 text-[11px] opacity-80">COMMUNITY CONNECT · ADMIN</div>
        <div className="mb-0.5 text-base font-semibold">Admin console</div>
        <div className="text-xs opacity-85">
          Bookings, providers, seekers, disputes, and the audit log — screens coming next in
          the build.
        </div>
      </div>

      <div className="cc-card">
        <div className="mb-1.5 text-sm font-medium">✅ Logged in as admin</div>
        <div className="text-xs" style={{ color: "var(--c-text-2)" }}>
          Full admin tooling — user/provider management, disputes, and the operations
          dashboard — will be built in the next phase.
        </div>
      </div>
    </div>
  );
}
