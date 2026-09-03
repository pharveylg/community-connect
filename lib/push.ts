import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { getAdminDb } from "@/lib/firebase/admin";
import { getProfile, updateProfile } from "@/lib/firestore";
import { createNotification, listMyNotifications, countUnread, markAllRead } from "@/lib/notifications";

// Push delivery (FCM web push). One entry point — notify() — writes the
// in-app row AND pushes to every device of the user, honoring their
// per-category preferences and quiet hours. Tokens live in push_tokens
// (docId = FCM token; a user may have several devices).

export type NotifCategory = "bookingOffers" | "jobTrabaho" | "accountModeration";

export type NotifyInput = {
  uid: string;
  type: string;
  category: NotifCategory;
  title: string;
  body: string;
  link?: string;
  /** Urgent events bypass quiet hours (offers, bookings). */
  urgent?: boolean;
};

export type PushPrefs = {
  bookingOffers?: boolean;
  jobTrabaho?: boolean;
  accountModeration?: boolean;
  digest?: boolean;
};

function prefsAllow(prefs: PushPrefs | undefined, category: NotifCategory): boolean {
  if (!prefs) return true; // absent = all on (defaults)
  return prefs[category] !== false;
}

function inQuietHoursPHT(): boolean {
  // 21:00–07:00 Philippines (UTC+8)
  const hourPHT = (new Date().getUTCHours() + 8) % 24;
  return hourPHT >= 21 || hourPHT < 7;
}

async function tokensFor(uid: string): Promise<string[]> {
  const snap = await getAdminDb().collection("push_tokens").where("uid", "==", uid).limit(20).get();
  return snap.docs.map((d) => d.id);
}

async function pruneTokens(tokens: string[]): Promise<void> {
  const db = getAdminDb();
  const batch = db.batch();
  for (const t of tokens) batch.delete(db.collection("push_tokens").doc(t));
  await batch.commit();
}

async function pushToDevices(tokens: string[], input: NotifyInput): Promise<void> {
  if (tokens.length === 0) return;
  try {
    const res = await getMessaging().sendEachForMulticast({
      tokens,
      notification: { title: input.title, body: input.body },
      data: input.link ? { link: input.link } : undefined,
      webpush: {
        notification: {
          title: input.title,
          body: input.body,
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          tag: input.type, // collapse duplicates per event type
        },
        fcmOptions: input.link ? { link: input.link } : undefined,
      },
    });
    const dead = tokens.filter((_, i) => res.responses[i]?.error !== undefined);
    if (dead.length > 0) {
      // Unregistered/invalid tokens are expected churn — remove them.
      await pruneTokens(dead.filter((t) => {
        const code = res.responses[tokens.indexOf(t)]?.error?.code;
        return code === "messaging/registration-token-not-registered" || code === "messaging/invalid-argument" || code === "messaging/invalid-registration-token";
      }));
    }
  } catch {
    // Push is best-effort (e.g. VAPID not yet configured in Firebase
    // console) — the in-app row is the source of truth.
  }
}

/**
 * THE notification entry point: in-app row (always) + push (if allowed).
 */
export async function notify(input: NotifyInput): Promise<void> {
  await createNotification({
    uid: input.uid,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link,
  });

  const profile = await getProfile(input.uid);
  if (!profile) return;
  if (!prefsAllow(profile.notificationPrefs, input.category)) return;
  if (!input.urgent && inQuietHoursPHT()) return; // non-urgent waits for morning

  const tokens = await tokensFor(input.uid);
  await pushToDevices(tokens, input);
}

/** Register/refresh the current device's FCM token for the logged-in user. */
export async function savePushToken(uid: string, token: string, platform: string): Promise<void> {
  await getAdminDb().collection("push_tokens").doc(token).set({
    uid,
    platform,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/** Drop every device token for a user (logout hygiene). */
export async function clearPushTokens(uid: string): Promise<void> {
  const tokens = await tokensFor(uid);
  if (tokens.length > 0) await pruneTokens(tokens);
}

export async function updatePushPrefs(uid: string, prefs: PushPrefs): Promise<void> {
  await updateProfile(uid, { notificationPrefs: prefs });
}

export { listMyNotifications, countUnread, markAllRead };
