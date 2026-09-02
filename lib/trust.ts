// Trust tiers — earned entirely through platform behavior (completed jobs,
// client vouches). No documents, no forms, no admin gate: providers climb by
// doing real work, and the badges seekers see are hard to fake quickly
// because they cost real transactions.

export type TrustTierKey = "new" | "rising" | "trusted" | "suki";

export type TrustTier = {
  key: TrustTierKey;
  label: string;
  emoji: string;
  description: string;
  /** Minimum completed jobs / vouches to REACH this tier from below. */
  requires: { jobs: number; vouches: number };
};

export const TRUST_TIERS: Record<TrustTierKey, TrustTier> = {
  new: {
    key: "new",
    label: "New provider",
    emoji: "🌱",
    description: "Just getting started on Community Connect.",
    requires: { jobs: 0, vouches: 0 },
  },
  rising: {
    key: "rising",
    label: "Rising",
    emoji: "📈",
    description: "Completing real jobs and earning regular clients.",
    requires: { jobs: 3, vouches: 2 },
  },
  trusted: {
    key: "trusted",
    label: "Trusted",
    emoji: "🛡",
    description: "A track record of completed jobs, vouched for by clients.",
    requires: { jobs: 10, vouches: 5 },
  },
  suki: {
    key: "suki",
    label: "Suki partner",
    emoji: "🌟",
    description: "A go-to provider with many repeat clients and vouches.",
    requires: { jobs: 25, vouches: 10 },
  },
};

const ORDER: TrustTierKey[] = ["new", "rising", "trusted", "suki"];

export function trustTier(completedCount = 0, vouches = 0): TrustTier {
  let tier: TrustTierKey = "new";
  for (const key of ORDER) {
    const t = TRUST_TIERS[key];
    if (completedCount >= t.requires.jobs || vouches >= t.requires.vouches) {
      tier = key;
    }
  }
  return TRUST_TIERS[tier];
}

export function nextTrustTier(current: TrustTierKey): TrustTier | null {
  const i = ORDER.indexOf(current);
  return i < ORDER.length - 1 ? TRUST_TIERS[ORDER[i + 1]] : null;
}

/** Badge colors per tier (server-component friendly inline styles). */
export function trustBadgeStyle(key: TrustTierKey): { background: string; color: string } {
  switch (key) {
    case "suki":
      return { background: "#fdf3dc", color: "#8a5a00" };
    case "trusted":
      return { background: "var(--c-success-light)", color: "var(--c-success)" };
    case "rising":
      return { background: "var(--c-accent-light)", color: "var(--c-accent)" };
    default:
      return { background: "var(--c-surface-2)", color: "var(--c-text-2)" };
  }
}

export function trustSummaryLine(
  completedCount: number,
  vouches: number
): string {
  const parts: string[] = [];
  parts.push(
    completedCount === 1 ? "1 completed job" : `${completedCount} completed jobs`
  );
  if (vouches > 0) {
    parts.push(vouches === 1 ? "1 client vouch" : `${vouches} client vouches`);
  }
  return parts.join(" · ");
}
