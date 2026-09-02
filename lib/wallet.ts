import "server-only";
import { FieldValue, Timestamp, type Transaction } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import type { Profile } from "@/lib/firestore";
import {
  EXTRA_ACCEPT_FEE_PESOS,
  FREE_MONTHLY_ACCEPTS,
  type TopUpMethod,
} from "@/lib/catalog";

// --- Periods (Asia/Manila) ------------------------------------------------------

/** Current month as "YYYY-MM" in Philippine time — the allowance period. */
export function currentPeriod(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
  }).format(date);
}

// --- Wallet events (append-only ledger) -------------------------------------------

export type WalletEventType = "topup" | "accept_fee" | "free_accept";

export type WalletEvent = {
  id: string;
  uid: string;
  type: WalletEventType;
  /** Signed pesos: +top-up, −accept fee, 0 free accept. */
  amount: number;
  balanceAfter: number;
  bookingId?: string;
  note?: string;
  actor: string;
  createdAt: Date | null;
};

function walletEventsCol() {
  return getAdminDb().collection("wallet_events");
}

/** Append a ledger event INSIDE a transaction (never outside one). */
export function txAddWalletEvent(
  tx: Transaction,
  uid: string,
  event: {
    type: WalletEventType;
    amount: number;
    balanceAfter: number;
    bookingId?: string;
    note?: string;
    actor: string;
  }
) {
  tx.create(walletEventsCol().doc(), {
    uid,
    ...event,
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function listWalletEvents(uid: string, limit = 20): Promise<WalletEvent[]> {
  // No server-side orderBy: equality filter + orderBy would need a composite
  // index. Sort in memory instead (fine at launch scale).
  const snap = await walletEventsCol()
    .where("uid", "==", uid)
    .limit(limit)
    .get();
  return snap.docs
    .map((d) => {
    const data = d.data();
    return {
      id: d.id,
      uid: data.uid,
      type: data.type,
      amount: Number(data.amount),
      balanceAfter: Number(data.balanceAfter),
      bookingId: data.bookingId,
      note: data.note,
      actor: data.actor,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null,
    };
    })
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
}

/** Admin: recent events across all users. */
export async function listAllWalletEvents(limit = 15): Promise<WalletEvent[]> {
  const snap = await walletEventsCol()
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      uid: data.uid,
      type: data.type,
      amount: Number(data.amount),
      balanceAfter: Number(data.balanceAfter),
      bookingId: data.bookingId,
      note: data.note,
      actor: data.actor,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null,
    };
  });
}

// --- Allowance -------------------------------------------------------------------

export type Allowance = {
  period: string;
  used: number;
  freeRemaining: number;
  credits: number;
};

export function allowanceFor(profile: Profile): Allowance {
  const period = currentPeriod();
  const used = profile.acceptPeriod === period ? profile.acceptCount : 0;
  return {
    period,
    used,
    freeRemaining: Math.max(0, FREE_MONTHLY_ACCEPTS - used),
    credits: profile.credits,
  };
}

/**
 * Pure decision used by the accept-booking transaction: is this accept free,
 * fee-charged, or blocked? Kept separate so it is easy to reason about —
 * the transaction below is the only caller that MUTATES anything.
 */
export function decideAcceptCharge(
  profile: Profile,
  period: string
): { free: true; fee: 0 } | { free: false; fee: number } | { blocked: string } {
  const used = profile.acceptPeriod === period ? profile.acceptCount : 0;
  if (used < FREE_MONTHLY_ACCEPTS) return { free: true, fee: 0 };
  if (profile.credits >= EXTRA_ACCEPT_FEE_PESOS) {
    return { free: false, fee: EXTRA_ACCEPT_FEE_PESOS };
  }
  return {
    blocked: `You've used your ${FREE_MONTHLY_ACCEPTS} free accepted bookings this month and your credit balance is below ₱${EXTRA_ACCEPT_FEE_PESOS}. Top up credits to keep accepting.`,
  };
}

// --- Top-up requests (manual, off-platform money) -----------------------------------

export type TopUpRequest = {
  id: string;
  uid: string;
  requesterName: string;
  amount: number;
  method: TopUpMethod;
  refNumber: string;
  status: "pending" | "approved" | "rejected";
  note?: string;
  decidedBy?: string;
  createdAt: Date | null;
  decidedAt?: Date | null;
};

function topupsCol() {
  return getAdminDb().collection("topup_requests");
}

function topUpFromSnap(id: string, data: FirebaseFirestore.DocumentData): TopUpRequest {
  return {
    id,
    uid: data.uid,
    requesterName: data.requesterName ?? "",
    amount: Number(data.amount),
    method: data.method,
    refNumber: data.refNumber ?? "",
    status: data.status ?? "pending",
    note: data.note,
    decidedBy: data.decidedBy,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null,
    decidedAt: data.decidedAt instanceof Timestamp ? data.decidedAt.toDate() : null,
  };
}

export async function createTopUpRequest(
  uid: string,
  requesterName: string,
  input: { amount: number; method: TopUpMethod; refNumber: string }
) {
  await topupsCol().add({
    uid,
    requesterName,
    ...input,
    status: "pending",
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function listMyTopUpRequests(uid: string, limit = 10): Promise<TopUpRequest[]> {
  const snap = await topupsCol()
    .where("uid", "==", uid)
    .limit(limit)
    .get();
  return snap.docs
    .map((d) => topUpFromSnap(d.id, d.data()))
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
}

export async function listPendingTopUps(): Promise<TopUpRequest[]> {
  // In-memory sort (see note above) to avoid a composite index requirement.
  const snap = await topupsCol()
    .where("status", "==", "pending")
    .limit(50)
    .get();
  return snap.docs
    .map((d) => topUpFromSnap(d.id, d.data()))
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
}

/**
 * Admin-only: approve or reject a top-up. Approving posts credits to the
 * provider's balance and appends a ledger event — all in one transaction, so
 * a request can never be double-approved or approved without the ledger
 * moving.
 */
export async function decideTopUp(
  adminUid: string,
  requestId: string,
  decision: "approved" | "rejected",
  note?: string
): Promise<{ ok: true } | { error: string }> {
  const db = getAdminDb();
  const requestRef = topupsCol().doc(requestId);

  return db.runTransaction(async (tx) => {
    const reqSnap = await tx.get(requestRef);
    if (!reqSnap.exists) return { error: "Top-up request not found." };
    const req = topUpFromSnap(requestId, reqSnap.data()!);
    if (req.status !== "pending") return { error: "This request was already decided." };

    const targetRef = db.collection("profiles").doc(req.uid);
    const profileSnap = await tx.get(targetRef);
    const currentCredits =
      profileSnap.exists && typeof profileSnap.data()!.credits === "number"
        ? profileSnap.data()!.credits
        : 0;

    const updates: Record<string, unknown> = {
      status: decision,
      decidedBy: adminUid,
      decidedAt: FieldValue.serverTimestamp(),
    };
    if (note) updates.note = note;

    if (decision === "approved") {
      const newBalance = currentCredits + req.amount;
      tx.update(targetRef, { credits: newBalance });
      txAddWalletEvent(tx, req.uid, {
        type: "topup",
        amount: req.amount,
        balanceAfter: newBalance,
        note: `Top-up approved (${req.method}, ref ${req.refNumber})${note ? ` — ${note}` : ""}`,
        actor: adminUid,
      });
    }

    tx.update(requestRef, updates);
    return { ok: true as const };
  }).catch(() => ({ error: "Could not record the decision. Please try again." }));
}
