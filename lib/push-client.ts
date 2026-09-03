"use client";

import { getMessaging, getToken, deleteToken, onMessage } from "firebase/messaging";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { removePushTokenAction, savePushTokenAction } from "@/app/actions/push";

/**
 * Ask permission and register this device for push. Returns a state string
 * for the caller to render ("granted" | "denied" | "unsupported" | "error").
 */
export async function enablePush(): Promise<"granted" | "denied" | "unsupported" | "error"> {
  try {
    if (typeof Notification === "undefined" || !("serviceWorker" in navigator)) {
      return "unsupported";
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return "denied";

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return "error";

    const reg = await navigator.serviceWorker.ready;
    const messaging = getMessaging(getFirebaseAuth().app);
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: reg,
    });
    if (!token) return "error";

    const ua = navigator.userAgent;
    const platform = /iPhone|iPad|Macintosh/.test(ua) ? "ios" : /Android/.test(ua) ? "android" : "desktop";
    await savePushTokenAction(token, platform);
    // Foreground messages also show as in-app rows on next load; nothing
    // extra to do here (the SW handles background display).
    return "granted";
  } catch {
    return "error";
  }
}

/** Unregister this device (used when the user turns push off). */
export async function disablePush(): Promise<void> {
  try {
    const messaging = getMessaging(getFirebaseAuth().app);
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      serviceWorkerRegistration: await navigator.serviceWorker.ready,
    });
    if (token) {
      await removePushTokenAction(token);
      await deleteToken(messaging);
    }
  } catch {
    // best-effort
  }
}
