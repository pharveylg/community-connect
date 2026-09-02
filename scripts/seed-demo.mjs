/**
 * Seeds clearly-labeled demo data (seed: true marker) into the Firebase
 * project from .env.local: an admin, three providers with services
 * (including custom ones), a seeker with a dependent, two bookings, and a
 * pending top-up request. Idempotent — deletes previous seed docs first.
 *
 *   node scripts/seed-demo.mjs
 */
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

// --- parse .env.local (no dotenv dependency) ---
const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}

initializeApp({
  credential: cert({
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});
const auth = getAuth();
const db = getFirestore();

const PASSWORD = "cc-test-1234";
const period = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "2-digit",
}).format(new Date());

async function upsertAuthUser(email, displayName) {
  try {
    const existing = await auth.getUserByEmail(email);
    await auth.updateUser(existing.uid, { password: PASSWORD, displayName });
    return existing.uid;
  } catch {
    const created = await auth.createUser({ email, password: PASSWORD, displayName });
    return created.uid;
  }
}

async function clearSeeds(collection, extraWhere = null) {
  let q = db.collection(collection).where("seed", "==", true);
  if (extraWhere) q = extraWhere(q);
  const snap = await q.get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
}

async function cleanOnly() {
  await clearSeeds("service_listings");
  await clearSeeds("bookings");
  await clearSeeds("topup_requests");
  await clearSeeds("wallet_events");
  await clearSeeds("vouch_records");
  await clearSeeds("verifications");
  await clearSeeds("job_posts");
  await clearSeeds("job_offers");
  await clearSeeds("verification_id_hashes");
  await clearSeeds("audit_log");
  const seedProfiles = await db.collection("profiles").where("seed", "==", true).get();
  for (const d of seedProfiles.docs) {
    const deps = await d.ref.collection("dependents").where("seed", "==", true).get();
    await Promise.all(deps.docs.map((x) => x.ref.delete()));
    await d.ref.delete();
  }
  console.log("Demo data removed (seed:* docs deleted; auth users kept).");
}

async function main() {
  if (process.argv.includes("--clean")) return cleanOnly();
  console.log(`Seeding demo data into ${env.FIREBASE_PROJECT_ID} …`);

  const people = [
    { key: "admin", email: "seed.admin@cc-test.ph", name: "Seed Admin", role: "admin", mobile: "09170000001" },
    { key: "p1", email: "seed.ramon@cc-test.ph", name: "Ramon Delos Reyes", role: "provider", mobile: "09170000002" },
    { key: "p2", email: "seed.elena@cc-test.ph", name: "Elena Bautista", role: "provider", mobile: "09170000003" },
    { key: "p3", email: "seed.jun@cc-test.ph", name: "Jun Tuboran", role: "provider", mobile: "09170000004" },
    { key: "seeker", email: "seed.maria@cc-test.ph", name: "Maria Santos", role: "seeker", mobile: "09170000005" },
  ];
  const uids = {};
  for (const p of people) uids[p.key] = await upsertAuthUser(p.email, p.name);

  // Clear previous seed data
  await clearSeeds("service_listings");
  await clearSeeds("bookings");
  await clearSeeds("topup_requests");
  await clearSeeds("wallet_events");
  await clearSeeds("vouch_records");
  await clearSeeds("verifications");
  await clearSeeds("job_posts");
  await clearSeeds("job_offers");
  await clearSeeds("verification_id_hashes");
  await clearSeeds("audit_log");
  const seedProfiles = await db.collection("profiles").where("seed", "==", true).get();
  await Promise.all(seedProfiles.docs.map((d) => d.ref.delete()));

  // Profiles
  for (const p of people) {
    await db.collection("profiles").doc(uids[p.key]).set({
      fullName: p.name,
      mobile: p.mobile,
      email: p.email,
      role: p.role,
      bookingFor: p.key === "seeker" ? "dependent" : p.role === "seeker" ? "self" : null,
      credits: p.key === "p2" ? 0 : p.key === "p1" ? 60 : 40,
      acceptPeriod: null,
      acceptCount: 0,
      // Trust ladder demos: Ramon = Rising, Jun = Trusted, Elena = New
      completedCount: p.key === "p1" ? 6 : p.key === "p3" ? 14 : 0,
      vouches: p.key === "p1" ? 2 : p.key === "p3" ? 5 : 0,
      // Verification demos: Jun = verified (badge), Elena = pending review
      verificationStatus: p.key === "p3" ? "verified" : p.key === "p2" ? "pending" : null,
      verifiedAt: p.key === "p3" ? FieldValue.serverTimestamp() : null,
      verifiedUntil: p.key === "p3" ? Timestamp.fromDate(new Date(Date.now() + 300 * 24 * 3600 * 1000)) : null,
      seed: true,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  await db.collection("profiles").doc(uids.seeker).collection("dependents").add({
    name: "Lola Imelda",
    relationship: "Grandmother",
    notes: "Prefers morning visits; second floor, no elevator.",
    seed: true,
    createdAt: FieldValue.serverTimestamp(),
  });

  const svc = (providerKey, categorySlug, categoryLabel, custom, title, description, rateType, rateAmount, negotiable, barangay) => ({
    providerUid: uids[providerKey],
    providerName: people.find((p) => p.key === providerKey).name,
    categorySlug,
    categoryLabel,
    custom,
    title,
    description,
    rateType,
    rateAmount,
    negotiable,
    city: "Cagayan de Oro City",
    barangay,
    leadTime: "same_day",
    active: true,
    seed: true,
    createdAt: FieldValue.serverTimestamp(),
  });

  const services = [
    svc("p1", "transport", "Transport & Delivery", false, "Hatod & sundo tricycle rides", "Airport hatod, market sundo, errand trips around CDO.", "per_job", 80, true, "Barangay 28"),
    svc("p1", "other", "My own service", true, "Trash pickup & hauling", "Weekly trash pull-out and small hauling jobs within the city.", "per_job", 200, true, "Barangay 28"),
    svc("p2", "home-cleaning", "Home Cleaning", false, "General house cleaning", "Full-house cleaning, supplies brought. Half-day minimum.", "daily", 800, true, "Carmen"),
    svc("p2", "other", "My own service", true, "Laba & plantsa (laundry)", "Pickup and delivery, per load. Negosyable ang presyo.", "per_job", 300, true, "Carmen"),
    svc("p3", "handyman", "Handyman & Repairs", false, "Leak repairs & faucet installation", "Plumbing leaks, faucet and toilet repairs. Same-day service.", "per_job", 250, true, "Kauswagan"),
    svc("p3", "other", "My own service", true, "Junk & scrap metal hauling", "Free hauling of junk items; we BUY scrap metal by weight.", "per_job", 300, true, "Kauswagan"),
  ];
  const serviceRefs = [];
  for (const s of services) serviceRefs.push(await db.collection("service_listings").add(s));

  // Bookings: one pending (seeker → leak repair), one already accepted (hatod)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  await db.collection("bookings").add({
    serviceId: serviceRefs[4].id,
    serviceTitle: services[4].title,
    categoryLabel: services[4].categoryLabel,
    rateAmount: services[4].rateAmount,
    rateType: services[4].rateType,
    providerUid: uids.p3,
    providerName: people[3].name,
    seekerUid: uids.seeker,
    seekerName: people[4].name,
    preferredDate: tomorrow,
    preferredTime: "09:00",
    message: "Leaking pipe under the kitchen sink, ground floor.",
    status: "pending",
    feeCharged: 0,
    seed: true,
    createdAt: FieldValue.serverTimestamp(),
  });
  await db.collection("bookings").add({
    serviceId: serviceRefs[0].id,
    serviceTitle: services[0].title,
    categoryLabel: services[0].categoryLabel,
    rateAmount: services[0].rateAmount,
    rateType: services[0].rateType,
    providerUid: uids.p1,
    providerName: people[1].name,
    seekerUid: uids.seeker,
    seekerName: people[4].name,
    preferredDate: tomorrow,
    preferredTime: "14:00",
    message: "Hatod to Gaisano Mall, one passenger.",
    status: "accepted",
    feeCharged: 0,
    decidedAt: FieldValue.serverTimestamp(),
    seed: true,
    createdAt: FieldValue.serverTimestamp(),
  });
  // Provider 1 used one free accept
  await db.collection("profiles").doc(uids.p1).update({ acceptPeriod: period, acceptCount: 1 });

  // Pending top-up for Elena (₱300 GCash)
  await db.collection("topup_requests").add({
    uid: uids.p2,
    requesterName: people[2].name,
    amount: 300,
    method: "gcash",
    refNumber: "SEED-REF-1001",
    status: "pending",
    seed: true,
    createdAt: FieldValue.serverTimestamp(),
  });

  // Verification records: approved one for Jun (already purged, as post-decision),
  // pending one for Elena with placeholder images for the admin queue demo.
  await db.collection("verifications").add({
    uid: uids.p3,
    requesterName: people[3].name,
    legalName: "Jun Tuboran",
    idType: "drivers_license",
    idNumberLast4: "4471",
    mobile: people[3].mobile,
    facebookUrl: "",
    status: "approved",
    decidedAt: FieldValue.serverTimestamp(),
    decidedBy: uids.admin,
    rejectionReason: null,
    fileIds: [],
    purged: true,
    seed: true,
    submittedAt: FieldValue.serverTimestamp(),
  });
  await db.collection("verification_id_hashes").add({
    usedByUid: uids.p3,
    seed: true,
    at: FieldValue.serverTimestamp(),
  });
  const svg = (label) =>
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250"><rect width="400" height="250" fill="#e8e4d8"/><text x="200" y="120" font-family="sans-serif" font-size="22" fill="#6b6657" text-anchor="middle">${label}</text><text x="200" y="150" font-family="sans-serif" font-size="12" fill="#9c9486" text-anchor="middle">seed placeholder — replace at review</text></svg>`
    ).toString("base64");
  const elenaReq = await db.collection("verifications").add({
    uid: uids.p2,
    requesterName: people[2].name,
    legalName: "Elena Bautista",
    idType: "philsys",
    idNumber: "PSN-2024-0043-1187",
    idNumberLast4: "1187",
    mobile: people[2].mobile,
    facebookUrl: "https://facebook.com/elena.bautista.demo",
    status: "pending",
    fileIds: [],
    seed: true,
    submittedAt: FieldValue.serverTimestamp(),
  });
  await elenaReq.collection("files").add({ mime: "image/svg+xml", data: svg("PhilSys ID — front"), seed: true });
  await elenaReq.collection("files").add({ mime: "image/svg+xml", data: svg("Selfie holding ID"), seed: true });

  // Job board: two open posts from Maria, one pending offer from Jun (verified).
  const tomorrowISO = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const airconPost = await db.collection("job_posts").add({
    seekerUid: uids.seeker,
    seekerName: people[4].name,
    bookingFor: "dependent",
    title: "Aircon cleaning (2 units)",
    description: "Two window-type units, ground floor. Preferably this weekend.",
    categorySlug: "other",
    custom: true,
    barangay: "Barangay 28",
    city: "Cagayan de Oro City",
    whenNeeded: tomorrowISO,
    budget: 600,
    status: "open",
    acceptedOfferId: null,
    filledBookingId: null,
    seed: true,
    createdAt: FieldValue.serverTimestamp(),
  });
  await db.collection("job_posts").add({
    seekerUid: uids.seeker,
    seekerName: people[4].name,
    bookingFor: null,
    title: "Fetch & deliver cake from Limketkai mall",
    description: "Birthday cake pickup Saturday 10am, deliver to Barangay 28. I'll pay the cake via GCash ahead.",
    categorySlug: "errands",
    custom: false,
    barangay: "Barangay 28",
    city: "Cagayan de Oro City",
    whenNeeded: "flexible",
    budget: null,
    status: "open",
    acceptedOfferId: null,
    filledBookingId: null,
    seed: true,
    createdAt: FieldValue.serverTimestamp(),
  });
  await db.collection("job_offers").doc(`${airconPost.id}__${uids.p3}`).set({
    postId: airconPost.id,
    providerUid: uids.p3,
    providerName: people[3].name,
    amount: 700,
    message: "My cousin and I do aircon cleaning — includes wash and check. Saturday morning works.",
    status: "pending",
    seed: true,
    createdAt: FieldValue.serverTimestamp(),
  });

  console.log("Seed complete. Accounts (password for all: " + PASSWORD + "):");
  for (const p of people) console.log(`  ${p.role.padEnd(8)} ${p.email}  (${p.name})`);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error("SEED FAILED:", err.message);
  console.error(err.stack?.split("\n").slice(0, 4).join("\n"));
  process.exit(1);
});
