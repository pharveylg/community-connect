import { getCurrentProfile } from "@/lib/dal";

export default async function SeekerHomePage() {
  const profile = await getCurrentProfile();

  return (
    <div className="mx-auto w-full max-w-sm">
      <p className="mb-1 text-xs" style={{ color: "var(--c-text-2)" }}>
        Good morning 👋
      </p>
      <h1 className="mb-5 text-lg font-semibold">{profile.fullName}</h1>

      <div
        className="mb-6 rounded-2xl p-4 text-white"
        style={{ background: "var(--c-accent)" }}
      >
        <div className="mb-1 text-[11px] opacity-80">COMMUNITY CONNECT</div>
        <div className="mb-0.5 text-base font-semibold">Seeker home screen</div>
        <div className="text-xs opacity-85">
          Browse, book, chat and manage appointments — screens coming next in the build.
        </div>
      </div>

      <div className="cc-card">
        <div className="mb-1.5 text-sm font-medium">✅ Registration complete</div>
        <div className="text-xs" style={{ color: "var(--c-text-2)" }}>
          You are logged in as <strong>{profile.fullName}</strong> (seeker). The full seeker
          screen suite will be built in the next phase — including browse, provider profiles,
          booking, chat, and rental flows.
        </div>
      </div>
    </div>
  );
}
