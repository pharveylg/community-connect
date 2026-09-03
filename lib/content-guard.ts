// Content guard — first-line moderation for user-generated text.
// Deterministic, dependency-free, PH-context aware. Used by every submission
// action (job posts, offers, listings, job ads, interests, booking messages).
//
// Two outcomes:
//  - BLOCK (return error): links, phone numbers in public text, hard-blocked
//    terms (drugs, guns, sex work, gambling, fraud).
//  - FLAG (post succeeds, flagged for admin review): gray-area terms —
//    worker-fee tells (illegal recruitment), overseas-job tells, strong
//    vulgarity. Flags are written to the doc as moderation metadata.
//
// The lists are intentionally short and unambiguous — tune in one place.

export type GuardResult = { error: string } | { ok: true; flags: string[] };

// --- Links: scams need victims off-platform ---------------------------------
const URL_PATTERNS: RegExp[] = [
  /\bhttps?:\/\//i,
  /\bwww\./i,
  /\bt\.me\/\S/i,
  /\bbit\.ly\/\S/i,
  /\btinyurl\.com\/\S/i,
  /\bfb\.com\/\S/i,
  /\bm\.me\/\S/i,
  /\bviber:\/\/\S/i,
];

// --- PH mobile numbers in PUBLIC text bypass contact gating ----------------
// Match digit-runs that look like PH numbers once spaces/dashes are stripped.
const PH_MOBILE = /^(0\d{10}|63\d{10}|\d{10})$/;

function containsPhNumber(text: string): boolean {
  // normalize common separators inside digit groups
  const runs = text.match(/\+?[\d][\d\s\-()]{8,}\d/g) ?? [];
  return runs.some((run) => {
    const digits = run.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 13) return false;
    if (PH_MOBILE.test(digits)) return true;
    // +63 9xx… / 63 9xx…
    return /^639\d{9}$/.test(digits) || /^09\d{9}$/.test(digits);
  });
}

// --- Hard block: unambiguous illicit commerce ------------------------------
// (tagalog/bisaya entries included; keep terms specific to avoid false hits)
const HARD_BLOCK: string[] = [
  "shabu", "methamphetamine", "marijuana", "cocaine", "drug pusher", "drug dealer",
  "sa steroids for sale", "prescription meds for sale",
  "gun for sale", "guns for sale", "firearm for sale", "loose firearm", "paltik",
  "armalite", "ammo for sale", "bala for sale", "silencer for sale",
  "escort service", "sexual service", "sex service", "prostituted", "prostitution",
  "happy ending", "hookup for pay", "sugar baby wanted", "gRO for girls", "girls for sale",
  "e-sabong", "esabong", "sabong online", "jueteng", "tongits for money", "betting station",
  "online casino", "casino agent", "bookie", "pusoy for money",
  "hitman", "contract killer", "patayin ko si", "kill for hire",
  "fake id", "fake ids", "forged document", "forgery service", "counterfeit money", "pekeng pera",
  "money laundering", "scam tutorial", "loading scam", "gcash scam", "phishing",
  "human trafficking", "trafficking", "recruit for cybersex", "sextortion",
];

// --- Gray flag: review, don't block -----------------------------------------
const GRAY_FLAGS: { term: string; tag: string }[] = [
  { term: "processing fee", tag: "worker-fee" },
  { term: "placement fee", tag: "worker-fee" },
  { term: "training fee", tag: "worker-fee" },
  { term: "registration fee", tag: "worker-fee" },
  { term: "resume fee", tag: "worker-fee" },
  { term: "bayad muna bago", tag: "worker-fee" },
  { term: "dubai", tag: "overseas" },
  { term: "kuwait", tag: "overseas" },
  { term: "qatar", tag: "overseas" },
  { term: "saudi", tag: "overseas" },
  { term: "abu dhabi", tag: "overseas" },
  { term: "hong kong hiring", tag: "overseas" },
  { term: "work abroad", tag: "overseas" },
  { term: "overseas employment", tag: "overseas" },
  { term: "ofw hiring", tag: "overseas" },
  { term: "direct hire abroad", tag: "overseas" },
  { term: "gago", tag: "vulgar" },
  { term: "putang", tag: "vulgar" },
  { term: "puta", tag: "vulgar" },
  { term: "inutil na", tag: "vulgar" },
  { term: "bobo", tag: "vulgar" },
  { term: "tanga", tag: "vulgar" },
  { term: "bullshit", tag: "vulgar" },
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/[ᵣ0₀¹²³]/g, (c) => ({ "₀": "0", "₁": "1", "₂": "2", "₃": "3" }[c] ?? c));
}

/**
 * Check user-written text before it is stored.
 * @param fields  label -> text; all texts are concatenated for scanning.
 * @param opts.phoneOk  true for PRIVATE one-to-one contexts (booking message
 *        between confirmed parties) where exchanging numbers is legitimate.
 */
export function guardContent(
  fields: Record<string, string>,
  opts: { phoneOk?: boolean } = {}
): GuardResult {
  const texts = Object.entries(fields)
    .filter(([, v]) => typeof v === "string" && v.trim() !== "")
    .map(([k, v]) => `${k}: ${v}`);
  if (texts.length === 0) return { ok: true, flags: [] };
  const joined = texts.join("\n");
  const lower = normalize(joined);

  for (const re of URL_PATTERNS) {
    if (re.test(joined)) {
      return {
        error:
          "Links aren't allowed in posts and messages — everything stays on Community Connect. (Scam & safety rule.)",
      };
    }
  }

  if (!opts.phoneOk && containsPhNumber(joined)) {
    return {
      error:
        "Please don't type mobile numbers here — they're shared automatically once there's a match. (Keeps everyone safe from scrapers.)",
    };
  }

  for (const term of HARD_BLOCK) {
    if (lower.includes(term)) {
      return {
        error:
          "This post looks like it involves something illegal or harmful. Posts are reviewed — illegal content is reported to the authorities.",
      };
    }
  }

  const flags = GRAY_FLAGS.filter((g) => lower.includes(g.term)).map((g) => g.tag);
  const uniqueFlags = [...new Set(flags)];
  return { ok: true, flags: uniqueFlags };
}

/** Shared deterrence line rendered near every submission point. */
export const DETERRENCE_LINE =
  "Posts are reviewed. Illegal content is reported to authorities.";
