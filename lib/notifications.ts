import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";

// Lightweight in-app notifications. No push infra (PWA) — a bell in the app
// header with an unread count, plus /notifications. Started for moderation
// (posters are told when content is removed/restored); reusable later for
// offers, bookings, and verification decisions.

export type AppNotification = {
  id: string;
  uid: string;
  type: string; // e.g. "moderation_removed" | "moderation_restored" | "moderation_review"
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: Date | null;
};

function col() {
  return getAdminDb().collection("notifications");
}

function fromSnap(id: string, d: FirebaseFirestore.DocumentData): AppNotification {
  return {
    id,
    uid: d.uid,
    type: d.type ?? "general",
    title: d.title ?? "",
    body: d.body ?? "",
    link: d.link ?? null,
    read: d.read === true,
    createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : null,
  };
}

export async function createNotification(input: {
  uid: string;
  type: string;
  title: string;
  body: string;
  link?: string;
}): Promise<void> {
  await col().add({
    uid: input.uid,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link ?? null,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function listMyNotifications(uid: string, limitCount = 40): Promise<AppNotification[]> {
  const snap = await col().where("uid", "==", uid).limit(limitCount).get();
  return snap.docs
    .map((d) => fromSnap(d.id, d.data()))
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
}

export async function countUnread(uid: string): Promise<number> {
  const snap = await col().where("uid", "==", uid).where("read", "==", false).limit(99).get();
  return snap.size;
}

export async function markAllRead(uid: string): Promise<void> {
  const snap = await col().where("uid", "==", uid).where("read", "==", false).limit(200).get();
  const batch = getAdminDb().batch();
  for (const doc of snap.docs) batch.update(doc.ref, { read: true });
  await batch.commit();
}
