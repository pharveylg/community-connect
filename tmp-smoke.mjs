// mint maria cookie + grab a real service id
import { readFileSync, writeFileSync } from "node:fs";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}
if (!getApps().length) initializeApp({ credential: cert({ projectId: env.FIREBASE_PROJECT_ID, clientEmail: env.FIREBASE_CLIENT_EMAIL, privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n") }) });
const auth = getAuth();
const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
  { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "seed.maria@cc-test.ph", password: "cc-test-1234", returnSecureToken: true }) });
const { idToken } = await r.json();
writeFileSync("/tmp/s.txt", await auth.createSessionCookie(idToken, { expiresIn: 3600 * 1000 }));
const snap = await getFirestore().collection("services").where("active", "==", true).limit(1).get();
writeFileSync("/tmp/svc_id.txt", snap.docs[0].id);
console.log("service id:", snap.docs[0].id, "| title:", snap.docs[0].data().title);
